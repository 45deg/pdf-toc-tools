import { getDocument } from "pdfjs-dist"
import type { OutlineNode, PdfMetadata } from "./types"
import { setupPdfWorker, pdfjsDocumentOptions } from "./setup"

setupPdfWorker()

export interface ParseResult {
  pageCount: number
  outline: OutlineNode[]
  metadata: PdfMetadata
}

/**
 * Parse PDF file to extract page count, outline, and metadata.
 */
export async function parsePdf(data: ArrayBuffer): Promise<ParseResult> {
  // pdfjs-dist transfers/detaches the passed ArrayBuffer internally, so we pass a copy.
  const pdf = await getDocument({
    data: new Uint8Array(data.slice(0)),
    ...pdfjsDocumentOptions,
  }).promise

  // Recursive parsing of Outline
  async function processItems(items: any[]): Promise<OutlineNode[]> {
    const result: OutlineNode[] = []
    for (const item of items) {
      let pageIndex = 0
      try {
        if (typeof item.dest === "string") {
          const dest = await pdf.getDestination(item.dest)
          if (dest) pageIndex = await pdf.getPageIndex(dest[0])
        } else if (Array.isArray(item.dest) && item.dest.length > 0) {
          pageIndex = await pdf.getPageIndex(item.dest[0])
        }
      } catch {
        /* Default to page 0 if reference cannot be resolved */
      }
      result.push({
        title: item.title || "Untitled",
        pageIndex,
        children:
          item.items?.length > 0 ? await processItems(item.items) : [],
      })
    }
    return result
  }

  // Get outline
  let outline: OutlineNode[] = []
  try {
    const raw = await pdf.getOutline()
    if (raw) outline = await processItems(raw)
  } catch {
    /* If no outline is found */
  }

  // Get metadata
  let info: Record<string, string> = {}
  try {
    const meta = await pdf.getMetadata()
    info = (meta.info ?? {}) as Record<string, string>
  } catch {
    /* If no metadata is found */
  }

  const metadata: PdfMetadata = {
    title: info.Title ?? "",
    author: info.Author ?? "",
    subject: info.Subject ?? "",
    keywords: info.Keywords ?? "",
    creator: info.Creator ?? "",
    producer: info.Producer ?? "",
    creationDate: info.CreationDate ?? "",
    modificationDate: info.ModDate ?? "",
  }

  const pageCount = pdf.numPages
  pdf.destroy()

  return { pageCount, outline, metadata }
}
