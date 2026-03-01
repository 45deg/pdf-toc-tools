import type { OutlineNode } from "./types"

// ===== Export =====

/** Exports outline to JSON string */
export function exportOutlineAsJson(outline: OutlineNode[]): string {
  return JSON.stringify(outline, null, 2)
}

/** Exports outline to CSV string (flattened) */
export function exportOutlineAsCsv(outline: OutlineNode[]): string {
  const rows: string[] = ["level,title,page"]
  function flatten(nodes: OutlineNode[], level: number) {
    for (const node of nodes) {
      const escaped = `"${node.title.replace(/"/g, '""')}"`
      rows.push(`${level},${escaped},${node.pageIndex + 1}`)
      flatten(node.children, level + 1)
    }
  }
  flatten(outline, 0)
  return rows.join("\n")
}

/** Exports outline to Markdown format */
export function exportOutlineAsMarkdown(outline: OutlineNode[]): string {
  const lines: string[] = []
  function walk(nodes: OutlineNode[], depth: number) {
    for (const node of nodes) {
      const indent = "  ".repeat(depth)
      lines.push(`${indent}- ${node.title} (p.${node.pageIndex + 1})`)
      walk(node.children, depth + 1)
    }
  }
  walk(outline, 0)
  return lines.join("\n")
}

// ===== Import =====

/** Imports outline from JSON string */
export function importOutlineFromJson(json: string): OutlineNode[] {
  const parsed = JSON.parse(json)
  return validateOutlineNodes(parsed)
}

/** Imports outline from CSV string */
export function importOutlineFromCsv(csv: string): OutlineNode[] {
  const lines = csv
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  // Skip header row
  const dataLines =
    lines[0]?.toLowerCase().startsWith("level") ? lines.slice(1) : lines

  interface FlatItem {
    level: number
    title: string
    pageIndex: number
  }

  const items: FlatItem[] = dataLines.map((line) => {
    const match = line.match(/^(\d+),(".*?"|[^,]*),(\d+)$/)
    if (!match) throw new Error(`Invalid CSV line: ${line}`)
    let title = match[2]
    if (title.startsWith('"') && title.endsWith('"')) {
      title = title.slice(1, -1).replace(/""/g, '"')
    }
    return {
      level: parseInt(match[1], 10),
      title,
      pageIndex: parseInt(match[3], 10) - 1, // CSV is 1-indexed
    }
  })

  return buildTreeFromFlat(items)
}

function buildTreeFromFlat(
  items: { level: number; title: string; pageIndex: number }[]
): OutlineNode[] {
  const root: OutlineNode[] = []
  const stack: { node: OutlineNode; level: number }[] = []

  for (const item of items) {
    const node: OutlineNode = {
      title: item.title,
      pageIndex: item.pageIndex,
      children: [],
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].node.children.push(node)
    }

    stack.push({ node, level: item.level })
  }

  return root
}

function validateOutlineNodes(data: unknown): OutlineNode[] {
  if (!Array.isArray(data)) throw new Error("Outline must be an array")
  return data.map((item: any) => ({
    title: String(item.title ?? "Untitled"),
    pageIndex: typeof item.pageIndex === "number" ? item.pageIndex : 0,
    children: Array.isArray(item.children)
      ? validateOutlineNodes(item.children)
      : [],
  }))
}
