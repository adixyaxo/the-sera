
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// --- TYPES ---
type Habit = {
  id: string;
  name: string;
  category: string;
  frequency: "daily" | "weekly";
  startDate: Date;
  archived: boolean;
};

type HabitLog = {
  habitId: string;
  date: Date;
  completed: boolean;
};

// --- MOCK DATA ---
const mockHabits: Habit[] = [
  { id: "h1", name: "Read 30 mins", category: "Personal Growth", frequency: "daily", startDate: new Date("2024-07-01"), archived: false },
  { id: "h2", name: "Workout", category: "Health", frequency: "daily", startDate: new Date("2024-07-01"), archived: false },
  { id: "h3", name: "Write Journal", category: "Mental Health", frequency: "daily", startDate: new Date("2024-07-05"), archived: false },
  { id: "h4", name: "Weekly Review", category: "Productivity", frequency: "weekly", startDate: new Date("2024-07-01"), archived: false },
];

const mockLogs: HabitLog[] = [
    { habitId: "h1", date: new Date("2024-07-20"), completed: true },
    { habitId: "h1", date: new Date("2024-07-21"), completed: true },
    { habitId: "h2", date: new Date("2024-07-21"), completed: true },
    { habitId: "h3", date: new Date("2024-07-21"), completed: false },
    { habitId: "h1", date: new Date("2024-07-22"), completed: true },
    { habitId: "h2", date: new Date("2024-07-22"), completed: false },
    { habitId: "h3", date: new Date("2024-07-22"), completed: true },
];

// --- HELPERS ---
const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const Tracker = () => {
  const [habits, setHabits] = useState<Habit[]>(mockHabits);
  const [logs, setLogs] = useState<HabitLog[]>(mockLogs);
  const [currentDate, setCurrentDate] = useState(new Date());

  const handleToggleHabit = (habitId: string, date: Date) => {
    const logIndex = logs.findIndex(log => log.habitId === habitId && formatDate(log.date) === formatDate(date));
    const newLogs = [...logs];
    if (logIndex > -1) {
      newLogs[logIndex] = { ...newLogs[logIndex], completed: !newLogs[logIndex].completed };
    } else {
      newLogs.push({ habitId, date, completed: true });
    }
    setLogs(newLogs);
  };

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);

  const getCompletionStatus = (habitId: string, date: Date) => {
    return logs.find(log => log.habitId === habitId && formatDate(log.date) === formatDate(date))?.completed ?? false;
  };
  
  const changeMonth = (offset: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  return (
    <div className="p-4 md:p-8 bg-background text-foreground">
      <Card className="bg-card border-border shadow-lg backdrop-blur-lg bg-opacity-80">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button size="icon" variant="ghost" onClick={() => changeMonth(-1)}><ChevronLeft /></Button>
            <CardTitle className="text-2xl font-bold">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </CardTitle>
            <Button size="icon" variant="ghost" onClick={() => changeMonth(1)}><ChevronRight /></Button>
          </div>
          <Button size="sm" variant="outline">
             <PlusCircle className="mr-2 h-4 w-4" />
             Add Habit
           </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly">
               <div className="overflow-x-auto relative mt-4 rounded-lg border">
                <table className="w-full border-collapse">
                    <thead className="bg-muted/50">
                        <tr >
                            <th className="sticky left-0 bg-muted p-3 border-r border-border text-left min-w-[180px]">Habit</th>
                            {daysInMonth.map(day => (
                                <th key={day.toISOString()} className="p-2 border-x border-border text-center text-sm font-normal">
                                    <div className="text-xs text-muted-foreground">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                    <div className="font-semibold">{day.getDate()}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {habits.filter(h => !h.archived).map(habit => (
                            <tr key={habit.id} className="hover:bg-muted/50 transition-colors">
                                <td className="sticky left-0 bg-card p-3 border-r border-border font-medium">{habit.name}</td>
                                {daysInMonth.map(day => (
                                    <td key={day.toISOString()} className="p-2 border-x border-border text-center">
                                        <Checkbox 
                                            className="h-5 w-5"
                                            checked={getCompletionStatus(habit.id, day)}
                                            onCheckedChange={() => handleToggleHabit(habit.id, day)}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tracker;
