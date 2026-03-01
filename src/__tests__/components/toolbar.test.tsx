import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PdfStoreProvider } from "@/hooks/use-pdf-store"
import { Toolbar } from "@/components/toolbar"

// Mock PDF operations
vi.mock("@/lib/pdf/operations", () => ({
  createPdfWithPageOrder: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  mergePdfs: vi.fn().mockResolvedValue({
    data: new Uint8Array([1, 2, 3]),
    outline: [],
  }),
}))

vi.mock("@/lib/pdf/download", () => ({
  downloadBlob: vi.fn(),
}))

function renderWithProvider(ui: React.ReactElement) {
  return render(<PdfStoreProvider>{ui}</PdfStoreProvider>)
}

describe("Toolbar", () => {
  it("displays view mode toggle buttons", () => {
    renderWithProvider(<Toolbar />)
    expect(screen.getByText("toolbar.pages")).toBeInTheDocument()
    expect(screen.getByText("landing.tocEditor.title")).toBeInTheDocument()
    expect(screen.getByText("toolbar.split")).toBeInTheDocument()
    expect(screen.getByText("toolbar.metadata")).toBeInTheDocument()
  })

  it("can switch view modes", async () => {
    const user = userEvent.setup()
    renderWithProvider(<Toolbar />)

    const tocButton = screen.getByText("landing.tocEditor.title")
    await user.click(tocButton)
    // Verify TOC button has active style applied
    expect(tocButton.className).toContain("bg-background")
  })

  it("displays download button in disabled state (no files)", () => {
    renderWithProvider(<Toolbar />)
    const downloadLabel = screen.queryByText(/toolbar\.download\.total/i)
    expect(downloadLabel).toBeInTheDocument()
    const downloadButton = downloadLabel?.closest("button")
    expect(downloadButton).toBeDisabled()
  })

  it("displays file drop zone for adding PDFs", () => {
    renderWithProvider(<Toolbar />)
    expect(screen.getByText("landing.dropzone.addPdf")).toBeInTheDocument()
  })

  it("sets initial view mode to pages", () => {
    renderWithProvider(<Toolbar />)
    const pagesButton = screen.getByText("toolbar.pages")
    expect(pagesButton.className).toContain("bg-background")
  })
})
