import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./TaskCard";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, CalendarClock } from "lucide-react";

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
  subtitle: string;
  color: string;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
}

const columnIcons = {
  NOW: Zap,
  NEXT: Clock,
  LATER: CalendarClock,
};

export const KanbanColumn = ({
  id,
  title,
  subtitle,
  color,
  tasks,
  onEditTask,
  onDeleteTask,
  onCompleteTask,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const Icon = columnIcons[id as keyof typeof columnIcons] || Clock;

  return (
    <div
      ref={setNodeRef}
      className={`glass p-4 rounded-3xl min-h-[400px] transition-smooth ${
        isOver ? "ring-2 ring-accent/50 bg-accent/5" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color }}>
              {title}
            </h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="rounded-full text-xs font-medium"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {tasks.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task.card_id}
              task={task}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.card_id)}
              onComplete={() => onCompleteTask(task.card_id)}
            />
          ))
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground/60">
              {id === "NOW" && "Focus on your most urgent tasks"}
              {id === "NEXT" && "Queue up your next actions"}
              {id === "LATER" && "Park ideas for later"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};