export type LeadPriority = "high" | "medium" | "low"
export type LeadStatus = "new" | "contacted" | "saved" | "archived"
export type EmailVerification = "verified" | "risky" | "invalid" | "unknown"
export type WebsiteStatus = "valid" | "risky" | "invalid" | "unknown"
export type DuplicateStatus = "possible" | "clear" | "merged"
export type ReviewType =
  "needs_verification" | "potential_duplicate" | "low_data_quality" | "high_potential_missing_info"

export type ScoreFactorKey =
  | "companyFit"
  | "revenueFit"
  | "companySize"
  | "industryFit"
  | "contactQuality"
  | "technologyFit"
  | "intentSignal"

export type ScoreBreakdown = Record<ScoreFactorKey, { score: number; max: number; reason: string }>

export type IcpProfile = {
  weights: Record<ScoreFactorKey, number>
  industries: string[]
  minEmployees: number
  maxEmployees: number
  minRevenue: number
  maxRevenue: number
  regions: string[]
  technologies: string[]
}

export type Lead = {
  id: string
  companyName: string
  domain: string
  contactName: string
  contactTitle: string
  email: string
  phone: string
  industry: string
  location: string
  experienceYears?: number
  employees: number
  revenue: number
  technologies: string[]
  growthStage: "early" | "scaling" | "established"
  leadScore: number
  scoreBreakdown: ScoreBreakdown
  reasons: string[]
  nextStep: string
  priority: LeadPriority
  status: LeadStatus
  emailVerification: EmailVerification
  websiteStatus: WebsiteStatus
  duplicateStatus: DuplicateStatus
  dataCompleteness: number
  lastVerified: string | null
  intentSignals: string[]
  createdAt: string
  avatarTone: string
  hero?: boolean
}

export type LeadActivity = {
  id: string
  leadId: string
  type: "imported" | "scored" | "verified" | "saved" | "contacted" | "merged" | "updated"
  description: string
  createdAt: string
}

export type LeadWithActivity = Lead & { activity: LeadActivity[] }

export type LeadFilters = {
  search?: string
  industries?: string[]
  locations?: string[]
  minScore?: number
  maxScore?: number
  priorities?: LeadPriority[]
  verification?: EmailVerification[]
  status?: LeadStatus[]
  sort?: "leadScore" | "companyName" | "createdAt" | "dataCompleteness"
  order?: "asc" | "desc"
  page?: number
  pageSize?: 25 | 50 | 100
}

export type PaginatedLeads = {
  items: Lead[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ReviewItem = {
  id: string
  type: ReviewType
  leadId: string
  matchedLeadId?: string
  similarity?: number
  reason: string
  status: "open" | "dismissed" | "resolved"
  createdAt: string
}

export type SavedList = {
  id: string
  name: string
  description: string
  leadIds: string[]
  owner: string
  createdAt: string
}

export type ValidationResult = {
  leadId: string
  email: EmailVerification
  website: WebsiteStatus
  message: string
}

export type DashboardStats = {
  totalLeads: number
  highPriority: number
  verifiedEmails: number
  reviewItems: number
  averageScore: number
  weeklyActivity: Array<{ day: string; created: number; qualified: number }>
  sources: Array<{ name: string; count: number }>
  priorityCounts: Record<LeadPriority, number>
}

export const SCORE_FACTOR_LABELS: Record<ScoreFactorKey, string> = {
  companyFit: "Company Fit",
  revenueFit: "Revenue Fit",
  companySize: "Company Size",
  industryFit: "Industry Fit",
  contactQuality: "Contact Quality",
  technologyFit: "Technology Fit",
  intentSignal: "Intent Signal",
}

export const SCORE_FACTOR_MAX: Record<ScoreFactorKey, number> = {
  companyFit: 25,
  revenueFit: 20,
  companySize: 15,
  industryFit: 15,
  contactQuality: 10,
  technologyFit: 10,
  intentSignal: 5,
}
