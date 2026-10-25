import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { PILOT_ROLES } from './content'
import { bleed, btnPrimary, btnSecondary, card, container, eyebrow, h2, lead, sectionY } from './ui'

type Field = 'name' | 'email' | 'lgu' | 'role' | 'consent'

const ERRORS: Record<Field, string> = {
  name: 'Enter your name.',
  email: 'Enter a valid email, like you@lgu.gov.ph.',
  lgu: 'Enter your LGU or barangay.',
  role: 'Choose your role.',
  consent: 'Tick the box so we can reply to you.',
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const input =
  'w-full rounded-[10px] border border-line bg-bg px-3.5 text-[16px] text-ink placeholder:text-muted focus:outline-2 focus:outline-offset-0 focus:outline-accent aria-[invalid=true]:border-danger'

export interface SentInfo {
  name: string
  email: string
}

export function PilotSection({ onSent }: { onSent: (info: SentInfo) => void }) {
  return (
    <section id="pilot" className="scroll-mt-20">
      <div className={`${bleed} border-t border-line bg-surface`}>
        <div className={`${container} ${sectionY} grid gap-10 lg:grid-cols-[1fr_1.2fr]`}>
          <div className="flex flex-col gap-4">
            <p className={eyebrow}>Request a pilot</p>
            <h2 className={`${h2} text-balance`}>Try HANDA with your own households.</h2>
            <p className={`${lead} max-w-[48ch]`}>
              For barangays and LGU disaster offices. Tell us about your area and we'll set up a pilot with your household list.
            </p>
            <ol className="mt-2 grid gap-3 text-[15px]">
              <li className="flex gap-3"><span className="font-semibold text-accent tabular-nums">1</span>We reply by email within [X working days].</li>
              <li className="flex gap-3"><span className="font-semibold text-accent tabular-nums">2</span>We set up a short call with your team.</li>
              <li className="flex gap-3"><span className="font-semibold text-accent tabular-nums">3</span>We load your household profiling list.</li>
            </ol>
          </div>
          <PilotForm onSent={onSent} />
        </div>
      </div>
    </section>
  )
}

function PilotForm({ onSent }: { onSent: (info: SentInfo) => void }) {
  const [values, setValues] = useState({ name: '', email: '', lgu: '', role: '', message: '', consent: false })
  const [invalid, setInvalid] = useState<Partial<Record<Field, boolean>>>({})
  const [failed, setFailed] = useState(false)
  const [sending, setSending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const bannerRef = useRef<HTMLDivElement>(null)

  const set = (key: 'name' | 'email' | 'lgu' | 'role' | 'message') =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [key]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    const bad: Partial<Record<Field, boolean>> = {
      name: !values.name.trim(),
      email: !EMAIL.test(values.email.trim()),
      lgu: !values.lgu.trim(),
      role: !values.role,
      consent: !values.consent,
    }
    setInvalid(bad)
    const first = (Object.keys(ERRORS) as Field[]).find((f) => bad[f])
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#f-${first}`)?.focus()
      return
    }

    setSending(true)
    setFailed(false)
    try {
      const { supabase } = await import('@/lib/supabase')
      if (!supabase) throw new Error('Supabase client not configured')
      const { error } = await supabase.from('pilot_requests').insert({
        full_name: values.name.trim(),
        email: values.email.trim(),
        lgu: values.lgu.trim(),
        role: values.role,
        message: values.message.trim() || null,
        consent: true,
      })
      if (error) throw error
      onSent({ name: values.name.trim().split(' ')[0], email: values.email.trim() })
    } catch (err) {
      console.error('[pilot request]', err)
      setFailed(true)
      requestAnimationFrame(() => bannerRef.current?.focus())
    } finally {
      setSending(false)
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={submit} className={`${card} grid gap-5 bg-bg p-6 md:p-8`}>
      <div
        ref={bannerRef}
        tabIndex={-1}
        hidden={!failed}
        role="alert"
        className="rounded-[10px] border border-danger/40 bg-danger/10 p-4 text-[15px] text-ink"
      >
        <p className="font-semibold text-danger">We couldn't send your request.</p>
        <p className="mt-1">Check your connection and try again. Your answers are still here.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Labeled id="name" label="Full name" invalid={invalid.name}>
          <input id="f-name" type="text" value={values.name} onChange={set('name')} {...aria('name', invalid.name)} className={`${input} h-12`} placeholder="Juan dela Cruz" autoComplete="off" />
        </Labeled>
        <Labeled id="email" label="Work email" invalid={invalid.email}>
          <input id="f-email" type="email" value={values.email} onChange={set('email')} {...aria('email', invalid.email)} className={`${input} h-12`} placeholder="you@lgu.gov.ph" autoComplete="email" />
        </Labeled>
        <Labeled id="lgu" label="LGU or barangay" invalid={invalid.lgu}>
          <input id="f-lgu" type="text" value={values.lgu} onChange={set('lgu')} {...aria('lgu', invalid.lgu)} className={`${input} h-12`} placeholder="Alaminos City, Pangasinan" autoComplete="off" />
        </Labeled>
        <Labeled id="role" label="Your role" invalid={invalid.role}>
          <select id="f-role" value={values.role} onChange={set('role')} {...aria('role', invalid.role)} className={`${input} h-12`}>
            <option value="">Choose your role</option>
            {PILOT_ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Labeled>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="f-msg" className="text-[14px] font-semibold">Message (optional)</label>
          <textarea id="f-msg" rows={4} value={values.message} onChange={set('message')} className={`${input} py-3`} placeholder="What kinds of incidents do you handle? How many households?" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-3 text-[15px]">
          <input id="f-consent" type="checkbox" checked={values.consent} onChange={(e) => setValues((v) => ({ ...v, consent: e.target.checked }))} {...aria('consent', invalid.consent)} className="mt-1 size-5 shrink-0 accent-[var(--t-accent)]" />
          <span>
            I agree that Cordon Bleu may use these details to reply to this request, as described in the{' '}
            <a href="/privacy" className="font-semibold text-accent underline">Privacy notice</a>.
          </span>
        </label>
        <ErrorText id="consent" show={invalid.consent} />
      </div>
      <p className="text-[14px] text-muted">
        We collect your name, work email, LGU or barangay, role and message, and use them only to reply. Retention: [pending]. Ask us to delete them at any time.
      </p>
      <div>
        <button type="submit" disabled={sending} className={`${btnPrimary} w-full sm:w-auto`}>
          Send request
        </button>
      </div>
    </form>
  )
}

function aria(field: Field, invalid: boolean | undefined) {
  return { 'aria-invalid': invalid ?? false, 'aria-describedby': invalid ? `f-${field}-err` : undefined }
}

function Labeled({ id, label, invalid, children }: { id: Field; label: string; invalid?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`f-${id}`} className="text-[14px] font-semibold">{label}</label>
      {children}
      <ErrorText id={id} show={invalid} />
    </div>
  )
}

function ErrorText({ id, show }: { id: Field; show?: boolean }) {
  return (
    <p id={`f-${id}-err`} hidden={!show} className="text-[14px] text-danger">
      {ERRORS[id]}
    </p>
  )
}

export function SentView({ info }: { info: SentInfo }) {
  return (
    <main>
      <div className={`${container} py-20 md:py-28`}>
        <div className={`${card} mx-auto flex max-w-[560px] flex-col gap-4 p-8 md:p-10`}>
          <span className="grid size-12 place-items-center rounded-full bg-good/15 text-[22px] font-bold text-good" aria-hidden="true">
            &#10003;
          </span>
          <h1 className={h2}>Request sent</h1>
          <p className="text-[17px] leading-relaxed text-muted">
            Thanks, <span className="font-semibold text-ink">{info.name}</span>. Cordon Bleu will reply to{' '}
            <span className="font-semibold text-ink">{info.email}</span> within [X working days].
          </p>
          <p className="text-[15px] text-muted">While you wait, you can try the demo with sample households.</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <a href="/app" className={btnPrimary}>Try the demo</a>
            <a href="/" className={btnSecondary}>Back to home</a>
          </div>
        </div>
      </div>
    </main>
  )
}
