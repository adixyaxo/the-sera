import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen w-full">
      <Header />

      <main className="pt-28 sm:pt-24 pb-20 sm:pb-16 px-4 sm:px-8 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="animate-fade-in glass p-4 sm:p-6 rounded-3xl">
            <h1 className="text-2xl sm:text-3xl font-light mb-2">Profile</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Your account information</p>
          </div>

          <Card className="glass border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <User className="h-5 w-5 text-accent" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/50">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">
                    {user?.created_at ? format(new Date(user.created_at), "MMMM d, yyyy") : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border">
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                No integrations configured yet. Check back later for Google Calendar and other integration options.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
