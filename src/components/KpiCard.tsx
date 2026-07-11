import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive";
  onClick?: () => void;
}

const variantStyles = {
  default: "bg-card",
  success: "bg-card border-success/20",
  warning: "bg-card border-warning/20",
  destructive: "bg-card border-destructive/20",
};

const iconVariantStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

export const KpiCard = ({ title, value, change, icon: Icon, variant = "default", onClick }: KpiCardProps) => {
  return (
    <div
      className={cn(
        "rounded-xl border p-6 transition-shadow hover:shadow-lg",
        variantStyles[variant],
        onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-display font-bold text-card-foreground">{value}</p>
          {change !== undefined && (
            <p className={cn("mt-1 text-sm font-medium", change >= 0 ? "text-success" : "text-destructive")}>
              {change >= 0 ? "+" : ""}{change.toFixed(1)}% vs anterior
            </p>
          )}
        </div>
        <div className={cn("rounded-lg p-3", iconVariantStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
