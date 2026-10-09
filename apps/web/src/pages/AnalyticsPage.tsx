import { useMemo, useState } from "react"
import { ArrowRight, Download, MailCheck, Target, TrendingUp, Users } from "lucide-react"
import { Link } from "react-router"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"
import { MetricCard, ErrorPanel, LoadingPanel, PageHeader } from "@/components/common/PageHeader"
import { useDashboardStats } from "@/hooks/useLeadQueries"
import { leadService } from "@/services/leadService"
import { downloadCsv, leadsToCsv } from "@/utils/csv"
import type { ExportField } from "@/utils/csv"
import { useQuery } from "@tanstack/react-query"

const colors = [
  "#c8922a",
  "#315282",
  "#438477",
  "#8a7aae",
  "#d17e73",
  "#82928c",
  "#617ea2",
  "#ca9e64",
]

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<7 | 30 | 90>(7)
  const stats = useDashboardStats()
  const leads = useQuery({
    queryKey: ["all-leads"],
    queryFn: () => leadService.listAll({ pageSize: 100 }),
    staleTime: 60_000,
  })
  const data = useMemo(() => {
    const records = leads.data ?? []
    const latest = records.reduce(
      (time, lead) => Math.max(time, new Date(lead.createdAt).getTime()),
      0,
    )
    const buckets = Array.from({ length: period }, (_, index) => {
      const day = new Date(latest - (period - index - 1) * 86_400_000)
      return {
        date: day.toISOString().slice(0, 10),
        day: day.toLocaleDateString(
          "en-US",
          period === 7 ? { weekday: "short" } : { month: "short", day: "numeric" },
        ),
        leads: 0,
        high: 0,
      }
    })
    const bucketByDate = new Map(buckets.map((bucket) => [bucket.date, bucket]))
    records.forEach((lead) => {
      const bucket = bucketByDate.get(lead.createdAt.slice(0, 10))
      if (bucket) {
        bucket.leads += 1
        if (lead.priority === "high") bucket.high += 1
      }
    })
    const byIndustry = new Map<string, number>()
    records.forEach((lead) =>
      byIndustry.set(lead.industry, (byIndustry.get(lead.industry) ?? 0) + 1),
    )
    const industries = [...byIndustry]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
    const scoreBands = [
      {
        name: "80–100",
        count: records.filter((lead) => lead.leadScore >= 80).length,
        color: colors[0],
      },
      {
        name: "60–79",
        count: records.filter((lead) => lead.leadScore >= 60 && lead.leadScore < 80).length,
        color: colors[1],
      },
      {
        name: "0–59",
        count: records.filter((lead) => lead.leadScore < 60).length,
        color: colors[5],
      },
    ]
    const verification = [
      {
        name: "Verified",
        count: records.filter((lead) => lead.emailVerification === "verified").length,
        color: "#438477",
      },
      {
        name: "Risky",
        count: records.filter((lead) => lead.emailVerification === "risky").length,
        color: "#c8922a",
      },
      {
        name: "Invalid",
        count: records.filter((lead) => lead.emailVerification === "invalid").length,
        color: "#bd6461",
      },
      {
        name: "Unverified",
        count: records.filter((lead) => lead.emailVerification === "unknown").length,
        color: "#aab4af",
      },
    ]
    return { buckets, industries, scoreBands, verification }
  }, [leads.data, period])

  async function exportReport() {
    try {
      const all = await leadService.listAll({ pageSize: 100 })
      const fields: ExportField[] = [
        "companyName",
        "industry",
        "location",
        "leadScore",
        "priority",
        "emailVerification",
        "createdAt",
      ]
      downloadCsv(
        leadsToCsv(all, fields),
        `pinpoint-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
      )
      toast.success("Analytics data exported.")
    } catch (error) {
      toast.error("Report export failed", {
        description: error instanceof Error ? error.message : "Try again.",
      })
    }
  }

  if (stats.isPending || leads.isPending) return <LoadingPanel rows={6} />
  if (stats.isError || leads.isError || !stats.data)
    return (
      <ErrorPanel
        message={stats.error?.message ?? leads.error?.message ?? "Analytics are unavailable."}
        onRetry={() => {
          void stats.refetch()
          void leads.refetch()
        }}
      />
    )

  const coverage = stats.data.totalLeads
    ? Math.round((stats.data.verifiedEmails / stats.data.totalLeads) * 100)
    : 0
  return (
    <>
      <PageHeader
        actions={
          <button
            className="product-button product-button-secondary"
            onClick={() => void exportReport()}
            type="button"
          >
            <Download size={14} /> Export report
          </button>
        }
        description="Track lead quality, scoring distribution and pipeline coverage."
        eyebrow="WORKSPACE PERFORMANCE"
        title="Analytics"
      />
      <div aria-label="Analytics date range" className="analytics-period">
        <span>Created on</span>
        {([7, 30, 90] as const).map((days) => (
          <button
            aria-pressed={period === days}
            className={period === days ? "is-active" : ""}
            key={days}
            onClick={() => setPeriod(days)}
            type="button"
          >
            Last {days} days
          </button>
        ))}
      </div>
      <section className="product-metric-grid analytics-metrics">
        <MetricCard
          detail="All records in your workspace"
          icon={<Users size={17} />}
          label="Total leads"
          tone="navy"
          value={stats.data.totalLeads.toLocaleString()}
        />
        <MetricCard
          detail={`${stats.data.highPriority.toLocaleString()} score 80 or higher`}
          icon={<Target size={17} />}
          label="High priority"
          tone="gold"
          value={`${stats.data.totalLeads ? Math.round((stats.data.highPriority / stats.data.totalLeads) * 100) : 0}%`}
        />
        <MetricCard
          detail="Email addresses confirmed"
          icon={<MailCheck size={17} />}
          label="Verification coverage"
          tone="green"
          value={`${coverage}%`}
        />
        <MetricCard
          detail="Average across seven fit factors"
          icon={<TrendingUp size={17} />}
          label="Average lead score"
          tone="slate"
          value={`${stats.data.averageScore}/100`}
        />
      </section>
      <section className="analytics-grid">
        <article className="product-panel analytics-chart-panel analytics-chart-wide">
          <div className="product-panel-heading">
            <div>
              <h2>Lead creation and qualification</h2>
              <p>New records compared with high-priority leads by day</p>
            </div>
            <span className="chart-period">LAST {period} DAYS</span>
          </div>
          <div className="analytics-chart">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={data.buckets} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#edf0ee" strokeDasharray="3 5" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="day"
                  interval={period === 90 ? 12 : period === 30 ? 4 : 0}
                  tick={{ fill: "#798596", fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis axisLine={false} tick={{ fill: "#798596", fontSize: 10 }} tickLine={false} />
                <Tooltip
                  contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="leads" fill="#315282" name="New leads" radius={[3, 3, 0, 0]} />
                <Bar dataKey="high" fill="#c8922a" name="High priority" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="analytics-chart-legend">
            <span>
              <i className="legend-navy" />
              New leads
            </span>
            <span>
              <i className="legend-gold" />
              High priority
            </span>
          </div>
        </article>
        <article className="product-panel analytics-chart-panel">
          <div className="product-panel-heading">
            <div>
              <h2>Score distribution</h2>
              <p>Qualification bands across all leads</p>
            </div>
          </div>
          <div className="analytics-pie-wrap">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  data={data.scoreBands}
                  dataKey="count"
                  innerRadius="62%"
                  outerRadius="84%"
                  paddingAngle={3}
                >
                  {data.scoreBands.map((entry) => (
                    <Cell fill={entry.color} key={entry.name} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} leads`, "Records"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="analytics-pie-center">
              <strong>{stats.data.totalLeads.toLocaleString()}</strong>
              <span>total leads</span>
            </div>
          </div>
          <div className="analytics-legend-list">
            {data.scoreBands.map((entry) => (
              <div key={entry.name}>
                <span>
                  <i style={{ backgroundColor: entry.color }} />
                  {entry.name} score
                </span>
                <strong>{entry.count.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="product-panel analytics-chart-panel">
          <div className="product-panel-heading">
            <div>
              <h2>Email verification health</h2>
              <p>Deliverability signals across the lead database</p>
            </div>
          </div>
          <div className="verification-breakdown">
            {data.verification.map((entry) => (
              <div key={entry.name}>
                <span>
                  <i style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </span>
                <strong>{entry.count.toLocaleString()}</strong>
                <div>
                  <i
                    style={{
                      width: `${stats.data!.totalLeads ? (entry.count / stats.data!.totalLeads) * 100 : 0}%`,
                      backgroundColor: entry.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link className="product-text-link" to="/leads?verification=unknown">
            Review unverified leads <ArrowRight size={13} />
          </Link>
        </article>
        <article className="product-panel analytics-chart-panel">
          <div className="product-panel-heading">
            <div>
              <h2>Top industries</h2>
              <p>Most represented sectors in your workspace</p>
            </div>
          </div>
          <div className="industry-bars">
            {data.industries.map((entry, index) => (
              <div key={entry.name}>
                <span>{entry.name}</span>
                <span>
                  <i>
                    <b
                      style={{
                        width: `${data.industries[0]?.count ? (entry.count / data.industries[0].count) * 100 : 0}%`,
                        backgroundColor: colors[index % colors.length],
                      }}
                    />
                  </i>
                  <strong>{entry.count.toLocaleString()}</strong>
                </span>
              </div>
            ))}
          </div>
          <Link className="product-text-link" to="/leads">
            Explore all leads <ArrowRight size={13} />
          </Link>
        </article>
      </section>
    </>
  )
}
