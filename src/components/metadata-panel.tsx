import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
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

export function MetadataPanel() {
  const { t } = useTranslation()
  const activeFile = useActiveFile()
  const { actions } = usePdfStore()
  const [form, setForm] = useState<PdfMetadata | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const metadataFields: { key: keyof PdfMetadata; label: string; readOnly?: boolean }[] = [
    { key: "title", label: t("metadata.fields.title") },
    { key: "author", label: t("metadata.fields.author") },
    { key: "subject", label: t("metadata.fields.subject") },
    { key: "keywords", label: t("metadata.fields.keywords") },
    { key: "creator", label: t("metadata.fields.creator") },
    { key: "producer", label: t("metadata.fields.producer") },
    { key: "creationDate", label: t("metadata.fields.creationDate"), readOnly: true },
    { key: "modificationDate", label: t("metadata.fields.modificationDate"), readOnly: true },
  ]

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
        {t("metadata.noFile")}
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-3 p-2 sm:gap-4 sm:p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("metadata.title")}
            {isDirty && <Badge variant="secondary">{t("metadata.unapplied")}</Badge>}
          </CardTitle>
          <CardDescription>
            {t("metadata.description")}
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
              {t("metadata.actions.apply")}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={!isDirty}>
              {t("metadata.actions.reset")}
            </Button>
            <Button variant="outline" onClick={handleApplyAndDownload}>
              {t("metadata.actions.applyAndDownload")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleSanitize}
              className="ml-auto"
            >
              {t("metadata.actions.sanitize")}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
