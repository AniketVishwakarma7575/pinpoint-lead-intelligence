import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { PinpointToast } from "@/components/common/PinpointToast"

describe("PinpointToast", () => {
  it("states the status in text, not only color", () => {
    const html = renderToStaticMarkup(<PinpointToast variant="error" title="Export failed" />)
    expect(html).toContain("Error: ")
    expect(html).toContain("Export failed")
    expect(html).toContain('aria-label="Dismiss notification"')
  })

  it("renders an action and a countdown only when timed", () => {
    const timed = renderToStaticMarkup(
      <PinpointToast
        variant="success"
        title="Lead saved"
        action={{ label: "Undo", onClick: () => {} }}
        duration={6000}
      />,
    )
    expect(timed).toContain("Undo")
    expect(timed).toContain("pp-toast__bar")
    const loading = renderToStaticMarkup(
      <PinpointToast variant="loading" title="Validating" duration={Infinity} />,
    )
    expect(loading).not.toContain("pp-toast__bar")
    expect(loading).not.toContain("Dismiss notification")
  })
})
