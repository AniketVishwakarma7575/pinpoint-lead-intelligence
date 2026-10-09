import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  Globe2,
  LockKeyhole,
  Mail,
  SlidersHorizontal,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react"
import { toast } from "@/lib/notify"
import { useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/common/PageHeader"
import { SCORE_FACTOR_LABELS, type IcpProfile, type ScoreFactorKey } from "@/types"
import { useAppStore } from "@/stores/appStore"

type SettingsTab = "Ideal customer profile" | "Profile" | "Workspace" | "Notifications" | "Security"

type SettingsValues = {
  fullName: string
  email: string
  jobTitle: string
  workspaceName: string
  workspaceUrl: string
  timezone: string
  region: string
  dateFormat: string
  leadAlerts: boolean
  weeklySummary: boolean
  productUpdates: boolean
  securityAlerts: boolean
}

const SETTINGS_STORAGE_KEY = "pinpoint-workspace-settings"

const defaultSettings: SettingsValues = {
  fullName: "Alex Johnson",
  email: "alex@acmestudio.com",
  jobTitle: "Workspace admin",
  workspaceName: "Acme Studio",
  workspaceUrl: "acme-studio",
  timezone: "America/Los_Angeles",
  region: "United States",
  dateFormat: "October 9, 2026",
  leadAlerts: true,
  weeklySummary: true,
  productUpdates: false,
  securityAlerts: true,
}

function isSettingsValues(value: unknown): value is SettingsValues {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.fullName === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.jobTitle === "string" &&
    typeof candidate.workspaceName === "string" &&
    typeof candidate.workspaceUrl === "string" &&
    typeof candidate.timezone === "string" &&
    typeof candidate.region === "string" &&
    typeof candidate.dateFormat === "string" &&
    typeof candidate.leadAlerts === "boolean" &&
    typeof candidate.weeklySummary === "boolean" &&
    typeof candidate.productUpdates === "boolean" &&
    typeof candidate.securityAlerts === "boolean"
  )
}

const settingsTabs: Array<{ label: SettingsTab; icon: typeof UserRound }> = [
  { label: "Ideal customer profile", icon: Target },
  { label: "Profile", icon: UserRound },
  { label: "Workspace", icon: Building2 },
  { label: "Notifications", icon: Bell },
  { label: "Security", icon: ShieldCheck },
]

function loadSettings(): SettingsValues {
  if (typeof window === "undefined") return defaultSettings

  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!stored) return defaultSettings

    const parsed: unknown = JSON.parse(stored)
    if (!isSettingsValues(parsed)) {
      throw new Error("Saved settings have an invalid shape.")
    }

    return parsed
  } catch (error) {
    console.error("Unable to load saved workspace settings.", error)
    return defaultSettings
  }
}

