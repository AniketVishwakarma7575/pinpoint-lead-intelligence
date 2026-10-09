import Papa from "papaparse"
import type { Lead } from "@/types"

export const exportFieldOptions = [
  ["companyName", "Company"],
  ["domain", "Domain"],
  ["contactName", "Contact name"],
  ["contactTitle", "Contact title"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["industry", "Industry"],
  ["location", "Location"],
  ["employees", "Employees"],
  ["revenue", "Revenue"],
  ["leadScore", "Lead score"],
  ["priority", "Priority"],
  ["emailVerification", "Email verification"],
  ["websiteStatus", "Website status"],
  ["dataCompleteness", "Data completeness"],
  ["createdAt", "Created at"],
] as const

export type ExportField = (typeof exportFieldOptions)[number][0]

export function leadsToCsv(leads: Lead[], fields: ExportField[]) {
  if (leads.length === 0) throw new Error("There are no leads to export.")
  if (fields.length === 0) throw new Error("Select at least one field to export.")
  const labels = new Map<string, string>(exportFieldOptions)
  return Papa.unparse(
    leads.map((lead) =>
      Object.fromEntries(
        fields.map((field) => [
          labels.get(field) ?? field,
          field === "revenue"
            ? lead.revenue
            : field === "employees" || field === "leadScore" || field === "dataCompleteness"
              ? lead[field]
              : lead[field],
        ]),
      ),
    ),
  )
}

export function downloadCsv(contents: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8;" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function parseLeadCsv(file: File) {
  return new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        if (result.errors.length > 0 && result.data.length === 0) {
          reject(new Error(result.errors[0].message))
          return
        }
        resolve(result.data)
      },
      error: (error) => reject(error),
    })
  })
}
