import type { Lead } from "@/types"

const legalSuffixes =
  /\b(incorporated|inc|llc|l\.l\.c|ltd|limited|corp|corporation|company|co|plc|gmbh)\b/g

export function normalizeCompanyName(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.[a-z]{2,}$/i, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(legalSuffixes, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizedDomain(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/, 1)[0]
    .trim()
}

function stringSimilarity(left: string, right: string) {
  const a = normalizeCompanyName(left)
  const b = normalizeCompanyName(right)
  if (a === b) return 1
  if (!a || !b) return 0

  const leftTokens = new Set(a.split(" "))
  const rightTokens = new Set(b.split(" "))
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length
  const union = new Set([...leftTokens, ...rightTokens]).size
  const tokenSimilarity = union ? intersection / union : 0
  const containsWholeName = a.includes(b) || b.includes(a)

  const maxLength = Math.max(a.length, b.length)
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row]
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      )
    }
    previous.splice(0, previous.length, ...current)
  }
  const editSimilarity = 1 - previous[b.length] / maxLength
  return Math.max(tokenSimilarity, editSimilarity, containsWholeName ? 0.7 : 0)
}

export function duplicateSimilarity(left: Lead, right: Lead) {
  const leftDomain = normalizedDomain(left.domain)
  const rightDomain = normalizedDomain(right.domain)
  const sameDomain = leftDomain === rightDomain ? 1 : 0
  const nameSimilarity = stringSimilarity(left.companyName, right.companyName)
  const sameLocation = left.location.toLowerCase() === right.location.toLowerCase() ? 1 : 0
  const leftEmailDomain = normalizedDomain(left.email.split("@")[1] ?? "")
  const rightEmailDomain = normalizedDomain(right.email.split("@")[1] ?? "")
  const sameEmailDomain = leftEmailDomain === rightEmailDomain ? 1 : 0

  return (
    Math.round(
      (sameDomain * 0.5 + nameSimilarity * 0.3 + sameLocation * 0.1 + sameEmailDomain * 0.1) * 100,
    ) / 100
  )
}

export function findPotentialDuplicates(leads: Lead[], threshold = 0.85) {
  const pairs: Array<{ left: Lead; right: Lead; similarity: number }> = []
  const byDomain = new Map<string, Lead[]>()

  for (const lead of leads) {
    const domain = normalizedDomain(lead.domain)
    if (!domain) continue
    const group = byDomain.get(domain) ?? []
    group.push(lead)
    byDomain.set(domain, group)
  }

  const candidateIds = new Set<string>()
  for (const group of byDomain.values()) {
    if (group.length > 1) group.forEach((lead) => candidateIds.add(lead.id))
  }

  const candidates =
    candidateIds.size > 0 ? leads.filter((lead) => candidateIds.has(lead.id)) : leads
  const seen = new Set<string>()
  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
      const left = candidates[leftIndex]
      const right = candidates[rightIndex]
      const key = [left.id, right.id].sort().join(":")
      if (seen.has(key)) continue
      seen.add(key)
      const similarity = duplicateSimilarity(left, right)
      if (similarity >= threshold) pairs.push({ left, right, similarity })
    }
  }

  return pairs.sort((a, b) => b.similarity - a.similarity)
}
