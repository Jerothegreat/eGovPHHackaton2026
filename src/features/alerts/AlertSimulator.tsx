/**
 * AlertSimulator — Demo component for Layer 1 testing
 *
 * Simulates PAGASA/NDRRMC/PHIVOLCS CAP webhook payloads
 * to demonstrate the full Layer 1 pipeline:
 *   Alert → Parse → Threshold → AI Draft → Dashboard Banner
 *
 * Used during hackathon demos — not for production.
 */

import { useState } from 'react'
import { processInboundAlert, getPresetScenarios } from './alert-service'
import type { AlertIngestionResult } from './alert-service'

interface AlertSimulatorProps {
  onAlertProcessed: (result: AlertIngestionResult) => void
  barangayCode: string
}

export function AlertSimulator({ onAlertProcessed, barangayCode }: AlertSimulatorProps) {
  const [processing, setProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<AlertIngestionResult | null>(null)
  const [expanded, setExpanded] = useState(false)

  const scenarios = getPresetScenarios()

  async function handleSimulate(payload: Record<string, unknown>) {
    setProcessing(true)
    try {
      const result = await processInboundAlert(payload)
      setLastResult(result)
      onAlertProcessed(result)
    } catch (err) {
      console.error('[AlertSimulator] Error:', err)
    } finally {
      setProcessing(false)
    }
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'Extreme': return '#dc2626'
      case 'Severe': return '#ea580c'
      case 'Moderate': return '#d97706'
      case 'Minor': return '#65a30d'
      default: return '#6b7280'
    }
  }

  const renderScenarioIcon = (id: string) => {
    if (id.includes('fire')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/>
        </svg>
      )
    }
    if (id.includes('typhoon') || id.includes('maymay')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
          <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
          <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
        </svg>
      )
    }
    if (id.includes('flood') || id.includes('habagat') || id.includes('rain') || id.includes('dolphin')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
          <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
          <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
        </svg>
      )
    }
    if (id.includes('earthquake') || id.includes('maasim')) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      )
    }
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    )
  }

  return (
    <div
      className="section-card mb-4"
      style={{
        border: '1px solid #fcd34d',
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        padding: expanded ? '20px' : '14px 20px',
        borderRadius: '14px',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
            <circle cx="12" cy="12" r="2"/>
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
            <path d="M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2"/>
          </svg>
          <strong style={{ fontSize: '14px', color: '#92400e' }}>
            PAGASA Alert Simulator
          </strong>
          <span
            style={{
              fontSize: '11px',
              background: '#fbbf24',
              color: '#78350f',
              padding: '2px 8px',
              borderRadius: '999px',
              fontWeight: 700,
            }}
          >
            DEV
          </span>
        </div>
        <button
          className="pill-btn ghost"
          style={{ fontSize: '12px', padding: '4px 10px', color: '#92400e' }}
          onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '16px' }}>
          <p style={{ fontSize: '13px', color: '#78350f', marginBottom: '12px', lineHeight: 1.5 }}>
            Simulate a national weather alert to trigger the Layer 1 pipeline.
            Each scenario sends a CAP-format payload through: Parse → PSGC Map → Threshold Check → AI Auto-Draft.
          </p>

          <div className="flex flex-col gap-2">
            {scenarios.map(scenario => (
              <button
                key={scenario.id}
                className="w-full text-left flex items-center gap-3 p-3 rounded-[14px]"
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  opacity: processing ? 0.6 : 1,
                  cursor: processing ? 'wait' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
                disabled={processing}
                onClick={() => handleSimulate(scenario.payload)}
                onMouseEnter={e => { if (!processing) (e.currentTarget as HTMLButtonElement).style.borderColor = '#d97706' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb' }}
              >
                <div className="flex items-center justify-center p-2 rounded-lg bg-amber-50 shrink-0">
                  {renderScenarioIcon(scenario.id)}
                </div>
                <div>
                  <strong style={{ fontSize: '14px', display: 'block' }}>{scenario.name}</strong>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{scenario.description}</span>
                </div>
              </button>
            ))}
          </div>

          {processing && (
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <div className="skeleton-bar" style={{ width: '100%', height: '4px', borderRadius: '2px' }} />
              <p style={{ fontSize: '12px', color: '#92400e', marginTop: '6px' }}>
                Processing alert through Layer 1 pipeline...
              </p>
            </div>
          )}

          {lastResult && !processing && (
            <div
              style={{
                marginTop: '16px',
                padding: '14px',
                background: lastResult.threshold.met ? '#f0fdf4' : '#fef2f2',
                borderRadius: '12px',
                border: `1px solid ${lastResult.threshold.met ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                {lastResult.threshold.met ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                )}
                <strong style={{ fontSize: '14px' }}>
                  Threshold {lastResult.threshold.met ? 'MET' : 'NOT MET'}
                </strong>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontWeight: 700,
                    background: severityColor(lastResult.alert.severity),
                    color: '#fff',
                    marginLeft: 'auto',
                  }}
                >
                  Score: {lastResult.threshold.severity_score}/100
                </span>
              </div>

              <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5, margin: '0 0 8px' }}>
                {lastResult.threshold.reason}
              </p>

              {lastResult.draft && (
                <div style={{ marginTop: '8px', borderTop: '1px solid #bbf7d0', paddingTop: '8px' }}>
                  <strong style={{ fontSize: '13px', color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                    </svg>
                    AI Draft Generated: "{lastResult.draft.campaign_name}"
                  </strong>
                  <p style={{ fontSize: '12px', color: '#374151', margin: '4px 0' }}>
                    {lastResult.draft.questions.length} RDANA-grounded questions ready for review
                  </p>
                </div>
              )}
            </div>
          )}

          <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '10px', textAlign: 'center' }}>
            Target Barangay: {barangayCode} • Layer 1 Invariant: Zero push notifications sent
          </p>
        </div>
      )}
    </div>
  )
}
