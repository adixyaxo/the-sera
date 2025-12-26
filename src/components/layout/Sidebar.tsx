import { LayoutDashboard, Calendar, CheckSquare, FileText, Zap, BarChart3, Target } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Calendar, label: "Calendar", path: "/calendar" },
  { icon: CheckSquare, label: "Tasks", path: "/tasks" },
  { icon: FileText, label: "Notes", path: "/notes" },
  { icon: Zap, label: "Automations", path: "/automations" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Target, label: "Traker", path: "/traker" },
];

export const Sidebar = () => {
  return (
    <aside className="glass-strong fixed left-0 top-16 bottom-0 z-50 w-20 flex flex-col items-center py-8 gap-6 group hover:w-56 transition-all duration-300 overflow-hidden">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-4 w-full px-6 py-3 rounded-2xl transition-smooth",
              "hover:bg-accent/10 hover:scale-[1.01]",
              isActive && "bg-accent/10 text-accent"
            )
          }
        >
          <item.icon className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            {item.label}
          </span>
        </NavLink>
      ))}
    </aside>
  );
};
