import { useEffect, useState } from 'react'

// Essential storage only: the theme and language choices. Storage can throw (private mode,
// blocked site data), so every read and write is guarded.
const THEME_KEY = 'ehanda-theme'
const LANG_KEY = 'ehanda-lang'

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // The choice still applies for this visit.
  }
}

// index.html applies the initial class before first paint. This follows the system setting
// until the visitor clicks the button, then remembers their choice.
export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const follow = (e: MediaQueryListEvent) => {
      if (!read(THEME_KEY)) setDark(e.matches)
    }
    mq.addEventListener('change', follow)
    return () => mq.removeEventListener('change', follow)
  }, [])

  function toggle() {
    write(THEME_KEY, dark ? 'light' : 'dark')
    setDark(!dark)
  }

  return { dark, toggle }
}

export type Lang = 'en' | 'fil'

export function useLang() {
  const [lang, setLangState] = useState<Lang>(() => (read(LANG_KEY) === 'fil' ? 'fil' : 'en'))

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  function setLang(next: Lang) {
    write(LANG_KEY, next)
    setLangState(next)
  }

  return { lang, setLang }
}
