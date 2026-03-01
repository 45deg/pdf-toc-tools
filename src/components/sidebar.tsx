import { useState, useCallback, useEffect } from "react"
import { usePdfStore, useActiveFile } from "@/hooks/use-pdf-store"
import type { OutlineNode, OutlineFilter, LoadedPdf } from "@/lib/pdf/types"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FileIcon,
  Cancel01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  UnfoldMoreIcon,
  UnfoldLessIcon,
  DragDropIcon,
  DownloadIcon,
} from "@hugeicons/core-free-icons"
import { createPdfWithPageOrder } from "@/lib/pdf/operations"
import { downloadBlob } from "@/lib/pdf/download"
import { Button } from "@/components/ui/button"
import { DragDropProvider } from "@dnd-kit/react"
import { useSortable } from "@dnd-kit/react/sortable"
import { move } from "@dnd-kit/helpers"

const MIN_WIDTH = 180
const MAX_WIDTH = 500
const DEFAULT_WIDTH = 240

interface SidebarProps {
  /** モバイルドロワーとして表示するか */
  mobile?: boolean
  /** モバイル時に閉じるコールバック */
  onClose?: () => void
}

export function Sidebar({ mobile = false, onClose }: SidebarProps = {}) {
  const { state, actions } = usePdfStore()
  const activeFile = useActiveFile()

  // ---- リサイズ ----
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  // ---- 全展開/全折りたたみ ----
  // generation が変わるたびに全ノードが同期する
  const [expandOverride, setExpandOverride] = useState<{
    expanded: boolean
    generation: number
  }>({ expanded: true, generation: 0 })

  const expandAll = useCallback(() => {
    setExpandOverride((prev) => ({ expanded: true, generation: prev.generation + 1 }))
  }, [])

  const collapseAll = useCallback(() => {
    setExpandOverride((prev) => ({ expanded: false, generation: prev.generation + 1 }))
  }, [])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = width

      const onMove = (ev: MouseEvent) => {
        const newWidth = Math.max(
          MIN_WIDTH,
          Math.min(MAX_WIDTH, startWidth + (ev.clientX - startX))
        )
        setWidth(newWidth)
      }

      const onUp = () => {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
      }

      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [width]
  )

  return (
    <aside
      className={cn(
        "bg-background relative flex shrink-0 flex-col overflow-hidden",
        mobile ? "h-full w-full border-r-0" : "border-border border-r"
      )}
      style={mobile ? undefined : { width }}
    >
      {/* モバイル: 閉じるボタン付きヘッダー */}
      {mobile && onClose && (
        <div className="border-border flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">ナビゲーション</span>
          <button
            className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
            onClick={onClose}
            aria-label="閉じる"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
          </button>
        </div>
      )}

      {/* ファイル一覧（DnD対応） */}
      <div className="border-border border-b p-2">
        <div className="text-muted-foreground px-2 py-1 text-xs font-medium uppercase tracking-wider">
          Files
        </div>
        <FileList />
      </div>

      {/* アウトラインツリー */}
      <div className="flex-1 overflow-auto p-2">
        <div className="text-muted-foreground flex items-center gap-1 px-2 py-1">
          <span className="flex-1 text-xs font-medium uppercase tracking-wider">
            Outline
          </span>
          {state.outlineFilter && (
            <button
              className="text-primary hover:text-primary/80 mr-1 text-[10px] font-medium"
              onClick={() => actions.setOutlineFilter(null)}
            >
              フィルタ解除
            </button>
          )}
          {activeFile && activeFile.outline.length > 0 && (
            <div className="flex items-center gap-0.5">
              <button
                className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
                onClick={expandAll}
                title="すべて展開"
              >
                <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="size-3.5" />
              </button>
              <button
                className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
                onClick={collapseAll}
                title="すべて折りたたむ"
              >
                <HugeiconsIcon icon={UnfoldLessIcon} strokeWidth={2} className="size-3.5" />
              </button>
            </div>
          )}
        </div>
        {activeFile && activeFile.outline.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {activeFile.outline.map((node, i) => (
              <OutlineTreeNode
                key={i}
                node={node}
                depth={0}
                endPage={computeEndPage(
                  activeFile.outline,
                  i,
                  activeFile.pageOrder.length - 1
                )}
                totalPages={activeFile.pageOrder.length}
                expandOverride={expandOverride}
              />
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground px-2 py-2 text-xs">
            {activeFile ? "しおりがありません" : "ファイルを選択してください"}
          </div>
        )}
      </div>

      {/* リサイズハンドル（デスクトップのみ） */}
      {!mobile && (
        <div
          className="absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30"
          onMouseDown={handleResizeStart}
        />
      )}
    </aside>
  )
}

/**
 * DnD対応のファイル一覧
 */
function FileList() {
  const { state, actions } = usePdfStore()
  const [items, setItems] = useState(() => state.files.map((f) => f.id))

  // files が外部から変わったら同期
  useEffect(() => {
    setItems(state.files.map((f) => f.id))
  }, [state.files])

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { operation } = event
        if (operation.source && operation.target) {
          const updated = move(items, event)
          setItems(updated)
          actions.reorderFiles(updated)
        }
      }}
    >
      <div className="flex flex-col gap-0.5">
        {items.map((fileId, index) => {
          const file = state.files.find((f) => f.id === fileId)
          if (!file) return null
          return (
            <SortableFileItem
              key={file.id}
              file={file}
              index={index}
              isActive={file.id === state.activeFileId}
              onSelect={() => actions.setActiveFile(file.id)}
              onRemove={() => actions.removeFile(file.id)}
            />
          )
        })}
      </div>
    </DragDropProvider>
  )
}

