import { useState, useMemo, useCallback } from "react"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation()
  const activeFile = useActiveFile()
  const { actions } = usePdfStore()

  const initialJson = useMemo(
    () => (activeFile ? exportOutlineAsJson(activeFile.outline) : "[]"),
    [activeFile]
  )

  const [jsonText, setJsonText] = useState(initialJson)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Reset when file changes
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

      // Apply to PDF as well
      const newData = await applyOutlinesToPdf(activeFile.data, outline)
      // Update data via store
      // Note: For simplicity, only outline is updated here. PDF binary update happens at download.
      setIsDirty(false)
      setError(null)
      void newData // PDF binary update is handled during save
    } catch (e) {
      setError(e instanceof Error ? e.message : t("landing.tocEditor.errorJson"))
    }
  }, [activeFile, jsonText, actions, t])

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
          // JSON Validation
          importOutlineFromJson(text)
          handleTextChange(text)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t("landing.tocEditor.errorJson"))
      }
    }
    input.click()
  }, [handleTextChange, t])

  if (!activeFile) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        {t("common.noFileSelected")}
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-3 p-2 sm:gap-4 sm:p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("landing.tocEditor.title")}
            {isDirty && <Badge variant="secondary">{t("landing.tocEditor.unapplied")}</Badge>}
          </CardTitle>
          <CardDescription>
            {t("landing.tocEditor.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {/* Export/Import buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("json")}
              >
                {t("landing.tocEditor.exportJson")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("csv")}
              >
                {t("landing.tocEditor.exportCsv")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("markdown")}
              >
                {t("landing.tocEditor.exportMarkdown")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleImport}>
                {t("landing.tocEditor.import")}
              </Button>
            </div>

            {/* JSON Editor */}
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
            {t("landing.tocEditor.apply")}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!isDirty}
            className="ml-2"
          >
            {t("landing.tocEditor.reset")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
