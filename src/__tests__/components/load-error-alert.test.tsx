import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PdfStoreProvider, usePdfStore } from "@/hooks/use-pdf-store"
import { LoadErrorAlert } from "@/components/load-error-alert"
import "@/i18n/config" // Import i18n config for tests
import en from "@/i18n/en.json"

// LoadErrorAlert displays based on loadErrors in usePdfStore.
// Provide a helper component to manipulate state for testing.

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
        // Mocking dispatch internally by calling loadFiles with dummy files
        // or directly setting state if actions were available.
      }}
    >
      trigger
    </button>
  )
}

// Test harness to wrap component with provider
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
  it("should show nothing when there are no errors", () => {
    renderWithProvider(<LoadErrorAlert />)
    expect(
      screen.queryByText("errors.loadFailed")
    ).not.toBeInTheDocument()
  })

  it("should show error alert when loading non-PDF files", async () => {
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
      await screen.findByText("errors.loadFailed")
    ).toBeInTheDocument()
    expect(screen.getByText("readme.txt")).toBeInTheDocument()
    expect(screen.getByText("errors.notPdf")).toBeInTheDocument()
  })

  it("should show count when multiple files fail to load", async () => {
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
      await screen.findByText("errors.loadFailedMany")
    ).toBeInTheDocument()
    expect(screen.getByText("a.txt")).toBeInTheDocument()
    expect(screen.getByText("b.doc")).toBeInTheDocument()
  })

  it("should clear errors when clicking the close button", async () => {
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
      await screen.findByText("errors.loadFailed")
    ).toBeInTheDocument()

    await user.click(screen.getByText("common.close"))

    expect(
      screen.queryByText("errors.loadFailed")
    ).not.toBeInTheDocument()
  })
})

describe("usePdfStore loadErrors", () => {
  it("should have empty loadErrors by default", () => {
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

  it("should clear errors with clearLoadErrors", async () => {
    const { renderHook, act } = require("@testing-library/react")
    const { result } = renderHook(() => usePdfStore(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PdfStoreProvider>{children}</PdfStoreProvider>
      ),
    })

    // Load non-PDF file to trigger error
    const txtFile = new File(["hello"], "test.txt", { type: "text/plain" })
    await act(async () => {
      await result.current.actions.loadFiles([txtFile])
    })
    expect(result.current.state.loadErrors).toHaveLength(1)

    // Clear
    act(() => {
      result.current.actions.clearLoadErrors()
    })
    expect(result.current.state.loadErrors).toEqual([])
  })
})
