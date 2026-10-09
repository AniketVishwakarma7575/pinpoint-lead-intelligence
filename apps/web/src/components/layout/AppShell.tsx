import { useEffect, useState } from "react"
import {
  Activity,
  BarChart3,
  Bell,
  Command,
  LayoutDashboard,
  ListChecks,
  Menu,
  Search,
  Settings2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router"
import { BrandLogo } from "@/components/common/BrandLogo"
import { PinpointToaster } from "@/components/common/PinpointToaster"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useReviewQueue } from "@/hooks/useLeadQueries"
import { useAppStore } from "@/stores/appStore"

const primaryLinks: Array<{ label: string; to: string; icon: LucideIcon }> = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Leads", to: "/leads", icon: Users },
  { label: "Review queue", to: "/review", icon: ListChecks },
  { label: "Saved lists", to: "/lists", icon: Activity },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
]

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function AppShell() {
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const locationKey = `${location.pathname}${location.search}`
  const routeSearchValue = new URLSearchParams(location.search).get("q") ?? ""
  const [searchState, setSearchState] = useState(() => ({
    location: locationKey,
    value: routeSearchValue,
  }))
  const searchValue = searchState.location === locationKey ? searchState.value : routeSearchValue
  const profile = useAppStore((state) => state.profile)
  const reviewQueue = useReviewQueue()
  const reviewCount = reviewQueue.data?.items.length ?? 0
  const pageName =
    primaryLinks.find((item) => item.to === location.pathname)?.label ??
    (location.pathname.startsWith("/leads/") ? "Lead details" : "Settings")

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen(true)
      }
      if (event.key === "Escape") {
        setMobileNavOpen(false)
      }
    }
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])

  function submitSearch(value = searchValue) {
    const params = new URLSearchParams()
    if (value.trim()) params.set("q", value.trim())
    navigate(`/leads${params.size ? `?${params.toString()}` : ""}`)
    setMobileNavOpen(false)
  }

  function updateSearchValue(value: string) {
    setSearchState({ location: locationKey, value })
  }

  function go(path: string) {
    navigate(path)
    setCommandOpen(false)
    setMobileNavOpen(false)
  }

  return (
    <div className="product-shell">
      <PinpointToaster />
      <button
        aria-label="Close menu"
        className={`product-scrim ${mobileNavOpen ? "product-scrim-visible" : ""}`}
        onClick={() => setMobileNavOpen(false)}
        type="button"
      />
      <aside className={`product-sidebar ${mobileNavOpen ? "product-sidebar-open" : ""}`}>
        <Link aria-label="Pinpoint home" className="product-brand" to="/">
          <BrandLogo />
          <span className="product-beta">BETA</span>
        </Link>

        <div className="workspace-chip">
          <span className="workspace-chip-icon">P</span>
          <span>
            <strong>Pinpoint</strong>
            <small>Lead intelligence</small>
          </span>
        </div>

        <div className="product-nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation" className="product-nav">
          {primaryLinks.map(({ label, to, icon: Icon }) => (
            <NavLink end={to === "/"} key={to} onClick={() => setMobileNavOpen(false)} to={to}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Review queue" && reviewCount > 0 && (
                <span className="product-nav-count">{reviewCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="product-nav-label product-nav-label-manage">PREFERENCES</div>
        <nav aria-label="Account navigation" className="product-nav">
          <NavLink onClick={() => setMobileNavOpen(false)} to="/settings">
            <Settings2 size={17} strokeWidth={1.8} />
            <span>Settings</span>
          </NavLink>
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-data-note">
          <span>
            <Activity size={14} />
          </span>
          <p>
            <strong>Quality-first pipeline</strong>Every score is explainable and every record is
            reviewable.
          </p>
        </div>
        <Link
          className="product-profile-link"
          onClick={() => setMobileNavOpen(false)}
          to="/settings"
        >
          <span className="product-profile-avatar">{initialsFor(profile.fullName) || "P"}</span>
          <span>
            <strong>{profile.fullName || "Your profile"}</strong>
            <small>ICP settings</small>
          </span>
          <Settings2 size={15} />
        </Link>
      </aside>

      <main className="product-main">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header className="product-topbar">
          <div className="product-topbar-left">
            <button
              aria-label="Open navigation"
              className="product-icon-button product-mobile-menu"
              onClick={() => setMobileNavOpen(true)}
              type="button"
            >
              <Menu size={19} />
            </button>
            <div className="product-breadcrumb">
              <span>Pinpoint</span>
              <i>/</i>
              <strong>{pageName}</strong>
            </div>
          </div>
          <div className="product-topbar-actions">
            <form
              className="product-search"
              onSubmit={(event) => {
                event.preventDefault()
                submitSearch()
              }}
            >
              <Search size={15} />
              <input
                aria-label="Search leads"
                onChange={(event) => updateSearchValue(event.target.value)}
                placeholder="Search leads..."
                value={searchValue}
              />
              {searchValue ? (
                <button
                  aria-label="Clear search"
                  onClick={() => updateSearchValue("")}
                  type="button"
                >
                  <X size={13} />
                </button>
              ) : (
                <button
                  aria-label="Open command palette"
                  className="search-shortcut"
                  onClick={() => setCommandOpen(true)}
                  type="button"
                >
                  <Command size={10} /> K
                </button>
              )}
            </form>
            <button
              aria-label="Open review queue"
              className="product-icon-button product-notification-button"
              onClick={() => go("/review")}
              type="button"
            >
              <Bell size={17} />
              {reviewCount > 0 && <span />}
            </button>
            <Link
              aria-label={`Settings for ${profile.fullName}`}
              className="topbar-avatar"
              to="/settings"
            >
              {initialsFor(profile.fullName) || "P"}
            </Link>
          </div>
        </header>

        <div id="main-content" className="product-content">
          <Outlet />
        </div>
      </main>

      <Dialog onOpenChange={setCommandOpen} open={commandOpen}>
        <DialogContent className="command-dialog" showCloseButton={false}>
          <DialogTitle className="sr-only">Quick navigation</DialogTitle>
          <DialogDescription className="sr-only">
            Search pages and jump to common actions.
          </DialogDescription>
          <form
            className="command-search"
            onSubmit={(event) => {
              event.preventDefault()
              submitSearch(searchValue)
              setCommandOpen(false)
            }}
          >
            <Search size={17} />
            <input
              autoFocus
              aria-label="Search leads or pages"
              onChange={(event) => updateSearchValue(event.target.value)}
              placeholder="Search leads or jump to a page..."
              value={searchValue}
            />
            <kbd>ESC</kbd>
          </form>
          <div className="command-results">
            <span className="command-group-label">PAGES</span>
            {primaryLinks.map(({ label, to, icon: Icon }) => (
              <button key={to} onClick={() => go(to)} type="button">
                <Icon size={16} />
                <span>{label}</span>
                <span className="command-enter">Enter</span>
              </button>
            ))}
            <button onClick={() => go("/settings")} type="button">
              <Settings2 size={16} />
              <span>Settings</span>
              <span className="command-enter">Enter</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <span className="sr-only" aria-live="polite">
        {pageName} page
      </span>
    </div>
  )
}