function SortableFileItem({
  file,
  index,
  isActive,
  onSelect,
  onRemove,
}: {
  file: LoadedPdf
  index: number
  isActive: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const { ref } = useSortable({ id: file.id, index })

  return (
    <div
      ref={ref}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-muted cursor-pointer"
      )}
      onClick={onSelect}
    >
      <HugeiconsIcon
        icon={DragDropIcon}
        strokeWidth={2}
        className="text-muted-foreground size-3 shrink-0 cursor-grab opacity-0 group-hover:opacity-60"
      />
      <HugeiconsIcon
        icon={FileIcon}
        strokeWidth={2}
        className="text-muted-foreground size-3.5 shrink-0"
      />
      <span className="min-w-0 flex-1 truncate">{file.name}</span>
      <span className="text-muted-foreground text-xs">
        {file.pageOrder.length}p
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
      </Button>
    </div>
  )
}

/**
 * 兄弟ノードの配列内でindexのノードの終了ページを計算する
 */
function computeEndPage(
  siblings: OutlineNode[],
  index: number,
  parentEndPage: number
): number {
  if (index < siblings.length - 1) {
    return Math.max(siblings[index].pageIndex, siblings[index + 1].pageIndex - 1)
  }
  return parentEndPage
}

function OutlineTreeNode({
  node,
  depth,
  endPage,
  totalPages,
  expandOverride,
}: {
  node: OutlineNode
  depth: number
  endPage: number
  totalPages: number
  expandOverride: { expanded: boolean; generation: number }
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const { state, actions } = usePdfStore()
  const hasChildren = node.children.length > 0

  // 全展開/全折りたたみの同期
  useEffect(() => {
    if (expandOverride.generation > 0) {
      setExpanded(expandOverride.expanded)
    }
  }, [expandOverride.generation, expandOverride.expanded])

  const isActive =
    state.outlineFilter !== null &&
    state.outlineFilter.startPage === node.pageIndex &&
    state.outlineFilter.endPage === endPage

  const activeFile = useActiveFile()

  // ラベルクリック: フィルタ設定/解除
  const handleLabelClick = useCallback(() => {
    if (isActive) {
      actions.setOutlineFilter(null)
    } else {
      const filter: OutlineFilter = {
        startPage: node.pageIndex,
        endPage,
        label: node.title,
      }
      actions.setOutlineFilter(filter)
    }
  }, [actions, node.pageIndex, node.title, endPage, isActive])

  // シェブロンクリック: 展開/折りたたみのみ
  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setExpanded((prev) => !prev)
    },
    []
  )

  // セクション単位でダウンロード
  const handleDownloadSection = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!activeFile) return
      const pages: number[] = []
      for (let p = node.pageIndex; p <= endPage; p++) pages.push(p)
      const data = await createPdfWithPageOrder(activeFile.data, pages)
      const safeName = node.title.replace(/[<>:"/\\|?*]/g, "_").trim() || "section"
      downloadBlob(data, `${safeName}.pdf`)
    },
    [activeFile, node.pageIndex, node.title, endPage]
  )

  return (
    <div>
      <div
        className={cn(
          "group flex cursor-pointer items-center gap-0.5 rounded-md py-1 pr-1 text-sm transition-colors",
          isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleLabelClick}
      >
        {/* シェブロンアイコン（展開/折りたたみ） */}
        {hasChildren ? (
          <button
            className={cn(
              "flex shrink-0 items-center justify-center rounded p-0.5 transition-colors",
              isActive
                ? "text-primary hover:bg-primary/20"
                : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
            )}
            onClick={handleToggleExpand}
          >
            <HugeiconsIcon
              icon={expanded ? ArrowDown01Icon : ArrowRight01Icon}
              strokeWidth={2}
              className="size-3"
            />
          </button>
        ) : (
          /* 葉ノードのインデント用スペーサー */
          <span className="inline-block w-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">{node.title}</span>
        <span
          className={cn(
            "shrink-0 text-[10px]",
            isActive ? "text-primary/70" : "text-muted-foreground"
          )}
        >
          p.{node.pageIndex + 1}
        </span>
        {/* セクションダウンロードボタン */}
        <button
          className={cn(
            "shrink-0 rounded p-0.5 opacity-0 transition-all group-hover:opacity-100",
            isActive
              ? "text-primary hover:bg-primary/20"
              : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
          )}
          onClick={handleDownloadSection}
          title={`「${node.title}」をダウンロード`}
        >
          <HugeiconsIcon icon={DownloadIcon} strokeWidth={2} className="size-3" />
        </button>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child, i) => (
            <OutlineTreeNode
              key={i}
              node={child}
              depth={depth + 1}
              endPage={computeEndPage(node.children, i, endPage)}
              totalPages={totalPages}
              expandOverride={expandOverride}
            />
          ))}
        </div>
      )}
    </div>
  )
}
