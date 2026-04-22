import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = {
  label: string;
  to?: string;
  icon?: typeof Home;
};

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-xs", className)}>
      <ol className="flex items-center gap-1 flex-wrap text-muted-foreground">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const Icon = item.icon;
          const content = (
            <span className="inline-flex items-center gap-1 max-w-[240px] sm:max-w-[360px] truncate">
              {Icon && <Icon className="h-3 w-3 shrink-0" />}
              <span className="truncate">{item.label}</span>
            </span>
          );
          return (
            <li key={i} className="inline-flex items-center gap-1 min-w-0">
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="hover:text-foreground transition-colors inline-flex items-center"
                >
                  {content}
                </Link>
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center",
                    isLast && "text-foreground font-medium",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {content}
                </span>
              )}
              {!isLast && <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
