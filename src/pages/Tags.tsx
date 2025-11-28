import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Tag, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface TagType {
  id: string;
  name: string;
  color: string;
  task_count?: number;
}

const Tags = () => {
  const { user } = useAuth();
  const [tags, setTags] = useState<TagType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [formData, setFormData] = useState({ name: "", color: "#7E9EF9" });

  useEffect(() => {
    loadTags();
  }, [user]);

  const loadTags = async () => {
    if (!user) return;

    const { data: tagsData } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (tagsData) {
      const tagsWithCounts = await Promise.all(
        tagsData.map(async (tag) => {
          const { count } = await supabase
            .from("card_tags")
            .select("*", { count: "exact", head: true })
            .eq("tag_id", tag.id);

          return { ...tag, task_count: count || 0 };
        })
      );
      setTags(tagsWithCounts);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (editingTag) {
      const { error } = await supabase
        .from("tags")
        .update(formData)
        .eq("id", editingTag.id);
      if (error) {
        toast.error("Failed to update tag");
        return;
      }
      toast.success("Tag updated");
    } else {
      const { error } = await supabase
        .from("tags")
        .insert({ ...formData, user_id: user.id });
      if (error) {
        toast.error("Failed to create tag");
        return;
      }
      toast.success("Tag created");
    }

    setDialogOpen(false);
    setEditingTag(null);
    setFormData({ name: "", color: "#7E9EF9" });
    loadTags();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete tag");
      return;
    }
    toast.success("Tag deleted");
    loadTags();
  };

  const openDialog = (tag?: TagType) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({ name: tag.name, color: tag.color });
    } else {
      setEditingTag(null);
      setFormData({ name: "", color: "#7E9EF9" });
    }
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen w-full">
      <Header />

      <main className="pt-28 sm:pt-24 pb-20 sm:pb-16 px-4 sm:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-fade-in glass p-4 sm:p-6 rounded-3xl flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light mb-2">Life Area Tags</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Organize tasks by life areas</p>
            </div>
            <Button onClick={() => openDialog()} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" /> New Tag
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tags.map((tag) => (
              <div key={tag.id} className="relative rounded-3xl border-[0.75px] border-border p-1">
                <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
                <Card className="glass border-0 rounded-2xl relative group hover:scale-[1.02] transition-smooth">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Tag className="h-5 w-5" style={{ color: tag.color }} />
                        <CardTitle className="text-lg">{tag.name}</CardTitle>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          onClick={() => openDialog(tag)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(tag.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge className="rounded-full" style={{ backgroundColor: tag.color }}>
                        {tag.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{tag.task_count} tasks</span>
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
            <DialogTitle>{editingTag ? "Edit Tag" : "Create Tag"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Tag name"
                className="rounded-2xl"
              />
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10 rounded-2xl"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#7E9EF9"
                  className="rounded-2xl flex-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-full">
                Cancel
              </Button>
              <Button onClick={handleSave} className="rounded-full">
                {editingTag ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tags;
