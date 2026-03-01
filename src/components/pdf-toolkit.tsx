import { useState, useCallback, useEffect } from "react"
import { usePdfStore } from "@/hooks/use-pdf-store"
import { Toolbar } from "@/components/toolbar"
import { Sidebar } from "@/components/sidebar"
import { PageGrid } from "@/components/page-grid"
import { TocEditor } from "@/components/toc-editor"
import { MetadataPanel } from "@/components/metadata-panel"
import { SplitPanel } from "@/components/split-panel"
import { LandingPage } from "@/components/landing-page"

export function PdfToolkit() {
  const { state } = usePdfStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  // ビューモード変更時にモバイルサイドバーを閉じる
  useEffect(() => {
    setSidebarOpen(false)
  }, [state.viewMode])

  // ファイルが読み込まれていない場合はランディングページを表示
  if (state.files.length === 0) {
    return <LandingPage />
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <Toolbar onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        {/* デスクトップ: 常時表示 */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* モバイル: ドロワー */}
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

      {/* ローディングオーバーレイ */}
      {state.isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-background flex items-center gap-3 rounded-xl border px-6 py-4 shadow-lg">
            <div className="border-primary size-5 animate-spin rounded-full border-2 border-t-transparent" />
            <span className="text-sm font-medium">PDFを読み込み中…</span>
          </div>
        </div>
      )}
    </div>
  )
}
