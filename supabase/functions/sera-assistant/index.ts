import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SERA NLU System Prompt - improved to ensure clean JSON output
const SERA_SYSTEM_PROMPT = `You are SERA (Smart Everyday Routine Assistant), an intelligent AI assistant that helps users manage their tasks, schedules, and daily routines.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no extra text.

Your capabilities:
1. Natural Language Understanding: Parse user requests into structured intents
2. Task Management: Create, update, reschedule, and organize tasks
3. Smart Scheduling: Suggest optimal times and priorities
4. Conversational: Respond naturally while extracting actionable information

For task-related requests, extract these fields:
- intent: create_task | update_task | reschedule_task | complete_task | delete_task | query_tasks | general_chat
- title: task title (required for create_task)
- description: task details (optional, use empty string if not provided)
- priority: high | medium | low (default: medium)
- deadline: ISO date string or null
- gtd_status: NOW | NEXT | LATER (default: NEXT)
- project: project name or null

ALWAYS respond with this exact JSON structure (no markdown, no code blocks):
{"message":"Your friendly response here","action":{"intent":"intent_type","data":{"title":"task title","description":"","priority":"medium","deadline":null,"gtd_status":"NEXT"},"confidence":0.95}}

For general chat/greetings:
{"message":"Your friendly response","action":{"intent":"general_chat","confidence":1.0}}

Current date: ${new Date().toISOString()}`;

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

    const messages = [
      { role: 'system', content: SERA_SYSTEM_PROMPT + taskContext },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

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
        temperature: 0.3, // Lower temperature for more consistent JSON output
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
    let assistantMessage = aiData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('No response from AI');
    }

    // Clean up the response - remove markdown code blocks if present
    assistantMessage = assistantMessage.trim();
    
    // Remove various markdown formats
    if (assistantMessage.startsWith('```json')) {
      assistantMessage = assistantMessage.slice(7);
    } else if (assistantMessage.startsWith('```')) {
      assistantMessage = assistantMessage.slice(3);
    }
    if (assistantMessage.endsWith('```')) {
      assistantMessage = assistantMessage.slice(0, -3);
    }
    assistantMessage = assistantMessage.trim();

    // Parse the response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(assistantMessage);
      
      // Ensure message field exists and is clean
      if (!parsedResponse.message) {
        parsedResponse.message = "I understand. Let me help you with that.";
      }
      
      // If message contains nested JSON, extract it
      if (parsedResponse.message.startsWith('{') || parsedResponse.message.startsWith('```')) {
        try {
          let nestedMsg = parsedResponse.message;
          if (nestedMsg.startsWith('```json')) nestedMsg = nestedMsg.slice(7);
          if (nestedMsg.startsWith('```')) nestedMsg = nestedMsg.slice(3);
          if (nestedMsg.endsWith('```')) nestedMsg = nestedMsg.slice(0, -3);
          const nested = JSON.parse(nestedMsg.trim());
          if (nested.message) {
            parsedResponse = nested;
          }
        } catch {
          // Keep original if nested parsing fails
        }
      }
      
      // Ensure action exists
      if (!parsedResponse.action) {
        parsedResponse.action = { intent: 'general_chat', confidence: 1.0 };
      }
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
