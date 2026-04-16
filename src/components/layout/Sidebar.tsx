import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { LayoutDashboard, Users, Monitor, Ticket, Settings, LogOut, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { users } = useUsers();
  
  const currentUserRole = users?.find(u => u.uid === user?.uid)?.role || 'tech';
  const isAdmin = currentUserRole === 'admin';

  const NAV_ITEMS = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Ticket, label: "Tickets", href: "/tickets" },
    { icon: Monitor, label: "Assets", href: "/assets" },
    { icon: Users, label: "Clients", href: "/clients" },
    ...(isAdmin ? [{ icon: PieChart, label: "Reports", href: "/reports" }] : [])
  ];

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col hidden md:flex shrink-0 shadow-lg">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h1 className="text-xl font-headline font-bold text-primary flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-primary" />
          </div>
          <span className="tracking-wide">IL-MSP NOC</span>
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="space-y-1">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
          <button
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
            onClick={() => logout()}
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
