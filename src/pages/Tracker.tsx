import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Archive,
  Flame,
  Trophy,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- TYPES ---
type Frequency = "daily" | "weekly";

type Habit = {
  id: string;
  name: string;
  category: string;
  frequency: Frequency;
  startDate: Date;
  archived: boolean;
};

type HabitLog = {
  habitId: string;
  dateString: string; // YYYY-MM-DD
  completed: boolean;
};

type ViewMode = "daily" | "weekly" | "monthly";

// --- MOCK DATA ---
const mockHabits: Habit[] = [
  { id: "h1", name: "Read 30 mins", category: "Personal Growth", frequency: "daily", startDate: new Date("2024-07-01"), archived: false },
  { id: "h2", name: "Deep Work (4h)", category: "Productivity", frequency: "daily", startDate: new Date("2024-07-01"), archived: false },
  { id: "h3", name: "Gym / Cardio", category: "Health", frequency: "daily", startDate: new Date("2024-07-05"), archived: false },
  { id: "h4", name: "Weekly Review", category: "Productivity", frequency: "weekly", startDate: new Date("2024-07-01"), archived: false },
];

const mockLogs: HabitLog[] = [
  { habitId: "h1", dateString: "2024-07-20", completed: true },
  { habitId: "h1", dateString: "2024-07-21", completed: true },
  { habitId: "h1", dateString: "2024-07-22", completed: true }, // 3 day streak
];

// --- HELPERS ---
const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

const getDatesForView = (view: ViewMode, currentDate: Date): Date[] => {
  const dates: Date[] = [];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  if (view === "daily") {
    dates.push(new Date(currentDate));
  }
  else if (view === "weekly") {
    // Start from Sunday of the current week
    const dayOfWeek = currentDate.getDay(); // 0 (Sun) - 6 (Sat)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
  }
  else {
    // Monthly view
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
  }
  return dates;
};

