import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Clock, Plus, Trash2, Filter, CheckCircle2, Folder, AlertCircle, Edit } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, isSameDay, parseISO, startOfDay, endOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  all_day: boolean;
  color: string;
  type: 'event' | 'task' | 'project';
  source_id?: string;
}

type FilterType = 'all' | 'events' | 'tasks' | 'projects';

const colorOptions = [
  { value: '#7E9EF9', label: 'Blue' },
  { value: '#6FD3B8', label: 'Green' },
  { value: '#F97316', label: 'Orange' },
  { value: '#EF4444', label: 'Red' },
  { value: '#A855F7', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
];

const Calendar = () => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    all_day: false,
    color: '#7E9EF9',
  });

  const loadEvents = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Load custom events
      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id);

      const formattedEvents: CalendarEvent[] = (eventsData || []).map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        start_time: e.start_time,
        end_time: e.end_time,
        all_day: e.all_day || false,
        color: e.color || '#7E9EF9',
        type: 'event' as const,
      }));

      // Load tasks with deadlines
      const { data: tasksData } = await supabase
        .from("cards")
        .select("card_id, title, deadline, status, priority")
        .eq("user_id", user.id)
        .eq("type", "task")
        .not("deadline", "is", null)
        .neq("status", "completed");

      const taskEvents: CalendarEvent[] = (tasksData || []).map(t => ({
        id: `task-${t.card_id}`,
        title: t.title,
        description: `Priority: ${t.priority || 'medium'}`,
        start_time: t.deadline!,
        all_day: true,
        color: t.priority === 'high' ? '#EF4444' : t.priority === 'medium' ? '#F97316' : '#6FD3B8',
        type: 'task' as const,
        source_id: t.card_id,
      }));

      // Load projects (show created date as milestone)
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name, created_at, status")
        .eq("user_id", user.id)
        .eq("status", "ACTIVE");

      const projectEvents: CalendarEvent[] = (projectsData || []).map(p => ({
        id: `project-${p.id}`,
        title: `📁 ${p.name}`,
        description: 'Project start',
        start_time: p.created_at,
        all_day: true,
        color: '#A855F7',
        type: 'project' as const,
        source_id: p.id,
      }));

      setEvents([...formattedEvents, ...taskEvents, ...projectEvents]);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `user_id=eq.${user.id}` }, () => loadEvents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards', filter: `user_id=eq.${user.id}` }, () => loadEvents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, () => loadEvents())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadEvents]);

  const filteredEvents = events.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'events') return e.type === 'event';
    if (filter === 'tasks') return e.type === 'task';
    if (filter === 'projects') return e.type === 'project';
    return true;
  });

  const selectedDateEvents = filteredEvents.filter(e => 
    date && isSameDay(parseISO(e.start_time), date)
  );

  const upcomingEvents = filteredEvents
    .filter(e => parseISO(e.start_time) >= startOfDay(new Date()))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 8);

  // Get dates that have events for calendar highlighting
  const eventDates = filteredEvents.map(e => startOfDay(parseISO(e.start_time)).toISOString());

  const handleSave = async () => {
    if (!user || !formData.title.trim()) {
      toast.error("Event title is required");
      return;
    }

    if (!formData.start_time) {
      toast.error("Start time is required");
      return;
    }

    try {
      const eventPayload = {
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description || null,
        start_time: formData.start_time,
        end_time: formData.end_time || null,
        all_day: formData.all_day,
        color: formData.color,
      };

      if (editingEvent && editingEvent.type === 'event') {
        const { error } = await supabase
          .from("events")
          .update(eventPayload)
          .eq("id", editingEvent.id);
        if (error) throw error;
        toast.success("Event updated");
      } else {
        const { error } = await supabase
          .from("events")
          .insert(eventPayload);
        if (error) throw error;
        toast.success("Event created");
      }

      closeDialog();
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event");
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (event.type !== 'event') {
      toast.error("Only custom events can be deleted here");
      return;
    }

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id);
      if (error) throw error;
      toast.success("Event deleted");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const openDialog = (event?: CalendarEvent) => {
    if (event && event.type === 'event') {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        start_time: event.start_time.slice(0, 16),
        end_time: event.end_time?.slice(0, 16) || '',
        all_day: event.all_day,
        color: event.color,
      });
    } else {
      setEditingEvent(null);
      const defaultDate = date || new Date();
      setFormData({
        title: '',
        description: '',
        start_time: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
        end_time: '',
        all_day: false,
        color: '#7E9EF9',
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEvent(null);
    setFormData({ title: '', description: '', start_time: '', end_time: '', all_day: false, color: '#7E9EF9' });
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'task': return <CheckCircle2 className="h-3 w-3" />;
      case 'project': return <Folder className="h-3 w-3" />;
      default: return <CalendarDays className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full">
        <Header />
        <main className="pt-32 sm:pt-28 pb-24 sm:pb-16 px-8 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="glass p-6 rounded-3xl animate-pulse h-24" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 bg-muted/50 rounded-3xl animate-pulse" />
              <div className="h-96 bg-muted/50 rounded-3xl animate-pulse" />
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
            className="animate-fade-in glass p-4 sm:p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-light mb-2">Calendar</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Manage your schedule, tasks, and project deadlines
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="rounded-full gap-2">
                    <Filter className="h-4 w-4" />
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-1">
                    {(['all', 'events', 'tasks', 'projects'] as FilterType[]).map((f) => (
                      <Button
                        key={f}
                        variant={filter === f ? 'secondary' : 'ghost'}
                        className="w-full justify-start rounded-xl"
                        onClick={() => setFilter(f)}
                      >
                        {f === 'all' && <CalendarDays className="h-4 w-4 mr-2" />}
                        {f === 'events' && <CalendarDays className="h-4 w-4 mr-2" />}
                        {f === 'tasks' && <CheckCircle2 className="h-4 w-4 mr-2" />}
                        {f === 'projects' && <Folder className="h-4 w-4 mr-2" />}
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Button onClick={() => openDialog()} className="rounded-full bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20">
                <Plus className="h-4 w-4 mr-2" /> Add Event
              </Button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2 relative">
              <div className="relative rounded-3xl border-[0.75px] border-border p-2">
                <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
                <Card className="glass border-0 rounded-2xl relative">
                  <CardContent className="p-6">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      className="rounded-2xl pointer-events-auto"
                      modifiers={{
                        hasEvent: (day) => eventDates.includes(startOfDay(day).toISOString()),
                      }}
                      modifiersClassNames={{
                        hasEvent: "bg-accent/20 font-bold",
                      }}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Selected Date Events */}
              {date && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 relative rounded-3xl border-[0.75px] border-border p-2"
                >
                  <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
                  <Card className="glass border-0 rounded-2xl relative">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <CalendarDays className="h-5 w-5 text-accent" />
                        {format(date, "EEEE, MMMM d")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedDateEvents.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No events on this date</p>
                      ) : (
                        <div className="space-y-2">
                          <AnimatePresence>
                            {selectedDateEvents.map((event) => (
                              <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="p-3 rounded-xl bg-background/50 hover:bg-background/70 transition-colors group flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      {getEventIcon(event.type)}
                                      <span className="font-medium">{event.title}</span>
                                      <Badge variant="outline" className="text-[10px] rounded-full capitalize">
                                        {event.type}
                                      </Badge>
                                    </div>
                                    {event.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                                    )}
                                    {!event.all_day && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <Clock className="h-3 w-3" />
                                        {format(parseISO(event.start_time), "h:mm a")}
                                        {event.end_time && ` - ${format(parseISO(event.end_time), "h:mm a")}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {event.type === 'event' && (
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => openDialog(event)}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(event)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Upcoming Events Sidebar */}
            <div className="space-y-6">
              <div className="relative rounded-3xl border-[0.75px] border-border p-2">
                <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
                <Card className="glass border-0 rounded-2xl relative">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-accent" />
                      Upcoming
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                    {upcomingEvents.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No upcoming events</p>
                    ) : (
                      upcomingEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => setDate(parseISO(event.start_time))}
                          className="p-4 rounded-2xl bg-background/50 hover:bg-background/70 transition-smooth cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                            {getEventIcon(event.type)}
                            <h4 className="font-medium truncate">{event.title}</h4>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-4">
                            <Clock className="h-3 w-3" />
                            <span>{format(parseISO(event.start_time), "MMM d")}</span>
                            {!event.all_day && <span>• {format(parseISO(event.start_time), "h:mm a")}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Legend */}
              <div className="relative rounded-3xl border-[0.75px] border-border p-2">
                <Card className="glass border-0 rounded-2xl relative p-4">
                  <h4 className="text-sm font-medium mb-3">Legend</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-accent" />
                      <span className="text-muted-foreground">Events</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-orange-500" />
                      <span className="text-muted-foreground">Task Deadlines</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-purple-500" />
                      <span className="text-muted-foreground">Projects</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create/Edit Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Event title..."
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                className="rounded-xl resize-none"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-4">
              <Switch
                checked={formData.all_day}
                onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })}
              />
              <Label>All day event</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input
                  type={formData.all_day ? "date" : "datetime-local"}
                  value={formData.all_day ? formData.start_time.slice(0, 10) : formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: formData.all_day ? `${e.target.value}T00:00` : e.target.value })}
                  className="rounded-xl"
                />
              </div>
              {!formData.all_day && (
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFormData({ ...formData, color: option.value })}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      formData.color === option.value && "ring-2 ring-offset-2 ring-foreground"
                    )}
                    style={{ backgroundColor: option.value }}
                    title={option.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1 rounded-full">
                {editingEvent ? "Update Event" : "Create Event"}
              </Button>
              <Button variant="ghost" onClick={closeDialog} className="rounded-full">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
