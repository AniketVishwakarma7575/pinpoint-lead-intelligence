import { useState } from "react"
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Check,
  Clock3,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
} from "lucide-react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import {
  Avatar,
  PriorityPill,
  ScoreBar,
  ScoreBadge,
  VerificationPill,
} from "@/components/common/LeadVisuals"
import { ErrorPanel, LoadingPanel, PageHeader } from "@/components/common/PageHeader"
import { useLead, useLeadMutations } from "@/hooks/useLeadQueries"
import { SCORE_FACTOR_LABELS } from "@/types"
import { useAppStore } from "@/stores/appStore"

export default function LeadDetailsPage() {
  const { leadId = "" } = useParams()
  const query = useLead(leadId)
  const mutations = useLeadMutations()
  const savedIds = useAppStore((state) => state.savedLeadIds)
  const toggleSaved = useAppStore((state) => state.toggleSavedLead)
  const markContacted = useAppStore((state) => state.markContacted)
  const [busyAction, setBusyAction] = useState("")
  const lead = query.data

  async function updateLead(patch: {
    status?: "new" | "contacted" | "saved" | "archived"
    emailVerification?: "verified" | "risky" | "invalid" | "unknown"
    websiteStatus?: "valid" | "risky" | "invalid" | "unknown"
  }) {
    if (!lead) return
    setBusyAction(Object.keys(patch)[0] ?? "update")
    try {
      await mutations.updateLead.mutateAsync({ id: lead.id, patch })
      if (patch.status === "contacted") markContacted(lead.id)
      toast.success("Lead updated.")
    } catch (error) {
      toast.error("Lead could not be updated", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    } finally {
      setBusyAction("")
    }
  }

  if (query.isLoading) return <LoadingPanel rows={7} />
  if (query.error || !lead)
    return (
      <ErrorPanel
        message={query.error?.message ?? "This lead could not be found."}
        onRetry={() => void query.refetch()}
      />
    )

  const isSaved = savedIds.includes(lead.id)
  return (
    <>
      <PageHeader
        actions={
          <>
            <button
              className="product-button product-button-secondary"
              disabled={mutations.updateLead.isPending}
              onClick={() => void updateLead({ status: "contacted" })}
              type="button"
            >
              <UserRoundCheck size={15} /> Mark contacted
            </button>
            <button
              className="product-button product-button-primary"
              onClick={() => {
                toggleSaved(lead.id)
                toast.success(isSaved ? "Lead removed from saved leads." : "Lead saved.")
              }}
              type="button"
            >
              {isSaved ? <Check size={15} /> : <Sparkles size={15} />}
              {isSaved ? "Saved" : "Save lead"}
            </button>
          </>
        }
        description="A complete view of fit, contact quality and the next best action."
        eyebrow="LEAD PROFILE"
        title={lead.companyName}
      />
      <Link className="back-to-leads" to="/leads">
        <ArrowLeft size={14} /> Back to leads
      </Link>

      <section className="lead-detail-hero">
        <div className="lead-detail-identity">
          <span className="lead-company-icon lead-company-icon-large">
            {lead.companyName.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <span>{lead.domain}</span>
            <h2>{lead.companyName}</h2>
            <p>
              <Building2 size={14} /> {lead.industry} <i /> <MapPin size={14} /> {lead.location}
            </p>
          </div>
        </div>
        <div className="lead-detail-score">
          <ScoreBadge priority={lead.priority} score={lead.leadScore} />
          <PriorityPill priority={lead.priority} />
          <small>Fit score</small>
        </div>
      </section>

      <div className="lead-detail-grid">
        <div className="lead-detail-main">
          <section className="product-panel lead-detail-card">
            <div className="product-panel-heading">
              <div>
                <h2>Why this lead?</h2>
                <p>Transparent breakdown against your ideal customer profile.</p>
              </div>
              <Target size={17} />
            </div>
            <div className="lead-score-factors">
              {(
                Object.entries(lead.scoreBreakdown) as Array<
                  [keyof typeof lead.scoreBreakdown, { score: number; max: number; reason: string }]
                >
              ).map(([factor, detail]) => (
                <div className="lead-score-factor" key={factor}>
                  <div>
                    <strong>{SCORE_FACTOR_LABELS[factor]}</strong>
                    <span>
                      {detail.score}/{detail.max}
                    </span>
                  </div>
                  <ScoreBar
                    label={SCORE_FACTOR_LABELS[factor]}
                    max={detail.max}
                    score={detail.score}
                  />
                  <small>{detail.reason}</small>
                </div>
              ))}
            </div>
            <div className="lead-next-step">
              <Sparkles size={16} />
              <div>
                <strong>Recommended next step</strong>
                <p>{lead.nextStep}</p>
              </div>
            </div>
          </section>

          <section className="product-panel lead-detail-card">
            <div className="product-panel-heading">
              <div>
                <h2>Company signals</h2>
                <p>Firmographic and technology details on this record.</p>
              </div>
            </div>
            <dl className="lead-facts-grid">
              <div>
                <dt>Employees</dt>
                <dd>{lead.employees.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Annual revenue</dt>
                <dd>{lead.revenue ? `$${lead.revenue.toLocaleString()}` : "Not provided"}</dd>
              </div>
              <div>
                <dt>Growth stage</dt>
                <dd className="capitalize">{lead.growthStage}</dd>
              </div>
              <div>
                <dt>Data completeness</dt>
                <dd>{lead.dataCompleteness}%</dd>
              </div>
              <div className="lead-fact-full">
                <dt>Technology signals</dt>
                <dd>
                  {lead.technologies.length
                    ? lead.technologies.map((technology) => (
                        <span className="lead-tag" key={technology}>
                          {technology}
                        </span>
                      ))
                    : "No technology signals recorded"}
                </dd>
              </div>
              <div className="lead-fact-full">
                <dt>Intent signals</dt>
                <dd>
                  {lead.intentSignals.length
                    ? lead.intentSignals.map((signal) => (
                        <span className="lead-tag lead-tag-gold" key={signal}>
                          {signal}
                        </span>
                      ))
                    : "No recent intent signals"}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="lead-detail-aside">
          <section className="product-panel lead-detail-card lead-contact-card">
            <div className="product-panel-heading">
              <div>
                <h2>Primary contact</h2>
                <p>Contact information and verification.</p>
              </div>
              <Avatar
                initials={lead.contactName
                  .split(/\s+/)
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("")}
                tone={lead.avatarTone}
              />
            </div>
            <h3>{lead.contactName}</h3>
            <p className="lead-contact-title">{lead.contactTitle || "Role not provided"}</p>
            <a href={`mailto:${lead.email}`}>
              <Mail size={14} />
              <span>{lead.email || "Email not provided"}</span>
              <ArrowUpRight size={12} />
            </a>
            <a href={lead.phone ? `tel:${lead.phone}` : undefined}>
              <Phone size={14} />
              <span>{lead.phone || "Phone not provided"}</span>
            </a>
            <div className="lead-verification-line">
              <span>Email status</span>
              <VerificationPill value={lead.emailVerification} />
            </div>
            <label className="lead-status-control">
              Update email status
              <select
                disabled={mutations.updateLead.isPending}
                onChange={(event) =>
                  void updateLead({
                    emailVerification: event.target.value as typeof lead.emailVerification,
                  })
                }
                value={lead.emailVerification}
              >
                <option value="unknown">Unverified</option>
                <option value="verified">Verified</option>
                <option value="risky">Risky</option>
                <option value="invalid">Invalid</option>
              </select>
            </label>
            <label className="lead-status-control">
              <span>
                <Globe2 size={13} /> Website status
              </span>
              <select
                disabled={mutations.updateLead.isPending}
                onChange={(event) =>
                  void updateLead({
                    websiteStatus: event.target.value as typeof lead.websiteStatus,
                  })
                }
                value={lead.websiteStatus}
              >
                <option value="unknown">Unknown</option>
                <option value="valid">Valid</option>
                <option value="risky">Risky</option>
                <option value="invalid">Invalid</option>
              </select>
            </label>
          </section>

          <section className="product-panel lead-detail-card lead-activity-card">
            <div className="product-panel-heading">
              <div>
                <h2>Activity history</h2>
                <p>Recent actions for this lead.</p>
              </div>
              <Clock3 size={16} />
            </div>
            <ol className="lead-activity-list">
              {lead.activity.map((event) => (
                <li key={event.id}>
                  <i />
                  <span>
                    <strong>{event.description}</strong>
                    <small>{new Date(event.createdAt).toLocaleString()}</small>
                  </span>
                </li>
              ))}
              {lead.activity.length === 0 && (
                <li className="lead-empty-activity">
                  <ShieldCheck size={15} /> No activity recorded yet.
                </li>
              )}
            </ol>
          </section>
          <span className="sr-only" aria-live="polite">
            {busyAction ? `Updating ${busyAction}` : ""}
          </span>
        </aside>
      </div>
    </>
  )
}
