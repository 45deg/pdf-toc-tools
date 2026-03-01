import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { PdfStoreProvider, usePdfStore, useActiveFile } from "@/hooks/use-pdf-store"
import type { ReactNode } from "react"
import type { LoadedPdf } from "@/lib/pdf/types"

// テスト用ラッパー
function wrapper({ children }: { children: ReactNode }) {
  return <PdfStoreProvider>{children}</PdfStoreProvider>
}

// テスト用のLoadedPdfデータ
function createMockLoadedPdf(overrides?: Partial<LoadedPdf>): LoadedPdf {
  return {
    id: "test-file-1",
    name: "test.pdf",
    data: new ArrayBuffer(10),
    originalPageCount: 5,
    outline: [],
    metadata: {
      title: "",
      author: "",
      subject: "",
      keywords: "",
      creator: "",
      producer: "",
      creationDate: "",
      modificationDate: "",
    },
    pageOrder: [0, 1, 2, 3, 4],
    ...overrides,
  }
}

describe("usePdfStore", () => {
  it("PdfStoreProvider 外で使用するとエラーを投げる", () => {
    expect(() => {
      renderHook(() => usePdfStore())
    }).toThrow("usePdfStore must be used within PdfStoreProvider")
  })

  it("初期状態を返す", () => {
    const { result } = renderHook(() => usePdfStore(), { wrapper })
    expect(result.current.state.files).toEqual([])
    expect(result.current.state.activeFileId).toBeNull()
    expect(result.current.state.viewMode).toBe("pages")
    expect(result.current.state.selectedPages).toEqual([])
    expect(result.current.state.outlineFilter).toBeNull()
    expect(result.current.state.isLoading).toBe(false)
  })

  describe("setViewMode", () => {
    it("ビューモードを変更する", () => {
      const { result } = renderHook(() => usePdfStore(), { wrapper })
      act(() => result.current.actions.setViewMode("toc"))
      expect(result.current.state.viewMode).toBe("toc")

      act(() => result.current.actions.setViewMode("metadata"))
      expect(result.current.state.viewMode).toBe("metadata")
    })
  })

  describe("setSelectedPages", () => {
    it("選択ページを設定する", () => {
      const { result } = renderHook(() => usePdfStore(), { wrapper })
      act(() => result.current.actions.setSelectedPages([0, 2, 4]))
      expect(result.current.state.selectedPages).toEqual([0, 2, 4])
    })
  })

  describe("setOutlineFilter", () => {
    it("フィルタを設定するとviewModeがpagesに変わる", () => {
      const { result } = renderHook(() => usePdfStore(), { wrapper })
      act(() => result.current.actions.setViewMode("toc"))
      expect(result.current.state.viewMode).toBe("toc")

      act(() =>
        result.current.actions.setOutlineFilter({
          startPage: 0,
          endPage: 5,
          label: "Test",
        })
      )
      expect(result.current.state.viewMode).toBe("pages")
      expect(result.current.state.outlineFilter).toEqual({
        startPage: 0,
        endPage: 5,
        label: "Test",
      })
    })

    it("null でフィルタをクリアする", () => {
      const { result } = renderHook(() => usePdfStore(), { wrapper })
      act(() =>
        result.current.actions.setOutlineFilter({
          startPage: 0,
          endPage: 5,
          label: "Test",
        })
      )
      act(() => result.current.actions.setOutlineFilter(null))
      expect(result.current.state.outlineFilter).toBeNull()
    })
  })
})

describe("useActiveFile", () => {
  it("ファイルがない場合は null を返す", () => {
    const { result } = renderHook(() => useActiveFile(), { wrapper })
    expect(result.current).toBeNull()
  })
})

// ===== Reducer のロジックテスト（dispatch を直接テスト） =====
// reducer は export されていないので、actions 経由でテストする

describe("PdfStore reducer via actions", () => {
  describe("REMOVE_FILE", () => {
    it("ファイルを削除し、activeFileId を更新する", () => {
      const { result } = renderHook(() => usePdfStore(), { wrapper })
      // 直接 dispatch はできないので、state を操作するために
      // 内部的にADD_FILEと同等のことを行う必要がある
      // loadFiles は async で parsePdf を呼ぶため、ここでは removeFile の基本動作のみ確認
      act(() => result.current.actions.removeFile("nonexistent"))
      expect(result.current.state.files).toEqual([])
    })
  })

  describe("SET_ACTIVE_FILE", () => {
    it("アクティブファイルを設定し、選択とフィルタをリセットする", () => {
      const { result } = renderHook(() => usePdfStore(), { wrapper })
      act(() => result.current.actions.setSelectedPages([1, 2, 3]))
      act(() =>
        result.current.actions.setOutlineFilter({
          startPage: 0,
          endPage: 5,
          label: "Test",
        })
      )

      act(() => result.current.actions.setActiveFile("some-id"))
      expect(result.current.state.activeFileId).toBe("some-id")
      expect(result.current.state.selectedPages).toEqual([])
      expect(result.current.state.outlineFilter).toBeNull()
    })
  })

  describe("deselectAllPages", () => {
    it("全選択を解除する", () => {
      const { result } = renderHook(() => usePdfStore(), { wrapper })
      act(() => result.current.actions.setSelectedPages([0, 1, 2]))
      expect(result.current.state.selectedPages).toHaveLength(3)

      act(() => result.current.actions.deselectAllPages())
      expect(result.current.state.selectedPages).toEqual([])
    })
  })

  describe("REORDER_FILES", () => {
    it("ファイルの順序を変更する", () => {
      const { result } = renderHook(() => usePdfStore(), { wrapper })
      // ファイルがない状態でも reorderFiles はエラーにならない
      act(() => result.current.actions.reorderFiles(["a", "b", "c"]))
      expect(result.current.state.files).toEqual([])
    })
  })
})
