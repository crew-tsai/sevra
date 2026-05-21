import { cn } from "@/lib/utils";

interface DeviceMockupProps {
  desktopSrc: string;
  mobileSrc: string;
  alt: string;
  url?: string;
  className?: string;
}

export function DeviceMockup({ desktopSrc, mobileSrc, alt, url = "app.sevra.ai", className }: DeviceMockupProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Desktop browser */}
      <div
        className="rounded-xl overflow-hidden border border-border bg-card"
        style={{ boxShadow: "0 30px 80px -20px hsl(258 100% 65% / 0.3), 0 20px 40px -20px hsl(11 100% 62% / 0.25)" }}
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
        <img src={desktopSrc} alt={alt} className="w-full h-auto block" loading="lazy" />
      </div>

      {/* Mobile phone, overlapping bottom-right */}
      <div className="hidden sm:block absolute -bottom-8 -right-4 md:-right-8 w-[22%] max-w-[220px] min-w-[140px]">
        <div
          className="rounded-[2rem] border-[6px] border-foreground/90 bg-foreground/90 overflow-hidden"
          style={{ boxShadow: "0 25px 50px -12px hsl(0 0% 0% / 0.6)" }}
        >
          <div className="relative bg-card rounded-[1.5rem] overflow-hidden">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 h-4 w-16 rounded-full bg-foreground/90 z-10" />
            <img src={mobileSrc} alt={`${alt} on mobile`} className="w-full h-auto block" loading="lazy" />
          </div>
        </div>
      </div>

      {/* Mobile shown stacked on small screens */}
      <div className="sm:hidden mt-6 mx-auto w-[60%] max-w-[240px]">
        <div className="rounded-[2rem] border-[6px] border-foreground/90 bg-foreground/90 overflow-hidden shadow-2xl">
          <div className="relative bg-card rounded-[1.5rem] overflow-hidden">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 h-4 w-16 rounded-full bg-foreground/90 z-10" />
            <img src={mobileSrc} alt={`${alt} on mobile`} className="w-full h-auto block" loading="lazy" />
          </div>
        </div>
      </div>
    </div>
  );
}
