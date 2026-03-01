import type { OutlineNode, ExplorerNode } from "./types"

/**
 * Builds a folder/file structure for explorer display from the bookmark tree.
 * Each bookmark node is represented as a folder, and the pages within it as files.
 */
export function buildExplorerTree(
  outline: OutlineNode[],
  totalPages: number,
  pageOrder: number[]
): ExplorerNode[] {
  if (outline.length === 0 || totalPages === 0) {
    // If there are no bookmarks, display all pages flat
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
        // If there are no child bookmarks, list the pages directly
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
