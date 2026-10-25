import { useEffect } from 'react'
import { LEGAL, type LegalSlug } from './content'
import { container, h2 } from './ui'

// Outlines from the board. The bracketed placeholders stay until legal review fills them.
export function LegalPage({ slug }: { slug: LegalSlug }) {
  const page = LEGAL[slug]

  useEffect(() => {
    document.title = `${page.title} | eHanda`
  }, [page.title])

  return (
    <main>
      <div className={`${container} grid gap-10 py-12 md:py-16 lg:grid-cols-[240px_1fr]`}>
        <aside className="flex flex-col gap-2 text-[15px]">
          <a href="/" className="mb-2 font-semibold text-accent">&larr; Back to home</a>
          {(Object.keys(LEGAL) as LegalSlug[]).map((s) => (
            <a
              key={s}
              href={`/${s}`}
              aria-current={s === slug ? 'page' : undefined}
              className={s === slug ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}
            >
              {LEGAL[s].nav}
            </a>
          ))}
        </aside>
        <article className="flex min-w-0 max-w-[720px] flex-col gap-4">
          <p className="self-start rounded-[10px] border border-line bg-surface px-3 py-1 text-[13px] text-muted">
            Outline. Final text pending legal review. Last updated: [date].
          </p>
          <h1 className={h2}>{page.title}</h1>
          <p className="text-[17px] text-muted">{page.lead}</p>
          <ol className="mt-4 grid gap-6">
            {page.items.map(([heading, body], i) => (
              <li key={heading} className="grid gap-1">
                <h2 className="font-display text-[19px] font-bold tracking-[-0.025em]">
                  <span className="tabular-nums text-muted">{i + 1}.</span> {heading}
                </h2>
                <p className="leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </article>
      </div>
    </main>
  )
}
