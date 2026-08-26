/**
 * eReport API Service Layer
 *
 * All requests are proxied through the Supabase Edge Function ("egov").
 * EREPORT_ACCESS_TOKEN is read from Deno.env on the server —
 * it is never exposed in the browser bundle.
 */

import { supabase } from "./supabase"
import {
  PSA_REGIONS,
  PSA_PROVINCES,
  PSA_MUNICIPALITIES,
  PSA_BARANGAYS,
  PSA_REPORT_TYPES,
  type RegionItem,
  type ProvinceItem,
  type MunicipalityItem,
  type BarangayItem,
  type ReportTypeItem,
} from "./psa-fallback-data"

export type { RegionItem, ProvinceItem, MunicipalityItem, BarangayItem, ReportTypeItem }

export interface SubmitComplaintPayload {
  mobile: string
  first_name: string
  last_name: string
  gender: string
  complainant_email: string
  report_type: string
  subject: string
  message: string
  evidences?: string[]
  region_code: string
  province_code: string
  municipality_code: string
  barangay_code: string
  latitude?: string
  longitude?: string
}

export interface SubmitComplaintResponse {
  code: number
  message?: string
  case_number: string
  is_live_api?: boolean
}

export interface EReport {
  id: string
  case_number: string
  report_type: { id: string; code: string; name: string }
  subject: string
  message: string
  status: string
  formatted_status: string
  created_at: string
  history: { status: string; formatted_status: string; remarks: string | null; created_at: string }[]
}

export interface ReportsPage {
  reports: EReport[]
  total: number
  page: number
  totalPages: number
}

const USE_MOCK = import.meta.env.VITE_EREPORT_USE_MOCK === "true"

/**
 * Proxy an eReport API call through the Edge Function.
 */
async function ereportProxy<T>(
  method: string,
  path: string,
  body?: unknown,
  reportViewToken?: string,
): Promise<T | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.functions.invoke("egov", {
      body: { action: "ereport-proxy", payload: { method, path, body, report_view_token: reportViewToken } },
    })
    if (error) {
      console.warn(`[eReport] Edge function error for ${path}:`, error.message)
      return null
    }
    return data as T
  } catch (err) {
    console.warn(`[eReport] Edge function request failed for ${path}:`, err)
    return null
  }
}

/**
 * Fetch report types dataset
 */
export async function getReportTypes(): Promise<ReportTypeItem[]> {
  try {
    const json = await ereportProxy<{ data: { id: string; attributes: { code: string; name: string; sequence: number; is_visible: boolean; is_active: boolean } }[] }>(
      "GET",
      "/datasets/report_types",
    )
    if (!json) throw new Error("No response")
    const allTypes = json.data.map((item) => ({
      id: item.id,
      code: item.attributes.code,
      name: item.attributes.name,
      sequence: item.attributes.sequence,
      is_visible: item.attributes.is_visible,
      is_active: item.attributes.is_active,
    }))
    return allTypes.length > 0 ? allTypes : PSA_REPORT_TYPES
  } catch (err) {
    console.warn("[eReport] Failed to fetch report types, returning disaster-scoped PSA fallback dataset:", err)
    return PSA_REPORT_TYPES
  }
}

/**
 * Fetch regions list
 */
export async function getRegions(): Promise<RegionItem[]> {
  try {
    const json = await ereportProxy<{ data: { id: string; attributes: { name: string } }[] }>("GET", "/datasets/regions")
    if (!json) throw new Error("No response")
    return json.data.map((item) => ({ id: item.id, name: item.attributes.name }))
  } catch (err) {
    console.warn("[eReport] Failed to fetch regions, returning all 18 PSA regions fallback:", err)
    return PSA_REGIONS
  }
}

/**
 * Fetch provinces for a region code
 */
export async function getProvinces(regionCode: string): Promise<ProvinceItem[]> {
  try {
    const json = await ereportProxy<{ data: { id: string; attributes: { region_code: string; name: string } }[] }>(
      "GET",
      `/datasets/provinces?region_code=${regionCode}`,
    )
    if (!json) throw new Error("No response")
    return json.data.map((item) => ({
      id: item.id,
      region_code: item.attributes.region_code,
      name: item.attributes.name,
    }))
  } catch (err) {
    console.warn(`[eReport] Failed to fetch provinces for region ${regionCode}, using PSA fallback:`, err)
    if (PSA_PROVINCES[regionCode]) return PSA_PROVINCES[regionCode]
    const regObj = PSA_REGIONS.find((r) => r.id === regionCode)
    const regName = regObj ? regObj.name.split("(")[0].trim() : "REGION"
    return [
      { id: `${regionCode.slice(0, 3)}010000`, region_code: regionCode, name: `${regName} PROVINCE CAPITAL` },
      { id: `${regionCode.slice(0, 3)}020000`, region_code: regionCode, name: `${regName} SECOND PROVINCE` },
    ]
  }
}

