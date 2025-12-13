import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Edit, Trash2, Folder, Check } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { motion } from "framer-motion";
import { useState } from "react";

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
  onComplete: () => void;
}

export const TaskCard = ({ task, onEdit, onDelete, onComplete }: TaskCardProps) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.card_id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const priorityConfig = {
    high: { color: "hsl(var(--destructive))", label: "High" },
    medium: { color: "hsl(var(--accent))", label: "Medium" },
    low: { color: "hsl(var(--muted-foreground))", label: "Low" },
  };

  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;

  const deadlineDate = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = deadlineDate && isPast(deadlineDate) && !isToday(deadlineDate);
  const isDueToday = deadlineDate && isToday(deadlineDate);

  const handleComplete = async () => {
    setIsCompleting(true);
    // Small delay for animation
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      animate={isCompleting ? { 
        opacity: 0, 
        scale: 0.8, 
        x: 20,
        transition: { duration: 0.3, ease: "easeOut" }
      } : { 
        opacity: 1, 
        scale: 1 
      }}
    >
      <Card
        ref={setNodeRef}
        style={style}
        className={`bg-card/80 border-border/30 group hover:border-border/60 transition-smooth ${
          isDragging ? "shadow-lg" : ""
        } ${isCompleting ? "pointer-events-none" : ""}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Complete Button - with success animation */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleComplete();
              }}
              disabled={isCompleting}
              className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center group/check ${
                isCompleting 
                  ? "border-accent bg-accent scale-110" 
                  : "border-border/60 hover:border-accent hover:bg-accent/10"
              }`}
            >
              <Check className={`h-3 w-3 transition-all duration-200 ${
                isCompleting 
                  ? "opacity-100 text-accent-foreground scale-100" 
                  : "opacity-0 group-hover/check:opacity-100 text-accent scale-75 group-hover/check:scale-100"
              }`} />
            </button>

            {/* Drag handle area - content */}
            <div
              className="flex-1 min-w-0 cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className={`font-medium text-sm line-clamp-2 flex-1 transition-all ${
                  isCompleting ? "line-through text-muted-foreground" : ""
                }`}>{task.title}</h4>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-lg"
                    onPointerDown={(e) => e.stopPropagation()}
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
                    className="h-6 w-6 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                    onPointerDown={(e) => e.stopPropagation()}
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
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: priority.color }}
                  title={priority.label}
                />

                {task.project && (
                  <Badge variant="secondary" className="rounded-full text-[10px] py-0 px-2 h-5 flex items-center gap-1">
                    <Folder className="h-2.5 w-2.5" />
                    {task.project.name}
                  </Badge>
                )}

                {task.deadline && (
                  <Badge
                    variant="secondary"
                    className={`rounded-full text-[10px] py-0 px-2 h-5 flex items-center gap-1 ${
                      isOverdue ? "bg-destructive/10 text-destructive" : isDueToday ? "bg-accent/10 text-accent" : ""
                    }`}
                  >
                    <Calendar className="h-2.5 w-2.5" />
                    {format(new Date(task.deadline), "MMM d")}
                  </Badge>
                )}
              </div>

              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {task.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag.id}
                      className="rounded-full text-[10px] py-0 px-2 h-4"
                      style={{ backgroundColor: tag.color, color: "white" }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {task.tags.length > 3 && (
                    <Badge variant="secondary" className="rounded-full text-[10px] py-0 px-2 h-4">
                      +{task.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};