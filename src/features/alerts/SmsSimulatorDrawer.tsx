import { useState } from 'react'
import { processInboundAlert, getPresetScenarios } from './alert-service'
import type { AlertIngestionResult } from './alert-service'

interface SmsSimulatorDrawerProps {
  onAlertProcessed: (result: AlertIngestionResult) => void
  barangayCode: string
}

export function SmsSimulatorDrawer({ onAlertProcessed, barangayCode }: SmsSimulatorDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<AlertIngestionResult | null>(null)
  const [customText, setCustomText] = useState('')
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets')

  const scenarios = getPresetScenarios()

  async function handleSimulatePayload(payload: Record<string, unknown>) {
    setProcessing(true)
    try {
      const result = await processInboundAlert(payload)
      setLastResult(result)
      onAlertProcessed(result)
    } catch (err) {
      console.error('[SimulatorDrawer] Error:', err)
    } finally {
      setProcessing(false)
    }
  }

  async function handleSimulateCustom(e: React.FormEvent) {
    e.preventDefault()
    if (!customText.trim()) return

    const lower = customText.toLowerCase()
    const eventType = lower.includes('rain') ? 'Heavy Rainfall'
      : lower.includes('flood') ? 'Flood Warning'
      : lower.includes('earthquake') ? 'Earthquake'
      : lower.includes('fire') ? 'Structural Fire'
      : 'Typhoon'

    const severity = (lower.includes('severe') || lower.includes('rescue') || lower.includes('emergency') || lower.includes('trapped')) ? 'Severe' : 'Moderate'

    const capPayload = {
      identifier: 'SMS-PUSH-' + Date.now(),
      sender: 'NDRRMC-PAGASA-SMS',
      sent: new Date().toISOString(),
      status: 'Actual',
      msgType: 'Alert',
      scope: 'Public',
      info: {
        event: eventType,
        urgency: 'Immediate',
        severity: severity,
        certainty: 'Observed',
        headline: customText.length > 50 ? customText.slice(0, 50) + '...' : customText,
        description: customText,
        effective: new Date().toISOString(),
        area: [{ areaDesc: `Barangay ${barangayCode}` }]
      }
    }

    await handleSimulatePayload(capPayload)
    setCustomText('')
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
    <>
      {/* Sliding Drawer Toggle Button */}
      <div 
        style={{
          position: 'fixed',
          right: isOpen ? 'min(360px, 100vw)' : '0px',
          bottom: '24px',
          transition: 'right 0.3s ease-in-out',
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: 'linear-gradient(135deg, #d97706, #b45309)',
            color: '#fff',
            border: 'none',
            padding: '10px 14px',
            borderRadius: '12px 0 0 12px',
            cursor: 'pointer',
            boxShadow: '-4px 4px 15px rgba(217, 119, 6, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 700,
            fontSize: '13px'
          }}
        >
          {isOpen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          )}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
            <circle cx="12" cy="12" r="2"/>
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
            <path d="M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2"/>
          </svg>
          <span>SMS / Alert Simulator</span>
        </button>
      </div>

      {/* The Drawer */}
      <div 
        style={{
          position: 'fixed',
          right: isOpen ? '0px' : '-100vw',
          top: 0,
          bottom: 0,
          width: 'min(360px, 100vw)',
          maxWidth: '100vw',
          background: '#fff',
          boxShadow: '-6px 0 20px rgba(0,0,0,0.15)',
          zIndex: 999,
          transition: 'right 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #e5e7eb'
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
                <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
                <circle cx="12" cy="12" r="2"/>
                <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
                <path d="M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2"/>
              </svg>
              <strong style={{ fontSize: '16px', color: '#92400e' }}>
                PAGASA / NDRRMC Simulator
              </strong>
              <span
                style={{
                  fontSize: '10px',
                  background: '#fbbf24',
                  color: '#78350f',
                  padding: '2px 6px',
                  borderRadius: '999px',
                  fontWeight: 700,
                }}
              >
                DEV
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#92400e', display: 'flex', alignItems: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#78350f', lineHeight: 1.45 }}>
            Simulate incoming PAGASA/NDRRMC push notifications or SMS alerts to generate RDANA draft assessments on the dashboard.
          </p>

          {/* Mode Switcher */}
          <div className="flex gap-2 mt-3">
            <button
              className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
              style={{
                background: activeTab === 'presets' ? '#d97706' : '#fff',
                color: activeTab === 'presets' ? '#fff' : '#78350f',
                border: '1px solid #d97706'
              }}
              onClick={() => setActiveTab('presets')}
            >
              CAP Scenarios
            </button>
            <button
              className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
              style={{
                background: activeTab === 'custom' ? '#d97706' : '#fff',
                color: activeTab === 'custom' ? '#fff' : '#78350f',
                border: '1px solid #d97706'
              }}
              onClick={() => setActiveTab('custom')}
            >
              Custom SMS Push
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {activeTab === 'presets' && (
            <div className="flex flex-col gap-2.5">
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select Preset Alert:
              </span>
              {scenarios.map(scenario => (
                <button
                  key={scenario.id}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-[14px]"
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    opacity: processing ? 0.6 : 1,
                    cursor: processing ? 'wait' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  disabled={processing}
                  onClick={() => handleSimulatePayload(scenario.payload)}
                  onMouseEnter={e => { if (!processing) (e.currentTarget as HTMLButtonElement).style.borderColor = '#d97706' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb' }}
                >
                  <div className="flex items-center justify-center p-2 rounded-lg bg-amber-50 shrink-0">
                    {renderScenarioIcon(scenario.id)}
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block', color: 'var(--ink)' }}>{scenario.name}</strong>
                    <span style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '2px', lineHeight: 1.3 }}>{scenario.description}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'custom' && (
            <form onSubmit={handleSimulateCustom} className="flex flex-col gap-3">
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Custom SMS Alert Text:
              </span>
              <textarea
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="e.g. PAGASA: Red Rainfall warning for Cavite due to Typhoon Odette. Severe flooding expected."
                rows={4}
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  border: '1px solid #cdd8ed',
                  padding: '12px',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
              <button
                type="submit"
                disabled={processing || !customText.trim()}
                className="big-btn primary"
                style={{
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  borderColor: '#d97706',
                  opacity: (processing || !customText.trim()) ? 0.6 : 1
                }}
              >
                {processing ? 'Processing...' : 'Simulate Alert Push'}
              </button>

              <div style={{ marginTop: '20px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  Real-World Citizen SMS Presets:
                </span>
                <div className="flex flex-col gap-2">
                  {[
                    "URGENT: Magnitude 7.8 earthquake felt strongly here in Maasim. Coastal residents running to high ground for tsunami!",
                    "5th Alarm fire spreading quickly in Parola Compound Binondo! Many families evacuated to Del Pan. Need urgent assistance.",
                    "TD Maymay heavy rains causing creek overflow and minor landslides here in Pangasinan. Need monitoring and sandbags.",
                    "Monsoon Habagat / Typhoon Dolphin floodwaters rising near the riverbank. Water is knee-deep and continuous rain.",
                  ].map((txt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCustomText(txt)}
                      style={{
                        background: '#f8faff',
                        border: '1px solid #edf1f8',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        textAlign: 'left',
                        fontSize: '12px',
                        color: '#4b5563',
                        cursor: 'pointer',
                        lineHeight: 1.4,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '#d97706')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '#edf1f8')}
                    >
                      "{txt}"
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* Processing Indicator */}
          {processing && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <div className="skeleton-bar" style={{ width: '100%', height: '4px', borderRadius: '2px' }} />
              <p style={{ fontSize: '12px', color: '#92400e', marginTop: '8px' }}>
                Running Layer 1 Pipeline (CAP Parse → Threshold → AI Auto-Draft)...
              </p>
            </div>
          )}

          {/* Result Output */}
          {lastResult && !processing && (
            <div
              style={{
                marginTop: '20px',
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
                <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>
                  Threshold {lastResult.threshold.met ? 'MET' : 'NOT MET'}
                </strong>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontWeight: 700,
                    background: severityColor(lastResult.alert.severity),
                    color: '#fff',
                    marginLeft: 'auto'
                  }}
                >
                  Score: {lastResult.threshold.severity_score}/100
                </span>
              </div>

              <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.45, margin: '0 0 8px' }}>
                {lastResult.threshold.reason}
              </p>

              {lastResult.draft && (
                <div style={{ marginTop: '10px', borderTop: '1px solid #bbf7d0', paddingTop: '8px' }}>
                  <strong style={{ fontSize: '12px', color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                    </svg>
                    Draft Assessment Created!
                  </strong>
                  <p style={{ fontSize: '11px', color: '#15803d', margin: '2px 0 0' }}>
                    Check your Dashboard header to review the draft questions.
                  </p>
                </div>
              )}
            </div>
          )}

          <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '20px', textAlign: 'center', lineHeight: 1.4 }}>
            Target Barangay: {barangayCode}<br />
            Layer 1 Invariant: Zero push notifications sent to citizens before LGU approval.
          </p>
        </div>
      </div>
    </>
  )
}
