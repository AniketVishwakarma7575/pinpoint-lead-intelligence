import type { Lead, LeadFilters } from "@/types"

export function filterLeads(leads: Lead[], filters: LeadFilters) {
  const query = filters.search?.trim().toLocaleLowerCase() ?? ""
  const filtered = leads.filter((lead) => {
    if (
      query &&
      ![
        lead.companyName,
        lead.domain,
        lead.contactName,
        lead.contactTitle,
        lead.email,
        lead.industry,
        lead.location,
      ].some((value) => value.toLocaleLowerCase().includes(query))
    ) {
      return false
    }
    if (filters.industries?.length && !filters.industries.includes(lead.industry)) return false
    if (filters.locations?.length && !filters.locations.includes(lead.location)) return false
    if (filters.priorities?.length && !filters.priorities.includes(lead.priority)) return false
    if (filters.verification?.length && !filters.verification.includes(lead.emailVerification))
      return false
    if (filters.status?.length && !filters.status.includes(lead.status)) return false
    if (filters.minScore !== undefined && lead.leadScore < filters.minScore) return false
    if (filters.maxScore !== undefined && lead.leadScore > filters.maxScore) return false
    return true
  })

  const field = filters.sort ?? "leadScore"
  const direction = filters.order === "asc" ? 1 : -1
  filtered.sort((a, b) => {
    const left = a[field]
    const right = b[field]
    if (typeof left === "number" && typeof right === "number") return (left - right) * direction
    return String(left).localeCompare(String(right)) * direction
  })
  return filtered
}

export function paginateLeads(leads: Lead[], page = 1, pageSize = 25) {
  const totalPages = Math.ceil(leads.length / pageSize)
  const safePage = Math.min(Math.max(1, page), Math.max(1, totalPages))
  const start = (safePage - 1) * pageSize
  return {
    items: leads.slice(start, start + pageSize),
    total: leads.length,
    page: safePage,
    pageSize,
    totalPages,
  }
}
