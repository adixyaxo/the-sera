import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced SERA Planner System Prompt
const PLANNER_SYSTEM_PROMPT = `You are SERA's intelligent AI planner - a sophisticated productivity analyst that helps users optimize their workload and achieve their goals.

## Your Analysis Framework

### 1. Urgency & Time Analysis
- Calculate days until deadlines
- Identify overdue tasks immediately
- Flag tasks with tight timelines
- Consider task dependencies

### 2. Workload Assessment
- "light": 0-3 active tasks, no urgent items
- "moderate": 4-7 tasks, manageable deadlines
- "heavy": 8-12 tasks or multiple urgent items
- "overloaded": 13+ tasks or conflicting deadlines

### 3. Productivity Insights
- Detect task clustering patterns (too many similar tasks)
- Identify potential bottlenecks
- Spot tasks that could block others
- Recognize quick wins (high-impact, low-effort)

### 4. Smart Recommendations
Types of recommendations:
- "prioritize": Tasks that need immediate attention
- "reschedule": Tasks that could be moved to reduce pressure
- "break_down": Large tasks that should be split
- "delegate": Tasks that might not need personal attention

### 5. Energy-Based Scheduling
- Morning: High-focus, creative, strategic tasks
- Afternoon: Meetings, collaborative work, routine tasks
- Evening: Planning, review, low-energy administrative work

## Response Format

RESPOND ONLY WITH VALID JSON - no markdown, no explanations, just JSON:

{
  "analysis": {
    "workload": "light" | "moderate" | "heavy" | "overloaded",
    "focus_areas": ["area that needs attention", "another area"],
    "risk_items": ["specific task or situation that needs immediate attention"],
    "productivity_score": 75,
    "bottlenecks": ["potential blocker or issue"]
  },
  "recommendations": [
    {
      "type": "prioritize" | "reschedule" | "break_down" | "delegate",
      "task_id": "id if applicable",
      "suggestion": "clear actionable suggestion",
      "reason": "why this helps productivity",
      "priority": "high" | "medium" | "low"
    }
  ],
  "today_focus": [
    {
      "task_id": "id",
      "suggested_time": "morning" | "afternoon" | "evening",
      "duration_estimate": "30min" | "1hr" | "2hr" | "3hr+",
      "energy_level": "high" | "medium" | "low",
      "why": "brief reason for this scheduling"
    }
  ],
  "summary": "One or two sentence natural language summary of the user's productivity state and top recommendation",
  "insights": {
    "quick_wins": ["task that can be done quickly for momentum"],
    "time_blocks_needed": "estimated total focused time needed today",
    "best_start": "recommended first task to build momentum"
  }
}

## Important Guidelines
- Be specific and actionable, not generic
- Reference actual task titles when possible
- Consider GTD status (NOW = urgent, NEXT = soon, LATER = someday)
- Factor in project context
- Be encouraging but honest about workload
- Prioritize user's mental bandwidth`;

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
      console.error('Tasks fetch error:', tasksError);
      throw new Error('Failed to fetch tasks');
    }

    // Fetch projects for context
    const { data: projects } = await supabaseClient
      .from('projects')
      .select('id, name, status')
      .eq('user_id', user.id);

    // Fetch recent completed tasks for context
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentCompleted } = await supabaseClient
      .from('cards')
      .select('title, completed_at, priority')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .order('completed_at', { ascending: false })
      .limit(10);

    // Build rich context for AI
    const now = new Date();
    const taskContext = tasks?.map(t => {
      const deadline = t.deadline ? new Date(t.deadline) : null;
      const daysUntilDeadline = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      return {
        id: t.card_id,
        title: t.title,
        description: t.description,
        priority: t.priority || 'medium',
        gtd_status: t.gtd_status || 'LATER',
        deadline: t.deadline,
        days_until_deadline: daysUntilDeadline,
        is_overdue: daysUntilDeadline !== null && daysUntilDeadline < 0,
        project_id: t.project_id,
        created_at: t.created_at,
        age_days: Math.ceil((now.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24))
      };
    }) || [];

    const projectContext = projects?.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status
    })) || [];

    // Calculate productivity metrics
    const completedThisWeek = recentCompleted?.filter(t => {
      const completedDate = new Date(t.completed_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return completedDate >= weekAgo;
    }).length || 0;

    const overdueTasks = taskContext.filter(t => t.is_overdue).length;
    const highPriorityTasks = taskContext.filter(t => t.priority === 'high').length;
    const nowTasks = taskContext.filter(t => t.gtd_status === 'NOW').length;

    const prompt = `Current date/time: ${now.toISOString()}
Day of week: ${now.toLocaleDateString('en-US', { weekday: 'long' })}

## User's Active Tasks (${taskContext.length} total)
${JSON.stringify(taskContext, null, 2)}

## Projects
${JSON.stringify(projectContext, null, 2)}

## Productivity Context
- Tasks completed this week: ${completedThisWeek}
- Overdue tasks: ${overdueTasks}
- High priority tasks: ${highPriorityTasks}
- Tasks marked NOW (urgent): ${nowTasks}

## Recently Completed (for pattern analysis)
${JSON.stringify(recentCompleted?.map(t => t.title) || [], null, 2)}

## Action Requested: ${action}

Analyze the user's task landscape and provide actionable insights. Remember to respond with ONLY valid JSON.`;

    // Call Lovable AI (Gemini)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Calling Lovable AI for task analysis...');

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
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI service error');
    }

    const aiData = await aiResponse.json();
    const plannerResponse = aiData.choices?.[0]?.message?.content;

    if (!plannerResponse) {
      throw new Error('No response from AI planner');
    }

    console.log('Raw AI response:', plannerResponse);

    // Parse the response - handle markdown code blocks
    let parsedPlan;
    try {
      let jsonStr = plannerResponse.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      parsedPlan = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback plan
      parsedPlan = {
        summary: "Unable to fully analyze tasks. Please try again.",
        analysis: { 
          workload: taskContext.length > 10 ? 'heavy' : taskContext.length > 5 ? 'moderate' : 'light',
          risk_items: overdueTasks > 0 ? [`${overdueTasks} overdue task(s) need attention`] : [],
          focus_areas: ['Task management']
        },
        recommendations: [],
        today_focus: taskContext.slice(0, 3).map(t => ({
          task_id: t.id,
          suggested_time: 'morning',
          duration_estimate: '1hr',
          energy_level: 'medium'
        }))
      };
    }

    console.log('SERA Planner response:', JSON.stringify(parsedPlan, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        plan: parsedPlan,
        task_count: taskContext.length,
        metrics: {
          completed_this_week: completedThisWeek,
          overdue: overdueTasks,
          high_priority: highPriorityTasks
        },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SERA Planner error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
