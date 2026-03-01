import { PDFDocument } from "pdf-lib"
import type { OutlineNode, SplitResult } from "./types"
import { writeOutlinesToPdf } from "./outline-writer"

// ---------- 分割 ----------

/**
 * ページ範囲指定でPDFを分割する
 */
export async function splitByPageRanges(
  data: ArrayBuffer,
  ranges: { label: string; pages: number[] }[]
): Promise<SplitResult[]> {
  const srcDoc = await PDFDocument.load(data)
  const results: SplitResult[] = []

  for (const range of ranges) {
    const newDoc = await PDFDocument.create()
    const copiedPages = await newDoc.copyPages(srcDoc, range.pages)
    for (const page of copiedPages) newDoc.addPage(page)
    results.push({ label: range.label, data: await newDoc.save() })
  }
  return results
}

/**
 * しおりの階層レベルに基づいてPDFを章ごとに分割する
 */
export async function splitByOutline(
  data: ArrayBuffer,
  outline: OutlineNode[],
  totalPages: number,
  level: number = 0
): Promise<SplitResult[]> {
  if (outline.length === 0) return []

  const targetNodes = level === 0 ? outline : getNodesAtLevel(outline, level)
  if (targetNodes.length === 0) return []

  const ranges: { label: string; pages: number[] }[] = []
  for (let i = 0; i < targetNodes.length; i++) {
    const startPage = targetNodes[i].pageIndex
    const endPage =
      i < targetNodes.length - 1
        ? targetNodes[i + 1].pageIndex - 1
        : totalPages - 1
    const pages: number[] = []
    for (let p = startPage; p <= endPage; p++) pages.push(p)
    ranges.push({ label: sanitizeFilename(targetNodes[i].title), pages })
  }
  return splitByPageRanges(data, ranges)
}

function getNodesAtLevel(
  nodes: OutlineNode[],
  targetLevel: number,
  currentLevel: number = 0
): OutlineNode[] {
  if (currentLevel === targetLevel) return nodes
  return nodes.flatMap((n) =>
    getNodesAtLevel(n.children, targetLevel, currentLevel + 1)
  )
}

// ---------- 結合 ----------

/**
 * 複数PDFを結合し、しおりのページオフセットを自動調整する
 * pageOrder が指定されている場合はそのページ順序を適用してから結合する
 */
export async function mergePdfs(
  files: { name: string; data: ArrayBuffer; outline: OutlineNode[]; pageOrder?: number[] }[]
): Promise<{ data: Uint8Array; outline: OutlineNode[] }> {
  const mergedDoc = await PDFDocument.create()
  const mergedOutline: OutlineNode[] = []
  let pageOffset = 0

  for (const file of files) {
    const srcDoc = await PDFDocument.load(file.data)
    const indices = file.pageOrder ?? srcDoc.getPageIndices()
    const copiedPages = await mergedDoc.copyPages(srcDoc, indices)
    for (const page of copiedPages) mergedDoc.addPage(page)

    // pageOrder に基づいてアウトラインのページインデックスを再マッピング
    const pageMapping = new Map<number, number>()
    indices.forEach((origIdx, newIdx) => {
      pageMapping.set(origIdx, newIdx)
    })
    const remappedOutline = remapOutlinePageIndices(file.outline, pageMapping, indices.length)
    const adjusted = adjustOutlinePageIndices(remappedOutline, pageOffset)

    mergedOutline.push({
      title: file.name.replace(/\.pdf$/i, ""),
      pageIndex: pageOffset,
      children: adjusted,
    })
    pageOffset += indices.length
  }

  writeOutlinesToPdf(mergedDoc, mergedOutline)
  return { data: await mergedDoc.save(), outline: mergedOutline }
}

/**
 * ページ順序の変更に伴い、アウトラインのpageIndexを再マッピングする
 */
function remapOutlinePageIndices(
  nodes: OutlineNode[],
  pageMapping: Map<number, number>,
  totalPages: number
): OutlineNode[] {
  return nodes
    .filter((n) => pageMapping.has(n.pageIndex))
    .map((n) => ({
      ...n,
      pageIndex: pageMapping.get(n.pageIndex) ?? 0,
      children: remapOutlinePageIndices(n.children, pageMapping, totalPages),
    }))
}

function adjustOutlinePageIndices(
  nodes: OutlineNode[],
  offset: number
): OutlineNode[] {
  return nodes.map((n) => ({
    ...n,
    pageIndex: n.pageIndex + offset,
    children: adjustOutlinePageIndices(n.children, offset),
  }))
}

// ---------- ページ操作 ----------

/**
 * 指定した順序でページを並び替えた新しいPDFを生成する
 */
export async function createPdfWithPageOrder(
  data: ArrayBuffer,
  pageOrder: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(data)
  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(srcDoc, pageOrder)
  for (const page of copiedPages) newDoc.addPage(page)
  return newDoc.save()
}

// ---------- メタデータ ----------

/**
 * PDFのメタデータを更新する
 */
export async function updatePdfMetadata(
  data: ArrayBuffer,
  metadata: {
    title?: string
    author?: string
    subject?: string
    keywords?: string
    creator?: string
    producer?: string
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(data)
  if (metadata.title !== undefined) pdfDoc.setTitle(metadata.title)
  if (metadata.author !== undefined) pdfDoc.setAuthor(metadata.author)
  if (metadata.subject !== undefined) pdfDoc.setSubject(metadata.subject)
  if (metadata.keywords !== undefined)
    pdfDoc.setKeywords(
      metadata.keywords.split(",").map((k) => k.trim())
    )
  if (metadata.creator !== undefined) pdfDoc.setCreator(metadata.creator)
  if (metadata.producer !== undefined) pdfDoc.setProducer(metadata.producer)
  return pdfDoc.save()
}

// ---------- しおり適用 ----------

/**
 * しおりツリーをPDFに適用する
 */
export async function applyOutlinesToPdf(
  data: ArrayBuffer,
  outline: OutlineNode[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(data)
  writeOutlinesToPdf(pdfDoc, outline)
  return pdfDoc.save()
}

// ---------- ヘルパー ----------

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "untitled"
}
