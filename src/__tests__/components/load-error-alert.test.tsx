import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PdfStoreProvider, usePdfStore } from "@/hooks/use-pdf-store"
import { LoadErrorAlert } from "@/components/load-error-alert"

// LoadErrorAlert は usePdfStore の loadErrors をもとに表示するため、
// テスト用にストアの状態を操作するヘルパーコンポーネントを用意する。

function ErrorTrigger({
  errors,
}: {
  errors: { fileName: string; message: string }[]
}) {
  const { actions } = usePdfStore()
  return (
    <button
      data-testid="trigger"
      onClick={() => {
        // loadFiles を直接呼ばず、非 PDF ファイルを渡してエラーを発生させる代わりに
        // 内部の dispatch を模倣するため loadFiles にダミーファイルを渡す
        // → 実際にはストアの actions を通じて loadFiles を呼ぶテストとする
      }}
    >
      trigger
    </button>
  )
}

// テスト用に loadErrors をセットできるラッパー
function TestHarness({
  triggerLoadFiles,
  files,
}: {
  triggerLoadFiles?: boolean
  files?: File[]
}) {
  return (
    <PdfStoreProvider>
      <LoadErrorAlert />
      {triggerLoadFiles && files && <FileLoader files={files} />}
    </PdfStoreProvider>
  )
}

function FileLoader({ files }: { files: File[] }) {
  const { actions } = usePdfStore()
  return (
    <button data-testid="load" onClick={() => actions.loadFiles(files)}>
      load
    </button>
  )
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<PdfStoreProvider>{ui}</PdfStoreProvider>)
}

describe("LoadErrorAlert", () => {
  it("エラーがない場合は何も表示しない", () => {
    renderWithProvider(<LoadErrorAlert />)
    expect(
      screen.queryByText("ファイルを読み込めませんでした")
    ).not.toBeInTheDocument()
  })

  it("非PDFファイルをロードするとエラーアラートが表示される", async () => {
    const user = userEvent.setup()
    const txtFile = new File(["hello"], "readme.txt", { type: "text/plain" })

    render(
      <PdfStoreProvider>
        <LoadErrorAlert />
        <FileLoader files={[txtFile]} />
      </PdfStoreProvider>
    )

    await user.click(screen.getByTestId("load"))

    expect(
      await screen.findByText("ファイルを読み込めませんでした")
    ).toBeInTheDocument()
    expect(screen.getByText("readme.txt")).toBeInTheDocument()
    expect(screen.getByText("PDFファイルではありません")).toBeInTheDocument()
  })

  it("複数ファイルのエラー時に件数が表示される", async () => {
    const user = userEvent.setup()
    const files = [
      new File(["a"], "a.txt", { type: "text/plain" }),
      new File(["b"], "b.doc", { type: "application/msword" }),
    ]

    render(
      <PdfStoreProvider>
        <LoadErrorAlert />
        <FileLoader files={files} />
      </PdfStoreProvider>
    )

    await user.click(screen.getByTestId("load"))

    expect(
      await screen.findByText("2件のファイルを読み込めませんでした")
    ).toBeInTheDocument()
    expect(screen.getByText("a.txt")).toBeInTheDocument()
    expect(screen.getByText("b.doc")).toBeInTheDocument()
  })

  it("閉じるボタンでエラーがクリアされる", async () => {
    const user = userEvent.setup()
    const txtFile = new File(["hello"], "readme.txt", { type: "text/plain" })

    render(
      <PdfStoreProvider>
        <LoadErrorAlert />
        <FileLoader files={[txtFile]} />
      </PdfStoreProvider>
    )

    await user.click(screen.getByTestId("load"))
    expect(
      await screen.findByText("ファイルを読み込めませんでした")
    ).toBeInTheDocument()

    await user.click(screen.getByText("閉じる"))

    expect(
      screen.queryByText("ファイルを読み込めませんでした")
    ).not.toBeInTheDocument()
  })
})

describe("usePdfStore loadErrors", () => {
  it("初期状態で loadErrors は空配列", () => {
    const { result } = require("@testing-library/react").renderHook(
      () => usePdfStore(),
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <PdfStoreProvider>{children}</PdfStoreProvider>
        ),
      }
    )
    expect(result.current.state.loadErrors).toEqual([])
  })

  it("clearLoadErrors でエラーがクリアされる", async () => {
    const { renderHook, act } = require("@testing-library/react")
    const { result } = renderHook(() => usePdfStore(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PdfStoreProvider>{children}</PdfStoreProvider>
      ),
    })

    // 非PDFファイルをロードしてエラーを発生させる
    const txtFile = new File(["hello"], "test.txt", { type: "text/plain" })
    await act(async () => {
      await result.current.actions.loadFiles([txtFile])
    })
    expect(result.current.state.loadErrors).toHaveLength(1)

    // クリア
    act(() => {
      result.current.actions.clearLoadErrors()
    })
    expect(result.current.state.loadErrors).toEqual([])
  })
})
