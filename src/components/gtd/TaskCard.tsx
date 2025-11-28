import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Edit, Trash2, Folder } from "lucide-react";
import { format } from "date-fns";

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

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
}

export const TaskCard = ({ task, onEdit, onDelete }: TaskCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.card_id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const priorityColors = {
    high: "hsl(var(--destructive))",
    medium: "hsl(var(--accent))",
    low: "hsl(var(--muted-foreground))",
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="glass border-border/50 cursor-grab active:cursor-grabbing group hover:scale-[1.02] transition-smooth"
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium line-clamp-2 flex-1">{task.title}</h4>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
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
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge
            variant="secondary"
            className="rounded-full text-xs"
            style={{ borderColor: priorityColors[task.priority as keyof typeof priorityColors] }}
          >
            {task.priority}
          </Badge>

          {task.project && (
            <Badge variant="outline" className="rounded-full text-xs flex items-center gap-1">
              <Folder className="h-3 w-3" />
              {task.project.name}
            </Badge>
          )}

          {task.deadline && (
            <Badge variant="outline" className="rounded-full text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(task.deadline), "MMM d")}
            </Badge>
          )}
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <Badge
                key={tag.id}
                className="rounded-full text-xs"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
