import { useState, useEffect, useCallback } from "react"
import { useActiveFile, usePdfStore } from "@/hooks/use-pdf-store"
import { updatePdfMetadata } from "@/lib/pdf/operations"
import { downloadBlob } from "@/lib/pdf/download"
import type { PdfMetadata } from "@/lib/pdf/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"

const metadataFields: { key: keyof PdfMetadata; label: string; readOnly?: boolean }[] = [
  { key: "title", label: "タイトル" },
  { key: "author", label: "著者" },
  { key: "subject", label: "件名" },
  { key: "keywords", label: "キーワード" },
  { key: "creator", label: "作成アプリ" },
  { key: "producer", label: "PDF変換" },
  { key: "creationDate", label: "作成日", readOnly: true },
  { key: "modificationDate", label: "更新日", readOnly: true },
]

export function MetadataPanel() {
  const activeFile = useActiveFile()
  const { actions } = usePdfStore()
  const [form, setForm] = useState<PdfMetadata | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (activeFile) {
      setForm({ ...activeFile.metadata })
      setIsDirty(false)
    }
  }, [activeFile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (key: keyof PdfMetadata, value: string) => {
      setForm((prev) =>
        prev ? { ...prev, [key]: value } : prev
      )
      setIsDirty(true)
    },
    []
  )

  const handleApply = useCallback(async () => {
    if (!activeFile || !form) return
    actions.updateMetadata(form)
    setIsDirty(false)
  }, [activeFile, form, actions])

  const handleApplyAndDownload = useCallback(async () => {
    if (!activeFile || !form) return
    const newData = await updatePdfMetadata(activeFile.data, {
      title: form.title,
      author: form.author,
      subject: form.subject,
      keywords: form.keywords,
      creator: form.creator,
      producer: form.producer,
    })
    downloadBlob(newData, activeFile.name)
  }, [activeFile, form])

  const handleSanitize = useCallback(async () => {
    if (!activeFile) return
    const clean: Partial<PdfMetadata> = {
      title: "",
      author: "",
      subject: "",
      keywords: "",
      creator: "",
      producer: "",
    }
    const newData = await updatePdfMetadata(activeFile.data, clean)
    const emptyMeta: PdfMetadata = {
      title: "",
      author: "",
      subject: "",
      keywords: "",
      creator: "",
      producer: "",
      creationDate: activeFile.metadata.creationDate,
      modificationDate: activeFile.metadata.modificationDate,
    }
    actions.updateMetadata(emptyMeta)
    setForm(emptyMeta)
    setIsDirty(false)
    downloadBlob(newData, activeFile.name.replace(/\.pdf$/i, "_sanitized.pdf"))
  }, [activeFile, actions])

  const handleReset = useCallback(() => {
    if (activeFile) {
      setForm({ ...activeFile.metadata })
      setIsDirty(false)
    }
  }, [activeFile])

  if (!activeFile || !form) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        ファイルを選択してください
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-3 p-2 sm:gap-4 sm:p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            メタデータ
            {isDirty && <Badge variant="secondary">未適用</Badge>}
          </CardTitle>
          <CardDescription>
            Document Information Dictionary の閲覧・編集。
            「サニタイズ」で制作者情報を一括削除できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {metadataFields.map(({ key, label, readOnly }) => (
              <Field key={key}>
                <FieldLabel htmlFor={`meta-${key}`}>{label}</FieldLabel>
                <Input
                  id={`meta-${key}`}
                  value={form[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  readOnly={readOnly}
                  className={readOnly ? "bg-muted cursor-not-allowed" : ""}
                />
              </Field>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex w-full flex-wrap gap-2">
            <Button onClick={handleApply} disabled={!isDirty}>
              適用
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={!isDirty}>
              リセット
            </Button>
            <Button variant="outline" onClick={handleApplyAndDownload}>
              適用してダウンロード
            </Button>
            <Button
              variant="destructive"
              onClick={handleSanitize}
              className="ml-auto"
            >
              サニタイズ（情報削除）
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
