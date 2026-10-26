import { useState, useCallback, useEffect } from 'react'
import * as supabaseDb from './supabase'
import type { Alert } from '@/features/alerts/types'

export type CampaignStatus = 'draft' | 'active' | 'closed' | 'archived'
export type CheckInStatus = 'unresolved' | 'visited' | 'resolved'

export type Campaign = {
  id: string
  name: string
  disaster_type: string
  disaster_date: string
  status: CampaignStatus
  created_by: string
  barangay_code: string
  alert_id: string | null
  ai_generated: boolean
  created_at: string
  updated_at: string
}

export type CampaignQuestion = {
  id: string
  campaign_id: string
  question_text: string
  need_category: string
  display_order: number
}

export type CheckIn = {
  id: string
  campaign_id: string
  name: string
  submitted_by: string
  status: CheckInStatus
  created_at: string
  updated_at: string
}

export type CheckInAnswer = {
  id: string
  check_in_id: string
  question_id: string
  answer: string
}

export type OfficialRole = 'official' | 'resident'

export type Permission =
  | 'create_campaign'
  | 'edit_questions'
  | 'publish_campaign'
  | 'close_campaign'
  | 'archive_campaign'
  | 'manual_entry'
  | 'update_case'
  | 'export_csv'
  | 'view_dashboard'
  | 'respond_to_disaster'

const ROLE_PERMISSIONS: Record<OfficialRole, Permission[]> = {
  official: [
    'create_campaign',
    'edit_questions',
    'publish_campaign',
    'close_campaign',
    'archive_campaign',
    'manual_entry',
    'update_case',
    'export_csv',
    'view_dashboard',
  ],
  resident: ['view_dashboard', 'respond_to_disaster'],
}

