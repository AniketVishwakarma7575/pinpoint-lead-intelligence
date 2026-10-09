import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Download,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Link } from "react-router"
import { toast } from "@/lib/notify"
import { ErrorPanel, LoadingPanel, MetricCard, PageHeader } from "@/components/common/PageHeader"
import { Avatar } from "@/components/common/LeadVisuals"
import { useDashboardStats, useLeads, useReviewQueue } from "@/hooks/useLeadQueries"
import { leadService } from "@/services/leadService"
import { downloadCsv, leadsToCsv } from "@/utils/csv"

export default function DashboardPage() {
  const stats = useDashboardStats()
  const leads = useLeads({ page: 1, pageSize: 25, sort: "leadScore", order: "desc" })
  const reviews = useReviewQueue()
  const topLeads = (leads.data?.items ?? []).slice(0, 5)
  const hasError = stats.error || leads.error || reviews.error
  async function exportLeads() {
    try {
      const all = await leadService.listAll({ pageSize: 100 })
      const csv = leadsToCsv(all, [
        "companyName",
        "domain",
        "contactName",
        "email",
        "leadScore",
        "priority",
      ])
      downloadCsv(csv, `pinpoint-leads-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(`${all.length.toLocaleString()} leads exported.`)
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    }
  }

  return (
    <>
      <PageHeader
        actions={
          <Link className="product-button product-button-primary" to="/leads">
            <Users size={15} /> Explore leads
          </Link>
        }
        description="A clear view of the prospects most likely to become customers."
        eyebrow="YOUR LEAD INTELLIGENCE"
        title="Know who to call first."
      />
      {hasError && (
        <ErrorPanel
          message={
            stats.error?.message ?? leads.error?.message ?? reviews.error?.message ?? "Try again."
          }
          onRetry={() => {
            void stats.refetch()
            void leads.refetch()
            void reviews.refetch()
          }}
        />
      )}
      {stats.isLoading ? (
        <LoadingPanel rows={5} />
      ) : stats.data ? (
        <>
          <section aria-label="Lead performance" className="product-metric-grid">
            <MetricCard
              detail="Fictional demo records"
              icon={<Users size={17} />}
              label="Total leads"
              tone="navy"
              value={stats.data.totalLeads.toLocaleString()}
            />
            <MetricCard
              detail={`${stats.data.totalLeads ? Math.round((stats.data.highPriority / stats.data.totalLeads) * 100) : 0}% of all leads`}
              icon={<Target size={17} />}
              label="High priority"
              tone="gold"
              value={stats.data.highPriority.toLocaleString()}
            />
            <MetricCard
              detail={`${stats.data.totalLeads ? Math.round((stats.data.verifiedEmails / stats.data.totalLeads) * 100) : 0}% email coverage`}
              icon={<CheckCircle2 size={17} />}
              label="Verified emails"
              tone="green"
              value={stats.data.verifiedEmails.toLocaleString()}
            />
            <MetricCard
              detail="Across all scoring factors"
              icon={<Sparkles size={17} />}
              label="Average score"
              tone="slate"
              value={`${stats.data.averageScore}/100`}
            />
          </section>

          <section className="product-dashboard-grid">
            <article className="product-panel product-chart-panel">
              <div className="product-panel-heading">
                <div>
                  <div className="panel-title-line">
                    <h2>Pipeline activity</h2>
                    <span className="product-live">
                      <i /> Seeded demo
                    </span>
                  </div>
                  <p>New records and high-priority leads over the last 7 days</p>
                </div>
                <span className="chart-period">LAST 7 DAYS</span>
              </div>
              <div
                aria-label="Lead activity over the last 7 days"
                className="product-chart"
                role="img"
              >
                <ResponsiveContainer height="100%" width="100%">
                  <AreaChart
                    data={stats.data.weeklyActivity}
                    margin={{ top: 12, right: 8, left: -16, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="qualifiedFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#C8922A" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#C8922A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e9edf1" strokeDasharray="3 5" vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="day"
                      tick={{ fill: "#798596", fontSize: 11 }}
                      tickLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      axisLine={false}
                      tick={{ fill: "#798596", fontSize: 10 }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: "#0B1B3A", fontWeight: 600 }}
                    />
                    <Area
                      dataKey="created"
                      fill="#17356B"
                      fillOpacity={0.08}
                      name="New leads"
                      stroke="#17356B"
                      strokeWidth={2}
                      type="monotone"
                    />
                    <Area
                      dataKey="qualified"
                      fill="url(#qualifiedFill)"
                      name="High priority"
                      stroke="#C8922A"
                      strokeWidth={2}
                      type="monotone"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend">
                <span>
                  <i className="legend-navy" /> New leads
                </span>
                <span>
                  <i className="legend-gold" /> High priority
                </span>
                <Link to="/analytics">
                  View analytics <ArrowRight size={13} />
                </Link>
              </div>
            </article>

            <article className="product-panel product-priority-panel">
              <div className="product-panel-heading">
                <div>
                  <h2>Priority distribution</h2>
                  <p>Scored against your ideal customer profile</p>
                </div>
              </div>
              <div className="priority-total">
                <strong>{stats.data.totalLeads.toLocaleString()}</strong>
                <span>leads scored</span>
              </div>
              <div className="priority-list">
                {(
                  [
                    ["high", "High priority", "gold"],
                    ["medium", "Medium priority", "blue"],
                    ["low", "Low priority", "slate"],
                  ] as const
                ).map(([key, label, tone]) => {
                  const count = stats.data!.priorityCounts[key]
                  const percent = stats.data!.totalLeads
                    ? Math.round((count / stats.data!.totalLeads) * 100)
                    : 0
                  return (
                    <div className="priority-row" key={key}>
                      <div>
                        <span className={`priority-dot priority-${tone}`} />
                        {label}
                        <strong>{count.toLocaleString()}</strong>
                      </div>
                      <div className="priority-track">
                        <i
                          className={`priority-fill priority-fill-${tone}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <small>{percent}% of all leads</small>
                    </div>
                  )
                })}
              </div>
              <Link className="product-text-link" to="/leads?priority=high">
                Review high-priority leads <ArrowRight size={14} />
              </Link>
            </article>
          </section>

          <section className="product-dashboard-grid product-dashboard-lower">
            <article className="product-panel product-top-leads">
              <div className="product-panel-heading">
                <div>
                  <h2>Top leads to prioritize</h2>
                  <p>Highest-scoring prospects in your workspace</p>
                </div>
                <Link className="product-text-link" to="/leads">
                  All leads <ArrowRight size={14} />
                </Link>
              </div>
              {leads.isLoading ? (
                <LoadingPanel rows={4} />
              ) : (
                <div className="dashboard-lead-list">
                  {topLeads.map((lead) => (
                    <Link className="dashboard-lead-row" key={lead.id} to={`/leads/${lead.id}`}>
                      <Avatar
                        initials={lead.contactName
                          .split(/\s+/)
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                        tone={lead.avatarTone}
                      />
                      <span className="dashboard-lead-name">
                        <strong>{lead.companyName}</strong>
                        <small>
                          {lead.contactName} · {lead.contactTitle}
                        </small>
                      </span>
                      <span className="dashboard-lead-score">
                        {lead.leadScore}
                        <small>/100</small>
                      </span>
                      <span className={`priority-pill priority-pill-${lead.priority}`}>
                        {lead.priority}
                      </span>
                      <ArrowUpRight className="dashboard-row-arrow" size={14} />
                    </Link>
                  ))}
                </div>
              )}
            </article>
            <article className="product-panel product-review-panel">
              <div className="product-panel-heading">
                <div>
                  <h2>Needs your attention</h2>
                  <p>Records to verify and resolve</p>
                </div>
                <span className="review-attention-icon">
                  <ShieldAlert size={17} />
                </span>
              </div>
              {reviews.isLoading ? (
                <LoadingPanel rows={3} />
              ) : reviews.error ? (
                <p className="product-muted">{reviews.error.message}</p>
              ) : (
                <div className="review-summary">
                  <strong>{reviews.data?.items.length ?? 0}</strong>
                  <span>open review items</span>
                  <div className="review-summary-tags">
                    <span>
                      <i className="review-dot-amber" />
                      {reviews.data?.counts.needs_verification ?? 0} Verify
                    </span>
                    <span>
                      <i className="review-dot-blue" />
                      {reviews.data?.counts.potential_duplicate ?? 0} Duplicates
                    </span>
                    <span>
                      <i className="review-dot-slate" />
                      {(reviews.data?.counts.low_data_quality ?? 0) +
                        (reviews.data?.counts.high_potential_missing_info ?? 0)}{" "}
                      Data quality
                    </span>
                  </div>
                </div>
              )}
              <Link className="review-queue-link" to="/review">
                <Clock3 size={15} /> Open review queue <ArrowRight size={14} />
              </Link>
            </article>
          </section>

          <footer className="product-page-footer">
            <span>Fictional, deterministic demo data. No external lead data is fetched.</span>
            <button onClick={() => void exportLeads()} type="button">
              <Download size={13} /> Export leads
            </button>
          </footer>
        </>
      ) : null}
    </>
  )
}
