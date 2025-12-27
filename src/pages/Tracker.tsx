import React, { useState, useMemo, useCallback, useEffect } from "react";
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
  CalendarDays,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// --- SUPABASE & AUTH ---
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// --- LAYOUT ---
import { Header } from "@/components/layout/Header";
import { FloatingBackground } from "@/components/dashboard/FloatingBackground";
import { SeraFAB } from "@/components/sera/SeraFAB";

// --- TYPES ---
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

// --- HELPERS ---
const formatDateKey = (date: Date) => date.toISOString().split('T')[0];
const generateLogKey = (habitId: string, date: Date) => `${habitId}|${formatDateKey(date)}`;

const getDatesForView = (view: ViewMode, currentDate: Date): Date[] => {
  const dates: Date[] = [];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  if (view === "daily") {
    dates.push(new Date(currentDate));
  } else if (view === "weekly") {
    const dayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    // Adjust to start on Sunday
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

// --- LOGIC HOOK ---
const useHabitLogic = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);

  // PERFORMANCE: Using a Set for O(1) lookup speed
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // FIX: Cast supabase to 'any' to bypass missing table definition error
      const { data: habitsData, error: habitsError } = await (supabase as any)
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: true });

      if (habitsError) throw habitsError;

      // FIX: Cast supabase to 'any' for logs as well
      const { data: logsData, error: logsError } = await (supabase as any)
        .from('habit_logs')
        .select('*')
        .in('habit_id', habitsData.map((h: any) => h.id));

      if (logsError) throw logsError;

      const loadedHabits: Habit[] = habitsData.map((h: any) => ({
        id: h.id,
        name: h.name,
        category: h.category,
        frequency: h.frequency as Frequency,
        startDate: new Date(h.start_date),
        archived: h.archived
      }));

      // Convert array logs to a Set of "habitId|dateString"
      const newSet = new Set<string>();
      logsData.forEach((l: any) => {
        if (l.completed) newSet.add(`${l.habit_id}|${l.date_string}`);
      });

      setHabits(loadedHabits);
      setCompletedSet(newSet);
    } catch (error) {
      console.error("Error loading habits:", error);
      toast.error("Failed to load habits");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleHabit = async (habitId: string, date: Date) => {
    const dateStr = formatDateKey(date);
    const key = `${habitId}|${dateStr}`;

    const isCompleted = completedSet.has(key);

    // Optimistic Update
    setCompletedSet(prev => {
      const next = new Set(prev);
      if (isCompleted) next.delete(key);
      else next.add(key);
      return next;
    });

    try {
      if (isCompleted) {
        await (supabase as any)
          .from('habit_logs')
          .delete()
          .match({ habit_id: habitId, date_string: dateStr });
      } else {
        await (supabase as any)
          .from('habit_logs')
          .insert({ habit_id: habitId, date_string: dateStr, completed: true });
      }
    } catch (error) {
      console.error("Error toggling habit:", error);
      toast.error("Failed to save progress");
      // Revert on error
      setCompletedSet(prev => {
        const next = new Set(prev);
        if (isCompleted) next.add(key);
        else next.delete(key);
        return next;
      });
    }
  };

  const addHabit = async (name: string) => {
    if (!user) return;
    try {
      const { data, error } = await (supabase as any)
        .from('habits')
        .insert({
          user_id: user.id,
          name: name,
          category: 'General',
          frequency: 'daily',
          // FIX: Correct date format for Postgres Date column
          start_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      setHabits(prev => [...prev, {
        id: data.id,
        name: data.name,
        category: data.category,
        frequency: data.frequency as Frequency,
        startDate: new Date(data.start_date),
        archived: data.archived
      }]);
      toast.success("Habit created");
    } catch (error: any) {
      console.error("Create error:", error);
      toast.error(error.message || "Failed to create habit");
    }
  };

  const deleteHabit = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('habits')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setHabits(prev => prev.filter(h => h.id !== id));
      toast.success("Habit deleted");
    } catch (error) {
      toast.error("Failed to delete habit");
    }
  };

  return { habits, completedSet, loading, toggleHabit, addHabit, deleteHabit };
};

