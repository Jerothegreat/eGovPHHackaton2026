import { useState } from "react"
import { useSession } from "./session-context"
import { requestOTP, confirmOTP } from "./otp"
import type { DemoIdentity } from "./egov-sso"

const USE_MOCK = import.meta.env.VITE_EGOV_SSO_USE_MOCK !== "false"

interface DemoUser {
  id: DemoIdentity
  label: string
  role: string
  badgeBg: string
  email: string
  description: string
  system: "handa" | "egov"
}

const HANDA_DEMO_USERS: DemoUser[] = [
  {
    id: "alexis",
    label: "Alexis Ramos",
    role: "Barangay",
    badgeBg: "var(--blue-primary)",
    email: "alexis.ramos@yopmail.com",
    description: "Barangay Official — Publish assessments, manage check-in queues, view reports.",
    system: "handa",
  },
  {
    id: "lgu",
    label: "Alaminos LGU Command",
    role: "LGU Command",
    badgeBg: "#7c3aed",
    email: "lgu.command@alaminos.gov.ph",
    description: "Municipal LGU Command — City-wide disaster monitoring and incident response.",
    system: "handa",
  },
  {
    id: "dev",
    label: "Dev User",
    role: "Developer",
    badgeBg: "#059669",
    email: "dev@cityapp.ph",
    description: "System Developer — API key access, documentation, eReport datasets & metrics.",
    system: "handa",
  },
]

const EGOV_DEMO_USERS: DemoUser[] = [
  {
    id: "josie",
    label: "Josie Dela Cruz",
    role: "Citizen / Resident",
    badgeBg: "#0284c7",
    email: "josie@yopmail.com",
    description: "eGovPH Mobile User — Submit disaster needs, AI dialect translation, eReport filing.",
    system: "egov",
  },
  {
    id: "maria",
    label: "Maria Santos",
    role: "Citizen / Resident",
    badgeBg: "#0284c7",
    email: "maria@yopmail.com",
    description: "eGovPH Mobile User — Barangay Poblacion affected resident check-in.",
    system: "egov",
  },
  {
    id: "pedro",
    label: "Pedro Reyes",
    role: "Citizen / Resident",
    badgeBg: "#0284c7",
    email: "pedro@yopmail.com",
    description: "eGovPH Mobile User — Citizen assistant chat & emergency needs reporting.",
    system: "egov",
  },
]

type Step = "input" | "otp" | "sso"
type AuthMethod = "mobile" | "email"
type LoginMode = "standard" | "demo"
type AccessTab = "handa" | "egov"

