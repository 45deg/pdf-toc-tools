import { useState, useCallback, useMemo } from "react"
import { useActiveFile } from "@/hooks/use-pdf-store"
import type { OutlineNode } from "@/lib/pdf/types"
import {
  splitByOutline,
  splitByPageRanges,
} from "@/lib/pdf/operations"
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

export function SplitPanel() {
  const activeFile = useActiveFile()
  const [mode, setMode] = useState<SplitMode>("outline")
  const [outlineLevel, setOutlineLevel] = useState(0)
  const [pageRangesText, setPageRangesText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  // チェックボックスで選択するセクション（outlineモード用）
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set())

  const hasOutline = (activeFile?.outline.length ?? 0) > 0

  // アウトラインの最大深度を計算
  const maxDepth = useMemo((): number => {
    if (!activeFile) return 0
    function getDepth(nodes: OutlineNode[], d: number): number {
      if (nodes.length === 0) return d
      return Math.max(...nodes.map((n) => getDepth(n.children, d + 1)))
    }
    return getDepth(activeFile.outline, 0)
  }, [activeFile])

  // 指定レベルのノードリストを取得
  const targetNodes = useMemo((): OutlineNode[] => {
    if (!activeFile || !hasOutline) return []
    return outlineLevel === 0
      ? activeFile.outline
      : getNodesAtLevel(activeFile.outline, outlineLevel)
  }, [activeFile, hasOutline, outlineLevel])

  // プレビュー用: ノードごとのページ範囲
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

  // レベル変更時に選択をリセット（全選択状態に）
  const handleLevelChange = useCallback(
    (level: number) => {
      setOutlineLevel(level)
      // 新しいレベルのノードを取得して全選択
      const nodes =
        level === 0
          ? (activeFile?.outline ?? [])
          : getNodesAtLevel(activeFile?.outline ?? [], level)
      setSelectedSections(new Set(nodes.map((_, i) => i)))
    },
    [activeFile]
  )

  // セクションの選択/解除
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

  // 初回マウント時に全選択
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
      // 選択されたセクションのみフィルタ
      const splits = allSplits.filter((_, i) => selectedSections.has(i))
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
  }, [activeFile, outlineLevel, selectedSections])

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
        ファイルを選択してください
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-3 overflow-auto p-2 sm:gap-4 sm:p-4">
      <Card>
        <CardHeader>
          <CardTitle>一括分割</CardTitle>
          <CardDescription>
            しおりの階層に基づく分割、またはページ範囲指定による分割が可能です。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            {/* モード切替 */}
            <div className="flex gap-2">
              <Button
                variant={mode === "outline" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("outline")}
                disabled={!hasOutline}
              >
                しおりで分割
              </Button>
              <Button
                variant={mode === "pages" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("pages")}
              >
                ページ範囲で分割
              </Button>
            </div>

            {mode === "outline" && hasOutline && (
              <div className="flex flex-col gap-4">
                {/* 階層レベル選択 */}
                <Field>
                  <FieldLabel htmlFor="outline-level">
                    分割する階層レベル
                  </FieldLabel>
                  <div className="flex gap-1">
                    {Array.from({ length: maxDepth + 1 }, (_, i) => (
                      <button
                        key={i}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                          outlineLevel === i
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => handleLevelChange(i)}
                      >
                        Lv.{i}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* プレビューリスト（チェックボックス付き） */}
                {sectionPreviews.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        セクション一覧（{selectedSections.size}/{sectionPreviews.length}）
                      </span>
                      <button
                        className="text-primary text-xs font-medium hover:underline"
                        onClick={toggleAll}
                      >
                        {selectedSections.size === sectionPreviews.length
                          ? "すべて解除"
                          : "すべて選択"}
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
                            p.{section.startPage + 1}–{section.endPage + 1}（{section.pageCount}p）
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
                    ? "処理中…"
                    : `${selectedSections.size}セクションを分割してダウンロード`}
                </Button>
              </div>
            )}

            {mode === "outline" && !hasOutline && (
              <div className="text-muted-foreground text-sm">
                このファイルにはしおりがありません。
              </div>
            )}

            {mode === "pages" && (
              <div className="flex flex-col gap-3">
                <Field>
                  <FieldLabel htmlFor="page-ranges">
                    ページ範囲（例: 1-5, 10-15, 20）
                  </FieldLabel>
                  <Input
                    id="page-ranges"
                    placeholder="1-5, 10-15, 20"
                    value={pageRangesText}
                    onChange={(e) => setPageRangesText(e.target.value)}
                  />
                </Field>
                <div className="text-muted-foreground text-xs">
                  総ページ数: {activeFile.pageOrder.length}
                </div>
                <Button
                  onClick={handleSplitByPages}
                  disabled={isProcessing || !pageRangesText.trim()}
                >
                  {isProcessing ? "処理中…" : "分割してダウンロード"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- ヘルパー ----

function getNodesAtLevel(
  nodes: OutlineNode[],
  targetLevel: number,
  currentLevel: number = 0
): OutlineNode[] {
  if (currentLevel === targetLevel) return nodes
  return nodes.flatMap((n) =>
    getNodesAtLevel(n.children, targetLevel, currentLevel + 1)
  )
}

/**
 * "1-5, 10-15, 20" → [[0,1,2,3,4], [9,10,11,12,13,14], [19]]
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
