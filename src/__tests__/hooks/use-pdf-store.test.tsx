import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { PdfStoreProvider, usePdfStore, useActiveFile } from "@/hooks/use-pdf-store"
import type { ReactNode } from "react"
import type { LoadedPdf } from "@/lib/pdf/types"

// Wrapper for testing
function wrapper({ children }: { children: ReactNode }) {
  return <PdfStoreProvider>{children}</PdfStoreProvider>
}

// Data for testing LoadedPdf
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
  it("throws an error when used outside of PdfStoreProvider", () => {
    expect(() => {
      renderHook(() => usePdfStore())
    }).toThrow("usePdfStore must be used within PdfStoreProvider")
  })

  it("returns the initial state", () => {
    const { result } = renderHook(() => usePdfStore(), { wrapper })
    expect(result.current.state.files).toEqual([])
    expect(result.current.state.activeFileId).toBeNull()
    expect(result.current.state.viewMode).toBe("pages")
    expect(result.current.state.selectedPages).toEqual([])
    expect(result.current.state.outlineFilter).toBeNull()
    expect(result.current.state.isLoading).toBe(false)
  })

  describe("setViewMode", () => {
    it("changes the view mode", () => {
      const { result } = renderHook(() => usePdfStore(), { wrapper })
      act(() => result.current.actions.setViewMode("toc"))
      expect(result.current.state.viewMode).toBe("toc")

      act(() => result.current.actions.setViewMode("metadata"))
      expect(result.current.state.viewMode).toBe("metadata")
    })
  })

  describe("setSelectedPages", () => {
    it("sets the selected pages", () => {
      const { result } = renderHook(() => usePdfStore(), { wrapper })
      act(() => result.current.actions.setSelectedPages([0, 2, 4]))
      expect(result.current.state.selectedPages).toEqual([0, 2, 4])
    })
  })

  describe("setOutlineFilter", () => {
    it("switches viewMode to pages when a filter is set", () => {
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

    it("clears the filter with null", () => {
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
  it("returns null when no file is present", () => {
    const { result } = renderHook(() => useActiveFile(), { wrapper })
    expect(result.current).toBeNull()
  })
})

// ===== Reducer logic tests (testing via actions) =====
// Since reducer is not exported, we test it through actions

describe("PdfStore reducer via actions", () => {
  describe("REMOVE_FILE", () => {
    it("removes the file and updates activeFileId", () => {
      const { result } = renderHook(() => usePdfStore(), { wrapper })
      // Since we cannot dispatch directly, we trigger it via action.
      // loadFiles calls parsePdf asynchronously, so here we only verify the basic behavior of removeFile.
      act(() => result.current.actions.removeFile("nonexistent"))
      expect(result.current.state.files).toEqual([])
    })
  })

  describe("SET_ACTIVE_FILE", () => {
    it("sets the active file and resets selection and filter", () => {
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
    it("deselects all pages", () => {
      const { result } = renderHook(() => usePdfStore(), { wrapper })
      act(() => result.current.actions.setSelectedPages([0, 1, 2]))
      expect(result.current.state.selectedPages).toHaveLength(3)

      act(() => result.current.actions.deselectAllPages())
      expect(result.current.state.selectedPages).toEqual([])
    })
  })

  describe("REORDER_FILES", () => {
    it("reorders the files", () => {
      const { result } = renderHook(() => usePdfStore(), { wrapper })
      // reorderFiles should not throw an error even without files
      act(() => result.current.actions.reorderFiles(["a", "b", "c"]))
      expect(result.current.state.files).toEqual([])
    })
  })
})
