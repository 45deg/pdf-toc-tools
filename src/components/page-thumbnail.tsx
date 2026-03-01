import { useState, useRef, useEffect, memo } from "react"
import { useTranslation } from "react-i18next"
import { PdfPageCanvas } from "@/hooks/use-pdf-document"
import { cn } from "@/lib/utils"

interface PageThumbnailProps {
  /** 1-indexed page number */
  pageNumber: number
  /** Index within the current page order (for display) */
  displayIndex: number
  selected: boolean
  onClick: (e: React.MouseEvent) => void
  /** Whether any other page is selected */
  hasAnySelection?: boolean
  /** When checkbox is clicked (toggle selection without modifier keys) */
  onToggleSelect?: () => void
  width?: number
}

export const PageThumbnail = memo(function PageThumbnail({
  pageNumber,
  displayIndex,
  selected,
  onClick,
  hasAnySelection = false,
  onToggleSelect,
  width = 160,
}: PageThumbnailProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [renderStatus, setRenderStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "300px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setRenderStatus("loading")
  }, [pageNumber, width])

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all",
        selected
          ? "border-primary ring-primary/30 ring-2"
          : "border-transparent hover:border-muted-foreground/30"
      )}
      onClick={onClick}
      style={{ width }}
    >
      {isVisible ? (
        <>
          <PdfPageCanvas
            pageNumber={pageNumber}
            width={width}
            onRenderStateChange={setRenderStatus}
          />
          {renderStatus !== "ready" && (
            <div className="bg-background/70 absolute inset-0 flex items-center justify-center backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-1.5">
                {renderStatus === "error" ? (
                  <span className="text-destructive text-[11px] font-medium">
                    {t("thumbnail.loadError")}
                  </span>
                ) : (
                  <>
                    <div className="border-primary size-4 animate-spin rounded-full border-2 border-t-transparent" />
                    <span className="text-muted-foreground text-[11px] font-medium">
                      {t("thumbnail.loading")}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          className="bg-muted animate-pulse"
          style={{ width, aspectRatio: "3/4" }}
        />
      )}
      {/* Selection checkbox (top-left) */}
      <div
        className={cn(
          "absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full border-2 transition-all duration-150",
          selected
            ? "bg-primary border-primary text-primary-foreground scale-100 opacity-100"
            : hasAnySelection
              ? "border-white/80 bg-black/20 scale-100 opacity-80 hover:border-white hover:bg-black/40 hover:opacity-100"
              : "border-white/60 bg-black/20 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100"
        )}
        onClick={(e) => {
          e.stopPropagation()
          onToggleSelect?.()
        }}
        role="checkbox"
        aria-checked={selected}
        aria-label={t("thumbnail.ariaLabel", { page: displayIndex + 1 })}
      >
        {selected && (
          <svg className="size-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="2,6 5,9 10,3" />
          </svg>
        )}
      </div>

      {/* Page number badge */}
      <div
        className={cn(
          "absolute bottom-0 inset-x-0 py-0.5 text-center text-xs font-medium transition-colors",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-black/50 text-white"
        )}
      >
        {displayIndex + 1}
      </div>
    </div>
  )
})
