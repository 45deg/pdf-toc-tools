import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PdfStoreProvider } from "@/hooks/use-pdf-store"
import { FileDropZone } from "@/components/file-drop-zone"

function renderWithProvider(ui: React.ReactElement) {
  return render(<PdfStoreProvider>{ui}</PdfStoreProvider>)
}

describe("FileDropZone", () => {
  describe("Inline mode (default)", () => {
    it("renders default text", () => {
      renderWithProvider(<FileDropZone />)
      expect(screen.getByText("landing.dropzone.addPdf")).toBeInTheDocument()
    })

    it("has a file input element", () => {
      renderWithProvider(<FileDropZone />)
      const input = document.querySelector('input[type="file"]')
      expect(input).toBeTruthy()
    })
  })

  describe("Full page mode", () => {
    it("renders full screen text", () => {
      renderWithProvider(<FileDropZone fullPage />)
      expect(
        screen.getByText("landing.dropzone.dragText")
      ).toBeInTheDocument()
      expect(
        screen.getByText("landing.dropzone.clickText")
      ).toBeInTheDocument()
    })
  })

  it("can apply a custom className", () => {
    const { container } = renderWithProvider(
      <FileDropZone className="custom-class" />
    )
    expect(container.firstChild).toHaveClass("custom-class")
  })
})
