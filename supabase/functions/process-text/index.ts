import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    console.log("Processing text:", text);

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Call Lovable AI to process the text
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const systemPrompt = `You are SERA, an intelligent scheduling assistant. Analyze the user's request and extract intent, action, time, and any other relevant details. Return a JSON object with:
{
  "type": "schedule|reschedule|cancel|reminder|task",
  "title": "brief title",
  "description": "detailed description",
  "primary_action": {
    "event_title": "event name",
    "start_time": "ISO timestamp",
    "end_time": "ISO timestamp",
    "duration_minutes": number,
    "location": "optional",
    "participants": ["optional array"],
    "notes": "optional"
  },
  "alternatives": [],
  "confidence": 0.0-1.0,
  "metadata": {
    "urgency": "high|medium|low",
    "flexibility": "flexible|fixed",
    "priority": "high|medium|low"
  }
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI processing failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    let cardData;
    try {
      cardData = JSON.parse(aiContent);
    } catch {
      // If AI doesn't return valid JSON, create a basic task
      cardData = {
        type: 'task',
        title: 'New Task',
        description: text,
        primary_action: {
          event_title: 'Task from input',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          duration_minutes: 60,
          notes: text
        },
        alternatives: [],
        confidence: 0.7,
        metadata: {
          urgency: 'medium',
          flexibility: 'flexible',
          priority: 'medium'
        }
      };
    }

    // Generate unique IDs
    const sessionId = crypto.randomUUID();
    const cardId = crypto.randomUUID();

    // Store card in database
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .insert({
        card_id: cardId,
        type: cardData.type,
        title: cardData.title,
        description: cardData.description,
        primary_action: cardData.primary_action,
        alternatives: cardData.alternatives || [],
        confidence: cardData.confidence,
        metadata: cardData.metadata,
        status: 'pending',
        user_id: user.id,
      })
      .select()
      .single();

    if (cardError) throw cardError;

    // Store session
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        cards: [card],
      });

    if (sessionError) throw sessionError;

    return new Response(
      JSON.stringify({
        session_id: sessionId,
        cards: [card],
        status: 'success',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});