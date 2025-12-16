import { Zap, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export const FocusModeCard = () => {
  // -------------------- STATE --------------------
  const [isActive, setIsActive] = useState(false);
  const [inputHours, setInputHours] = useState(0);
  const [inputMinutes, setInputMinutes] = useState(25);
  const [inputSeconds, setInputSeconds] = useState(0);

  // Normalize function: converts arbitrary hrs/mins/secs into normalized h/m/s
  const normalizeTime = useCallback((h: number, m: number, s: number) => {
    let totalSeconds = Math.max(0, Math.trunc(h)) * 3600 + Math.max(0, Math.trunc(m)) * 60 + Math.max(0, Math.trunc(s));
    const nh = Math.floor(totalSeconds / 3600);
    totalSeconds -= nh * 3600;
    const nm = Math.floor(totalSeconds / 60);
    const ns = totalSeconds - nm * 60;
    return { nh, nm, ns, totalSeconds: nh * 3600 + nm * 60 + ns };
  }, []);

  const handleHoursChange = (raw: number) => {
    const { nh, nm, ns } = normalizeTime(raw, inputMinutes, inputSeconds);
    setInputHours(nh);
    setInputMinutes(nm);
    setInputSeconds(ns);
  };

  const handleMinutesChange = (raw: number) => {
    const { nh, nm, ns } = normalizeTime(inputHours, raw, inputSeconds);
    setInputHours(nh);
    setInputMinutes(nm);
    setInputSeconds(ns);
  };

  const handleSecondsChange = (raw: number) => {
    const { nh, nm, ns } = normalizeTime(inputHours, inputMinutes, raw);
    setInputHours(nh);
    setInputMinutes(nm);
    setInputSeconds(ns);
  };

  const initialTotal = inputHours * 3600 + inputMinutes * 60 + inputSeconds;
  const [timeLeft, setTimeLeft] = useState(initialTotal);

  useEffect(() => {
    if (!isActive) setTimeLeft(initialTotal);
  }, [inputHours, inputMinutes, inputSeconds, initialTotal, isActive]);

  // -------------------- TIMER EFFECT --------------------
  useEffect(() => {
    let interval: number | undefined;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  // -------------------- ACTIONS --------------------
  const toggleTimer = () => setIsActive((prev) => !prev);

  const resetTimer = () => {
    const { nh, nm, ns, totalSeconds } = normalizeTime(inputHours, inputMinutes, inputSeconds);
    setInputHours(nh);
    setInputMinutes(nm);
    setInputSeconds(ns);
    setIsActive(false);
    setTimeLeft(totalSeconds);
  };

  // -------------------- DISPLAY VALUES --------------------
  const displayHours = Math.floor(timeLeft / 3600);
  const displayMinutes = Math.floor((timeLeft % 3600) / 60);
  const displaySeconds = timeLeft % 60;
  const progress = initialTotal > 0 ? ((initialTotal - timeLeft) / initialTotal) * 100 : 0;

  return (
    <motion.div 
      className={cn(
        "glass rounded-3xl p-6 animate-fade-in transition-all duration-500",
        isActive && "ring-2 ring-accent/30 glow-soft"
      )}
      layout
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <motion.div
            animate={isActive ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
          >
            <Zap className={cn("h-5 w-5 transition-colors", isActive ? "text-accent" : "text-muted-foreground")} />
          </motion.div>
          <h3 className="text-lg font-medium tracking-tight">Focus Mode</h3>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-accent/10 transition-smooth"
            onClick={resetTimer}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full transition-smooth",
              isActive ? "bg-accent/20 hover:bg-accent/30 text-accent" : "hover:bg-accent/10"
            )}
            onClick={toggleTimer}
          >
            {isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* -------------------- INPUT FIELDS -------------------- */}
      <AnimatePresence mode="wait">
        {!isActive && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 justify-center mb-4"
          >
            <input
              type="number"
              min="0"
              className="w-14 p-2 rounded-xl bg-muted/50 border border-border/50 text-center text-sm font-medium focus:border-accent/50 focus:outline-none transition-colors"
              value={inputHours}
              onChange={(e) => setInputHours(Number(e.target.value || 0))}
              onBlur={(e) => handleHoursChange(Number(e.target.value || 0))}
            />
            <span className="text-xs text-muted-foreground">h</span>

            <input
              type="number"
              min="0"
              className="w-14 p-2 rounded-xl bg-muted/50 border border-border/50 text-center text-sm font-medium focus:border-accent/50 focus:outline-none transition-colors"
              value={inputMinutes}
              onChange={(e) => setInputMinutes(Number(e.target.value || 0))}
              onBlur={(e) => handleMinutesChange(Number(e.target.value || 0))}
            />
            <span className="text-xs text-muted-foreground">m</span>

            <input
              type="number"
              min="0"
              className="w-14 p-2 rounded-xl bg-muted/50 border border-border/50 text-center text-sm font-medium focus:border-accent/50 focus:outline-none transition-colors"
              value={inputSeconds}
              onChange={(e) => setInputSeconds(Number(e.target.value || 0))}
              onBlur={(e) => handleSecondsChange(Number(e.target.value || 0))}
            />
            <span className="text-xs text-muted-foreground">s</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- TIMER DISPLAY -------------------- */}
      <motion.div 
        className="text-center"
        animate={isActive ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
      >
        <div className={cn(
          "text-5xl font-light mb-2 transition-all duration-500 tracking-tight tabular-nums",
          isActive && "text-accent"
        )}>
          {String(displayHours).padStart(2, "0")}:{String(displayMinutes).padStart(2, "0")}:{String(displaySeconds).padStart(2, "0")}
        </div>
        <motion.div 
          className={cn(
            "text-sm transition-colors",
            isActive ? "text-accent/80" : "text-muted-foreground"
          )}
          animate={isActive ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
          transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
        >
          {isActive ? "Deep Work in Progress" : "Deep Work Session"}
        </motion.div>
      </motion.div>

      {/* -------------------- PROGRESS BAR -------------------- */}
      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden mt-6">
        <motion.div
          className="h-full bg-gradient-to-r from-accent/80 to-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">
        <span>Start</span>
        <span className="text-accent/70">{Math.round(progress)}%</span>
        <span>Complete</span>
      </div>
    </motion.div>
  );
};
