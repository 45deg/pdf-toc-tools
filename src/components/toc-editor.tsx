import { useState, useMemo, useCallback } from "react"
import { useActiveFile, usePdfStore } from "@/hooks/use-pdf-store"
import {
  exportOutlineAsJson,
  exportOutlineAsCsv,
  exportOutlineAsMarkdown,
  importOutlineFromJson,
  importOutlineFromCsv,
} from "@/lib/pdf/outline-io"
import { applyOutlinesToPdf } from "@/lib/pdf/operations"
import { downloadText } from "@/lib/pdf/download"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function TocEditor() {
  const activeFile = useActiveFile()
  const { actions } = usePdfStore()

  const initialJson = useMemo(
    () => (activeFile ? exportOutlineAsJson(activeFile.outline) : "[]"),
    [activeFile]
  )

  const [jsonText, setJsonText] = useState(initialJson)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // ファイル変更時にリセット
  const fileId = activeFile?.id
  const [lastFileId, setLastFileId] = useState(fileId)
  if (fileId !== lastFileId) {
    setLastFileId(fileId)
    setJsonText(initialJson)
    setIsDirty(false)
    setError(null)
  }

  const handleTextChange = useCallback(
    (value: string) => {
      setJsonText(value)
      setIsDirty(value !== initialJson)
      setError(null)
    },
    [initialJson]
  )

  const handleApply = useCallback(async () => {
    if (!activeFile) return
    try {
      const outline = importOutlineFromJson(jsonText)
      actions.updateOutline(outline)

      // PDFにも適用
      const newData = await applyOutlinesToPdf(activeFile.data, outline)
      // data を更新（store経由）
      // 注: 簡略化のため、outline のみ更新。PDFバイナリの更新はダウンロード時に行う
      setIsDirty(false)
      setError(null)
      void newData // PDFバイナリ更新は保存時に行う
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON")
    }
  }, [activeFile, jsonText, actions])

  const handleReset = useCallback(() => {
    setJsonText(initialJson)
    setIsDirty(false)
    setError(null)
  }, [initialJson])

  const handleExport = useCallback(
    (format: "json" | "csv" | "markdown") => {
      if (!activeFile) return
      const baseName = activeFile.name.replace(/\.pdf$/i, "")
      switch (format) {
        case "json":
          downloadText(jsonText, `${baseName}_toc.json`, "application/json")
          break
        case "csv":
          downloadText(
            exportOutlineAsCsv(activeFile.outline),
            `${baseName}_toc.csv`,
            "text/csv"
          )
          break
        case "markdown":
          downloadText(
            exportOutlineAsMarkdown(activeFile.outline),
            `${baseName}_toc.md`,
            "text/markdown"
          )
          break
      }
    },
    [activeFile, jsonText]
  )

  const handleImport = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json,.csv"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        if (file.name.endsWith(".csv")) {
          const outline = importOutlineFromCsv(text)
          const json = exportOutlineAsJson(outline)
          handleTextChange(json)
        } else {
          // JSON バリデーション
          importOutlineFromJson(text)
          handleTextChange(text)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed")
      }
    }
    input.click()
  }, [handleTextChange])

  if (!activeFile) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        ファイルを選択してください
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-3 p-2 sm:gap-4 sm:p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            TOCエディタ
            {isDirty && <Badge variant="secondary">未適用</Badge>}
          </CardTitle>
          <CardDescription>
            しおり（Document Outline）をJSON形式で編集できます。
            変更を「適用」すると、PDFのしおり構造が更新されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {/* エクスポート・インポートボタン */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("json")}
              >
                JSON エクスポート
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("csv")}
              >
                CSV エクスポート
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("markdown")}
              >
                Markdown エクスポート
              </Button>
              <Button variant="outline" size="sm" onClick={handleImport}>
                JSON/CSV インポート
              </Button>
            </div>

            {/* JSONエディタ */}
            <textarea
              className="border-input bg-muted/30 focus-visible:border-ring focus-visible:ring-ring/50 min-h-[400px] w-full rounded-lg border p-3 font-mono text-sm outline-none focus-visible:ring-3"
              value={jsonText}
              onChange={(e) => handleTextChange(e.target.value)}
              spellCheck={false}
            />

            {error && (
              <div className="text-destructive rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm dark:border-red-900 dark:bg-red-950">
                {error}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleApply} disabled={!isDirty}>
            適用
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!isDirty}
            className="ml-2"
          >
            リセット
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
