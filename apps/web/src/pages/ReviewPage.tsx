import { useState } from "react"
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  CopyCheck,
  MailCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"
import { ErrorPanel, LoadingPanel, PageHeader } from "@/components/common/PageHeader"
import { useLead, useLeadMutations, useReviewQueue } from "@/hooks/useLeadQueries"
import { useAppStore } from "@/stores/appStore"
import type { ReviewType } from "@/types"
import { Avatar, PriorityPill, ScoreBadge, VerificationPill } from "@/components/common/LeadVisuals"

const filters: Array<{ id: "all" | ReviewType; label: string }> = [
  { id: "all", label: "All open" },
  { id: "needs_verification", label: "Verification" },
  { id: "potential_duplicate", label: "Duplicates" },
  { id: "low_data_quality", label: "Data quality" },
  { id: "high_potential_missing_info", label: "Missing info" },
]

function reviewLabel(type: ReviewType) {
  return {
    needs_verification: "Needs verification",
    potential_duplicate: "Potential duplicate",
    low_data_quality: "Low data quality",
    high_potential_missing_info: "High potential · missing info",
  }[type]
}

export default function ReviewPage() {
  const [type, setType] = useState<"all" | ReviewType>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [keepLeadId, setKeepLeadId] = useState("")
  const [busy, setBusy] = useState(false)
  const queue = useReviewQueue()
  const mutations = useLeadMutations()
  const dismissedIds = useAppStore((state) => state.dismissedReviewIds)
  const visibleItems = (queue.data?.items ?? []).filter(
    (item) => type === "all" || item.type === type,
  )
  const selected = visibleItems.find((item) => item.id === selectedId) ?? visibleItems[0]
  const effectiveKeepLeadId =
    selected && [selected.leadId, selected.matchedLeadId].includes(keepLeadId)
      ? keepLeadId
      : (selected?.leadId ?? "")
  const lead = useLead(selected?.leadId ?? "")
  const matched = useLead(selected?.matchedLeadId ?? "")

  async function dismiss() {
    if (!selected) return
    setBusy(true)
    try {
      await mutations.dismissReview.mutateAsync(selected.id)
      toast.success("Review item dismissed.")
      setSelectedId(null)
    } catch (error) {
      toast.error("Review item could not be dismissed", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setBusy(false)
    }
  }

  async function resolveDuplicate() {
    if (!selected?.matchedLeadId || !effectiveKeepLeadId) return
    const removeLeadId =
      effectiveKeepLeadId === selected.leadId ? selected.matchedLeadId : selected.leadId
    setBusy(true)
    try {
      await mutations.mergeReview.mutateAsync({
        reviewId: selected.id,
        keepLeadId: effectiveKeepLeadId,
        removeLeadId,
      })
      toast.success("Duplicate records merged.")
      setSelectedId(null)
    } catch (error) {
      toast.error("The duplicate could not be merged", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setBusy(false)
    }
  }

  async function verifyLead() {
    if (!selected || !lead.data) return
    setBusy(true)
    try {
      await mutations.updateLead.mutateAsync({
        id: lead.data.id,
        patch: { emailVerification: "verified", websiteStatus: "valid" },
      })
      await mutations.dismissReview.mutateAsync(selected.id)
      toast.success("Lead marked verified and removed from the queue.")
      setSelectedId(null)
    } catch (error) {
      toast.error("Lead could not be verified", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setBusy(false)
    }
  }

  if (queue.isLoading) return <LoadingPanel rows={7} />
  if (queue.error)
    return <ErrorPanel message={queue.error.message} onRetry={() => void queue.refetch()} />

  return (
    <>
      <PageHeader
        description="Resolve data quality issues and merge duplicates before they reach your sales team."
        eyebrow="DATA QUALITY WORKBENCH"
        title="Review queue"
      />
      <section className="review-overview">
        <article>
          <span className="review-overview-icon review-icon-gold">
            <CircleAlert size={17} />
          </span>
          <div>
            <strong>{queue.data?.items.length ?? 0}</strong>
            <span>Open items</span>
          </div>
        </article>
        <article>
          <span className="review-overview-icon review-icon-blue">
            <CopyCheck size={17} />
          </span>
          <div>
            <strong>{queue.data?.counts.potential_duplicate ?? 0}</strong>
            <span>Potential duplicates</span>
          </div>
        </article>
        <article>
          <span className="review-overview-icon review-icon-green">
            <MailCheck size={17} />
          </span>
          <div>
            <strong>{queue.data?.counts.needs_verification ?? 0}</strong>
            <span>Need verification</span>
          </div>
        </article>
        <article>
          <span className="review-overview-icon review-icon-slate">
            <Sparkles size={17} />
          </span>
          <div>
            <strong>{dismissedIds.length}</strong>
            <span>Dismissed on this device</span>
          </div>
        </article>
      </section>
      <section className="product-panel review-workspace">
        <nav aria-label="Filter review queue" className="review-filters">
          {filters.map((filter) => (
            <button
              className={type === filter.id ? "is-active" : ""}
              key={filter.id}
              onClick={() => {
                setType(filter.id)
                setSelectedId(null)
              }}
              type="button"
            >
              {filter.label}
              {filter.id === "all" ? (
                <span>{queue.data?.items.length ?? 0}</span>
              ) : (
                <span>{queue.data?.counts[filter.id] ?? 0}</span>
              )}
            </button>
          ))}
        </nav>
        {visibleItems.length === 0 ? (
          <div className="product-empty-state review-empty">
            <span>
              <ShieldCheck size={22} />
            </span>
            <strong>You're all caught up</strong>
            <p>No open items in this category. New issues will appear here as leads are added.</p>
            <Link className="product-button product-button-secondary" to="/leads">
              Browse leads <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="review-columns">
            <div aria-label="Open review items" className="review-item-list">
              {visibleItems.map((item) => (
                <button
                  aria-current={selected?.id === item.id ? "true" : undefined}
                  className={`review-item-row ${selected?.id === item.id ? "is-selected" : ""}`}
                  key={item.id}
                  onClick={() => {
                    setSelectedId(item.id)
                    setKeepLeadId(item.leadId)
                  }}
                  type="button"
                >
                  <span className={`review-type-icon review-type-${item.type}`}>
                    <i />
                  </span>
                  <span className="review-item-copy">
                    <strong>
                      {item.type === "potential_duplicate"
                        ? "Possible duplicate"
                        : reviewLabel(item.type)}
                    </strong>
                    <small>{item.reason}</small>
                    <time>{new Date(item.createdAt).toLocaleDateString()}</time>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
            {selected && (
              <article aria-label="Selected review details" className="review-detail">
                <div className="review-detail-heading">
                  <div>
                    <span className={`review-label review-label-${selected.type}`}>
                      {reviewLabel(selected.type)}
                    </span>
                    <h2>
                      {selected.type === "potential_duplicate"
                        ? "Compare possible duplicate"
                        : "Review lead quality"}
                    </h2>
                    <p>{selected.reason}</p>
                  </div>
                  <span className="review-similarity">
                    {selected.similarity
                      ? `${Math.round(selected.similarity * 100)}% match`
                      : "Needs attention"}
                  </span>
                </div>
                {selected.type === "potential_duplicate" && selected.matchedLeadId ? (
                  <>
                    <div className="duplicate-compare">
                      {[lead.data, matched.data].map(
                        (candidate) =>
                          candidate && (
                            <button
                              className={`duplicate-record ${effectiveKeepLeadId === candidate.id ? "is-keep" : ""}`}
                              key={candidate.id}
                              onClick={() => setKeepLeadId(candidate.id)}
                              type="button"
                            >
                              <span className="duplicate-keep">
                                {effectiveKeepLeadId === candidate.id ? (
                                  <>
                                    <Check size={12} /> Keep this record
                                  </>
                                ) : (
                                  "Choose to keep"
                                )}
                              </span>
                              <span className="duplicate-company">{candidate.companyName}</span>
                              <span className="duplicate-domain">{candidate.domain}</span>
                              <span className="duplicate-contact">
                                <Avatar
                                  initials={candidate.contactName
                                    .split(/\s+/)
                                    .map((part) => part[0])
                                    .slice(0, 2)
                                    .join("")}
                                  tone={candidate.avatarTone}
                                />
                                <span>
                                  <strong>{candidate.contactName}</strong>
                                  <small>{candidate.email}</small>
                                </span>
                              </span>
                              <span className="duplicate-meta">
                                <span>{candidate.industry}</span>
                                <span>{candidate.location}</span>
                                <span>{candidate.employees.toLocaleString()} employees</span>
                              </span>
                              <span className="duplicate-score">
                                <ScoreBadge
                                  priority={candidate.priority}
                                  score={candidate.leadScore}
                                />
                                <PriorityPill priority={candidate.priority} />
                              </span>
                            </button>
                          ),
                      )}
                    </div>
                    <p className="duplicate-match-note">
                      <CopyCheck size={14} /> Same company domain and similar company name indicate
                      a likely duplicate.
                    </p>
                    <div className="review-actions">
                      <button
                        className="product-button product-button-secondary"
                        disabled={busy}
                        onClick={() => void dismiss()}
                        type="button"
                      >
                        Not a duplicate · dismiss
                      </button>
                      <button
                        className="product-button product-button-primary"
                        disabled={busy || !lead.data || !matched.data}
                        onClick={() => void resolveDuplicate()}
                        type="button"
                      >
                        <Check size={14} /> {busy ? "Merging..." : "Merge records"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="review-lead-preview">
                      {lead.data ? (
                        <>
                          <div className="review-preview-top">
                            <span className="lead-company-icon">
                              {lead.data.companyName.slice(0, 1)}
                            </span>
                            <span>
                              <strong>{lead.data.companyName}</strong>
                              <small>{lead.data.domain}</small>
                            </span>
                            <ScoreBadge priority={lead.data.priority} score={lead.data.leadScore} />
                          </div>
                          <div className="review-preview-contact">
                            <Avatar
                              initials={lead.data.contactName
                                .split(/\s+/)
                                .map((part) => part[0])
                                .slice(0, 2)
                                .join("")}
                              tone={lead.data.avatarTone}
                            />
                            <span>
                              <strong>{lead.data.contactName}</strong>
                              <small>{lead.data.email}</small>
                            </span>
                            <VerificationPill value={lead.data.emailVerification} />
                          </div>
                          <p>
                            {lead.data.dataCompleteness}% data completeness · {lead.data.industry} ·{" "}
                            {lead.data.location}
                          </p>
                        </>
                      ) : (
                        <LoadingPanel rows={3} />
                      )}
                    </div>
                    <div className="review-actions">
                      <Link
                        className="product-button product-button-secondary"
                        to={`/leads/${selected.leadId}`}
                      >
                        Open lead profile <ArrowRight size={14} />
                      </Link>
                      <button
                        className="product-button product-button-primary"
                        disabled={busy || !lead.data || selected.type !== "needs_verification"}
                        onClick={() => void verifyLead()}
                        type="button"
                      >
                        <Check size={14} /> Mark verified
                      </button>
                      <button
                        className="review-dismiss-link"
                        disabled={busy}
                        onClick={() => void dismiss()}
                        type="button"
                      >
                        Dismiss item
                      </button>
                    </div>
                  </>
                )}
                <div className="review-detail-footer">
                  <span>Review item {selected.id}</span>
                  <Link to={`/leads/${selected.leadId}`}>
                    View full record <ArrowRight size={12} />
                  </Link>
                </div>
              </article>
            )}
          </div>
        )}
      </section>
    </>
  )
}
