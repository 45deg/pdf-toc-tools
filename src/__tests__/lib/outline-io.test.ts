import { describe, it, expect } from "vitest"
import {
  exportOutlineAsJson,
  exportOutlineAsCsv,
  exportOutlineAsMarkdown,
  importOutlineFromJson,
  importOutlineFromCsv,
} from "@/lib/pdf/outline-io"
import type { OutlineNode } from "@/lib/pdf/types"

// テスト用のしおりデータ
const sampleOutline: OutlineNode[] = [
  {
    title: "Chapter 1",
    pageIndex: 0,
    children: [
      { title: "Section 1.1", pageIndex: 1, children: [] },
      { title: "Section 1.2", pageIndex: 3, children: [] },
    ],
  },
  {
    title: "Chapter 2",
    pageIndex: 5,
    children: [],
  },
]

const flatOutline: OutlineNode[] = [
  { title: "Intro", pageIndex: 0, children: [] },
  { title: "Body", pageIndex: 2, children: [] },
  { title: "Conclusion", pageIndex: 8, children: [] },
]

// ===== JSON エクスポート / インポート =====

describe("exportOutlineAsJson", () => {
  it("空の配列を正しくエクスポートする", () => {
    const result = exportOutlineAsJson([])
    expect(result).toBe("[]")
  })

  it("しおりツリーをJSON文字列にエクスポートする", () => {
    const result = exportOutlineAsJson(sampleOutline)
    const parsed = JSON.parse(result)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].title).toBe("Chapter 1")
    expect(parsed[0].children).toHaveLength(2)
    expect(parsed[1].pageIndex).toBe(5)
  })

  it("エクスポートしたJSONがフォーマット付き（indent=2）である", () => {
    const result = exportOutlineAsJson(flatOutline)
    expect(result).toContain("\n")
    expect(result).toContain("  ")
  })
})

describe("importOutlineFromJson", () => {
  it("有効なJSONからしおりをインポートする", () => {
    const json = exportOutlineAsJson(sampleOutline)
    const result = importOutlineFromJson(json)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe("Chapter 1")
    expect(result[0].children).toHaveLength(2)
  })

  it("不正なJSONでエラーを投げる", () => {
    expect(() => importOutlineFromJson("not json")).toThrow()
  })

  it("配列でないJSONでエラーを投げる", () => {
    expect(() => importOutlineFromJson('{"title":"x"}')).toThrow(
      "Outline must be an array"
    )
  })

  it("不足フィールドにデフォルト値を設定する", () => {
    const json = JSON.stringify([{ foo: "bar" }])
    const result = importOutlineFromJson(json)
    expect(result[0].title).toBe("Untitled")
    expect(result[0].pageIndex).toBe(0)
    expect(result[0].children).toEqual([])
  })

  it("ラウンドトリップ: エクスポート→インポートでデータが保持される", () => {
    const json = exportOutlineAsJson(sampleOutline)
    const imported = importOutlineFromJson(json)
    expect(imported).toEqual(sampleOutline)
  })
})

// ===== CSV エクスポート / インポート =====

describe("exportOutlineAsCsv", () => {
  it("空の配列でヘッダーのみを返す", () => {
    const result = exportOutlineAsCsv([])
    expect(result).toBe("level,title,page")
  })

  it("フラットなしおりをCSVにエクスポートする", () => {
    const result = exportOutlineAsCsv(flatOutline)
    const lines = result.split("\n")
    expect(lines[0]).toBe("level,title,page")
    expect(lines[1]).toBe('0,"Intro",1')
    expect(lines[2]).toBe('0,"Body",3')
    expect(lines[3]).toBe('0,"Conclusion",9')
  })

  it("ネストしたしおりをレベル付きでエクスポートする", () => {
    const result = exportOutlineAsCsv(sampleOutline)
    const lines = result.split("\n")
    expect(lines[0]).toBe("level,title,page")
    expect(lines[1]).toBe('0,"Chapter 1",1') // pageIndex 0 → page 1
    expect(lines[2]).toBe('1,"Section 1.1",2') // pageIndex 1 → page 2
    expect(lines[3]).toBe('1,"Section 1.2",4') // pageIndex 3 → page 4
    expect(lines[4]).toBe('0,"Chapter 2",6') // pageIndex 5 → page 6
  })

  it("タイトルにダブルクォートが含まれる場合にエスケープする", () => {
    const outline: OutlineNode[] = [
      { title: 'Say "Hello"', pageIndex: 0, children: [] },
    ]
    const result = exportOutlineAsCsv(outline)
    expect(result).toContain('"Say ""Hello"""')
  })
})

describe("importOutlineFromCsv", () => {
  it("CSVからフラットなしおりをインポートする", () => {
    const csv = "level,title,page\n0,Intro,1\n0,Body,3"
    const result = importOutlineFromCsv(csv)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe("Intro")
    expect(result[0].pageIndex).toBe(0) // 1-indexed → 0-indexed
    expect(result[1].title).toBe("Body")
    expect(result[1].pageIndex).toBe(2)
  })

  it("CSVからネストしたしおりをインポートする", () => {
    const csv = "level,title,page\n0,Chapter 1,1\n1,Section 1.1,2\n1,Section 1.2,4\n0,Chapter 2,6"
    const result = importOutlineFromCsv(csv)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe("Chapter 1")
    expect(result[0].children).toHaveLength(2)
    expect(result[0].children[0].title).toBe("Section 1.1")
    expect(result[1].title).toBe("Chapter 2")
    expect(result[1].children).toHaveLength(0)
  })

  it("ヘッダー無しCSVも処理できる", () => {
    const csv = "0,Intro,1\n0,Body,3"
    const result = importOutlineFromCsv(csv)
    expect(result).toHaveLength(2)
  })

  it("ダブルクォート付きタイトルを正しくパースする", () => {
    const csv = '0,"Say ""Hello""",1'
    const result = importOutlineFromCsv(csv)
    expect(result[0].title).toBe('Say "Hello"')
  })

  it("不正な行でエラーを投げる", () => {
    const csv = "level,title,page\nbadline"
    expect(() => importOutlineFromCsv(csv)).toThrow("Invalid CSV line")
  })

  it("ラウンドトリップ: CSV エクスポート→インポートでデータが保持される", () => {
    const csv = exportOutlineAsCsv(sampleOutline)
    const imported = importOutlineFromCsv(csv)
    expect(imported).toEqual(sampleOutline)
  })
})

// ===== Markdown エクスポート =====

describe("exportOutlineAsMarkdown", () => {
  it("空の配列で空文字を返す", () => {
    const result = exportOutlineAsMarkdown([])
    expect(result).toBe("")
  })

  it("フラットなしおりをMarkdownリストにエクスポートする", () => {
    const result = exportOutlineAsMarkdown(flatOutline)
    const lines = result.split("\n")
    expect(lines[0]).toBe("- Intro (p.1)")
    expect(lines[1]).toBe("- Body (p.3)")
    expect(lines[2]).toBe("- Conclusion (p.9)")
  })

  it("ネストしたしおりをインデント付きリストにエクスポートする", () => {
    const result = exportOutlineAsMarkdown(sampleOutline)
    const lines = result.split("\n")
    expect(lines[0]).toBe("- Chapter 1 (p.1)")
    expect(lines[1]).toBe("  - Section 1.1 (p.2)")
    expect(lines[2]).toBe("  - Section 1.2 (p.4)")
    expect(lines[3]).toBe("- Chapter 2 (p.6)")
  })
})
