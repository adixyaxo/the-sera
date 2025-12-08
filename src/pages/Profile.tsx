import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { User, Mail, Calendar as CalendarIcon, Save, Bell, Palette, Globe, Shield, LogOut } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  const [saving, setSaving] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationPush, setNotificationPush] = useState(true);
  const [theme, setTheme] = useState("system");

  // Initialize form when profile loads
  useState(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setTimezone(profile.timezone || "UTC");
      setNotificationEmail(profile.notification_email ?? true);
      setNotificationPush(profile.notification_push ?? true);
      setTheme(profile.theme || "system");
    }
  });

  // Update form when profile changes
  if (profile && fullName === "" && profile.full_name) {
    setFullName(profile.full_name);
    setBio(profile.bio || "");
    setTimezone(profile.timezone || "UTC");
    setNotificationEmail(profile.notification_email ?? true);
    setNotificationPush(profile.notification_push ?? true);
    setTheme(profile.theme || "system");
  }

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

  if (loading) {
    return (
      <div className="min-h-screen w-full">
        <Header />
        <main className="pt-28 sm:pt-24 pb-20 sm:pb-16 px-4 sm:px-8 min-h-screen">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="animate-pulse">
              <div className="h-24 bg-muted rounded-3xl mb-6" />
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
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="animate-fade-in glass p-4 sm:p-6 rounded-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-light mb-2">Profile Settings</h1>
                <p className="text-muted-foreground text-sm sm:text-base">Manage your account and preferences</p>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="rounded-full bg-accent hover:bg-accent/90"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Account Details */}
            <Card className="glass border-border">
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
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user?.email}</span>
                  </div>
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

                <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Member Since</p>
                    <p className="text-sm font-medium">
                      {user?.created_at ? format(new Date(user.created_at), "MMMM d, yyyy") : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card className="glass border-border">
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

            {/* Notifications */}
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

            {/* Security */}
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
