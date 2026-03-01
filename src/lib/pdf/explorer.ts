import type { OutlineNode, ExplorerNode } from "./types"

/**
 * しおりツリーからExplorer表示用のフォルダ・ファイル構造を構築する。
 * 各しおりノードをフォルダ、その中のページをファイルとして表現する。
 */
export function buildExplorerTree(
  outline: OutlineNode[],
  totalPages: number,
  pageOrder: number[]
): ExplorerNode[] {
  if (outline.length === 0 || totalPages === 0) {
    // しおりが無い場合は全ページをフラットに表示
    return pageOrder.map((origIdx, i) => ({
      type: "page" as const,
      label: `Page ${i + 1}`,
      pageIndex: origIdx,
    }))
  }

  function processNodes(
    nodes: OutlineNode[],
    rangeEnd: number
  ): ExplorerNode[] {
    return nodes.map((node, i) => {
      const startPage = node.pageIndex
      const nextStart =
        i < nodes.length - 1 ? nodes[i + 1].pageIndex : rangeEnd + 1
      const endPage = Math.max(startPage, nextStart - 1)

      const folder: ExplorerNode = {
        type: "folder",
        label: node.title,
        startPage,
        endPage,
        children: [],
      }

      if (node.children.length > 0) {
        folder.children = processNodes(node.children, endPage)
      } else {
        // 子しおりが無い場合はページを直接列挙
        const pagesInRange = pageOrder.filter(
          (origIdx) => origIdx >= startPage && origIdx <= endPage
        )
        folder.children = pagesInRange.map((origIdx) => ({
          type: "page" as const,
          label: `Page ${origIdx + 1}`,
          pageIndex: origIdx,
        }))
      }
      return folder
    })
  }

  return processNodes(outline, totalPages - 1)
}
