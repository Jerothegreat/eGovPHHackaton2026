import { beforeEach, describe, expect, it, vi } from "vitest"

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock("./supabase", () => ({
  supabase: { functions: { invoke } },
}))

import { getReportTypes, submitComplaint } from "./ereport-service"

const complaint = {
  mobile: "639090000000",
  first_name: "Resident",
  last_name: "User",
  gender: "Female",
  complainant_email: "resident@example.com",
  report_type: "fire",
  subject: "Fire report",
  message: "Fire near the market",
  region_code: "010000000",
  province_code: "010550000",
  municipality_code: "0105503000",
  barangay_code: "0105503021",
}

describe("eReport service", () => {
  beforeEach(() => invoke.mockReset())

  it("uses the documented top-level complaint case number", async () => {
    invoke.mockResolvedValue({ data: { code: 200, case_number: "PFM-071826-0014" }, error: null })

    await expect(submitComplaint(complaint)).resolves.toMatchObject({
      case_number: "PFM-071826-0014",
      is_live_api: true,
    })
  })

  it("rejects live complaint failures instead of inventing a case number", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("service unavailable") })

    await expect(submitComplaint(complaint)).rejects.toThrow("No response")
  })

  it("returns all report types provided by eReport", async () => {
    invoke.mockResolvedValue({
      data: {
        data: [
          { id: "crime", attributes: { code: "crime", name: "Crime", sequence: 1, is_visible: true, is_active: true } },
          { id: "fire", attributes: { code: "fire", name: "Fire", sequence: 2, is_visible: true, is_active: true } },
        ],
      },
      error: null,
    })

    await expect(getReportTypes()).resolves.toHaveLength(2)
  })
})
