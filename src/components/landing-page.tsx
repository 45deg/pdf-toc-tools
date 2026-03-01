import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useTranslation } from "react-i18next"
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

export function LandingPage() {
  const { t } = useTranslation()
  const { state, actions } = usePdfStore()

  const features = [
    {
      icon: ListViewIcon,
      title: t("landing.title"),
      description: t("landing.description"),
    },
    {
      icon: GridViewIcon,
      title: t("landing.pageOperations.title"),
      description: t("landing.pageOperations.description"),
    },
    {
      icon: SplitIcon,
      title: t("landing.splitMerge.title"),
      description: t("landing.splitMerge.description"),
    },
    {
      icon: FileEditIcon,
      title: t("landing.metadata.title"),
      description: t("landing.metadata.description"),
    },
  ]

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

      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Drag overlay */}
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
              {t("landing.dropzone.dropHere")}
            </p>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-background shadow-xl shadow-black/5 sm:rounded-3xl">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-4 pt-8 pb-2 text-center sm:px-8 sm:pt-10">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
            <img src="./logo.svg" alt="pdf-toc-tools Logo" className="size-12" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              pdf-toc-tools
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              {t("landing.hero.subtitle")}
            </p>
          </div>
        </div>

        {/* Feature grid */}
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

        {/* Dropzone / CTA */}
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
                {t("landing.dropzone.dragText")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("landing.dropzone.clickText")}
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 border-t bg-muted/30 px-4 py-2.5 sm:px-8 sm:py-3">
          <HugeiconsIcon
            icon={ShieldIcon}
            strokeWidth={1.5}
            className="size-3.5 text-muted-foreground/70"
          />
          <p className="text-xs text-muted-foreground/70">
            {t("landing.footer.privacy")}
          </p>
        </div>
      </div>

      {/* Loading overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-xs">
          <div className="flex items-center gap-3 rounded-xl border bg-background px-6 py-4 shadow-lg">
            <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm font-medium">{t("common.loading")}</span>
          </div>
        </div>
      )}
    </div>
  )
}
