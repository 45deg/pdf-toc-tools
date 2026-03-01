import { describe, it, expect } from "vitest"
import { buildExplorerTree } from "@/lib/pdf/explorer"
import type { OutlineNode } from "@/lib/pdf/types"

const sampleOutline: OutlineNode[] = [
  {
    title: "Chapter 1",
    pageIndex: 0,
    children: [
      { title: "Section 1.1", pageIndex: 0, children: [] },
      { title: "Section 1.2", pageIndex: 2, children: [] },
    ],
  },
  {
    title: "Chapter 2",
    pageIndex: 4,
    children: [],
  },
]

describe("buildExplorerTree", () => {
  it("しおりが無い場合はフラットなページリストを返す", () => {
    const result = buildExplorerTree([], 5, [0, 1, 2, 3, 4])
    expect(result).toHaveLength(5)
    expect(result[0]).toEqual({ type: "page", label: "Page 1", pageIndex: 0 })
    expect(result[4]).toEqual({ type: "page", label: "Page 5", pageIndex: 4 })
  })

  it("totalPages が 0 の場合は空配列を返す", () => {
    const result = buildExplorerTree(sampleOutline, 0, [])
    expect(result).toEqual([])
  })

  it("しおりからフォルダ構造を構築する", () => {
    const result = buildExplorerTree(sampleOutline, 6, [0, 1, 2, 3, 4, 5])
    expect(result).toHaveLength(2)

    // Chapter 1 フォルダ
    const ch1 = result[0]
    expect(ch1.type).toBe("folder")
    expect(ch1.label).toBe("Chapter 1")
    expect(ch1.startPage).toBe(0)
    expect(ch1.endPage).toBe(3)
    expect(ch1.children).toHaveLength(2)

    // Chapter 2 フォルダ（子しおりなし→ページ直接列挙）
    const ch2 = result[1]
    expect(ch2.type).toBe("folder")
    expect(ch2.label).toBe("Chapter 2")
    expect(ch2.startPage).toBe(4)
    expect(ch2.endPage).toBe(5)
    expect(ch2.children).toHaveLength(2)
    expect(ch2.children![0].type).toBe("page")
  })

  it("子しおりが無いフォルダにはページが直接含まれる", () => {
    const outline: OutlineNode[] = [
      { title: "Only Chapter", pageIndex: 0, children: [] },
    ]
    const result = buildExplorerTree(outline, 3, [0, 1, 2])
    expect(result).toHaveLength(1)
    const folder = result[0]
    expect(folder.type).toBe("folder")
    expect(folder.children).toHaveLength(3)
    expect(folder.children!.every((c) => c.type === "page")).toBe(true)
  })

  it("pageOrder がシャッフルされていても正しく処理する", () => {
    const outline: OutlineNode[] = [
      { title: "A", pageIndex: 0, children: [] },
      { title: "B", pageIndex: 3, children: [] },
    ]
    // ページ順序を入れ替え
    const result = buildExplorerTree(outline, 6, [5, 4, 3, 2, 1, 0])

    expect(result).toHaveLength(2)
    // フォルダAの中に originalPageIndex 0,1,2 のページが含まれる
    const folderA = result[0]
    expect(folderA.children!.length).toBeGreaterThan(0)
  })

  it("ネストしたしおりで子フォルダが正しく構築される", () => {
    const result = buildExplorerTree(sampleOutline, 6, [0, 1, 2, 3, 4, 5])
    const ch1 = result[0]
    expect(ch1.children).toHaveLength(2)

    // Section 1.1 (pageIndex 0 ~ 1)
    const sec11 = ch1.children![0]
    expect(sec11.type).toBe("folder")
    expect(sec11.label).toBe("Section 1.1")

    // Section 1.2 (pageIndex 2 ~ 3)
    const sec12 = ch1.children![1]
    expect(sec12.type).toBe("folder")
    expect(sec12.label).toBe("Section 1.2")
  })
})
