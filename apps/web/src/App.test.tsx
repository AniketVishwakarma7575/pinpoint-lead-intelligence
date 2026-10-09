import { renderToStaticMarkup } from "react-dom/server"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { AppShell } from "./components/layout/AppShell"
import SettingsPage from "./pages/SettingsPage"

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe("Pinpoint application shell", () => {
  it("renders routed workspace navigation", () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={createClient()}>
        <MemoryRouter>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(markup).toContain("Pinpoint")
    expect(markup).toContain("Overview")
    expect(markup).toContain("Leads")
    expect(markup).toContain("Review queue")
    expect(markup).toContain("Settings")
  })

  it("renders the profile and ideal customer profile settings", () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={createClient()}>
        <SettingsPage />
      </QueryClientProvider>,
    )

    expect(markup).toContain("WORKSPACE PREFERENCES")
    expect(markup).toContain("Personal information")
    expect(markup).toContain("alex@acmestudio.com")
    expect(markup).toContain("Save changes")
    expect(markup).toContain("Ideal customer profile")
  })
})
