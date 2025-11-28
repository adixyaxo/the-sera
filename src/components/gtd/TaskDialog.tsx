import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
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
  tags?: string[];
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  onSave: () => void;
}

export const TaskDialog = ({ open, onOpenChange, task, onSave }: TaskDialogProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Task>({
    title: "",
    description: "",
    priority: "medium",
    gtd_status: "LATER",
    tags: [],
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (task) {
      setFormData(task);
      setSelectedTags(task.tags || []);
    } else {
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        gtd_status: "LATER",
        tags: [],
      });
      setSelectedTags([]);
    }
  }, [task, open]);

  useEffect(() => {
    if (open) {
      loadProjects();
      loadTags();
    }
  }, [open]);

  const loadProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user?.id)
      .eq("status", "ACTIVE");
    if (data) setProjects(data);
  };

  const loadTags = async () => {
    const { data } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", user?.id);
    if (data) setAvailableTags(data);
  };

  const handleSave = async () => {
    if (!user) return;

    const cardId = task?.card_id || `task_${Date.now()}`;
    const cardData = {
      card_id: cardId,
      user_id: user.id,
      type: "task",
      title: formData.title,
      description: formData.description,
      project_id: formData.project_id || null,
      priority: formData.priority,
      deadline: formData.deadline || null,
      gtd_status: formData.gtd_status,
      status: "pending",
    };

    if (task?.card_id) {
      const { error } = await supabase
        .from("cards")
        .update(cardData)
        .eq("card_id", task.card_id);
      if (error) {
        toast.error("Failed to update task");
        return;
      }
    } else {
      const { error } = await supabase.from("cards").insert(cardData);
      if (error) {
        toast.error("Failed to create task");
        return;
      }
    }

    // Handle tags
    if (task?.card_id) {
      await supabase.from("card_tags").delete().eq("card_id", cardId);
    }

    for (const tagId of selectedTags) {
      await supabase.from("card_tags").insert({ card_id: cardId, tag_id: tagId });
    }

    toast.success(task ? "Task updated" : "Task created");
    onSave();
    onOpenChange(false);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Task title"
              className="rounded-2xl"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description"
              className="rounded-2xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Project</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="none">No Project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={formData.gtd_status}
                onValueChange={(value) => setFormData({ ...formData, gtd_status: value })}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="NOW">NOW</SelectItem>
                  <SelectItem value="NEXT">NEXT</SelectItem>
                  <SelectItem value="LATER">LATER</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Deadline</Label>
              <Input
                type="date"
                value={formData.deadline?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="rounded-2xl"
              />
            </div>
          </div>

          <div>
            <Label>Life Area Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer rounded-full"
                  style={selectedTags.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                  {selectedTags.includes(tag.id) && <X className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={handleSave} className="rounded-full">
              {task ? "Update" : "Create"} Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
