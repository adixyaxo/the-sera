import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays } from "date-fns";
import { CheckCircle, Calendar, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CompletedTask {
  card_id: string;
  title: string;
  description: string;
  completed_at: string;
  priority: string;
}

interface CompletedTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CompletedTasksDialog = ({ open, onOpenChange }: CompletedTasksDialogProps) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCompletedTasks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Calculate 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("cards")
        .select("card_id, title, description, completed_at, priority")
        .eq("user_id", user.id)
        .eq("type", "task")
        .eq("status", "completed")
        .gte("completed_at", thirtyDaysAgo.toISOString())
        .order("completed_at", { ascending: false });

      if (error) {
        console.error("Error loading completed tasks:", error);
        return;
      }

      setTasks(data || []);
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      loadCompletedTasks();
    }
  }, [open, loadCompletedTasks]);

  const handleRestore = async (taskId: string) => {
    const { error } = await supabase
      .from("cards")
      .update({ status: "pending", completed_at: null })
      .eq("card_id", taskId);

    if (error) {
      toast.error("Failed to restore task");
      return;
    }

    toast.success("Task restored");
    loadCompletedTasks();
  };

  const handleDelete = async (taskId: string) => {
    const { error } = await supabase
      .from("cards")
      .delete()
      .eq("card_id", taskId);

    if (error) {
      toast.error("Failed to delete task");
      return;
    }

    toast.success("Task deleted permanently");
    loadCompletedTasks();
  };

  const priorityColors = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-accent/10 text-accent",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-accent" />
            Completed Tasks
            <Badge variant="secondary" className="ml-2">
              Last 30 days
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No completed tasks in the last 30 days</p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {tasks.map((task) => (
                <div
                  key={task.card_id}
                  className="group p-3 rounded-xl bg-card/50 border border-border/30 hover:border-border/60 transition-smooth"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-through opacity-70">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium}`}
                        >
                          {task.priority}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {task.completed_at
                            ? `${differenceInDays(new Date(), new Date(task.completed_at))} days ago`
                            : "Recently"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-accent/10 hover:text-accent"
                        onClick={() => handleRestore(task.card_id)}
                        title="Restore task"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(task.card_id)}
                        title="Delete permanently"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
