import { describe, expect, it } from "vitest"
import { seededLeads, seededReviewItems } from "@/data/leads"
import { defaultIcpProfile } from "@/types/settings"
import { duplicateSimilarity, normalizeCompanyName } from "@/utils/dedupe"
import { filterLeads, paginateLeads } from "@/utils/filtering"
import { calculateLeadScore, getScoreBreakdown, scoreLead } from "@/utils/scoring"

describe("Pinpoint lead intelligence core", () => {
  it("generates the deterministic seeded and hero dataset with expected review quotas", () => {
    expect(seededLeads).toHaveLength(1260)
    expect(seededLeads.filter((lead) => lead.emailVerification === "verified")).toHaveLength(934)
    expect(seededReviewItems).toHaveLength(128)
    expect(seededReviewItems.filter((item) => item.type === "needs_verification")).toHaveLength(41)
    expect(seededReviewItems.filter((item) => item.type === "potential_duplicate")).toHaveLength(33)
    expect(seededReviewItems.filter((item) => item.type === "low_data_quality")).toHaveLength(28)
    expect(
      seededReviewItems.filter((item) => item.type === "high_potential_missing_info"),
    ).toHaveLength(26)
  })

  it("explains the hero Acme score using the seven default weighted factors", () => {
    const acme = seededLeads.find((lead) => lead.id === "hero_acme_technologies")!
    const breakdown = getScoreBreakdown(acme, defaultIcpProfile)
    expect(breakdown).toMatchObject({
      companyFit: { score: 24, max: 25 },
      revenueFit: { score: 18, max: 20 },
      companySize: { score: 14, max: 15 },
      industryFit: { score: 15, max: 15 },
      contactQuality: { score: 9, max: 10 },
      technologyFit: { score: 7, max: 10 },
      intentSignal: { score: 5, max: 5 },
    })
    expect(calculateLeadScore(breakdown, defaultIcpProfile.weights)).toBe(92)
    expect(scoreLead(acme, defaultIcpProfile).reasons.length).toBeGreaterThanOrEqual(3)
  })

  it("normalizes legal company suffixes and recognizes the hero duplicate pair", () => {
    expect(normalizeCompanyName("https://www.Acme, Inc.")).toBe("acme")
    const left = seededLeads.find((lead) => lead.id === "hero_acme_technologies")!
    const right = seededLeads.find((lead) => lead.id === "hero_acme_inc")!
    expect(duplicateSimilarity(left, right)).toBe(0.91)
  })

  it("filters and paginates without mutating the seeded records", () => {
    expect(seededLeads.filter((lead) => lead.priority === "high")).toHaveLength(186)
    const filtered = filterLeads(seededLeads, {
      priorities: ["high"],
      minScore: 80,
      sort: "leadScore",
      order: "desc",
    })
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.every((lead) => lead.priority === "high" && lead.leadScore >= 80)).toBe(true)
    expect(filtered[0].leadScore).toBeGreaterThanOrEqual(filtered.at(-1)!.leadScore)

    const page = paginateLeads(filtered, 2, 1)
    expect(page.page).toBe(2)
    expect(page.items).toHaveLength(Math.min(1, Math.max(0, filtered.length - 1)))
    expect(seededLeads).toHaveLength(1260)
  })
})
