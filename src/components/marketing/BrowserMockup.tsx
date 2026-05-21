import { cn } from "@/lib/utils";

interface BrowserMockupProps {
  src: string;
  alt: string;
  url?: string;
  className?: string;
}

export function BrowserMockup({ src, alt, url = "app.sevra.ai", className }: BrowserMockupProps) {
  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden border border-border bg-card shadow-2xl",
        className
      )}
      style={{ boxShadow: "0 30px 80px -20px hsl(258 100% 65% / 0.25), 0 20px 40px -20px hsl(11 100% 62% / 0.2)" }}
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-secondary/60 border-b border-border">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-1 rounded-md bg-background/60 text-[11px] text-muted-foreground font-mono">
            {url}
          </div>
        </div>
      </div>
      <img src={src} alt={alt} className="w-full h-auto block" loading="lazy" />
    </div>
  );
}
