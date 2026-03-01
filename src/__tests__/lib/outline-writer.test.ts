import { describe, it, expect } from "vitest"
import { PDFDocument, PDFName } from "pdf-lib"
import { writeOutlinesToPdf } from "@/lib/pdf/outline-writer"
import type { OutlineNode } from "@/lib/pdf/types"

async function createTestPdf(pageCount: number): Promise<PDFDocument> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792])
  }
  return doc
}

describe("writeOutlinesToPdf", () => {
  it("空のしおりで Outlines エントリを削除する", async () => {
    const doc = await createTestPdf(3)
    // まず書き込んでから削除
    writeOutlinesToPdf(doc, [
      { title: "Test", pageIndex: 0, children: [] },
    ])
    expect(doc.catalog.has(PDFName.of("Outlines"))).toBe(true)

    writeOutlinesToPdf(doc, [])
    expect(doc.catalog.has(PDFName.of("Outlines"))).toBe(false)
  })

  it("フラットなしおりを書き込む", async () => {
    const doc = await createTestPdf(5)
    const outline: OutlineNode[] = [
      { title: "First", pageIndex: 0, children: [] },
      { title: "Second", pageIndex: 2, children: [] },
      { title: "Third", pageIndex: 4, children: [] },
    ]
    writeOutlinesToPdf(doc, outline)
    expect(doc.catalog.has(PDFName.of("Outlines"))).toBe(true)

    // PDFを保存・再読み込みして有効であることを確認
    const data = await doc.save()
    const reloaded = await PDFDocument.load(data)
    expect(reloaded.getPageCount()).toBe(5)
  })

  it("ネストしたしおりを書き込む", async () => {
    const doc = await createTestPdf(10)
    const outline: OutlineNode[] = [
      {
        title: "Part 1",
        pageIndex: 0,
        children: [
          { title: "Chapter 1", pageIndex: 0, children: [] },
          {
            title: "Chapter 2",
            pageIndex: 3,
            children: [
              { title: "Section 2.1", pageIndex: 3, children: [] },
              { title: "Section 2.2", pageIndex: 5, children: [] },
            ],
          },
        ],
      },
      {
        title: "Part 2",
        pageIndex: 7,
        children: [],
      },
    ]
    writeOutlinesToPdf(doc, outline)

    const data = await doc.save()
    const reloaded = await PDFDocument.load(data)
    expect(reloaded.getPageCount()).toBe(10)
  })

  it("pageIndex が範囲外の場合はクランプされる", async () => {
    const doc = await createTestPdf(3)
    const outline: OutlineNode[] = [
      { title: "Over", pageIndex: 100, children: [] },
      { title: "Under", pageIndex: -5, children: [] },
    ]
    // エラーを投げずに実行できること
    writeOutlinesToPdf(doc, outline)
    const data = await doc.save()
    const reloaded = await PDFDocument.load(data)
    expect(reloaded.getPageCount()).toBe(3)
  })
})
