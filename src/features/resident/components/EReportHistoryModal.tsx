import { useState } from "react"
import { confirmOTP, requestOTP } from "@/features/auth/otp"
import { getReport, getReports, type EReport } from "@/lib/ereport-service"

interface EReportHistoryModalProps {
  email: string | null
  reportViewToken?: string
  reportViewTokenExpiresAt?: string
  onStoreReportViewToken: (token: string, expiresAt?: string) => void
  onClose: () => void
}

function hasValidToken(token?: string, expiresAt?: string) {
  return Boolean(token && (!expiresAt || Date.parse(expiresAt) > Date.now()))
}

export function EReportHistoryModal({
  email: profileEmail,
  reportViewToken,
  reportViewTokenExpiresAt,
  onStoreReportViewToken,
  onClose,
}: EReportHistoryModalProps) {
  const [email, setEmail] = useState(profileEmail ?? "")
  const [otp, setOtp] = useState("")
  const [awaitingOtp, setAwaitingOtp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reports, setReports] = useState<EReport[]>([])
  const [selectedReport, setSelectedReport] = useState<EReport | null>(null)

  async function loadReports(token: string) {
    setLoading(true)
    setError(null)
    try {
      const page = await getReports(token)
      setReports(page.reports)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load eReport cases")
    } finally {
      setLoading(false)
    }
  }

  async function requestCode() {
    setLoading(true)
    setError(null)
    try {
      await requestOTP(email)
      setAwaitingOtp(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send verification code")
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    setLoading(true)
    setError(null)
    try {
      const result = await confirmOTP(email, otp)
      if (!result.verified || !result.report_view_token) {
        throw new Error("Email verification did not return report access")
      }
      onStoreReportViewToken(result.report_view_token, result.expires_at)
      await loadReports(result.report_view_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify email")
    } finally {
      setLoading(false)
    }
  }

  async function viewReport(caseNumber: string) {
    if (!reportViewToken) return
    setLoading(true)
    setError(null)
    try {
      setSelectedReport(await getReport(caseNumber, reportViewToken))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load eReport case")
    } finally {
      setLoading(false)
    }
  }

  const tokenIsValid = hasValidToken(reportViewToken, reportViewTokenExpiresAt)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-card max-w-lg p-5 sm:p-6" onClick={(event) => event.stopPropagation()} aria-labelledby="ereport-history-title">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-700">eReport</p>
            <h2 id="ereport-history-title" className="m-0 text-lg font-extrabold text-slate-900">My report history</h2>
          </div>
          <button type="button" className="pill-btn ghost text-xs" onClick={onClose}>Close</button>
        </div>

        {!tokenIsValid && (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-sm leading-relaxed text-slate-600">Verify your eReport email to securely view your submitted cases.</p>
            <label className="text-xs font-semibold text-slate-700">
              Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" required />
            </label>
            {awaitingOtp && (
              <label className="text-xs font-semibold text-slate-700">
                Verification code
                <input type="text" inputMode="numeric" value={otp} onChange={(event) => setOtp(event.target.value)} maxLength={6} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm" required />
              </label>
            )}
            <button type="button" className="big-btn primary" disabled={loading || !email.trim() || (awaitingOtp && otp.length !== 6)} onClick={awaitingOtp ? verifyCode : requestCode}>
              {loading ? "Working..." : awaitingOtp ? "Verify and view cases" : "Send verification code"}
            </button>
          </div>
        )}

        {tokenIsValid && !selectedReport && (
          <div className="flex flex-col gap-2">
            <button type="button" className="pill-btn ghost self-start text-xs" onClick={() => loadReports(reportViewToken!)} disabled={loading}>Refresh cases</button>
            {loading && <p className="m-0 text-sm text-slate-600">Loading cases...</p>}
            {!loading && reports.length === 0 && <p className="m-0 text-sm text-slate-600">Select Refresh cases to load your eReport history.</p>}
            {reports.map((report) => (
              <button key={report.id} type="button" className="rounded-xl border border-slate-200 p-3 text-left hover:border-blue-300" onClick={() => viewReport(report.case_number)}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm text-slate-900">{report.case_number}</strong>
                  <span className="text-xs font-semibold text-blue-700">{report.formatted_status}</span>
                </div>
                <p className="mb-0 mt-1 text-xs text-slate-600">{report.subject}</p>
              </button>
            ))}
          </div>
        )}

        {selectedReport && (
          <div className="flex flex-col gap-3 text-sm text-slate-700">
            <button type="button" className="w-fit text-xs font-semibold text-blue-700 hover:underline" onClick={() => setSelectedReport(null)}>Back to cases</button>
            <div><strong>{selectedReport.case_number}</strong><p className="m-0 text-xs text-slate-500">{selectedReport.formatted_status} · {selectedReport.created_at}</p></div>
            <div><strong className="text-xs uppercase tracking-wide text-slate-500">{selectedReport.report_type.name}</strong><p className="mb-0 mt-1">{selectedReport.subject}</p><p className="mb-0 mt-1 text-xs leading-relaxed">{selectedReport.message}</p></div>
            <div><strong className="text-xs uppercase tracking-wide text-slate-500">Status history</strong>{selectedReport.history.map((entry) => <p key={`${entry.status}-${entry.created_at}`} className="mb-0 mt-1 text-xs">{entry.formatted_status} · {entry.created_at}{entry.remarks ? `: ${entry.remarks}` : ""}</p>)}</div>
          </div>
        )}

        {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700" role="alert">{error}</p>}
      </section>
    </div>
  )
}
