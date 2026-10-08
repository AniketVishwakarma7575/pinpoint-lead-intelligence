import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import App from "./App"

describe("Pinpoint dashboard", () => {
  it("renders the workspace overview and sample leads", () => {
    const markup = renderToStaticMarkup(<App />)

    expect(markup).toContain("Good morning, Alex")
    expect(markup).toContain("Lead activity")
    expect(markup).toContain("Recently added leads")
    expect(markup).toContain("Olivia Rhye")
  })
})
