import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, AlertTriangle, Target, Clock, Loader2, RefreshCw, Lightbulb, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSeraPlanner } from '@/hooks/useSeraPlanner';
import { cn } from '@/lib/utils';

export function SeraPlannerCard() {
  const { plan, isLoading, analyzeTasks } = useSeraPlanner();

  // Auto-analyze on mount
  useEffect(() => {
    analyzeTasks();
  }, []);

  const workloadConfig = {
    light: { 
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      icon: '✓',
      label: 'Light'
    },
    moderate: { 
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      icon: '○',
      label: 'Balanced'
    },
    heavy: { 
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      icon: '!',
      label: 'Heavy'
    },
    overloaded: { 
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      icon: '⚠',
      label: 'Overloaded'
    },
  };

  const workloadKey = plan?.analysis?.workload || 'moderate';
  const workload = workloadConfig[workloadKey] || workloadConfig.moderate;

  return (
    <motion.div 
      className="glass rounded-3xl p-5 animate-fade-in"
      layout
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI Planner</h3>
            <p className="text-[10px] text-muted-foreground">Smart insights</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={analyzeTasks}
          disabled={isLoading}
          className="h-8 w-8 rounded-lg hover:bg-accent/10"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {/* Loading State */}
        {isLoading && !plan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8"
          >
            <div className="relative mx-auto w-12 h-12 mb-3">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-accent/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <Brain className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent" />
            </div>
            <p className="text-xs text-muted-foreground">Analyzing your tasks...</p>
          </motion.div>
        )}

        {/* Empty State */}
        {!plan && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-6"
          >
            <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              Click refresh to analyze tasks
            </p>
          </motion.div>
        )}

        {/* Content */}
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Workload Indicator */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Workload</span>
              </div>
              <Badge 
                variant="outline" 
                className={cn("text-[10px] font-medium", workload.color)}
              >
                {workload.label}
              </Badge>
            </div>

            {/* Summary */}
            {plan.summary && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {plan.summary}
              </p>
            )}

            {/* Risk Items */}
            {plan.analysis?.risk_items && plan.analysis.risk_items.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Attention</span>
                </div>
                <div className="space-y-1">
                  {plan.analysis.risk_items.slice(0, 2).map((item, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="text-[11px] text-muted-foreground pl-5 py-1 border-l-2 border-yellow-500/30"
                    >
                      {item}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Today's Focus */}
            {plan.today_focus && plan.today_focus.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
                  <Target className="w-3.5 h-3.5" />
                  <span>Today's Focus</span>
                </div>
                <div className="space-y-1.5">
                  {plan.today_focus.slice(0, 2).map((focus, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-2 text-[11px] text-muted-foreground bg-accent/5 rounded-lg px-3 py-2"
                    >
                      <Clock className="w-3 h-3 text-accent/60" />
                      <span className="capitalize font-medium">{focus.suggested_time}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{focus.duration_estimate}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Recommendations */}
            {plan.recommendations && plan.recommendations.length > 0 && (
              <div className="pt-2 border-t border-border/30">
                <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Tip</span>
                </div>
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                  {plan.recommendations[0]?.suggestion}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
