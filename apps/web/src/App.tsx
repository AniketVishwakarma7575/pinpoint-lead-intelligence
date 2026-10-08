import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Clock3,
  Command,
  Download,
  Filter,
  LayoutDashboard,
  ListChecks,
  Mail,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { unparse } from "papaparse"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast, Toaster } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type LeadStatus = "Qualified" | "In review" | "New" | "Contacted"
type Lead = {
  id: string
  name: string
  title: string
  company: string
  email: string
  source: string
  score: number
  status: LeadStatus
  initials: string
  avatar: string
}

type NavigationItem = {
  label: string
  icon: LucideIcon
  count?: string
}

const navigation: NavigationItem[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Leads", icon: Users },
  { label: "Review queue", icon: ListChecks, count: "12" },
  { label: "Activity", icon: Activity },
]

const workspaceNavigation: NavigationItem[] = [
  { label: "Integrations", icon: Zap },
  { label: "Settings", icon: Settings2 },
]

const initialLeads: Lead[] = [
  {
    id: "1",
    name: "Olivia Rhye",
    title: "VP of Marketing",
    company: "Layers",
    email: "olivia@layers.com",
    source: "Website",
    score: 94,
    status: "Qualified",
    initials: "OR",
    avatar: "lavender",
  },
  {
    id: "2",
    name: "Phoenix Baker",
    title: "Head of Growth",
    company: "Circooles",
    email: "phoenix@circooles.com",
    source: "LinkedIn",
    score: 87,
    status: "In review",
    initials: "PB",
    avatar: "peach",
  },
  {
    id: "3",
    name: "Lana Steiner",
    title: "Director of Sales",
    company: "Catalog",
    email: "lana@catalog.com",
    source: "Referral",
    score: 82,
    status: "Qualified",
    initials: "LS",
    avatar: "mint",
  },
  {
    id: "4",
    name: "Demi Wilkinson",
    title: "Product Manager",
    company: "Quotient",
    email: "demi@quotient.com",
    source: "Website",
    score: 76,
    status: "New",
    initials: "DW",
    avatar: "blue",
  },
  {
    id: "5",
    name: "Candice Wu",
    title: "Marketing Director",
    company: "Sisyphus",
    email: "candice@sisyphus.com",
    source: "Campaign",
    score: 71,
    status: "Contacted",
    initials: "CW",
    avatar: "rose",
  },
  {
    id: "6",
    name: "Natali Craig",
    title: "Growth Lead",
    company: "Hourglass",
    email: "natali@hourglass.com",
    source: "LinkedIn",
    score: 68,
    status: "In review",
    initials: "NC",
    avatar: "sand",
  },
]

const activityFeed = [
  {
    initials: "OR",
    avatar: "lavender",
    title: "Olivia Rhye",
    action: "moved to Qualified",
    time: "12 min ago",
  },
  {
    initials: "PB",
    avatar: "peach",
    title: "Phoenix Baker",
    action: "added from LinkedIn",
    time: "38 min ago",
  },
  {
    initials: "LS",
    avatar: "mint",
    title: "Lana Steiner",
    action: "score increased to 82",
    time: "1 hr ago",
  },
  {
    initials: "DW",
    avatar: "blue",
    title: "Demi Wilkinson",
    action: "visited pricing page",
    time: "2 hrs ago",
  },
]

const trendData = [
  { day: "Mon", leads: 34, qualified: 22 },
  { day: "Tue", leads: 47, qualified: 31 },
  { day: "Wed", leads: 41, qualified: 28 },
  { day: "Thu", leads: 64, qualified: 43 },
  { day: "Fri", leads: 55, qualified: 37 },
  { day: "Sat", leads: 73, qualified: 51 },
  { day: "Sun", leads: 68, qualified: 48 },
]

const statusFilters: Array<LeadStatus | "All leads"> = [
  "All leads",
  "Qualified",
  "In review",
  "New",
  "Contacted",
]

