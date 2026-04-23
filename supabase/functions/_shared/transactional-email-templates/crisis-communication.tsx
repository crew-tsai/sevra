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

const SITE_NAME = 'Sevra'

interface CrisisCommunicationProps {
  assetTitle?: string
  assetType?: string
  assetContent?: string
  incidentRef?: string
  packageRef?: string
  recipientName?: string
  senderName?: string
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  press_release: 'Press release',
  holding_statement: 'Holding statement',
  internal_memo: 'Internal memo',
  faq: 'FAQ',
  social_post: 'Social post',
}

const CrisisCommunicationEmail = ({
  assetTitle = 'Crisis communication',
  assetType = 'communication',
  assetContent = '',
  incidentRef,
  packageRef,
  recipientName,
  senderName,
}: CrisisCommunicationProps) => {
  const typeLabel = ASSET_TYPE_LABELS[assetType] || assetType
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{assetTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={badge}>
            <Text style={badgeText}>{typeLabel.toUpperCase()}</Text>
          </Section>

          <Heading style={h1}>{assetTitle}</Heading>

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
            {senderName ? `— ${senderName}` : `— The ${SITE_NAME} team`}
          </Text>

          <Text style={footer}>
            This message was sent via {SITE_NAME}, our crisis communications
            platform. Please treat this content as confidential until publicly
            released.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CrisisCommunicationEmail,
  subject: (data: Record<string, any>) => {
    const typeLabel =
      ASSET_TYPE_LABELS[data?.assetType] || data?.assetType || 'Update'
    return `[${typeLabel}] ${data?.assetTitle || 'Crisis communication'}`
  },
  displayName: 'Crisis communication',
  previewData: {
    assetTitle: 'Statement regarding flight AA-2453 diversion',
    assetType: 'holding_statement',
    assetContent:
      'We are aware of the situation involving flight AA-2453 and are working closely with local authorities.\n\nThe safety of our passengers and crew is our highest priority. We will provide further updates as more information becomes available.\n\nFor inquiries, please contact our press team.',
    incidentRef: 'INC-A1B2C3D4',
    packageRef: 'PKG-A1B2C3D4',
    recipientName: 'Jane',
    senderName: 'Sevra Crisis Team',
  },
} satisfies TemplateEntry
