import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import SettingsPage from "./pages/SettingsPage"
import App from "./App"

describe("Pinpoint dashboard", () => {
  it("renders the workspace overview and sample leads", () => {
    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain("Good morning, Alex")
    expect(markup).toContain("Lead activity")
    expect(markup).toContain("Recently added leads")
    expect(markup).toContain("Olivia Rhye")
  })

  it("renders the profile settings and save controls", () => {
    const markup = renderToStaticMarkup(<SettingsPage />)

    expect(markup).toContain("WORKSPACE PREFERENCES")
    expect(markup).toContain("Personal information")
    expect(markup).toContain("alex@acmestudio.com")
    expect(markup).toContain("Save changes")
  })
})
