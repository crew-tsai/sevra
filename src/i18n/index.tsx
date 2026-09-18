// The interface in Spanish or English.
//
// Every piece of text lives in a messages file as an { en, es } pair, side by
// side, so a translation is reviewed next to what it translates. The Spanish
// half is type-checked against the English one: a missing or misnamed key
// fails the build rather than showing up as English on a Spanish screen.
//
// Language is per person and per device: their explicit choice if they made
// one, otherwise their browser's language, otherwise English.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { enUS, es as esLocale, type Locale } from "date-fns/locale";

export type Lang = "en" | "es";
export const LANGS: Lang[] = ["es", "en"];

const KEY = "sevra.lang";

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "es") return saved;
  } catch {
    /* storage blocked: fall through to the browser's language */
  }
  const prefs = typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [];
  for (const p of prefs) {
    const base = (p ?? "").toLowerCase().split("-")[0];
    if (base === "es") return "es";
    if (base === "en") return "en";
  }
  return "en";
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const LangContext = createContext<Ctx>({ lang: "en", setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* the choice just won't survive a reload */
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** Declares a component's text in both languages. `es` must match `en` key for key. */
export function defineMessages<T>(m: { en: T; es: NoInfer<T> }): { en: T; es: T } {
  return m;
}

/** The current language's half of a messages pair. */
export function useMessages<T>(m: { en: T; es: T }): T {
  return m[useLang().lang];
}

/** date-fns locale for the current language ("hace 5 minutos", "5 minutes ago"). */
export function useDateLocale(): Locale {
  return useLang().lang === "es" ? esLocale : enUS;
}

/** BCP 47 tag for Intl formatting of dates and numbers. */
export function useIntlLocale(): string {
  return useLang().lang === "es" ? "es-ES" : "en-US";
}
