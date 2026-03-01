/** PDFのしおり（Outline）ノード */
export interface OutlineNode {
  title: string
  pageIndex: number // 0-based
  children: OutlineNode[]
}

/** PDFのメタデータ */
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

/** 読み込み済みPDFファイル */
export interface LoadedPdf {
  id: string
  name: string
  data: ArrayBuffer
  originalPageCount: number
  outline: OutlineNode[]
  metadata: PdfMetadata
  /** 現在の有効ページ順序（0-indexed の元ページインデックス） */
  pageOrder: number[]
}

/** 分割結果 */
export interface SplitResult {
  label: string
  data: Uint8Array
}

/** ビューモード */
export type ViewMode = "pages" | "toc" | "split" | "metadata"

/** アウトラインによるページフィルタ */
export interface OutlineFilter {
  /** フィルタ対象の開始ページ（0-indexed, inclusive） */
  startPage: number
  /** フィルタ対象の終了ページ（0-indexed, inclusive） */
  endPage: number
  /** 選択されたアウトラインノードのタイトル */
  label: string
}

/** Explorer表示用ノード */
export interface ExplorerNode {
  type: "folder" | "page"
  label: string
  /** ページノードの場合（0-indexed） */
  pageIndex?: number
  children?: ExplorerNode[]
  /** フォルダノードの場合の開始ページ（0-indexed, inclusive） */
  startPage?: number
  /** フォルダノードの場合の終了ページ（0-indexed, inclusive） */
  endPage?: number
}
