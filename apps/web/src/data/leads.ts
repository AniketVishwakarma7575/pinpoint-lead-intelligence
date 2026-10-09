import { faker } from "@faker-js/faker"
import type {
  DuplicateStatus,
  EmailVerification,
  Lead,
  LeadPriority,
  ReviewItem,
  ReviewType,
  SavedList,
  WebsiteStatus,
} from "@/types"
import { defaultIcpProfile } from "@/types/settings"
import { scoreLead } from "@/utils/scoring"

const industries = [
  "SaaS",
  "Technology",
  "Financial Services",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Education",
  "Professional Services",
]
const cities = [
  "Austin, United States",
  "San Francisco, United States",
  "New York, United States",
  "Chicago, United States",
  "Seattle, United States",
  "Toronto, Canada",
  "Vancouver, Canada",
  "London, United Kingdom",
  "Berlin, Germany",
  "Singapore, Singapore",
]
const technologies = [
  "HubSpot",
  "Salesforce",
  "AWS",
  "Stripe",
  "Snowflake",
  "Segment",
  "Intercom",
  "Datadog",
  "Shopify",
  "Workday",
]
const avatarTones = ["lavender", "peach", "mint", "blue", "rose", "sand"]
const titleOptions = [
  "VP of Operations",
  "Chief Executive Officer",
  "Head of Growth",
  "Director of Marketing",
  "Founder",
  "Sales Manager",
  "Product Lead",
  "Finance Director",
  "VP of Engineering",
]

const timestamp = (daysAgo: number) => new Date(Date.UTC(2026, 9, 9 - daysAgo, 12)).toISOString()

function createLead(
  input: Omit<Lead, "leadScore" | "scoreBreakdown" | "reasons" | "nextStep" | "priority">,
): Lead {
  return scoreLead(input, defaultIcpProfile)
}

function createHeroLeads(): Lead[] {
  const base = {
    contactName: "Sarah Chen",
    contactTitle: "VP of Operations",
    email: "sarah@acme.io",
    phone: "",
    industry: "SaaS",
    location: "Austin, United States",
    experienceYears: 4,
    employees: 862,
    revenue: 378_750_000,
    technologies: ["HubSpot", "Salesforce", "AWS", "Stripe", "Snowflake", "Segment", "Intercom"],
    growthStage: "scaling" as const,
    status: "new" as const,
    emailVerification: "verified" as const,
    websiteStatus: "valid" as const,
    duplicateStatus: "clear" as const,
    dataCompleteness: 94,
    lastVerified: timestamp(1),
    intentSignals: ["Hiring", "Recent funding"],
    createdAt: timestamp(2),
    avatarTone: "lavender",
    hero: true,
  }
  return [
    createLead({
      ...base,
      id: "hero_acme_technologies",
      companyName: "Acme Technologies",
      domain: "acme.io",
    }),
    createLead({
      ...base,
      id: "hero_acme_inc",
      companyName: "Acme Inc.",
      domain: "acme.io",
      contactName: "Jordan Lee",
      contactTitle: "Chief Executive Officer",
      email: "jordan@acme.io",
      employees: 820,
      revenue: 355_000_000,
      duplicateStatus: "possible",
      dataCompleteness: 89,
      hero: true,
    }),
    createLead({
      ...base,
      id: "hero_northstar_risky",
      companyName: "Northstar Analytics",
      domain: "northstar-analytics.example",
      email: "sam@northstar-analytics.example",
      emailVerification: "risky",
      phone: "+1 512 555 0142",
      industry: "Technology",
      employees: 1200,
      revenue: 210_000_000,
      intentSignals: ["Hiring"],
      avatarTone: "blue",
    }),
    createLead({
      ...base,
      id: "hero_cedar_invalid",
      companyName: "Cedar Health Systems",
      domain: "cedar-health.example",
      email: "invalid@cedar-health.example",
      emailVerification: "invalid",
      websiteStatus: "risky",
      phone: "+1 737 555 0115",
      industry: "Healthcare",
      employees: 430,
      revenue: 82_000_000,
      intentSignals: ["New product launch"],
      avatarTone: "mint",
    }),
    createLead({
      ...base,
      id: "hero_lumen_missing",
      companyName: "Lumen Commerce",
      domain: "lumen-commerce.example",
      email: "riley@lumen-commerce.example",
      phone: "",
      industry: "SaaS",
      location: "Austin, United States",
      employees: 700,
      revenue: 280_000_000,
      technologies: technologies.slice(0, 7),
      intentSignals: ["Hiring", "New market"],
      avatarTone: "peach",
    }),
    createLead({
      ...base,
      id: "hero_summit_low",
      companyName: "Summit Office Supply",
      domain: "summit-office.example",
      email: "casey@summit-office.example",
      industry: "Manufacturing",
      location: "Leeds, United Kingdom",
      employees: 28,
      revenue: 1_200_000,
      technologies: ["Workday"],
      growthStage: "early",
      intentSignals: [],
      avatarTone: "sand",
    }),
    createLead({
      ...base,
      id: "hero_bluepeak",
      companyName: "Bluepeak Financial",
      domain: "bluepeak-financial.example",
      email: "taylor@bluepeak-financial.example",
      industry: "Financial Services",
      employees: 960,
      revenue: 190_000_000,
      technologies: ["Salesforce", "Snowflake", "AWS"],
      intentSignals: ["New executive hire"],
      avatarTone: "blue",
    }),
    createLead({
      ...base,
      id: "hero_harbor",
      companyName: "Harbor Learning",
      domain: "harbor-learning.example",
      email: "morgan@harbor-learning.example",
      industry: "Education",
      location: "Toronto, Canada",
      employees: 340,
      revenue: 46_000_000,
      technologies: ["HubSpot", "Intercom", "Segment"],
      intentSignals: ["Hiring", "New product launch"],
      avatarTone: "rose",
    }),
    createLead({
      ...base,
      id: "hero_fieldstone",
      companyName: "Fieldstone Partners",
      domain: "fieldstone-partners.example",
      email: "jamie@fieldstone-partners.example",
      contactTitle: "Managing Partner",
      industry: "SaaS",
      location: "Chicago, United States",
      employees: 862,
      revenue: 378_750_000,
      technologies: technologies.slice(0, 7),
      intentSignals: ["New funding", "Hiring"],
      avatarTone: "sand",
    }),
    createLead({
      ...base,
      id: "hero_cloudline",
      companyName: "Cloudline Systems",
      domain: "cloudline-systems.example",
      email: "avery@cloudline-systems.example",
      industry: "Technology",
      location: "Seattle, United States",
      employees: 1000,
      revenue: 252_500_000,
      technologies: technologies.slice(0, 7),
      intentSignals: ["Hiring", "Recent funding"],
      avatarTone: "lavender",
    }),
    createLead({
      ...base,
      id: "hero_meridian",
      companyName: "Meridian Care",
      domain: "meridian-care.example",
      email: "robin@meridian-care.example",
      industry: "Healthcare",
      location: "New York, United States",
      employees: 780,
      revenue: 126_250_000,
      technologies: ["Salesforce", "Workday"],
      intentSignals: ["New market", "Hiring"],
      avatarTone: "mint",
    }),
    createLead({
      ...base,
      id: "hero_greenwich",
      companyName: "Greenwich Software",
      domain: "greenwich-software.example",
      email: "alex@greenwich-software.example",
      industry: "Technology",
      location: "London, United Kingdom",
      employees: 1025,
      revenue: 252_500_000,
      technologies: technologies.slice(0, 7),
      intentSignals: ["Recent funding", "Hiring"],
      avatarTone: "peach",
    }),
  ]
}

