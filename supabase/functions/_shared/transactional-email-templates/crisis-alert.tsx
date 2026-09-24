import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// The alert a workflow rule sends when Sevra detects a crisis.
//
// It is not the communication itself — nothing here is for the public. It tells
// the client's own people that something has happened, how severe it is, and
// that the drafts are waiting for them. Written so it reads on a phone at 3am:
// the level and the headline first, the detail after.

interface CrisisAlertProps {
  incidentTitle?: string
  incidentRef?: string
  crisisLevel?: number
  risk?: string
  summary?: string
  /** The rule that fired, so the recipient knows why they were told. */
  workflowName?: string
  /**
   * Set when this is an approval that has been waiting, rather than a new
   * incident. It changes what the mail is asking for: a new incident is
   * information, an unapproved package at L4 is a request to go and press a
   * button, and telling someone their package is "being drafted" when it has
   * been drafted and ignored for an hour is worse than not writing at all.
   */
  waitingMinutes?: number
  waitingFor?: string
  /** Set when the recipient has just been made responsible for this incident. */
  assignedToYou?: boolean
  companyName?: string
  lang?: 'en' | 'es'
}

const LEVELS: Record<'en' | 'es', Record<number, string>> = {
  en: {
    0: 'L0 · Routine',
    1: 'L1 · Localized',
    2: 'L2 · Significant',
    3: 'L3 · Major',
    4: 'L4 · Catastrophic',
  },
  es: {
    0: 'L0 · Rutina',
    1: 'L1 · Localizado',
    2: 'L2 · Significativo',
    3: 'L3 · Grave',
    4: 'L4 · Catastrófico',
  },
}

