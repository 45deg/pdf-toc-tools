import { useState, useCallback, useMemo } from "react"
import { usePdfStore, useActiveFile } from "@/hooks/use-pdf-store"
import type { ViewMode } from "@/lib/pdf/types"
import {
  createPdfWithPageOrder,
  mergePdfs,
} from "@/lib/pdf/operations"
import { downloadBlob } from "@/lib/pdf/download"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FileDropZone } from "@/components/file-drop-zone"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DownloadIcon,
  LeftToRightListBulletIcon,
} from "@hugeicons/core-free-icons"

const viewModes: { mode: ViewMode; label: string }[] = [
  { mode: "pages", label: "ページ" },
  { mode: "toc", label: "TOC" },
  { mode: "split", label: "一括分割" },
  { mode: "metadata", label: "メタデータ" },
]

interface ToolbarProps {
  onToggleSidebar?: () => void
}

export function Toolbar({ onToggleSidebar }: ToolbarProps) {
  const { state, actions } = usePdfStore()
  const activeFile = useActiveFile()
  const [isDownloading, setIsDownloading] = useState(false)

  // 全ファイルの合計ページ数
  const totalPages = useMemo(
    () => state.files.reduce((sum, f) => sum + f.pageOrder.length, 0),
    [state.files]
  )

  const hasSelection = state.selectedPages.length > 0

  // ダウンロードラベル
  const downloadLabel = useMemo(() => {
    if (hasSelection && activeFile) {
      return `ダウンロード（${state.selectedPages.length}p選択中）`
    }
    if (state.files.length <= 1) {
      return `ダウンロード（${totalPages}p）`
    }
    return `ダウンロード（${totalPages}p／${state.files.length}ファイル結合）`
  }, [hasSelection, activeFile, state.selectedPages.length, state.files.length, totalPages])

  // ダウンロード: 選択中→選択ページのみ, 未選択→全ファイル結合
  const handleDownload = useCallback(async () => {
    if (state.files.length === 0) return
    setIsDownloading(true)
    try {
      if (hasSelection && activeFile) {
        // 選択ページのみ抽出してダウンロード
        const pages = [...state.selectedPages]
          .sort((a, b) => a - b)
          .map((i) => activeFile.pageOrder[i])
        const data = await createPdfWithPageOrder(activeFile.data, pages)
        downloadBlob(
          data,
          activeFile.name.replace(/\.pdf$/i, "_selected.pdf")
        )
      } else if (state.files.length === 1) {
        const file = state.files[0]
        const data = await createPdfWithPageOrder(file.data, file.pageOrder)
        downloadBlob(data, file.name)
      } else {
        // 複数ファイル: ページ順序を反映してから結合
        const { data } = await mergePdfs(
          state.files.map((f) => ({
            name: f.name,
            data: f.data,
            outline: f.outline,
            pageOrder: f.pageOrder,
          }))
        )
        downloadBlob(data, "merged.pdf")
      }
    } finally {
      setIsDownloading(false)
    }
  }, [state.files, hasSelection, activeFile, state.selectedPages])

  return (
    <div className="border-border bg-background flex flex-col border-b">
      {/* メインツールバー行 */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
        {/* モバイル: サイドバートグル */}
        <button
          className="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors md:hidden"
          onClick={onToggleSidebar}
          aria-label="サイドバーを開く"
        >
          <HugeiconsIcon icon={LeftToRightListBulletIcon} strokeWidth={2} className="size-5" />
        </button>

        {/* ビューモード切替 */}
        <div className="bg-muted flex rounded-lg p-0.5">
          {viewModes.map(({ mode, label }) => (
            <button
              key={mode}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors sm:px-2.5",
                state.viewMode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => actions.setViewMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>

        <Separator orientation="vertical" className="mx-0.5 h-6 sm:mx-1" />

        {/* ダウンロード */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={state.files.length === 0 || isDownloading}
          className="hidden sm:inline-flex"
        >
          <HugeiconsIcon icon={DownloadIcon} strokeWidth={2} />
          {isDownloading ? "処理中…" : downloadLabel}
        </Button>
        {/* モバイル: アイコンのみダウンロード */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={state.files.length === 0 || isDownloading}
          className="sm:hidden"
          aria-label="ダウンロード"
        >
          <HugeiconsIcon icon={DownloadIcon} strokeWidth={2} />
          {isDownloading && <span className="text-xs">処理中…</span>}
        </Button>

        <div className="flex-1" />

        {/* ファイル追加 */}
        <FileDropZone />
      </div>
    </div>
  )
}
