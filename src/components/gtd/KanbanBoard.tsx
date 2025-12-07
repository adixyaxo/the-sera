import { useState, useEffect, useCallback } from "react";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, DragStartEvent } from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Task {
  card_id: string;
  title: string;
  description: string;
  project_id?: string;
  priority: string;
  deadline?: string;
  gtd_status: string;
  project?: { name: string };
  tags?: { id: string; name: string; color: string }[];
}

interface KanbanBoardProps {
  onEditTask: (task: Task) => void;
  refreshTrigger: number;
}

export const KanbanBoard = ({ onEditTask, refreshTrigger }: KanbanBoardProps) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const loadTasks = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch tasks without join - avoiding foreign key requirement
      const { data: cardsData, error } = await supabase
        .from("cards")
        .select(`
          *,
          card_tags(tag:tags(*))
        `)
        .eq("user_id", user.id)
        .eq("type", "task")
        .neq("status", "reject")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading tasks:", error);
        toast.error("Failed to load tasks");
        return;
      }

      // Fetch projects separately to get names
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user.id);

      const projectMap = new Map(projectsData?.map(p => [p.id, p.name]) || []);

      if (cardsData) {
        const formattedTasks = cardsData
          .filter((card: any) => card.title && card.title.trim() !== "")
          .map((card: any) => ({
            card_id: card.card_id,
            title: card.title,
            description: card.description || "",
            project_id: card.project_id,
            priority: card.priority || "medium",
            deadline: card.deadline,
            gtd_status: card.gtd_status || "LATER",
            project: card.project_id ? { name: projectMap.get(card.project_id) || "" } : undefined,
            tags: card.card_tags?.map((ct: any) => ct.tag).filter(Boolean) || [],
          }));
        setTasks(formattedTasks);
      }
    } catch (err) {
      console.error("Unexpected error loading tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks, refreshTrigger]);

  // Set up realtime subscription for task updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('gtd-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.card_id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    // Optimistic update
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.card_id === taskId ? { ...task, gtd_status: newStatus } : task
      )
    );

    const { error } = await supabase
      .from("cards")
      .update({ gtd_status: newStatus })
      .eq("card_id", taskId);

    if (error) {
      toast.error("Failed to update task status");
      loadTasks(); // Revert on error
      return;
    }

    toast.success(`Moved to ${newStatus}`);
  };

  const handleDeleteTask = async (taskId: string) => {
    // Optimistic update
    const previousTasks = tasks;
    setTasks((prevTasks) => prevTasks.filter((task) => task.card_id !== taskId));

    const { error } = await supabase.from("cards").delete().eq("card_id", taskId);

    if (error) {
      toast.error("Failed to delete task");
      setTasks(previousTasks); // Revert on error
      return;
    }

    toast.success("Task deleted");
  };

  const handleCompleteTask = async (taskId: string) => {
    const previousTasks = tasks;
    setTasks((prevTasks) => prevTasks.filter((task) => task.card_id !== taskId));

    const { error } = await supabase
      .from("cards")
      .update({ status: "completed" })
      .eq("card_id", taskId);

    if (error) {
      toast.error("Failed to complete task");
      setTasks(previousTasks);
      return;
    }

    toast.success("Task completed!");
  };

  const columns = [
    { id: "NOW", title: "NOW", subtitle: "Do it now", color: "hsl(var(--accent))" },
    { id: "NEXT", title: "NEXT", subtitle: "Do it soon", color: "hsl(var(--primary))" },
    { id: "LATER", title: "LATER", subtitle: "Someday", color: "hsl(var(--muted-foreground))" },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="glass p-4 rounded-3xl min-h-[400px] animate-pulse">
            <div className="h-6 w-20 bg-muted rounded mb-4" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-muted/50 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            subtitle={column.subtitle}
            color={column.color}
            tasks={tasks.filter((task) => task.gtd_status === column.id)}
            onEditTask={onEditTask}
            onDeleteTask={handleDeleteTask}
            onCompleteTask={handleCompleteTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="opacity-80 rotate-2 scale-105">
            <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} onComplete={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};