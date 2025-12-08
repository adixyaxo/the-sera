import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subDays, eachDayOfInterval } from "date-fns";

interface DailyStats {
  date: string;
  completed: number;
  created: number;
}

interface PriorityDistribution {
  high: number;
  medium: number;
  low: number;
}

interface GTDDistribution {
  now: number;
  next: number;
  later: number;
}

interface ProjectStats {
  id: string;
  name: string;
  total: number;
  completed: number;
}

interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completedToday: number;
  completedThisWeek: number;
  completedThisMonth: number;
  dailyStats: DailyStats[];
  priorityDistribution: PriorityDistribution;
  gtdDistribution: GTDDistribution;
  projectStats: ProjectStats[];
  averageCompletionRate: number;
  streak: number;
}

export const useTaskAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch all tasks
      const { data: tasks, error: tasksError } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "task");

      if (tasksError) {
        console.error("Error fetching tasks:", tasksError);
        return;
      }

      // Fetch projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user.id);

      if (projectsError) {
        console.error("Error fetching projects:", projectsError);
      }

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Filter tasks
      const activeTasks = tasks?.filter((t) => t.status !== "reject") || [];
      const completedTasks = activeTasks.filter((t) => t.status === "completed");
      const pendingTasks = activeTasks.filter((t) => t.status !== "completed");

      // Today's completions (approximated by created_at as we don't have completed_at)
      const completedToday = completedTasks.filter((t) => {
        const date = new Date(t.created_at || "");
        return date >= todayStart;
      }).length;

      // This week's completions
      const completedThisWeek = completedTasks.filter((t) => {
        const date = new Date(t.created_at || "");
        return date >= weekStart && date <= weekEnd;
      }).length;

      // This month's completions
      const completedThisMonth = completedTasks.filter((t) => {
        const date = new Date(t.created_at || "");
        return date >= monthStart && date <= monthEnd;
      }).length;

      // Daily stats for last 7 days
      const last7Days = eachDayOfInterval({
        start: subDays(now, 6),
        end: now,
      });

      const dailyStats: DailyStats[] = last7Days.map((day) => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const completed = completedTasks.filter((t) => {
          const date = new Date(t.created_at || "");
          return date >= dayStart && date <= dayEnd;
        }).length;

        const created = activeTasks.filter((t) => {
          const date = new Date(t.created_at || "");
          return date >= dayStart && date <= dayEnd;
        }).length;

        return {
          date: format(day, "EEE"),
          completed,
          created,
        };
      });

      // Priority distribution
      const priorityDistribution: PriorityDistribution = {
        high: pendingTasks.filter((t) => t.priority === "high").length,
        medium: pendingTasks.filter((t) => t.priority === "medium").length,
        low: pendingTasks.filter((t) => t.priority === "low").length,
      };

      // GTD distribution
      const gtdDistribution: GTDDistribution = {
        now: pendingTasks.filter((t) => t.gtd_status === "NOW").length,
        next: pendingTasks.filter((t) => t.gtd_status === "NEXT").length,
        later: pendingTasks.filter((t) => t.gtd_status === "LATER").length,
      };

      // Project stats
      const projectStats: ProjectStats[] = (projects || []).map((project) => {
        const projectTasks = activeTasks.filter((t) => t.project_id === project.id);
        const projectCompleted = projectTasks.filter((t) => t.status === "completed");
        return {
          id: project.id,
          name: project.name,
          total: projectTasks.length,
          completed: projectCompleted.length,
        };
      }).filter((p) => p.total > 0);

      // Calculate streak (consecutive days with completed tasks)
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const checkDay = subDays(now, i);
        const dayStart = new Date(checkDay);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(checkDay);
        dayEnd.setHours(23, 59, 59, 999);

        const hasCompleted = completedTasks.some((t) => {
          const date = new Date(t.created_at || "");
          return date >= dayStart && date <= dayEnd;
        });

        if (hasCompleted) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      const averageCompletionRate =
        activeTasks.length > 0
          ? Math.round((completedTasks.length / activeTasks.length) * 100)
          : 0;

      setAnalytics({
        totalTasks: activeTasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        completedToday,
        completedThisWeek,
        completedThisMonth,
        dailyStats,
        priorityDistribution,
        gtdDistribution,
        projectStats,
        averageCompletionRate,
        streak,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("analytics-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cards",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadAnalytics]);

  return { analytics, isLoading, refetch: loadAnalytics };
};
