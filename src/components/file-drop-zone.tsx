import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { usePdfStore } from "@/hooks/use-pdf-store"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { FileIcon } from "@hugeicons/core-free-icons"

interface FileDropZoneProps {
  /** ページ全体を覆うフルスクリーンモード */
  fullPage?: boolean
  className?: string
}

export function FileDropZone({ fullPage = false, className }: FileDropZoneProps) {
  const { state, actions } = usePdfStore()

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      actions.loadFiles(acceptedFiles)
    },
    [actions]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
  })

  if (fullPage) {
    return (
      <div
        {...getRootProps()}
        className={cn(
          "flex h-screen w-full flex-col items-center justify-center gap-6 p-8 transition-colors",
          isDragActive ? "bg-primary/5" : "bg-background",
          className
        )}
      >
        <input {...getInputProps()} />
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-16 transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50"
          )}
        >
          <div className="bg-muted flex size-16 items-center justify-center rounded-xl">
            <HugeiconsIcon
              icon={FileIcon}
              strokeWidth={1.5}
              className="text-muted-foreground size-8"
            />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">
              {isDragActive
                ? "ファイルをドロップしてください"
                : "PDFファイルをドラッグ＆ドロップ"}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              またはクリックしてファイルを選択
            </p>
          </div>
          {state.isLoading && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <div className="border-primary size-4 animate-spin rounded-full border-2 border-t-transparent" />
              読み込み中…
            </div>
          )}
        </div>
      </div>
    )
  }

  // コンパクトなインライン版（ツールバー内など）
  return (
    <div
      {...getRootProps()}
      className={cn(
        "cursor-pointer rounded-lg border border-dashed px-3 py-1.5 text-sm transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50",
        className
      )}
    >
      <input {...getInputProps()} />
      <span className="text-muted-foreground">
        {isDragActive ? "ドロップ" : "+ PDF追加"}
      </span>
    </div>
  )
}
