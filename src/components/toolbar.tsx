import { useState, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
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

interface ToolbarProps {
  onToggleSidebar?: () => void
}

export function Toolbar({ onToggleSidebar }: ToolbarProps) {
  const { t } = useTranslation()
  const { state, actions } = usePdfStore()
  const activeFile = useActiveFile()
  const [isDownloading, setIsDownloading] = useState(false)

  const viewModes: { mode: ViewMode; label: string }[] = useMemo(() => [
    { mode: "pages", label: t("toolbar.pages") },
    { mode: "toc", label: t("landing.tocEditor.title") },
    { mode: "split", label: t("toolbar.split") },
    { mode: "metadata", label: t("toolbar.metadata") },
  ], [t])

  // Total page count of all files
  const totalPages = useMemo(
    () => state.files.reduce((sum, f) => sum + f.pageOrder.length, 0),
    [state.files]
  )

  const hasSelection = state.selectedPages.length > 0

  // Download label
  const downloadLabel = useMemo(() => {
    if (isDownloading) return t("toolbar.download.processing")
    if (hasSelection && activeFile) {
      return t("toolbar.download.selected", { count: state.selectedPages.length })
    }
    if (state.files.length <= 1) {
      return t("toolbar.download.total", { count: totalPages })
    }
    return t("toolbar.download.combined", { pages: totalPages, files: state.files.length })
  }, [isDownloading, hasSelection, activeFile, state.selectedPages.length, state.files.length, totalPages, t])

  // Download logic: extracted if selection exists, otherwise full file / merged
  const handleDownload = useCallback(async () => {
    if (state.files.length === 0) return
    setIsDownloading(true)
    try {
      if (hasSelection && activeFile) {
        // Download selected pages only
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
        // Multiple files: reflecting page order before merging
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
      {/* Main toolbar row */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
        {/* Mobile: Sidebar toggle */}
        <button
          className="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors md:hidden"
          onClick={onToggleSidebar}
          aria-label={t("toolbar.openSidebar")}
        >
          <HugeiconsIcon icon={LeftToRightListBulletIcon} strokeWidth={2} className="size-5" />
        </button>

        {/* View mode switcher */}
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

        {/* Download */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={state.files.length === 0 || isDownloading}
          className="hidden sm:inline-flex"
        >
          <HugeiconsIcon icon={DownloadIcon} strokeWidth={2} />
          {downloadLabel}
        </Button>
        {/* Mobile: Icon-only download */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={state.files.length === 0 || isDownloading}
          className="sm:hidden"
          aria-label={t("toolbar.download.label")}
        >
          <HugeiconsIcon icon={DownloadIcon} strokeWidth={2} />
          {isDownloading && <span className="text-xs">{t("toolbar.download.processing")}</span>}
        </Button>

        <div className="flex-1" />

        {/* Add files */}
        <FileDropZone />
      </div>
    </div>
  )
}
