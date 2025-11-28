import { useState, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadTasks();
  }, [user, refreshTrigger]);

  const loadTasks = async () => {
    if (!user) return;

    const { data: cardsData } = await supabase
      .from("cards")
      .select(`
        *,
        project:projects(name),
        card_tags(tag:tags(*))
      `)
      .eq("user_id", user.id)
      .eq("type", "task");

    if (cardsData) {
      const formattedTasks = cardsData.map((card: any) => ({
        card_id: card.card_id,
        title: card.title,
        description: card.description,
        project_id: card.project_id,
        priority: card.priority,
        deadline: card.deadline,
        gtd_status: card.gtd_status || "LATER",
        project: card.project,
        tags: card.card_tags?.map((ct: any) => ct.tag) || [],
      }));
      setTasks(formattedTasks);
    }
  };

  const handleDragStart = (event: any) => {
    const task = tasks.find((t) => t.card_id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    const { error } = await supabase
      .from("cards")
      .update({ gtd_status: newStatus })
      .eq("card_id", taskId);

    if (error) {
      toast.error("Failed to update task status");
      return;
    }

    setTasks((tasks) =>
      tasks.map((task) =>
        task.card_id === taskId ? { ...task, gtd_status: newStatus } : task
      )
    );
    toast.success("Task moved");
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from("cards").delete().eq("card_id", taskId);

    if (error) {
      toast.error("Failed to delete task");
      return;
    }

    setTasks((tasks) => tasks.filter((task) => task.card_id !== taskId));
    toast.success("Task deleted");
  };

  const columns = [
    { id: "NOW", title: "NOW", color: "hsl(var(--accent))" },
    { id: "NEXT", title: "NEXT", color: "hsl(var(--primary))" },
    { id: "LATER", title: "LATER", color: "hsl(var(--muted-foreground))" },
  ];

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            tasks={tasks.filter((task) => task.gtd_status === column.id)}
            onEditTask={onEditTask}
            onDeleteTask={handleDeleteTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="opacity-50">
            <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
