import { useMemo, useCallback, useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { usePdfStore, useActiveFile } from "@/hooks/use-pdf-store"
import { PdfDocumentProvider } from "@/hooks/use-pdf-document"
import { PageThumbnail } from "@/components/page-thumbnail"
import { useMarqueeSelection, MarqueeOverlay } from "@/components/marquee-selection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DragDropProvider } from "@dnd-kit/react"
import { useSortable } from "@dnd-kit/react/sortable"
import { move } from "@dnd-kit/helpers"

export function PageGrid() {
  const { t } = useTranslation()
  const { state, actions } = usePdfStore()
  const activeFile = useActiveFile()

  const fileData = useMemo(() => {
    if (!activeFile) return null
    return activeFile.data
  }, [activeFile])

  // Filter pages based on outlineFilter
  const visiblePages = useMemo(() => {
    if (!activeFile) return []
    const all = activeFile.pageOrder.map((orig, idx) => ({
      originalPageIndex: orig,
      currentIndex: idx,
      id: `page-${activeFile.id}-${orig}`,
    }))
    if (!state.outlineFilter) return all
    const { startPage, endPage } = state.outlineFilter
    return all.filter(
      ({ originalPageIndex }) =>
        originalPageIndex >= startPage && originalPageIndex <= endPage
    )
  }, [activeFile, state.outlineFilter])

  // Item list for DnD
  const [items, setItems] = useState(() => visiblePages.map((p) => p.id))

  useEffect(() => {
    setItems(visiblePages.map((p) => p.id))
  }, [visiblePages])

  const visiblePageMap = useMemo(
    () => new Map(visiblePages.map((p) => [p.id, p])),
    [visiblePages]
  )

  const anchorRef = useRef<number | null>(null)
  const hasAnySelection = state.selectedPages.length > 0

  // Main click handler (supports range selection with anchor)
  const handlePageClick = useCallback(
    (index: number, e: React.MouseEvent) => {
      if (e.shiftKey && anchorRef.current !== null) {
        // Shift+Click: Range selection from anchor
        const min = Math.min(anchorRef.current, index)
        const max = Math.max(anchorRef.current, index)
        const range = Array.from({ length: max - min + 1 }, (_, i) => min + i)
        if (e.metaKey || e.ctrlKey) {
          // Shift+Cmd: Add range to existing selection
          actions.setSelectedPages([...new Set([...state.selectedPages, ...range])])
        } else {
          // Shift only: Replace with range
          actions.setSelectedPages(range)
        }
        // Do not update anchor (allows continuous range selection)
      } else if (e.metaKey || e.ctrlKey) {
        // Cmd/Ctrl+Click: Individual toggle
        actions.togglePageSelection(index, false)
        anchorRef.current = index
      } else {
        // Normal click: Single selection
        if (
          state.selectedPages.length === 1 &&
          state.selectedPages[0] === index
        ) {
          actions.deselectAllPages()
          anchorRef.current = null
        } else {
          actions.setSelectedPages([index])
          anchorRef.current = index
        }
      }
    },
    [actions, state.selectedPages]
  )

  // Checkbox click (toggle without modifiers)
  const handleToggleSelect = useCallback(
    (index: number) => {
      actions.togglePageSelection(index, false)
      anchorRef.current = index
    },
    [actions]
  )

  // Move selected pages forward
  const handleMoveUp = useCallback(() => {
    if (!activeFile || state.selectedPages.length === 0) return
    const sorted = [...state.selectedPages].sort((a, b) => a - b)
    if (sorted[0] === 0) return
    const newOrder = [...activeFile.pageOrder]
    for (const idx of sorted) {
      ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
    }
    actions.reorderPages(newOrder)
    actions.setSelectedPages(sorted.map((i) => i - 1))
  }, [activeFile, state.selectedPages, actions])

  // Move selected pages backward
  const handleMoveDown = useCallback(() => {
    if (!activeFile || state.selectedPages.length === 0) return
    const sorted = [...state.selectedPages].sort((a, b) => b - a)
    if (sorted[0] >= activeFile.pageOrder.length - 1) return
    const newOrder = [...activeFile.pageOrder]
    for (const idx of sorted) {
      ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
    }
    actions.reorderPages(newOrder)
    actions.setSelectedPages(sorted.map((i) => i + 1))
  }, [activeFile, state.selectedPages, actions])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault()
        actions.selectAllPages()
        return
      }
      if (e.key === "Escape" && state.selectedPages.length > 0) {
        actions.deselectAllPages()
        anchorRef.current = null
        return
      }
      if ((e.key === "Delete" || e.key === "Backspace") && state.selectedPages.length > 0) {
        e.preventDefault()
        actions.deleteSelectedPages()
        return
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [actions, state.selectedPages])

  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform)
  const modKey = isMac ? "⌘" : "Ctrl+"

  // Marquee (rectangular) selection
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const { marqueeRect } = useMarqueeSelection({
    containerRef: gridContainerRef,
    onSelectionChange: (indices) => actions.setSelectedPages(indices),
    onSelectionEnd: (indices) => {
      actions.setSelectedPages(indices)
      if (indices.length > 0) anchorRef.current = indices[indices.length - 1]
    },
    previousSelection: state.selectedPages,
  })

  if (!activeFile || !fileData) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        {t("pageGrid.noFile")}
      </div>
    )
  }

  return (
    <PdfDocumentProvider
      data={fileData}
      loading={
        <div className="flex h-full items-center justify-center">
          <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      }
      error={
        <div className="text-destructive flex h-full items-center justify-center text-sm">
          {t("pageGrid.loadError")}
        </div>
      }
    >
      <div className="flex h-full flex-col">
        {/* Show indicator if filtering */}
        {state.outlineFilter && (
          <div className="border-border flex min-w-0 items-center gap-2 border-b px-4 py-2">
            <Badge
              variant="secondary"
              className="max-w-[55vw] min-w-0 truncate text-xs sm:max-w-none"
            >
              {state.outlineFilter.label}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {t("pageGrid.filterIndicator", {
                count: visiblePages.length,
                start: state.outlineFilter.startPage + 1,
                end: state.outlineFilter.endPage + 1,
              })}
            </span>
            <button
              className="text-muted-foreground hover:text-foreground ml-auto text-xs"
              onClick={() => actions.setOutlineFilter(null)}
            >
              {t("pageGrid.clearFilter")}
            </button>
          </div>
        )}
        <DragDropProvider
          onDragEnd={(event) => {
            const { operation } = event
            if (!operation.source || !operation.target) return
            const updated = move(items, event)
            setItems(updated)

            // Restore currentIndex from items ids and update pageOrder
            const idToPage = visiblePageMap
            if (!state.outlineFilter) {
              // No filter: reorder all pages
              const newPageOrder = updated.map((id) => {
                const p = idToPage.get(id)
                return p ? p.originalPageIndex : 0
              })
              actions.reorderPages(newPageOrder)
            } else {
              // Filter active: reorder only within the filtered range
              const newOrder = [...activeFile.pageOrder]
              const filteredIndices = visiblePages.map((p) => p.currentIndex)
              const reorderedOriginals = updated.map((id) => {
                const p = idToPage.get(id)
                return p ? p.originalPageIndex : 0
              })
              filteredIndices.forEach((ci, i) => {
                newOrder[ci] = reorderedOriginals[i]
              })
              actions.reorderPages(newOrder)
            }
          }}
        >
          <div className="relative flex-1 overflow-auto" ref={gridContainerRef}>
            <MarqueeOverlay rect={marqueeRect} />
            <div className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 p-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-4 sm:p-4">
              {items
                .map((id, index) => {
                  const page = visiblePageMap.get(id)
                  if (!page) return null
                  return (
                    <SortablePageThumbnail
                      key={id}
                      id={id}
                      index={index}
                      pageNumber={page.originalPageIndex + 1}
                      displayIndex={page.currentIndex}
                      selected={state.selectedPages.includes(page.currentIndex)}
                      hasAnySelection={hasAnySelection}
                      onClick={(e) => handlePageClick(page.currentIndex, e)}
                      onToggleSelect={() => handleToggleSelect(page.currentIndex)}
                    />
                  )
                })
                .filter(Boolean)}
            </div>
          </div>
        </DragDropProvider>

        {/* Floating Selection Bar */}
        {hasAnySelection && (
          <div className="border-border bg-background/95 animate-in slide-in-from-bottom-2 flex items-center gap-1.5 border-t px-3 py-2 backdrop-blur-sm duration-200 sm:gap-2 sm:px-4">
            <div className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums sm:text-sm">
              {t("pageGrid.selectionBar.selected", {
                count: state.selectedPages.length,
                total: activeFile.pageOrder.length,
              })}
            </div>
            <div className="text-muted-foreground hidden text-xs lg:block">
              {t("pageGrid.selectionBar.rangeSelect")} ·{" "}
              {t("pageGrid.selectionBar.selectAll", { modKey })} ·{" "}
              {t("pageGrid.selectionBar.delete")}
            </div>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMoveUp}
              title={t("pageGrid.selectionBar.moveUp")}
              className="h-7 px-2"
            >
              ↑
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMoveDown}
              title={t("pageGrid.selectionBar.moveDown")}
              className="h-7 px-2"
            >
              ↓
            </Button>
            <Separator orientation="vertical" className="mx-0.5 h-5" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => actions.deleteSelectedPages()}
              className="text-destructive h-7 px-2"
            >
              {t("pageGrid.selectionBar.deleteAction")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={actions.deselectAllPages}
              className="h-7 px-2"
            >
              {t("pageGrid.selectionBar.deselect")}
            </Button>
          </div>
        )}
      </div>
    </PdfDocumentProvider>
  )
}

function SortablePageThumbnail({
  id,
  index,
  pageNumber,
  displayIndex,
  selected,
  hasAnySelection,
  onClick,
  onToggleSelect,
}: {
  id: string
  index: number
  pageNumber: number
  displayIndex: number
  selected: boolean
  hasAnySelection: boolean
  onClick: (e: React.MouseEvent) => void
  onToggleSelect: () => void
}) {
  const { ref } = useSortable({ id, index })

  return (
    <div ref={ref} data-page-index={displayIndex} className="min-w-0">
      <PageThumbnail
        pageNumber={pageNumber}
        displayIndex={displayIndex}
        selected={selected}
        hasAnySelection={hasAnySelection}
        onClick={onClick}
        onToggleSelect={onToggleSelect}
      />
    </div>
  )
}
