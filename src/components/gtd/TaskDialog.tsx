import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Zap, Clock, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Task {
  card_id?: string;
  title: string;
  description: string;
  project_id?: string;
  priority: string;
  deadline?: string;
  gtd_status: string;
  tags?: { id: string; name: string; color: string }[];
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSave: () => void;
}

export const TaskDialog = ({ open, onOpenChange, task, onSave }: TaskDialogProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Task>({
    title: "",
    description: "",
    priority: "medium",
    gtd_status: "LATER",
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (task) {
        setFormData({
          card_id: task.card_id,
          title: task.title || "",
          description: task.description || "",
          project_id: task.project_id,
          priority: task.priority || "medium",
          deadline: task.deadline,
          gtd_status: task.gtd_status || "LATER",
        });
        setSelectedTags(task.tags?.map(t => t.id) || []);
      } else {
        setFormData({
          title: "",
          description: "",
          priority: "medium",
          gtd_status: "LATER",
        });
        setSelectedTags([]);
      }
      loadProjects();
      loadTags();
    }
  }, [task, open]);

  const loadProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE");
    if (data) setProjects(data);
  };

  const loadTags = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", user.id);
    if (data) setAvailableTags(data);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Please log in to create tasks");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    setIsSubmitting(true);

    try {
      const cardId = task?.card_id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const cardData = {
        card_id: cardId,
        user_id: user.id,
        type: "task",
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        project_id: formData.project_id && formData.project_id !== "none" ? formData.project_id : null,
        priority: formData.priority,
        deadline: formData.deadline || null,
        gtd_status: formData.gtd_status,
        status: "pending",
      };

      let error;
      if (task?.card_id) {
        const { error: updateError } = await supabase
          .from("cards")
          .update(cardData)
          .eq("card_id", task.card_id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from("cards").insert(cardData);
        error = insertError;
      }

      if (error) {
        console.error("Task save error:", error);
        toast.error(task ? "Failed to update task" : "Failed to create task");
        return;
      }

      // Handle tags
      await supabase.from("card_tags").delete().eq("card_id", cardId);

      if (selectedTags.length > 0) {
        const tagInserts = selectedTags.map(tagId => ({
          card_id: cardId,
          tag_id: tagId,
        }));
        await supabase.from("card_tags").insert(tagInserts);
      }

      toast.success(task ? "Task updated" : "Task created");
      onSave();
      onOpenChange(false);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const statusIcons = {
    NOW: <Zap className="h-4 w-4 text-accent" />,
    NEXT: <Clock className="h-4 w-4 text-primary" />,
    LATER: <CalendarClock className="h-4 w-4 text-muted-foreground" />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-lg border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">
            {task ? "Edit Task" : "New Task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What needs to be done?"
              className="rounded-xl bg-background/50 border-border/50 focus:border-accent/50 transition-smooth"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details..."
              className="rounded-xl bg-background/50 border-border/50 focus:border-accent/50 transition-smooth min-h-[80px] resize-none"
            />
          </div>

          {/* GTD Status Selection - Prominent */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">GTD Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["NOW", "NEXT", "LATER"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFormData({ ...formData, gtd_status: status })}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-smooth ${
                    formData.gtd_status === status
                      ? "bg-accent/10 border-accent/50 text-accent"
                      : "bg-background/30 border-border/50 hover:border-border"
                  }`}
                >
                  {statusIcons[status]}
                  <span className="font-medium text-sm">{status}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="rounded-xl bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-border/50">
                  <SelectItem value="high" className="text-destructive">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low" className="text-muted-foreground">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Deadline</Label>
              <Input
                type="date"
                value={formData.deadline?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="rounded-xl bg-background/50 border-border/50"
              />
            </div>
          </div>

          {projects.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Project</Label>
              <Select
                value={formData.project_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, project_id: value === "none" ? undefined : value })}
              >
                <SelectTrigger className="rounded-xl bg-background/50 border-border/50">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent className="glass border-border/50">
                  <SelectItem value="none">No Project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {availableTags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer rounded-full transition-smooth hover:scale-105"
                    style={selectedTags.includes(tag.id) ? { backgroundColor: tag.color } : { borderColor: tag.color }}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                    {selectedTags.includes(tag.id) && <X className="h-3 w-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="rounded-xl bg-accent hover:bg-accent/90"
              disabled={isSubmitting || !formData.title.trim()}
            >
              {isSubmitting ? "Saving..." : task ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};