// --- SUB-COMPONENT: ANIMATED HABIT ROW ---
const HabitRow = React.memo(({
  habit,
  dates,
  completedSet,
  onToggle,
  onDelete
}: {
  habit: Habit,
  dates: Date[],
  completedSet: Set<string>,
  onToggle: (id: string, date: Date) => void,
  onDelete: (id: string) => void
}) => {

  // Memoized stats calculation
  const stats = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let currentStreak = 0;
    let tempStreak = 0;
    let longestStreak = 0;
    let totalCompleted = 0;

    let checkDate = new Date(today);
    let key = generateLogKey(habit.id, checkDate);

    if (!completedSet.has(key)) {
      checkDate = yesterday;
      key = generateLogKey(habit.id, checkDate);
    }

    while (completedSet.has(key)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
      key = generateLogKey(habit.id, checkDate);
    }

    const lookback = new Date(habit.startDate);
    const end = new Date();
    // Safety check for invalid dates
    if (!isNaN(lookback.getTime())) {
      for (let d = new Date(lookback); d <= end; d.setDate(d.getDate() + 1)) {
        const k = generateLogKey(habit.id, d);
        if (completedSet.has(k)) {
          totalCompleted++;
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
    }

    return { currentStreak, longestStreak, totalCompleted };
  }, [completedSet, habit.id, habit.startDate]);

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="group hover:bg-muted/30 transition-colors border-b border-white/5 dark:border-white/5"
    >
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

      {dates.map(date => {
        const key = generateLogKey(habit.id, date);
        const isCompleted = completedSet.has(key);
        const isToday = formatDateKey(date) === formatDateKey(new Date());

        return (
          <td key={date.toISOString()} className={cn(
            "p-0 text-center border-r border-border/10 min-w-[50px] relative",
            isToday ? "bg-primary/5" : ""
          )}>
            <div className="flex items-center justify-center h-16 w-full relative">
              <AnimatePresence>
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="absolute inset-0 bg-primary/10"
                  />
                )}
              </AnimatePresence>

              <Checkbox
                className={cn(
                  "h-5 w-5 z-10 transition-all duration-300 rounded-md border-2 data-[state=checked]:scale-110",
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
    </motion.tr>
  );
});
HabitRow.displayName = "HabitRow";

// --- MAIN PAGE ---
const Tracker = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [newHabitName, setNewHabitName] = useState("");

  const { habits, completedSet, loading, toggleHabit, addHabit, deleteHabit } = useHabitLogic();
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

      <main className="pt-32 sm:pt-28 pb-24 sm:pb-16 px-4 sm:px-8 min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header Card */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-6 rounded-3xl bg-background/60 backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-4"
          >
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
              <Button type="submit" size="default" className="rounded-xl px-4 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                <PlusCircle className="mr-2 h-4 w-4" /> Add
              </Button>
            </form>
          </motion.div>

          {/* Table Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-background/40 backdrop-blur-md"
          >

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

            <div className="relative overflow-x-auto min-h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-2 opacity-50" />
                  <p>Loading habits...</p>
                </div>
              ) : (
                <table className="w-full border-collapse min-w-[800px]">
                  <thead className="z-30 sticky top-0">
                    <tr>
                      <th className="sticky left-0 z-40 bg-background/90 backdrop-blur-xl p-4 border-r border-border/40 text-left min-w-[280px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CalendarDays className="h-4 w-4" />
                          <span className="text-sm font-normal">Habits</span>
                        </div>
                      </th>
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
                    <AnimatePresence mode="popLayout">
                      {habits.filter(h => !h.archived).map(habit => (
                        <HabitRow
                          key={habit.id}
                          habit={habit}
                          dates={datesInView}
                          completedSet={completedSet}
                          onToggle={toggleHabit}
                          onDelete={deleteHabit}
                        />
                      ))}
                    </AnimatePresence>

                    {habits.length === 0 && (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <td colSpan={datesInView.length + 1} className="p-12 text-center text-muted-foreground/50">
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center">
                              <PlusCircle className="h-6 w-6 opacity-50" />
                            </div>
                            <p>No habits active. Start by adding one above.</p>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      <SeraFAB />
      <div className="fixed bottom-2 left-2 text-[0.5rem] text-muted-foreground/50 select-none z-50">
        made by aditya
      </div>
    </div>
  );
};

export default Tracker;