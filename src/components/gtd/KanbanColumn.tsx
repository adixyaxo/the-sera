import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./TaskCard";
import { Badge } from "@/components/ui/badge";

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

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const KanbanColumn = ({ id, title, color, tasks, onEditTask, onDeleteTask }: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`glass p-4 rounded-3xl min-h-[600px] transition-smooth ${
        isOver ? "ring-2 ring-accent" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color }}>
          {title}
        </h3>
        <Badge variant="secondary" className="rounded-full">
          {tasks.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.card_id}
            task={task}
            onEdit={() => onEditTask(task)}
            onDelete={() => onDeleteTask(task.card_id)}
          />
        ))}
      </div>
    </div>
  );
};
