import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import App from "@/App"

// 重いコンポーネントをモック
vi.mock("@/components/sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}))

vi.mock("@/components/page-grid", () => ({
  PageGrid: () => <div data-testid="page-grid">PageGrid</div>,
}))

describe("App", () => {
  it("クラッシュせずにレンダリングされる", () => {
    render(<App />)
    // LandingPageが表示される（ファイル未読み込み時）
    expect(screen.getByText("PDF TOC Tools")).toBeInTheDocument()
  })

  it("PdfStoreProviderがラップされている", () => {
    // App内でusePdfStoreが使えることの確認（エラーが出なければOK）
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })
})
