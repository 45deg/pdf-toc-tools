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
 * pdfjs-dist のドキュメントをコンテキストで提供するプロバイダ。
 * react-pdf の <Document> の代替。
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

    // 前回のロードをキャンセル
    if (taskRef.current) {
      taskRef.current.destroy()
    }

    // ArrayBuffer はコピーして渡す。pdfjs-dist は内部で transfer/detach するため、
    // 元の ArrayBuffer を渡すと React の再レンダリング時に detached エラーになる。
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
        // destroy() によるキャンセルは無視
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
 * 指定ページを canvas にレンダリングするコンポーネント。
 * react-pdf の <Page> の代替。
 */
export const PdfPageCanvas = memo(function PdfPageCanvas({
  pageNumber,
  width,
}: {
  /** 1-indexed ページ番号 */
  pageNumber: number
  /** 表示幅 (px) */
  width: number
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

    const fingerprint = pdfDoc.fingerprints?.[0] ?? ""
    const cacheKey = ThumbnailCacheKey(fingerprint, pageNumber, width)

    // --- キャッシュヒット: ImageBitmap を即座に描画 ---
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
      return
    }

    // --- キャッシュミス: PDF からレンダリング ---
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

      // 前のレンダリングをキャンセル
      if (renderTaskRef.current) {
        (renderTaskRef.current as any).cancel?.()
      }

      const task = page.render({ canvas, canvasContext: ctx, viewport })
      renderTaskRef.current = task as any
      await task.promise

      // レンダリング成功 → キャッシュに格納
      try {
        const bitmap = await createImageBitmap(canvas)
        thumbnailCache.set(cacheKey, bitmap)
      } catch {
        // createImageBitmap 非対応環境は無視（キャッシュなしで動作）
      }
    } catch {
      // cancelled – 無視
    }
  }, [pdfDoc, pageNumber, width])

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