// --- LOGIC HOOK ---
// Separating logic from UI for cleanliness
const useHabitLogic = (initialHabits: Habit[], initialLogs: HabitLog[]) => {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [logs, setLogs] = useState<HabitLog[]>(initialLogs);

  const toggleHabit = useCallback((habitId: string, date: Date) => {
    const dateStr = formatDateKey(date);
    setLogs(prev => {
      const existingIndex = prev.findIndex(l => l.habitId === habitId && l.dateString === dateStr);
      if (existingIndex > -1) {
        const newLogs = [...prev];
        // Toggle or remove? Let's toggle.
        newLogs[existingIndex] = { ...newLogs[existingIndex], completed: !newLogs[existingIndex].completed };
        return newLogs;
      }
      return [...prev, { habitId, dateString: dateStr, completed: true }];
    });
  }, []);

  const addHabit = (name: string) => {
    const newHabit: Habit = {
      id: `h${Date.now()}`,
      name,
      category: "General",
      frequency: "daily",
      startDate: new Date(),
      archived: false
    };
    setHabits([...habits, newHabit]);
  };

  const deleteHabit = (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
  };

  const calculateStats = (habitId: string) => {
    // Filter logs for this habit and sort by date ascending
    const habitLogs = logs
      .filter(l => l.habitId === habitId && l.completed)
      .sort((a, b) => new Date(a.dateString).getTime() - new Date(b.dateString).getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let totalCompleted = habitLogs.length;

    // Simple streak calculation (Assumes daily frequency for simplicity)
    // For production, you'd check gaps based on frequency
    if (habitLogs.length > 0) {
      let tempStreak = 1;
      const todayStr = formatDateKey(new Date());
      const yesterdayStr = formatDateKey(new Date(new Date().setDate(new Date().getDate() - 1)));

      // Check if active today or yesterday to maintain current streak
      const lastLog = habitLogs[habitLogs.length - 1];
      const isActive = lastLog.dateString === todayStr || lastLog.dateString === yesterdayStr;

      // Calculate Longest
      for (let i = 1; i < habitLogs.length; i++) {
        const prev = new Date(habitLogs[i - 1].dateString);
        const curr = new Date(habitLogs[i].dateString);
        const diffTime = Math.abs(curr.getTime() - prev.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      // If the last log was today or yesterday, the tempStreak is the current streak
      // This is a simplified check
      currentStreak = isActive ? tempStreak : 0;
    }

    return { currentStreak, longestStreak, totalCompleted };
  };

  return { habits, logs, toggleHabit, addHabit, deleteHabit, calculateStats };
};

// --- SUB-COMPONENT: HABIT ROW (MEMOIZED FOR PERFORMANCE) ---
// This prevents the entire table from re-rendering when one checkbox is clicked
const HabitRow = React.memo(({
  habit,
  dates,
  logs,
  onToggle,
  onDelete,
  stats
}: {
  habit: Habit,
  dates: Date[],
  logs: HabitLog[],
  onToggle: (id: string, date: Date) => void,
  onDelete: (id: string) => void,
  stats: { currentStreak: number, longestStreak: number, totalCompleted: number }
}) => {
  return (
    <tr className="group hover:bg-muted/30 transition-colors border-b border-border/50">
      {/* Sticky Left Column: Info & Stats */}
      <td className="sticky left-0 z-20 bg-background/95 backdrop-blur border-r border-border p-0 min-w-[280px]">
        <div className="flex flex-col p-3 h-full justify-center">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-sm truncate max-w-[150px]" title={habit.name}>{habit.name}</span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              {/* <Button variant="ghost" size="icon" className="h-6 w-6"><Archive className="h-3 w-3" /></Button> */}
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(habit.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-orange-500 font-medium">
              <Flame className="h-3 w-3" /> {stats.currentStreak}
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="h-3 w-3" /> {stats.longestStreak}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" /> {stats.totalCompleted}
            </span>
          </div>
        </div>
      </td>

      {/* Date Columns */}
      {dates.map(date => {
        const dateKey = formatDateKey(date);
        const isCompleted = logs.some(l => l.habitId === habit.id && l.dateString === dateKey && l.completed);
        const isToday = dateKey === formatDateKey(new Date());

        return (
          <td key={dateKey} className={cn(
            "p-0 text-center border-r border-border/30 min-w-[40px]",
            isToday ? "bg-accent/10" : ""
          )}>
            <div className="flex items-center justify-center h-16 w-full">
              <Checkbox
                className={cn(
                  "h-5 w-5 transition-all duration-200",
                  isCompleted ? "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" : "opacity-30 hover:opacity-100"
                )}
                checked={isCompleted}
                onCheckedChange={() => onToggle(habit.id, date)}
              />
            </div>
          </td>
        );
      })}
    </tr>
  );
});

HabitRow.displayName = "HabitRow";

// --- MAIN COMPONENT ---
const Tracker = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [newHabitName, setNewHabitName] = useState("");

  const { habits, logs, toggleHabit, addHabit, deleteHabit, calculateStats } = useHabitLogic(mockHabits, mockLogs);

  // Memoize the dates to render to avoid recalculating on every toggle
  const datesInView = useMemo(() => getDatesForView(viewMode, currentDate), [viewMode, currentDate]);

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === "weekly") {
      newDate.setDate(newDate.getDate() + (offset * 7));
    } else if (viewMode === "daily") {
      newDate.setDate(newDate.getDate() + offset);
    } else {
      newDate.setMonth(newDate.getMonth() + offset);
    }
    setCurrentDate(newDate);
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    addHabit(newHabitName);
    setNewHabitName("");
  };

  return (
    <div className="h-full w-full flex flex-col space-y-4">
      <Card className="flex-1 border-border shadow-sm overflow-hidden flex flex-col">
        {/* HEADER CONTROLS */}
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => handleMonthChange(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-xl font-bold w-32 text-center">
              {viewMode === "monthly"
                ? currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
                : viewMode === "weekly"
                  ? "Week of " + currentDate.getDate()
                  : currentDate.toLocaleDateString()
              }
            </CardTitle>
            <Button size="icon" variant="ghost" onClick={() => handleMonthChange(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <form onSubmit={handleAddHabit} className="flex gap-2 w-full">
              <Input
                placeholder="New habit..."
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="h-9"
              />
              <Button type="submit" size="sm" variant="default">
                <PlusCircle className="mr-2 h-4 w-4" /> Add
              </Button>
            </form>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full flex-1 flex flex-col">
            <div className="px-4 py-2 bg-muted/20 border-b flex justify-between items-center">
              <TabsList className="grid w-[300px] grid-cols-3 h-8">
                <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
                <TabsTrigger value="weekly" className="text-xs">Weekly</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
              </TabsList>
              <div className="text-xs text-muted-foreground hidden md:block">
                {habits.length} Active Habits
              </div>
            </div>

            <TabsContent value={viewMode} className="flex-1 overflow-auto m-0 data-[state=inactive]:hidden relative">
              <table className="w-full border-collapse min-w-[800px]">
                {/* TABLE HEADER */}
                <thead className="bg-muted/50 z-30 sticky top-0 shadow-sm">
                  <tr>
                    <th className="sticky left-0 z-40 bg-muted p-3 border-r border-border text-left min-w-[280px] shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">
                      <span className="text-sm font-medium">Habit & Stats</span>
                    </th>
                    {datesInView.map(day => {
                      const isToday = formatDateKey(day) === formatDateKey(new Date());
                      return (
                        <th key={day.toISOString()} className={cn(
                          "p-2 border-r border-border/50 text-center min-w-[50px] transition-colors",
                          isToday ? "bg-primary/10 text-primary" : ""
                        )}>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                              {day.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                            </span>
                            <span className={cn("text-sm font-bold", isToday ? "text-primary" : "")}>
                              {day.getDate()}
                            </span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>

                {/* TABLE BODY */}
                <tbody className="bg-card">
                  {habits.filter(h => !h.archived).map(habit => (
                    <HabitRow
                      key={habit.id}
                      habit={habit}
                      dates={datesInView}
                      logs={logs}
                      onToggle={toggleHabit}
                      onDelete={deleteHabit}
                      stats={calculateStats(habit.id)}
                    />
                  ))}

                  {habits.length === 0 && (
                    <tr>
                      <td colSpan={datesInView.length + 1} className="p-8 text-center text-muted-foreground">
                        No habits found. Add one to get started!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tracker;