import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Voice command processing system prompt
const VOICE_PROCESSOR_PROMPT = `You are SERA's voice command processor. Parse natural language voice commands into structured actions.

Analyze the user's voice input and determine the intent. Return a JSON response with:
- type: The command type (create_task, create_note, create_event, search, navigate, general)
- data: Extracted data relevant to the command
- confidence: 0.0-1.0 how confident you are in the interpretation
- response: A brief spoken response to confirm the action

Command types and their data:
1. create_task: { title, description?, priority (high/medium/low), deadline?, gtd_status (NOW/NEXT/LATER) }
2. create_note: { title, content }
3. create_event: { title, date, time?, duration?, description? }
4. search: { query, scope (tasks/notes/events/all) }
5. navigate: { destination (dashboard/calendar/tasks/projects/notes/analytics/profile) }
6. general: { query } - for general questions or unclear commands

Examples:
- "Add a task to finish the report by Friday with high priority" → create_task
- "Create a note about meeting ideas" → create_note  
- "Schedule a meeting tomorrow at 3pm" → create_event
- "Find all my tasks about project alpha" → search
- "Go to calendar" → navigate
- "What's on my schedule today?" → general (will be handled by chat)

Current date: ${new Date().toISOString()}

Respond with valid JSON only:
{
  "type": "command_type",
  "data": { ... },
  "confidence": 0.95,
  "response": "Got it! I'll create that task for you."
}`;

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

    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Transcript is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing voice transcript:', transcript);

    // Call Lovable AI (Gemini) for NLU
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
        messages: [
          { role: 'system', content: VOICE_PROCESSOR_PROMPT },
          { role: 'user', content: transcript }
        ],
        temperature: 0.3, // Lower temperature for more consistent parsing
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

    // Parse the AI response
    let command;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedResponse = assistantMessage.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      command = JSON.parse(cleanedResponse.trim());
    } catch {
      // If parsing fails, return a general command
      command = {
        type: 'general',
        data: { query: transcript },
        confidence: 0.5,
        response: assistantMessage,
      };
    }

    console.log('Voice command parsed:', JSON.stringify(command, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        command,
        originalTranscript: transcript,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice processor error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
