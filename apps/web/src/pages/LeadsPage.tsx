import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Filter,
  MailCheck,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  UserRoundCheck,
  X,
} from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"
import { Avatar, PriorityPill, ScoreBadge, VerificationPill } from "@/components/common/LeadVisuals"
import { ErrorPanel, LoadingPanel, PageHeader } from "@/components/common/PageHeader"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useCreateLead,
  useImportLeads,
  useLeads,
  useLeadMutations,
  useValidation,
} from "@/hooks/useLeadQueries"
import { seededLeads } from "@/data/leads"
import type { Lead, LeadFilters, LeadPriority } from "@/types"
import { leadService } from "@/services/leadService"
import {
  downloadCsv,
  exportFieldOptions,
  leadsToCsv,
  parseLeadCsv,
  type ExportField,
} from "@/utils/csv"
import { useAppStore } from "@/stores/appStore"

const priorities: Array<LeadPriority | "all"> = ["all", "high", "medium", "low"]
const industries = [...new Set(seededLeads.map((lead) => lead.industry))].sort()
const locations = [...new Set(seededLeads.map((lead) => lead.location))].sort()
const statuses = ["new", "contacted", "saved", "archived"] as const
const columnOptions = [
  ["contact", "Contact"],
  ["industry", "Industry / location"],
  ["score", "Score"],
  ["priority", "Priority"],
  ["email", "Email"],
  ["status", "Status"],
] as const
type LeadColumn = (typeof columnOptions)[number][0]
const emptyLeads: Lead[] = []
const emptyLead: Omit<
  Lead,
  "id" | "leadScore" | "scoreBreakdown" | "reasons" | "nextStep" | "priority"
> = {
  companyName: "",
  domain: "",
  contactName: "",
  contactTitle: "",
  email: "",
  phone: "",
  industry: "SaaS",
  location: "",
  employees: 0,
  revenue: 0,
  technologies: [],
  growthStage: "scaling",
  status: "new",
  emailVerification: "unknown",
  websiteStatus: "unknown",
  duplicateStatus: "clear",
  dataCompleteness: 50,
  lastVerified: null,
  intentSignals: [],
  createdAt: "",
  avatarTone: "blue",
}

function filterFromParams(params: URLSearchParams): LeadFilters {
  const priority = params.get("priority")
  const verification = params.get("verification")
  const industry = params.get("industry")
  const location = params.get("location")
  const status = params.get("status")
  const minScore = params.get("minScore")
  const sort = params.get("sort")
  const order = params.get("order")
  const size = Number(params.get("pageSize"))
  return {
    search: params.get("q") || undefined,
    priorities:
      priority && priorities.includes(priority as LeadPriority) && priority !== "all"
        ? [priority as LeadPriority]
        : undefined,
    verification:
      verification && ["verified", "risky", "invalid", "unknown"].includes(verification)
        ? [verification as NonNullable<LeadFilters["verification"]>[number]]
        : undefined,
    industries: industry ? [industry] : undefined,
    locations: location ? [location] : undefined,
    status:
      status && statuses.includes(status as (typeof statuses)[number])
        ? [status as (typeof statuses)[number]]
        : undefined,
    minScore: minScore && Number.isFinite(Number(minScore)) ? Number(minScore) : undefined,
    sort:
      sort === "companyName" || sort === "createdAt" || sort === "dataCompleteness"
        ? sort
        : "leadScore",
    order: order === "asc" ? "asc" : "desc",
    page: Math.max(1, Number(params.get("page")) || 1),
    pageSize: size === 50 || size === 100 ? size : 25,
  }
}

function previewImportRow(row: Record<string, unknown>) {
  const values = new Map(
    Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ""), value]),
  )
  const get = (...keys: string[]) =>
    keys
      .map((key) => values.get(key.toLowerCase().replace(/[^a-z0-9]/g, "")))
      .find((value) => value !== undefined)
  const company = String(get("companyName", "company") ?? "").trim()
  const contact = String(get("contactName", "contact", "name") ?? "").trim()
  const email = String(get("email") ?? "").trim()
  const employees = get("employees", "employeeCount")
  const revenue = get("revenue", "annualRevenue")
  const numericValuesValid = [employees, revenue].every(
    (value) =>
      value === undefined || value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
  )
  return {
    company,
    contact,
    email,
    industry: String(get("industry", "sector") ?? "Technology"),
    valid:
      Boolean(company && contact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) && numericValuesValid,
  }
}

