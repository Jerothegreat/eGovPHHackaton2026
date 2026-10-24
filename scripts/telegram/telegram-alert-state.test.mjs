import { describe, expect, it } from 'vitest'
import {
  campaignFromAlertMessage,
  draftBelongsToMessage,
  questionsFromAlertMessage,
} from './telegram-alert-state.mjs'

const alertMessage = [
  '🚨 *[eHANDA OFFICIAL EMERGENCY ALERT]*',
  '*Tropical Cyclone Wind Signal – Tropical Depression Maymay (Kujira) — Assessment published Aug 6, 2026*',
  '*Area:* Poblacion, City Of Alaminos',
  '',
  '• Q1: Is your home structurally damaged?',
  '• Q2: Is your family short on food supply (less than 3 days)?',
].join('\n')

describe('Telegram alert state', () => {
  it('resets a draft when the callback belongs to a newer alert message', () => {
    expect(draftBelongsToMessage({ messageId: 100 }, 100)).toBe(true)
    expect(draftBelongsToMessage({ messageId: 100 }, 200)).toBe(false)
  })

  it('reads dynamic questions from the exact alert message', () => {
    expect(questionsFromAlertMessage(alertMessage)).toEqual([
      { question_text: 'Is your home structurally damaged?', need_category: 'assessment' },
      { question_text: 'Is your family short on food supply (less than 3 days)?', need_category: 'assessment' },
    ])
  })

  it('uses the alert message campaign and location for confirmation', () => {
    expect(campaignFromAlertMessage(alertMessage, {
      campaignName: 'Old Earthquake Assessment',
      barangay: 'Old Barangay',
      municipality: 'Old Municipality',
    })).toEqual({
      campaignName: 'Tropical Cyclone Wind Signal – Tropical Depression Maymay (Kujira)',
      barangay: 'Poblacion',
      municipality: 'City Of Alaminos',
    })
  })

  it('uses campaign metadata when Telegram removes Markdown markers', () => {
    const plainTextAlert = alertMessage.replaceAll('*', '')

    expect(campaignFromAlertMessage(plainTextAlert, {
      campaignName: 'Old Earthquake Assessment',
      barangay: 'Old Barangay',
      municipality: 'Old Municipality',
    })).toEqual({
      campaignName: 'Tropical Cyclone Wind Signal – Tropical Depression Maymay (Kujira)',
      barangay: 'Poblacion',
      municipality: 'City Of Alaminos',
    })
  })
})
