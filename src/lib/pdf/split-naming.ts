export interface SplitPathInfo {
  title: string
  pathTitles: string[]
  pathIndices: number[]
  pathSiblingCounts: number[]
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "untitled"
}

export function getHierarchyDigitsByDepth(
  infos: Array<Pick<SplitPathInfo, "pathSiblingCounts">>
): number[] {
  const maxSiblingsByDepth: number[] = []
  for (const info of infos) {
    info.pathSiblingCounts.forEach((siblings, depth) => {
      maxSiblingsByDepth[depth] = Math.max(maxSiblingsByDepth[depth] ?? 1, siblings)
    })
  }
  return maxSiblingsByDepth.map((siblings) =>
    Math.max(2, String(Math.max(1, siblings)).length)
  )
}

export function buildSplitOutputPath(params: {
  info?: SplitPathInfo
  fallbackLabel: string
  selectedOrder: number
  selectedCount: number
  addNumberPrefix: boolean
  useFolderHierarchy: boolean
  canUseFolderHierarchy: boolean
  hierarchyDigitsByDepth?: number[]
}): { label: string; zipPath?: string } {
  const {
    info,
    fallbackLabel,
    selectedOrder,
    selectedCount,
    addNumberPrefix,
    useFolderHierarchy,
    canUseFolderHierarchy,
    hierarchyDigitsByDepth = [],
  } = params
  const baseTitle = sanitizeFilename(info?.title ?? fallbackLabel)

  if (!useFolderHierarchy || !canUseFolderHierarchy || !info) {
    if (!addNumberPrefix) return { label: baseTitle }
    const digits = Math.max(2, String(Math.max(1, selectedCount)).length)
    const index = String(selectedOrder + 1).padStart(digits, "0")
    return { label: `${index}_${baseTitle}` }
  }

  if (!addNumberPrefix) {
    const folderPath = info.pathTitles.slice(0, -1).map(sanitizeFilename).join("/")
    return {
      label: baseTitle,
      zipPath: folderPath ? `${folderPath}/${baseTitle}.pdf` : `${baseTitle}.pdf`,
    }
  }

  const hierarchyTokens = info.pathIndices.map((zeroBasedIndex, depth) => {
    const fallbackSiblings = info.pathSiblingCounts[depth] ?? 1
    const digits =
      hierarchyDigitsByDepth[depth] ??
      Math.max(2, String(Math.max(1, fallbackSiblings)).length)
    return String(zeroBasedIndex + 1).padStart(digits, "0")
  })
  const hierarchyPrefix = hierarchyTokens.join("_")
  const label = `${hierarchyPrefix}_${baseTitle}`

  const folderPath = info.pathTitles
    .slice(0, -1)
    .map((title, depth) => `${hierarchyTokens[depth]}_${sanitizeFilename(title)}`)
    .join("/")

  return {
    label,
    zipPath: folderPath ? `${folderPath}/${label}.pdf` : `${label}.pdf`,
  }
}
