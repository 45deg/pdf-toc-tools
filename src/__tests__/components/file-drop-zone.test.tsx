import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PdfStoreProvider } from "@/hooks/use-pdf-store"
import { FileDropZone } from "@/components/file-drop-zone"

function renderWithProvider(ui: React.ReactElement) {
  return render(<PdfStoreProvider>{ui}</PdfStoreProvider>)
}

describe("FileDropZone", () => {
  describe("インラインモード（デフォルト）", () => {
    it("デフォルトテキストを表示する", () => {
      renderWithProvider(<FileDropZone />)
      expect(screen.getByText("+ PDF追加")).toBeInTheDocument()
    })

    it("file input 要素が存在する", () => {
      renderWithProvider(<FileDropZone />)
      const input = document.querySelector('input[type="file"]')
      expect(input).toBeTruthy()
    })
  })

  describe("フルページモード", () => {
    it("フルスクリーンテキストを表示する", () => {
      renderWithProvider(<FileDropZone fullPage />)
      expect(
        screen.getByText("PDFファイルをドラッグ＆ドロップ")
      ).toBeInTheDocument()
      expect(
        screen.getByText("またはクリックしてファイルを選択")
      ).toBeInTheDocument()
    })
  })

  it("カスタムclassNameを適用できる", () => {
    const { container } = renderWithProvider(
      <FileDropZone className="custom-class" />
    )
    expect(container.firstChild).toHaveClass("custom-class")
  })
})
