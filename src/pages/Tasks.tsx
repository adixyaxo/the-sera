import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
    setRefreshTrigger(prev => prev + 1);
    setEditingTask(null);
  };

  return (
    <div className="min-h-screen w-full">
      <Header />

      <main className="pt-28 sm:pt-24 pb-20 sm:pb-16 px-4 sm:px-8 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-fade-in glass p-4 sm:p-6 rounded-3xl flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light mb-2">GTD Task Board</h1>
              <p className="text-muted-foreground text-sm sm:text-base">NOW / NEXT / LATER workflow</p>
            </div>
            <Button onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" /> New Task
            </Button>
          </div>

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
