import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { EgovProfile } from "./types"
import { runSSO, type DemoIdentity } from "./egov-sso"
import { resolveRole } from "./roles"

type Role = "official" | "resident" | "developer" | "lgu"

interface Session {
  profile: EgovProfile
  role: Role
  reportViewToken?: string
  reportViewTokenExpiresAt?: string
}

interface SessionContextValue {
  session: Session | null
  isAuthed: boolean
  isLoading: boolean
  error: string | null
  login: (identity?: DemoIdentity) => Promise<void>
  setReportViewToken: (token: string, expiresAt?: string) => void
  logout: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

const STORAGE_KEY = "handa_session"

function readStoredSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

function writeStoredSession(session: Session) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function clearStoredSession() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session) writeStoredSession(session)
  }, [session])

  async function login(identity?: DemoIdentity) {
    setIsLoading(true)
    setError(null)
    try {
      const profile = await runSSO(identity)
      const role = await resolveRole(profile.uniqid)
      const next: Session = { profile, role }
      setSession(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  function setReportViewToken(token: string, expiresAt?: string) {
    setSession((current) => current && {
      ...current,
      reportViewToken: token,
      reportViewTokenExpiresAt: expiresAt,
    })
  }

  function logout() {
    setSession(null)
    clearStoredSession()
  }

  return (
    <SessionContext value={{ session, isAuthed: session !== null, isLoading, error, login, setReportViewToken, logout }}>
      {children}
    </SessionContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}
