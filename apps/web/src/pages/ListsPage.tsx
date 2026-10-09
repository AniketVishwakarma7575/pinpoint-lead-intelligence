import { useMemo, useState, type FormEvent } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Download,
  FilePlus2,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react"
import { Link } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/lib/notify"
import { Avatar, PriorityPill, ScoreBadge } from "@/components/common/LeadVisuals"
import { ErrorPanel, LoadingPanel, PageHeader } from "@/components/common/PageHeader"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { leadService } from "@/services/leadService"
import { useSavedLists } from "@/hooks/useLeadQueries"
import { useAppStore } from "@/stores/appStore"
import { downloadCsv, leadsToCsv } from "@/utils/csv"
import type { Lead, SavedList } from "@/types"
import type { ExportField } from "@/utils/csv"

const fields: ExportField[] = [
  "companyName",
  "domain",
  "contactName",
  "email",
  "phone",
  "industry",
  "location",
  "leadScore",
  "priority",
]

export default function ListsPage() {
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [addLeadsOpen, setAddLeadsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftName, setDraftName] = useState("")
  const [draftDescription, setDraftDescription] = useState("")
  const [leadSearch, setLeadSearch] = useState("")
  const [memberSearch, setMemberSearch] = useState("")
  const lists = useSavedLists()
  const store = useAppStore()
  const queryClient = useQueryClient()
  const allLeads = useQuery({
    queryKey: ["all-leads"],
    queryFn: () => leadService.listAll({ pageSize: 100, sort: "leadScore", order: "desc" }),
    staleTime: 60_000,
  })
  const activeList = lists.data?.find((list) => list.id === selectedListId) ?? null
  const leadById = useMemo(
    () => new Map((allLeads.data ?? []).map((lead) => [lead.id, lead])),
    [allLeads.data],
  )
  const members =
    activeList?.leadIds
      .map((id) => leadById.get(id))
      .filter((lead): lead is Lead => Boolean(lead)) ?? []
  const shownMembers = members.filter((lead) =>
    `${lead.companyName} ${lead.contactName} ${lead.email}`
      .toLocaleLowerCase()
      .includes(memberSearch.toLocaleLowerCase()),
  )
  const candidates = (allLeads.data ?? [])
    .filter((lead) => {
      const matchesQuery = `${lead.companyName} ${lead.contactName} ${lead.email} ${lead.domain}`
        .toLocaleLowerCase()
        .includes(leadSearch.toLocaleLowerCase())
      return matchesQuery && !activeList?.leadIds.includes(lead.id)
    })
    .slice(0, 100)

  function createList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = draftName.trim()
    if (!name) return
    const list: SavedList = {
      id: `list_${crypto.randomUUID()}`,
      name,
      description: draftDescription.trim(),
      leadIds: [],
      owner: "Workspace",
      createdAt: new Date().toISOString(),
    }
    store.addList(list)
    void queryClient.invalidateQueries({ queryKey: ["saved-lists"] })
    setSelectedListId(list.id)
    setDraftName("")
    setDraftDescription("")
    setCreateOpen(false)
    toast.success(`“${name}” list created.`)
  }

  function toggleLead(lead: Lead) {
    if (!activeList) return
    store.toggleLeadInList(activeList.id, lead.id)
    void queryClient.invalidateQueries({ queryKey: ["saved-lists"] })
  }

  function updateListName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeList || !draftName.trim()) return
    store.updateListDetails(activeList.id, draftName.trim(), draftDescription.trim())
    void queryClient.invalidateQueries({ queryKey: ["saved-lists"] })
    setDraftName("")
    setDraftDescription("")
    setCreateOpen(false)
    toast.success("List renamed.")
  }

  function exportList(list: SavedList) {
    const rows = list.leadIds
      .map((id) => leadById.get(id))
      .filter((lead): lead is Lead => Boolean(lead))
    if (!rows.length) {
      toast.error("This list has no leads to export.")
      return
    }
    try {
      downloadCsv(
        leadsToCsv(rows, fields),
        `${list.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
      )
      toast.success(`${rows.length} leads exported.`)
    } catch (error) {
      toast.error("List export failed", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    }
  }

  function confirmDelete() {
    if (!activeList) return
    store.deleteList(activeList.id)
    void queryClient.invalidateQueries({ queryKey: ["saved-lists"] })
    setDeleteOpen(false)
    setSelectedListId(null)
    toast.success("Saved list deleted.")
  }

  if (lists.isLoading) return <LoadingPanel rows={5} />
  if (lists.error)
    return <ErrorPanel message={lists.error.message} onRetry={() => void lists.refetch()} />

  return (
    <>
      <PageHeader
        actions={
          <button
            className="product-button product-button-primary"
            onClick={() => {
              setIsRenaming(false)
              setDraftName("")
              setDraftDescription("")
              setCreateOpen(true)
            }}
            type="button"
          >
            <Plus size={15} /> Create list
          </button>
        }
        description="Group high-fit prospects into focused, reusable outreach lists."
        eyebrow="ORGANIZE PROSPECTS"
        title="Saved lists"
      />
      {allLeads.error && (
        <ErrorPanel message={allLeads.error.message} onRetry={() => void allLeads.refetch()} />
      )}
      {!activeList ? (
        <section className="saved-lists-grid" aria-label="Saved lead lists">
          {(lists.data ?? []).map((list, index) => (
            <article className="saved-list-card" key={list.id}>
              <div className="saved-list-card-top">
                <span className={`saved-list-icon saved-list-icon-${index % 3}`}>
                  <Bookmark size={17} />
                </span>
                <button
                  aria-label={`Open ${list.name}`}
                  className="saved-list-open"
                  onClick={() => setSelectedListId(list.id)}
                  type="button"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
              <button
                className="saved-list-title"
                onClick={() => setSelectedListId(list.id)}
                type="button"
              >
                {list.name}
              </button>
              <p>{list.description || "A focused group of prospects for your team."}</p>
              <div className="saved-list-card-footer">
                <span>
                  <Users size={14} /> {list.leadIds.length.toLocaleString()} leads
                </span>
                <span>Updated {new Date(list.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="saved-list-preview-avatars">
                {list.leadIds.slice(0, 4).map((id) => {
                  const lead = leadById.get(id)
                  return lead ? (
                    <Avatar
                      key={id}
                      initials={lead.contactName
                        .split(/\s+/)
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                      tone={lead.avatarTone}
                    />
                  ) : null
                })}
                {list.leadIds.length > 4 && <span>+{list.leadIds.length - 4}</span>}
              </div>
              <button
                className="saved-list-export"
                disabled={allLeads.isLoading}
                onClick={() => exportList(list)}
                type="button"
              >
                <Download size={13} /> Export CSV
              </button>
            </article>
          ))}
          <button
            className="saved-list-create-card"
            onClick={() => {
              setIsRenaming(false)
              setDraftName("")
              setDraftDescription("")
              setCreateOpen(true)
            }}
            type="button"
          >
            <span>
              <FilePlus2 size={18} />
            </span>
            <strong>Create a new list</strong>
            <small>Start from an empty list and add the prospects you want.</small>
          </button>
          {!lists.data?.length && (
            <div className="product-empty-state">
              <strong>No saved lists yet</strong>
              <p>Create your first list to organize prospects for outreach.</p>
            </div>
          )}
        </section>
      ) : (
        <section className="product-panel saved-list-detail">
          <div className="saved-list-detail-heading">
            <button className="back-to-leads" onClick={() => setSelectedListId(null)} type="button">
              <ArrowLeft size={14} /> All lists
            </button>
            <div className="saved-list-detail-title">
              <span className="saved-list-icon saved-list-icon-0">
                <Bookmark size={18} />
              </span>
              <div>
                <h2>{activeList.name}</h2>
                <p>
                  {activeList.description || "No description"} · {members.length.toLocaleString()}{" "}
                  leads
                </p>
              </div>
            </div>
            <div className="saved-list-detail-actions">
              <button
                className="product-button product-button-secondary"
                onClick={() => {
                  setDraftName(activeList.name)
                  setDraftDescription(activeList.description)
                  setIsRenaming(true)
                  setCreateOpen(true)
                }}
                type="button"
              >
                Rename
              </button>
              <button
                className="product-button product-button-secondary"
                onClick={() => exportList(activeList)}
                type="button"
              >
                <Download size={14} /> Export
              </button>
              <button
                aria-label="Delete list"
                className="product-icon-button danger-action"
                onClick={() => setDeleteOpen(true)}
                type="button"
              >
                <Trash2 size={15} />
              </button>
              <button
                className="product-button product-button-primary"
                onClick={() => setAddLeadsOpen(true)}
                type="button"
              >
                <Plus size={15} /> Add leads
              </button>
            </div>
          </div>
          <label className="saved-list-search">
            <Search size={15} />
            <input
              aria-label="Search list members"
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Search in this list..."
              value={memberSearch}
            />
          </label>
          {allLeads.isLoading ? (
            <LoadingPanel rows={5} />
          ) : shownMembers.length ? (
            <div className="leads-table-wrap">
              <table className="leads-product-table saved-members-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th>Score</th>
                    <th>Priority</th>
                    <th>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {shownMembers.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <Link className="lead-company-cell" to={`/leads/${lead.id}`}>
                          <span className="lead-company-icon">{lead.companyName.slice(0, 1)}</span>
                          <span>
                            <strong>{lead.companyName}</strong>
                            <small>{lead.domain}</small>
                          </span>
                        </Link>
                      </td>
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
                            <small>{lead.email}</small>
                          </span>
                        </span>
                      </td>
                      <td>{lead.location}</td>
                      <td>
                        <ScoreBadge priority={lead.priority} score={lead.leadScore} />
                      </td>
                      <td>
                        <PriorityPill priority={lead.priority} />
                      </td>
                      <td>
                        <button
                          aria-label={`Remove ${lead.companyName} from list`}
                          className="lead-save-action"
                          onClick={() => toggleLead(lead)}
                          type="button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="product-empty-state">
              <span>
                <Bookmark size={21} />
              </span>
              <strong>This list is empty</strong>
              <p>Add leads from your workspace to make this list useful.</p>
              <button
                className="product-button product-button-primary"
                onClick={() => setAddLeadsOpen(true)}
                type="button"
              >
                <Plus size={14} /> Add leads
              </button>
            </div>
          )}
        </section>
      )}

      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent className="product-dialog">
          <DialogHeader>
            <DialogTitle>{isRenaming ? "Edit saved list" : "Create a saved list"}</DialogTitle>
            <DialogDescription>
              Keep prospect groups organized for repeatable outreach.
            </DialogDescription>
          </DialogHeader>
          <form
            className="product-form-grid product-form-grid-single"
            onSubmit={isRenaming ? updateListName : createList}
          >
            <label>
              List name
              <input
                autoFocus
                maxLength={80}
                onChange={(event) => setDraftName(event.target.value)}
                required
                value={draftName}
              />
            </label>
            <label>
              Description
              <textarea
                maxLength={240}
                onChange={(event) => setDraftDescription(event.target.value)}
                rows={3}
                value={draftDescription}
              />
            </label>
            <DialogFooter className="product-dialog-footer">
              <button
                className="product-button product-button-secondary"
                onClick={() => setCreateOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button className="product-button product-button-primary" type="submit">
                {isRenaming ? "Save changes" : "Create list"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setAddLeadsOpen} open={addLeadsOpen}>
        <DialogContent className="product-dialog add-list-leads-dialog">
          <DialogHeader>
            <DialogTitle>Add leads to {activeList?.name}</DialogTitle>
            <DialogDescription>
              Choose prospects to add. Existing members are not shown.
            </DialogDescription>
          </DialogHeader>
          <label className="saved-list-search">
            <Search size={15} />
            <input
              onChange={(event) => setLeadSearch(event.target.value)}
              placeholder="Search company, contact or domain..."
              value={leadSearch}
            />
          </label>
          {allLeads.isLoading ? (
            <LoadingPanel rows={4} />
          ) : (
            <div className="add-list-candidates">
              {candidates.map((lead) => (
                <div key={lead.id}>
                  <span>
                    <strong>{lead.companyName}</strong>
                    <small>
                      {lead.contactName} · {lead.domain}
                    </small>
                  </span>
                  <ScoreBadge priority={lead.priority} score={lead.leadScore} />
                  <button
                    aria-label={`Add ${lead.companyName} to list`}
                    onClick={() => toggleLead(lead)}
                    type="button"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              ))}
              {candidates.length === 0 && (
                <p className="add-list-no-results">No matching leads found.</p>
              )}
            </div>
          )}
          <DialogFooter className="product-dialog-footer">
            <button
              className="product-button product-button-primary"
              onClick={() => {
                setAddLeadsOpen(false)
                setLeadSearch("")
              }}
              type="button"
            >
              <Check size={14} /> Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <DialogContent className="product-dialog">
          <DialogHeader>
            <DialogTitle>Delete “{activeList?.name}”?</DialogTitle>
            <DialogDescription>
              This removes the saved list, but does not delete its lead records. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="product-dialog-footer">
            <button
              className="product-button product-button-secondary"
              onClick={() => setDeleteOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="product-button product-button-danger"
              onClick={confirmDelete}
              type="button"
            >
              <Trash2 size={14} /> Delete list
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
