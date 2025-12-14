import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Plus, Trash2, Search, Save, Edit } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const Notes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error loading notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadNotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadNotes]);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const createNote = async () => {
    if (!user || !formTitle.trim()) {
      toast.error("Note title is required");
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: formTitle.trim(),
          content: formContent,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Note created");
      setFormTitle("");
      setFormContent("");
      setIsCreating(false);
      setSelectedNote(data);
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("Failed to create note");
    } finally {
      setIsSaving(false);
    }
  };

  const updateNote = async () => {
    if (!user || !selectedNote || !formTitle.trim()) {
      toast.error("Note title is required");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("notes")
        .update({
          title: formTitle.trim(),
          content: formContent,
        })
        .eq("id", selectedNote.id);

      if (error) throw error;
      
      toast.success("Note updated");
      setIsEditing(false);
      setSelectedNote({ ...selectedNote, title: formTitle.trim(), content: formContent });
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Note deleted");
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  const startEditing = () => {
    if (selectedNote) {
      setFormTitle(selectedNote.title);
      setFormContent(selectedNote.content || "");
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setFormTitle("");
    setFormContent("");
  };

  const startCreating = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedNote(null);
    setFormTitle("");
    setFormContent("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full">
        <Header />
        <main className="pt-32 sm:pt-28 pb-24 sm:pb-16 px-8 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="glass p-6 rounded-3xl animate-pulse h-24" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-96 bg-muted/50 rounded-3xl animate-pulse" />
              <div className="lg:col-span-2 h-96 bg-muted/50 rounded-3xl animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      <Header />
      
      <main className="pt-32 sm:pt-28 pb-24 sm:pb-16 px-4 sm:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="animate-fade-in glass p-6 rounded-3xl"
          >
            <h1 className="text-3xl font-light mb-2">Notes</h1>
            <p className="text-muted-foreground">Capture your thoughts and ideas • {notes.length} note{notes.length !== 1 ? 's' : ''}</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="relative rounded-3xl border-[0.75px] border-border p-2">
              <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
              <Card className="glass border-0 rounded-2xl relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <StickyNote className="h-5 w-5 text-accent" />
                      All Notes
                    </CardTitle>
                    <Button size="icon" onClick={startCreating} className="rounded-full">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 rounded-2xl"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                  <AnimatePresence>
                    {filteredNotes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {notes.length === 0 ? "No notes yet. Create your first note!" : "No notes match your search"}
                      </div>
                    ) : (
                      filteredNotes.map((note) => (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          onClick={() => {
                            setSelectedNote(note);
                            setIsCreating(false);
                            setIsEditing(false);
                          }}
                          className={`p-4 rounded-2xl cursor-pointer transition-smooth group ${
                            selectedNote?.id === note.id ? "bg-accent/10" : "hover:bg-background/50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium mb-1 truncate">{note.title}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {note.content || "No content"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(note.updated_at), "MMM d, yyyy")}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                              onClick={(e) => deleteNote(note.id, e)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 relative rounded-3xl border-[0.75px] border-border p-2">
              <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
              <Card className="glass border-0 rounded-2xl relative">
                <CardContent className="p-6">
                  {isCreating ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <Input
                        placeholder="Note title..."
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="text-2xl font-light border-0 px-0 rounded-2xl bg-transparent"
                        autoFocus
                      />
                      <Textarea
                        placeholder="Start writing..."
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        className="min-h-[400px] resize-none border-0 px-0 rounded-2xl bg-transparent"
                      />
                      <div className="flex gap-2">
                        <Button onClick={createNote} disabled={isSaving} className="rounded-full">
                          {isSaving ? "Creating..." : "Create Note"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setIsCreating(false);
                            setFormTitle("");
                            setFormContent("");
                          }}
                          className="rounded-full"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  ) : isEditing && selectedNote ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <Input
                        placeholder="Note title..."
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="text-2xl font-light border-0 px-0 rounded-2xl bg-transparent"
                        autoFocus
                      />
                      <Textarea
                        placeholder="Start writing..."
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        className="min-h-[400px] resize-none border-0 px-0 rounded-2xl bg-transparent"
                      />
                      <div className="flex gap-2">
                        <Button onClick={updateNote} disabled={isSaving} className="rounded-full">
                          <Save className="h-4 w-4 mr-2" />
                          {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button variant="ghost" onClick={cancelEditing} className="rounded-full">
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  ) : selectedNote ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <h2 className="text-2xl font-light">{selectedNote.title}</h2>
                        <Button variant="ghost" size="icon" onClick={startEditing} className="rounded-full">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Updated {format(new Date(selectedNote.updated_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                      <p className="text-foreground/90 whitespace-pre-wrap min-h-[300px]">
                        {selectedNote.content || "No content"}
                      </p>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                      <StickyNote className="h-12 w-12 mb-4 opacity-30" />
                      <p>Select a note or create a new one</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Notes;
