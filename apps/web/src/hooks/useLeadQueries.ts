import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { LeadFilters } from "@/types"
import { leadService } from "@/services/leadService"

export const queryKeys = {
  leads: (filters: LeadFilters) => ["leads", filters] as const,
  lead: (id: string) => ["lead", id] as const,
  stats: ["dashboard-stats"] as const,
  review: ["review-queue"] as const,
  lists: ["saved-lists"] as const,
}

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: queryKeys.leads(filters),
    queryFn: () => leadService.list(filters),
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.lead(id),
    queryFn: () => leadService.get(id),
    enabled: Boolean(id),
  })
}

export function useDashboardStats() {
  return useQuery({ queryKey: queryKeys.stats, queryFn: () => leadService.dashboardStats() })
}

export function useReviewQueue() {
  return useQuery({ queryKey: queryKeys.review, queryFn: () => leadService.getReviewQueue() })
}

export function useSavedLists() {
  return useQuery({ queryKey: queryKeys.lists, queryFn: () => leadService.listLists() })
}

export function useLeadMutations() {
  const queryClient = useQueryClient()
  const refreshLeadData = () => {
    void queryClient.invalidateQueries({ queryKey: ["leads"] })
    void queryClient.invalidateQueries({ queryKey: ["lead"] })
    void queryClient.invalidateQueries({ queryKey: ["all-leads"] })
    void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
    void queryClient.invalidateQueries({ queryKey: queryKeys.review })
  }
  const updateLead = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: unknown }) => leadService.update(id, patch),
    onSuccess: refreshLeadData,
  })
  const dismissReview = useMutation({
    mutationFn: (id: string) => leadService.dismissReview(id),
    onSuccess: refreshLeadData,
  })
  const mergeReview = useMutation({
    mutationFn: ({
      reviewId,
      keepLeadId,
      removeLeadId,
    }: {
      reviewId: string
      keepLeadId: string
      removeLeadId: string
    }) => leadService.mergeReview(reviewId, keepLeadId, removeLeadId),
    onSuccess: refreshLeadData,
  })
  const bulkUpdate = useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch: unknown }) =>
      leadService.bulkUpdate(ids, patch),
    onSuccess: refreshLeadData,
  })
  return { updateLead, dismissReview, mergeReview, bulkUpdate }
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: leadService.createLead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leads"] })
      await queryClient.invalidateQueries({ queryKey: ["all-leads"] })
      await queryClient.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })
}

export function useImportLeads() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: leadService.importLeads,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leads"] })
      await queryClient.invalidateQueries({ queryKey: ["all-leads"] })
      await queryClient.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })
}

export function useValidation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, onProgress }: { ids: string[]; onProgress?: (progress: number) => void }) =>
      leadService.validate(ids, onProgress),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leads"] })
      await queryClient.invalidateQueries({ queryKey: ["lead"] })
      await queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      await queryClient.invalidateQueries({ queryKey: queryKeys.review })
    },
  })
}
