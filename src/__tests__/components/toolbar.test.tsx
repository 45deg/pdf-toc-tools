import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PdfStoreProvider } from "@/hooks/use-pdf-store"
import { Toolbar } from "@/components/toolbar"

// pdf operations をモック
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
  it("ビューモード切替ボタンを表示する", () => {
    renderWithProvider(<Toolbar />)
    expect(screen.getByText("ページ")).toBeInTheDocument()
    expect(screen.getByText("TOC")).toBeInTheDocument()
    expect(screen.getByText("一括分割")).toBeInTheDocument()
    expect(screen.getByText("メタデータ")).toBeInTheDocument()
  })

  it("ビューモードを切り替えられる", async () => {
    const user = userEvent.setup()
    renderWithProvider(<Toolbar />)

    const tocButton = screen.getByText("TOC")
    await user.click(tocButton)
    // TOCボタンにアクティブスタイルが適用されることを確認
    expect(tocButton.className).toContain("bg-background")
  })

  it("ダウンロードボタンが無効状態で表示される（ファイルなし）", () => {
    renderWithProvider(<Toolbar />)
    const downloadButtons = screen.getAllByRole("button", { name: /ダウンロード/ })
    downloadButtons.forEach((btn) => expect(btn).toBeDisabled())
  })

  it("PDF追加のドロップゾーンを表示する", () => {
    renderWithProvider(<Toolbar />)
    expect(screen.getByText("+ PDF追加")).toBeInTheDocument()
  })

  it("ビューモードの初期値は pages", () => {
    renderWithProvider(<Toolbar />)
    const pagesButton = screen.getByText("ページ")
    expect(pagesButton.className).toContain("bg-background")
  })
})
