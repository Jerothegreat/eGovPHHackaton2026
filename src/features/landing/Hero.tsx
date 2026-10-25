import { HERO } from './content'
import type { Lang } from './prefs'
import { bleed, btnPrimary, btnSecondary, container, lead } from './ui'

export function Hero({ lang }: { lang: Lang }) {
  const copy = HERO[lang]
  return (
    <section>
      <div
        className={`${bleed} border-b border-line bg-surface bg-[linear-gradient(180deg,#f0f4ff,#fafcff)] dark:bg-[linear-gradient(180deg,#121a33,#0b1020)]`}
      >
        <div className={`${container} grid items-center gap-12 py-14 md:py-20 xl:grid-cols-[1.05fr_1fr] 2xl:gap-20 2xl:py-28`}>
          <div className="flex min-w-0 flex-col gap-6">
            <span className="self-start rounded-full bg-accent-soft px-3 py-1 text-[13px] font-semibold text-accent">
              eGovPH Hackathon 2026 prototype
            </span>
            <h1 className="font-display text-[40px] font-bold leading-[1.05] tracking-[-0.025em] text-balance md:text-[52px] xl:text-[56px] 2xl:text-[68px]">
              {copy.title}
            </h1>
            <p className={`${lead} max-w-[56ch]`}>{copy.lead}</p>
            {lang === 'fil' && (
              <p className="text-[13px] text-muted">Draft translation for review. The rest of this page is still in English.</p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="/app" className={btnPrimary}>
                Try the demo
              </a>
              <a href="#pilot" className={btnSecondary}>
                Request a pilot
              </a>
            </div>
            <p className="text-[14px] text-muted">For barangay officials, LGU disaster offices, and the residents they serve.</p>
          </div>
          <div className="min-w-0 md:mx-auto md:w-full md:max-w-[640px] xl:max-w-none">
            <div className="relative flex flex-col items-center gap-5 md:block md:pb-24 md:pt-36 2xl:pb-32">
              <AlertCard />
              <LaptopMock />
              <div className="md:absolute md:bottom-0 md:left-0">
                <PhoneMock />
              </div>
            </div>
            <p className="mt-4 text-center text-[12px] text-muted xl:text-left">
              Official dashboard and resident check-in with sample data. Screenshots soon.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// A navy notification in both themes, like a device frame.
function AlertCard() {
  return (
    <div className="relative z-10 w-full max-w-[320px] rounded-[12px] border border-signal/50 bg-[#0b1430]/95 p-4 text-[#eef2ff] shadow-[0_16px_40px_-12px_rgb(0_0_0/.45)] backdrop-blur-md md:absolute md:-right-2 md:top-0 md:w-[280px] 2xl:w-[300px]">
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.08em]">
        <span className="text-signal">Sample alert</span>
        <span className="text-[#c3d2ff]">PAGASA</span>
      </div>
      <p className="mt-1.5 text-[16px] font-semibold leading-snug">Heavy rainfall warning</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="rounded-full bg-[#f97316] px-2 py-0.5 font-semibold text-[#1a1a2e]">Orange</span>
        <span className="text-[#c3d2ff]">Alaminos City, Pangasinan</span>
      </div>
      <p className="mt-3 border-t border-white/10 pt-2.5 text-[12.5px] text-[#c3d2ff]">
        Next: draft an RDANA assessment for Brgy. Poblacion
      </p>
    </div>
  )
}

const NEEDS = [
  { label: 'Food', count: 4 },
  { label: 'Water', count: 3 },
  { label: 'Shelter', count: 2 },
  { label: 'Medical', count: 1 },
]

const QUEUE = [
  { name: 'Maria Santos', status: 'Pending', pill: 'p-pend', needs: 'Food, water' },
  { name: 'Pedro Reyes', status: 'Accepted', pill: 'p-acc', needs: 'Shelter' },
  { name: 'Josie Dela Cruz', status: 'Resolved', pill: 'p-res', needs: 'Medical' },
]

// Placeholder for a screenshot of the official dashboard.
function LaptopMock() {
  return (
    <figure
      role="img"
      aria-label="Official dashboard with sample data"
      className="hidden max-w-[560px] md:ml-auto md:block md:w-[86%] 2xl:w-[90%] 2xl:max-w-[680px]"
    >
      <div className="lap-screen">
        <div className="am">
          <aside className="am-side">
            <b>eHANDA</b>
            <span className="on">Dashboard</span>
            <span>Assessments</span>
            <span>Check-ins</span>
            <span>Archive</span>
          </aside>
          <div className="am-main">
            <div className="am-top">
              <div>
                <small>Brgy. Poblacion, Alaminos City</small>
                <strong>Check-in queue</strong>
              </div>
              <span className="am-btn">Export CSV</span>
            </div>
            <div className="am-tiles">
              <div><small>Profiled households</small><b>12</b></div>
              <div><small>Checked in</small><b>9</b></div>
              <div><small>Need help</small><b className="r">4</b></div>
              <div><small>No response</small><b className="w">3</b></div>
            </div>
            <div className="am-grid">
              <div className="am-card">
                <small>Citizen need breakdown</small>
                {NEEDS.map((n) => (
                  <div key={n.label} className="bar">
                    {n.label}
                    <i style={{ width: `${n.count * 25}%` }} />
                    {n.count}
                  </div>
                ))}
              </div>
              <div className="am-card">
                <small>Queue</small>
                {QUEUE.map((r) => (
                  <div key={r.name} className="row">
                    {r.name}
                    <em className={`pill ${r.pill}`}>{r.status}</em>
                    <span>{r.needs}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="lap-base" />
    </figure>
  )
}

// Placeholder for a screenshot of the resident check-in.
function PhoneMock() {
  return (
    <figure role="img" aria-label="Resident check-in with sample data" className="w-[220px] md:w-[160px] 2xl:w-[180px]">
      <div className="ph-scr">
        <div className="pm">
          <div className="pm-top">
            <span>eGovPH</span>
            <span>FIL | EN</span>
          </div>
          <div className="pm-body">
            <span className="pm-chip">Sample alert</span>
            <b className="pm-t">Flooding, Brgy. Poblacion</b>
            <p className="pm-q">Apektado ba ang inyong sambahayan?</p>
            <p className="pm-en">Is your household affected?</p>
            <span className="pm-yes">Oo, kailangan namin ng tulong</span>
            <span className="pm-no">Hindi, ligtas kami</span>
            <small className="pm-en">Your answer goes to your barangay.</small>
          </div>
        </div>
      </div>
    </figure>
  )
}
