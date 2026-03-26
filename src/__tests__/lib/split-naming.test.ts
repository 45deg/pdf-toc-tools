import { describe, it, expect } from "vitest"
import { buildSplitOutputPath, getHierarchyDigitsByDepth } from "@/lib/pdf/split-naming"

describe("split-naming", () => {
  it("builds hierarchical filename and folder names with prefixed indexes", () => {
    const digits = getHierarchyDigitsByDepth([
      { pathSiblingCounts: [12, 15] },
      { pathSiblingCounts: [12, 15] },
    ])

    const result = buildSplitOutputPath({
      info: {
        title: "Section",
        pathTitles: ["Part", "Chapter", "Section"],
        pathIndices: [0, 0, 5],
        pathSiblingCounts: [12, 15, 20],
      },
      fallbackLabel: "fallback",
      selectedOrder: 0,
      selectedCount: 1,
      addNumberPrefix: true,
      useFolderHierarchy: true,
      canUseFolderHierarchy: true,
      hierarchyDigitsByDepth: [...digits, 2],
    })

    expect(result.label).toBe("01_01_06_Section")
    expect(result.zipPath).toBe("01_Part/01_Chapter/01_01_06_Section.pdf")
  })

  it("uses max sibling count digits by depth", () => {
    const digits = getHierarchyDigitsByDepth([
      { pathSiblingCounts: [9, 120] },
      { pathSiblingCounts: [12, 8] },
    ])
    expect(digits).toEqual([2, 3])
  })

  it("uses provided max-digit config for hierarchical indexes", () => {
    const result = buildSplitOutputPath({
      info: {
        title: "Leaf",
        pathTitles: ["Root", "Leaf"],
        pathIndices: [4, 10],
        pathSiblingCounts: [105, 1000],
      },
      fallbackLabel: "fallback",
      selectedOrder: 0,
      selectedCount: 1,
      addNumberPrefix: true,
      useFolderHierarchy: true,
      canUseFolderHierarchy: true,
      hierarchyDigitsByDepth: [3, 4],
    })

    expect(result.label).toBe("005_0011_Leaf")
    expect(result.zipPath).toBe("005_Root/005_0011_Leaf.pdf")
  })

  it("falls back to flat numbering when hierarchy mode is off", () => {
    const result = buildSplitOutputPath({
      info: {
        title: "Chapter",
        pathTitles: ["Part", "Chapter"],
        pathIndices: [0, 0],
        pathSiblingCounts: [10, 10],
      },
      fallbackLabel: "fallback",
      selectedOrder: 9,
      selectedCount: 120,
      addNumberPrefix: true,
      useFolderHierarchy: false,
      canUseFolderHierarchy: true,
    })

    expect(result.label).toBe("010_Chapter")
    expect(result.zipPath).toBeUndefined()
  })

  it("keeps hierarchy folder path without index when numbering option is off", () => {
    const result = buildSplitOutputPath({
      info: {
        title: "Section",
        pathTitles: ["Part", "Chapter", "Section"],
        pathIndices: [0, 0, 0],
        pathSiblingCounts: [3, 3, 3],
      },
      fallbackLabel: "fallback",
      selectedOrder: 0,
      selectedCount: 1,
      addNumberPrefix: false,
      useFolderHierarchy: true,
      canUseFolderHierarchy: true,
    })

    expect(result.label).toBe("Section")
    expect(result.zipPath).toBe("Part/Chapter/Section.pdf")
  })
})