function Field({ children, label, hint }: { children: ReactNode; label: string; hint?: string }) {
  return (
    <label className="settings-field">
      <span className="settings-field-label">{label}</span>
      {children}
      {hint && <span className="settings-field-hint">{hint}</span>}
    </label>
  )
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("Profile")
  const [settings, setSettings] = useState(loadSettings)
  const icp = useAppStore((state) => state.icp)
  const updateProfile = useAppStore((state) => state.updateProfile)
  const updateIcp = useAppStore((state) => state.updateIcp)
  const [draftIcp, setDraftIcp] = useState<IcpProfile>(icp)
  const queryClient = useQueryClient()
  const scoreWeightTotal = Object.values(draftIcp.weights).reduce((sum, weight) => sum + weight, 0)
  const isIcpValid =
    scoreWeightTotal === 100 &&
    draftIcp.minEmployees <= draftIcp.maxEmployees &&
    draftIcp.minRevenue <= draftIcp.maxRevenue
  const initials = settings.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  useEffect(() => {
    updateProfile({ fullName: settings.fullName, email: settings.email })
  }, [settings.fullName, settings.email, updateProfile])

  function update<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (activeTab === "Ideal customer profile" && !isIcpValid) {
      toast.error("Check the ideal customer profile values and make sure score weights total 100.")
      return
    }
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      updateProfile({ fullName: settings.fullName, email: settings.email })
      updateIcp(draftIcp)
      void queryClient.invalidateQueries()
      toast.success("Your settings have been saved on this device.")
    } catch (error) {
      console.error("Unable to save workspace settings.", error)
      toast.error("Settings could not be saved. Check your browser storage permissions.")
    }
  }

  function renderIcp() {
    const weightTotal = Object.values(draftIcp.weights).reduce((sum, weight) => sum + weight, 0)
    const factorKeys = Object.keys(draftIcp.weights) as ScoreFactorKey[]
    const updateWeight = (key: ScoreFactorKey, value: number) =>
      setDraftIcp((current) => ({
        ...current,
        weights: { ...current.weights, [key]: Math.max(0, Math.min(100, value)) },
      }))
    const updateNumber = (
      key: "minEmployees" | "maxEmployees" | "minRevenue" | "maxRevenue",
      value: number,
    ) => setDraftIcp((current) => ({ ...current, [key]: Math.max(0, value) }))
    const updateTags = (key: "industries" | "regions" | "technologies", value: string) =>
      setDraftIcp((current) => ({
        ...current,
        [key]: [
          ...new Set(
            value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          ),
        ],
      }))
    return (
      <>
        <div className="settings-section-heading">
          <span className="settings-section-icon">
            <Target size={17} />
          </span>
          <div>
            <h3>Ideal customer profile</h3>
            <p>Set your target account criteria and transparent score weighting.</p>
          </div>
        </div>
        <div className="icp-settings-section">
          <h4>
            <SlidersHorizontal size={15} /> Lead score weights <span>{weightTotal}/100</span>
          </h4>
          <p>
            Weights must add up to 100 points. Score changes apply to every lead in your workspace.
          </p>
          <div className="icp-weight-grid">
            {factorKeys.map((key) => (
              <label key={key}>
                <span>{SCORE_FACTOR_LABELS[key]}</span>
                <input
                  max={100}
                  min={0}
                  onChange={(event) => updateWeight(key, Number(event.target.value))}
                  type="number"
                  value={draftIcp.weights[key]}
                />
                <small>points</small>
              </label>
            ))}
          </div>
          {weightTotal !== 100 && (
            <p className="icp-weight-warning" role="alert">
              Adjust the weights to total exactly 100 before saving.
            </p>
          )}
        </div>
        <div className="icp-settings-section">
          <h4>
            <Target size={15} /> Firmographic fit
          </h4>
          <div className="settings-form-grid">
            <Field label="Minimum employees">
              <input
                min={0}
                onChange={(event) => updateNumber("minEmployees", Number(event.target.value))}
                type="number"
                value={draftIcp.minEmployees}
              />
            </Field>
            <Field label="Maximum employees">
              <input
                min={draftIcp.minEmployees}
                onChange={(event) => updateNumber("maxEmployees", Number(event.target.value))}
                type="number"
                value={draftIcp.maxEmployees}
              />
            </Field>
            <Field label="Minimum annual revenue (USD)">
              <input
                min={0}
                onChange={(event) => updateNumber("minRevenue", Number(event.target.value))}
                type="number"
                value={draftIcp.minRevenue}
              />
            </Field>
            <Field label="Maximum annual revenue (USD)">
              <input
                min={draftIcp.minRevenue}
                onChange={(event) => updateNumber("maxRevenue", Number(event.target.value))}
                type="number"
                value={draftIcp.maxRevenue}
              />
            </Field>
            <Field hint="Separate values with commas." label="Target industries">
              <textarea
                onChange={(event) => updateTags("industries", event.target.value)}
                rows={3}
                value={draftIcp.industries.join(", ")}
              />
            </Field>
            <Field hint="Separate values with commas." label="Target regions">
              <textarea
                onChange={(event) => updateTags("regions", event.target.value)}
                rows={3}
                value={draftIcp.regions.join(", ")}
              />
            </Field>
            <Field
              hint="Technology signals count toward the technology-fit score."
              label="Target technologies"
            >
              <textarea
                onChange={(event) => updateTags("technologies", event.target.value)}
                rows={3}
                value={draftIcp.technologies.join(", ")}
              />
            </Field>
          </div>
        </div>
      </>
    )
  }

  function renderProfile() {
    return (
      <>
        <div className="settings-section-heading">
          <div className="settings-avatar">{initials || "AJ"}</div>
          <div>
            <h3>Personal information</h3>
            <p>Update the details associated with your account.</p>
          </div>
        </div>
        <div className="settings-form-grid">
          <Field label="Full name">
            <input
              autoComplete="name"
              onChange={(event) => update("fullName", event.target.value)}
              required
              value={settings.fullName}
            />
          </Field>
          <Field hint="Used for account notifications and sign-in." label="Email address">
            <input
              autoComplete="email"
              onChange={(event) => update("email", event.target.value)}
              required
              type="email"
              value={settings.email}
            />
          </Field>
          <Field label="Job title">
            <input
              onChange={(event) => update("jobTitle", event.target.value)}
              placeholder="e.g. Head of Growth"
              value={settings.jobTitle}
            />
          </Field>
          <Field label="Time zone">
            <select
              onChange={(event) => update("timezone", event.target.value)}
              value={settings.timezone}
            >
              <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
              <option value="America/Denver">Mountain Time (US & Canada)</option>
              <option value="America/Chicago">Central Time (US & Canada)</option>
              <option value="America/New_York">Eastern Time (US & Canada)</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Central European Time</option>
              <option value="Asia/Kolkata">India Standard Time</option>
              <option value="Asia/Singapore">Singapore</option>
            </select>
          </Field>
        </div>
      </>
    )
  }

  function renderWorkspace() {
    return (
      <>
        <div className="settings-section-heading">
          <span className="settings-section-icon">
            <Building2 size={17} />
          </span>
          <div>
            <h3>Workspace details</h3>
            <p>Manage the name and URL your team uses to find this workspace.</p>
          </div>
        </div>
        <div className="settings-form-grid">
          <Field label="Workspace name">
            <input
              onChange={(event) => update("workspaceName", event.target.value)}
              required
              value={settings.workspaceName}
            />
          </Field>
          <Field hint="Your unique workspace address." label="Workspace URL">
            <div className="settings-url-field">
              <span>pinpoint.app/</span>
              <input
                onChange={(event) =>
                  update(
                    "workspaceUrl",
                    event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  )
                }
                required
                value={settings.workspaceUrl}
              />
            </div>
          </Field>
          <Field label="Default region">
            <select
              onChange={(event) => update("region", event.target.value)}
              value={settings.region}
            >
              <option>United States</option>
              <option>Canada</option>
              <option>United Kingdom</option>
              <option>European Union</option>
              <option>India</option>
              <option>Singapore</option>
            </select>
          </Field>
          <Field hint="Used to format dates in your workspace." label="Date format">
            <select
              onChange={(event) => update("dateFormat", event.target.value)}
              value={settings.dateFormat}
            >
              <option>October 9, 2026</option>
              <option>09/10/2026</option>
              <option>2026-10-09</option>
            </select>
          </Field>
        </div>
        <div className="settings-info-callout">
          <Globe2 size={16} />
          <span>
            Workspace URLs are shared with your team. Choose a name that is easy to recognize.
          </span>
        </div>
      </>
    )
  }

  function renderNotifications() {
    const options: Array<{
      key: keyof Pick<
        SettingsValues,
        "leadAlerts" | "weeklySummary" | "productUpdates" | "securityAlerts"
      >
      title: string
      description: string
      icon: typeof UserRound
    }> = [
      {
        key: "leadAlerts",
        title: "Lead activity",
        description: "Get notified when a lead is added, qualified, or needs your review.",
        icon: Bell,
      },
      {
        key: "weeklySummary",
        title: "Weekly summary",
        description: "A Monday overview of lead growth, conversion, and team activity.",
        icon: Mail,
      },
      {
        key: "productUpdates",
        title: "Product updates",
        description: "Hear about new features and improvements to Pinpoint.",
        icon: Globe2,
      },
      {
        key: "securityAlerts",
        title: "Security alerts",
        description: "Important updates about sign-ins and workspace security.",
        icon: LockKeyhole,
      },
    ]

    return (
      <>
        <div className="settings-section-heading">
          <span className="settings-section-icon">
            <Bell size={17} />
          </span>
          <div>
            <h3>Email notifications</h3>
            <p>Choose which updates arrive in your inbox.</p>
          </div>
        </div>
        <div className="settings-options">
          {options.map(({ key, title, description, icon: Icon }) => (
            <div className="settings-option" key={key}>
              <span className="settings-option-icon">
                <Icon size={16} />
              </span>
              <span className="settings-option-copy">
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <button
                aria-checked={settings[key]}
                aria-label={title}
                className={`settings-switch ${settings[key] ? "is-on" : ""}`}
                onClick={() => update(key, !settings[key])}
                role="switch"
                type="button"
              >
                <span />
              </button>
            </div>
          ))}
        </div>
      </>
    )
  }

  function renderSecurity() {
    return (
      <>
        <div className="settings-section-heading">
          <span className="settings-section-icon">
            <ShieldCheck size={17} />
          </span>
          <div>
            <h3>Security & access</h3>
            <p>Review how your account is protected.</p>
          </div>
        </div>
        <div className="settings-security-card">
          <span className="security-status-icon">
            <LockKeyhole size={18} />
          </span>
          <div>
            <strong>Authentication is not connected</strong>
            <p>
              Password and multi-factor authentication settings will be available when account
              sign-in is configured.
            </p>
          </div>
          <span className="settings-coming-soon">COMING SOON</span>
        </div>
        <div className="settings-security-row">
          <div>
            <strong>Workspace access</strong>
            <p>Workspace membership is managed by your team administrator.</p>
          </div>
          <span className="settings-security-badge">
            <Check size={13} /> Admin managed
          </span>
        </div>
      </>
    )
  }

  const tabContent: Record<SettingsTab, () => ReactNode> = {
    "Ideal customer profile": renderIcp,
    Profile: renderProfile,
    Workspace: renderWorkspace,
    Notifications: renderNotifications,
    Security: renderSecurity,
  }

  return (
    <>
      <PageHeader
        description="Manage your ideal customer profile, workspace and account preferences."
        eyebrow="WORKSPACE PREFERENCES"
        title="Settings"
      />

      <div className="settings-layout">
        <nav aria-label="Settings sections" className="settings-nav">
          <span className="settings-nav-label">PREFERENCES</span>
          {settingsTabs.map(({ label, icon: Icon }) => (
            <button
              aria-current={activeTab === label ? "page" : undefined}
              className={`settings-nav-item ${activeTab === label ? "is-active" : ""}`}
              key={label}
              onClick={() => setActiveTab(label)}
              type="button"
            >
              <Icon size={16} />
              <span>{label}</span>
              <ChevronRight className="settings-nav-arrow" size={14} />
            </button>
          ))}
          <div className="settings-nav-help">
            <span>
              <CircleHelp size={15} />
            </span>
            <strong>Need a hand?</strong>
            <p>Our team is here to help you get the most out of Pinpoint.</p>
            <a href="mailto:hello@pinpoint.app">
              Contact support <ChevronRight size={13} />
            </a>
          </div>
        </nav>

        <form className="settings-card" onSubmit={saveSettings}>
          <div className="settings-card-header">
            <div>
              <span className="settings-card-eyebrow">YOUR WORKSPACE</span>
              <h2>{activeTab}</h2>
              <p>
                {activeTab === "Ideal customer profile" &&
                  "Tune the audience and weights behind every lead score."}
                {activeTab === "Profile" && "Your personal details and regional preferences."}
                {activeTab === "Workspace" && "The details your team sees across Pinpoint."}
                {activeTab === "Notifications" &&
                  "Keep the updates that matter. Turn off the rest."}
                {activeTab === "Security" && "Manage your account protection and workspace access."}
              </p>
            </div>
            {activeTab === "Profile" && (
              <span className="settings-profile-email">
                <Mail size={13} /> {settings.email}
              </span>
            )}
          </div>

          <div className="settings-card-body">{tabContent[activeTab]()}</div>

          {activeTab !== "Security" && (
            <div className="settings-card-footer">
              <span>
                {activeTab === "Ideal customer profile" && !isIcpValid
                  ? "Check score weights and target ranges before saving."
                  : "Changes are stored in this browser for this device."}
              </span>
              <button
                className="button button-primary"
                disabled={activeTab === "Ideal customer profile" && !isIcpValid}
                type="submit"
              >
                <Check size={15} /> Save changes
              </button>
            </div>
          )}
        </form>
      </div>
    </>
  )
}

export default SettingsPage