export function can(role: OfficialRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export type DashboardRow = {
  checkIn: CheckIn
  answers: CheckInAnswer[]
}

export type Dashboard = {
  affectedCount: number
  unresolvedCount: number
  needBreakdown: Record<string, number>
  rows: DashboardRow[]
}

export type { Alert }

export type HandaData = {
  campaigns: Campaign[]
  questions: CampaignQuestion[]
  checkIns: CheckIn[]
  answers: CheckInAnswer[]
  alerts: Alert[]
}

const emptyData: HandaData = {
  campaigns: [],
  questions: [],
  checkIns: [],
  answers: [],
  alerts: [],
}

function formatSubmittedBy(submittedBy: string): string {
  return submittedBy.includes('(manual)') ? submittedBy : 'Self Report'
}

function uid(): string {
  return crypto.randomUUID()
}

export function useHandaStore() {
  const [data, setData] = useState<HandaData>(emptyData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabaseDb.loadAll().then(remote => {
      if (remote) setData(remote)
      setLoading(false)
    })

    const intervalId = window.setInterval(() => {
      supabaseDb.loadAll().then(remote => {
        if (remote) setData(remote)
      })
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [])

  const createCampaign = useCallback(async (input: { name: string; disaster_type: string; disaster_date: string; created_by: string; barangay_code: string; alert_id?: string; ai_generated?: boolean }) => {
    const c: Campaign = {
      id: uid(),
      name: input.name,
      disaster_type: input.disaster_type,
      disaster_date: input.disaster_date,
      status: 'draft',
      created_by: input.created_by,
      barangay_code: input.barangay_code,
      alert_id: input.alert_id ?? null,
      ai_generated: input.ai_generated ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setData(d => ({ ...d, campaigns: [...d.campaigns, c] }))
    await supabaseDb.insertCampaign(c)
    return c
  }, [])

  const saveCampaign = useCallback(async (id: string, input: { name: string; disaster_type: string; disaster_date: string }) => {
    setData(d => ({
      ...d,
      campaigns: d.campaigns.map(c =>
        c.id === id ? { ...c, ...input, updated_at: new Date().toISOString() } : c
      ),
    }))
    await supabaseDb.updateCampaignDb(id, input)
  }, [])

  const addQuestion = useCallback((campaignId: string, question_text: string, need_category: string) => {
    const order = data.questions.filter(q => q.campaign_id === campaignId).length
    const q: CampaignQuestion = { id: uid(), campaign_id: campaignId, question_text, need_category, display_order: order }
    setData(d => ({ ...d, questions: [...d.questions, q] }))
    supabaseDb.insertQuestion(q)
  }, [data])

  const removeQuestion = useCallback((questionId: string) => {
    setData(d => ({ ...d, questions: d.questions.filter(q => q.id !== questionId) }))
    supabaseDb.deleteQuestion(questionId)
  }, [])

  const updateCampaignStatus = useCallback(async (campaignId: string, status: CampaignStatus) => {
    setData(d => ({
      ...d,
      campaigns: d.campaigns.map(c => {
        if (c.id === campaignId) return { ...c, status, updated_at: new Date().toISOString() }
        if (status === 'active' && c.status === 'active') return { ...c, status: 'closed' as CampaignStatus, updated_at: new Date().toISOString() }
        return c
      }),
    }))
    await supabaseDb.updateCampaignStatusDb(campaignId, status)
    if (status === 'active') await supabaseDb.deactivateOtherCampaigns(campaignId)
  }, [])

  const getDashboard = useCallback((campaignId: string): Dashboard => {
    const campaign = data.campaigns.find(c => c.id === campaignId)
    if (!campaign) return { affectedCount: 0, unresolvedCount: 0, needBreakdown: {}, rows: [] }

    const checkIns = data.checkIns.filter(ci => ci.campaign_id === campaignId)
    const rows: DashboardRow[] = checkIns.map(ci => ({
      checkIn: ci,
      answers: data.answers.filter(a => a.check_in_id === ci.id),
    }))

    const unresolved = rows.filter(r => r.checkIn.status === 'unresolved')
    const needBreakdown: Record<string, number> = {}
    for (const r of rows) {
      for (const a of r.answers) {
        if (a.answer === 'yes') {
          const q = data.questions.find(q => q.id === a.question_id)
          if (q) needBreakdown[q.need_category] = (needBreakdown[q.need_category] ?? 0) + 1
        }
      }
    }

    return {
      affectedCount: rows.length,
      unresolvedCount: unresolved.length,
      needBreakdown,
      rows,
    }
  }, [data])

  const updateCaseStatus = useCallback(async (checkInId: string, status: CheckInStatus) => {
    setData(d => ({
      ...d,
      checkIns: d.checkIns.map(ci => ci.id === checkInId ? { ...ci, status, updated_at: new Date().toISOString() } : ci),
    }))
    await supabaseDb.updateCaseStatusDb(checkInId, status)
  }, [])

  const submitCheckIn = useCallback(async (input: { campaign_id: string; name: string; submitted_by: string; answers: { question_id: string; answer: string }[] }) => {
    const ci: CheckIn = {
      id: uid(),
      campaign_id: input.campaign_id,
      name: input.name,
      submitted_by: input.submitted_by,
      status: 'unresolved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const ans: CheckInAnswer[] = input.answers.map(a => ({
      id: uid(),
      check_in_id: ci.id,
      question_id: a.question_id,
      answer: a.answer,
    }))
    setData(d => ({ ...d, checkIns: [...d.checkIns, ci], answers: [...d.answers, ...ans] }))
    await supabaseDb.insertCheckInDb(ci)
    await supabaseDb.insertAnswersDb(ans)
    return ci
  }, [])

  const exportCsv = useCallback((campaignId: string): string => {
    const checkIns = data.checkIns.filter(ci => ci.campaign_id === campaignId)
    if (checkIns.length === 0) return ''

    function esc(s: string): string {
      return s.includes('"') || s.includes(',') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }

    const rows = checkIns.map(ci => {
      const answers = data.answers.filter(a => a.check_in_id === ci.id)
      const needs = answers
        .filter(a => a.answer === 'yes')
        .map(a => data.questions.find(q => q.id === a.question_id)?.need_category ?? '')
        .filter(Boolean)
        .join('; ')
      return [esc(ci.name), esc(needs), ci.status, esc(formatSubmittedBy(ci.submitted_by)), ci.created_at].join(',')
    })

    return `Name,Needs,Status,Submitted By,Created At\n${rows.join('\n')}`
  }, [data])

  const copyQuestions = useCallback((sourceCampaignId: string, targetCampaignId: string) => {
    const source = data.questions.filter(q => q.campaign_id === sourceCampaignId)
    if (source.length === 0) return
    const existingOrder = data.questions.filter(q => q.campaign_id === targetCampaignId).length
    const copies = source.map((q, i) => ({
      id: uid(),
      campaign_id: targetCampaignId,
      question_text: q.question_text,
      need_category: q.need_category,
      display_order: existingOrder + i,
    }))
    setData(d => ({ ...d, questions: [...d.questions, ...copies] }))
    supabaseDb.insertQuestions(copies)
  }, [data])

  const addAlert = useCallback((alert: Alert) => {
    setData(d => ({ ...d, alerts: [...d.alerts, alert] }))
    supabaseDb.insertAlert(alert)
  }, [])

  const linkAlertToCampaign = useCallback((alertId: string, campaignId: string) => {
    setData(d => ({
      ...d,
      alerts: d.alerts.map(a => a.id === alertId ? { ...a, campaign_id: campaignId } : a),
    }))
  }, [])

  return {
    loading,
    data,
    createCampaign,
    saveCampaign,
    addQuestion,
    removeQuestion,
    updateCampaignStatus,
    updateCaseStatus,
    submitCheckIn,
    getDashboard,
    exportCsv,
    copyQuestions,
    addAlert,
    linkAlertToCampaign,
  }
}
