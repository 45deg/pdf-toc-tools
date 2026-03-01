import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PdfStoreProvider } from "@/hooks/use-pdf-store"
import { LandingPage } from "@/components/landing-page"

function renderWithProvider(ui: React.ReactElement) {
  return render(<PdfStoreProvider>{ui}</PdfStoreProvider>)
}

describe("LandingPage", () => {
  it("タイトルを表示する", () => {
    renderWithProvider(<LandingPage />)
    expect(screen.getByText("PDF TOC Tools")).toBeInTheDocument()
  })

  it("説明文を表示する", () => {
    renderWithProvider(<LandingPage />)
    expect(
      screen.getByText(/PDFの目次編集・ページ操作・分割結合/)
    ).toBeInTheDocument()
  })

  it("全ての機能カードを表示する", () => {
    renderWithProvider(<LandingPage />)
    expect(screen.getByText("目次（TOC）編集")).toBeInTheDocument()
    expect(screen.getByText("ページ操作")).toBeInTheDocument()
    expect(screen.getByText("分割・結合")).toBeInTheDocument()
    expect(screen.getByText("メタデータ編集")).toBeInTheDocument()
  })

  it("ドロップゾーンのテキストを表示する", () => {
    renderWithProvider(<LandingPage />)
    expect(
      screen.getByText("PDFファイルをドラッグ＆ドロップ")
    ).toBeInTheDocument()
    expect(
      screen.getByText("またはクリックしてファイルを選択")
    ).toBeInTheDocument()
  })

  it("セキュリティメッセージを表示する", () => {
    renderWithProvider(<LandingPage />)
    expect(
      screen.getByText(/すべての処理はブラウザ上で完結/)
    ).toBeInTheDocument()
  })

  it("機能カードの説明が全て表示される", () => {
    renderWithProvider(<LandingPage />)
    expect(
      screen.getByText(/PDFのしおり・目次を視覚的に追加/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/ドラッグ＆ドロップでページの並べ替え/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/複数PDFの結合や、指定ページでの一括分割/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/タイトル・著者などのPDFメタデータ/)
    ).toBeInTheDocument()
  })
})
