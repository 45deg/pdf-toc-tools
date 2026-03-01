import { PDFName, PDFHexString, PDFNumber, PDFNull } from "pdf-lib"
import type { PDFDocument } from "pdf-lib"
import type { OutlineNode } from "./types"

/**
 * pdf-lib ドキュメントにしおり（Outlines）ツリーを書き込む。
 * 既存のアウトラインは上書きされる。
 */
export function writeOutlinesToPdf(
  pdfDoc: PDFDocument,
  outlines: OutlineNode[]
): void {
  if (outlines.length === 0) {
    pdfDoc.catalog.delete(PDFName.of("Outlines"))
    return
  }

  const ctx = pdfDoc.context
  const pages = pdfDoc.getPages()

  function makeDest(pageIndex: number) {
    const idx = Math.max(0, Math.min(pageIndex, pages.length - 1))
    return ctx.obj([
      pages[idx].ref,
      PDFName.of("XYZ"),
      PDFNull,
      PDFNull,
      PDFNull,
    ])
  }

  type Ref = ReturnType<typeof ctx.register>

  function buildLevel(
    items: OutlineNode[],
    parentRef: Ref
  ): { first: Ref; last: Ref; count: number } {
    const refs: Ref[] = []
    const counts: number[] = []

    for (const item of items) {
      // 空の辞書を作成し、先に参照を確保する（子の Parent 設定に必要）
      const dict: any = ctx.obj({})
      const ref = ctx.register(dict)
      refs.push(ref)

      dict.set(PDFName.of("Title"), PDFHexString.fromText(item.title))
      dict.set(PDFName.of("Parent"), parentRef)
      dict.set(PDFName.of("Dest"), makeDest(item.pageIndex))

      let subtreeCount = 0
      if (item.children.length > 0) {
        const sub = buildLevel(item.children, ref)
        dict.set(PDFName.of("First"), sub.first)
        dict.set(PDFName.of("Last"), sub.last)
        dict.set(PDFName.of("Count"), PDFNumber.of(sub.count))
        subtreeCount = sub.count
      }
      counts.push(1 + subtreeCount)
    }

    // 兄弟間の Prev / Next リンクを設定
    for (let i = 0; i < refs.length; i++) {
      const d: any = ctx.lookup(refs[i])
      if (i > 0) d.set(PDFName.of("Prev"), refs[i - 1])
      if (i < refs.length - 1) d.set(PDFName.of("Next"), refs[i + 1])
    }

    return {
      first: refs[0],
      last: refs[refs.length - 1],
      count: counts.reduce((a, b) => a + b, 0),
    }
  }

  // ルート Outlines 辞書
  const rootDict: any = ctx.obj({})
  const rootRef = ctx.register(rootDict)
  const { first, last, count } = buildLevel(outlines, rootRef)

  rootDict.set(PDFName.of("Type"), PDFName.of("Outlines"))
  rootDict.set(PDFName.of("First"), first)
  rootDict.set(PDFName.of("Last"), last)
  rootDict.set(PDFName.of("Count"), PDFNumber.of(count))

  pdfDoc.catalog.set(PDFName.of("Outlines"), rootRef)
}
