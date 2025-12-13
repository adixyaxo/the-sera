import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Folder, Edit, Trash2, ChevronDown, CheckCircle2, Clock, ListTodo, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface Task {
  card_id: string;
  title: string;
  status: string;
  gtd_status: string;
  priority: string;
  deadline?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  task_count?: number;
  completed_count?: number;
  tasks?: Task[];
}

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", status: "ACTIVE" });
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (projectsData) {
        const projectsWithDetails = await Promise.all(
          projectsData.map(async (project) => {
            // Get all tasks for this project
            const { data: tasks } = await supabase
              .from("cards")
              .select("card_id, title, status, gtd_status, priority, deadline")
              .eq("project_id", project.id)
              .eq("type", "task")
              .neq("status", "reject");

            const taskList = tasks || [];
            const completedTasks = taskList.filter(t => t.status === "completed");

            return { 
              ...project, 
              task_count: taskList.length,
              completed_count: completedTasks.length,
              tasks: taskList.slice(0, 5), // Only show first 5 tasks in preview
            };
          })
        );
        setProjects(projectsWithDetails);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('projects-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadProjects()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadProjects()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadProjects]);

  const handleSave = async () => {
    if (!user || !formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    if (editingProject) {
      const { error } = await supabase
        .from("projects")
        .update(formData)
        .eq("id", editingProject.id);
      if (error) {
        toast.error("Failed to update project");
        return;
      }
      toast.success("Project updated");
    } else {
      const { error } = await supabase
        .from("projects")
        .insert({ ...formData, user_id: user.id });
      if (error) {
        toast.error("Failed to create project");
        return;
      }
      toast.success("Project created");
    }

    setDialogOpen(false);
    setEditingProject(null);
    setFormData({ name: "", description: "", status: "ACTIVE" });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete project");
      return;
    }
    toast.success("Project deleted");
  };

  const openDialog = (project?: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (project) {
      setEditingProject(project);
      setFormData({ name: project.name, description: project.description || "", status: project.status });
    } else {
      setEditingProject(null);
      setFormData({ name: "", description: "", status: "ACTIVE" });
    }
    setDialogOpen(true);
  };

  const toggleExpand = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  const statusConfig = {
    ACTIVE: { color: "hsl(var(--accent))", bg: "bg-accent/10", label: "Active", icon: Clock },
    ON_HOLD: { color: "hsl(var(--muted-foreground))", bg: "bg-muted", label: "On Hold", icon: ListTodo },
    COMPLETED: { color: "hsl(120 60% 45%)", bg: "bg-green-500/10", label: "Completed", icon: CheckCircle2 },
  };

  const priorityColors = {
    high: "text-destructive",
    medium: "text-accent",
    low: "text-muted-foreground",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full">
        <Header />
        <main className="pt-28 sm:pt-24 pb-20 sm:pb-16 px-4 sm:px-8 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="glass p-6 rounded-3xl animate-pulse h-24" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-muted/50 rounded-3xl animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      <Header />

      <main className="pt-28 sm:pt-24 pb-20 sm:pb-16 px-4 sm:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="animate-fade-in glass p-4 sm:p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-light mb-2">Projects</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {projects.length} project{projects.length !== 1 ? 's' : ''} • Click to expand details
              </p>
            </div>
            <Button onClick={() => openDialog()} className="rounded-full bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20">
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          </motion.div>

          {/* Empty State */}
          {projects.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-3xl p-12 text-center"
            >
              <Folder className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">Create your first project to organize your tasks</p>
              <Button onClick={() => openDialog()} className="rounded-full">
                <Plus className="h-4 w-4 mr-2" /> Create Project
              </Button>
            </motion.div>
          )}

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {projects.map((project, index) => {
                const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.ACTIVE;
                const StatusIcon = status.icon;
                const progress = project.task_count ? Math.round(((project.completed_count || 0) / project.task_count) * 100) : 0;
                const isExpanded = expandedProject === project.id;

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                    className={`relative rounded-3xl border-[0.75px] border-border p-1 ${
                      isExpanded ? "md:col-span-2 lg:col-span-2" : ""
                    }`}
                  >
                    <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(project.id)}>
                      <Card className="glass border-0 rounded-2xl relative overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <div className="cursor-pointer group">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`p-2 rounded-xl ${status.bg}`}>
                                    <Folder className="h-5 w-5" style={{ color: status.color }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      Created {format(new Date(project.created_at), "MMM d, yyyy")}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-full"
                                      onClick={(e) => openDialog(project, e)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
                                      onClick={(e) => handleDelete(project.id, e)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  </motion.div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0 pb-4">
                              {project.description && (
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                              )}
                              
                              {/* Progress Bar */}
                              <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Progress</span>
                                  <span className="font-medium">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                              </div>

                              <div className="flex items-center justify-between">
                                <Badge
                                  className="rounded-full gap-1.5"
                                  style={{ backgroundColor: status.color }}
                                >
                                  <StatusIcon className="h-3 w-3" />
                                  {status.label}
                                </Badge>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>{project.completed_count || 0}/{project.task_count || 0} tasks</span>
                                </div>
                              </div>
                            </CardContent>
                          </div>
                        </CollapsibleTrigger>

                        {/* Expanded Content */}
                        <CollapsibleContent>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border-t border-border/30 px-6 py-4"
                          >
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <ListTodo className="h-4 w-4 text-accent" />
                              Recent Tasks
                            </h4>
                            {project.tasks && project.tasks.length > 0 ? (
                              <div className="space-y-2">
                                {project.tasks.map((task) => (
                                  <div
                                    key={task.card_id}
                                    className="flex items-center gap-3 p-2 rounded-xl bg-background/50 hover:bg-background/80 transition-colors"
                                  >
                                    <div className={`h-2 w-2 rounded-full ${
                                      task.status === "completed" ? "bg-green-500" : "bg-muted-foreground"
                                    }`} />
                                    <span className={`text-sm flex-1 ${
                                      task.status === "completed" ? "line-through text-muted-foreground" : ""
                                    }`}>
                                      {task.title}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] rounded-full">
                                      {task.gtd_status}
                                    </Badge>
                                    {task.deadline && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(task.deadline), "MMM d")}
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {(project.task_count || 0) > 5 && (
                                  <p className="text-xs text-muted-foreground text-center py-2">
                                    +{(project.task_count || 0) - 5} more tasks
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No tasks in this project yet
                              </p>
                            )}
                          </motion.div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Create Project"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Project name"
                className="rounded-2xl"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project description (optional)"
                className="rounded-2xl resize-none"
                rows={3}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-full">
                Cancel
              </Button>
              <Button onClick={handleSave} className="rounded-full bg-accent hover:bg-accent/90">
                {editingProject ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;