import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { usePdfStore } from "@/hooks/use-pdf-store"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FileIcon,
  ListViewIcon,
  GridViewIcon,
  SplitIcon,
  FileEditIcon,
  ShieldIcon,
} from "@hugeicons/core-free-icons"

const features = [
  {
    icon: ListViewIcon,
    title: "目次（TOC）編集",
    description: "PDFのしおり・目次を視覚的に追加・編集・並べ替え",
  },
  {
    icon: GridViewIcon,
    title: "ページ操作",
    description: "ドラッグ＆ドロップでページの並べ替え・削除・抽出",
  },
  {
    icon: SplitIcon,
    title: "分割・結合",
    description: "複数PDFの結合や、指定ページでの一括分割に対応",
  },
  {
    icon: FileEditIcon,
    title: "メタデータ編集",
    description: "タイトル・著者などのPDFメタデータを自由に変更",
  },
]

export function LandingPage() {
  const { state, actions } = usePdfStore()

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      actions.loadFiles(acceptedFiles)
    },
    [actions]
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    noClick: true,
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex h-screen w-full items-center justify-center p-4 transition-colors sm:p-8",
        isDragActive ? "bg-primary/5" : "bg-muted/40"
      )}
    >
      <input {...getInputProps()} />

      {/* 背景パターン */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* ドラッグ中のオーバーレイ */}
      {isDragActive && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-primary/5 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-background/80 px-16 py-12 shadow-lg">
            <div className="flex size-16 items-center justify-center rounded-xl bg-primary/10">
              <HugeiconsIcon
                icon={FileIcon}
                strokeWidth={1.5}
                className="size-8 text-primary"
              />
            </div>
            <p className="text-lg font-semibold text-primary">
              ここにドロップしてください
            </p>
          </div>
        </div>
      )}

      {/* メインカード */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-background shadow-xl shadow-black/5 sm:rounded-3xl">
        {/* ヘッダー */}
        <div className="flex flex-col items-center gap-3 px-4 pt-8 pb-2 text-center sm:px-8 sm:pt-10">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <HugeiconsIcon
              icon={FileIcon}
              strokeWidth={1.5}
              className="size-7 text-primary"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              PDF TOC Tools
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              PDFの目次編集・ページ操作・分割結合をブラウザ上で完結
            </p>
          </div>
        </div>

        {/* 機能グリッド */}
        <div className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-2 sm:gap-3 sm:px-8 sm:py-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-3 rounded-xl border border-transparent bg-muted/50 p-3 transition-colors"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border">
                <HugeiconsIcon
                  icon={feature.icon}
                  strokeWidth={1.5}
                  className="size-4 text-muted-foreground"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {feature.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ドロップゾーン / CTA */}
        <div className="px-4 pb-3 sm:px-8 sm:pb-4">
          <button
            type="button"
            onClick={open}
            className={cn(
              "group flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 transition-all sm:px-6 sm:py-7",
              "border-border hover:border-primary/40 hover:bg-primary/[0.02]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10">
              <HugeiconsIcon
                icon={FileIcon}
                strokeWidth={1.5}
                className="size-5 text-muted-foreground transition-colors group-hover:text-primary"
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                PDFファイルをドラッグ＆ドロップ
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                またはクリックしてファイルを選択
              </p>
            </div>
          </button>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-center gap-1.5 border-t bg-muted/30 px-4 py-2.5 sm:px-8 sm:py-3">
          <HugeiconsIcon
            icon={ShieldIcon}
            strokeWidth={1.5}
            className="size-3.5 text-muted-foreground/70"
          />
          <p className="text-xs text-muted-foreground/70">
            すべての処理はブラウザ上で完結します。ファイルがサーバーに送信されることはありません。
          </p>
        </div>
      </div>

      {/* ローディング */}
      {state.isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-xs">
          <div className="flex items-center gap-3 rounded-xl border bg-background px-6 py-4 shadow-lg">
            <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm font-medium">PDFを読み込み中…</span>
          </div>
        </div>
      )}
    </div>
  )
}