export default function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialFilters = filterFromParams(searchParams)
  const [filters, setFilters] = useState<LeadFilters>(initialFilters)
  const [searchDraft, setSearchDraft] = useState(initialFilters.search ?? "")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [visibleColumns, setVisibleColumns] = useState<LeadColumn[]>(
    columnOptions.map(([column]) => column),
  )
  const [showAdd, setShowAdd] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showImportPreview, setShowImportPreview] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [importRows, setImportRows] = useState<Array<Record<string, unknown>>>([])
  const [selectionBusy, setSelectionBusy] = useState(false)
  const [exportScope, setExportScope] = useState<"filtered" | "selected" | "all">("filtered")
  const [exportFields, setExportFields] = useState<ExportField[]>([
    "companyName",
    "domain",
    "contactName",
    "contactTitle",
    "email",
    "phone",
    "industry",
    "location",
    "leadScore",
    "priority",
  ])
  const [newLead, setNewLead] = useState(emptyLead)
  const [validationProgress, setValidationProgress] = useState(0)
  const [validationMessage, setValidationMessage] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)
  const saveLead = useAppStore((state) => state.toggleSavedLead)
  const saveLeads = useAppStore((state) => state.saveLeads)
  const savedIds = useAppStore((state) => state.savedLeadIds)
  const markContactedMany = useAppStore((state) => state.markContactedMany)
  const query = useLeads(filters)
  const mutations = useLeadMutations()
  const createLead = useCreateLead()
  const importLeads = useImportLeads()
  const validation = useValidation()
  const leads = query.data?.items ?? emptyLeads
  const selectedOnPage = useMemo(
    () => leads.filter((lead) => selectedIds.includes(lead.id)).length,
    [leads, selectedIds],
  )
  const importValidCount = importRows.filter((row) => previewImportRow(row).valid).length

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchDraft.trim() || undefined, page: 1 }))
    }, 220)
    return () => window.clearTimeout(timer)
  }, [searchDraft])

  useEffect(() => {
    const next = new URLSearchParams()
    if (filters.search) next.set("q", filters.search)
    if (filters.priorities?.length) next.set("priority", filters.priorities[0])
    if (filters.verification?.length) next.set("verification", filters.verification[0])
    if (filters.industries?.length) next.set("industry", filters.industries[0])
    if (filters.locations?.length) next.set("location", filters.locations[0])
    if (filters.status?.length) next.set("status", filters.status[0])
    if (filters.minScore !== undefined) next.set("minScore", String(filters.minScore))
    if (filters.page && filters.page > 1) next.set("page", String(filters.page))
    if (filters.pageSize !== 25) next.set("pageSize", String(filters.pageSize))
    if (filters.sort !== "leadScore") next.set("sort", filters.sort ?? "leadScore")
    if (filters.order !== "desc") next.set("order", filters.order ?? "desc")
    setSearchParams(next, { replace: true })
  }, [filters, setSearchParams])

  function updateFilters(patch: Partial<LeadFilters>) {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }))
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id],
    )
  }

  function togglePageSelection() {
    const pageIds = leads.map((lead) => lead.id)
    setSelectedIds((current) =>
      pageIds.every((id) => current.includes(id))
        ? current.filter((id) => !pageIds.includes(id))
        : [...new Set([...current, ...pageIds])],
    )
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const rows = await parseLeadCsv(file)
      if (rows.length === 0) throw new Error("The CSV file does not contain any data rows.")
      setImportRows(rows)
      setShowImportPreview(true)
    } catch (error) {
      toast.error("Import preview failed", {
        description: error instanceof Error ? error.message : "Check the CSV file and try again.",
      })
    } finally {
      event.target.value = ""
    }
  }

  async function confirmImport() {
    try {
      const result = await importLeads.mutateAsync(importRows)
      if (result.imported === 0 && result.skipped > 0) {
        toast.error("No leads were imported", {
          description: `First issue: row ${result.errors[0]?.row ?? "—"} — ${result.errors[0]?.message ?? "Check the CSV data."}`,
        })
      } else {
        toast.success(`${result.imported} leads imported`, {
          description: result.skipped
            ? `${result.skipped} rows skipped. First issue: row ${result.errors[0]?.row ?? "—"} — ${result.errors[0]?.message ?? "Check the CSV data."}`
            : undefined,
        })
      }
      if (result.errors.length) console.warn("Some CSV rows could not be imported.", result.errors)
      setShowImportPreview(false)
      setImportRows([])
    } catch (error) {
      toast.error("Import failed", {
        description: error instanceof Error ? error.message : "Check the CSV file and try again.",
      })
    }
  }

  async function selectAllMatching() {
    setSelectionBusy(true)
    try {
      const matching = await leadService.listAll({
        ...filters,
        page: 1,
        pageSize: 100,
      })
      setSelectedIds(matching.map((lead) => lead.id))
      toast.success(`${matching.length.toLocaleString()} matching leads selected.`)
    } catch (error) {
      toast.error("Could not select all matching leads", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setSelectionBusy(false)
    }
  }

  async function handleAddLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await createLead.mutateAsync({
        ...newLead,
        createdAt: new Date().toISOString(),
      })
      toast.success(`${newLead.companyName} was added to your leads.`)
      setShowAdd(false)
      setNewLead(emptyLead)
    } catch (error) {
      toast.error("Lead could not be added", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    }
  }

  async function handleExport() {
    try {
      const baseFilters: LeadFilters =
        exportScope === "all"
          ? { sort: filters.sort, order: filters.order, pageSize: 100 }
          : { ...filters, page: 1, pageSize: 100 }
      const records = await leadService.listAll(baseFilters)
      const chosen =
        exportScope === "selected"
          ? records.filter((lead) => selectedIds.includes(lead.id))
          : records
      if (chosen.length === 0) throw new Error("No leads match the selected export scope.")
      downloadCsv(
        leadsToCsv(chosen, exportFields),
        `pinpoint-leads-${new Date().toISOString().slice(0, 10)}.csv`,
      )
      toast.success(`${chosen.length.toLocaleString()} leads exported.`)
      setShowExport(false)
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    }
  }

  async function handleValidate() {
    if (!selectedIds.length) return
    setValidationProgress(0)
    setValidationMessage("Checking email and website signals...")
    setShowValidation(true)
    try {
      const result = await validation.mutateAsync({
        ids: selectedIds.slice(0, 100),
        onProgress: setValidationProgress,
      })
      setValidationMessage(
        `${result.verified} verified · ${result.risky} need review · ${result.invalid} invalid`,
      )
      toast.success("Validation finished", {
        description: `${result.verified} verified, ${result.risky} risky, ${result.invalid} invalid.`,
      })
    } catch (error) {
      setValidationMessage(error instanceof Error ? error.message : "Validation failed.")
      toast.error("Validation failed", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    }
  }

  async function handleBulkContact() {
    try {
      await mutations.bulkUpdate.mutateAsync({
        ids: selectedIds,
        patch: { status: "contacted" },
      })
      markContactedMany(selectedIds)
      toast.success(`${selectedIds.length} leads marked as contacted.`)
      setSelectedIds([])
    } catch (error) {
      toast.error("Some leads could not be updated", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    }
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <>
      <PageHeader
        actions={
          <>
            <input
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleImport}
              ref={fileInput}
              type="file"
            />
            <button
              className="product-button product-button-secondary"
              onClick={() => fileInput.current?.click()}
              type="button"
            >
              <FileUp size={15} /> Import CSV
            </button>
            <button
              className="product-button product-button-primary"
              onClick={() => setShowAdd(true)}
              type="button"
            >
              <Plus size={15} /> Add lead
            </button>
          </>
        }
        description="Search, qualify and organize prospects with transparent scoring."
        eyebrow="PROSPECT DATABASE"
        title="All leads"
      />

      <section aria-label="Lead database summary" className="product-metric-grid leads-summary">
        <div>
          <strong>{query.data?.total.toLocaleString() ?? "—"}</strong>
          <span>matching leads</span>
        </div>
        <div>
          <strong>
            {query.data ? query.data.items.filter((lead) => lead.priority === "high").length : "—"}
          </strong>
          <span>high priority on this page</span>
        </div>
        <div>
          <strong>{selectedIds.length}</strong>
          <span>selected</span>
        </div>
      </section>

      <section className="product-panel leads-workspace">
        <div className="leads-toolbar">
          <form className="leads-search" onSubmit={submitFilters}>
            <Search size={16} />
            <input
              aria-label="Search leads"
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search company, contact, domain..."
              value={searchDraft}
            />
            {searchDraft && (
              <button aria-label="Clear search" onClick={() => setSearchDraft("")} type="button">
                <X size={14} />
              </button>
            )}
          </form>
          <label className="leads-select-filter">
            <Filter size={14} />
            <select
              aria-label="Filter by industry"
              onChange={(event) =>
                updateFilters({ industries: event.target.value ? [event.target.value] : undefined })
              }
              value={filters.industries?.[0] ?? ""}
            >
              <option value="">All industries</option>
              {industries.map((industry) => (
                <option key={industry}>{industry}</option>
              ))}
            </select>
          </label>
          <label className="leads-select-filter">
            <MailCheck size={14} />
            <select
              aria-label="Filter by email verification"
              onChange={(event) =>
                updateFilters({
                  verification: event.target.value
                    ? [event.target.value as NonNullable<LeadFilters["verification"]>[number]]
                    : undefined,
                })
              }
              value={filters.verification?.[0] ?? ""}
            >
              <option value="">Any email status</option>
              <option value="verified">Verified</option>
              <option value="risky">Risky</option>
              <option value="invalid">Invalid</option>
              <option value="unknown">Unverified</option>
            </select>
          </label>
          <label className="leads-select-filter">
            <Users size={14} />
            <select
              aria-label="Filter by location"
              onChange={(event) =>
                updateFilters({ locations: event.target.value ? [event.target.value] : undefined })
              }
              value={filters.locations?.[0] ?? ""}
            >
              <option value="">All locations</option>
              {locations.map((location) => (
                <option key={location}>{location}</option>
              ))}
            </select>
          </label>
          <label className="leads-select-filter">
            <UserRoundCheck size={14} />
            <select
              aria-label="Filter by lead status"
              onChange={(event) =>
                updateFilters({
                  status: event.target.value
                    ? [event.target.value as NonNullable<LeadFilters["status"]>[number]]
                    : undefined,
                })
              }
              value={filters.status?.[0] ?? ""}
            >
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status[0].toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="leads-score-filter">
            <SlidersHorizontal size={14} />
            <span>Score ≥</span>
            <input
              aria-label="Minimum lead score"
              max={100}
              min={0}
              onChange={(event) =>
                updateFilters({
                  minScore: event.target.value ? Number(event.target.value) : undefined,
                })
              }
              type="number"
              value={filters.minScore ?? ""}
            />
          </label>
          <button
            className="product-button product-button-secondary leads-export-button"
            onClick={() => setShowExport(true)}
            type="button"
          >
            <Download size={15} /> Export
          </button>
          <details className="column-visibility">
            <summary>
              <SlidersHorizontal size={14} /> Columns
            </summary>
            <div className="column-visibility-options">
              {columnOptions.map(([column, label]) => (
                <label key={column}>
                  <input
                    checked={visibleColumns.includes(column)}
                    onChange={() =>
                      setVisibleColumns((current) =>
                        current.includes(column)
                          ? current.filter((item) => item !== column)
                          : [...current, column],
                      )
                    }
                    type="checkbox"
                  />
                  {label}
                </label>
              ))}
            </div>
          </details>
        </div>

        <div aria-label="Filter by priority" className="leads-priority-tabs">
          {priorities.map((priority) => (
            <button
              className={(filters.priorities?.[0] ?? "all") === priority ? "is-active" : ""}
              key={priority}
              onClick={() =>
                updateFilters({ priorities: priority === "all" ? undefined : [priority] })
              }
              type="button"
            >
              {priority === "all" ? (
                "All priorities"
              ) : (
                <>
                  <i
                    className={`priority-dot priority-${priority === "high" ? "gold" : priority === "medium" ? "blue" : "slate"}`}
                  />
                  {priority[0].toUpperCase() + priority.slice(1)}
                </>
              )}
            </button>
          ))}
        </div>

        {selectedIds.length > 0 && (
          <div className="leads-bulkbar" role="region" aria-label="Bulk actions">
            <strong>{selectedIds.length} selected</strong>
            <button
              onClick={() => {
                saveLeads(selectedIds)
                toast.success(`${selectedIds.length} leads saved.`)
                setSelectedIds([])
              }}
              type="button"
            >
              <Check size={14} /> Save leads
            </button>
            <button
              disabled={mutations.bulkUpdate.isPending}
              onClick={() => void handleBulkContact()}
              type="button"
            >
              <UserRoundCheck size={14} /> Mark contacted
            </button>
            <button
              disabled={validation.isPending || selectedIds.length > 100}
              onClick={() => void handleValidate()}
              type="button"
            >
              <MailCheck size={14} /> Validate {selectedIds.length > 100 ? "(max 100)" : ""}
            </button>
            <button onClick={() => setShowExport(true)} type="button">
              <Download size={14} /> Export selected
            </button>
            <button
              aria-label="Clear selection"
              className="bulk-clear"
              onClick={() => setSelectedIds([])}
              type="button"
            >
              <X size={15} />
            </button>
            {selectedOnPage === leads.length && (query.data?.total ?? 0) > selectedIds.length && (
              <button
                disabled={selectionBusy}
                onClick={() => void selectAllMatching()}
                type="button"
              >
                {selectionBusy
                  ? "Selecting..."
                  : `Select all ${query.data?.total.toLocaleString()} matching leads`}
              </button>
            )}
          </div>
        )}

        {query.isLoading ? (
          <LoadingPanel rows={7} />
        ) : query.error ? (
          <ErrorPanel message={query.error.message} onRetry={() => void query.refetch()} />
        ) : (
          <>
            <div className="leads-table-wrap">
              <table className="leads-product-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        aria-label="Select all leads on this page"
                        checked={leads.length > 0 && selectedOnPage === leads.length}
                        onChange={togglePageSelection}
                        type="checkbox"
                      />
                    </th>
                    <th>
                      <button
                        onClick={() =>
                          updateFilters({
                            sort: "companyName",
                            order:
                              filters.sort === "companyName" && filters.order === "asc"
                                ? "desc"
                                : "asc",
                          })
                        }
                        type="button"
                      >
                        Company <ArrowUpDown size={12} />
                      </button>
                    </th>
                    {visibleColumns.includes("contact") && <th>Contact</th>}
                    {visibleColumns.includes("industry") && <th>Industry / location</th>}
                    {visibleColumns.includes("score") && (
                      <th>
                        <button
                          onClick={() =>
                            updateFilters({
                              sort: "leadScore",
                              order:
                                filters.sort === "leadScore" && filters.order === "desc"
                                  ? "asc"
                                  : "desc",
                            })
                          }
                          type="button"
                        >
                          Score{" "}
                          {filters.sort === "leadScore" ? (
                            filters.order === "desc" ? (
                              <ArrowDown size={12} />
                            ) : (
                              <ArrowUp size={12} />
                            )
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </button>
                      </th>
                    )}
                    {visibleColumns.includes("priority") && <th>Priority</th>}
                    {visibleColumns.includes("email") && <th>Email</th>}
                    {visibleColumns.includes("status") && <th>Status</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <input
                          aria-label={`Select ${lead.companyName}`}
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => toggleSelection(lead.id)}
                          type="checkbox"
                        />
                      </td>
                      <td>
                        <Link className="lead-company-cell" to={`/leads/${lead.id}`}>
                          <span className="lead-company-icon">
                            {lead.companyName.slice(0, 1).toUpperCase()}
                          </span>
                          <span>
                            <strong>{lead.companyName}</strong>
                            <small>{lead.domain}</small>
                          </span>
                        </Link>
                      </td>
                      {visibleColumns.includes("contact") && (
                        <td>
                          <span className="lead-contact-cell">
                            <Avatar
                              initials={lead.contactName
                                .split(/\s+/)
                                .map((word) => word[0])
                                .slice(0, 2)
                                .join("")}
                              tone={lead.avatarTone}
                            />
                            <span>
                              <strong>{lead.contactName}</strong>
                              <small>{lead.contactTitle || "Contact"}</small>
                            </span>
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("industry") && (
                        <td>
                          <span className="lead-location-cell">
                            <strong>{lead.industry}</strong>
                            <small>{lead.location}</small>
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes("score") && (
                        <td>
                          <ScoreBadge priority={lead.priority} score={lead.leadScore} />
                        </td>
                      )}
                      {visibleColumns.includes("priority") && (
                        <td>
                          <PriorityPill priority={lead.priority} />
                        </td>
                      )}
                      {visibleColumns.includes("email") && (
                        <td>
                          <VerificationPill value={lead.emailVerification} />
                        </td>
                      )}
                      {visibleColumns.includes("status") && (
                        <td>
                          <span className={`lead-status-pill lead-status-${lead.status}`}>
                            {lead.status}
                          </span>
                        </td>
                      )}
                      <td>
                        <button
                          aria-label={`${savedIds.includes(lead.id) ? "Unsave" : "Save"} ${lead.companyName}`}
                          className="lead-save-action"
                          onClick={() => {
                            const wasSaved = savedIds.includes(lead.id)
                            saveLead(lead.id)
                            toast.success(wasSaved ? "Lead removed from saved." : "Lead saved.")
                          }}
                          type="button"
                        >
                          {savedIds.includes(lead.id) ? <Check size={15} /> : <Plus size={15} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td className="leads-no-results" colSpan={3 + visibleColumns.length}>
                        <Search size={20} />
                        <strong>No leads match these filters</strong>
                        <span>Try changing the search or clearing a filter.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="leads-pagination">
              <span>
                Showing{" "}
                {query.data?.total
                  ? ((query.data.page - 1) * query.data.pageSize + 1).toLocaleString()
                  : 0}
                –
                {Math.min(
                  (query.data?.page ?? 1) * (query.data?.pageSize ?? 25),
                  query.data?.total ?? 0,
                ).toLocaleString()}{" "}
                of {(query.data?.total ?? 0).toLocaleString()}
              </span>
              <label>
                Rows{" "}
                <select
                  aria-label="Rows per page"
                  onChange={(event) =>
                    updateFilters({ pageSize: Number(event.target.value) as 25 | 50 | 100 })
                  }
                  value={filters.pageSize}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <div>
                <button
                  aria-label="Previous page"
                  disabled={(query.data?.page ?? 1) <= 1}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: Math.max(1, (current.page ?? 1) - 1),
                    }))
                  }
                  type="button"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>
                  Page {query.data?.page ?? 1} of {query.data?.totalPages ?? 1}
                </span>
                <button
                  aria-label="Next page"
                  disabled={(query.data?.page ?? 1) >= (query.data?.totalPages ?? 1)}
                  onClick={() =>
                    setFilters((current) => ({ ...current, page: (current.page ?? 1) + 1 }))
                  }
                  type="button"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      <Dialog onOpenChange={setShowAdd} open={showAdd}>
        <DialogContent className="product-dialog">
          <DialogHeader>
            <DialogTitle>Add a lead</DialogTitle>
            <DialogDescription>
              Add a company and primary contact to your workspace.
            </DialogDescription>
          </DialogHeader>
          <form className="product-form-grid" onSubmit={(event) => void handleAddLead(event)}>
            <label>
              Company name
              <input
                onChange={(event) => setNewLead({ ...newLead, companyName: event.target.value })}
                required
                value={newLead.companyName}
              />
            </label>
            <label>
              Domain
              <input
                onChange={(event) => setNewLead({ ...newLead, domain: event.target.value })}
                placeholder="example.com"
                required
                value={newLead.domain}
              />
            </label>
            <label>
              Contact name
              <input
                onChange={(event) => setNewLead({ ...newLead, contactName: event.target.value })}
                required
                value={newLead.contactName}
              />
            </label>
            <label>
              Contact title
              <input
                onChange={(event) => setNewLead({ ...newLead, contactTitle: event.target.value })}
                value={newLead.contactTitle}
              />
            </label>
            <label>
              Email
              <input
                onChange={(event) => setNewLead({ ...newLead, email: event.target.value })}
                required
                type="email"
                value={newLead.email}
              />
            </label>
            <label>
              Phone
              <input
                onChange={(event) => setNewLead({ ...newLead, phone: event.target.value })}
                value={newLead.phone}
              />
            </label>
            <label>
              Industry
              <select
                onChange={(event) => setNewLead({ ...newLead, industry: event.target.value })}
                value={newLead.industry}
              >
                {industries.map((industry) => (
                  <option key={industry}>{industry}</option>
                ))}
              </select>
            </label>
            <label>
              Location
              <input
                onChange={(event) => setNewLead({ ...newLead, location: event.target.value })}
                required
                value={newLead.location}
              />
            </label>
            <DialogFooter className="product-dialog-footer">
              <button
                className="product-button product-button-secondary"
                onClick={() => setShowAdd(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="product-button product-button-primary"
                disabled={createLead.isPending}
                type="submit"
              >
                {createLead.isPending ? "Adding..." : "Add lead"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setShowImportPreview} open={showImportPreview}>
        <DialogContent className="product-dialog import-preview-dialog">
          <DialogHeader>
            <DialogTitle>Preview CSV import</DialogTitle>
            <DialogDescription>
              Review the first rows before importing. A company, contact name and valid email are
              required.
            </DialogDescription>
          </DialogHeader>
          <div className="import-preview-summary">
            <strong>{importRows.length.toLocaleString()}</strong>
            <span>rows found</span>
            <small>
              {importValidCount.toLocaleString()} ready ·{" "}
              {(importRows.length - importValidCount).toLocaleString()} need fixes
            </small>
          </div>
          <div className="import-preview-table-wrap">
            <table className="import-preview-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Industry</th>
                  <th>Row check</th>
                </tr>
              </thead>
              <tbody>
                {importRows.slice(0, 6).map((row, index) => {
                  const preview = previewImportRow(row)
                  return (
                    <tr key={index}>
                      <td>{preview.company || "—"}</td>
                      <td>{preview.contact || "—"}</td>
                      <td>{preview.email || "—"}</td>
                      <td>{preview.industry}</td>
                      <td>
                        <span
                          className={`import-row-status ${preview.valid ? "is-valid" : "is-invalid"}`}
                        >
                          {preview.valid ? "Ready" : "Needs fixes"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {importRows.length > 6 && (
            <p className="import-preview-more">
              Showing 6 of {importRows.length.toLocaleString()} rows. Invalid rows will be reported
              after import.
            </p>
          )}
          <DialogFooter className="product-dialog-footer">
            <button
              className="product-button product-button-secondary"
              onClick={() => {
                setShowImportPreview(false)
                setImportRows([])
              }}
              type="button"
            >
              Cancel
            </button>
            <button
              className="product-button product-button-primary"
              disabled={importLeads.isPending}
              onClick={() => void confirmImport()}
              type="button"
            >
              <FileUp size={14} />
              {importLeads.isPending
                ? "Importing..."
                : `Import ${importRows.length.toLocaleString()} rows`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setShowExport} open={showExport}>
        <DialogContent className="product-dialog export-dialog">
          <DialogHeader>
            <DialogTitle>Export leads</DialogTitle>
            <DialogDescription>
              Choose which records and fields to include in a CSV file.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="export-fieldset">
            <legend>Records</legend>
            {(["filtered", "selected", "all"] as const).map((scope) => (
              <label key={scope}>
                <input
                  checked={exportScope === scope}
                  disabled={scope === "selected" && selectedIds.length === 0}
                  name="export-scope"
                  onChange={() => setExportScope(scope)}
                  type="radio"
                />
                {scope === "filtered"
                  ? "All matching filters"
                  : scope === "selected"
                    ? `Selected leads (${selectedIds.length})`
                    : "All leads"}
              </label>
            ))}
          </fieldset>
          <fieldset className="export-fieldset export-fields">
            <legend>Fields</legend>
            {exportFieldOptions.map(([field, label]) => (
              <label key={field}>
                <input
                  checked={exportFields.includes(field)}
                  onChange={() =>
                    setExportFields((current) =>
                      current.includes(field)
                        ? current.filter((item) => item !== field)
                        : [...current, field],
                    )
                  }
                  type="checkbox"
                />
                {label}
              </label>
            ))}
          </fieldset>
          <DialogFooter className="product-dialog-footer">
            <button
              className="product-button product-button-secondary"
              onClick={() => setShowExport(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="product-button product-button-primary"
              disabled={!exportFields.length}
              onClick={() => void handleExport()}
              type="button"
            >
              <Download size={14} /> Download CSV
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setShowValidation} open={showValidation}>
        <DialogContent className="product-dialog">
          <DialogHeader>
            <DialogTitle>Validate selected leads</DialogTitle>
            <DialogDescription>
              Validation is simulated locally in demo mode; no email is sent.
            </DialogDescription>
          </DialogHeader>
          <div className="validation-status">
            <div className="validation-track">
              <i style={{ width: `${validationProgress}%` }} />
            </div>
            <strong>
              {validation.isPending
                ? `${validationProgress}% complete`
                : validationProgress === 100
                  ? "Validation complete"
                  : "Validation status"}
            </strong>
            <p>{validationMessage}</p>
          </div>
          <DialogFooter className="product-dialog-footer">
            <button
              className="product-button product-button-primary"
              onClick={() => setShowValidation(false)}
              type="button"
            >
              {validation.isPending ? "Working..." : "Done"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
