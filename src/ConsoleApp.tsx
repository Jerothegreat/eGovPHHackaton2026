import { SessionProvider, useSession } from '@/features/auth/session-context'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { ResidentConsole } from '@/features/resident/ResidentConsole'
import { DeveloperConsole } from '@/features/developer/DeveloperConsole'
import { LguDashboard } from '@/features/lgu/LguDashboard'
import { OfficialConsole } from '@/features/official/OfficialConsole'

export default function ConsoleApp() {
  return (
    <SessionProvider>
      <ProtectedRoute>
        <AppRouter />
      </ProtectedRoute>
    </SessionProvider>
  )
}

function AppRouter() {
  const { session } = useSession()

  if (!session) return null

  if (session.role === 'developer') {
    return <DeveloperConsole />
  }

  if (session.role === 'lgu') {
    return <LguDashboard />
  }

  if (session.role === 'resident') {
    return <ResidentConsole />
  }

  return <OfficialConsole />
}