export function LoginPage() {
  const { login, isLoading, error } = useSession()
  const [step, setStep] = useState<Step>("input")
  const [mode, setMode] = useState<LoginMode>("standard")
  const [authMethod, setAuthMethod] = useState<AuthMethod>("mobile")
  const [selected, setSelected] = useState<DemoIdentity>("alexis")
  const [activeTab, setActiveTab] = useState<AccessTab>("handa")
  const [mobileNumber, setMobileNumber] = useState("")
  const [emailInput, setEmailInput] = useState("")
  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState<string | null>(null)

  const allDemoUsers = [...HANDA_DEMO_USERS, ...EGOV_DEMO_USERS]
  const currentSelectedUser = allDemoUsers.find((u) => u.id === selected)

  async function handleSendOTP() {
    setOtpError(null)
    try {
      // Live eGov SSO performs identity verification; do not gate it behind eReport OTP.
      if (!USE_MOCK) {
        setStep("sso")
        await login()
        return
      }

      const targetIdentifier =
        mode === "demo"
          ? currentSelectedUser?.email
          : authMethod === "mobile"
          ? mobileNumber
          : emailInput

      if (!targetIdentifier || targetIdentifier.trim() === "") {
        setOtpError(
          authMethod === "mobile"
            ? "Please enter a valid 11-digit mobile number"
            : "Please enter a valid email address"
        )
        return
      }

      const { already_verified } = await requestOTP(targetIdentifier)
      if (already_verified) {
        setStep("sso")
        await login(mode === "demo" ? selected : undefined)
        return
      }
      setStep("otp")
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Failed to send verification code")
    }
  }

  async function handleConfirmOTP() {
    setOtpError(null)
    try {
      const targetIdentifier =
        mode === "demo"
          ? currentSelectedUser?.email
          : authMethod === "mobile"
          ? mobileNumber
          : emailInput

      if (!targetIdentifier) return
      const { verified } = await confirmOTP(targetIdentifier, otp)
      if (!verified) {
        setOtpError("Invalid verification code")
        return
      }
      setStep("sso")
      await login(mode === "demo" ? selected : undefined)
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Verification failed")
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 md:p-8 bg-[var(--soft-bg)] font-sans text-slate-900">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 text-center max-w-xl">
        <div className="flex items-center gap-3 mb-2">
          <img src="/egovph-logo.png" alt="eGovPH" className="h-10 sm:h-12 w-auto object-contain" />
          <div className="h-6 w-px bg-slate-300" />
          <img src="/ehanda-logo.png" alt="eHANDA" className="h-8 sm:h-10 w-auto object-contain" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          eHANDA Disaster Management Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Hazard Assessment and Needs Determination Architecture integrated with eGovPH Super App
        </p>
      </div>

      {/* Main Login Card Container */}
      <div
        className={`w-full ${
          mode === "demo" && step === "input" ? "max-w-4xl" : "max-w-md"
        } bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col transition-all duration-300`}
      >
        {/* Step 1: Standard Login (Mobile or Email) */}
        {step === "input" && mode === "standard" && (
          <div className="p-6 sm:p-8 flex flex-col gap-5">
            <div className="text-center pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Sign in to eHANDA</h2>
              <p className="text-xs text-slate-500 mt-1">
                {!USE_MOCK
                  ? "Continue with your verified eGovPH account."
                  : authMethod === "mobile"
                  ? "Enter your registered Philippine mobile number to receive an SMS one-time password."
                  : "Enter your registered email address to receive a verification code."}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendOTP()
              }}
              className="flex flex-col gap-4"
            >
              {USE_MOCK && (authMethod === "mobile" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                      +63
                    </span>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="917 123 4567"
                      className="w-full pl-16 pr-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)] font-mono font-medium"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="user@example.gov.ph"
                    className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)] font-medium"
                    required
                  />
                </div>
              ))}

              {!USE_MOCK && (
                <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm text-blue-900">
                  eGovPH will verify your identity and return your profile securely.
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || (USE_MOCK && (authMethod === "mobile" ? !mobileNumber.trim() : !emailInput.trim()))}
                className="w-full py-3 bg-[var(--blue-primary)] hover:bg-[var(--blue-hover)] active:bg-[var(--blue-deep)] text-white font-semibold text-sm rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading
                  ? "Processing..."
                  : !USE_MOCK
                  ? "Continue with eGovPH SSO"
                  : authMethod === "mobile"
                  ? "Send SMS One-Time Password"
                  : "Send Email Verification Code"}
              </button>
            </form>

            {/* Toggle between Mobile & Email */}
            {USE_MOCK && <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setAuthMethod(authMethod === "mobile" ? "email" : "mobile")}
                className="text-[var(--blue-primary)] hover:underline font-semibold cursor-pointer"
              >
                {authMethod === "mobile" ? "Sign in using Email Address instead" : "Sign in using Mobile Number instead"}
              </button>
            </div>}

            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest absolute">
                OR
              </span>
            </div>

            {/* Sign in with eGovPH SSO Button (styled like Google/FB SSO button) */}
            <button
              type="button"
              onClick={() => setMode("demo")}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 hover:border-slate-400 rounded-xl transition-all shadow-xs hover:shadow-sm active:scale-[0.99] flex items-center justify-center gap-3 font-semibold text-sm text-slate-700 hover:text-slate-900 group cursor-pointer"
            >
              <img src="/egovph-logo.png" alt="eGovPH" className="h-6 w-auto object-contain" />
              <span>Sign in with eGovPH</span>
            </button>
          </div>
        )}

        {/* Step 1 (Demo Mode): Two-Panel Selection */}
        {step === "input" && mode === "demo" && (
          <div className="flex flex-col">
            {/* Header bar aligned with light eGov/eHANDA theme */}
            <div className="bg-[var(--blue-soft)] border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  eGovPH Single Sign-On (SSO)
                </h2>
                <p className="text-[11px] text-slate-600 mt-0.5">Select your authorized profile to sign in with eGovPH.</p>
              </div>
              <button
                type="button"
                onClick={() => setMode("standard")}
                className="text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex border-b border-slate-200 md:hidden bg-slate-50 p-1.5 gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("handa")
                  setSelected("alexis")
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "handa"
                    ? "bg-white text-[var(--blue-primary)] shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                eHANDA Management
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("egov")
                  setSelected("josie")
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "egov"
                    ? "bg-white text-[var(--blue-primary)] shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                eGovPH Resident
              </button>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LEFT PANEL: eHANDA Management */}
                <div
                  className={`flex flex-col gap-3 p-4 rounded-xl border transition-all ${
                    activeTab === "handa" || window.innerWidth >= 768
                      ? "border-blue-200 bg-slate-50/60"
                      : "hidden md:flex opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        eHANDA System Access
                      </h2>
                      <p className="text-[11px] text-slate-500">LGU, Barangay, & Developer Consoles</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                      LGU & Admin
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5 mt-1">
                    {HANDA_DEMO_USERS.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setSelected(user.id)
                          setActiveTab("handa")
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selected === user.id
                            ? "border-[var(--blue-primary)] bg-blue-50/70 shadow-xs ring-1 ring-[var(--blue-primary)]"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-slate-900">{user.label}</span>
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
                            style={{ background: user.badgeBg }}
                          >
                            {user.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{user.description}</p>
                        <span className="text-[11px] text-slate-400 font-mono mt-1.5 block">{user.email}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* RIGHT PANEL: eGovPH Mobile Resident */}
                <div
                  className={`flex flex-col gap-3 p-4 rounded-xl border transition-all ${
                    activeTab === "egov" || window.innerWidth >= 768
                      ? "border-emerald-200 bg-slate-50/60"
                      : "hidden md:flex opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        eGovPH App Integration
                      </h2>
                      <p className="text-[11px] text-slate-500">Citizen & Resident Module (eGov AI & eReport)</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Citizens
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5 mt-1">
                    {EGOV_DEMO_USERS.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setSelected(user.id)
                          setActiveTab("egov")
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selected === user.id
                            ? "border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-slate-900">{user.label}</span>
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
                            style={{ background: user.badgeBg }}
                          >
                            {user.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{user.description}</p>
                        <span className="text-[11px] text-slate-400 font-mono mt-1.5 block">{user.email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Login Action Bar */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 text-center sm:text-left">
                  Selected profile: <strong className="text-slate-900 font-semibold">{currentSelectedUser?.label}</strong> ({currentSelectedUser?.role})
                </div>
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-6 py-3 bg-[var(--blue-primary)] hover:bg-[var(--blue-hover)] text-white font-semibold text-sm rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isLoading ? "Authenticating..." : "Continue with Selected Profile"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {step === "otp" && (
          <div className="p-8 max-w-md mx-auto text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-[var(--blue-primary)] flex items-center justify-center font-bold">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Verification Code Required</h2>
              <p className="text-xs text-slate-600 mt-1">
                Enter the 6-digit verification code sent to
              </p>
              <p className="text-sm font-semibold text-[var(--blue-primary)] mt-0.5 font-mono">
                {mode === "demo" ? currentSelectedUser?.email : authMethod === "mobile" ? `+63 ${mobileNumber}` : emailInput}
              </p>
              {USE_MOCK && (
                <span className="inline-block mt-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full font-medium">
                  Mock Mode: enter <strong>123456</strong>
                </span>
              )}
            </div>

            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 text-center text-3xl font-mono tracking-[0.3em] border-2 border-blue-300 focus:border-[var(--blue-primary)] rounded-xl outline-none"
            />

            <button
              type="button"
              onClick={handleConfirmOTP}
              disabled={isLoading || otp.length !== 6}
              className="w-full py-3 bg-[var(--blue-primary)] hover:bg-[var(--blue-hover)] text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 shadow-sm"
            >
              {isLoading ? "Verifying..." : "Verify and Sign In"}
            </button>

            <button
              type="button"
              onClick={() => setStep("input")}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Step 3: Connecting SSO */}
        {step === "sso" && (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[var(--blue-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-700">Connecting to eGovPH SSO authentication server...</p>
          </div>
        )}

        {(otpError || error) && (
          <div className="mx-6 mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs text-center font-medium">
            {otpError || error}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 text-xs text-slate-500">
        <span>Secure eGovPH Single Sign-On (SSO) Integration</span>
        <span className="hidden sm:inline">•</span>
        <span>eGov AI & eReport Hackathon 2026</span>
      </div>
    </div>
  )
}
