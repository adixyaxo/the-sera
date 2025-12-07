import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Clock, CalendarClock } from "lucide-react";
import { KanbanBoard } from "@/components/gtd/KanbanBoard";
import { TaskDialog } from "@/components/gtd/TaskDialog";

const Tasks = () => {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleTaskSaved = () => {
    setRefreshTrigger((prev) => prev + 1);
    setEditingTask(null);
  };

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setTaskDialogOpen(true);
  };

  return (
    <div className="min-h-screen w-full">
      <Header />

      <main className="pt-28 sm:pt-24 pb-20 sm:pb-16 px-4 sm:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section */}
          <div className="animate-fade-in glass p-5 sm:p-6 rounded-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-light mb-1">GTD Task Board</h1>
                <p className="text-muted-foreground text-sm">Organize your tasks with the NOW / NEXT / LATER workflow</p>
              </div>
              <Button
                onClick={handleOpenNewTask}
                className="rounded-full bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20"
              >
                <Plus className="h-4 w-4 mr-2" /> New Task
              </Button>
            </div>

            {/* Quick Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="p-1 rounded-md bg-accent/10">
                  <Zap className="h-3 w-3 text-accent" />
                </div>
                <span>NOW — Do it now</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="p-1 rounded-md bg-primary/10">
                  <Clock className="h-3 w-3 text-primary" />
                </div>
                <span>NEXT — Do it soon</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="p-1 rounded-md bg-muted">
                  <CalendarClock className="h-3 w-3 text-muted-foreground" />
                </div>
                <span>LATER — Someday</span>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <KanbanBoard onEditTask={handleEditTask} refreshTrigger={refreshTrigger} />
        </div>
      </main>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        onSave={handleTaskSaved}
      />
    </div>
  );
};

export default Tasks;