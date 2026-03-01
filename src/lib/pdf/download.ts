import JSZip from "jszip"
import type { SplitResult } from "./types"

/** 単一ファイルをダウンロードする */
export function downloadBlob(data: Uint8Array | ArrayBuffer, filename: string) {
  const blob = new Blob([data instanceof ArrayBuffer ? data : data.slice().buffer], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** テキストファイルをダウンロードする */
export function downloadText(text: string, filename: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 分割結果をZIPにまとめてダウンロードする */
export async function downloadSplitsAsZip(
  splits: SplitResult[],
  zipFilename: string = "split.zip"
) {
  const zip = new JSZip()
  for (const split of splits) {
    zip.file(`${split.label}.pdf`, split.data)
  }
  const blob = await zip.generateAsync({ type: "blob" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = zipFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
