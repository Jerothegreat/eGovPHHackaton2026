import { useState } from 'react'
import { SECTION_LINKS } from './content'
import { Logo } from './Logo'
import type { Lang } from './prefs'
import { btnPrimary, container } from './ui'

interface NavProps {
  lang: Lang
  setLang: (lang: Lang) => void
  dark: boolean
  toggleDark: () => void
}

export function Nav({ lang, setLang, dark, toggleDark }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 text-ink backdrop-blur-md">
      <div className={`${container} flex h-16 items-center gap-4 xl:gap-6 2xl:h-20`}>
        <a href="/" className="inline-flex shrink-0 items-center" aria-label="eHanda home">
          <Logo className="h-7 w-auto" />
        </a>
        <nav className="hidden items-center gap-7 whitespace-nowrap text-[15px] font-medium xl:flex" aria-label="Sections">
          {SECTION_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-muted transition-colors duration-150 hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 whitespace-nowrap md:gap-4">
          <div className="flex rounded-full border border-line p-0.5 text-[13px] font-semibold" role="group" aria-label="Language">
            {(['en', 'fil'] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className="rounded-full px-2.5 py-1 aria-pressed:bg-ink aria-pressed:text-bg"
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <ThemeButton dark={dark} onClick={toggleDark} className="hidden sm:inline-flex" />
          <a href="/app" className="hidden text-[15px] font-medium text-muted transition-colors duration-150 hover:text-ink md:inline">
            Sign in
          </a>
          <a
            href="/app"
            className="hidden h-10 items-center justify-center rounded-[10px] bg-accent px-4 text-[14px] font-semibold text-accent-ink shadow-[0_8px_20px_-10px_rgb(0_71_171/.55)] transition-colors duration-150 hover:bg-accent-hover sm:inline-flex"
          >
            Try the demo
          </a>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mmenu"
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex h-10 items-center rounded-md border border-line px-3 text-[14px] font-semibold xl:hidden"
          >
            Menu
          </button>
        </div>
      </div>
      <div id="mmenu" hidden={!menuOpen} className="border-t border-line xl:hidden">
        <div className={`${container} grid gap-1 py-3 text-[16px] font-medium`}>
          {SECTION_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={closeMenu} className="rounded-md py-2.5 text-muted hover:text-ink">
              {l.label}
            </a>
          ))}
          <a href="/app" className="rounded-md py-2.5 text-muted hover:text-ink">
            Sign in
          </a>
          <div className="flex items-center justify-between py-2.5 sm:hidden">
            <span className="text-muted">Dark mode</span>
            <ThemeButton dark={dark} onClick={toggleDark} className="inline-flex" />
          </div>
          <a href="/app" className={`mt-2 ${btnPrimary}`}>
            Try the demo
          </a>
        </div>
      </div>
    </header>
  )
}

function ThemeButton({ dark, onClick, className }: { dark: boolean; onClick: () => void; className: string }) {
  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label="Dark mode"
      title="Switch light and dark"
      onClick={onClick}
      className={`${className} size-9 items-center justify-center rounded-full border border-line transition-colors duration-150 hover:border-accent`}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  )
}
