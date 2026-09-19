// Countries and languages for monitoring focus, with names from the browser
// (Intl.DisplayNames) so they read in whichever language the interface is in.

export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CU CV CW CY CZ " +
  "DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FO FR GA GB GD GE GH GI GL GM GN GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ " +
  "OM PA PE PG PH PK PL PR PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TL TM TN TO TR TT TV TW TZ " +
  "UA UG US UY UZ VA VC VE VG VI VN VU WS XK YE ZA ZM ZW"
).split(" ");

/** Languages X can filter on (lang:), the ones a crisis team is likely to need. */
export const LANGUAGE_CODES = ["es", "en", "pt", "fr", "de", "it", "nl", "ca", "ar", "zh", "ja", "ko", "ru", "tr", "pl", "hi"];

/** The main language(s) people post in, per country — a suggestion, never forced. */
const COUNTRY_LANGUAGES: Record<string, string[]> = {
  AR: ["es"], BO: ["es"], CL: ["es"], CO: ["es"], CR: ["es"], CU: ["es"], DO: ["es"], EC: ["es"], ES: ["es"], GQ: ["es"],
  GT: ["es"], HN: ["es"], MX: ["es"], NI: ["es"], PA: ["es"], PE: ["es"], PR: ["es", "en"], PY: ["es"], SV: ["es"], UY: ["es"], VE: ["es"],
  US: ["en", "es"], GB: ["en"], IE: ["en"], CA: ["en", "fr"], AU: ["en"], NZ: ["en"], ZA: ["en"], NG: ["en"], KE: ["en"], IN: ["en", "hi"],
  PH: ["en"], SG: ["en"], JM: ["en"], TT: ["en"], BR: ["pt"], PT: ["pt"], AO: ["pt"], MZ: ["pt"], FR: ["fr"], BE: ["fr", "nl"], CH: ["de", "fr", "it"],
  LU: ["fr", "de"], MC: ["fr"], SN: ["fr"], CI: ["fr"], MA: ["ar", "fr"], DZ: ["ar", "fr"], TN: ["ar", "fr"], DE: ["de"], AT: ["de"], IT: ["it"],
  NL: ["nl"], AD: ["ca", "es"], AE: ["ar", "en"], SA: ["ar"], EG: ["ar"], QA: ["ar", "en"], KW: ["ar"], JO: ["ar"], CN: ["zh"], TW: ["zh"],
  HK: ["zh", "en"], JP: ["ja"], KR: ["ko"], RU: ["ru"], TR: ["tr"], PL: ["pl"],
};

export function suggestedLanguages(countries: string[]): string[] {
  return [...new Set(countries.flatMap((c) => COUNTRY_LANGUAGES[c] ?? []))].filter((l) => LANGUAGE_CODES.includes(l));
}

const cache = new Map<string, Intl.DisplayNames>();
function names(locale: string, type: "region" | "language"): Intl.DisplayNames | null {
  const key = `${locale}|${type}`;
  if (!cache.has(key)) {
    try {
      cache.set(key, new Intl.DisplayNames([locale], { type }));
    } catch {
      return null;
    }
  }
  return cache.get(key) ?? null;
}

export function countryName(code: string, lang: "en" | "es"): string {
  return names(lang, "region")?.of(code) ?? code;
}

export function languageName(code: string, lang: "en" | "es"): string {
  const n = names(lang, "language")?.of(code) ?? code;
  return n.charAt(0).toUpperCase() + n.slice(1);
}
