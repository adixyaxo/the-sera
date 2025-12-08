import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Clock, CheckCircle2, Target, Zap, Flame, Calendar, ListTodo, Folder } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { useTaskAnalytics } from "@/hooks/useTaskAnalytics";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const Analytics = () => {
  const { analytics, isLoading } = useTaskAnalytics();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full">
        <Header />
        <main className="pt-32 sm:pt-28 pb-24 sm:pb-16 px-8 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="glass p-6 rounded-3xl animate-pulse">
              <div className="h-8 w-48 bg-muted rounded mb-2" />
              <div className="h-4 w-64 bg-muted rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="glass rounded-3xl animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-24 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen w-full">
        <Header />
        <main className="pt-32 sm:pt-28 pb-24 sm:pb-16 px-8 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="glass p-12 rounded-3xl text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-medium mb-2">No Analytics Data</h2>
              <p className="text-muted-foreground">Start creating tasks to see your productivity insights.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const stats = [
    {
      name: "Total Tasks",
      value: analytics.totalTasks,
      subtitle: `${analytics.pendingTasks} pending`,
      icon: ListTodo,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      name: "Completed",
      value: analytics.completedTasks,
      subtitle: `${analytics.averageCompletionRate}% rate`,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      name: "This Week",
      value: analytics.completedThisWeek,
      subtitle: `${analytics.completedToday} today`,
      icon: Calendar,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      name: "Streak",
      value: `${analytics.streak} days`,
      subtitle: "Keep it going!",
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  const gtdData = [
    { name: "NOW", value: analytics.gtdDistribution.now, color: "hsl(var(--accent))" },
    { name: "NEXT", value: analytics.gtdDistribution.next, color: "hsl(var(--primary))" },
    { name: "LATER", value: analytics.gtdDistribution.later, color: "hsl(var(--muted-foreground))" },
  ];

  const priorityData = [
    { name: "High", value: analytics.priorityDistribution.high, color: "hsl(var(--destructive))" },
    { name: "Medium", value: analytics.priorityDistribution.medium, color: "hsl(var(--accent))" },
    { name: "Low", value: analytics.priorityDistribution.low, color: "hsl(var(--muted-foreground))" },
  ];

  return (
    <div className="min-h-screen w-full">
      <Header />

      <main className="pt-32 sm:pt-28 pb-24 sm:pb-16 px-8 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="animate-fade-in glass p-6 rounded-3xl">
            <h1 className="text-3xl font-light mb-2">Analytics</h1>
            <p className="text-muted-foreground">Track your productivity and task insights</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="relative rounded-3xl border-[0.75px] border-border p-2">
                  <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
                  <Card className="glass border-0 rounded-2xl relative">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-2xl ${stat.bgColor} ${stat.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                      <p className="text-3xl font-light mb-1">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.name}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">{stat.subtitle}</p>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Activity Chart */}
            <div className="relative rounded-3xl border-[0.75px] border-border p-2">
              <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
              <Card className="glass border-0 rounded-2xl relative">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-accent" />
                    Weekly Activity
                  </CardTitle>
                  <CardDescription>Tasks completed over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.dailyStats}>
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "12px",
                          }}
                        />
                        <Bar dataKey="completed" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Completed" />
                        <Bar dataKey="created" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Created" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* GTD Distribution */}
            <div className="relative rounded-3xl border-[0.75px] border-border p-2">
              <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
              <Card className="glass border-0 rounded-2xl relative">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-accent" />
                    GTD Distribution
                  </CardTitle>
                  <CardDescription>Tasks by status (NOW / NEXT / LATER)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {analytics.pendingTasks > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={gtdData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {gtdData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "12px",
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No pending tasks
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Priority & Projects Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Distribution */}
            <div className="relative rounded-3xl border-[0.75px] border-border p-2">
              <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
              <Card className="glass border-0 rounded-2xl relative">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-accent" />
                    Priority Breakdown
                  </CardTitle>
                  <CardDescription>Pending tasks by priority level</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {priorityData.map((item) => {
                    const total = analytics.pendingTasks || 1;
                    const percentage = Math.round((item.value / total) * 100);
                    return (
                      <div key={item.name} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: item.color }}>{item.name}</span>
                          <span className="text-muted-foreground">
                            {item.value} ({percentage}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" style={{ "--progress-color": item.color } as any} />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Project Progress */}
            <div className="relative rounded-3xl border-[0.75px] border-border p-2">
              <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
              <Card className="glass border-0 rounded-2xl relative">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Folder className="h-5 w-5 text-accent" />
                    Project Progress
                  </CardTitle>
                  <CardDescription>Task completion by project</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.projectStats.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.projectStats.slice(0, 5).map((project) => {
                        const percentage = project.total > 0 ? Math.round((project.completed / project.total) * 100) : 0;
                        return (
                          <div key={project.id} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="truncate max-w-[200px]">{project.name}</span>
                              <span className="text-muted-foreground">
                                {project.completed}/{project.total}
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No projects with tasks yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Completion Rate Card */}
          <div className="relative rounded-3xl border-[0.75px] border-border p-2">
            <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} borderWidth={3} />
            <Card className="glass border-0 rounded-2xl relative">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Overall Completion Rate
                </CardTitle>
                <CardDescription>Your all-time task completion performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="hsl(var(--accent))"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${analytics.averageCompletionRate * 2.51} 251`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-semibold">{analytics.averageCompletionRate}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      {analytics.completedTasks} of {analytics.totalTasks} tasks completed
                    </p>
                    <p className="text-muted-foreground">
                      {analytics.completedThisMonth} completed this month
                    </p>
                    {analytics.streak > 0 && (
                      <p className="text-accent flex items-center gap-2">
                        <Flame className="h-4 w-4" />
                        {analytics.streak} day streak!
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
