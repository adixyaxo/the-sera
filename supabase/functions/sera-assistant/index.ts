import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SERA NLU System Prompt
const SERA_SYSTEM_PROMPT = `You are SERA (Smart Everyday Routine Assistant), an intelligent AI assistant that helps users manage their tasks, schedules, and daily routines.

Your capabilities:
1. **Natural Language Understanding (NLU)**: Parse user requests into structured intents and actions
2. **Task Management**: Create, update, reschedule, and organize tasks
3. **Smart Scheduling**: Suggest optimal times and priorities based on context
4. **Conversational**: Respond naturally while extracting actionable information

When users give commands or requests, respond with BOTH:
1. A friendly, conversational response
2. A structured JSON action block (when applicable)

For task-related requests, extract:
- intent: create_task | update_task | reschedule_task | complete_task | delete_task | query_tasks | general_chat
- title: task title
- description: task details
- priority: high | medium | low
- deadline: ISO date string or relative (today, tomorrow, next week)
- gtd_status: NOW | NEXT | LATER
- project: project name if mentioned

Format your response as:
{
  "message": "Your conversational response here",
  "action": {
    "intent": "intent_type",
    "data": { ... extracted data ... },
    "confidence": 0.0-1.0
  }
}

If the request is just a greeting or general chat, set intent to "general_chat" with no data.

Current date/time context: ${new Date().toISOString()}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, conversationHistory = [] } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's current tasks for context
    const { data: userTasks } = await supabaseClient
      .from('cards')
      .select('title, status, priority, gtd_status, deadline')
      .eq('user_id', user.id)
      .is('completed_at', null)
      .limit(10);

    const taskContext = userTasks?.length 
      ? `\n\nUser's current active tasks:\n${userTasks.map(t => 
          `- ${t.title} (${t.gtd_status}, ${t.priority} priority${t.deadline ? `, due: ${t.deadline}` : ''})`
        ).join('\n')}`
      : '\n\nUser has no active tasks.';

    // Build conversation messages
    const messages = [
      { role: 'system', content: SERA_SYSTEM_PROMPT + taskContext },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message }
    ];

    // Call Lovable AI (Gemini)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI service error');
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('No response from AI');
    }

    // Parse the response to extract action
    let parsedResponse;
    try {
      // Try to parse as JSON first
      parsedResponse = JSON.parse(assistantMessage);
    } catch {
      // If not JSON, wrap the message
      parsedResponse = {
        message: assistantMessage,
        action: { intent: 'general_chat', confidence: 1.0 }
      };
    }

    console.log('SERA Assistant response:', JSON.stringify(parsedResponse, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        response: parsedResponse,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SERA Assistant error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
