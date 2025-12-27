import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Flame,
  Trophy,
  Activity,
  CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- SERA LAYOUT IMPORTS ---
import { Header } from "@/components/layout/Header";
import { FloatingBackground } from "@/components/dashboard/FloatingBackground";
import { SeraFAB } from "@/components/sera/SeraFAB";

// --- TYPES & LOGIC (Same as before) ---
type Frequency = "daily" | "weekly";
type ViewMode = "daily" | "weekly" | "monthly";

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
  dateString: string;
  completed: boolean;
};

const mockHabits: Habit[] = [
  { id: "h1", name: "Read 30 mins", category: "Personal Growth", frequency: "daily", startDate: new Date("2024-07-01"), archived: false },
  { id: "h2", name: "Deep Work (4h)", category: "Productivity", frequency: "daily", startDate: new Date("2024-07-01"), archived: false },
  { id: "h3", name: "Gym / Cardio", category: "Health", frequency: "daily", startDate: new Date("2024-07-05"), archived: false },
  { id: "h4", name: "Weekly Review", category: "Productivity", frequency: "weekly", startDate: new Date("2024-07-01"), archived: false },
];

const mockLogs: HabitLog[] = [
  { habitId: "h1", dateString: "2024-07-20", completed: true },
  { habitId: "h1", dateString: "2024-07-21", completed: true },
  { habitId: "h1", dateString: "2024-07-22", completed: true },
];

const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

const getDatesForView = (view: ViewMode, currentDate: Date): Date[] => {
  const dates: Date[] = [];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  if (view === "daily") {
    dates.push(new Date(currentDate));
  } else if (view === "weekly") {
    const dayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
  } else {
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
  }
  return dates;
};