const RISK: Record<'en' | 'es', Record<string, string>> = {
  en: { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' },
  es: { critical: 'Crítico', high: 'Alto', medium: 'Medio', low: 'Bajo' },
}

const WORDS = {
  en: {
    detected: 'Crisis detected',
    intro: (company: string) => `Sevra is monitoring ${company} and has opened an incident.`,
    riskLabel: 'Risk',
    levelLabel: 'Level',
    drafts:
      'The communication package for this incident is being drafted and will be waiting in Approvals. Nothing is published until your team approves it.',
    rule: (name: string) => `You are receiving this because of the rule "${name}".`,
    fallbackTitle: 'New incident',
    waitingHeading: 'Waiting for approval',
    assignedHeading: 'Assigned to you',
    assigned:
      'This incident is now yours. Open Sevra to see what has been drafted and what still needs a decision. Nothing is published until it has both approvals.',
    waiting: (minutes: number, what: string) =>
      `${what} has been waiting ${minutes} minutes for approval and has not been published. Nothing goes out until someone approves it.`,
  },
  es: {
    detected: 'Crisis detectada',
    intro: (company: string) => `Sevra está monitoreando a ${company} y abrió un incidente.`,
    riskLabel: 'Riesgo',
    levelLabel: 'Nivel',
    drafts:
      'El paquete de comunicación de este incidente se está redactando y quedará esperando en Aprobaciones. No se publica nada hasta que tu equipo lo apruebe.',
    rule: (name: string) => `Recibes este aviso por la regla "${name}".`,
    fallbackTitle: 'Incidente nuevo',
    waitingHeading: 'Pendiente de aprobación',
    assignedHeading: 'Asignado a ti',
    assigned:
      'Este incidente es ahora tuyo. Abre Sevra para ver qué se ha redactado y qué falta decidir. No se publica nada hasta que tenga las dos aprobaciones.',
    waiting: (minutes: number, what: string) =>
      `${what} lleva ${minutes} minutos esperando aprobación y no se ha publicado. No sale nada hasta que alguien lo apruebe.`,
  },
}

const pickLang = (l: unknown): 'en' | 'es' => (l === 'es' ? 'es' : 'en')

const CrisisAlertEmail = ({
  incidentTitle,
  incidentRef,
  crisisLevel = 0,
  risk = 'medium',
  summary = '',
  workflowName,
  waitingMinutes,
  waitingFor,
  assignedToYou,
  companyName,
  lang,
}: CrisisAlertProps) => {
  const l = pickLang(lang)
  const w = WORDS[l]
  const title = incidentTitle || w.fallbackTitle
  const severe = crisisLevel >= 3

  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{`${LEVELS[l][crisisLevel] ?? ''} — ${title}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={badge}>
            <Text style={severe ? badgeTextSevere : badgeText}>{w.detected.toUpperCase()}</Text>
          </Section>

          <Heading style={h1}>{title}</Heading>

          <Text style={refLine}>
            <span>{w.levelLabel}: {LEVELS[l][crisisLevel] ?? crisisLevel}</span>
            <span style={refSep}> · </span>
            <span>{w.riskLabel}: {RISK[l][risk] ?? risk}</span>
            {incidentRef && (
              <>
                <span style={refSep}> · </span>
                <span>{incidentRef}</span>
              </>
            )}
          </Text>

          <Hr style={hr} />

          <Text style={introText}>{w.intro(companyName || 'this organization')}</Text>

          {summary && (
            <Section style={contentBlock}>
              {summary.split('\n').map((line, idx) =>
                line.trim() === '' ? (
                  <Text key={idx} style={spacer}>&nbsp;</Text>
                ) : (
                  <Text key={idx} style={contentText}>{line}</Text>
                )
              )}
            </Section>
          )}

          <Text style={draftsText}>
            {assignedToYou
              ? w.assigned
              : typeof waitingMinutes === 'number'
                ? w.waiting(waitingMinutes, waitingFor || w.waitingHeading)
                : w.drafts}
          </Text>

          <Hr style={hr} />

          {workflowName && <Text style={footer}>{w.rule(workflowName)}</Text>}
        </Container>
      </Body>
    </Html>
  )
}

const main: React.CSSProperties = {
  backgroundColor: '#f6f7f9',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  padding: '24px 0',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '600px',
  padding: '32px',
}

const badge: React.CSSProperties = { marginBottom: '12px' }

const badgeText: React.CSSProperties = {
  backgroundColor: '#0f172a',
  borderRadius: '4px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  margin: 0,
  padding: '4px 10px',
}

const badgeTextSevere: React.CSSProperties = { ...badgeText, backgroundColor: '#b91c1c' }

const h1: React.CSSProperties = {
  color: '#0f172a',
  fontSize: '22px',
  fontWeight: 700,
  lineHeight: '30px',
  margin: '0 0 8px',
}

const refLine: React.CSSProperties = {
  color: '#64748b',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '12px',
  letterSpacing: '0.04em',
  margin: 0,
}

const refSep: React.CSSProperties = { color: '#cbd5e1' }

const hr: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '20px 0',
}

const introText: React.CSSProperties = {
  color: '#0f172a',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px',
}

const contentBlock: React.CSSProperties = { margin: '0 0 8px' }

const contentText: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px',
  whiteSpace: 'pre-wrap',
}

const spacer: React.CSSProperties = { fontSize: '8px', lineHeight: '8px', margin: 0 }

const draftsText: React.CSSProperties = {
  backgroundColor: '#f1f5f9',
  borderRadius: '6px',
  color: '#334155',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '4px 0 0',
  padding: '12px 14px',
}

const footer: React.CSSProperties = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '18px',
  margin: 0,
}

export const template = {
  component: CrisisAlertEmail,
  subject: (data: Record<string, any>) => {
    const l = pickLang(data?.lang)
    const level = LEVELS[l][data?.crisisLevel ?? 0] ?? ''
    const tag = level.split(' · ')[0]
    // An unapproved package needs to be distinguishable in an inbox from the
    // alert that opened the incident an hour earlier.
    if (data?.assignedToYou) {
      return `[${tag}] ${WORDS[l].assignedHeading} — ${data?.incidentTitle || WORDS[l].fallbackTitle}`
    }
    if (typeof data?.waitingMinutes === 'number') {
      return `[${tag}] ${WORDS[l].waitingHeading} — ${data?.incidentTitle || WORDS[l].fallbackTitle}`
    }
    return `[${tag}] ${data?.incidentTitle || WORDS[l].fallbackTitle}`
  },
  displayName: 'Crisis alert',
  previewData: {
    incidentTitle: 'Billing platform unavailable for Bogotá clients',
    incidentRef: 'INC-A1B2C3D4',
    crisisLevel: 3,
    risk: 'high',
    summary:
      'The billing platform has been unavailable for twelve hours for clients in Bogotá and the regulator has asked for an explanation.',
    workflowName: 'Auto-escalate L3+ outages',
    companyName: 'The Stellar Crew',
  },
} satisfies TemplateEntry
