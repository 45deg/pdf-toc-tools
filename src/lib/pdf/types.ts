/** PDF Outline (Bookmark) node */
export interface OutlineNode {
  title: string
  pageIndex: number // 0-based
  children: OutlineNode[]
}

/** PDF Metadata */
export interface PdfMetadata {
  title: string
  author: string
  subject: string
  keywords: string
  creator: string
  producer: string
  creationDate: string
  modificationDate: string
}

/** Loaded PDF file */
export interface LoadedPdf {
  id: string
  name: string
  data: ArrayBuffer
  originalPageCount: number
  outline: OutlineNode[]
  metadata: PdfMetadata
  /** Current active page order (0-indexed original page index) */
  pageOrder: number[]
}

/** Split result */
export interface SplitResult {
  label: string
  data: Uint8Array
}

/** View mode */
export type ViewMode = "pages" | "toc" | "split" | "metadata"

/** Page filter based on outline */
export interface OutlineFilter {
  /** Start page of the filter (0-indexed, inclusive) */
  startPage: number
  /** End page of the filter (0-indexed, inclusive) */
  endPage: number
  /** Label of the selected outline node */
  label: string
}

/** Node for Explorer view */
export interface ExplorerNode {
  type: "folder" | "page"
  label: string
  /** For page nodes (0-indexed) */
  pageIndex?: number
  children?: ExplorerNode[]
  /** Start page for folder nodes (0-indexed, inclusive) */
  startPage?: number
  /** End page for folder nodes (0-indexed, inclusive) */
  endPage?: number
}
