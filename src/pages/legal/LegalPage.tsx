import { useMessages } from "@/i18n";
import { legalMessages, type LegalPage as Page } from "@/i18n/messages/legal";

/** One legal document, in the current language. */
export default function LegalPage({ doc }: { doc: "privacy" | "terms" | "deletion" }) {
  const t = useMessages(legalMessages);
  const page: Page = t[doc];
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-20">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{page.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{page.updated}</p>
      <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-foreground/90">
        {page.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <div className="mt-10 space-y-9">
        {page.sections.map((s) => (
          <section key={s.h} className="space-y-3">
            <h2 className="text-lg font-semibold">{s.h}</h2>
            {s.p?.map((p) => (
              <p key={p} className="text-[15px] leading-relaxed text-foreground/90">{p}</p>
            ))}
            {s.list && (
              <ul className="list-disc pl-5 space-y-2 text-[15px] leading-relaxed text-foreground/90">
                {s.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
