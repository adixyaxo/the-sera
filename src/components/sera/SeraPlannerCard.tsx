import React from 'react';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle, Target, Clock, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSeraPlanner } from '@/hooks/useSeraPlanner';
import { cn } from '@/lib/utils';

export function SeraPlannerCard() {
  const { plan, isLoading, analyzeTasks } = useSeraPlanner();

  const workloadColors = {
    light: 'bg-green-500/20 text-green-400 border-green-500/30',
    moderate: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    heavy: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    overloaded: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-primary" />
          AI Planner
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={analyzeTasks}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </CardHeader>

      <CardContent>
        {!plan && !isLoading && (
          <div className="text-center py-6">
            <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Click refresh to get AI-powered task analysis
            </p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing your tasks...</p>
          </div>
        )}

        {plan && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Workload Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Workload:</span>
              <Badge 
                variant="outline" 
                className={cn(workloadColors[plan.analysis?.workload || 'moderate'])}
              >
                {plan.analysis?.workload || 'Unknown'}
              </Badge>
            </div>

            {/* Summary */}
            {plan.summary && (
              <p className="text-sm text-muted-foreground">{plan.summary}</p>
            )}

            {/* Risk Items */}
            {plan.analysis?.risk_items && plan.analysis.risk_items.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-sm font-medium text-yellow-400">
                  <AlertTriangle className="w-4 h-4" />
                  Attention Needed
                </div>
                <ul className="space-y-1">
                  {plan.analysis.risk_items.slice(0, 3).map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground pl-5">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Today's Focus */}
            {plan.today_focus && plan.today_focus.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-sm font-medium text-primary">
                  <Target className="w-4 h-4" />
                  Today's Focus
                </div>
                <ul className="space-y-2">
                  {plan.today_focus.slice(0, 3).map((focus, i) => (
                    <li 
                      key={i} 
                      className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2"
                    >
                      <Clock className="w-3 h-3" />
                      <span className="capitalize">{focus.suggested_time}</span>
                      <span>•</span>
                      <span>{focus.duration_estimate}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {plan.recommendations && plan.recommendations.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Recommendations</div>
                <ul className="space-y-1">
                  {plan.recommendations.slice(0, 3).map((rec, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="mr-2 text-[10px]">
                        {rec.type}
                      </Badge>
                      {rec.suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
