import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlanAnalysis {
  workload: 'light' | 'moderate' | 'heavy' | 'overloaded';
  focus_areas: string[];
  risk_items: string[];
}

interface Recommendation {
  type: 'prioritize' | 'reschedule' | 'break_down' | 'delegate';
  task_id?: string;
  suggestion: string;
  reason: string;
}

interface TodayFocus {
  task_id: string;
  suggested_time: 'morning' | 'afternoon' | 'evening';
  duration_estimate: string;
  energy_level: 'high' | 'medium' | 'low';
}

interface PlannerResult {
  analysis: PlanAnalysis;
  recommendations: Recommendation[];
  today_focus: TodayFocus[];
  summary: string;
}

export function useSeraPlanner() {
  const [plan, setPlan] = useState<PlannerResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('sera-planner', {
        body: { action: 'analyze' },
      });

      if (fnError) throw fnError;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to analyze tasks');
      }

      setPlan(data.plan);
      return data.plan;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze tasks';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPlan = useCallback(() => {
    setPlan(null);
    setError(null);
  }, []);

  return {
    plan,
    isLoading,
    error,
    analyzeTasks,
    clearPlan,
  };
}
