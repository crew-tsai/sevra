import { useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useLang, useMessages } from "@/i18n";
import { adminMessages } from "@/i18n/messages/admin";
import { COUNTRY_CODES, LANGUAGE_CODES, countryName, languageName, suggestedLanguages } from "@/lib/regions";

type Props = {
  companyName: string;
  xHandle: string;
  countries: string[];
  languages: string[];
  excludeTerms: string[];
  onCountries: (v: string[]) => void;
  onLanguages: (v: string[]) => void;
  onExcludeTerms: (v: string[]) => void;
};

/**
 * Where, and in which languages, people talk about this company. Narrows what
 * monitoring collects: languages and excluded words go into the X search, the
 * countries brief the AI that decides what is noise.
 */
export function MonitoringFocus(p: Props) {
  const { lang } = useLang();
  const t = useMessages(adminMessages).focus;
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const countryOptions = useMemo(
    () => COUNTRY_CODES.map((c) => ({ code: c, name: countryName(c, lang) })).sort((a, b) => a.name.localeCompare(b.name, lang)),
    [lang],
  );

  const addCountry = (code: string) => {
    if (p.countries.includes(code)) return;
    const next = [...p.countries, code];
    p.onCountries(next);
    // Suggest the country's languages, without ever removing a choice.
    const add = suggestedLanguages([code]).filter((l) => !p.languages.includes(l));
    if (add.length) p.onLanguages([...p.languages, ...add]);
  };

  const toggleLanguage = (code: string) =>
    p.onLanguages(p.languages.includes(code) ? p.languages.filter((l) => l !== code) : [...p.languages, code]);

  const addTerm = () => {
    const v = term.trim().replace(/["()]/g, "");
    if (v && !p.excludeTerms.some((e) => e.toLowerCase() === v.toLowerCase())) p.onExcludeTerms([...p.excludeTerms, v]);
    setTerm("");
  };

  const handle = p.xHandle.trim().replace(/^@/, "");
  const who = [handle ? `@${handle}` : null, p.companyName.trim() ? `«${p.companyName.trim()}»` : null].filter(Boolean).join(t.or);
  const langsText = p.languages.map((l) => languageName(l, lang)).join(", ");

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div>
        <p className="text-sm font-medium">{t.title}</p>
        <p className="text-xs text-muted-foreground mt-1">{t.intro}</p>
      </div>

      {/* Countries */}
      <div className="space-y-2">
        <Label>{t.countries}</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          {p.countries.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 pl-2.5 pr-1 py-0.5 text-xs">
              {countryName(c, lang)}
              <button
                type="button"
                onClick={() => p.onCountries(p.countries.filter((x) => x !== c))}
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={t.remove(countryName(c, lang))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> {t.addCountry}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-64" align="start">
              <Command>
                <CommandInput placeholder={t.searchCountry} />
                <CommandList>
                  <CommandEmpty>{t.noCountry}</CommandEmpty>
                  {countryOptions.map((o) => (
                    <CommandItem
                      key={o.code}
                      value={`${o.name} ${o.code}`}
                      onSelect={() => {
                        addCountry(o.code);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("h-3.5 w-3.5 mr-2", p.countries.includes(o.code) ? "opacity-100" : "opacity-0")} />
                      {o.name}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-xs text-muted-foreground">{t.countriesHint}</p>
      </div>

      {/* Languages */}
      <div className="space-y-2">
        <Label>{t.languages}</Label>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGE_CODES.map((l) => {
            const on = p.languages.includes(l);
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLanguage(l)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                  on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
                )}
              >
                {languageName(l, lang)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{t.languagesHint}</p>
      </div>

      {/* Excluded words */}
      <div className="space-y-2">
        <Label htmlFor="exclude-term">{t.exclude}</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          {p.excludeTerms.map((e) => (
            <span key={e} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 pl-2.5 pr-1 py-0.5 text-xs">
              {e}
              <button
                type="button"
                onClick={() => p.onExcludeTerms(p.excludeTerms.filter((x) => x !== e))}
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={t.remove(e)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 max-w-sm">
          <Input
            id="exclude-term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTerm();
              }
            }}
            placeholder={t.excludePlaceholder}
            maxLength={40}
            className="h-8 text-sm"
          />
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={addTerm} disabled={!term.trim()}>
            {t.add}
          </Button>
        </div>
      </div>

      {/* What this means, in words */}
      {who && (
        <p className="text-xs rounded-md bg-muted/40 px-3 py-2">
          <span className="font-medium">{t.summaryLead}</span> {t.summary(who, langsText, p.excludeTerms.join(", "))}
        </p>
      )}
    </div>
  );
}