/**
 * Fetch municipalities for a province code
 */
export async function getMunicipalities(provinceCode: string): Promise<MunicipalityItem[]> {
  try {
    const json = await ereportProxy<{ data: { id: string; attributes: { region_code: string; province_code: string; name: string } }[] }>(
      "GET",
      `/datasets/municipalities?province_code=${provinceCode}`,
    )
    if (!json) throw new Error("No response")
    return json.data.map((item) => ({
      id: item.id,
      region_code: item.attributes.region_code,
      province_code: item.attributes.province_code,
      name: item.attributes.name,
    }))
  } catch (err) {
    console.warn(`[eReport] Failed to fetch municipalities for province ${provinceCode}, using PSA fallback:`, err)
    if (PSA_MUNICIPALITIES[provinceCode]) return PSA_MUNICIPALITIES[provinceCode]
    const regCode = provinceCode.slice(0, 3) + "000000"
    return [
      { id: `${provinceCode.slice(0, 5)}01000`, region_code: regCode, province_code: provinceCode, name: "CITY OF ALAMINOS (Capital)" },
      { id: `${provinceCode.slice(0, 5)}02000`, region_code: regCode, province_code: provinceCode, name: "CENTRAL MUNICIPALITY" },
    ]
  }
}

/**
 * Fetch barangays for a municipality code
 */
export async function getBarangays(municipalityCode: string): Promise<BarangayItem[]> {
  try {
    const json = await ereportProxy<{ data: { id: string; attributes: { region_code: string; province_code: string; municipality_code: string; name: string } }[] }>(
      "GET",
      `/datasets/barangays?municipality_code=${municipalityCode}`,
    )
    if (!json) throw new Error("No response")
    return json.data.map((item) => ({
      id: item.id,
      region_code: item.attributes.region_code,
      province_code: item.attributes.province_code,
      municipality_code: item.attributes.municipality_code,
      name: item.attributes.name,
    }))
  } catch (err) {
    console.warn(`[eReport] Failed to fetch barangays for municipality ${municipalityCode}, using PSA fallback:`, err)
    if (PSA_BARANGAYS[municipalityCode]) return PSA_BARANGAYS[municipalityCode]
    const regCode = municipalityCode.slice(0, 3) + "000000"
    const provCode = municipalityCode.slice(0, 5) + "0000"
    return [
      { id: `${municipalityCode.slice(0, 7)}001`, region_code: regCode, province_code: provCode, municipality_code: municipalityCode, name: "Poblacion" },
      { id: `${municipalityCode.slice(0, 7)}010`, region_code: regCode, province_code: provCode, municipality_code: municipalityCode, name: "Barangay San Jose" },
      { id: `${municipalityCode.slice(0, 7)}020`, region_code: regCode, province_code: provCode, municipality_code: municipalityCode, name: "Barangay Santa Maria" },
    ]
  }
}

/**
 * Submit a complaint report to eReport
 */
export async function submitComplaint(payload: SubmitComplaintPayload): Promise<SubmitComplaintResponse> {
  try {
    const json = await ereportProxy<SubmitComplaintResponse>("POST", "/submit_complaint", payload)
    if (!json) throw new Error("No response")
    if (!json.case_number) throw new Error(json.message || "eReport did not return a case number")
    return { ...json, is_live_api: true }
  } catch (err) {
    if (!USE_MOCK) throw err
    console.warn("[eReport] Submit complaint failed, using explicit mock response:", err)
    return {
      code: 200,
      message: "Complaint submitted successfully to eReport pipeline.",
      case_number: `HND-${Math.floor(100000 + Math.random() * 900000)}`,
      is_live_api: false,
    }
  }
}

export async function getReports(reportViewToken: string, page = 1): Promise<ReportsPage> {
  if (!reportViewToken) throw new Error("Verify your email to view eReport cases")
  const json = await ereportProxy<{
    data: { attributes: EReport }[]
    meta?: { pagination?: { total?: number; current_page?: number; total_pages?: number } }
  }>("GET", `/reports?page=${page}`, undefined, reportViewToken)
  if (!json) throw new Error("Unable to load eReport cases")
  const pagination = json.meta?.pagination
  return {
    reports: json.data.map((item) => item.attributes),
    total: pagination?.total ?? json.data.length,
    page: pagination?.current_page ?? page,
    totalPages: pagination?.total_pages ?? 1,
  }
}

export async function getReport(caseNumber: string, reportViewToken: string): Promise<EReport> {
  if (!reportViewToken) throw new Error("Verify your email to view eReport cases")
  const json = await ereportProxy<{ data: EReport }>(
    "GET",
    `/reports/${encodeURIComponent(caseNumber)}`,
    undefined,
    reportViewToken,
  )
  if (!json?.data) throw new Error("Unable to load eReport case")
  return json.data
}
