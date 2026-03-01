import { useState, useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { usePdfStore } from "@/hooks/use-pdf-store"
import { Toolbar } from "@/components/toolbar"
import { Sidebar } from "@/components/sidebar"
import { PageGrid } from "@/components/page-grid"
import { TocEditor } from "@/components/toc-editor"
import { MetadataPanel } from "@/components/metadata-panel"
import { SplitPanel } from "@/components/split-panel"
import { LandingPage } from "@/components/landing-page"

export function PdfToolkit() {
  const { t } = useTranslation()
  const { state } = usePdfStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  // Close mobile sidebar on view mode change
  useEffect(() => {
    setSidebarOpen(false)
  }, [state.viewMode])

  // Show landing page if no files are loaded
  if (state.files.length === 0) {
    return <LandingPage />
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <Toolbar onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop: Always visible */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Mobile: Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-xs"
              onClick={closeSidebar}
            />
            <div className="animate-in slide-in-from-left relative z-10 w-[280px] max-w-[80vw] shadow-xl duration-200">
              <Sidebar mobile onClose={closeSidebar} />
            </div>
          </div>
        )}

        <main className="flex-1 overflow-auto">
          {state.viewMode === "pages" && <PageGrid />}
          {state.viewMode === "toc" && <TocEditor />}
          {state.viewMode === "split" && <SplitPanel />}
          {state.viewMode === "metadata" && <MetadataPanel />}
        </main>
      </div>

      {/* Loading overlay */}
      {state.isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-background flex items-center gap-3 rounded-xl border px-6 py-4 shadow-lg">
            <div className="border-primary size-5 animate-spin rounded-full border-2 border-t-transparent" />
            <span className="text-sm font-medium">{t("common.loading")}</span>
          </div>
        </div>
      )}
    </div>
  )
}