function BrandMark() {
  return (
    <span aria-hidden="true" className="brand-mark">
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

function Avatar({ initials, tone }: { initials: string; tone: string }) {
  return <span className={`avatar avatar-${tone}`}>{initials}</span>
}

function App() {
  const [activeSection, setActiveSection] = useState("Overview")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("All leads")
  const [leads, setLeads] = useState(initialLeads)
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    window.addEventListener("keydown", focusSearch)
    return () => window.removeEventListener("keydown", focusSearch)
  }, [])

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase()
    return leads.filter((lead) => {
      const matchesSearch =
        !query ||
        [lead.name, lead.title, lead.company, lead.email, lead.source].some((value) =>
          value.toLowerCase().includes(query),
        )
      const matchesStatus = statusFilter === "All leads" || lead.status === statusFilter
      const matchesSection = activeSection !== "Review queue" || lead.status === "In review"
      return matchesSearch && matchesStatus && matchesSection
    })
  }, [activeSection, leads, search, statusFilter])

  function handleAddLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get("name") ?? "").trim()
    const company = String(formData.get("company") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const title = String(formData.get("title") ?? "").trim()

    if (!name || !company || !email || !title) {
      toast.error("Please complete all lead details.")
      return
    }

    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")

    setLeads((current) => [
      {
        id: crypto.randomUUID(),
        name,
        title,
        company,
        email,
        source: "Manual",
        score: 65,
        status: "New",
        initials,
        avatar: "blue",
      },
      ...current,
    ])
    setIsAddLeadOpen(false)
    toast.success(`${name} was added to your leads.`)
  }

  function exportLeads() {
    if (filteredLeads.length === 0) {
      toast.error("There are no leads to export.")
      return
    }

    const csv = unparse(
      filteredLeads.map(({ name, title, company, email, source, score, status }) => ({
        name,
        title,
        company,
        email,
        source,
        score,
        status,
      })),
    )
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "pinpoint-leads.csv"
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`${filteredLeads.length} leads exported.`)
  }

  function chooseSection(label: string) {
    setActiveSection(label)
    setIsMobileNavOpen(false)
    if (label === "Integrations" || label === "Settings") {
      toast(`${label} workspace settings are coming soon.`)
    }
  }

  const sectionTitle =
    activeSection === "Review queue"
      ? "Review queue"
      : activeSection === "Activity"
        ? "Activity"
        : activeSection === "Leads"
          ? "Leads"
          : "Good morning, Alex"
  const [today] = useState(() =>
    new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      weekday: "long",
      year: "numeric",
    })
      .format(new Date())
      .toUpperCase(),
  )
  const sectionDescription =
    activeSection === "Review queue"
      ? "Give promising prospects a closer look."
      : activeSection === "Activity"
        ? "A real-time pulse on your lead workspace."
        : activeSection === "Leads"
          ? "Manage, qualify, and convert your best prospects."
          : "Here's what's happening with your leads today."

  return (
    <div className="app-shell">
      <Toaster position="bottom-right" richColors />
      <button
        aria-label="Close navigation"
        className={`mobile-scrim ${isMobileNavOpen ? "is-visible" : ""}`}
        onClick={() => setIsMobileNavOpen(false)}
        type="button"
      />
      <aside className={`sidebar ${isMobileNavOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" onClick={(event) => event.preventDefault()}>
          <BrandMark />
          <span>pinpoint</span>
          <span className="brand-beta">BETA</span>
        </a>

        <button
          className="workspace-switcher"
          onClick={() => toast("You're viewing the Acme Studio workspace.")}
          type="button"
        >
          <span className="workspace-icon">A</span>
          <span className="workspace-copy">
            <strong>Acme Studio</strong>
            <small>Growth workspace</small>
          </span>
          <ChevronDown size={15} />
        </button>

        <div className="sidebar-label">WORKSPACE</div>
        <nav aria-label="Main navigation" className="side-nav">
          {navigation.map(({ label, icon: Icon, count }) => (
            <button
              aria-current={activeSection === label ? "page" : undefined}
              className={`nav-item ${activeSection === label ? "nav-item-active" : ""}`}
              key={label}
              onClick={() => chooseSection(label)}
              type="button"
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {count && <span className="nav-count">{count}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-label sidebar-label-secondary">MANAGE</div>
        <nav aria-label="Workspace settings" className="side-nav">
          {workspaceNavigation.map(({ label, icon: Icon }) => (
            <button
              className="nav-item"
              key={label}
              onClick={() => chooseSection(label)}
              type="button"
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              <ArrowRight className="nav-arrow" size={14} />
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="plan-card">
          <div className="plan-card-icon">
            <Sparkles size={15} />
          </div>
          <strong>Make room to grow</strong>
          <p>You're using 78% of your monthly lead credits.</p>
          <div className="plan-progress">
            <span />
          </div>
          <button
            onClick={() => toast("Plan options are ready for your workspace admin.")}
            type="button"
          >
            Explore plans <ArrowRight size={14} />
          </button>
        </div>
        <button
          className="profile-button"
          onClick={() => toast("Account menu opened.")}
          type="button"
        >
          <Avatar initials="AJ" tone="gold" />
          <span className="profile-copy">
            <strong>Alex Johnson</strong>
            <small>Workspace admin</small>
          </span>
          <MoreHorizontal size={19} />
        </button>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button
              aria-label="Open navigation"
              className="icon-button mobile-menu-button"
              onClick={() => setIsMobileNavOpen(true)}
              type="button"
            >
              <Menu size={19} />
            </button>
            <div className="breadcrumbs">
              <span>Workspace</span>
              <span className="breadcrumb-divider">/</span>
              <strong>{activeSection}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <Search size={16} />
              <input
                aria-label="Search leads"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search anything..."
                ref={searchRef}
                value={search}
              />
              <kbd>
                <Command size={11} /> K
              </kbd>
            </label>
            <span className="topbar-divider" />
            <button
              aria-label="Notifications"
              className="icon-button notification-button"
              onClick={() => toast("You're all caught up.")}
              type="button"
            >
              <Bell size={18} />
              <span />
            </button>
            <Avatar initials="AJ" tone="gold" />
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" /> {today}
              </div>
              <h1>{sectionTitle}</h1>
              <p>{sectionDescription}</p>
            </div>
            <div className="heading-actions">
              <button className="button button-secondary" onClick={exportLeads} type="button">
                <Download size={16} /> Export
              </button>
              <button
                className="button button-primary"
                onClick={() => setIsAddLeadOpen(true)}
                type="button"
              >
                <Plus size={17} /> Add lead
              </button>
            </div>
          </section>

          <section aria-label="Lead performance" className="metric-grid">
            <article className="metric-card">
              <div className="metric-topline">
                <span className="metric-label">Total leads</span>
                <span className="metric-icon metric-icon-teal">
                  <Users size={17} />
                </span>
              </div>
              <div className="metric-value">12,842</div>
              <div className="metric-foot">
                <span className="metric-change">
                  <ArrowUpRight size={14} /> 12.8%
                </span>
                <span>vs. last month</span>
              </div>
            </article>
            <article className="metric-card">
              <div className="metric-topline">
                <span className="metric-label">Qualified leads</span>
                <span className="metric-icon metric-icon-sand">
                  <Target size={17} />
                </span>
              </div>
              <div className="metric-value">3,641</div>
              <div className="metric-foot">
                <span className="metric-change">
                  <ArrowUpRight size={14} /> 8.2%
                </span>
                <span>vs. last month</span>
              </div>
            </article>
            <article className="metric-card">
              <div className="metric-topline">
                <span className="metric-label">Avg. lead score</span>
                <span className="metric-icon metric-icon-lilac">
                  <Sparkles size={17} />
                </span>
              </div>
              <div className="metric-value">
                74<span className="metric-value-unit">/100</span>
              </div>
              <div className="metric-foot">
                <span className="metric-change">
                  <ArrowUpRight size={14} /> 4.6%
                </span>
                <span>vs. last month</span>
              </div>
            </article>
            <article className="metric-card">
              <div className="metric-topline">
                <span className="metric-label">Needs review</span>
                <span className="metric-icon metric-icon-rose">
                  <Clock3 size={17} />
                </span>
              </div>
              <div className="metric-value">128</div>
              <div className="metric-foot">
                <span className="metric-change metric-change-muted">
                  <ArrowDownRight size={14} /> 2.4%
                </span>
                <span>vs. last month</span>
              </div>
            </article>
          </section>

          <section className="insights-grid">
            <article className="panel trend-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title-row">
                    <h2>Lead activity</h2>
                    <span className="live-indicator">
                      <span /> Live
                    </span>
                  </div>
                  <p>Lead generation is trending up this week</p>
                </div>
                <button
                  className="select-button"
                  onClick={() => toast("Showing the last 7 days.")}
                  type="button"
                >
                  <CalendarDays size={15} /> Last 7 days <ChevronDown size={14} />
                </button>
              </div>
              <div aria-label="Lead activity chart" className="chart-wrap" role="img">
                <ResponsiveContainer height="100%" width="100%">
                  <AreaChart data={trendData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="leadFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#23877d" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#23877d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#edf0ef" strokeDasharray="3 5" vertical={false} />
                    <XAxis
                      axisLine={false}
                      dataKey="day"
                      tick={{ fill: "#98a09e", fontSize: 11 }}
                      tickLine={false}
                      tickMargin={12}
                    />
                    <YAxis
                      axisLine={false}
                      domain={[0, 80]}
                      tick={{ fill: "#98a09e", fontSize: 11 }}
                      tickLine={false}
                      ticks={[0, 20, 40, 60, 80]}
                    />
                    <Tooltip
                      contentStyle={{
                        border: "1px solid #e8ece9",
                        borderRadius: 10,
                        boxShadow: "0 8px 24px rgba(25, 44, 40, .1)",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#66716e", fontWeight: 600, marginBottom: 4 }}
                    />
                    <Area
                      dataKey="leads"
                      fill="url(#leadFill)"
                      name="New leads"
                      stroke="#23877d"
                      strokeWidth={2.5}
                      type="monotone"
                    />
                    <Area
                      dataKey="qualified"
                      fill="transparent"
                      name="Qualified"
                      stroke="#cda263"
                      strokeDasharray="4 5"
                      strokeWidth={1.8}
                      type="monotone"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend">
                <span>
                  <i className="legend-dot legend-dot-teal" /> New leads
                </span>
                <span>
                  <i className="legend-dot legend-dot-gold" /> Qualified
                </span>
                <span className="chart-summary">
                  +18.4% <span>compared to last week</span>
                </span>
              </div>
            </article>

            <article className="panel source-panel">
              <div className="panel-header">
                <div>
                  <h2>Lead sources</h2>
                  <p>Where your leads come from</p>
                </div>
                <button
                  aria-label="More lead source options"
                  className="icon-button panel-more"
                  onClick={() => toast("Lead source insights are up to date.")}
                  type="button"
                >
                  <MoreHorizontal size={19} />
                </button>
              </div>
              <div className="source-total">
                <strong>2,481</strong>
                <span>leads this month</span>
              </div>
              <div className="source-list">
                <div className="source-item">
                  <div className="source-meta">
                    <span>
                      <i className="source-dot source-dot-teal" /> Website
                    </span>
                    <strong>42%</strong>
                  </div>
                  <div className="source-track">
                    <span className="source-fill source-fill-teal" style={{ width: "42%" }} />
                  </div>
                </div>
                <div className="source-item">
                  <div className="source-meta">
                    <span>
                      <i className="source-dot source-dot-gold" /> LinkedIn
                    </span>
                    <strong>28%</strong>
                  </div>
                  <div className="source-track">
                    <span className="source-fill source-fill-gold" style={{ width: "28%" }} />
                  </div>
                </div>
                <div className="source-item">
                  <div className="source-meta">
                    <span>
                      <i className="source-dot source-dot-blue" /> Referrals
                    </span>
                    <strong>18%</strong>
                  </div>
                  <div className="source-track">
                    <span className="source-fill source-fill-blue" style={{ width: "18%" }} />
                  </div>
                </div>
                <div className="source-item">
                  <div className="source-meta">
                    <span>
                      <i className="source-dot source-dot-lilac" /> Other
                    </span>
                    <strong>12%</strong>
                  </div>
                  <div className="source-track">
                    <span className="source-fill source-fill-lilac" style={{ width: "12%" }} />
                  </div>
                </div>
              </div>
              <button className="text-link" onClick={() => chooseSection("Leads")} type="button">
                View source report <ArrowRight size={14} />
              </button>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel leads-panel">
              <div className="panel-header leads-panel-header">
                <div>
                  <div className="panel-title-row">
                    <h2>
                      {activeSection === "Review queue"
                        ? "Awaiting your review"
                        : "Recently added leads"}
                    </h2>
                    <span className="table-count">{filteredLeads.length}</span>
                  </div>
                  <p>Your most recent prospects and their qualification status</p>
                </div>
                <div className="table-actions">
                  <label className="table-search">
                    <Search size={15} />
                    <input
                      aria-label="Filter leads"
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Filter leads..."
                      value={search}
                    />
                    {search && (
                      <button aria-label="Clear search" onClick={() => setSearch("")} type="button">
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <label className="filter-control">
                    <Filter size={14} />
                    <select
                      aria-label="Filter by lead status"
                      onChange={(event) =>
                        setStatusFilter(event.target.value as (typeof statusFilters)[number])
                      }
                      value={statusFilter}
                    >
                      {statusFilters.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="table-scroll">
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th scope="col">Lead</th>
                      <th scope="col">Company</th>
                      <th scope="col">Source</th>
                      <th scope="col">Score</th>
                      <th scope="col">Status</th>
                      <th aria-label="Actions" scope="col" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map((lead) => (
                        <tr key={lead.id}>
                          <td>
                            <div className="lead-identity">
                              <Avatar initials={lead.initials} tone={lead.avatar} />
                              <span>
                                <strong>{lead.name}</strong>
                                <small>{lead.title}</small>
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="company-cell">
                              <span className="company-icon">
                                <Building2 size={14} />
                              </span>
                              <span>{lead.company}</span>
                            </div>
                          </td>
                          <td>
                            <span className="source-label">{lead.source}</span>
                          </td>
                          <td>
                            <div className="score-cell">
                              <span
                                className={`score-number ${lead.score >= 80 ? "score-strong" : ""}`}
                              >
                                {lead.score}
                              </span>
                              <span className="score-track">
                                <i style={{ width: `${lead.score}%` }} />
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`status-pill status-${lead.status.toLowerCase().replace(" ", "-")}`}
                            >
                              <i />
                              {lead.status}
                            </span>
                          </td>
                          <td>
                            <button
                              aria-label={`More options for ${lead.name}`}
                              className="row-more"
                              onClick={() => toast(`${lead.name} · ${lead.email}`)}
                              type="button"
                            >
                              <MoreHorizontal size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="empty-state" colSpan={6}>
                          <span className="empty-state-icon">
                            <Search size={17} />
                          </span>
                          <strong>No leads found</strong>
                          <small>Try another search or status filter.</small>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span>
                  Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong>{" "}
                  leads
                </span>
                <button className="text-link" onClick={() => chooseSection("Leads")} type="button">
                  View all leads <ArrowRight size={14} />
                </button>
              </div>
            </article>

            <article className="panel activity-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title-row">
                    <h2>Recent activity</h2>
                    <span className="activity-live">
                      <i /> Live
                    </span>
                  </div>
                  <p>What's happening across your workspace</p>
                </div>
                <button
                  aria-label="More activity options"
                  className="icon-button panel-more"
                  onClick={() => chooseSection("Activity")}
                  type="button"
                >
                  <MoreHorizontal size={19} />
                </button>
              </div>
              <div className="activity-feed">
                {activityFeed.map((item, index) => (
                  <div className="activity-item" key={item.initials}>
                    <Avatar initials={item.initials} tone={item.avatar} />
                    <div className="activity-copy">
                      <p>
                        <strong>{item.title}</strong> {item.action}
                      </p>
                      <span>{item.time}</span>
                    </div>
                    {index === 0 && <span className="activity-new" />}
                  </div>
                ))}
              </div>
              <button
                className="activity-link"
                onClick={() => chooseSection("Activity")}
                type="button"
              >
                <span>See all activity</span>
                <ArrowRight size={15} />
              </button>
            </article>
          </section>

          <footer className="page-footer">
            <span>© 2026 Pinpoint, Inc.</span>
            <span className="footer-links">
              <button onClick={() => toast("Help center opened.")} type="button">
                <CircleHelp size={13} /> Help center
              </button>
              <button onClick={() => toast("Email support at hello@pinpoint.app")} type="button">
                <Mail size={13} /> Contact support
              </button>
            </span>
          </footer>
        </div>
      </main>

      <Dialog onOpenChange={setIsAddLeadOpen} open={isAddLeadOpen}>
        <DialogContent className="lead-dialog">
          <DialogHeader>
            <div className="dialog-kicker">
              <span>
                <Plus size={15} />
              </span>{" "}
              NEW PROSPECT
            </div>
            <DialogTitle>Add a lead</DialogTitle>
            <DialogDescription>
              Add a prospect to your workspace. You can enrich their profile later.
            </DialogDescription>
          </DialogHeader>
          <form className="lead-form" onSubmit={handleAddLead}>
            <label>
              Full name
              <input autoFocus name="name" placeholder="e.g. Jordan Lee" required />
            </label>
            <label>
              Work email
              <input name="email" placeholder="jordan@company.com" required type="email" />
            </label>
            <div className="form-row">
              <label>
                Job title
                <input name="title" placeholder="e.g. VP of Sales" required />
              </label>
              <label>
                Company
                <input name="company" placeholder="e.g. Acme Inc." required />
              </label>
            </div>
            <DialogFooter className="lead-form-footer">
              <button
                className="button button-secondary"
                onClick={() => setIsAddLeadOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button className="button button-primary" type="submit">
                <Plus size={16} /> Add lead
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
