import { useMemo, useCallback, useState, useEffect, useRef } from "react"
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
  const { state, actions } = usePdfStore()
  const activeFile = useActiveFile()

  const fileData = useMemo(() => {
    if (!activeFile) return null
    return activeFile.data
  }, [activeFile])

  // outlineFilter に基づいてページをフィルタリング
  const visiblePages = useMemo(() => {
    if (!activeFile) return []
    const all = activeFile.pageOrder.map((orig, idx) => ({
      originalPageIndex: orig,
      currentIndex: idx,
      id: `page-${activeFile.id}-${idx}`,
    }))
    if (!state.outlineFilter) return all
    const { startPage, endPage } = state.outlineFilter
    return all.filter(
      ({ originalPageIndex }) =>
        originalPageIndex >= startPage && originalPageIndex <= endPage
    )
  }, [activeFile, state.outlineFilter])

  // DnD用のアイテムリスト
  const [items, setItems] = useState(() => visiblePages.map((p) => p.id))

  useEffect(() => {
    setItems(visiblePages.map((p) => p.id))
  }, [visiblePages])

  const anchorRef = useRef<number | null>(null)
  const hasAnySelection = state.selectedPages.length > 0

  // メインクリックハンドラ（アンカーベースの範囲選択対応）
  const handlePageClick = useCallback(
    (index: number, e: React.MouseEvent) => {
      if (e.shiftKey && anchorRef.current !== null) {
        // Shift+Click: アンカーから範囲選択
        const min = Math.min(anchorRef.current, index)
        const max = Math.max(anchorRef.current, index)
        const range = Array.from({ length: max - min + 1 }, (_, i) => min + i)
        if (e.metaKey || e.ctrlKey) {
          // Shift+Cmd: 既存選択に範囲を追加
          actions.setSelectedPages([...new Set([...state.selectedPages, ...range])])
        } else {
          // Shift のみ: 範囲で置き換え
          actions.setSelectedPages(range)
        }
        // anchor は更新しない（連続範囲選択を可能に）
      } else if (e.metaKey || e.ctrlKey) {
        // Cmd/Ctrl+Click: 個別トグル
        actions.togglePageSelection(index, false)
        anchorRef.current = index
      } else {
        // 通常クリック: 単一選択
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

  // チェックボックスクリック（修飾キー不要のトグル）
  const handleToggleSelect = useCallback(
    (index: number) => {
      actions.togglePageSelection(index, false)
      anchorRef.current = index
    },
    [actions]
  )

  // 選択ページを前に移動
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

  // 選択ページを後ろに移動
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

  // キーボードショートカット
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

  // マーキー（矩形）選択
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
        ファイルを選択してください
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
          PDFの読み込みに失敗しました
        </div>
      }
    >
      <div className="flex h-full flex-col">
        {/* フィルタ中の場合はインジケータ表示 */}
        {state.outlineFilter && (
          <div className="border-border flex items-center gap-2 border-b px-4 py-2">
            <Badge variant="secondary" className="text-xs">
              {state.outlineFilter.label}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {visiblePages.length} ページ（p.{state.outlineFilter.startPage + 1}
              –p.{state.outlineFilter.endPage + 1}）
            </span>
            <button
              className="text-muted-foreground hover:text-foreground ml-auto text-xs"
              onClick={() => actions.setOutlineFilter(null)}
            >
              フィルタ解除
            </button>
          </div>
        )}
        <DragDropProvider
          onDragEnd={(event) => {
            const { operation } = event
            if (!operation.source || !operation.target) return
            const updated = move(items, event)
            setItems(updated)

            // items の id から currentIndex を復元し pageOrder を更新
            const idToPage = new Map(
              visiblePages.map((p) => [p.id, p])
            )
            if (!state.outlineFilter) {
              // フィルタなし: 全ページの並び替え
              const newPageOrder = updated.map((id) => {
                const p = idToPage.get(id)
                return p ? p.originalPageIndex : 0
              })
              actions.reorderPages(newPageOrder)
            } else {
              // フィルタあり: フィルタ範囲内のみ並び替え
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
              {visiblePages.map(({ originalPageIndex, currentIndex, id }, index) => (
                <SortablePageThumbnail
                  key={id}
                  id={id}
                  index={index}
                  pageNumber={originalPageIndex + 1}
                  displayIndex={currentIndex}
                  selected={state.selectedPages.includes(currentIndex)}
                  hasAnySelection={hasAnySelection}
                  onClick={(e) => handlePageClick(currentIndex, e)}
                  onToggleSelect={() => handleToggleSelect(currentIndex)}
                />
              ))}
            </div>
          </div>
        </DragDropProvider>

        {/* フローティング選択バー */}
        {hasAnySelection && (
          <div className="border-border bg-background/95 animate-in slide-in-from-bottom-2 flex items-center gap-1.5 border-t px-3 py-2 backdrop-blur-sm duration-200 sm:gap-2 sm:px-4">
            <div className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums sm:text-sm">
              {state.selectedPages.length} / {activeFile.pageOrder.length} ページ選択中
            </div>
            <div className="text-muted-foreground hidden text-xs lg:block">
              Shift+クリック: 範囲選択 · {modKey}A: 全選択 · ⌫: 削除
            </div>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={handleMoveUp} title="前に移動" className="h-7 px-2">↑</Button>
            <Button size="sm" variant="ghost" onClick={handleMoveDown} title="後に移動" className="h-7 px-2">↓</Button>
            <Separator orientation="vertical" className="mx-0.5 h-5" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => actions.deleteSelectedPages()}
              className="text-destructive h-7 px-2"
            >
              削除
            </Button>
            <Button size="sm" variant="ghost" onClick={actions.deselectAllPages} className="h-7 px-2">
              選択解除
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
    <div ref={ref} data-page-index={displayIndex}>
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
