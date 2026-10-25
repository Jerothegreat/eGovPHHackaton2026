import { lazy, Suspense } from 'react'
import { LandingSite } from '@/features/landing/LandingSite'

// The consoles load only under /app, so the landing page ships without them.
const ConsoleApp = lazy(() => import('./ConsoleApp'))

// eGovPH SSO may return to the site root with ?exchange_code=. Hand it to the app.
if (window.location.pathname === '/' && new URLSearchParams(window.location.search).has('exchange_code')) {
  window.history.replaceState(null, '', '/app' + window.location.search + window.location.hash)
}

function isAppPath(pathname: string) {
  return pathname === '/app' || pathname.startsWith('/app/')
}

export default function App() {
  const { pathname } = window.location
  if (!isAppPath(pathname)) return <LandingSite pathname={pathname} />
  return (
    <Suspense fallback={null}>
      <ConsoleApp />
    </Suspense>
  )
}
