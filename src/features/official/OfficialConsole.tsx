import { useState, useEffect, useCallback } from 'react'
import { useHandaStore, can, formatAnonymizedIdentity } from '@/shared'
import { Shell } from '@/components/Shell'
import type { DashboardRow, CheckInStatus } from '@/shared'
import { useSession } from '@/features/auth/session-context'
import { SmsSimulatorDrawer } from '@/features/alerts'
import type { AlertIngestionResult } from '@/features/alerts'
import { getHistoricalIncidentMeta } from '@/features/demo/historical-selectors'
import { groupCampaignsForDisplay } from './assessment-list'
import { dispatchAlert } from '@/lib/alert-dispatcher'

type DeveloperApplicationStatus = 'pending' | 'accepted' | 'rejected'

const RDANA_CATEGORY_OPTIONS = [
  { value: 'shelter', label: 'Shelter / Housing (Section II-A)' },
  { value: 'food_water', label: 'Food & Water (Section II-B)' },
  { value: 'medical', label: 'Health / Medical (Section II-C)' },
  { value: 'livelihood', label: 'Livelihood / Agriculture (Section II-D)' },
  { value: 'evacuation', label: 'Evacuation & Rescue (Section II-E)' },
  { value: 'utilities', label: 'Utilities & Power (Section II-F)' },
] as const

type DeveloperApplication = {
  id: string
  applicant_name: string
  email: string
  organization: string
  barangay_code: string
  submitted_at: string
  requested_endpoints: string[]
  use_case: string
  status: DeveloperApplicationStatus
}

const DEVELOPER_APPLICATIONS_STORAGE_KEY = 'handa_developer_applications'

const DEFAULT_DEVELOPER_APPLICATIONS: DeveloperApplication[] = [
  {
    id: 'dev-app-001',
    applicant_name: 'Alyssa Mendoza',
    email: 'alyssa@citydata.ph',
    organization: 'CityData PH',
    barangay_code: '0105503021',
    submitted_at: '2026-07-30T09:15:00Z',
    requested_endpoints: ['/assessments', '/assessments/{id}/aggregates', '/assessments/{id}/responses'],
    use_case: 'We want to display active eHanda assessments and relief demand metrics inside our city command center map.',
    status: 'pending',
  },
  {
    id: 'dev-app-002',
    applicant_name: 'Marco Javier',
    email: 'marco@rescueops.ph',
    organization: 'RescueOps',
    barangay_code: '0105503021',
    submitted_at: '2026-07-29T06:45:00Z',
    requested_endpoints: ['/barangays/{psgc}', '/assessments/{id}', '/assessments/{id}/export.csv'],
    use_case: 'Our ops team needs daily CSV exports for coordination with field responders and barangay volunteers.',
    status: 'pending',
  },
  {
    id: 'dev-app-003',
    applicant_name: 'Kawit Systems Team',
    email: 'hello@kawit.systems',
    organization: 'Kawit Systems',
    barangay_code: '042111011',
    submitted_at: '2026-07-28T11:00:00Z',
    requested_endpoints: ['/assessments', '/assessments/{id}/responses'],
    use_case: 'We are integrating eHanda into the municipal dashboard for Toclong disaster monitoring.',
    status: 'pending',
  },
]

function loadDeveloperApplications(): DeveloperApplication[] {
  if (typeof window === 'undefined') return DEFAULT_DEVELOPER_APPLICATIONS
  try {
    const raw = window.localStorage.getItem(DEVELOPER_APPLICATIONS_STORAGE_KEY)
    if (!raw) return DEFAULT_DEVELOPER_APPLICATIONS
    const stored = JSON.parse(raw) as DeveloperApplication[]
    const byId = new Map(stored.map(app => [app.id, app]))
    return DEFAULT_DEVELOPER_APPLICATIONS.map(app => byId.get(app.id) ?? app)
  } catch {
    return DEFAULT_DEVELOPER_APPLICATIONS
  }
}

function formatSubmittedBy(submittedBy: string) {
  return submittedBy.includes('(manual)') ? submittedBy : 'Self Report'
}

function getNeedCategoryMeta(catKey: string) {
  const normalized = catKey.toLowerCase().replace(/[\s_]+/g, '_')
  if (normalized.includes('shelter') || normalized.includes('house') || normalized.includes('structure') || normalized.includes('home')) {
    return {
      label: 'Shelter & Structural Repair',
      color: '#ea580c',
      bg: '#fff7ed',
      border: '#ffedd5',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    }
  }
  if (normalized.includes('food') || normalized.includes('water') || normalized.includes('ration') || normalized.includes('supply')) {
    return {
      label: 'Food & Clean Water Supply',
      color: '#0284c7',
      bg: '#f0f9ff',
      border: '#e0f2fe',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      )
    }
  }
  if (normalized.includes('med') || normalized.includes('health') || normalized.includes('doctor') || normalized.includes('injury')) {
    return {
      label: 'Medical Care & First Aid',
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fee2e2',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      )
    }
  }
  if (normalized.includes('evac') || normalized.includes('rescue') || normalized.includes('trapped') || normalized.includes('transport')) {
    return {
      label: 'Evacuation & Transport',
      color: '#7c3aed',
      bg: '#f5f3ff',
      border: '#ede9fe',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 4v16M17 8l-4-4-4 4" />
        </svg>
      )
    }
  }
  if (normalized.includes('livelihood') || normalized.includes('income') || normalized.includes('work') || normalized.includes('job')) {
    return {
      label: 'Livelihood & Income Support',
      color: '#059669',
      bg: '#ecfdf5',
      border: '#d1fae5',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      )
    }
  }
  if (normalized.includes('util') || normalized.includes('electr') || normalized.includes('power') || normalized.includes('light')) {
    return {
      label: 'Electricity & Utilities',
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fef3c7',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    }
  }
  return {
    label: catKey.charAt(0).toUpperCase() + catKey.slice(1).replace(/_/g, ' '),
    color: 'var(--blue-primary)',
    bg: '#eff6ff',
    border: '#dbeafe',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    )
  }
}

