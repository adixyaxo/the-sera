import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, Mail, Calendar as CalendarIcon, Save, Bell, Palette, Globe, 
  Shield, LogOut, CheckCircle2, Target, Flame, Clock, TrendingUp,
  Zap, Award
} from "lucide-react";
import { format, subDays, startOfWeek, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface ProductivityStats {
  totalTasks: number;
  completedTasks: number;
  completedThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  nowTasks: number;
  nextTasks: number;
  laterTasks: number;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<ProductivityStats>({
    totalTasks: 0,
    completedTasks: 0,
    completedThisWeek: 0,
    currentStreak: 0,
    longestStreak: 0,
    nowTasks: 0,
    nextTasks: 0,
    laterTasks: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Form state
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationPush, setNotificationPush] = useState(true);
  const [theme, setTheme] = useState("system");

  // Load productivity stats
  const loadStats = useCallback(async () => {
    if (!user) return;

    setStatsLoading(true);
    try {
      const { data: allTasks } = await supabase
        .from("cards")
        .select("card_id, status, gtd_status, completed_at, created_at")
        .eq("user_id", user.id)
        .eq("type", "task")
        .neq("status", "reject");

      if (allTasks) {
        const now = new Date();
        const weekStart = startOfWeek(now);
        
        const completed = allTasks.filter(t => t.status === "completed");
        const completedThisWeek = completed.filter(t => 
          t.completed_at && new Date(t.completed_at) >= weekStart
        );
        
        const active = allTasks.filter(t => t.status !== "completed");
        const nowTasks = active.filter(t => t.gtd_status === "NOW");
        const nextTasks = active.filter(t => t.gtd_status === "NEXT");
        const laterTasks = active.filter(t => t.gtd_status === "LATER");

        // Calculate streak (consecutive days with completed tasks)
        let currentStreak = 0;
        let checkDate = subDays(now, 1);
        
        for (let i = 0; i < 365; i++) {
          const dayCompleted = completed.some(t => {
            if (!t.completed_at) return false;
            const completedDate = new Date(t.completed_at);
            return (
              completedDate.getDate() === checkDate.getDate() &&
              completedDate.getMonth() === checkDate.getMonth() &&
              completedDate.getFullYear() === checkDate.getFullYear()
            );
          });
          
          if (dayCompleted) {
            currentStreak++;
            checkDate = subDays(checkDate, 1);
          } else {
            break;
          }
        }

        // Check if completed today
        const completedToday = completed.some(t => {
          if (!t.completed_at) return false;
          const completedDate = new Date(t.completed_at);
          return (
            completedDate.getDate() === now.getDate() &&
            completedDate.getMonth() === now.getMonth() &&
            completedDate.getFullYear() === now.getFullYear()
          );
        });

        if (completedToday) {
          currentStreak++;
        }

        setStats({
          totalTasks: allTasks.length,
          completedTasks: completed.length,
          completedThisWeek: completedThisWeek.length,
          currentStreak,
          longestStreak: currentStreak, // Simplified - would need historical data
          nowTasks: nowTasks.length,
          nextTasks: nextTasks.length,
          laterTasks: laterTasks.length,
        });
      }
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Update form when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setTimezone(profile.timezone || "UTC");
      setNotificationEmail(profile.notification_email ?? true);
      setNotificationPush(profile.notification_push ?? true);
      setTheme(profile.theme || "system");
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      full_name: fullName,
      bio,
      timezone,
      notification_email: notificationEmail,
      notification_push: notificationPush,
      theme,
    });
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  const timezones = [
    { value: "UTC", label: "UTC (Coordinated Universal Time)" },
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "Europe/London", label: "London (GMT)" },
    { value: "Europe/Paris", label: "Paris (CET)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Asia/Kolkata", label: "India (IST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST)" },
  ];

  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;

  const statCards = [
    { 
      label: "Tasks Completed", 
      value: stats.completedTasks, 
      icon: CheckCircle2, 
      color: "hsl(var(--accent))",
      bg: "bg-accent/10"
    },
    { 
      label: "Current Streak", 
      value: `${stats.currentStreak} days`, 
      icon: Flame, 
      color: "hsl(0 75% 60%)",
      bg: "bg-destructive/10"
    },
    { 
      label: "This Week", 
      value: stats.completedThisWeek, 
      icon: TrendingUp, 
      color: "hsl(120 60% 45%)",
      bg: "bg-green-500/10"
    },
    { 
      label: "Active Tasks", 
      value: stats.nowTasks + stats.nextTasks + stats.laterTasks, 
      icon: Target, 
      color: "hsl(var(--primary))",
      bg: "bg-primary/10"
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen w-full">
        <Header />
        <main className="pt-28 sm:pt-24 pb-20 sm:pb-16 px-4 sm:px-8 min-h-screen">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="animate-pulse">
              <div className="h-32 bg-muted rounded-3xl mb-6" />
              <div className="h-64 bg-muted rounded-3xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      <Header />

      <main className="pt-28 sm:pt-24 pb-20 sm:pb-16 px-4 sm:px-8 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Profile Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-3xl border-[0.75px] border-border p-1"
          >
            <GlowingEffect spread={60} glow={true} disabled={false} proximity={80} inactiveZone={0.01} borderWidth={3} />
            <Card className="glass-strong border-0 rounded-2xl overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-accent/20 via-primary/10 to-accent/20" />
              <CardContent className="relative pt-0 pb-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 -mt-10 sm:-mt-12">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-accent/20 border-4 border-background flex items-center justify-center shadow-xl">
                      <span className="text-3xl sm:text-4xl font-bold text-accent">
                        {fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1 pt-2 sm:pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-light">
                          {fullName || "Your Profile"}
                        </h1>
                        <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                          <Mail className="h-3.5 w-3.5" />
                          {user?.email}
                        </p>
                        {user?.created_at && (
                          <p className="text-muted-foreground text-xs flex items-center gap-2 mt-1">
                            <CalendarIcon className="h-3 w-3" />
                            Member since {format(new Date(user.created_at), "MMMM yyyy")}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-full bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Productivity Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="relative rounded-2xl border-[0.75px] border-border p-0.5"
              >
                <Card className="glass border-0 rounded-xl">
                  <CardContent className="p-4">
                    <div className={`p-2 rounded-xl ${stat.bg} w-fit mb-3`}>
                      <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                    </div>
                    <p className="text-2xl font-semibold" style={{ color: stat.color }}>
                      {statsLoading ? "-" : stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Completion Rate Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="glass border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-accent" />
                    <span className="font-medium">Overall Completion Rate</span>
                  </div>
                  <span className="text-2xl font-bold text-accent">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{stats.completedTasks} completed</span>
                  <span>{stats.totalTasks} total tasks</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* GTD Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-5 w-5 text-accent" />
                  Task Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-xl bg-accent/10">
                    <p className="text-3xl font-bold text-accent">{stats.nowTasks}</p>
                    <p className="text-sm text-muted-foreground">NOW</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-primary/10">
                    <p className="text-3xl font-bold text-primary">{stats.nextTasks}</p>
                    <p className="text-sm text-muted-foreground">NEXT</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted">
                    <p className="text-3xl font-bold text-muted-foreground">{stats.laterTasks}</p>
                    <p className="text-sm text-muted-foreground">LATER</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Settings Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Account Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="glass border-border h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <User className="h-5 w-5 text-accent" />
                    Account Details
                  </CardTitle>
                  <CardDescription>Your personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your name"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself"
                      className="rounded-xl resize-none"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Preferences */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass border-border h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Palette className="h-5 w-5 text-accent" />
                    Preferences
                  </CardTitle>
                  <CardDescription>Customize your experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Timezone
                    </Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="theme" className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Theme
                    </Label>
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-accent" />
                    Notifications
                  </CardTitle>
                  <CardDescription>Manage how you receive updates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-background/50">
                    <div>
                      <p className="text-sm font-medium">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive task reminders via email</p>
                    </div>
                    <Switch
                      checked={notificationEmail}
                      onCheckedChange={setNotificationEmail}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-background/50">
                    <div>
                      <p className="text-sm font-medium">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">Get notified in your browser</p>
                    </div>
                    <Switch
                      checked={notificationPush}
                      onCheckedChange={setNotificationPush}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Security */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-accent" />
                    Security
                  </CardTitle>
                  <CardDescription>Manage your account security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-xl bg-background/50">
                    <p className="text-sm font-medium mb-1">Password</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Change your password through the authentication provider
                    </p>
                    <Button variant="outline" size="sm" className="rounded-full" disabled>
                      Change Password
                    </Button>
                  </div>

                  <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-medium mb-1 text-destructive">Sign Out</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Sign out from your account on this device
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-full"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;