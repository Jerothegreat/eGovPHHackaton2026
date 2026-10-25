import { CONTACT_EMAIL } from './content'
import { Logo } from './Logo'
import { container } from './ui'

const colTitle = 'text-[13px] font-semibold uppercase tracking-[0.08em] text-muted'

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className={`${container} grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] 2xl:py-16`}>
        <div className="flex flex-col items-start gap-3">
          <a href="/" className="inline-flex items-center" aria-label="eHanda home">
            <Logo className="h-7 w-auto" />
          </a>
          <p className="max-w-[32ch] text-muted">From alert to aid, household by household.</p>
          <p className="text-[14px] text-muted">A prototype by Cordon Bleu for the eGovPH Hackathon 2026.</p>
        </div>
        <div className="flex flex-col gap-3">
          <p className={colTitle}>Product</p>
          <ul className="grid gap-2 text-[15px]">
            <li><a href="/#how" className="hover:underline">How it works</a></li>
            <li><a href="/#roles" className="hover:underline">Who it's for</a></li>
            <li><a href="/#integrations" className="hover:underline">Integrations</a></li>
            <li><a href="/app" className="hover:underline">Try the demo</a></li>
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <p className={colTitle}>Company</p>
          <ul className="grid gap-2 text-[15px]">
            <li className="text-muted">Cordon Bleu</li>
            <li><a href="/#pilot" className="hover:underline">Request a pilot</a></li>
            <li><a href="/#faq" className="hover:underline">FAQ</a></li>
            <li className="text-muted">
              Contact
              <br />
              <span className="select-all break-all">{CONTACT_EMAIL}</span>
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <p className={colTitle}>Legal</p>
          <ul className="grid gap-2 text-[15px]">
            <li><a href="/privacy" className="hover:underline">Privacy notice</a></li>
            <li><a href="/terms" className="hover:underline">Terms of use</a></li>
            <li><a href="/accessibility" className="hover:underline">Accessibility</a></li>
            <li><a href="/cookies" className="hover:underline">Cookie policy</a></li>
          </ul>
        </div>
      </div>
      <div className={`${container} flex flex-col gap-2 border-t border-line py-6 text-[14px] text-muted md:flex-row md:justify-between`}>
        <p>&copy; 2026 Cordon Bleu. Hackathon prototype, not an official government service.</p>
        <p>In an emergency, call 911. We don't use tracking cookies.</p>
      </div>
    </footer>
  )
}
