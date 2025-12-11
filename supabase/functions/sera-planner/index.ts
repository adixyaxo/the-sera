import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SERA Planner System Prompt
const PLANNER_SYSTEM_PROMPT = `You are SERA's intelligent task planner. Your job is to analyze the user's tasks and provide smart recommendations.

Analyze tasks based on:
1. **Urgency**: Deadlines and time sensitivity
2. **Importance**: Priority levels and impact
3. **Dependencies**: Related tasks and projects
4. **Energy levels**: Suggesting optimal times for different task types
5. **GTD methodology**: NOW (do immediately), NEXT (do soon), LATER (someday/maybe)

When given a list of tasks, provide:
1. Prioritized order for today
2. Suggestions for rescheduling if overloaded
3. Recommendations for breaking down large tasks
4. Optimal time blocks based on task nature

Respond in JSON format:
{
  "analysis": {
    "workload": "light | moderate | heavy | overloaded",
    "focus_areas": ["area1", "area2"],
    "risk_items": ["items that need attention"]
  },
  "recommendations": [
    {
      "type": "prioritize | reschedule | break_down | delegate",
      "task_id": "id if applicable",
      "suggestion": "description",
      "reason": "why this helps"
    }
  ],
  "today_focus": [
    {
      "task_id": "id",
      "suggested_time": "morning | afternoon | evening",
      "duration_estimate": "30min | 1hr | 2hr",
      "energy_level": "high | medium | low"
    }
  ],
  "summary": "Brief natural language summary"
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

    const { action = 'analyze' } = await req.json();

    // Fetch all user's active tasks
    const { data: tasks, error: tasksError } = await supabaseClient
      .from('cards')
      .select('*')
      .eq('user_id', user.id)
      .is('completed_at', null)
      .neq('status', 'rejected');

    if (tasksError) {
      throw new Error('Failed to fetch tasks');
    }

    // Fetch projects for context
    const { data: projects } = await supabaseClient
      .from('projects')
      .select('id, name, status')
      .eq('user_id', user.id);

    // Build context for AI
    const taskContext = tasks?.map(t => ({
      id: t.card_id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      gtd_status: t.gtd_status,
      deadline: t.deadline,
      project_id: t.project_id,
      created_at: t.created_at
    })) || [];

    const projectContext = projects?.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status
    })) || [];

    const prompt = `Current date/time: ${new Date().toISOString()}

User's Tasks (${taskContext.length} total):
${JSON.stringify(taskContext, null, 2)}

User's Projects:
${JSON.stringify(projectContext, null, 2)}

Action requested: ${action}

Please analyze and provide recommendations.`;

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
        messages: [
          { role: 'system', content: PLANNER_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
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
      throw new Error('AI service error');
    }

    const aiData = await aiResponse.json();
    const plannerResponse = aiData.choices?.[0]?.message?.content;

    if (!plannerResponse) {
      throw new Error('No response from AI planner');
    }

    // Parse the response
    let parsedPlan;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = plannerResponse.match(/```json\n?([\s\S]*?)\n?```/) || 
                        plannerResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : plannerResponse;
      parsedPlan = JSON.parse(jsonStr);
    } catch {
      parsedPlan = {
        summary: plannerResponse,
        analysis: { workload: 'unknown' },
        recommendations: [],
        today_focus: []
      };
    }

    console.log('SERA Planner response:', JSON.stringify(parsedPlan, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        plan: parsedPlan,
        task_count: taskContext.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SERA Planner error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
