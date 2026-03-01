import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { PdfStoreProvider } from "@/hooks/use-pdf-store"
import { PdfToolkit } from "@/components/pdf-toolkit"

// Mock heavy components
vi.mock("@/components/sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}))

vi.mock("@/components/page-grid", () => ({
  PageGrid: () => <div data-testid="page-grid">PageGrid</div>,
}))

vi.mock("@/components/toc-editor", () => ({
  TocEditor: () => <div data-testid="toc-editor">TocEditor</div>,
}))

vi.mock("@/components/metadata-panel", () => ({
  MetadataPanel: () => <div data-testid="metadata-panel">MetadataPanel</div>,
}))

vi.mock("@/components/split-panel", () => ({
  SplitPanel: () => <div data-testid="split-panel">SplitPanel</div>,
}))

vi.mock("@/lib/pdf/operations", () => ({
  createPdfWithPageOrder: vi.fn(),
  mergePdfs: vi.fn(),
}))

vi.mock("@/lib/pdf/download", () => ({
  downloadBlob: vi.fn(),
}))

function renderWithProvider(ui: React.ReactElement) {
  return render(<PdfStoreProvider>{ui}</PdfStoreProvider>)
}

describe("PdfToolkit", () => {
  it("renders LandingPage when no files are present", () => {
    renderWithProvider(<PdfToolkit />)
    // LandingPage is not mocked, so its content is displayed
    expect(screen.getByText("pdf-toc-tools")).toBeInTheDocument()
  })
})
