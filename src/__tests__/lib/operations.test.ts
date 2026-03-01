import { describe, it, expect } from "vitest"
import { PDFDocument } from "pdf-lib"
import {
  splitByPageRanges,
  createPdfWithPageOrder,
  updatePdfMetadata,
  applyOutlinesToPdf,
  mergePdfs,
} from "@/lib/pdf/operations"
import type { OutlineNode } from "@/lib/pdf/types"

// テスト用のPDFを作成するヘルパー
async function createTestPdf(pageCount: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792]) // Letter size
  }
  const bytes = await doc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe("splitByPageRanges", () => {
  it("1つの範囲で分割する", async () => {
    const data = await createTestPdf(5)
    const results = await splitByPageRanges(data, [
      { label: "part1", pages: [0, 1, 2] },
    ])
    expect(results).toHaveLength(1)
    expect(results[0].label).toBe("part1")

    // 分割結果のPDFを検証
    const splitDoc = await PDFDocument.load(results[0].data)
    expect(splitDoc.getPageCount()).toBe(3)
  })

  it("複数の範囲で分割する", async () => {
    const data = await createTestPdf(10)
    const results = await splitByPageRanges(data, [
      { label: "first", pages: [0, 1, 2] },
      { label: "second", pages: [5, 6, 7, 8, 9] },
    ])
    expect(results).toHaveLength(2)
    expect(results[0].label).toBe("first")
    expect(results[1].label).toBe("second")

    const doc1 = await PDFDocument.load(results[0].data)
    const doc2 = await PDFDocument.load(results[1].data)
    expect(doc1.getPageCount()).toBe(3)
    expect(doc2.getPageCount()).toBe(5)
  })

  it("空の ranges で空配列を返す", async () => {
    const data = await createTestPdf(3)
    const results = await splitByPageRanges(data, [])
    expect(results).toEqual([])
  })
})

describe("createPdfWithPageOrder", () => {
  it("ページ順序通りのPDFを生成する", async () => {
    const data = await createTestPdf(5)
    const result = await createPdfWithPageOrder(data, [4, 3, 2, 1, 0])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(5)
  })

  it("一部のページのみを抽出する", async () => {
    const data = await createTestPdf(10)
    const result = await createPdfWithPageOrder(data, [0, 5, 9])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(3)
  })

  it("同じページを複数回含めることができる", async () => {
    const data = await createTestPdf(3)
    const result = await createPdfWithPageOrder(data, [0, 0, 1, 1, 2, 2])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(6)
  })
})

describe("updatePdfMetadata", () => {
  it("タイトルと著者を更新する", async () => {
    const data = await createTestPdf(1)
    const result = await updatePdfMetadata(data, {
      title: "Test Title",
      author: "Test Author",
    })
    const doc = await PDFDocument.load(result)
    expect(doc.getTitle()).toBe("Test Title")
    expect(doc.getAuthor()).toBe("Test Author")
  })

  it("すべてのメタデータフィールドを更新する", async () => {
    const data = await createTestPdf(1)
    const result = await updatePdfMetadata(data, {
      title: "My PDF",
      author: "Author",
      subject: "Subject",
      keywords: "key1, key2, key3",
      creator: "Creator App",
      producer: "Producer App",
    })
    const doc = await PDFDocument.load(result)
    expect(doc.getTitle()).toBe("My PDF")
    expect(doc.getAuthor()).toBe("Author")
    expect(doc.getSubject()).toBe("Subject")
    // pdf-lib の setKeywords はカンマ区切り→配列にしてスペース区切りで保存する
    expect(doc.getKeywords()).toBe("key1 key2 key3")
    expect(doc.getCreator()).toBe("Creator App")
    // pdf-lib は save() 時に Producer を自動的に上書きする
    expect(doc.getProducer()).toContain("pdf-lib")
  })

  it("undefined のフィールドは更新しない", async () => {
    const data = await createTestPdf(1)
    // まずタイトルを設定
    const withTitle = await updatePdfMetadata(data, { title: "Original" })
    // 著者のみ更新
    const result = await updatePdfMetadata(
      withTitle.buffer.slice(withTitle.byteOffset, withTitle.byteOffset + withTitle.byteLength),
      { author: "New Author" }
    )
    const doc = await PDFDocument.load(result)
    expect(doc.getTitle()).toBe("Original")
    expect(doc.getAuthor()).toBe("New Author")
  })
})

describe("applyOutlinesToPdf", () => {
  it("しおりをPDFに適用して有効なPDFを返す", async () => {
    const data = await createTestPdf(5)
    const outline: OutlineNode[] = [
      { title: "Chapter 1", pageIndex: 0, children: [] },
      { title: "Chapter 2", pageIndex: 3, children: [] },
    ]
    const result = await applyOutlinesToPdf(data, outline)
    // 有効なPDFであることを確認
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(5)
  })

  it("空のしおりを適用できる", async () => {
    const data = await createTestPdf(3)
    const result = await applyOutlinesToPdf(data, [])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(3)
  })

  it("ネストしたしおりを適用できる", async () => {
    const data = await createTestPdf(10)
    const outline: OutlineNode[] = [
      {
        title: "Part 1",
        pageIndex: 0,
        children: [
          { title: "Chapter 1", pageIndex: 0, children: [] },
          { title: "Chapter 2", pageIndex: 3, children: [] },
        ],
      },
      {
        title: "Part 2",
        pageIndex: 5,
        children: [],
      },
    ]
    const result = await applyOutlinesToPdf(data, outline)
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(10)
  })
})

describe("mergePdfs", () => {
  it("2つのPDFを結合する", async () => {
    const data1 = await createTestPdf(3)
    const data2 = await createTestPdf(2)
    const result = await mergePdfs([
      { name: "file1.pdf", data: data1, outline: [] },
      { name: "file2.pdf", data: data2, outline: [] },
    ])
    const doc = await PDFDocument.load(result.data)
    expect(doc.getPageCount()).toBe(5)
    expect(result.outline).toHaveLength(2)
    expect(result.outline[0].title).toBe("file1")
    expect(result.outline[1].title).toBe("file2")
  })

  it("結合時にしおりのオフセットが正しく調整される", async () => {
    const data1 = await createTestPdf(3)
    const data2 = await createTestPdf(5)
    const outline1: OutlineNode[] = [
      { title: "Ch1", pageIndex: 0, children: [] },
    ]
    const outline2: OutlineNode[] = [
      { title: "Ch2", pageIndex: 0, children: [] },
    ]
    const result = await mergePdfs([
      { name: "a.pdf", data: data1, outline: outline1 },
      { name: "b.pdf", data: data2, outline: outline2 },
    ])
    // ファイル2のしおりのオフセットが+3されている
    expect(result.outline[0].pageIndex).toBe(0) // file1 starts at 0
    expect(result.outline[1].pageIndex).toBe(3) // file2 starts at 3
    expect(result.outline[1].children[0].pageIndex).toBe(3)
  })

  it("pageOrder を指定して結合する", async () => {
    const data = await createTestPdf(5)
    const result = await mergePdfs([
      { name: "a.pdf", data: data, outline: [], pageOrder: [0, 2, 4] },
    ])
    const doc = await PDFDocument.load(result.data)
    expect(doc.getPageCount()).toBe(3)
  })
})
