import { faker } from "@faker-js/faker"
import { config } from "@/config"
import { seededLeads, seededReviewItems } from "@/data/leads"
import { useAppStore } from "@/stores/appStore"
import {
  ApiErrorSchema,
  BulkLeadUpdateRequestSchema,
  DashboardStatsSchema,
  LeadDetailSchema,
  LeadListQuerySchema,
  LeadPatchSchema,
  LeadSchema,
  ImportLeadsRequestSchema,
  ImportLeadsResponseSchema,
  MutationSuccessSchema,
  PaginatedLeadsSchema,
  ReviewQueueSchema,
  SavedListsSchema,
  ValidateLeadsRequestSchema,
  ValidateLeadsResponseSchema,
} from "@/types/api"
import { defaultIcpProfile } from "@/types/settings"
import type {
  DashboardStats,
  EmailVerification,
  IcpProfile,
  Lead,
  LeadActivity,
  LeadFilters,
  LeadWithActivity,
  PaginatedLeads,
  ReviewItem,
  SavedList,
  ValidationResult,
} from "@/types"
import { findPotentialDuplicates, duplicateSimilarity } from "@/utils/dedupe"
import { filterLeads, paginateLeads } from "@/utils/filtering"
import { scoreLead } from "@/utils/scoring"

let leads = seededLeads.map((lead) => scoreLead(lead, defaultIcpProfile))
let activity: LeadActivity[] = leads.flatMap((lead) => [
  {
    id: `ac_${lead.id}_import`,
    leadId: lead.id,
    type: "imported" as const,
    description: "Lead added to Pinpoint",
    createdAt: lead.createdAt,
  },
  {
    id: `ac_${lead.id}_score`,
    leadId: lead.id,
    type: "scored" as const,
    description: `Lead score calculated: ${lead.leadScore}`,
    createdAt: new Date(new Date(lead.createdAt).getTime() + 60_000).toISOString(),
  },
])
let reviewItems: ReviewItem[] = [...seededReviewItems]
const fixedSources = ["Website", "LinkedIn", "Referral", "Campaign", "Import"]

async function delay() {
  const duration =
    config.mockMinLatencyMs +
    Math.floor(Math.random() * (config.mockMaxLatencyMs - config.mockMinLatencyMs + 1))
  await new Promise((resolve) => setTimeout(resolve, duration))
}

async function request<T>(
  path: string,
  schema: { parse: (value: unknown) => T },
  init?: RequestInit,
) {
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const body: unknown = await response.json()
  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(body)
    throw new Error(
      parsedError.success
        ? parsedError.data.error.message
        : `Request failed with status ${response.status}.`,
    )
  }
  return schema.parse(body)
}

function currentLeads() {
  const { icp, savedLeadIds, contactedLeadIds } = useAppStore.getState()
  return leads.map((lead) => {
    const scored = scoreLead(lead, icp)
    return {
      ...scored,
      status: contactedLeadIds.includes(lead.id)
        ? "contacted"
        : savedLeadIds.includes(lead.id)
          ? "saved"
          : lead.status,
    }
  })
}

function filtersToSearchParams(filters: LeadFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "") continue
    params.set(key, Array.isArray(value) ? value.join(",") : String(value))
  }
  return params
}