export function OfficialConsole() {
  const { session, logout } = useSession()
  const store = useHandaStore()
  const { loading, data, createCampaign, saveCampaign, addQuestion, removeQuestion, updateQuestion, updateCampaignStatus, updateCaseStatus, submitCheckIn, getDashboard, exportCsv, copyQuestions, addAlert, linkAlertToCampaign } = store
  const [pendingDraft, setPendingDraft] = useState<AlertIngestionResult | null>(null)

  const [name, setName] = useState('')
  const [disasterType, setDisasterType] = useState('Typhoon')
  const [disasterDate, setDisasterDate] = useState('')
  const [newQ, setNewQ] = useState('')
  const [newCat, setNewCat] = useState('')
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [editQText, setEditQText] = useState('')
  const [editQCat, setEditQCat] = useState('')
  const [selectedRow, setSelectedRow] = useState<DashboardRow | null>(null)

  const [modalStatus, setModalStatus] = useState<CheckInStatus>('unresolved')
  const [manualEntryOpen, setManualEntryOpen] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualAnswers, setManualAnswers] = useState<Record<string, string>>({})
  const [sidebarTab, setSidebarTab] = useState<'dashboard' | 'campaigns' | 'developers'>(() => {
    const hash = window.location.hash
    if (hash === '#assessments') return 'campaigns'
    if (hash === '#developers') return 'developers'
    if (!hash || hash === '#') {
      window.location.hash = '#dashboard'
      return 'dashboard'
    }
    return hash === '#dashboard' ? 'dashboard' : 'dashboard'
  })

  const navigate = useCallback((tab: 'dashboard' | 'campaigns' | 'developers') => {
    setSidebarTab(tab)
    window.location.hash = tab === 'campaigns' ? '#assessments' : tab === 'developers' ? '#developers' : '#dashboard'
  }, [])

  useEffect(() => {
    const onHash = () => {
      const tab = window.location.hash === '#assessments'
        ? 'campaigns'
        : window.location.hash === '#developers'
          ? 'developers'
          : 'dashboard'
      setSidebarTab(tab)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const [toastMsg, setToastMsg] = useState('')
  const [pendingAction, setPendingAction] = useState<{ type: 'publish' | 'close' | 'archive'; campaignId: string } | null>(null)

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [copyFromCampaignId, setCopyFromCampaignId] = useState('')
  const [saving, setSaving] = useState(false)
  const [dispatching, setDispatching] = useState(false)
  const [isSwitchingAssessment, setIsSwitchingAssessment] = useState(false)

  const handleSelectEditCampaign = (c: { id: string; name: string; disaster_type: string; disaster_date: string }) => {
    if (editingCampaignId === c.id) return
    setIsSwitchingAssessment(true)
    setEditingCampaignId(c.id)
    setName(c.name)
    setDisasterType(c.disaster_type)
    setDisasterDate(c.disaster_date)
    setEditingQuestionId(null)
    setTimeout(() => {
      setIsSwitchingAssessment(false)
    }, 240)
  }

  const handleStartNewCampaign = () => {
    setIsSwitchingAssessment(true)
    setEditingCampaignId(null)
    setName('')
    setDisasterType('Typhoon')
    setDisasterDate('')
    setEditingQuestionId(null)
    setTimeout(() => {
      setIsSwitchingAssessment(false)
    }, 240)
  }

  const [queueStatusFilter, setQueueStatusFilter] = useState<CheckInStatus | 'all'>('all')
  const [queueNameSort, setQueueNameSort] = useState<'asc' | 'desc'>('asc')
  const [developerApplications, setDeveloperApplications] = useState<DeveloperApplication[]>(loadDeveloperApplications)
  const [selectedDeveloperApplicationId, setSelectedDeveloperApplicationId] = useState<string | null>(null)

  useEffect(() => {
    window.localStorage.setItem(DEVELOPER_APPLICATIONS_STORAGE_KEY, JSON.stringify(developerApplications))
  }, [developerApplications])

  if (!session) return null

  const profile = session.profile
  const official = {
    name: `${profile.first_name} ${profile.last_name}`,
    uniqid: profile.uniqid,
    role: session.role,
    barangay_code: profile.barangay_code,
  }

  const activeCampaign = data.campaigns.find(c => c.status === 'active')
  const selectedCampaign = selectedCampaignId ? data.campaigns.find(c => c.id === selectedCampaignId) : activeCampaign
  const selectedCampaignMeta = selectedCampaign ? getHistoricalIncidentMeta(selectedCampaign.id) : null
  const dashboard = selectedCampaign ? getDashboard(selectedCampaign.id) : null
  const queueRows = dashboard
    ? dashboard.rows
      .filter(r => queueStatusFilter === 'all' || r.checkIn.status === queueStatusFilter)
      .slice()
      .sort((a, b) => queueNameSort === 'asc'
        ? a.checkIn.name.localeCompare(b.checkIn.name)
        : b.checkIn.name.localeCompare(a.checkIn.name))
    : []
  const viewableCampaigns = groupCampaignsForDisplay(data.campaigns)
  const visibleDeveloperApplications = developerApplications.filter(app => app.barangay_code === profile.barangay_code)
  const pendingDeveloperApplications = visibleDeveloperApplications.filter(app => app.status === 'pending')
  const selectedDeveloperApplication = selectedDeveloperApplicationId
    ? developerApplications.find(app => app.id === selectedDeveloperApplicationId) ?? null
    : null

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !disasterDate) return
    if (disasterDate > new Date().toISOString().split('T')[0]) {
      showToast('Disaster date cannot be in the future.')
      return
    }
    setSaving(true)
    const existing = editingCampaignId ? data.campaigns.find(c => c.id === editingCampaignId) : null
    if (existing) {
      await saveCampaign(existing.id, { name, disaster_type: disasterType, disaster_date: disasterDate })
      showToast('Assessment updated.')
    } else {
      const c = await createCampaign({ name, disaster_type: disasterType, disaster_date: disasterDate, created_by: profile.uniqid, barangay_code: profile.barangay_code })
      if (c) setEditingCampaignId(c.id)
    }
    setSaving(false)
    setName(''); setDisasterDate('')
  }

  function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCampaignId || !newQ || !newCat) return
    addQuestion(editingCampaignId, newQ, newCat); setNewQ(''); setNewCat('')
  }

  function openModal(row: DashboardRow) { setSelectedRow(row); setModalStatus(row.checkIn.status) }
  async function handleSaveStatus() { if (!selectedRow) return; await updateCaseStatus(selectedRow.checkIn.id, modalStatus); setSelectedRow(null) }

  async function handleManualSubmit() {
    if (!selectedCampaign || !manualName) return
    const answerList = Object.entries(manualAnswers)
      .filter(([, v]) => v)
      .map(([question_id, answer]) => ({ question_id, answer }))
    await submitCheckIn({
      campaign_id: selectedCampaign.id,
      name: manualName,
      submitted_by: `${official.name} (manual)`,
      answers: answerList,
    })
    setManualEntryOpen(false)
    setManualName('')
    setManualAnswers({})
  }

  function handleExportCsv() {
    if (!selectedCampaign) return
    const csv = exportCsv(selectedCampaign.id)
    if (!csv) { showToast('No data to export.'); return }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedCampaign.name.replace(/\s+/g, '_')}_export.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSV exported.')
  }

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2400)
  }

  function updateDeveloperApplicationStatus(applicationId: string, status: DeveloperApplicationStatus) {
    setDeveloperApplications(current => current.map(application => (
      application.id === applicationId ? { ...application, status } : application
    )))
    if (selectedDeveloperApplicationId === applicationId) setSelectedDeveloperApplicationId(applicationId)
    showToast(`Developer application ${status}.`)
  }

  async function handleConfirmAction() {
    if (!pendingAction) return
    const { type, campaignId } = pendingAction
    if (type === 'publish') {
      const publishedCampaign = data.campaigns.find(c => c.id === campaignId)
      if (!publishedCampaign) return

      const questions = data.questions
        .filter(q => q.campaign_id === campaignId)
        .sort((a, b) => a.display_order - b.display_order)

      setDispatching(true)
      await updateCampaignStatus(campaignId, 'active')
      setSelectedCampaignId(campaignId)
      setPendingDraft(null)

      try {
        const result = await dispatchAlert({
          campaignName: publishedCampaign.name,
          disaster: publishedCampaign.disaster_type,
          signalLevel: `Assessment published ${publishedCampaign.disaster_date}`,
          barangay: publishedCampaign.barangay_code,
          municipality: profile.municipality_code ?? '',
          questions,
          smsRecipients: ['+639702045579'],
        })
        const sms = result.results.find(channel => channel.channel === 'sms')
        const telegram = result.results.find(channel => channel.channel === 'telegram')
        showToast(`Published. eSMS: ${sms?.sent ?? 0} sent • Telegram: ${telegram?.sent ?? 0} sent`)
      } catch (error) {
        console.error('[eHANDA] Publish notification failed:', error)
        showToast('Assessment published, but notifications could not be sent.')
      } finally {
        setDispatching(false)
      }
    } else if (type === 'close') {
      await updateCampaignStatus(campaignId, 'closed')
      showToast('Assessment closed.')
    } else if (type === 'archive') {
      await updateCampaignStatus(campaignId, 'archived')
      showToast('Assessment archived.')
    }
    setPendingAction(null)
  }

  function confirmAction(type: 'publish' | 'close' | 'archive', campaignId: string) {
    setPendingAction({ type, campaignId })
  }

  if (loading) {
    return (
      <Shell official={null} sidebarTab="dashboard" onNavigate={() => { }} onLogout={() => { }}>
        <div className="skeleton-bar" style={{ width: '60%', height: '24px' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 mt-5">
          <div className="section-card p-[18px]">
            <div className="skeleton-bar" style={{ width: '40%', height: '36px', margin: 0 }} />
            <div className="skeleton-bar" style={{ width: '30%', height: '14px', margin: '8px 0 0' }} />
          </div>
          <div className="section-card p-[18px]">
            <div className="skeleton-bar" style={{ width: '40%', height: '36px', margin: 0 }} />
            <div className="skeleton-bar" style={{ width: '30%', height: '14px', margin: '8px 0 0' }} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_0.68fr] gap-3">
          <div className="section-card">
            <div className="skeleton-bar" style={{ width: '30%', height: '16px', margin: '16px' }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-bar" style={{ width: `${85 - i * 8}%`, margin: '10px 16px' }} />
            ))}
          </div>
          <div className="section-card">
            <div className="skeleton-bar" style={{ width: '35%', height: '16px', margin: '16px' }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-bar" style={{ width: `${78 - i * 5}%`, margin: '10px 16px' }} />
            ))}
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <>
      <Shell
        official={official}
        sidebarTab={sidebarTab}
        onNavigate={navigate}
        onLogout={logout}
        role="official"
      >
        {sidebarTab === 'dashboard' && (
          <>
            {/* Sliding Drawer Simulator (PAGASA / NDRRMC Push & SMS) */}
            <SmsSimulatorDrawer
              barangayCode={profile.barangay_code}
              onAlertProcessed={async (result: AlertIngestionResult) => {
                // Save alert to store
                addAlert(result.alert)

                if (result.draft && result.threshold.auto_draft) {
                  // Create draft campaign from AI-generated assessment
                  const campaign = await createCampaign({
                    name: result.draft.campaign_name,
                    disaster_type: result.draft.disaster_type,
                    disaster_date: result.draft.disaster_date,
                    created_by: 'eHanda-AI',
                    barangay_code: profile.barangay_code,
                    alert_id: result.alert.id,
                    ai_generated: true,
                  })
                    if (campaign) {
                      // Add AI-generated questions to the draft campaign
                      for (const q of result.draft.questions) {
                        addQuestion(campaign.id, q.question_text, q.need_category)
                      }
                      linkAlertToCampaign(result.alert.id, campaign.id)
                      setPendingDraft(result)
                      setEditingCampaignId(campaign.id)
                      setName(campaign.name)
                      setDisasterType(campaign.disaster_type)
                      setDisasterDate(campaign.disaster_date)
                    }
                  }
                }}
              />

            {/* Layer 1→2: AI Draft Review Banner (Shows ONLY when alert is triggered) */}
            {pendingDraft && pendingDraft.draft && (() => {
              const draftCampaign = data.campaigns.find(c => c.ai_generated && c.status === 'draft' && c.alert_id === pendingDraft.alert.id)
              if (!draftCampaign) return null
              return (
                <div
                  className="section-card mb-4 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  style={{
                    border: '1px solid #bfdbfe',
                    background: 'linear-gradient(135deg, #eff6ff 0%, #f0f7ff 100%)',
                    borderRadius: '14px',
                    boxShadow: '0 2px 8px 0 rgba(6, 70, 244, 0.06)',
                  }}
                >
                  <div className="flex items-start gap-3.5" style={{ flex: 1 }}>
                    <div
                      className="flex items-center justify-center rounded-xl shrink-0"
                      style={{
                        width: '42px',
                        height: '42px',
                        background: '#dbeafe',
                        color: 'var(--blue-primary)',
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <strong style={{ fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                          PAGASA Alert: {pendingDraft.alert.headline}
                        </strong>
                        <span
                          style={{
                            fontSize: '11px',
                            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            color: '#fff',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 Z" />
                          </svg>
                          AI Draft
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                        An Incident Assessment draft with {pendingDraft.draft.questions.length} RDANA-grounded questions has been auto-generated and is ready for your review.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    <button
                      className="big-btn ghost"
                      style={{
                        background: '#fff',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        fontSize: '13px',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontWeight: 600,
                      }}
                      onClick={() => setPendingDraft(null)}
                    >
                      Dismiss
                    </button>
                    <button
                      className="big-btn primary"
                      style={{
                        background: 'var(--blue-primary)',
                        color: '#fff',
                        border: 'none',
                        fontSize: '13px',
                        padding: '8px 18px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        boxShadow: '0 2px 6px rgba(6, 70, 244, 0.25)',
                      }}
                      onClick={() => {
                        handleSelectEditCampaign(draftCampaign)
                        navigate('campaigns')
                      }}
                    >
                      Review Draft
                    </button>
                  </div>
                </div>
              )
            })()}
            <div className="dashboard-sticky-head mb-4">
              <div className="dashboard-assessment-control flex flex-col sm:flex-row sm:items-center gap-2 mb-4 w-full">
                <label htmlFor="campaign-select" className="text-xs sm:text-sm font-bold text-slate-700 shrink-0">Assessment:</label>
                <select
                  id="campaign-select"
                  value={selectedCampaignId ?? ''}
                  onChange={e => setSelectedCampaignId(e.target.value || null)}
                  className="min-h-[42px] rounded-xl px-3 py-2 text-xs sm:text-sm w-full sm:w-auto sm:max-w-md border border-slate-300 bg-white text-slate-900 shadow-sm"
                >
                  <option value="">— Select an assessment —</option>
                  {viewableCampaigns.flatMap(group => group.campaigns).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                  ))}
                </select>
              </div>
              {selectedCampaign && (
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 m-0 truncate">
                        {selectedCampaign.name}
                      </h2>
                      <span className={`status-chip shrink-0 ${selectedCampaign.status === 'active' ? 'good' : selectedCampaign.status === 'closed' ? 'warn' : 'open'}`}>
                        {selectedCampaign.status}
                      </span>
                      {selectedCampaign.ai_generated && (
                        <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 shrink-0">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 Z" />
                          </svg>
                          AI Generated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium m-0 truncate">
                      Barangay {selectedCampaign.barangay_code} — {selectedCampaign.disaster_type}, {selectedCampaign.disaster_date}
                    </p>
                    {selectedCampaignMeta && (
                      <p className="text-xs text-blue-700 font-semibold m-0 mt-1 truncate">
                        Live tracking: {selectedCampaignMeta.barangayLabel} • Historical affected population: {selectedCampaignMeta.historicalAffectedPeople.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                    {can(session.role, 'manual_entry') && selectedCampaign?.status === 'active' && (
                      <button className="pill-btn ghost text-xs py-1.5 px-3 whitespace-nowrap" onClick={() => setManualEntryOpen(true)}>Manual entry</button>
                    )}
                    {can(session.role, 'export_csv') && (
                      <button className="pill-btn primary text-xs py-1.5 px-3 font-semibold whitespace-nowrap" onClick={handleExportCsv}>Export CSV</button>
                    )}
                    {selectedCampaign.status !== 'archived' && (
                      <>
                        {selectedCampaign.status !== 'active' && can(session.role, 'publish_campaign') && (
                          <button className="pill-btn primary text-xs py-1.5 px-3 whitespace-nowrap" onClick={() => confirmAction('publish', selectedCampaign.id)}>Publish</button>
                        )}
                        {selectedCampaign.status !== 'closed' && can(session.role, 'close_campaign') && (
                          <button className="pill-btn ghost text-xs py-1.5 px-3 whitespace-nowrap" onClick={() => confirmAction('close', selectedCampaign.id)}>Close</button>
                        )}
                        {can(session.role, 'archive_campaign') && (
                          <button className="pill-btn ghost text-xs py-1.5 px-3 whitespace-nowrap hover:text-red-600 hover:border-red-300" onClick={() => confirmAction('archive', selectedCampaign.id)}>Archive</button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedCampaign ? (
              <>
                {dashboard && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                      <div className="section-card p-[18px]" style={{ border: '1px solid var(--line)', background: '#fff' }}>
                        <strong style={{ display: 'block', fontSize: 'clamp(26px, 5vw, 36px)', color: 'var(--blue-2)', letterSpacing: '-0.05em' }}>{dashboard.affectedCount}</strong>
                        <span style={{ color: 'var(--muted-text)', fontWeight: 700, fontSize: '14px' }}>Check-ins</span>
                      </div>
                      <div className="section-card p-[18px]" style={{ border: '1px solid var(--line)', background: '#fff' }}>
                        <strong style={{ display: 'block', fontSize: 'clamp(26px, 5vw, 36px)', color: 'var(--red)', letterSpacing: '-0.05em' }}>{dashboard.unresolvedCount}</strong>
                        <span style={{ color: 'var(--muted-text)', fontWeight: 700, fontSize: '14px' }}>Unresolved</span>
                      </div>
                      <div className="section-card p-[18px]" style={{ border: '1px solid var(--line)', background: '#fff' }}>
                        <strong style={{ display: 'block', fontSize: 'clamp(18px, 4vw, 24px)', color: '#7c3aed', letterSpacing: '-0.04em' }}>
                          {selectedCampaignMeta?.barangayLabel ?? `Barangay ${selectedCampaign.barangay_code}`}
                        </strong>
                        <span style={{ color: 'var(--muted-text)', fontWeight: 700, fontSize: '14px' }}>Tracked City / Area</span>
                      </div>
                      <div className="section-card p-[18px]" style={{ border: '1px solid var(--line)', background: '#fff' }}>
                        <strong style={{ display: 'block', fontSize: 'clamp(26px, 5vw, 36px)', color: '#0f766e', letterSpacing: '-0.05em' }}>
                          {selectedCampaignMeta ? selectedCampaignMeta.historicalAffectedPeople.toLocaleString() : '--'}
                        </strong>
                        <span style={{ color: 'var(--muted-text)', fontWeight: 700, fontSize: '14px' }}>Historical Population Affected</span>
                      </div>
                    </div>

                    {selectedCampaignMeta && (
                      <div className="section-card mb-4">
                        <div className="p-4" style={{ borderBottom: '1px solid #edf1f8' }}>
                          <h3 style={{ margin: 0 }}>Priority supply tracking</h3>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted-text)' }}>
                            Historical response needs for {selectedCampaignMeta.barangayLabel}, paired with the live barangay assessment intake below.
                          </p>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                          {selectedCampaignMeta.neededSupplies.map((supply) => (
                            <div key={supply.label} className="rounded-[16px] p-4" style={{ border: '1px solid #edf1f8', background: '#fff' }}>
                              <strong style={{ display: 'block', fontSize: '14px', color: 'var(--ink)' }}>{supply.label}</strong>
                              <span style={{ display: 'block', marginTop: '6px', color: 'var(--blue-2)', fontWeight: 800, fontSize: '18px' }}>{supply.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_0.68fr] gap-3 mb-4">
                      <div className="section-card">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 p-3.5 sm:p-4" style={{ borderBottom: '1px solid #edf1f8' }}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Check-in queue</h3>
                            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                              RA 10173 Anonymized
                            </span>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <label className="sr-only" htmlFor="queue-sort">Sort by name</label>
                            <select
                              id="queue-sort"
                              value={queueNameSort}
                              onChange={e => setQueueNameSort(e.target.value as 'asc' | 'desc')}
                              className="h-8 sm:h-9 rounded-xl px-2 text-xs font-medium border border-slate-200 bg-white text-slate-800 flex-1 sm:flex-initial"
                            >
                              <option value="asc">Name A-Z</option>
                              <option value="desc">Name Z-A</option>
                            </select>
                            <label className="sr-only" htmlFor="queue-status">Filter by status</label>
                            <select
                              id="queue-status"
                              value={queueStatusFilter}
                              onChange={e => setQueueStatusFilter(e.target.value as CheckInStatus | 'all')}
                              className="h-8 sm:h-9 rounded-xl px-2 text-xs font-medium border border-slate-200 bg-white text-slate-800 flex-1 sm:flex-initial"
                            >
                              <option value="all">All statuses</option>
                              <option value="unresolved">Unresolved</option>
                              <option value="visited">Visited</option>
                              <option value="resolved">Resolved</option>
                            </select>
                          </div>
                        </div>
                        <div className="overflow-auto max-h-[520px]">
                          <table className="w-full min-w-[400px] border-collapse text-sm">
                            <thead>
                              <tr>
                                <th className="text-left py-3 px-4 font-bold" style={{ color: '#4b5568', background: '#f8faff', borderBottom: '1px solid #edf1f8' }}>Anonymized Resident Identity</th>
                                <th className="text-left py-3 px-4 font-bold" style={{ color: '#4b5568', background: '#f8faff', borderBottom: '1px solid #edf1f8' }}>Submitted by</th>
                                <th className="text-left py-3 px-4 font-bold" style={{ color: '#4b5568', background: '#f8faff', borderBottom: '1px solid #edf1f8' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {queueRows.map(r => (
                                <tr
                                  key={r.checkIn.id}
                                  className={selectedCampaign?.status === 'active' ? 'cursor-pointer' : ''}
                                  style={{ borderBottom: '1px solid #edf1f8' }}
                                  onClick={() => selectedCampaign?.status === 'active' && openModal(r)}
                                >
                                  <td className="py-3 px-4">
                                    {(() => {
                                      const { maskedName, residentKey } = formatAnonymizedIdentity(r.checkIn.name, r.checkIn.id)
                                      return (
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-semibold text-[var(--ink)]">{maskedName}</span>
                                          <span className="font-mono text-[11px] px-2 py-0.5 rounded-md" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontWeight: 600 }}>
                                            {residentKey}
                                          </span>
                                        </div>
                                      )
                                    })()}
                                  </td>
                                  <td className="py-3 px-4" style={{ color: 'var(--muted-text)' }}>{formatSubmittedBy(r.checkIn.submitted_by)}</td>
                                  <td className="py-3 px-4">
                                    <span className={`status-chip ${r.checkIn.status === 'resolved' ? 'good' : r.checkIn.status === 'visited' ? 'warn' : 'open'}`}>
                                      {r.checkIn.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {queueRows.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="py-6 px-4 text-center" style={{ color: 'var(--muted-text)' }}>No check-ins match this filter.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {Object.keys(dashboard.needBreakdown).length > 0 && (
                        <div className="section-card">
                          <div className="p-4" style={{ borderBottom: '1px solid #edf1f8' }}>
                            <div className="flex items-center justify-between">
                              <h3 style={{ margin: 0 }}>Citizen need breakdown</h3>
                              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                {Object.keys(dashboard.needBreakdown).length} active need types
                              </span>
                            </div>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted-text)' }}>
                              Real-time demand metrics collected from resident check-ins
                            </p>
                          </div>
                          <div className="flex flex-col gap-3 p-4">
                            {Object.entries(dashboard.needBreakdown)
                              .sort((a, b) => b[1] - a[1])
                              .map(([catKey, count]) => {
                                const meta = getNeedCategoryMeta(catKey)
                                const totalAffected = Math.max(dashboard.affectedCount, 1)
                                const percentage = Math.round((count / totalAffected) * 100)

                                return (
                                  <div
                                    key={catKey}
                                    className="p-3.5 rounded-xl border flex flex-col gap-2 transition-all"
                                    style={{ background: meta.bg, borderColor: meta.border }}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2.5">
                                        <div
                                          className="p-2 rounded-lg flex items-center justify-center shrink-0"
                                          style={{ background: '#fff', color: meta.color, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                                        >
                                          {meta.icon}
                                        </div>
                                        <div>
                                          <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a', fontWeight: 700 }}>
                                            {meta.label}
                                          </strong>
                                          <span className="text-xs text-slate-500 font-medium">
                                            {count} {count === 1 ? 'check-in' : 'check-ins'} requesting
                                          </span>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span
                                          className="text-xs font-mono font-bold px-2.5 py-1 rounded-full inline-block"
                                          style={{ background: '#fff', color: meta.color, border: `1px solid ${meta.border}` }}
                                        >
                                          {percentage}%
                                        </span>
                                      </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(percentage, 100)}%`, background: meta.color }}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      {/* Developer API Data Exposure Preview */}
                      <div className="section-card p-4 border border-blue-200 bg-slate-50">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <div>
                            <h3 style={{ margin: 0, fontSize: '14px', color: '#0f172a' }} className="flex items-center gap-2">
                              Developer API Output Preview
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#556075' }}>
                              Live JSON payload exposed to third-party city applications via <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">/v1/assessments/{selectedCampaign.id}/aggregates</code>
                            </p>
                          </div>
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-blue-700 text-white">
                            REST JSON
                          </span>
                        </div>

                        <pre className="mt-3 p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto">
                          <code>
                            {JSON.stringify(
                              {
                                assessment_id: selectedCampaign.id,
                                campaign_name: selectedCampaign.name,
                                disaster_type: selectedCampaign.disaster_type,
                                barangay_code: selectedCampaign.barangay_code,
                                status: selectedCampaign.status,
                                aggregates: {
                                  affected_count: dashboard.affectedCount,
                                  unresolved_count: dashboard.unresolvedCount,
                                  needs_breakdown: dashboard.needBreakdown,
                                },
                                updated_at: selectedCampaign.updated_at,
                              },
                              null,
                              2
                            )}
                          </code>
                        </pre>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="empty-state-box text-center">
                <h3 style={{ margin: 0, fontSize: '18px', letterSpacing: '-0.04em', color: 'var(--ink)' }}>No assessment selected</h3>
                <p style={{ color: '#556075', lineHeight: 1.45, fontSize: '14px', marginTop: '8px' }}>Select an assessment from the dropdown above, or create one first.</p>
                <button className="big-btn primary mt-4" onClick={() => navigate('campaigns')}>Go to Assessments</button>
              </div>
            )}
          </>
        )}

        {sidebarTab === 'campaigns' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 m-0">
                  Incident Assessment Builder
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 m-0 mt-1">
                  Configure disaster details and reusable question sets for resident check-ins.
                </p>
              </div>
              <button
                type="button"
                className="pill-btn primary text-xs py-2 px-4 shrink-0 shadow-sm font-bold"
                onClick={handleStartNewCampaign}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1.5 inline">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Assessment Draft
              </button>
            </div>

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {/* Section Loading Screen / Overlay when selecting/switching assessments */}
              {isSwitchingAssessment && (
                <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center gap-3 rounded-2xl border border-blue-200 shadow-sm transition-all animate-fadeIn">
                  <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <div className="text-center">
                    <span className="text-sm font-bold text-slate-800 block">Loading Assessment Details...</span>
                    <span className="text-xs text-slate-500">Updating form blocks & question sets</span>
                  </div>
                </div>
              )}

              {/* Left Column: Assessment Details */}
              {can(session.role, 'create_campaign') && (
                <div className="form-card min-h-[490px] flex flex-col justify-between p-5 border border-slate-200 bg-white rounded-2xl shadow-sm">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 m-0">
                          {editingCampaignId && data.campaigns.some(c => c.id === editingCampaignId) ? 'Assessment Details' : 'Create New Assessment'}
                        </h3>
                        <span className="text-xs text-slate-500 font-medium block mt-0.5">
                          {editingCampaignId ? 'Edit metadata for selected disaster assessment' : 'Set up disaster name, category, and date'}
                        </span>
                      </div>
                      {editingCampaignId && (
                        <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                          Editing Mode
                        </span>
                      )}
                    </div>

                    <form id="campaign-details-form" onSubmit={handleCreateCampaign} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="campaign-name" className="text-xs font-bold text-slate-700">Disaster / Assessment Name</label>
                        <input
                          id="campaign-name"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="e.g. Typhoon Yolanda Rapid Assessment"
                          className="w-full min-h-[44px] rounded-xl px-3.5 py-2.5 text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                        <span className="text-[12px] text-slate-500">Displayed to citizens in the resident check-in prompt.</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="campaign-type" className="text-xs font-bold text-slate-700">Disaster Category</label>
                        <select
                          id="campaign-type"
                          value={disasterType}
                          onChange={e => setDisasterType(e.target.value)}
                          className="w-full min-h-[44px] rounded-xl px-3.5 py-2.5 text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                          <option value="Typhoon">Typhoon</option>
                          <option value="Flood">Flood</option>
                          <option value="Fire">Fire</option>
                          <option value="Earthquake">Earthquake</option>
                          <option value="Volcanic">Volcanic</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="campaign-date" className="text-xs font-bold text-slate-700">Incident Date</label>
                        <input
                          id="campaign-date"
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          value={disasterDate}
                          onChange={e => setDisasterDate(e.target.value)}
                          className="w-full min-h-[44px] rounded-xl px-3.5 py-2.5 text-sm border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </form>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center gap-2 mt-4">
                    <button
                      form="campaign-details-form"
                      className="big-btn primary text-sm w-full py-2.5 rounded-xl font-bold shadow-sm"
                      type="submit"
                      disabled={saving}
                      style={saving ? { opacity: 0.8 } : undefined}
                    >
                      {saving && <span className="spinner mr-2" />}
                      {saving ? 'Saving...' : editingCampaignId && data.campaigns.some(c => c.id === editingCampaignId) ? 'Update Assessment Details' : 'Save Assessment Draft'}
                    </button>
                  </div>
                </div>
              )}

              {/* Right Column: Question Set Configurator */}
              {can(session.role, 'edit_questions') && (
                <div className="form-card min-h-[490px] flex flex-col justify-between p-5 border border-slate-200 bg-white rounded-2xl shadow-sm">
                  {editingCampaignId ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900 m-0">Question Set</h3>
                            <span className="text-xs text-slate-500 font-medium block mt-0.5">
                              Configure questions for {name || 'selected assessment'}
                            </span>
                          </div>
                          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
                            {data.questions.filter(q => q.campaign_id === editingCampaignId).length} questions
                          </span>
                        </div>

                        {/* Bounded Questions Scroll Container */}
                        <div className="flex flex-col gap-2.5 max-h-[210px] overflow-y-auto pr-1">
                          {data.questions.filter(q => q.campaign_id === editingCampaignId).sort((a, b) => a.display_order - b.display_order).map(q => (
                            <div key={q.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              {editingQuestionId === q.id ? (
                                <div className="flex flex-col gap-2 w-full p-1">
                                  <input
                                    value={editQText}
                                    onChange={e => setEditQText(e.target.value)}
                                    className="w-full min-h-[38px] rounded-lg px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-900"
                                    placeholder="Question text"
                                  />
                                  <select
                                    value={editQCat}
                                    onChange={e => setEditQCat(e.target.value)}
                                    className="w-full min-h-[38px] rounded-lg px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-900 font-medium cursor-pointer"
                                  >
                                    <option value="">— Select RDANA Category —</option>
                                    {RDANA_CATEGORY_OPTIONS.map(cat => (
                                      <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex items-center gap-2 justify-end mt-1">
                                    <button className="pill-btn ghost text-xs py-1 px-3" onClick={() => setEditingQuestionId(null)}>Cancel</button>
                                    <button
                                      className="pill-btn primary text-xs py-1 px-3"
                                      onClick={() => {
                                        if (editQText.trim() && editQCat.trim()) {
                                          updateQuestion(q.id, editQText.trim(), editQCat.trim())
                                          setEditingQuestionId(null)
                                          showToast('Question updated!')
                                        }
                                      }}
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="min-w-0 flex-1">
                                    <strong className="text-xs sm:text-sm font-bold text-slate-900 block truncate">{q.question_text}</strong>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getNeedCategoryMeta(q.need_category).color }} />
                                      <span className="text-[11px] text-slate-600 font-medium">
                                        Category: <span className="font-bold text-slate-800">{getNeedCategoryMeta(q.need_category).label}</span>
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button className="pill-btn ghost text-xs py-1 px-2.5" onClick={() => { setEditingQuestionId(q.id); setEditQText(q.question_text); setEditQCat(q.need_category) }}>Edit</button>
                                    <button className="pill-btn ghost text-xs py-1 px-2.5 text-red-600 hover:border-red-300" onClick={() => removeQuestion(q.id)}>Remove</button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                          {data.questions.filter(q => q.campaign_id === editingCampaignId).length === 0 && (
                            <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
                              <p className="text-xs text-slate-500 m-0">No questions added yet. Add the RDANA-style questions for this assessment below or copy from another historical scenario.</p>
                            </div>
                          )}
                        </div>

                        {/* Copy Questions Dropdown */}
                        {(() => {
                          const otherCamps = data.campaigns.filter(c => c.id !== editingCampaignId && data.questions.some(q => q.campaign_id === c.id))
                          return otherCamps.length > 0 ? (
                            <div className="flex items-center gap-2 pt-2.5 mt-2 border-t border-slate-100 w-full overflow-hidden">
                              <label htmlFor="copy-from" className="text-xs font-bold text-slate-700 whitespace-nowrap shrink-0">Copy from:</label>
                              <select id="copy-from" value={copyFromCampaignId} onChange={e => setCopyFromCampaignId(e.target.value)} className="h-8 rounded-lg px-2 text-xs border border-slate-200 bg-white text-slate-800 flex-1 min-w-0 w-0 truncate">
                                <option value="">— Select assessment —</option>
                                {otherCamps.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                              <button
                                className="pill-btn ghost text-xs py-1 px-3 whitespace-nowrap shrink-0"
                                onClick={() => {
                                  if (!copyFromCampaignId) return
                                  copyQuestions(copyFromCampaignId, editingCampaignId)
                                  setCopyFromCampaignId('')
                                  showToast('Questions copied!')
                                }}
                                disabled={!copyFromCampaignId}
                              >
                                Copy
                              </button>
                            </div>
                          ) : null
                        })()}
                      </div>

                      {/* Add Question Form at bottom */}
                      <form onSubmit={handleAddQuestion} className="flex flex-col gap-2 pt-3 mt-3 border-t border-slate-100 w-full overflow-hidden">
                        <span className="text-xs font-bold text-slate-800">Add Question</span>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_210px] gap-2 w-full">
                          <input
                            value={newQ}
                            onChange={e => setNewQ(e.target.value)}
                            placeholder="e.g. Does your household need food or clean drinking water?"
                            className="h-9 rounded-xl px-3 text-xs border border-slate-200 bg-white text-slate-900 w-full min-w-0"
                          />
                          <select
                            value={newCat}
                            onChange={e => setNewCat(e.target.value)}
                            className="h-9 rounded-xl px-2.5 text-xs border border-slate-200 bg-white text-slate-900 w-full min-w-0 font-medium cursor-pointer"
                            required
                          >
                            <option value="">— Select RDANA Category —</option>
                            {RDANA_CATEGORY_OPTIONS.map(cat => (
                              <option key={cat.value} value={cat.value}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button className="pill-btn ghost text-xs py-1.5 w-full font-bold justify-center" type="submit">
                          + Add Question to Set
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3 text-slate-400">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="12" y1="18" x2="12" y2="12"/>
                          <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 m-0">No Assessment Selected</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
                        Select one of the curated historical assessments below to configure its questions, or fill out the details form on the left to add another assessment.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Saved Assessments Section Card */}
            <div className="section-card mt-6 p-5 border border-slate-200 bg-white rounded-2xl shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 m-0">Saved Assessments</h3>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">Assessments are grouped by status so drafts stay at the top and older records stay out of the way.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    {data.campaigns.length} total
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                {viewableCampaigns.map(group => (
                  <div key={group.status} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 m-0">{group.label}</h4>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">{group.campaigns.length} {group.campaigns.length === 1 ? 'assessment' : 'assessments'}</p>
                      </div>
                    </div>

                    {group.campaigns.map(c => {
                      const isCurrentlyEditing = c.id === editingCampaignId
                      const qCount = data.questions.filter(q => q.campaign_id === c.id).length
                      return (
                        <div
                          key={c.id}
                          className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                            isCurrentlyEditing
                              ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-400/30 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="pt-0.5">
                              <span className={`status-chip ${c.status === 'active' ? 'good' : c.status === 'closed' ? 'warn' : 'open'}`}>
                                {c.status}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className="text-sm sm:text-base font-bold text-slate-900">{c.name}</strong>
                                {isCurrentlyEditing && (
                                  <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
                                    Editing Now
                                  </span>
                                )}
                                {c.ai_generated && (
                                  <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                                    AI Draft
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-medium m-0 mt-1">
                                {c.disaster_type} • Date: {c.disaster_date} • {qCount} {qCount === 1 ? 'question' : 'questions'} configured
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            {can(session.role, 'edit_questions') && (
                              <button
                                className={`pill-btn text-xs py-1.5 px-3.5 font-bold ${isCurrentlyEditing ? 'primary' : 'ghost'}`}
                                onClick={() => handleSelectEditCampaign(c)}
                              >
                                {isCurrentlyEditing ? 'Active in Editor' : 'Edit Assessment'}
                              </button>
                            )}
                            {can(session.role, 'publish_campaign') && c.status === 'draft' && (
                              <button className="pill-btn primary text-xs py-1.5 px-3.5 font-bold" onClick={() => confirmAction('publish', c.id)}>
                                Publish
                              </button>
                            )}
                            {c.status === 'active' && (
                              <button
                                className="pill-btn ghost text-xs py-1.5 px-3 font-semibold text-blue-600 hover:bg-blue-50"
                                onClick={() => { setSelectedCampaignId(c.id); navigate('dashboard'); }}
                              >
                                View Live Results
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {sidebarTab === 'developers' && (
          <>
            <h2 style={{ margin: '0 0 4px', fontSize: 'clamp(20px, 4vw, 28px)', letterSpacing: '-0.04em' }}>Developer applications</h2>
            <p style={{ color: '#556075', lineHeight: 1.45, fontSize: '14px' }}>Review external access requests for Barangay {profile.barangay_code} and decide whether to grant developer access.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 mb-4">
              <div className="section-card p-[18px]" style={{ border: '1px solid var(--line)', background: '#fff' }}>
                <strong style={{ display: 'block', fontSize: 'clamp(26px, 5vw, 36px)', color: 'var(--blue-2)', letterSpacing: '-0.05em' }}>{visibleDeveloperApplications.length}</strong>
                <span style={{ color: 'var(--muted-text)', fontWeight: 700, fontSize: '14px' }}>Applications</span>
              </div>
              <div className="section-card p-[18px]" style={{ border: '1px solid var(--line)', background: '#fff' }}>
                <strong style={{ display: 'block', fontSize: 'clamp(26px, 5vw, 36px)', color: 'var(--warn)', letterSpacing: '-0.05em' }}>{pendingDeveloperApplications.length}</strong>
                <span style={{ color: 'var(--muted-text)', fontWeight: 700, fontSize: '14px' }}>Pending</span>
              </div>
              <div className="section-card p-[18px]" style={{ border: '1px solid var(--line)', background: '#fff' }}>
                <strong style={{ display: 'block', fontSize: 'clamp(26px, 5vw, 36px)', color: 'var(--good)', letterSpacing: '-0.05em' }}>{visibleDeveloperApplications.filter(application => application.status === 'accepted').length}</strong>
                <span style={{ color: 'var(--muted-text)', fontWeight: 700, fontSize: '14px' }}>Accepted</span>
              </div>
            </div>

            <div className="section-card">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4" style={{ borderBottom: '1px solid #edf1f8' }}>
                <div>
                  <h3 style={{ margin: 0, padding: 0, borderBottom: 'none' }}>Application queue</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted-text)', fontSize: '13px' }}>Saved in local browser storage for the demo flow.</p>
                </div>
                <span className={`status-chip ${pendingDeveloperApplications.length > 0 ? 'open' : 'good'}`}>
                  {pendingDeveloperApplications.length} pending
                </span>
              </div>
              <div className="p-4">
                {visibleDeveloperApplications.length === 0 ? (
                  <div className="empty-state-box text-center">
                    <p style={{ color: '#556075', fontSize: '14px', margin: 0 }}>No developer applications for this barangay yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {visibleDeveloperApplications.map(application => (
                      <div key={application.id} className="rounded-[18px] p-4" style={{ border: '1px solid #edf1f8', background: '#fff' }}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>{application.applicant_name}</strong>
                              <span className={`status-chip ${application.status === 'accepted' ? 'good' : application.status === 'rejected' ? 'danger' : 'open'}`}>
                                {application.status}
                              </span>
                            </div>
                            <p style={{ margin: '6px 0 0', color: 'var(--muted-text)', fontSize: '13px' }}>{application.organization} • {application.email}</p>
                            <p style={{ margin: '6px 0 0', color: '#42506a', fontSize: '13px', lineHeight: 1.5 }}>{application.use_case}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <button className="pill-btn ghost" style={{ fontSize: '12px', padding: '8px 12px' }} onClick={() => setSelectedDeveloperApplicationId(application.id)}>Read</button>
                            <button
                              className="pill-btn primary"
                              style={{ fontSize: '12px', padding: '8px 12px', opacity: application.status === 'accepted' ? 0.55 : 1 }}
                              onClick={() => updateDeveloperApplicationStatus(application.id, 'accepted')}
                              disabled={application.status === 'accepted'}
                            >
                              Accept
                            </button>
                            <button
                              className="pill-btn danger"
                              style={{ fontSize: '12px', padding: '8px 12px', opacity: application.status === 'rejected' ? 0.55 : 1 }}
                              onClick={() => updateDeveloperApplicationStatus(application.id, 'rejected')}
                              disabled={application.status === 'rejected'}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <nav className="bottom-toolbar md:hidden">
          <button className={`toolbar-tab ${sidebarTab === 'dashboard' ? 'active' : ''}`} onClick={() => navigate('dashboard')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>Dashboard</span>
          </button>
          <button className={`toolbar-tab ${sidebarTab === 'campaigns' ? 'active' : ''}`} onClick={() => navigate('campaigns')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="22" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
            <span>Assessments</span>
          </button>
          <button className={`toolbar-tab ${sidebarTab === 'developers' ? 'active' : ''}`} onClick={() => navigate('developers')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <path d="M20 8v6" />
              <path d="M23 11h-6" />
            </svg>
            <span>Developers</span>
          </button>
        </nav>
      </Shell>

      {selectedRow && (
        <div className="modal-overlay" onClick={() => setSelectedRow(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2>Case detail</h2>
              <button className="pill-btn ghost" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setSelectedRow(null)}>Close</button>
            </div>
            <div className="mb-4">
              {(() => {
                const { maskedName, residentKey } = formatAnonymizedIdentity(selectedRow.checkIn.name, selectedRow.checkIn.id)
                return (
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{maskedName}</p>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontWeight: 600 }}>
                      {residentKey}
                    </span>
                  </div>
                )
              })()}
              <p style={{ fontSize: '13px', color: 'var(--muted-text)' }}>Submitted by: {formatSubmittedBy(selectedRow.checkIn.submitted_by)}</p>
              <p style={{ fontSize: '13px', color: 'var(--muted-text)' }}>{new Date(selectedRow.checkIn.created_at).toLocaleString()}</p>
            </div>
            {can(session.role, 'update_case') && selectedCampaign?.status === 'active' && (
              <div className="mb-4">
                <label className="block mb-2" style={{ fontWeight: 800, fontSize: '14px', color: '#313a4c' }}>Status</label>
                <select value={modalStatus} onChange={e => setModalStatus(e.target.value as CheckInStatus)} className="w-full min-h-[48px] rounded-2xl px-3 py-3 text-sm" style={{ border: '1px solid #cdd8ed', background: '#fff', color: 'var(--ink)' }}>
                  <option value="unresolved">Unresolved</option>
                  <option value="visited">Visited</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            )}
            {selectedRow.answers.length > 0 && (
              <div className="mb-4">
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted-text)', marginBottom: '4px' }}>Answers</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {selectedRow.answers.map(a => {
                    const q = data.questions.find(q => q.id === a.question_id)
                    return (
                      <li key={a.id} className="text-sm py-1" style={{ borderBottom: '1px solid #edf1f8' }}>
                        {q?.question_text ?? 'Unknown'}: <span style={{ color: a.answer === 'yes' ? 'var(--red)' : 'var(--muted-text)', fontWeight: 600 }}>{a.answer}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            <div className="flex gap-3">
              {can(session.role, 'update_case') && selectedCampaign?.status === 'active' && (
                <button className="big-btn primary" onClick={handleSaveStatus}>Save</button>
              )}
              <button className="big-btn ghost" onClick={() => setSelectedRow(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {manualEntryOpen && selectedCampaign && (
        <div className="modal-overlay" onClick={() => setManualEntryOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2>Manual resident entry</h2>
              <button className="pill-btn ghost" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => { setManualEntryOpen(false); setManualName('') }}>Close</button>
            </div>
            <p style={{ color: '#5e687b', fontSize: '13px', marginBottom: '12px' }}>For offline field deployment when a resident cannot use the app.</p>

            <div className="mb-4">
              <label htmlFor="manual-name" className="block mb-2" style={{ fontWeight: 800, fontSize: '14px', color: '#313a4c' }}>Name</label>
              <input
                id="manual-name"
                type="text"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="Enter resident name..."
                className="w-full min-h-[48px] rounded-2xl px-3 py-3 text-sm"
                style={{ border: '1px solid #cdd8ed', background: '#fff', color: 'var(--ink)' }}
              />
            </div>

            <div className="mb-4">
              <p className="mb-2" style={{ fontWeight: 800, fontSize: '14px', color: '#313a4c' }}>Reported needs</p>
              <div className="flex flex-col gap-3">
                {data.questions.filter(q => q.campaign_id === selectedCampaign.id).sort((a, b) => a.display_order - b.display_order).map(q => (
                  <button
                    key={q.id}
                    type="button"
                    className={`w-full text-left flex justify-between items-center gap-3 p-4 rounded-[18px] border ${manualAnswers[q.id] === 'yes' ? 'border-[var(--blue-primary)] shadow-[0_0_0_3px_rgba(0,64,231,0.1)]' : ''}`}
                    style={{ background: '#fff', borderColor: manualAnswers[q.id] === 'yes' ? undefined : '#d8e2f6' }}
                    onClick={() => setManualAnswers(prev => ({ ...prev, [q.id]: prev[q.id] === 'yes' ? 'no' : 'yes' }))}
                  >
                    <span>
                      <strong style={{ display: 'block', fontSize: '14px' }}>{q.question_text}</strong>
                      <span style={{ display: 'block', marginTop: '3px', color: '#667085', fontSize: '13px' }}>{getNeedCategoryMeta(q.need_category).label}</span>
                    </span>
                    <strong style={{ fontSize: '14px', color: manualAnswers[q.id] === 'yes' ? 'var(--blue)' : '#667085' }}>
                      {manualAnswers[q.id] === 'yes' ? 'Yes' : 'No'}
                    </strong>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button className="big-btn primary" onClick={handleManualSubmit} disabled={!manualName} style={!manualName ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>Submit entry</button>
              <button className="big-btn ghost" onClick={() => { setManualEntryOpen(false); setManualName('') }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <div className="modal-overlay" onClick={() => setPendingAction(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2>Confirm {pendingAction.type === 'publish' ? 'publish' : pendingAction.type === 'close' ? 'close' : 'archive'}</h2>
            </div>
            {pendingAction.type === 'publish' && (
              <div className="mb-4">
                <p style={{ color: '#4b5568', lineHeight: 1.5, fontSize: '14px' }}>
                  This will open the assessment for check-ins. Any other active assessment will be automatically closed.
                  Residents will see this assessment as the active check-in prompt.
                </p>
                <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-xs leading-5 text-blue-900">
                  This publish action is connected to eGovPH eSMS and third-party Telegram notifications so residents can receive the assessment and submit their household report through the channel available to them.
                </div>
                </div>
            )}
            {pendingAction.type === 'close' && (
              <div className="mb-4">
                <p style={{ color: '#4b5568', lineHeight: 1.5, fontSize: '14px' }}>
                  Closing stops new check-ins. Existing data remains viewable and exportable.
                  You can still archive this assessment later, but residents will no longer be able to submit reports.
                </p>
              </div>
            )}
            {pendingAction.type === 'archive' && (
              <div className="mb-4">
                <p style={{ color: '#4b5568', lineHeight: 1.5, fontSize: '14px' }}>
                  Archiving removes the assessment from the active view. All check-in data is preserved
                  but the assessment will be in read-only mode. This cannot be undone from the dashboard.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button className={`big-btn ${pendingAction.type === 'archive' ? 'danger' : 'primary'}`} onClick={handleConfirmAction} disabled={dispatching}>
                {dispatching ? 'Publishing and notifying...' : pendingAction.type === 'publish' ? 'Publish assessment' : pendingAction.type === 'close' ? 'Close assessment' : 'Archive assessment'}
              </button>
              <button className="big-btn ghost" onClick={() => setPendingAction(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {selectedDeveloperApplication && (
        <div className="modal-overlay" onClick={() => setSelectedDeveloperApplicationId(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2>Developer application</h2>
              <button className="pill-btn ghost" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setSelectedDeveloperApplicationId(null)}>Close</button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong style={{ fontSize: '16px', color: 'var(--ink)' }}>{selectedDeveloperApplication.applicant_name}</strong>
                  <span className={`status-chip ${selectedDeveloperApplication.status === 'accepted' ? 'good' : selectedDeveloperApplication.status === 'rejected' ? 'danger' : 'open'}`}>
                    {selectedDeveloperApplication.status}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', color: 'var(--muted-text)', fontSize: '13px' }}>{selectedDeveloperApplication.organization}</p>
              </div>

              <div className="rounded-[16px] p-4" style={{ background: '#f8faff', border: '1px solid var(--line)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#42506a' }}><strong>Email:</strong> {selectedDeveloperApplication.email}</p>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#42506a' }}><strong>Barangay:</strong> {selectedDeveloperApplication.barangay_code}</p>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#42506a' }}><strong>Submitted:</strong> {new Date(selectedDeveloperApplication.submitted_at).toLocaleString()}</p>
              </div>

              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>Use case</p>
                <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#556075', lineHeight: 1.55 }}>{selectedDeveloperApplication.use_case}</p>
              </div>

              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>Requested endpoints</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedDeveloperApplication.requested_endpoints.map(endpoint => (
                    <code key={endpoint} style={{ padding: '6px 10px', borderRadius: '999px', background: '#eef2ff', color: '#42506a', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>{endpoint}</code>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                className="big-btn primary"
                onClick={() => updateDeveloperApplicationStatus(selectedDeveloperApplication.id, 'accepted')}
                disabled={selectedDeveloperApplication.status === 'accepted'}
                style={selectedDeveloperApplication.status === 'accepted' ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
              >
                Accept
              </button>
              <button
                className="big-btn danger"
                onClick={() => updateDeveloperApplicationStatus(selectedDeveloperApplication.id, 'rejected')}
                disabled={selectedDeveloperApplication.status === 'rejected'}
                style={selectedDeveloperApplication.status === 'rejected' ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
              >
                Reject
              </button>
              <button className="big-btn ghost" onClick={() => setSelectedDeveloperApplicationId(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="toast-bar left-4 right-4 md:left-auto md:right-6 md:max-w-[360px]">
          {toastMsg}
        </div>
      )}
    </>
  )
}
