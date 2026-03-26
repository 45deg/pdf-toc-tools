import { useState, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useActiveFile } from "@/hooks/use-pdf-store"
import type { OutlineNode } from "@/lib/pdf/types"
import {
  splitByOutline,
  splitByPageRanges,
} from "@/lib/pdf/operations"
import {
  buildSplitOutputPath,
  getHierarchyDigitsByDepth,
} from "@/lib/pdf/split-naming"
import { downloadBlob, downloadSplitsAsZip } from "@/lib/pdf/download"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type SplitMode = "outline" | "pages"
type TargetNodeInfo = {
  title: string
  node: OutlineNode
  pathTitles: string[]
  pathIndices: number[]
  pathSiblingCounts: number[]
}

export function SplitPanel() {
  const { t } = useTranslation()
  const activeFile = useActiveFile()
  const [mode, setMode] = useState<SplitMode>("outline")
  const [outlineLevel, setOutlineLevel] = useState(1)
  const [pageRangesText, setPageRangesText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [addNumberPrefix, setAddNumberPrefix] = useState(false)
  const [useFolderHierarchy, setUseFolderHierarchy] = useState(false)
  // Sections to select via checkbox (for outline mode)
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set())

  const hasOutline = (activeFile?.outline.length ?? 0) > 0

  // Calculate maximum depth of the outline
  const maxDepth = useMemo((): number => {
    if (!activeFile) return 0
    function getDepth(nodes: OutlineNode[], d: number): number {
      if (nodes.length === 0) return d
      return Math.max(...nodes.map((n) => getDepth(n.children, d + 1)))
    }
    return getDepth(activeFile.outline, 0)
  }, [activeFile])

  // Get list of nodes at the specified level with ancestor path
  const targetNodeInfos = useMemo((): TargetNodeInfo[] => {
    if (!activeFile || !hasOutline) return []
    return getNodesWithPathAtLevel(activeFile.outline, outlineLevel)
  }, [activeFile, hasOutline, outlineLevel])

  const targetNodes = useMemo(
    () => targetNodeInfos.map((info) => info.node),
    [targetNodeInfos]
  )

  const canUseFolderHierarchy = outlineLevel >= 2

  // For preview: page range for each node
  const sectionPreviews = useMemo(() => {
    if (!activeFile || targetNodes.length === 0) return []
    const totalPages = activeFile.pageOrder.length
    return targetNodes.map((node, i) => {
      const startPage = node.pageIndex
      const endPage =
        i < targetNodes.length - 1
          ? targetNodes[i + 1].pageIndex - 1
          : totalPages - 1
      return {
        title: node.title,
        startPage,
        endPage,
        pageCount: endPage - startPage + 1,
      }
    })
  }, [activeFile, targetNodes])

  // Reset selection when level changes (default to all selected)
  const handleLevelChange = useCallback(
    (level: number) => {
      setOutlineLevel(level)
      if (level < 2) setUseFolderHierarchy(false)
      // Get nodes at the new level and select all
      const nodes = getNodesAtLevel(activeFile?.outline ?? [], level)
      setSelectedSections(new Set(nodes.map((_, i) => i)))
    },
    [activeFile]
  )

  // Toggle selection for a section
  const toggleSection = useCallback((index: number) => {
    setSelectedSections((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selectedSections.size === sectionPreviews.length) {
      setSelectedSections(new Set())
    } else {
      setSelectedSections(new Set(sectionPreviews.map((_, i) => i)))
    }
  }, [selectedSections.size, sectionPreviews])

  // Select all on initial mount
  useMemo(() => {
    if (targetNodes.length > 0 && selectedSections.size === 0) {
      setSelectedSections(new Set(targetNodes.map((_, i) => i)))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSplitByOutline = useCallback(async () => {
    if (!activeFile) return
    setIsProcessing(true)
    try {
      const allSplits = await splitByOutline(
        activeFile.data,
        activeFile.outline,
        activeFile.pageOrder.length,
        outlineLevel
      )

      // Filter only selected sections and apply output naming options
      const selectedEntries = allSplits
        .map((split, index) => ({ split, index }))
        .filter(({ index }) => selectedSections.has(index))
      const hierarchyDigitsByDepth = getHierarchyDigitsByDepth(
        targetNodeInfos.map((info) => ({
          pathSiblingCounts: info.pathSiblingCounts,
        }))
      )

      const splits = selectedEntries.map(({ split, index }, selectedOrder) => {
        const info = targetNodeInfos[index]
        const { label, zipPath } = buildSplitOutputPath({
          info: info
            ? {
                title: info.title,
                pathTitles: info.pathTitles,
                pathIndices: info.pathIndices,
                pathSiblingCounts: info.pathSiblingCounts,
              }
            : undefined,
          fallbackLabel: split.label,
          selectedOrder,
          selectedCount: selectedEntries.length,
          addNumberPrefix,
          useFolderHierarchy,
          canUseFolderHierarchy,
          hierarchyDigitsByDepth,
        })
        return { ...split, label, zipPath }
      })

      if (splits.length === 0) return
      if (splits.length === 1) {
        downloadBlob(splits[0].data, `${splits[0].label}.pdf`)
      } else {
        await downloadSplitsAsZip(
          splits,
          `${activeFile.name.replace(/\.pdf$/i, "")}_split.zip`
        )
      }
    } finally {
      setIsProcessing(false)
    }
  }, [
    activeFile,
    addNumberPrefix,
    canUseFolderHierarchy,
    outlineLevel,
    selectedSections,
    targetNodeInfos,
    useFolderHierarchy,
  ])

  const handleSplitByPages = useCallback(async () => {
    if (!activeFile) return
    setIsProcessing(true)
    try {
      const ranges = parsePageRanges(pageRangesText, activeFile.pageOrder.length)
      if (ranges.length === 0) return

      const splits = await splitByPageRanges(
        activeFile.data,
        ranges.map((r, i) => ({
          label: `part${i + 1}_p${r[0] + 1}-${r[r.length - 1] + 1}`,
          pages: r,
        }))
      )

      if (splits.length === 1) {
        downloadBlob(splits[0].data, `${splits[0].label}.pdf`)
      } else {
        await downloadSplitsAsZip(
          splits,
          `${activeFile.name.replace(/\.pdf$/i, "")}_split.zip`
        )
      }
    } finally {
      setIsProcessing(false)
    }
  }, [activeFile, pageRangesText])

  if (!activeFile) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        {t("split.selectFile")}
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-3 overflow-auto p-2 sm:gap-4 sm:p-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("split.title")}</CardTitle>
          <CardDescription>
            {t("split.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            {/* Mode switch */}
            <div className="flex gap-2">
              <Button
                variant={mode === "outline" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("outline")}
                disabled={!hasOutline}
              >
                {t("split.modes.outline")}
              </Button>
              <Button
                variant={mode === "pages" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("pages")}
              >
                {t("split.modes.range")}
              </Button>
            </div>

            {mode === "outline" && hasOutline && (
              <div className="flex flex-col gap-4">
                {/* Outline level selection */}
                <Field>
                  <FieldLabel htmlFor="outline-level">
                    {t("split.outlineLevel")}
                  </FieldLabel>
                  <div className="flex gap-1">
                    {Array.from({ length: maxDepth }, (_, i) => i + 1).map((level) => (
                      <button
                        key={level}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                          outlineLevel === level
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => handleLevelChange(level)}
                      >
                        Lv.{level}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="border-border hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={addNumberPrefix}
                      onChange={(e) => setAddNumberPrefix(e.target.checked)}
                      className="accent-primary size-4 shrink-0 rounded"
                    />
                    <span>{t("split.options.numberPrefix")}</span>
                  </label>
                  <label
                    className={cn(
                      "border-border flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                      canUseFolderHierarchy
                        ? "hover:bg-muted/50 cursor-pointer"
                        : "text-muted-foreground cursor-not-allowed opacity-70"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={useFolderHierarchy}
                      onChange={(e) => setUseFolderHierarchy(e.target.checked)}
                      disabled={!canUseFolderHierarchy}
                      className="accent-primary size-4 shrink-0 rounded"
                    />
                    <span>{t("split.options.folderHierarchy")}</span>
                  </label>
                </div>
                {!canUseFolderHierarchy && (
                  <div className="text-muted-foreground text-xs">
                    {t("split.options.folderHierarchyHint")}
                  </div>
                )}

                {/* Preview list with checkboxes */}
                {sectionPreviews.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {t("split.sectionList", {
                          selected: selectedSections.size,
                          total: sectionPreviews.length,
                        })}
                      </span>
                      <button
                        className="text-primary text-xs font-medium hover:underline"
                        onClick={toggleAll}
                      >
                        {selectedSections.size === sectionPreviews.length
                          ? t("split.deselectAll")
                          : t("split.selectAll")}
                      </button>
                    </div>
                    <div className="border-border max-h-80 overflow-auto rounded-lg border">
                      {sectionPreviews.map((section, i) => (
                        <label
                          key={i}
                          className={cn(
                            "border-border flex cursor-pointer items-center gap-3 border-b px-3 py-2 transition-colors last:border-b-0",
                            selectedSections.has(i)
                              ? "bg-primary/5"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSections.has(i)}
                            onChange={() => toggleSection(i)}
                            className="accent-primary size-4 shrink-0 rounded"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {section.title}
                          </span>
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            p.{section.startPage + 1}-{section.endPage + 1} ({section.pageCount}p)
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSplitByOutline}
                  disabled={isProcessing || selectedSections.size === 0}
                >
                  {isProcessing
                    ? t("split.processing")
                    : t("split.downloadLabel", { count: selectedSections.size })}
                </Button>
              </div>
            )}

            {mode === "outline" && !hasOutline && (
              <div className="text-muted-foreground text-sm">
                {t("split.noOutline")}
              </div>
            )}

            {mode === "pages" && (
              <div className="flex flex-col gap-3">
                <Field>
                  <FieldLabel htmlFor="page-ranges">
                    {t("split.rangeLabel")}
                  </FieldLabel>
                  <Input
                    id="page-ranges"
                    placeholder="1-5, 10-15, 20"
                    value={pageRangesText}
                    onChange={(e) => setPageRangesText(e.target.value)}
                  />
                </Field>
                <div className="text-muted-foreground text-xs">
                  {t("split.totalPages", { count: activeFile.pageOrder.length })}
                </div>
                <Button
                  onClick={handleSplitByPages}
                  disabled={isProcessing || !pageRangesText.trim()}
                >
                  {isProcessing ? t("split.processing") : t("split.download")}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Helpers ----

function getNodesAtLevel(
  nodes: OutlineNode[],
  targetLevel: number,
  currentLevel: number = 1
): OutlineNode[] {
  if (currentLevel === targetLevel) return nodes
  return nodes.flatMap((n) =>
    getNodesAtLevel(n.children, targetLevel, currentLevel + 1)
  )
}

function getNodesWithPathAtLevel(
  nodes: OutlineNode[],
  targetLevel: number,
  currentLevel: number = 1,
  parentTitles: string[] = [],
  parentIndices: number[] = [],
  parentSiblingCounts: number[] = []
): TargetNodeInfo[] {
  if (currentLevel === targetLevel) {
    const siblingCount = nodes.length
    return nodes.map((node, index) => ({
      title: node.title,
      node,
      pathTitles: [...parentTitles, node.title],
      pathIndices: [...parentIndices, index],
      pathSiblingCounts: [...parentSiblingCounts, siblingCount],
    }))
  }
  const siblingCount = nodes.length
  return nodes.flatMap((node, index) =>
    getNodesWithPathAtLevel(
      node.children,
      targetLevel,
      currentLevel + 1,
      [...parentTitles, node.title],
      [...parentIndices, index],
      [...parentSiblingCounts, siblingCount]
    )
  )
}

/**
 * Parses page ranges: "1-5, 10-15, 20" -> [[0,1,2,3,4], [9,10,11,12,13,14], [19]]
 */
function parsePageRanges(text: string, totalPages: number): number[][] {
  const ranges: number[][] = []
  const parts = text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  for (const part of parts) {
    const match = part.match(/^(\d+)\s*-\s*(\d+)$/)
    if (match) {
      const start = Math.max(1, parseInt(match[1], 10))
      const end = Math.min(totalPages, parseInt(match[2], 10))
      const pages: number[] = []
      for (let i = start; i <= end; i++) pages.push(i - 1)
      if (pages.length > 0) ranges.push(pages)
    } else {
      const num = parseInt(part, 10)
      if (num >= 1 && num <= totalPages) ranges.push([num - 1])
    }
  }
  return ranges
}
