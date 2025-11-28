import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Folder, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  task_count?: number;
}

const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", status: "ACTIVE" });

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;

    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (projectsData) {
      const projectsWithCounts = await Promise.all(
        projectsData.map(async (project) => {
          const { count } = await supabase
            .from("cards")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id)
            .eq("type", "task");

          return { ...project, task_count: count || 0 };
        })
      );
      setProjects(projectsWithCounts);
    }
  };

  const handleSave = async () => {
    if (!user) return;

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
    loadProjects();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete project");
      return;
    }
    toast.success("Project deleted");
    loadProjects();
  };

  const openDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({ name: project.name, description: project.description, status: project.status });
    } else {
      setEditingProject(null);
      setFormData({ name: "", description: "", status: "ACTIVE" });
    }
    setDialogOpen(true);
  };

  const statusColors = {
    ACTIVE: "hsl(var(--accent))",
    ON_HOLD: "hsl(var(--muted-foreground))",
    COMPLETED: "hsl(220 15% 35%)",
  };

  return (
    <div className="min-h-screen w-full">
      <Header />

      <main className="pt-28 sm:pt-24 pb-20 sm:pb-16 px-4 sm:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-fade-in glass p-4 sm:p-6 rounded-3xl flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light mb-2">Projects</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Organize tasks into projects</p>
            </div>
            <Button onClick={() => openDialog()} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="relative rounded-3xl border-[0.75px] border-border p-1">
                <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
                <Card className="glass border-0 rounded-2xl relative group hover:scale-[1.02] transition-smooth cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Folder className="h-5 w-5 text-accent" />
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDialog(project);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(project.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge
                        className="rounded-full"
                        style={{ backgroundColor: statusColors[project.status as keyof typeof statusColors] }}
                      >
                        {project.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{project.task_count} tasks</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass">
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
                placeholder="Project description"
                className="rounded-2xl"
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
              <Button onClick={handleSave} className="rounded-full">
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
