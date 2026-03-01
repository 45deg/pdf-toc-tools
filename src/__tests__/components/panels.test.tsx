import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { PdfStoreProvider } from "@/hooks/use-pdf-store"
import { TocEditor } from "@/components/toc-editor"
import { MetadataPanel } from "@/components/metadata-panel"
import { SplitPanel } from "@/components/split-panel"

// モック
vi.mock("@/lib/pdf/operations", () => ({
  applyOutlinesToPdf: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  splitByOutline: vi.fn().mockResolvedValue([]),
  splitByPageRanges: vi.fn().mockResolvedValue([]),
  updatePdfMetadata: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}))

vi.mock("@/lib/pdf/download", () => ({
  downloadText: vi.fn(),
  downloadBlob: vi.fn(),
  downloadSplitsAsZip: vi.fn(),
}))

function renderWithProvider(ui: React.ReactElement) {
  return render(<PdfStoreProvider>{ui}</PdfStoreProvider>)
}

describe("TocEditor", () => {
  it("ファイル未選択時にプレースホルダーを表示する", () => {
    renderWithProvider(<TocEditor />)
    expect(screen.getByText("ファイルを選択してください")).toBeInTheDocument()
  })
})

describe("MetadataPanel", () => {
  it("ファイル未選択時にプレースホルダーを表示する", () => {
    renderWithProvider(<MetadataPanel />)
    expect(screen.getByText("ファイルを選択してください")).toBeInTheDocument()
  })
})

describe("SplitPanel", () => {
  it("ファイル未選択時にプレースホルダーを表示する", () => {
    renderWithProvider(<SplitPanel />)
    expect(screen.getByText("ファイルを選択してください")).toBeInTheDocument()
  })
})