function createGeneratedLeads(): Lead[] {
  faker.seed(20261009)
  const leads: Lead[] = []
  for (let index = 0; index < 1248; index += 1) {
    const targetFitSeed = index < 175
    const companyName = faker.company.name().replace(/[,.]/g, "")
    const domain = `${
      companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `company-${index}`
    }.example`
    const industry = industries[index % industries.length]
    const location = cities[(index * 7 + Math.floor(index / 11)) % cities.length]
    const contactName = faker.person.fullName()
    const emailName = contactName
      .toLowerCase()
      .replace(/[^a-z]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
    const emailVerification: EmailVerification =
      index < 924 ? "verified" : index % 4 === 0 ? "risky" : index % 7 === 0 ? "invalid" : "unknown"
    const websiteStatus: WebsiteStatus =
      index % 17 === 0 ? "invalid" : index % 9 === 0 ? "risky" : "valid"
    const lead = createLead({
      id: `ld_${String(index + 1).padStart(4, "0")}`,
      companyName,
      domain,
      contactName,
      contactTitle: targetFitSeed ? "VP of Operations" : titleOptions[index % titleOptions.length],
      email: `${emailName}@${domain}`,
      phone:
        targetFitSeed || index % 6 !== 0 ? `+1 555 01${String(index % 100).padStart(2, "0")}` : "",
      industry: targetFitSeed ? "SaaS" : industry,
      location: targetFitSeed ? cities[index % 7] : location,
      experienceYears: index % 11,
      employees: targetFitSeed
        ? faker.number.int({ min: 500, max: 900 })
        : faker.number.int({ min: 8, max: 12_000 }),
      revenue: targetFitSeed
        ? faker.number.int({ min: 300_000_000, max: 430_000_000 })
        : faker.number.int({ min: 400_000, max: 2_500_000_000 }),
      technologies: targetFitSeed
        ? technologies.slice(0, 7)
        : faker.helpers.arrayElements(technologies, { min: 1, max: 5 }),
      growthStage: targetFitSeed
        ? "scaling"
        : (["early", "scaling", "established"] as const)[index % 3],
      status: "new",
      emailVerification,
      websiteStatus,
      duplicateStatus: "clear",
      dataCompleteness: faker.number.int({ min: 38, max: 100 }),
      lastVerified: index < 924 ? timestamp(index % 30) : null,
      intentSignals: targetFitSeed
        ? ["Hiring", "Recent funding"]
        : index % 10 < 3
          ? faker.helpers.arrayElements(
              ["Hiring", "Recent funding", "New market", "New product launch"],
              {
                min: 1,
                max: 3,
              },
            )
          : [],
      createdAt: timestamp(index % 90),
      avatarTone: avatarTones[index % avatarTones.length],
    })
    leads.push(lead)
  }

  for (let index = 0; index < 32; index += 1) {
    const primary = leads[index * 2]
    const duplicate = leads[index * 2 + 1]
    leads[index * 2 + 1] = scoreLead(
      {
        ...duplicate,
        companyName: `${primary.companyName} Inc.`,
        domain: primary.domain,
        email: `team@${primary.domain}`,
        location: primary.location,
        duplicateStatus: "possible",
      },
      defaultIcpProfile,
    )
  }

  return leads
}

export const seededLeads = [...createHeroLeads(), ...createGeneratedLeads()]

const reviewDefinitions: Array<{
  type: ReviewType
  count: number
  reason: string
}> = [
  {
    type: "needs_verification",
    count: 41,
    reason: "Confirm email and company website before outreach.",
  },
  { type: "potential_duplicate", count: 33, reason: "A similar company record may already exist." },
  {
    type: "low_data_quality",
    count: 28,
    reason: "Important company or contact details are missing.",
  },
  {
    type: "high_potential_missing_info",
    count: 26,
    reason: "Strong company fit, but one contact detail needs enrichment.",
  },
]

function createReviewItems(): ReviewItem[] {
  let sequence = 0
  const items: ReviewItem[] = []
  for (const { type, count, reason } of reviewDefinitions) {
    for (let index = 0; index < count; index += 1) {
      let lead = seededLeads[(sequence * 13 + index) % seededLeads.length]
      let matchedLead: Lead | undefined

      if (type === "potential_duplicate") {
        if (index === 0) {
          lead = seededLeads.find((candidate) => candidate.id === "hero_acme_technologies")!
          matchedLead = seededLeads.find((candidate) => candidate.id === "hero_acme_inc")
        } else {
          const first = seededLeads[12 + (index - 1) * 2]
          matchedLead = seededLeads[12 + (index - 1) * 2 + 1]
          lead = first
        }
      }

      items.push({
        id: `rv_${String(sequence + 1).padStart(3, "0")}`,
        type,
        leadId: lead.id,
        ...(matchedLead && { matchedLeadId: matchedLead.id }),
        ...(matchedLead && { similarity: type === "potential_duplicate" ? 0.91 : undefined }),
        reason,
        status: "open",
        createdAt: timestamp(sequence % 30),
      })
      sequence += 1
    }
  }
  return items
}

export const seededReviewItems = createReviewItems()

export const seededLists: SavedList[] = [
  {
    id: "list_high_priority",
    name: "High priority accounts",
    description: "Top-scoring prospects ready for focused outreach.",
    leadIds: seededLeads
      .filter((lead) => lead.priority === "high")
      .slice(0, 64)
      .map((lead) => lead.id),
    owner: "Pinpoint demo",
    createdAt: timestamp(6),
  },
  {
    id: "list_verify_before_outreach",
    name: "Verify before outreach",
    description: "Leads that need an email or website check.",
    leadIds: seededReviewItems
      .filter((item) => item.type === "needs_verification")
      .map((item) => item.leadId),
    owner: "Pinpoint demo",
    createdAt: timestamp(4),
  },
  {
    id: "list_acme_demo",
    name: "Acme demo accounts",
    description: "The fictional Acme duplicate pair used in the demo flow.",
    leadIds: ["hero_acme_technologies", "hero_acme_inc"],
    owner: "Pinpoint demo",
    createdAt: timestamp(2),
  },
]

export function applyIcpToLeads(profile: typeof defaultIcpProfile, leads = seededLeads) {
  return leads.map((lead) => scoreLead(lead, profile))
}

export function getPriorityCounts(leads: Lead[]): Record<LeadPriority, number> {
  return leads.reduce(
    (counts, lead) => {
      counts[lead.priority] += 1
      return counts
    },
    { high: 0, medium: 0, low: 0 },
  )
}

export function getVerificationCounts(leads: Lead[]) {
  return leads.reduce(
    (counts, lead) => {
      counts[lead.emailVerification] += 1
      return counts
    },
    { verified: 0, risky: 0, invalid: 0, unknown: 0 },
  )
}

export function leadById(id: string, leads: Lead[] = seededLeads) {
  return leads.find((lead) => lead.id === id)
}

export function reviewTypeForLead(id: string): ReviewType | undefined {
  return seededReviewItems.find((item) => item.leadId === id)?.type
}

export function duplicateStatusForLead(id: string): DuplicateStatus {
  return reviewTypeForLead(id) === "potential_duplicate" ? "possible" : "clear"
}
