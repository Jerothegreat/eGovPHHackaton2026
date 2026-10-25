import { ALERT_SOURCES, FACTS, FAQ, INTEG, ROLES, STEPS, TRUST } from './content'
import { bleed, card, container, eyebrow, h2, sectionY } from './ui'

function SectionIntro({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="flex max-w-[720px] flex-col gap-3">
      <p className={eyebrow}>{kicker}</p>
      <h2 className={`${h2} text-balance`}>{title}</h2>
    </div>
  )
}

export function TrustRow() {
  return (
    <section className="border-b border-line">
      <div className={`${container} flex flex-wrap items-center gap-x-8 gap-y-3 py-6 text-[15px]`}>
        <span className="text-muted">Works with eGovPH services</span>
        {TRUST.map((name) => (
          <span key={name} className="font-display font-bold text-ink">
            {name}
          </span>
        ))}
      </div>
    </section>
  )
}

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20">
      <div className={`${bleed} border-b border-line bg-surface`}>
        <div className={`${container} ${sectionY}`}>
          <SectionIntro kicker="How it works" title="Four steps from the first alert to the last household." />
          <ol className="mt-12 grid gap-10 md:grid-cols-2 xl:grid-cols-4 xl:gap-6">
            {STEPS.map((s, i) => (
              <li key={s.tag} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-display font-bold text-accent-ink tabular-nums">
                    {i + 1}
                  </span>
                  <span className="hidden h-px flex-1 bg-line xl:block" />
                </div>
                <p className={eyebrow}>{s.tag}</p>
                <h3 className="font-display text-[20px] font-semibold tracking-normal 2xl:text-[22px]">{s.title}</h3>
                <p className="leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

export function Roles() {
  return (
    <section id="roles" className="scroll-mt-20">
      <div className={`${container} ${sectionY}`}>
        <SectionIntro kicker="Who it's for" title="One system, four kinds of users." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ROLES.map((r) => (
            <article key={r.title} className={`${card} flex flex-col gap-3 p-6`}>
              <span className="self-start rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-accent">{r.where}</span>
              <h3 className="font-display text-[20px] font-semibold tracking-normal">{r.title}</h3>
              <p className="leading-relaxed text-muted">{r.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Integrations() {
  return (
    <section id="integrations" className="scroll-mt-20">
      <div className={`${container} grid gap-12 pb-16 md:pb-24 lg:grid-cols-[1fr_1.3fr] 2xl:pb-32`}>
        <div className="flex flex-col gap-4">
          <p className={eyebrow}>Integrations</p>
          <h2 className={`${h2} text-balance`}>Built on the services eGovPH already runs.</h2>
          <p className="leading-relaxed text-muted">
            HANDA signs people in, sends notices and files reports through eGovPH. Provider keys stay on the server.
          </p>
          <div className={`${card} mt-2 p-5`}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Alert sources</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALERT_SOURCES.map((s) => (
                <span key={s} className="rounded-full border border-line px-3 py-1 font-display text-[14px] font-bold">
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[14px] text-muted">Alerts are simulated in this prototype.</p>
          </div>
        </div>
        <dl className="divide-y divide-line border-y border-line">
          {INTEG.map((x) => (
            <div key={x.name} className="grid gap-1 py-5 sm:grid-cols-[180px_1fr] sm:gap-6">
              <dt className="font-display text-[17px] font-bold">{x.name}</dt>
              <dd className="leading-relaxed text-muted">{x.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

export function FactsBand() {
  return (
    <section>
      <div
        className={`${bleed} bg-band bg-[linear-gradient(135deg,#0040e7,#0035c4)] text-band-ink dark:bg-[linear-gradient(135deg,#0a2a8a,#081f66)]`}
      >
        <div className={`${container} grid grid-cols-2 gap-8 py-12 md:py-16 lg:grid-cols-4`}>
          {FACTS.map((f) => (
            <div key={f.label} className="flex flex-col gap-1">
              <p className="font-display text-[40px] font-extrabold leading-none tabular-nums md:text-[48px] 2xl:text-[56px]">{f.value}</p>
              <p className="mt-2 font-semibold">{f.label}</p>
              <p className="text-[14px] text-band-muted">{f.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20">
      <div className={`${container} ${sectionY} grid gap-10 lg:grid-cols-[1fr_2fr]`}>
        <SectionIntro kicker="FAQ" title="Questions from barangays and LGUs." />
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((item, i) => (
            <details key={item.q} className="group py-5" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-[18px] font-bold">
                {item.q}
                <span
                  className="shrink-0 text-[22px] leading-none text-accent transition-transform duration-150 group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-[65ch] leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
