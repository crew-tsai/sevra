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

// The sending organisation, not the vendor. This email is the client's
// communication to their own people; signing it "The Sevra team" or calling
// Sevra "our platform" misattributes it at the moment attribution matters most.
// Falls back only when the workspace has no company name set.
const DEFAULT_ORG = { en: 'Communications', es: 'Comunicación' }

interface CrisisCommunicationProps {
  assetTitle?: string
  assetType?: string
  assetContent?: string
  incidentRef?: string
  packageRef?: string
  recipientName?: string
  senderName?: string
  companyName?: string
  /** The language the communication itself is written in; the wrapper matches it. */
  lang?: 'en' | 'es'
}

const ASSET_TYPE_LABELS: Record<'en' | 'es', Record<string, string>> = {
  en: {
    press_release: 'Press release',
    holding_statement: 'Holding statement',
    internal_memo: 'Internal memo',
    customer_faq: 'Customer FAQ',
    faq: 'FAQ',
    social_post: 'Social post',
  },
  es: {
    press_release: 'Nota de prensa',
    holding_statement: 'Comunicado de espera',
    internal_memo: 'Nota interna',
    customer_faq: 'Preguntas frecuentes',
    faq: 'Preguntas frecuentes',
    social_post: 'Publicación en redes',
  },
}

const WORDS = {
  en: {
    hi: (name?: string) => (name ? `Hi ${name},` : 'Hi,'),
    team: (org: string) => `— The ${org} team`,
    confidential: 'Please treat this content as confidential until publicly released.',
    fallbackTitle: 'Crisis communication',
    fallbackType: 'Update',
  },
  es: {
    hi: (name?: string) => (name ? `Hola, ${name}:` : 'Hola:'),
    team: (org: string) => `— El equipo de ${org}`,
    confidential: 'Trata este contenido como confidencial hasta que se haga público.',
    fallbackTitle: 'Comunicación de crisis',
    fallbackType: 'Actualización',
  },
}

const pickLang = (l: unknown): 'en' | 'es' => (l === 'es' ? 'es' : 'en')

const CrisisCommunicationEmail = ({
  assetTitle,
  assetType = 'communication',
  assetContent = '',
  incidentRef,
  packageRef,
  recipientName,
  senderName,
  companyName,
  lang,
}: CrisisCommunicationProps) => {
  const l = pickLang(lang)
  const w = WORDS[l]
  const title = assetTitle || w.fallbackTitle
  const typeLabel = ASSET_TYPE_LABELS[l][assetType] || assetType
  const greeting = w.hi(recipientName)

  return (
    <Html lang={l} dir="ltr">
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={badge}>
            <Text style={badgeText}>{typeLabel.toUpperCase()}</Text>
          </Section>

          <Heading style={h1}>{title}</Heading>

          {(incidentRef || packageRef) && (
            <Text style={refLine}>
              {packageRef && <span>{packageRef}</span>}
              {packageRef && incidentRef && <span style={refSep}> · </span>}
              {incidentRef && <span>{incidentRef}</span>}
            </Text>
          )}

          <Hr style={hr} />

          <Text style={greetingStyle}>{greeting}</Text>

          <Section style={contentBlock}>
            {assetContent.split('\n').map((line, idx) =>
              line.trim() === '' ? (
                <Text key={idx} style={spacer}>
                  &nbsp;
                </Text>
              ) : (
                <Text key={idx} style={contentText}>
                  {line}
                </Text>
              )
            )}
          </Section>

          <Hr style={hr} />

          <Text style={signoff}>
            {senderName ? `— ${senderName}` : w.team(companyName || DEFAULT_ORG[l])}
          </Text>

          <Text style={footer}>
            {w.confidential}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// These style objects were referenced by the markup above but never defined —
// the template has thrown a ReferenceError on every render since it was first
// committed, which nobody noticed because no crisis communication has ever been
// emailed from this workspace. Plain, printable, and safe in mail clients that
// strip anything clever.
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

const badge: React.CSSProperties = {
  marginBottom: '12px',
}

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

const h1: React.CSSProperties = {
  color: '#0f172a',
  fontSize: '22px',
  fontWeight: 700,
  lineHeight: '30px',
  margin: '0 0 8px',
}

const refLine: React.CSSProperties = {
  color: '#64748b',
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: '12px',
  letterSpacing: '0.04em',
  margin: '0',
}

const refSep: React.CSSProperties = {
  color: '#cbd5e1',
}

const hr: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #e5e7eb',
  margin: '20px 0',
}

const greetingStyle: React.CSSProperties = {
  color: '#0f172a',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px',
}

const contentBlock: React.CSSProperties = {
  margin: '0 0 8px',
}

const contentText: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px',
  whiteSpace: 'pre-wrap',
}

const spacer: React.CSSProperties = {
  fontSize: '8px',
  lineHeight: '8px',
  margin: 0,
}

const signoff: React.CSSProperties = {
  color: '#0f172a',
  fontSize: '15px',
  fontWeight: 600,
  margin: '0 0 16px',
}

const footer: React.CSSProperties = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '18px',
  margin: 0,
}

export const template = {
  component: CrisisCommunicationEmail,
  subject: (data: Record<string, any>) => {
    const l = pickLang(data?.lang)
    const typeLabel =
      ASSET_TYPE_LABELS[l][data?.assetType] || data?.assetType || WORDS[l].fallbackType
    return `[${typeLabel}] ${data?.assetTitle || WORDS[l].fallbackTitle}`
  },
  displayName: 'Crisis communication',
  previewData: {
    assetTitle: 'Statement regarding the service disruption on 12 March',
    assetType: 'holding_statement',
    assetContent:
      'We are aware of the disruption affecting some of our customers and are working closely with the relevant authorities.\n\nThe safety of the people we serve and of our staff is our highest priority. We will provide further updates as more information becomes available.\n\nFor inquiries, please contact our press team.',
    incidentRef: 'INC-A1B2C3D4',
    packageRef: 'PKG-A1B2C3D4',
    recipientName: 'Jane',
    senderName: 'Sevra Crisis Team',
  },
} satisfies TemplateEntry
