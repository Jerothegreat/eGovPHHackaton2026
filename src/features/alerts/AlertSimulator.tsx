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

  return (
    <div
      className="section-card mb-4"
      style={{
        border: '2px dashed #d97706',
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        padding: expanded ? '20px' : '14px 20px',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '18px' }}>🛰️</span>
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
                <span style={{ fontSize: '24px' }}>
                  {scenario.id.includes('typhoon') ? '🌀' :
                   scenario.id.includes('rain') ? '🌧️' :
                   scenario.id.includes('flood') ? '🌊' :
                   scenario.id.includes('earthquake') ? '🏚️' : '⚠️'}
                </span>
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
                <span style={{ fontSize: '16px' }}>{lastResult.threshold.met ? '✅' : '⛔'}</span>
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
                  }}
                >
                  Score: {lastResult.threshold.severity_score}/100
                </span>
              </div>

              <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5, margin: '0 0 8px' }}>
                {lastResult.threshold.reason}
              </p>

              {lastResult.draft && (
                <div style={{ marginTop: '8px' }}>
                  <strong style={{ fontSize: '13px', color: '#166534' }}>
                    ✨ AI Draft Generated: "{lastResult.draft.campaign_name}"
                  </strong>
                  <p style={{ fontSize: '12px', color: '#374151', margin: '4px 0' }}>
                    {lastResult.draft.questions.length} RDANA-grounded questions ready for review
                  </p>
                  <div className="flex flex-col gap-1" style={{ marginTop: '6px' }}>
                    {lastResult.draft.questions.map((q, i) => (
                      <div key={i} style={{ fontSize: '12px', color: '#4b5563', display: 'flex', gap: '6px' }}>
                        <span style={{ color: '#9ca3af' }}>{i + 1}.</span>
                        <span>{q.question_text}</span>
                        <span style={{
                          fontSize: '10px',
                          background: '#e0e7ff',
                          color: '#3730a3',
                          padding: '1px 6px',
                          borderRadius: '999px',
                          flexShrink: 0,
                        }}>
                          {q.need_category}
                        </span>
                      </div>
                    ))}
                  </div>
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
