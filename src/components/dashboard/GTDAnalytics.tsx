import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, CheckCircle2, Clock, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface TaskStats {
  total: number;
  completed: number;
  now: number;
  next: number;
  later: number;
  completedToday: number;
}

export const GTDAnalytics = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    now: 0,
    next: 0,
    later: 0,
    completedToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!user) return;

    try {
      // Get all tasks
      const { data: allTasks } = await supabase
        .from("cards")
        .select("card_id, status, gtd_status, created_at")
        .eq("user_id", user.id)
        .eq("type", "task");

      // Get completed tasks today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (allTasks) {
        const now = allTasks.filter((t) => t.gtd_status === "NOW" && t.status !== "completed" && t.status !== "reject");
        const next = allTasks.filter((t) => t.gtd_status === "NEXT" && t.status !== "completed" && t.status !== "reject");
        const later = allTasks.filter((t) => t.gtd_status === "LATER" && t.status !== "completed" && t.status !== "reject");
        const completed = allTasks.filter((t) => t.status === "completed");
        const active = allTasks.filter((t) => t.status !== "reject");

        setStats({
          total: active.length,
          completed: completed.length,
          now: now.length,
          next: next.length,
          later: later.length,
          completedToday: completed.filter((t) => {
            const createdAt = new Date(t.created_at || "");
            return createdAt >= today;
          }).length,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('gtd-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadStats]);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const activeTotal = stats.now + stats.next + stats.later;

  const statItems = [
    {
      label: "NOW",
      value: stats.now,
      color: "hsl(var(--accent))",
      icon: Target,
    },
    {
      label: "NEXT",
      value: stats.next,
      color: "hsl(var(--primary))",
      icon: Clock,
    },
    {
      label: "LATER",
      value: stats.later,
      color: "hsl(var(--muted-foreground))",
      icon: TrendingUp,
    },
  ];

  if (isLoading) {
    return (
      <div className="relative rounded-3xl border-[0.75px] border-border p-1">
        <Card className="glass border-0 rounded-2xl">
          <CardContent className="p-6">
            <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl border-[0.75px] border-border p-1">
      <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
      <Card className="glass border-0 rounded-2xl relative">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-medium">Productivity</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Completion Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>

          {/* Completed Today */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-background/50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span className="text-sm">Completed Today</span>
            </div>
            <span className="text-lg font-semibold">{stats.completedToday}</span>
          </div>

          {/* GTD Distribution */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Task Distribution</p>
            <div className="grid grid-cols-3 gap-2">
              {statItems.map((item) => (
                <div
                  key={item.label}
                  className="p-2 rounded-xl text-center"
                  style={{ backgroundColor: `${item.color}10` }}
                >
                  <item.icon className="h-3 w-3 mx-auto mb-1" style={{ color: item.color }} />
                  <p className="text-lg font-semibold" style={{ color: item.color }}>
                    {item.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active Tasks Bar */}
          {activeTotal > 0 && (
            <div className="h-2 rounded-full overflow-hidden bg-muted flex">
              <div
                className="h-full transition-all"
                style={{
                  width: `${(stats.now / activeTotal) * 100}%`,
                  backgroundColor: "hsl(var(--accent))",
                }}
              />
              <div
                className="h-full transition-all"
                style={{
                  width: `${(stats.next / activeTotal) * 100}%`,
                  backgroundColor: "hsl(var(--primary))",
                }}
              />
              <div
                className="h-full transition-all"
                style={{
                  width: `${(stats.later / activeTotal) * 100}%`,
                  backgroundColor: "hsl(var(--muted-foreground))",
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};