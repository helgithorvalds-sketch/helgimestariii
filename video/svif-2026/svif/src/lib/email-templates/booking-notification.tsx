import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface BookingNotificationProps {
  company?: string
  /** empty when the applicant gave only a phone number */
  email?: string
  phone?: string
  category?: string
  details?: string
}

const Email = ({
  company = 'Óþekkt fyrirtæki',
  email = '',
  phone = '',
  category = '',
  details = '',
}: BookingNotificationProps) => (
  <Html lang="is" dir="ltr">
    <Head />
    <Preview>{`Ný umsókn: ${company}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Ný umsókn um pláss</Heading>
        <Text style={lead}>{company}</Text>
        <Hr style={hr} />
        <Text style={row}><strong>Netfang:</strong> {email || '—'}</Text>
        <Text style={row}><strong>Sími:</strong> {phone || '—'}</Text>
        <Text style={row}><strong>Bæklingur:</strong> {category || '—'}</Text>
        <Hr style={hr} />
        <Text style={{ ...row, whiteSpace: 'pre-line' }}>{details || '—'}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `Ný umsókn: ${data?.company || 'SVIF'}`,
  displayName: 'Umsókn (innri tilkynning)',
  to: 'helgithorvalds@gmail.com',
  previewData: {
    company: 'Pípulagnir ehf.',
    email: 'jon@pipulagnir.is',
    phone: '5551234',
    category: 'Nýji kaflinn',
    details: 'Kennitala: 1234567890\nTilboð: 15% afsláttur af fyrsta verki',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#f6f5ec', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 26px', maxWidth: '600px' }
const h1 = { color: '#2a2420', fontSize: '22px', margin: '0 0 4px', fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase' as const }
const lead = { color: '#2a2420', fontSize: '17px', fontWeight: 600, margin: '0' }
const hr = { borderColor: '#c1b6a4', margin: '18px 0' }
const row = { color: '#2a2420', fontSize: '14px', lineHeight: '22px', margin: '0 0 6px' }
