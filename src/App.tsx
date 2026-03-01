import { PdfStoreProvider } from "@/hooks/use-pdf-store"
import { PdfToolkit } from "@/components/pdf-toolkit"
import { LoadErrorAlert } from "@/components/load-error-alert"

export function App() {
  return (
    <PdfStoreProvider>
      <PdfToolkit />
      <LoadErrorAlert />
    </PdfStoreProvider>
  )
}

export default App