export const leadService = {
  async list(filters: LeadFilters = {}): Promise<PaginatedLeads> {
    const parsedFilters = LeadListQuerySchema.parse(filters)
    if (!config.useMockApi) {
      return request(`/api/leads?${filtersToSearchParams(parsedFilters)}`, PaginatedLeadsSchema)
    }
    await delay()
    const matched = filterLeads(currentLeads(), parsedFilters)
    return PaginatedLeadsSchema.parse(
      paginateLeads(matched, parsedFilters.page, parsedFilters.pageSize),
    )
  },

  async listAll(filters: LeadFilters = {}): Promise<Lead[]> {
    const firstPageFilters = LeadListQuerySchema.parse({ ...filters, page: 1, pageSize: 100 })
    if (config.useMockApi) {
      await delay()
      return filterLeads(currentLeads(), firstPageFilters)
    }
    const firstPage = await this.list(firstPageFilters)
    const remainingPages = await Promise.all(
      Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
        this.list({ ...firstPageFilters, page: index + 2 }),
      ),
    )
    return [...firstPage.items, ...remainingPages.flatMap((page) => page.items)]
  },

  async get(id: string): Promise<LeadWithActivity> {
    if (!config.useMockApi) return request(`/api/leads/${encodeURIComponent(id)}`, LeadDetailSchema)
    await delay()
    const lead = currentLeads().find((candidate) => candidate.id === id)
    if (!lead) throw new Error(`Lead "${id}" was not found.`)
    return LeadDetailSchema.parse({
      ...lead,
      activity: activity
        .filter((item) => item.leadId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    })
  },

  async update(id: string, patch: unknown) {
    const validPatch = LeadPatchSchema.parse(patch)
    if (!config.useMockApi) {
      return request(`/api/leads/${encodeURIComponent(id)}`, LeadSchema, {
        method: "PATCH",
        body: JSON.stringify(validPatch),
      })
    }
    await delay()
    const index = leads.findIndex((lead) => lead.id === id)
    if (index < 0) throw new Error(`Lead "${id}" was not found.`)
    leads[index] = scoreLead({ ...leads[index], ...validPatch }, useAppStore.getState().icp)
    activity.push({
      id: faker.string.uuid(),
      leadId: id,
      type: "updated",
      description: "Lead record updated",
      createdAt: new Date().toISOString(),
    })
    return leads[index]
  },

  async bulkUpdate(ids: string[], patch: unknown) {
    const parsed = BulkLeadUpdateRequestSchema.parse({ ids, patch })
    if (!config.useMockApi) {
      return request("/api/leads/bulk-update", MutationSuccessSchema, {
        method: "POST",
        body: JSON.stringify(parsed),
      })
    }
    await delay()
    const knownIds = new Set(leads.map((lead) => lead.id))
    const missingId = parsed.ids.find((id) => !knownIds.has(id))
    if (missingId) throw new Error(`Lead "${missingId}" was not found. No records were changed.`)
    const idsSet = new Set(parsed.ids)
    const timestamp = new Date().toISOString()
    leads = leads.map((lead) =>
      idsSet.has(lead.id)
        ? scoreLead({ ...lead, ...parsed.patch }, useAppStore.getState().icp)
        : lead,
    )
    parsed.ids.forEach((leadId) =>
      activity.push({
        id: faker.string.uuid(),
        leadId,
        type: "updated",
        description: "Lead updated with a bulk action",
        createdAt: timestamp,
      }),
    )
    return { success: true }
  },

  async dashboardStats(): Promise<DashboardStats> {
    if (!config.useMockApi) return request("/api/dashboard/stats", DashboardStatsSchema)
    await delay()
    const allLeads = currentLeads()
    const priorityCounts = allLeads.reduce(
      (counts, lead) => {
        counts[lead.priority] += 1
        return counts
      },
      { high: 0, medium: 0, low: 0 },
    )
    const verifiedEmails = allLeads.filter((lead) => lead.emailVerification === "verified").length
    const openReviews = reviewItems.filter(
      (item) =>
        item.status === "open" && !useAppStore.getState().dismissedReviewIds.includes(item.id),
    )
    const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
      const dayDate = new Date(2026, 9, 3 + index)
      const key = dayDate.toLocaleDateString("en-US", { weekday: "short" })
      const start = new Date(dayDate.setHours(0, 0, 0, 0)).getTime()
      return {
        day: key,
        created: allLeads.filter((lead) => new Date(lead.createdAt).getTime() >= start).length,
        qualified: allLeads.filter(
          (lead) => new Date(lead.createdAt).getTime() >= start && lead.priority === "high",
        ).length,
      }
    })
    const sourceCounts = new Map<string, number>()
    allLeads.forEach((_, index) => {
      const source = fixedSources[index % fixedSources.length]
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1)
    })
    const stats = {
      totalLeads: allLeads.length,
      highPriority: priorityCounts.high,
      verifiedEmails,
      reviewItems: openReviews.length,
      averageScore: Math.round(
        allLeads.reduce((sum, lead) => sum + lead.leadScore, 0) / Math.max(1, allLeads.length),
      ),
      weeklyActivity,
      sources: [...sourceCounts].map(([name, count]) => ({ name, count })),
      priorityCounts,
    }
    return DashboardStatsSchema.parse(stats)
  },

  async getReviewQueue(): Promise<{ items: ReviewItem[]; counts: Record<string, number> }> {
    if (!config.useMockApi) return request("/api/review-queue", ReviewQueueSchema)
    await delay()
    const dismissed = useAppStore.getState().dismissedReviewIds
    const items = reviewItems.filter(
      (item) => item.status === "open" && !dismissed.includes(item.id),
    )
    const counts = items.reduce(
      (result, item) => {
        result[item.type] = (result[item.type] ?? 0) + 1
        return result
      },
      {
        needs_verification: 0,
        potential_duplicate: 0,
        low_data_quality: 0,
        high_potential_missing_info: 0,
      } as Record<string, number>,
    )
    return ReviewQueueSchema.parse({ items, counts })
  },

  async dismissReview(reviewId: string) {
    if (!config.useMockApi) {
      await request("/api/review/dismiss", MutationSuccessSchema, {
        method: "POST",
        body: JSON.stringify({ reviewItemId: reviewId }),
      })
      return
    }
    await delay()
    if (!reviewItems.some((item) => item.id === reviewId && item.status === "open")) {
      throw new Error("This review item is no longer available.")
    }
    useAppStore.getState().dismissReview(reviewId)
  },

  async mergeReview(reviewId: string, keepLeadId: string, removeLeadId: string) {
    if (!config.useMockApi) {
      await request("/api/review/merge", MutationSuccessSchema, {
        method: "POST",
        body: JSON.stringify({ reviewItemId: reviewId, keepLeadId, removeLeadId }),
      })
      return
    }
    await delay()
    const review = reviewItems.find((item) => item.id === reviewId && item.status === "open")
    if (!review || review.type !== "potential_duplicate") {
      throw new Error("This duplicate review is no longer available.")
    }
    const keep = leads.find((lead) => lead.id === keepLeadId)
    const remove = leads.find((lead) => lead.id === removeLeadId)
    if (!keep || !remove || keepLeadId === removeLeadId)
      throw new Error("Choose two valid lead records.")

    const merged = scoreLead(
      {
        ...keep,
        contactName: keep.contactName || remove.contactName,
        contactTitle: keep.contactTitle || remove.contactTitle,
        email: keep.email || remove.email,
        phone: keep.phone || remove.phone,
        technologies: [...new Set([...keep.technologies, ...remove.technologies])],
        intentSignals: [...new Set([...keep.intentSignals, ...remove.intentSignals])],
        dataCompleteness: Math.max(keep.dataCompleteness, remove.dataCompleteness),
        duplicateStatus: "merged",
      },
      useAppStore.getState().icp,
    )
    leads = leads
      .filter((lead) => lead.id !== removeLeadId)
      .map((lead) => (lead.id === keepLeadId ? merged : lead))
    reviewItems = reviewItems.map((item) =>
      item.id === reviewId ? { ...item, status: "resolved" as const } : item,
    )
    useAppStore.getState().replaceMergedLead(removeLeadId, keepLeadId)
    activity.push({
      id: faker.string.uuid(),
      leadId: keepLeadId,
      type: "merged",
      description: `Merged duplicate record ${remove.companyName}`,
      createdAt: new Date().toISOString(),
    })
  },

  async validate(ids: string[], onProgress?: (progress: number) => void) {
    const parsed = ValidateLeadsRequestSchema.parse({ ids })
    if (!config.useMockApi) {
      const response = await request("/api/leads/validate", ValidateLeadsResponseSchema, {
        method: "POST",
        body: JSON.stringify(parsed),
      })
      return response
    }

    for (const leadId of ids) {
      if (!leads.some((lead) => lead.id === leadId))
        throw new Error(`Lead "${leadId}" was not found.`)
    }
    for (const progress of [12, 27, 45, 62, 79, 100]) {
      await new Promise((resolve) => setTimeout(resolve, 220))
      onProgress?.(progress)
    }

    const results: ValidationResult[] = ids.map((id) => {
      const lead = leads.find((candidate) => candidate.id === id)!
      const email =
        lead.emailVerification === "unknown"
          ? deterministicEmailResult(lead.email)
          : lead.emailVerification
      const website = lead.websiteStatus === "unknown" ? "valid" : lead.websiteStatus
      return {
        leadId: id,
        email,
        website,
        message:
          email === "verified"
            ? "Email domain and company website checks passed."
            : email === "risky"
              ? "Mailbox could not be confirmed; review before outreach."
              : "Email address failed validation.",
      }
    })
    leads = leads.map((lead) => {
      const result = results.find((item) => item.leadId === lead.id)
      return result
        ? scoreLead(
            {
              ...lead,
              emailVerification: result.email,
              websiteStatus: result.website,
              lastVerified: new Date().toISOString(),
            },
            useAppStore.getState().icp,
          )
        : lead
    })
    results.forEach((result) =>
      activity.push({
        id: faker.string.uuid(),
        leadId: result.leadId,
        type: "verified",
        description: `Validation completed: ${result.email}`,
        createdAt: new Date().toISOString(),
      }),
    )
    const count = (value: EmailVerification) =>
      results.filter((item) => item.email === value).length
    return ValidateLeadsResponseSchema.parse({
      jobId: `job_${faker.string.alphanumeric(10)}`,
      results,
      verified: count("verified"),
      risky: count("risky") + count("unknown"),
      invalid: count("invalid"),
    })
  },

  async importLeads(rows: Array<Record<string, unknown>>) {
    const parsedRequest = ImportLeadsRequestSchema.parse({ rows })
    if (!config.useMockApi) {
      return request("/api/leads/import", ImportLeadsResponseSchema, {
        method: "POST",
        body: JSON.stringify(parsedRequest),
      })
    }
    await delay()
    const now = new Date().toISOString()
    const errors: Array<{ row: number; message: string }> = []
    const imported: Lead[] = []
    const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "")
    rows.forEach((row, index) => {
      const normalizedRow = new Map(
        Object.entries(row).map(([key, value]) => [normalizeKey(key), value]),
      )
      const value = (...keys: string[]) =>
        keys.map((key) => normalizedRow.get(normalizeKey(key))).find((item) => item !== undefined)
      const companyName = String(value("companyName", "company") ?? "").trim()
      const contactName = String(value("contactName", "contact", "name") ?? "").trim()
      const email = String(value("email") ?? "")
        .trim()
        .toLowerCase()
      if (!companyName || !contactName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({
          row: index + 2,
          message: "Company, contact name and a valid email are required.",
        })
        return
      }
      const rawEmployees = value("employees", "employeeCount")
      const rawRevenue = value("revenue", "annualRevenue")
      const employees = rawEmployees === undefined || rawEmployees === "" ? 0 : Number(rawEmployees)
      const revenue = rawRevenue === undefined || rawRevenue === "" ? 0 : Number(rawRevenue)
      if (
        !Number.isFinite(employees) ||
        employees < 0 ||
        !Number.isFinite(revenue) ||
        revenue < 0
      ) {
        errors.push({
          row: index + 2,
          message: "Employee count and revenue must be non-negative numbers.",
        })
        return
      }
      const domain = String(value("domain", "website") ?? email.split("@")[1] ?? "")
      const base: Omit<Lead, "leadScore" | "scoreBreakdown" | "reasons" | "nextStep" | "priority"> =
        {
          id: `import_${faker.string.uuid()}`,
          companyName,
          domain,
          contactName,
          contactTitle: String(value("contactTitle", "title", "jobTitle") ?? ""),
          email,
          phone: String(value("phone", "telephone") ?? ""),
          industry: String(value("industry", "sector") ?? "Technology"),
          location: String(value("location", "region") ?? "Not specified"),
          employees,
          revenue,
          technologies: String(value("technologies", "technology", "techStack") ?? "")
            .split(/[;,]/)
            .map((value) => value.trim())
            .filter(Boolean),
          growthStage: "scaling",
          status: "new" as const,
          emailVerification: "unknown" as const,
          websiteStatus: "unknown" as const,
          duplicateStatus: "clear" as const,
          dataCompleteness: 60,
          lastVerified: null,
          intentSignals: [],
          createdAt: now,
          avatarTone: "blue",
        }
      imported.push(scoreLead(base, useAppStore.getState().icp))
    })

    if (imported.length) {
      const combined = [...imported, ...leads]
      const importedIds = new Set(imported.map((lead) => lead.id))
      const duplicatePairs = findPotentialDuplicates(combined, 0.85).filter(
        ({ left, right }) => importedIds.has(left.id) || importedIds.has(right.id),
      )
      const duplicateIds = new Set(duplicatePairs.flatMap(({ left, right }) => [left.id, right.id]))
      leads = combined.map((lead) =>
        duplicateIds.has(lead.id) ? { ...lead, duplicateStatus: "possible" as const } : lead,
      )
      reviewItems = [
        ...reviewItems,
        ...duplicatePairs.map(({ left, right, similarity }) => {
          const importedLead = importedIds.has(left.id) ? left : right
          const matchedLead = importedLead.id === left.id ? right : left
          return {
            id: `rv_import_${faker.string.alphanumeric(12)}`,
            type: "potential_duplicate" as const,
            leadId: importedLead.id,
            matchedLeadId: matchedLead.id,
            similarity,
            reason: "A similar company record may already exist.",
            status: "open" as const,
            createdAt: now,
          }
        }),
      ]
      imported.forEach((lead) =>
        activity.push({
          id: faker.string.uuid(),
          leadId: lead.id,
          type: "imported",
          description: "Lead imported from CSV",
          createdAt: now,
        }),
      )
    }
    return ImportLeadsResponseSchema.parse({
      imported: imported.length,
      skipped: errors.length,
      errors,
    })
  },

  async createLead(
    lead: Omit<Lead, "id" | "leadScore" | "scoreBreakdown" | "reasons" | "nextStep" | "priority">,
  ) {
    if (!config.useMockApi) {
      return request("/api/leads", LeadSchema, {
        method: "POST",
        body: JSON.stringify(lead),
      })
    }
    await delay()
    const scored = scoreLead(
      {
        ...lead,
        id: `lead_${faker.string.uuid()}`,
      },
      useAppStore.getState().icp,
    )
    const valid = LeadSchema.parse(scored)
    leads = [valid, ...leads]
    activity.push({
      id: faker.string.uuid(),
      leadId: valid.id,
      type: "imported",
      description: "Lead manually added",
      createdAt: valid.createdAt,
    })
    return valid
  },

  async listLists(): Promise<SavedList[]> {
    if (!config.useMockApi) return request("/api/lists", SavedListsSchema)
    await delay()
    return useAppStore.getState().savedLists
  },

  async duplicateCandidates() {
    await delay()
    return findPotentialDuplicates(currentLeads(), 0.85)
  },

  async duplicateSimilarity(leftId: string, rightId: string) {
    const all = currentLeads()
    const left = all.find((lead) => lead.id === leftId)
    const right = all.find((lead) => lead.id === rightId)
    if (!left || !right) throw new Error("Both leads must exist to compare duplicates.")
    return duplicateSimilarity(left, right)
  },
}

function deterministicEmailResult(email: string): EmailVerification {
  const score = [...email].reduce((total, character) => total + character.charCodeAt(0), 0) % 11
  return score < 7 ? "verified" : score < 10 ? "risky" : "invalid"
}

export function recalculateSeededScores(profile: IcpProfile) {
  leads = leads.map((lead) => scoreLead(lead, profile))
}
