import React from 'react'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface BookingConfirmationProps {
  /** "Nýji kaflinn" or "Fyrirtækjabæklingur" (the form's brochure key) */
  category?: string
}

/** dative, after "um pláss í …" */
const inBrochure = (category: string) =>
  category === 'Fyrirtækjabæklingur' ? 'fyrirtækjabæklingnum' : 'Nýja kaflanum'

const Email = ({ category = '' }: BookingConfirmationProps) => (
  <Html lang="is" dir="ltr">
    <Head />
    <Preview>Umsóknin er komin til okkar.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={p}>Góðan daginn,</Text>
        <Text style={p}>Takk fyrir umsóknina um pláss í {inBrochure(category)}.</Text>
        <Text style={p}>
          Við höfum samband innan tveggja virkra daga og staðfestum hvort flokkurinn sé laus. Þá
          sendum við verðskrá og biðjum um merki og myndir fyrir próförkina.
        </Text>
        <Hr style={hr} />
        <Text style={small}>SVIF · Hannað, prentað og sent · svif.is · 853 5147</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Umsóknin þín er komin til SVIF',
  displayName: 'Staðfesting á umsókn',
  previewData: { category: 'Nýji kaflinn' },
} satisfies TemplateEntry

const main = { backgroundColor: '#f6f5ec', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 26px', maxWidth: '600px' }
const p = { color: '#2a2420', fontSize: '15px', lineHeight: '24px', margin: '0 0 12px' }
const hr = { borderColor: '#c1b6a4', margin: '20px 0' }
const small = { color: '#6f655b', fontSize: '13px', margin: '0' }
