import { useState, useEffect } from "react"
import {
  getRegions,
  getProvinces,
  getMunicipalities,
  getBarangays,
  getReportTypes,
  submitComplaint,
  type RegionItem,
  type ProvinceItem,
  type MunicipalityItem,
  type BarangayItem,
  type ReportTypeItem,
} from "@/lib/ereport-service"

interface DisasterReportFormProps {
  isOpen: boolean
  onClose: () => void
  disasterName?: string
  campaignDefaults?: {
    regionCode: string
    provinceCode: string
    municipalityCode: string
    barangayCode: string
    reportType: 'red_tape' | 'accident' | 'fire'
    subject: string
    message: string
  } | null
  userProfile?: {
    first_name: string
    last_name: string
    mobile: string
    email: string
  }
}

export function DisasterReportForm({
  isOpen,
  onClose,
  disasterName = "Disaster Incident",
  campaignDefaults = null,
  userProfile,
}: DisasterReportFormProps) {
  const [regions, setRegions] = useState<RegionItem[]>([])
  const [provinces, setProvinces] = useState<ProvinceItem[]>([])
  const [municipalities, setMunicipalities] = useState<MunicipalityItem[]>([])
  const [barangays, setBarangays] = useState<BarangayItem[]>([])
  const [reportTypes, setReportTypes] = useState<ReportTypeItem[]>([])

  const [selectedRegion, setSelectedRegion] = useState(campaignDefaults?.regionCode ?? "")
  const [selectedProvince, setSelectedProvince] = useState(campaignDefaults?.provinceCode ?? "")
  const [selectedMunicipality, setSelectedMunicipality] = useState(campaignDefaults?.municipalityCode ?? "")
  const [selectedBarangay, setSelectedBarangay] = useState(campaignDefaults?.barangayCode ?? "")
  const [selectedReportType, setSelectedReportType] = useState<string>(campaignDefaults?.reportType ?? "red_tape")

  const [subject, setSubject] = useState(campaignDefaults?.subject ?? `Affected Person Report - ${disasterName}`)
  const [message, setMessage] = useState(
    campaignDefaults?.message ?? `Reporting affected household status during ${disasterName}. Immediate relief assistance and monitoring requested.`
  )

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resultMessage, setResultMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      getRegions().then((data) => {
        setRegions(data)
        if (campaignDefaults?.regionCode && data.some((item) => item.id === campaignDefaults.regionCode)) {
          setSelectedRegion(campaignDefaults.regionCode)
        } else if (data.length > 0) {
          setSelectedRegion(data[0].id)
        }
      })
      getReportTypes().then((types) => {
        setReportTypes(types)
        if (campaignDefaults?.reportType && types.some((item) => item.code === campaignDefaults.reportType)) {
          setSelectedReportType(campaignDefaults.reportType)
          return
        }
        const redTapeType = types.find((t) => t.code === "red_tape")
        if (redTapeType) setSelectedReportType(redTapeType.code)
        else if (types.length > 0) setSelectedReportType(types[0].code)
      })
    }
  }, [campaignDefaults, disasterName, isOpen])

  useEffect(() => {
    if (selectedRegion) {
      getProvinces(selectedRegion).then((data) => {
        setProvinces(data)
        if (campaignDefaults?.provinceCode && data.some((item) => item.id === campaignDefaults.provinceCode)) {
          setSelectedProvince(campaignDefaults.provinceCode)
        } else if (data.length > 0) {
          setSelectedProvince(data[0].id)
        } else {
          setSelectedProvince("")
        }
      })
    }
  }, [campaignDefaults, selectedRegion])

  useEffect(() => {
    if (selectedProvince) {
      getMunicipalities(selectedProvince).then((data) => {
        setMunicipalities(data)
        if (campaignDefaults?.municipalityCode && data.some((item) => item.id === campaignDefaults.municipalityCode)) {
          setSelectedMunicipality(campaignDefaults.municipalityCode)
        } else if (data.length > 0) {
          setSelectedMunicipality(data[0].id)
        } else {
          setSelectedMunicipality("")
        }
      })
    }
  }, [campaignDefaults, selectedProvince])

  useEffect(() => {
    if (selectedMunicipality) {
      getBarangays(selectedMunicipality).then((data) => {
        setBarangays(data)
        if (campaignDefaults?.barangayCode && data.some((item) => item.id === campaignDefaults.barangayCode)) {
          setSelectedBarangay(campaignDefaults.barangayCode)
        } else if (data.length > 0) {
          setSelectedBarangay(data[0].id)
        } else {
          setSelectedBarangay("")
        }
      })
    }
  }, [campaignDefaults, selectedMunicipality])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setResultMessage(null)

    try {
      const res = await submitComplaint({
        mobile: userProfile?.mobile || "639090000000",
        first_name: userProfile?.first_name || "Resident",
        last_name: userProfile?.last_name || "User",
        gender: "Female",
        complainant_email: userProfile?.email || "resident@yopmail.com",
        report_type: selectedReportType,
        subject,
        message,
        region_code: selectedRegion || "010000000",
        province_code: selectedProvince || "010550000",
        municipality_code: selectedMunicipality || "0105503000",
        barangay_code: selectedBarangay || "0105503021",
        latitude: "16.1568",
        longitude: "119.9812",
      })

      setResultMessage({
        type: "success",
        text: `Report logged to eReport pipeline successfully! Case Reference: ${res.case_number}`,
      })
      setTimeout(() => {
        onClose()
        setResultMessage(null)
      }, 3000)
    } catch (err) {
      setResultMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to log report to eReport",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card max-w-lg p-0 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 m-0">eReport Incident Logging</h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">Log calamity report per Barangay into eReport System</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pill-btn ghost text-xs py-1 px-3"
          >
            Close
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">eReport Complaint Type</label>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)] font-medium"
            >
              {reportTypes.map((rt) => (
                <option key={rt.id} value={rt.code}>
                  {rt.name} ({rt.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)] font-medium"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Message Description</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--blue-primary)] font-medium leading-relaxed"
              required
            />
          </div>

          {/* Location Datasets Hierarchy */}
          <div className="bg-[var(--blue-soft)] p-4 rounded-xl border border-blue-200/80 flex flex-col gap-3">
            <span className="font-bold text-[var(--blue-primary)] text-[11px] uppercase tracking-wider">
              LOCATION HIERARCHY (EREPORT PSA DATASETS)
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-600 font-medium block mb-1">Region</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-medium"
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-medium block mb-1">Province</label>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-medium"
                >
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-medium block mb-1">Municipality</label>
                <select
                  value={selectedMunicipality}
                  onChange={(e) => setSelectedMunicipality(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-medium"
                >
                  {municipalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-medium block mb-1">Barangay</label>
                <select
                  value={selectedBarangay}
                  onChange={(e) => setSelectedBarangay(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 font-medium"
                >
                  {barangays.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {resultMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold ${
                resultMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {resultMessage.text}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="pill-btn ghost text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="pill-btn primary text-xs py-2 px-5 font-semibold disabled:opacity-50"
            >
              {isSubmitting ? "Submitting to eReport..." : "Log Report to eReport"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
