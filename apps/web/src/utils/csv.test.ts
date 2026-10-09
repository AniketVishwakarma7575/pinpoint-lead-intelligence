import Papa from "papaparse"
import { describe, expect, it } from "vitest"
import { seededLeads } from "@/data/leads"
import { leadsToCsv } from "@/utils/csv"

describe("lead CSV export", () => {
  it("exports only the chosen fields with CSV-safe cell escaping", () => {
    const lead = {
      ...seededLeads.find((candidate) => candidate.id === "hero_acme_technologies")!,
      companyName: "Acme, Technologies",
    }
    const csv = leadsToCsv([lead], ["companyName", "email", "leadScore"])
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true })

    expect(parsed.errors).toHaveLength(0)
    expect(parsed.meta.fields).toEqual(["Company", "Email", "Lead score"])
    expect(parsed.data[0]).toEqual({
      Company: "Acme, Technologies",
      Email: lead.email,
      "Lead score": String(lead.leadScore),
    })
  })

  it("rejects an empty selection or an empty export field set", () => {
    expect(() => leadsToCsv([], ["email"])).toThrow("There are no leads to export.")
    expect(() => leadsToCsv([seededLeads[0]], [])).toThrow(
      "Select at least one field to export.",
    )
  })
})
