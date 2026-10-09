import { z } from "zod"
import type { ScoreFactorKey } from "./index"

export const LeadPrioritySchema = z.enum(["high", "medium", "low"])
export const LeadStatusSchema = z.enum(["new", "contacted", "saved", "archived"])
export const EmailVerificationSchema = z.enum(["verified", "risky", "invalid", "unknown"])
export const WebsiteStatusSchema = z.enum(["valid", "risky", "invalid", "unknown"])
export const ReviewTypeSchema = z.enum([
  "needs_verification",
  "potential_duplicate",
  "low_data_quality",
  "high_potential_missing_info",
])

export const ScoreFactorKeySchema = z.enum([
  "companyFit",
  "revenueFit",
  "companySize",
  "industryFit",
  "contactQuality",
  "technologyFit",
  "intentSignal",
]) satisfies z.ZodType<ScoreFactorKey>

export const LeadSchema = z.object({
  id: z.string().min(1),
  companyName: z.string().min(1),
  domain: z.string().min(1),
  contactName: z.string().min(1),
  contactTitle: z.string(),
  email: z.email(),
  phone: z.string(),
  industry: z.string().min(1),
  location: z.string().min(1),
  employees: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  technologies: z.array(z.string()),
  growthStage: z.enum(["early", "scaling", "established"]),
  leadScore: z.number().int().min(0).max(100),
  scoreBreakdown: z.record(
    ScoreFactorKeySchema,
    z.object({
      score: z.number().nonnegative(),
      max: z.number().positive(),
      reason: z.string(),
    }),
  ),
  reasons: z.array(z.string()),
  nextStep: z.string(),
  priority: LeadPrioritySchema,
  status: LeadStatusSchema,
  emailVerification: EmailVerificationSchema,
  websiteStatus: WebsiteStatusSchema,
  duplicateStatus: z.enum(["possible", "clear", "merged"]),
  dataCompleteness: z.number().int().min(0).max(100),
  lastVerified: z.string().datetime().nullable(),
  intentSignals: z.array(z.string()),
  createdAt: z.string().datetime(),
  avatarTone: z.string(),
  hero: z.boolean().optional(),
})

export const LeadActivitySchema = z.object({
  id: z.string(),
  leadId: z.string(),
  type: z.enum(["imported", "scored", "verified", "saved", "contacted", "merged", "updated"]),
  description: z.string(),
  createdAt: z.string().datetime(),
})

export const LeadListQuerySchema = z.object({
  search: z.string().optional(),
  industries: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  priorities: z.array(LeadPrioritySchema).optional(),
  verification: z.array(EmailVerificationSchema).optional(),
  status: z.array(LeadStatusSchema).optional(),
  sort: z.enum(["leadScore", "companyName", "createdAt", "dataCompleteness"]).default("leadScore"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.number().int().positive().default(1),
  pageSize: z.union([z.literal(25), z.literal(50), z.literal(100)]).default(25),
})

export const PaginatedLeadsSchema = z.object({
  items: z.array(LeadSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
})

export const LeadDetailSchema = LeadSchema.extend({ activity: z.array(LeadActivitySchema) })
export const LeadPatchSchema = z
  .object({
    status: LeadStatusSchema.optional(),
    emailVerification: EmailVerificationSchema.optional(),
    websiteStatus: WebsiteStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0)
export const BulkLeadUpdateRequestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(1500),
  patch: LeadPatchSchema,
})
export const ValidateLeadsRequestSchema = z.object({ ids: z.array(z.string()).min(1).max(100) })
export const ValidateLeadsResponseSchema = z.object({
  jobId: z.string(),
  results: z.array(
    z.object({
      leadId: z.string(),
      email: EmailVerificationSchema,
      website: WebsiteStatusSchema,
      message: z.string(),
    }),
  ),
  verified: z.number().int().nonnegative(),
  risky: z.number().int().nonnegative(),
  invalid: z.number().int().nonnegative(),
})
export const ImportLeadsRequestSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(1500),
})
export const ImportLeadsResponseSchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.array(z.object({ row: z.number().int().positive(), message: z.string() })),
})
export const MergeReviewRequestSchema = z.object({
  reviewItemId: z.string(),
  keepLeadId: z.string(),
  removeLeadId: z.string(),
})
export const DismissReviewRequestSchema = z.object({ reviewItemId: z.string() })
export const ReviewQueueSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      type: ReviewTypeSchema,
      leadId: z.string(),
      matchedLeadId: z.string().optional(),
      similarity: z.number().min(0).max(1).optional(),
      reason: z.string(),
      status: z.enum(["open", "dismissed", "resolved"]),
      createdAt: z.string().datetime(),
    }),
  ),
  counts: z.record(ReviewTypeSchema, z.number().int().nonnegative()),
})
export const SavedListSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  leadIds: z.array(z.string()),
  owner: z.string(),
  createdAt: z.string().datetime(),
})
export const SavedListsSchema = z.array(SavedListSchema)
export const MutationSuccessSchema = z.object({ success: z.boolean() })
export const CreateSavedListSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(240).default(""),
})
export const DashboardStatsSchema = z.object({
  totalLeads: z.number().int().nonnegative(),
  highPriority: z.number().int().nonnegative(),
  verifiedEmails: z.number().int().nonnegative(),
  reviewItems: z.number().int().nonnegative(),
  averageScore: z.number().min(0).max(100),
  weeklyActivity: z.array(
    z.object({ day: z.string(), created: z.number(), qualified: z.number() }),
  ),
  sources: z.array(z.object({ name: z.string(), count: z.number().int().nonnegative() })),
  priorityCounts: z.object({ high: z.number(), medium: z.number(), low: z.number() }),
})

export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
})
