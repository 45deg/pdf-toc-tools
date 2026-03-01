import * as pdfjsLib from "pdfjs-dist"

let initialized = false

const version = pdfjsLib.version
const cdnBase = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}`

/** pdfjs-dist の getDocument に渡す共通オプション */
export const pdfjsDocumentOptions = {
  cMapUrl: `${cdnBase}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${cdnBase}/standard_fonts/`,
} as const

export function setupPdfWorker(): void {
  if (initialized) return
  initialized = true

  const workerSrc = `${cdnBase}/build/pdf.worker.min.mjs`
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
}
