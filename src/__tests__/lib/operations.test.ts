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

// Helper to create a PDF for testing
async function createTestPdf(pageCount: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792]) // Letter size
  }
  const bytes = await doc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe("splitByPageRanges", () => {
  it("splits by a single range", async () => {
    const data = await createTestPdf(5)
    const results = await splitByPageRanges(data, [
      { label: "part1", pages: [0, 1, 2] },
    ])
    expect(results).toHaveLength(1)
    expect(results[0].label).toBe("part1")

    // Verify the split PDF result
    const splitDoc = await PDFDocument.load(results[0].data)
    expect(splitDoc.getPageCount()).toBe(3)
  })

  it("splits by multiple ranges", async () => {
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

  it("returns an empty array for empty ranges", async () => {
    const data = await createTestPdf(3)
    const results = await splitByPageRanges(data, [])
    expect(results).toEqual([])
  })
})

describe("createPdfWithPageOrder", () => {
  it("generates a PDF with the specified page order", async () => {
    const data = await createTestPdf(5)
    const result = await createPdfWithPageOrder(data, [4, 3, 2, 1, 0])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(5)
  })

  it("extracts only a subset of pages", async () => {
    const data = await createTestPdf(10)
    const result = await createPdfWithPageOrder(data, [0, 5, 9])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(3)
  })

  it("allows including the same page multiple times", async () => {
    const data = await createTestPdf(3)
    const result = await createPdfWithPageOrder(data, [0, 0, 1, 1, 2, 2])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(6)
  })
})

describe("updatePdfMetadata", () => {
  it("updates title and author", async () => {
    const data = await createTestPdf(1)
    const result = await updatePdfMetadata(data, {
      title: "Test Title",
      author: "Test Author",
    })
    const doc = await PDFDocument.load(result)
    expect(doc.getTitle()).toBe("Test Title")
    expect(doc.getAuthor()).toBe("Test Author")
  })

  it("updates all metadata fields", async () => {
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
    // pdf-lib's setKeywords saves it as a space-separated string from a comma-separated one
    expect(doc.getKeywords()).toBe("key1 key2 key3")
    expect(doc.getCreator()).toBe("Creator App")
    // pdf-lib automatically overwrites Producer during save()
    expect(doc.getProducer()).toContain("pdf-lib")
  })

  it("does not update undefined fields", async () => {
    const data = await createTestPdf(1)
    // Set title first
    const withTitle = await updatePdfMetadata(data, { title: "Original" })
    // Update only author
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
  it("applies outlines to the PDF and returns a valid PDF", async () => {
    const data = await createTestPdf(5)
    const outline: OutlineNode[] = [
      { title: "Chapter 1", pageIndex: 0, children: [] },
      { title: "Chapter 2", pageIndex: 3, children: [] },
    ]
    const result = await applyOutlinesToPdf(data, outline)
    // Verify it is a valid PDF
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(5)
  })

  it("can apply empty outlines", async () => {
    const data = await createTestPdf(3)
    const result = await applyOutlinesToPdf(data, [])
    const doc = await PDFDocument.load(result)
    expect(doc.getPageCount()).toBe(3)
  })

  it("can apply nested outlines", async () => {
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
  it("merges two PDFs", async () => {
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

  it("correctly adjusts outline offsets during merging", async () => {
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
    // File 2's outline offset is adjusted by +3
    expect(result.outline[0].pageIndex).toBe(0) // file1 starts at 0
    expect(result.outline[1].pageIndex).toBe(3) // file2 starts at 3
    expect(result.outline[1].children[0].pageIndex).toBe(3)
  })

  it("merges with customized pageOrder", async () => {
    const data = await createTestPdf(5)
    const result = await mergePdfs([
      { name: "a.pdf", data: data, outline: [], pageOrder: [0, 2, 4] },
    ])
    const doc = await PDFDocument.load(result.data)
    expect(doc.getPageCount()).toBe(3)
  })
})
