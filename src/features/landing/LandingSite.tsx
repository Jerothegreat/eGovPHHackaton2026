import './landing.css'
import { useState } from 'react'
import { LEGAL, type LegalSlug } from './content'
import { Footer } from './Footer'
import { Hero } from './Hero'
import { LegalPage } from './LegalPage'
import { Nav } from './Nav'
import { PilotSection, SentView, type SentInfo } from './PilotForm'
import { useLang, useTheme } from './prefs'
import { Faq, FactsBand, HowItWorks, Integrations, Roles, TrustRow } from './Sections'

function legalSlug(pathname: string): LegalSlug | null {
  const slug = pathname.replace(/^\/|\/$/g, '')
  return Object.hasOwn(LEGAL, slug) ? (slug as LegalSlug) : null
}

export function LandingSite({ pathname }: { pathname: string }) {
  const { dark, toggle } = useTheme()
  const { lang, setLang } = useLang()
  const [sent, setSent] = useState<SentInfo | null>(null)
  const legal = legalSlug(pathname)

  function showSent(info: SentInfo) {
    setSent(info)
    window.scrollTo(0, 0)
  }

  return (
    <div className="lp min-h-screen bg-bg font-body text-[16px] tracking-normal text-ink antialiased">
      <Nav lang={lang} setLang={setLang} dark={dark} toggleDark={toggle} />
      {legal ? (
        <LegalPage slug={legal} />
      ) : sent ? (
        <SentView info={sent} />
      ) : (
        <main>
          <Hero lang={lang} />
          <TrustRow />
          <HowItWorks />
          <Roles />
          <Integrations />
          <FactsBand />
          <Faq />
          <PilotSection onSent={showSent} />
        </main>
      )}
      <Footer />
    </div>
  )
}
