import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  gtd_status: z.enum(['NOW', 'NEXT', 'LATER']).optional().default('NEXT'),
  deadline: z.string().optional(),
  project_id: z.string().uuid().optional(),
});

const updateTaskSchema = z.object({
  card_id: z.string().min(1),
  updates: z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(2000).optional(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    gtd_status: z.enum(['NOW', 'NEXT', 'LATER']).optional(),
    deadline: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'rejected']).optional(),
  }),
});

const executeActionSchema = z.object({
  intent: z.enum(['create_task', 'update_task', 'complete_task', 'delete_task', 'reschedule_task']),
  data: z.record(z.any()),
});

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

    const body = await req.json();
    const validationResult = executeActionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { intent, data } = validationResult.data;
    let result;

    switch (intent) {
      case 'create_task': {
        const taskData = createTaskSchema.safeParse(data);
        if (!taskData.success) {
          return new Response(
            JSON.stringify({ error: 'Invalid task data', details: taskData.error.errors }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const card_id = `sera_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const { data: newTask, error } = await supabaseClient
          .from('cards')
          .insert({
            card_id,
            user_id: user.id,
            type: 'task',
            title: taskData.data.title,
            description: taskData.data.description || '',
            priority: taskData.data.priority,
            gtd_status: taskData.data.gtd_status,
            deadline: taskData.data.deadline,
            project_id: taskData.data.project_id,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;
        result = { action: 'created', task: newTask };
        break;
      }

      case 'update_task': {
        const updateData = updateTaskSchema.safeParse(data);
        if (!updateData.success) {
          return new Response(
            JSON.stringify({ error: 'Invalid update data', details: updateData.error.errors }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: updatedTask, error } = await supabaseClient
          .from('cards')
          .update(updateData.data.updates)
          .eq('card_id', updateData.data.card_id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        result = { action: 'updated', task: updatedTask };
        break;
      }

      case 'complete_task': {
        const { card_id } = data;
        if (!card_id) {
          return new Response(
            JSON.stringify({ error: 'card_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: completedTask, error } = await supabaseClient
          .from('cards')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('card_id', card_id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        result = { action: 'completed', task: completedTask };
        break;
      }

      case 'delete_task': {
        const { card_id } = data;
        if (!card_id) {
          return new Response(
            JSON.stringify({ error: 'card_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabaseClient
          .from('cards')
          .delete()
          .eq('card_id', card_id)
          .eq('user_id', user.id);

        if (error) throw error;
        result = { action: 'deleted', card_id };
        break;
      }

      case 'reschedule_task': {
        const { card_id, new_deadline, new_gtd_status } = data;
        if (!card_id) {
          return new Response(
            JSON.stringify({ error: 'card_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updates: Record<string, any> = {};
        if (new_deadline) updates.deadline = new_deadline;
        if (new_gtd_status) updates.gtd_status = new_gtd_status;

        const { data: rescheduledTask, error } = await supabaseClient
          .from('cards')
          .update(updates)
          .eq('card_id', card_id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        result = { action: 'rescheduled', task: rescheduledTask };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown intent' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log('SERA Execute result:', JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        result,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SERA Execute error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
