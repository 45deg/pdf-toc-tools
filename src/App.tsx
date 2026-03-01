import { PdfStoreProvider } from "@/hooks/use-pdf-store"
import { PdfToolkit } from "@/components/pdf-toolkit"

export function App() {
  return (
    <PdfStoreProvider>
      <PdfToolkit />
    </PdfStoreProvider>
  )
}

export default App