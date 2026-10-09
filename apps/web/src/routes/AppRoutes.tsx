import { lazy, Suspense } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router"
import { Skeleton } from "@/components/ui/skeleton"
import { AppShell } from "@/components/layout/AppShell"

const DashboardPage = lazy(() => import("@/pages/DashboardPage"))
const LeadsPage = lazy(() => import("@/pages/LeadsPage"))
const LeadDetailsPage = lazy(() => import("@/pages/LeadDetailsPage"))
const ReviewPage = lazy(() => import("@/pages/ReviewPage"))
const ListsPage = lazy(() => import("@/pages/ListsPage"))
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"))
const SettingsPage = lazy(() => import("@/pages/SettingsPage"))

function RouteFallback() {
  return (
    <div className="route-loading" aria-label="Loading page">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="mt-5 h-64 w-full" />
    </div>
  )
}

export function AppRoutes() {
  const location = useLocation()
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="leads" element={<LeadsPage key={location.search} />} />
          <Route path="leads/:leadId" element={<LeadDetailsPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="lists" element={<ListsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
