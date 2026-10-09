import {
  SCORE_FACTOR_LABELS,
  SCORE_FACTOR_MAX,
  type IcpProfile,
  type Lead,
  type ScoreBreakdown,
  type ScoreFactorKey,
} from "@/types"

const decisionMakerPattern =
  /\b(ceo|chief|founder|owner|president|vp|vice president|director|head|partner)\b/i
const countryFromLocation = (location: string) => {
  const suffix = location.split(",").at(-1)?.trim() ?? ""
  if (["US", "USA", "United States"].includes(suffix)) return "United States"
  if (["UK", "United Kingdom"].includes(suffix)) return "United Kingdom"
  if (["Canada", "CA"].includes(suffix)) return "Canada"
  if (["India", "IN"].includes(suffix)) return "India"
  if (["Singapore", "SG"].includes(suffix)) return "Singapore"
  return suffix
}

function boundedFit(value: number, minimum: number, maximum: number, edgePenalty: number) {
  if (minimum >= maximum || value < minimum || value > maximum) return 0
  const midpoint = (minimum + maximum) / 2
  const halfRange = (maximum - minimum) / 2
  return Math.max(0, Math.min(100, 100 - (Math.abs(value - midpoint) / halfRange) * edgePenalty))
}

export function getScoreBreakdown(
  lead: Pick<
    Lead,
    | "location"
    | "growthStage"
    | "intentSignals"
    | "revenue"
    | "employees"
    | "industry"
    | "contactTitle"
    | "emailVerification"
    | "phone"
    | "contactName"
    | "technologies"
  >,
  icp: IcpProfile,
): ScoreBreakdown {
  const country = countryFromLocation(lead.location)
  const inTargetRegion = icp.regions.includes(country)
  const growthFit =
    lead.growthStage === "scaling" ? 86.67 : lead.growthStage === "established" ? 82 : 68
  const intentFit = Math.min(100, lead.intentSignals.length * 50)
  const companyFit = inTargetRegion
    ? Math.round((100 * 0.5 + growthFit * 0.3 + intentFit * 0.2) * 100) / 100
    : Math.round((45 * 0.5 + growthFit * 0.3 + intentFit * 0.2) * 100) / 100
  const revenueFit = boundedFit(lead.revenue, icp.minRevenue, icp.maxRevenue, 20)
  const sizeFit = boundedFit(lead.employees, icp.minEmployees, icp.maxEmployees, 40)
  const industryFit = icp.industries.includes(lead.industry) ? 100 : 42
  const contactFit =
    (decisionMakerPattern.test(lead.contactTitle) ? 50 : 10) +
    (lead.emailVerification === "verified" ? 30 : lead.emailVerification === "risky" ? 15 : 0) +
    (lead.phone ? 10 : 0) +
    (lead.contactName ? 10 : 0)
  const technologyMatches = lead.technologies.filter((technology) =>
    icp.technologies.includes(technology),
  ).length
  const technologyFit =
    icp.technologies.length === 0
      ? 50
      : Math.min(100, (technologyMatches / icp.technologies.length) * 100)

  const values: Record<ScoreFactorKey, { fit: number; reason: string }> = {
    companyFit: {
      fit: companyFit,
      reason: inTargetRegion
        ? `${country} is in your target market`
        : `${country} is outside your primary target markets`,
    },
    revenueFit: {
      fit: revenueFit,
      reason:
        lead.revenue >= icp.minRevenue && lead.revenue <= icp.maxRevenue
          ? "Revenue is within your target range"
          : "Revenue is outside your target range",
    },
    companySize: {
      fit: sizeFit,
      reason:
        lead.employees >= icp.minEmployees && lead.employees <= icp.maxEmployees
          ? `${lead.employees.toLocaleString()} employees fit your target band`
          : `${lead.employees.toLocaleString()} employees are outside your target band`,
    },
    industryFit: {
      fit: industryFit,
      reason: icp.industries.includes(lead.industry)
        ? `${lead.industry} is one of your priority industries`
        : `${lead.industry} is not a priority industry`,
    },
    contactQuality: {
      fit: contactFit,
      reason: decisionMakerPattern.test(lead.contactTitle)
        ? `${lead.contactTitle} is a decision-making role`
        : "Decision-maker contact not confirmed",
    },
    technologyFit: {
      fit: technologyFit,
      reason:
        technologyMatches > 0
          ? `${technologyMatches} target technologies identified`
          : "No target technologies identified yet",
    },
    intentSignal: {
      fit: intentFit,
      reason:
        lead.intentSignals.length > 0
          ? `${lead.intentSignals.length} active intent signals identified`
          : "No active intent signals identified",
    },
  }

  return Object.fromEntries(
    (Object.keys(SCORE_FACTOR_MAX) as ScoreFactorKey[]).map((key) => [
      key,
      {
        score: Math.round((values[key].fit / 100) * SCORE_FACTOR_MAX[key]),
        max: SCORE_FACTOR_MAX[key],
        reason: values[key].reason,
      },
    ]),
  ) as ScoreBreakdown
}

export function calculateLeadScore(breakdown: ScoreBreakdown, weights: IcpProfile["weights"]) {
  const factors = Object.keys(SCORE_FACTOR_MAX) as ScoreFactorKey[]
  const totalWeight = factors.reduce((sum, key) => sum + weights[key], 0)
  if (!totalWeight) return 0

  const weightedFit = factors.reduce((sum, key) => {
    const maximum = SCORE_FACTOR_MAX[key]
    const factorFit = maximum > 0 ? breakdown[key].score / maximum : 0
    return sum + factorFit * weights[key]
  }, 0)
  return Math.max(0, Math.min(100, Math.round((weightedFit / totalWeight) * 100)))
}

export function scoreLead<
  T extends Omit<Lead, "leadScore" | "scoreBreakdown" | "reasons" | "nextStep" | "priority">,
>(
  lead: T,
  icp: IcpProfile,
): T & Pick<Lead, "leadScore" | "scoreBreakdown" | "reasons" | "nextStep" | "priority"> {
  const scoreBreakdown = getScoreBreakdown(lead, icp)
  const leadScore = calculateLeadScore(scoreBreakdown, icp.weights)
  const priority = leadScore >= 80 ? "high" : leadScore >= 60 ? "medium" : "low"
  const reasons = (Object.keys(scoreBreakdown) as ScoreFactorKey[])
    .filter((key) => scoreBreakdown[key].score / scoreBreakdown[key].max >= 0.8)
    .map((key) => scoreBreakdown[key].reason)
    .slice(0, 5)

  if (lead.emailVerification === "verified") reasons.push("Work email is verified")
  if (decisionMakerPattern.test(lead.contactTitle)) reasons.push("A decision-maker is identified")

  const nextStep =
    lead.emailVerification === "invalid"
      ? "Find and verify a current work email before outreach."
      : leadScore >= 80
        ? `Reach out to ${lead.contactName} with a relevant ${lead.industry.toLowerCase()} insight.`
        : lead.emailVerification === "unknown" || lead.websiteStatus === "unknown"
          ? "Verify the contact details and company website before outreach."
          : "Review the company fit, then add a relevant note before outreach."

  return {
    ...lead,
    leadScore,
    scoreBreakdown,
    reasons: [...new Set(reasons)],
    nextStep,
    priority,
  }
}

export function describeScoreFactor(key: ScoreFactorKey) {
  return { key, label: SCORE_FACTOR_LABELS[key], max: SCORE_FACTOR_MAX[key] }
}
