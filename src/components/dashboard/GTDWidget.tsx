import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Plus, Calendar, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { format, isToday, isPast } from "date-fns";
import { toast } from "sonner";

interface Task {
  card_id: string;
  title: string;
  priority: string;
  deadline?: string;
  gtd_status: string;
}

export const GTDWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nowTasks, setNowTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNowTasks = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("cards")
        .select("card_id, title, priority, deadline, gtd_status")
        .eq("user_id", user.id)
        .eq("type", "task")
        .eq("gtd_status", "NOW")
        .neq("status", "completed")
        .neq("status", "reject")
        .order("priority", { ascending: true })
        .limit(4);

      if (error) {
        console.error("Error loading NOW tasks:", error);
        return;
      }

      if (data) {
        setNowTasks(data.filter((t) => t.title && t.title.trim()));
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNowTasks();
  }, [loadNowTasks]);

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('gtd-widget-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNowTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadNowTasks]);

  const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Optimistic update
    setNowTasks((prev) => prev.filter((t) => t.card_id !== taskId));

    const { error } = await supabase
      .from("cards")
      .update({ status: "completed" })
      .eq("card_id", taskId);

    if (error) {
      toast.error("Failed to complete task");
      loadNowTasks();
      return;
    }

    toast.success("Task completed!");
  };

  const priorityColors = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-accent/10 text-accent",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <div className="relative rounded-3xl border-[0.75px] border-border p-1">
      <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
      <Card className="glass border-0 rounded-2xl relative">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-accent/10">
                <Zap className="h-4 w-4 text-accent" />
              </div>
              <span className="text-base font-medium">NOW Tasks</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/tasks")}
              className="rounded-full text-xs h-7"
            >
              All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : nowTasks.length > 0 ? (
            nowTasks.map((task) => {
              const deadlineDate = task.deadline ? new Date(task.deadline) : null;
              const isOverdue = deadlineDate && isPast(deadlineDate) && !isToday(deadlineDate);

              return (
                <div
                  key={task.card_id}
                  className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-background/50 transition-smooth cursor-pointer"
                  onClick={() => navigate("/tasks")}
                >
                  <button
                    onClick={(e) => handleCompleteTask(task.card_id, e)}
                    className="flex-shrink-0 h-4 w-4 rounded-full border-2 border-border/60 hover:border-accent hover:bg-accent/10 transition-smooth flex items-center justify-center group/check"
                  >
                    <Check className="h-2.5 w-2.5 opacity-0 group-hover/check:opacity-100 text-accent transition-smooth" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant="secondary"
                        className={`rounded-full text-[10px] py-0 px-1.5 h-4 ${
                          priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium
                        }`}
                      >
                        {task.priority}
                      </Badge>
                      {task.deadline && (
                        <span className={`text-[10px] flex items-center gap-1 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                          <Calendar className="h-2.5 w-2.5" />
                          {format(new Date(task.deadline), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-xs mb-3">No urgent tasks</p>
              <Button onClick={() => navigate("/tasks")} className="rounded-full" size="sm">
                <Plus className="h-3 w-3 mr-1" /> Add Task
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};