import { Zap, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export const FocusModeCard = () => {
  // -------------------- STATE --------------------
  const [isActive, setIsActive] = useState(false);
  const [inputHours, setInputHours] = useState(0);
  const [inputMinutes, setInputMinutes] = useState(25);
  const [inputSeconds, setInputSeconds] = useState(0);

  const initialTotal = inputHours * 3600 + inputMinutes * 60 + inputSeconds;
  const [timeLeft, setTimeLeft] = useState(initialTotal);

  // Reset timer when inputs change
  useEffect(() => {
    setTimeLeft(initialTotal);
  }, [inputHours, inputMinutes, inputSeconds]);

  // -------------------- TIMER EFFECT --------------------
  useEffect(() => {
    let interval: number | undefined;

    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }

    if (timeLeft === 0) {
      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  // -------------------- ACTIONS --------------------
  const toggleTimer = () => setIsActive((prev) => !prev);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(initialTotal);
  };

  // -------------------- DISPLAY VALUES --------------------
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = initialTotal > 0 ? ((initialTotal - timeLeft) / initialTotal) * 100 : 0;

  return (
    <div className="glass rounded-3xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-medium">Focus Mode</h3>
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
            className="rounded-full hover:bg-accent/10 transition-smooth"
            onClick={toggleTimer}
          >
            {isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* -------------------- INPUT FIELDS -------------------- */}
      <div className="flex items-center gap-2 justify-center mb-4">
        <input
          type="number"
          min="0"
          className="w-16 p-2 rounded-lg bg-background border"
          value={inputHours}
          onChange={(e) => setInputHours(Number(e.target.value))}
        />
        <span className="text-muted-foreground">hrs</span>

        <input
          type="number"
          min="0"
          max="59"
          className="w-16 p-2 rounded-lg bg-background border"
          value={inputMinutes}
          onChange={(e) => setInputMinutes(Number(e.target.value))}
        />
        <span className="text-muted-foreground">min</span>

        <input
          type="number"
          min="0"
          max="59"
          className="w-16 p-2 rounded-lg bg-background border"
          value={inputSeconds}
          onChange={(e) => setInputSeconds(Number(e.target.value))}
        />
        <span className="text-muted-foreground">sec</span>
      </div>

      {/* -------------------- TIMER DISPLAY -------------------- */}
      <div className="text-center">
        <div className={cn(
          "text-4xl font-light mb-2 transition-smooth",
          isActive && "text-accent"
        )}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <div className="text-sm text-muted-foreground">Deep Work Session</div>
      </div>

      {/* -------------------- PROGRESS BAR -------------------- */}
      <div className="h-2 bg-background rounded-full overflow-hidden mt-4">
        <div
          className="h-full bg-accent transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
        <span>High Energy</span>
        <span>Peak Performance</span>
      </div>
    </div>
  );
};