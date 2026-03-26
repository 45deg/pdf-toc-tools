import { describe, it, expect, vi, beforeEach } from "vitest"

const { zipFileSpy, zipGenerateSpy } = vi.hoisted(() => ({
  zipFileSpy: vi.fn(),
  zipGenerateSpy: vi.fn().mockResolvedValue(new Blob(["zip"])),
}))

vi.mock("jszip", () => ({
  default: class MockJsZip {
    file(...args: Parameters<typeof zipFileSpy>) {
      return zipFileSpy(...args)
    }

    generateAsync(...args: Parameters<typeof zipGenerateSpy>) {
      return zipGenerateSpy(...args)
    }
  },
}))

import { downloadSplitsAsZip } from "@/lib/pdf/download"

describe("downloadSplitsAsZip", () => {
  beforeEach(() => {
    zipFileSpy.mockClear()
    zipGenerateSpy.mockClear()
  })

  it("uses zipPath when provided", async () => {
    await downloadSplitsAsZip(
      [
        {
          label: "fallback-label",
          data: new Uint8Array([1, 2, 3]),
          zipPath: "Part 1/01_Chapter.pdf",
        },
      ],
      "out.zip"
    )

    expect(zipFileSpy).toHaveBeenCalledWith(
      "Part 1/01_Chapter.pdf",
      expect.any(Uint8Array)
    )
  })

  it("falls back to label-based filename when zipPath is absent", async () => {
    await downloadSplitsAsZip([{ label: "chapter", data: new Uint8Array([1]) }], "out.zip")

    expect(zipFileSpy).toHaveBeenCalledWith("chapter.pdf", expect.any(Uint8Array))
  })
})
