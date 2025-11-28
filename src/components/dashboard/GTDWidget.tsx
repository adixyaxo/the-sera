import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, ArrowRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export const GTDWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nowTasks, setNowTasks] = useState<any[]>([]);

  useEffect(() => {
    loadNowTasks();
  }, [user]);

  const loadNowTasks = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("cards")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "task")
      .eq("gtd_status", "NOW")
      .order("priority", { ascending: true })
      .limit(3);

    if (data) setNowTasks(data);
  };

  return (
    <div className="relative rounded-3xl border-[0.75px] border-border p-1">
      <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
      <Card className="glass border-0 rounded-2xl relative">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-accent" />
              <span>Top NOW Tasks</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/tasks")}
              className="rounded-full"
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {nowTasks.length > 0 ? (
            nowTasks.map((task) => (
              <div
                key={task.card_id}
                className="p-3 rounded-2xl hover:bg-background/50 transition-smooth cursor-pointer"
                onClick={() => navigate("/tasks")}
              >
                <p className="font-medium text-sm line-clamp-1">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="rounded-full text-xs">
                    {task.priority}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm mb-3">No NOW tasks yet</p>
              <Button onClick={() => navigate("/tasks")} className="rounded-full" size="sm">
                <Plus className="h-4 w-4 mr-2" /> Create Task
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
