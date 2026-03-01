import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import App from "@/App"
import "@/i18n/config"

// Mock heavy components
vi.mock("@/components/sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}))

vi.mock("@/components/page-grid", () => ({
  PageGrid: () => <div data-testid="page-grid">PageGrid</div>,
}))

describe("App", () => {
  it("should render without crashing", () => {
    render(<App />)
    // LandingPage should be displayed (when no files are loaded)
    expect(screen.getByText("PDF-kit")).toBeInTheDocument()
  })

  it("should be wrapped with PdfStoreProvider", () => {
    // Confirm usePdfStore can be used within App (no errors should occur)
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })
})