const useHabitLogic = (initialHabits: Habit[], initialLogs: HabitLog[]) => {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [logs, setLogs] = useState<HabitLog[]>(initialLogs);

  const toggleHabit = useCallback((habitId: string, date: Date) => {
    const dateStr = formatDateKey(date);
    setLogs(prev => {
      const existingIndex = prev.findIndex(l => l.habitId === habitId && l.dateString === dateStr);
      if (existingIndex > -1) {
        const newLogs = [...prev];
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
    const habitLogs = logs
      .filter(l => l.habitId === habitId && l.completed)
      .sort((a, b) => new Date(a.dateString).getTime() - new Date(b.dateString).getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let totalCompleted = habitLogs.length;

    if (habitLogs.length > 0) {
      let tempStreak = 1;
      const todayStr = formatDateKey(new Date());
      const yesterdayStr = formatDateKey(new Date(new Date().setDate(new Date().getDate() - 1)));
      const lastLog = habitLogs[habitLogs.length - 1];
      const isActive = lastLog.dateString === todayStr || lastLog.dateString === yesterdayStr;

      for (let i = 1; i < habitLogs.length; i++) {
        const prev = new Date(habitLogs[i - 1].dateString);
        const curr = new Date(habitLogs[i].dateString);
        const diffTime = Math.abs(curr.getTime() - prev.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) tempStreak++;
        else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      currentStreak = isActive ? tempStreak : 0;
    }
    return { currentStreak, longestStreak, totalCompleted };
  };

  return { habits, logs, toggleHabit, addHabit, deleteHabit, calculateStats };
};

// --- SUB-COMPONENT: HABIT ROW ---
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
    <tr className="group hover:bg-muted/30 transition-colors border-b border-white/5 dark:border-white/5">
      {/* Sticky Left Column: Glass effect applied here for overlap legibility */}
      <td className="sticky left-0 z-20 bg-background/80 backdrop-blur-md border-r border-border/40 p-0 min-w-[280px]">
        <div className="flex flex-col p-4 h-full justify-center">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium text-sm truncate max-w-[180px] text-foreground/90" title={habit.name}>{habit.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(habit.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground/80">
            <span className="flex items-center gap-1 text-orange-400/90 font-medium">
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
            "p-0 text-center border-r border-border/10 min-w-[50px]",
            isToday ? "bg-primary/5" : ""
          )}>
            <div className="flex items-center justify-center h-16 w-full">
              <Checkbox
                className={cn(
                  "h-5 w-5 transition-all duration-300 rounded-md border-2",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                    : "border-muted-foreground/30 hover:border-primary/50"
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

// --- MAIN PAGE ---
const Tracker = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [newHabitName, setNewHabitName] = useState("");

  const { habits, logs, toggleHabit, addHabit, deleteHabit, calculateStats } = useHabitLogic(mockHabits, mockLogs);
  const datesInView = useMemo(() => getDatesForView(viewMode, currentDate), [viewMode, currentDate]);

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === "weekly") newDate.setDate(newDate.getDate() + (offset * 7));
    else if (viewMode === "daily") newDate.setDate(newDate.getDate() + offset);
    else newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    addHabit(newHabitName);
    setNewHabitName("");
  };

  return (
    <div className="min-h-screen w-full relative">
      <FloatingBackground />
      <Header />

      {/* Main Container - Matches Index.tsx padding/z-index */}
      <main className="pt-32 sm:pt-28 pb-24 sm:pb-16 px-4 sm:px-8 min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header Section with Glass Effect */}
          <div className="glass p-6 rounded-3xl bg-background/60 backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light mb-1">Habit Tracker</h1>
              <p className="text-muted-foreground text-sm">Consistent actions create consistent results.</p>
            </div>

            <form onSubmit={handleAddHabit} className="flex gap-2 w-full md:w-auto">
              <div className="relative">
                <Input
                  placeholder="New habit..."
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  className="h-10 w-full md:w-64 bg-background/50 border-border/40 focus:bg-background/80 transition-all rounded-xl pl-3"
                />
              </div>
              <Button type="submit" size="default" className="rounded-xl px-4 shadow-lg shadow-primary/20">
                <PlusCircle className="mr-2 h-4 w-4" /> Add
              </Button>
            </form>
          </div>

          {/* Main Tracker Card - Glassmorphism applied */}
          <div className="glass rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-background/40 backdrop-blur-md animate-fade-in delay-75">

            {/* Controls Bar */}
            <div className="p-4 border-b border-border/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-background/20">
              <div className="flex items-center gap-2 bg-background/40 p-1 rounded-xl border border-border/10">
                <Button size="icon" variant="ghost" onClick={() => handleMonthChange(-1)} className="h-8 w-8 hover:bg-background/60 rounded-lg">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-32 text-center select-none">
                  {viewMode === "monthly"
                    ? currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
                    : viewMode === "weekly"
                      ? "Week of " + currentDate.getDate()
                      : currentDate.toLocaleDateString()
                  }
                </span>
                <Button size="icon" variant="ghost" onClick={() => handleMonthChange(1)} className="h-8 w-8 hover:bg-background/60 rounded-lg">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList className="bg-background/40 border border-border/10 rounded-xl p-1 h-10">
                  <TabsTrigger value="daily" className="rounded-lg text-xs px-4">Daily</TabsTrigger>
                  <TabsTrigger value="weekly" className="rounded-lg text-xs px-4">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly" className="rounded-lg text-xs px-4">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Table Area */}
            <div className="relative overflow-x-auto min-h-[400px]">
              <table className="w-full border-collapse min-w-[800px]">
                <thead className="z-30 sticky top-0">
                  <tr>
                    {/* Sticky Corner - Solid background required to cover scrolling content */}
                    <th className="sticky left-0 z-40 bg-background/90 backdrop-blur-xl p-4 border-r border-border/40 text-left min-w-[280px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        <span className="text-sm font-normal">Habits</span>
                      </div>
                    </th>
                    {/* Date Headers */}
                    {datesInView.map(day => {
                      const isToday = formatDateKey(day) === formatDateKey(new Date());
                      return (
                        <th key={day.toISOString()} className={cn(
                          "p-2 border-r border-border/10 text-center min-w-[50px] bg-background/60 backdrop-blur-md",
                          isToday ? "bg-primary/5 text-primary" : "text-muted-foreground"
                        )}>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase font-medium opacity-70">
                              {day.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                            </span>
                            <span className={cn("text-sm font-light mt-1", isToday ? "font-bold" : "")}>
                              {day.getDate()}
                            </span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>

                <tbody className="bg-transparent">
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
                      <td colSpan={datesInView.length + 1} className="p-12 text-center text-muted-foreground/50">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center">
                            <PlusCircle className="h-6 w-6 opacity-50" />
                          </div>
                          <p>No habits active. Start by adding one above.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Global Components */}
      <SeraFAB />
      <div className="fixed bottom-2 left-2 text-[0.5rem] text-muted-foreground/50 select-none z-50">
        made by aditya
      </div>
    </div>
  );
};

export default Tracker;