import { cn } from "@/lib/utils";
import { LANGS, useLang, type Lang } from "@/i18n";

const LABEL: Record<Lang, { short: string; name: string }> = {
  es: { short: "ES", name: "Español" },
  en: { short: "EN", name: "English" },
};

/** ES | EN switch. Each person's choice is remembered on their device. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      role="radiogroup"
      aria-label={lang === "es" ? "Idioma" : "Language"}
      className={cn("inline-flex items-center rounded-md border border-border p-0.5 text-xs font-medium", className)}
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          lang={l}
          title={LABEL[l].name}
          onClick={() => setLang(l)}
          className={cn(
            "px-2 py-1 rounded-[5px] transition-colors",
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LABEL[l].short}
        </button>
      ))}
    </div>
  );
}
