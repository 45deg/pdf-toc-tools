import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PdfStoreProvider } from "@/hooks/use-pdf-store"
import { LandingPage } from "@/components/landing-page"
import "@/i18n/config"
import en from "@/i18n/en.json"

function renderWithProvider(ui: React.ReactElement) {
  return render(<PdfStoreProvider>{ui}</PdfStoreProvider>)
}

describe("LandingPage", () => {
  it("should display the title", () => {
    renderWithProvider(<LandingPage />)
    expect(screen.getByText("PDF-kit")).toBeInTheDocument()
  })

  it("should display the subtitle", () => {
    renderWithProvider(<LandingPage />)
    expect(
      screen.getByText("landing.hero.subtitle")
    ).toBeInTheDocument()
  })

  it("should display all feature cards", () => {
    renderWithProvider(<LandingPage />)
    expect(screen.getByText("landing.title")).toBeInTheDocument()
    expect(screen.getByText("landing.pageOperations.title")).toBeInTheDocument()
    expect(screen.getByText("landing.splitMerge.title")).toBeInTheDocument()
    expect(screen.getByText("landing.metadata.title")).toBeInTheDocument()
  })

  it("should display dropzone texts", () => {
    renderWithProvider(<LandingPage />)
    expect(
      screen.getByText("landing.dropzone.dragText")
    ).toBeInTheDocument()
    expect(
      screen.getByText("landing.dropzone.clickText")
    ).toBeInTheDocument()
  })

  it("should display the privacy message", () => {
    renderWithProvider(<LandingPage />)
    expect(
      screen.getByText("landing.footer.privacy")
    ).toBeInTheDocument()
  })

  it("should display feature descriptions", () => {
    renderWithProvider(<LandingPage />)
    expect(
      screen.getByText("landing.description")
    ).toBeInTheDocument()
    expect(
      screen.getByText("landing.pageOperations.description")
    ).toBeInTheDocument()
    expect(
      screen.getByText("landing.splitMerge.description")
    ).toBeInTheDocument()
    expect(
      screen.getByText("landing.metadata.description")
    ).toBeInTheDocument()
  })
})
