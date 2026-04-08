import { BarChart3, Package, FileText, Users, Settings, TrendingUp } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: BarChart3, label: "Dashboard", path: "/" },
  { icon: Package, label: "Stock", path: "/stock" },
  { icon: Users, label: "Cuentas", path: "/cuentas" },
  { icon: FileText, label: "Reportes", path: "/reportes" },
  { icon: Settings, label: "Configuración", path: "/config" },
];

export const AppSidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-sidebar-accent-foreground">GestiónPro</h1>
          <p className="text-xs text-sidebar-foreground">PyME Analytics</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">JD</span>
          </div>
          <div>
            <p className="text-sm font-medium text-sidebar-accent-foreground">Juan Díaz</p>
            <p className="text-xs text-sidebar-foreground">Administrador</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
