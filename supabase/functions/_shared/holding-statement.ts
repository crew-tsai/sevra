// A holding statement that needs no model.
//
// Every AI path in the product runs through one provider on one key, seeded to
// every client from the control plane. When that is down — and it will be, at
// some hour nobody chose — a crisis workspace can currently produce nothing at
// all. The first hour of a crisis is the hour a holding statement exists for,
// so the product must be able to write one with the lights off.
//
// This is not a fallback in the sense of "slightly worse copy". It is the
// oldest thing in crisis communications: say what you know, say what you are
// doing, say when you will speak again, and do not speculate. It is written
// from the incident's own fields, it is correct by construction, and it is
// labelled so nobody mistakes it for the drafted package.
//
// The rules it follows are the same ones the AI is told to follow. If the two
// ever disagree, this one is right, because this one cannot invent.

import type { IndustryProfile } from "./industries.ts";

export type HoldingInput = {
  companyName: string | null;
  title: string;
  description: string | null;
  crisisLevel: number;
  injuryFatality: boolean;
  regulatorInvolved: boolean;
  location: string | null;
  lang: "en" | "es";
  vocab: Pick<IndustryProfile, "peopleLabel">;
};

const WORDS = {
  en: {
    title: "Holding statement (written without AI)",
    opening: (company: string) =>
      `${company} is aware of an incident and is responding to it.`,
    whereKnown: (where: string) => `The incident concerns ${where}.`,
    injury: (people: string) =>
      `Our first concern is the ${people} affected. We are working with the emergency services and supporting everyone involved.`,
    regulator:
      "We have been in contact with the relevant authorities and are cooperating fully with them.",
    investigating:
      "We are establishing the facts. We will not speculate about the cause while that work is going on.",
    // The commitment that makes a holding statement a holding statement: it
    // buys time by promising a next point in time.
    nextUpdate: (hours: number) =>
      `We will provide a further update within ${hours} hour${hours === 1 ? "" : "s"}, or sooner if there is something material to report.`,
    contact: "Media enquiries should be directed to our communications team.",
    note:
      "Written by Sevra from the incident's own facts, without AI, because the AI provider could not be reached. It states only what this workspace already recorded. Review it, add what you know, and it is ready to send.",
  },
  es: {
    title: "Comunicado de espera (escrito sin IA)",
    opening: (company: string) =>
      `${company} tiene conocimiento de un incidente y está respondiendo a él.`,
    whereKnown: (where: string) => `El incidente afecta a ${where}.`,
    injury: (people: string) =>
      `Nuestra primera preocupación son las ${people} afectadas. Estamos trabajando con los servicios de emergencia y acompañando a todas las personas implicadas.`,
    regulator:
      "Hemos contactado con las autoridades competentes y estamos cooperando plenamente con ellas.",
    investigating:
      "Estamos estableciendo los hechos. No vamos a especular sobre las causas mientras ese trabajo esté en curso.",
    nextUpdate: (hours: number) =>
      `Daremos una nueva actualización en un plazo de ${hours} hora${hours === 1 ? "" : "s"}, o antes si hay algo relevante que comunicar.`,
    contact: "Las consultas de medios pueden dirigirse a nuestro equipo de comunicación.",
    note:
      "Escrito por Sevra a partir de los datos del propio incidente, sin IA, porque no se pudo contactar con el proveedor de IA. Solo afirma lo que este espacio de trabajo ya tenía registrado. Revísalo, añade lo que sepas, y está listo para enviar.",
  },
};

/**
 * How long until the next update, by severity. A catastrophic incident that
 * promises an update "within 24 hours" has said nothing; a routine one that
 * promises an hour has made a rod for its own back.
 */
function nextUpdateHours(level: number): number {
  if (level >= 4) return 1;
  if (level === 3) return 2;
  if (level === 2) return 4;
  return 12;
}

export function holdingStatement(input: HoldingInput): { title: string; content: string } {
  const w = WORDS[input.lang] ?? WORDS.en;
  const company = input.companyName ?? (input.lang === "es" ? "La empresa" : "The company");

  const paragraphs: string[] = [w.opening(company)];

  if (input.location) paragraphs.push(w.whereKnown(input.location));
  // Order is not cosmetic. People first, then authorities, then process: a
  // statement that leads with regulatory cooperation while someone is hurt
  // reads exactly as badly as it sounds.
  if (input.injuryFatality) paragraphs.push(w.injury(input.vocab.peopleLabel.toLowerCase()));
  if (input.regulatorInvolved) paragraphs.push(w.regulator);

  paragraphs.push(w.investigating);
  paragraphs.push(w.nextUpdate(nextUpdateHours(input.crisisLevel)));
  paragraphs.push(w.contact);

  return { title: w.title, content: paragraphs.join("\n\n") };
}

/** The note shown with it, so nobody mistakes it for the drafted package. */
export function holdingStatementNote(lang: "en" | "es"): string {
  return (WORDS[lang] ?? WORDS.en).note;
}
