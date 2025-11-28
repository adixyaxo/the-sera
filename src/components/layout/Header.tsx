import { LayoutDashboard, Calendar, CheckSquare, Folder, FileText, Zap, BarChart3, LogOut, User } from "lucide-react";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: "Dashboard", url: "/", icon: LayoutDashboard },
    { name: "Calendar", url: "/calendar", icon: Calendar },
    { name: "Tasks", url: "/tasks", icon: CheckSquare },
    { name: "Projects", url: "/projects", icon: Folder },
    { name: "Notes", url: "/notes", icon: FileText },
    { name: "Automations", url: "/automations", icon: Zap },
    { name: "Analytics", url: "/analytics", icon: BarChart3 },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex items-center justify-center w-full px-8">
      <NavBar items={navItems} />

      {user && (
        <div className="fixed top-6 right-8 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full glass-strong">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass border-border">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};
