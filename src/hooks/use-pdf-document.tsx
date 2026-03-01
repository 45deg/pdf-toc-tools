import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  memo,
} from "react"
import type { ReactNode } from "react"
import * as pdfjsLib from "pdfjs-dist"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { pdfjsDocumentOptions } from "@/lib/pdf/setup"
import { thumbnailCache, ThumbnailCacheKey } from "@/lib/pdf/thumbnail-cache"

// ===== PDFDocumentContext =====

const PdfDocContext = createContext<PDFDocumentProxy | null>(null)

/**
 * Provider that provides pdfjs-dist document via context.
 * Alternative to <Document> from react-pdf.
 */
export function PdfDocumentProvider({
  data,
  children,
  loading,
  error,
}: {
  data: ArrayBuffer | null
  children: ReactNode
  loading?: ReactNode
  error?: ReactNode
}) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  )
  const taskRef = useRef<ReturnType<typeof pdfjsLib.getDocument> | null>(null)

  useEffect(() => {
    setPdfDoc(null)

    if (!data) {
      setStatus("idle")
      return
    }

    setStatus("loading")

    // Cancel previous load
    if (taskRef.current) {
      taskRef.current.destroy()
    }

    // Pass the copy of ArrayBuffer. pdfjs-dist transfers/detaches internally,
    // so passing the original ArrayBuffer results in a detached error on React re-render.
    const copy = data.slice(0)
    const task = pdfjsLib.getDocument({
      data: new Uint8Array(copy),
      ...pdfjsDocumentOptions,
    })
    taskRef.current = task

    task.promise
      .then((doc) => {
        setPdfDoc(doc)
        setStatus("ready")
      })
      .catch((err) => {
        // Ignore cancellation by destroy()
        if (err?.name !== "MissingPDFException") {
          setStatus("error")
        }
      })

    return () => {
      task.destroy()
    }
  }, [data])

  if (status === "loading" && loading) return <>{loading}</>
  if (status === "error" && error) return <>{error}</>
  if (!pdfDoc) return null

  return <PdfDocContext.Provider value={pdfDoc}>{children}</PdfDocContext.Provider>
}

export function usePdfDocument() {
  return useContext(PdfDocContext)
}

// ===== PdfPageCanvas =====

/**
 * Component that renders a specific page to a canvas.
 * Alternative to <Page> from react-pdf.
 */
export const PdfPageCanvas = memo(function PdfPageCanvas({
  pageNumber,
  width,
  onRenderStateChange,
}: {
  /** 1-indexed page number */
  pageNumber: number
  /** Display width (px) */
  width: number
  onRenderStateChange?: (state: "loading" | "ready" | "error") => void
}) {
  const pdfDoc = usePdfDocument()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<ReturnType<
    ReturnType<PDFDocumentProxy["getPage"]> extends Promise<infer P>
      ? P extends { render: (...args: any[]) => infer R }
        ? (...args: any[]) => R
        : never
      : never
  > | null>(null)

  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  const render = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return

    onRenderStateChange?.("loading")

    const fingerprint = pdfDoc.fingerprints?.[0] ?? ""
    const cacheKey = ThumbnailCacheKey(fingerprint, pageNumber, width)

    // --- Cache Hit: Render ImageBitmap immediately ---
    const cached = thumbnailCache.get(cacheKey)
    if (cached) {
      const canvas = canvasRef.current
      canvas.width = cached.width
      canvas.height = cached.height
      const dpr = window.devicePixelRatio
      canvas.style.width = `${cached.width / dpr}px`
      canvas.style.height = `${cached.height / dpr}px`
      setSize({ w: cached.width / dpr, h: cached.height / dpr })
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(cached, 0, 0)
      onRenderStateChange?.("ready")
      return
    }

    // --- Cache Miss: Render from PDF ---
    try {
      const page = await pdfDoc.getPage(pageNumber)
      const unscaledViewport = page.getViewport({ scale: 1 })
      const scale = width / unscaledViewport.width
      const viewport = page.getViewport({ scale })

      const dpr = window.devicePixelRatio
      const canvas = canvasRef.current
      canvas.width = viewport.width * dpr
      canvas.height = viewport.height * dpr
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      setSize({ w: viewport.width, h: viewport.height })

      const ctx = canvas.getContext("2d")!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Cancel previous rendering
      if (renderTaskRef.current) {
        (renderTaskRef.current as any).cancel?.()
      }

      const task = page.render({ canvas, canvasContext: ctx, viewport })
      renderTaskRef.current = task as any
      await task.promise

      // Rendering success -> Store in cache
      try {
        const bitmap = await createImageBitmap(canvas)
        thumbnailCache.set(cacheKey, bitmap)
      } catch {
        // Ignore environments where createImageBitmap is not supported (works without cache)
      }
      onRenderStateChange?.("ready")
    } catch (err) {
      if ((err as { name?: string })?.name !== "RenderingCancelledException") {
        onRenderStateChange?.("error")
      }
    }
  }, [pdfDoc, pageNumber, width, onRenderStateChange])

  useEffect(() => {
    render()
  }, [render])

  return (
    <canvas
      ref={canvasRef}
      style={
        size
          ? { width: size.w, height: size.h, display: "block" }
          : { width, aspectRatio: "3/4", display: "block" }
      }
    />
  )
})
