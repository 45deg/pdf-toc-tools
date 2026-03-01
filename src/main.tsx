import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { setupPdfWorker } from "@/lib/pdf/setup"
import "./index.css"
import App from "./App.tsx"

setupPdfWorker()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
