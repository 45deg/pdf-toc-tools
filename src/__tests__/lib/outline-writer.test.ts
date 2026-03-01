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
  it("removes Outlines entry with empty outlines", async () => {
    const doc = await createTestPdf(3)
    // Write first then remove
    writeOutlinesToPdf(doc, [
      { title: "Test", pageIndex: 0, children: [] },
    ])
    expect(doc.catalog.has(PDFName.of("Outlines"))).toBe(true)

    writeOutlinesToPdf(doc, [])
    expect(doc.catalog.has(PDFName.of("Outlines"))).toBe(false)
  })

  it("writes flat outlines", async () => {
    const doc = await createTestPdf(5)
    const outline: OutlineNode[] = [
      { title: "First", pageIndex: 0, children: [] },
      { title: "Second", pageIndex: 2, children: [] },
      { title: "Third", pageIndex: 4, children: [] },
    ]
    writeOutlinesToPdf(doc, outline)
    expect(doc.catalog.has(PDFName.of("Outlines"))).toBe(true)

    // Save/reload PDF to verify it remains valid
    const data = await doc.save()
    const reloaded = await PDFDocument.load(data)
    expect(reloaded.getPageCount()).toBe(5)
  })

  it("writes nested outlines", async () => {
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

  it("clamps pageIndex if it is out of range", async () => {
    const doc = await createTestPdf(3)
    const outline: OutlineNode[] = [
      { title: "Over", pageIndex: 100, children: [] },
      { title: "Under", pageIndex: -5, children: [] },
    ]
    // Should execute without throwing errors
    writeOutlinesToPdf(doc, outline)
    const data = await doc.save()
    const reloaded = await PDFDocument.load(data)
    expect(reloaded.getPageCount()).toBe(3)
  })
})
