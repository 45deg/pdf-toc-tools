import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react"
import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import type {
  LoadedPdf,
  ViewMode,
  OutlineNode,
  OutlineFilter,
  PdfMetadata,
} from "@/lib/pdf/types"
import { parsePdf } from "@/lib/pdf/parser"

// ===== State =====

/** File loading error */
export interface LoadError {
  fileName: string
  message: string
}

interface PdfState {
  files: LoadedPdf[]
  activeFileId: string | null
  viewMode: ViewMode
  selectedPages: number[] // Index within activeFile.pageOrder
  outlineFilter: OutlineFilter | null
  isLoading: boolean
  loadErrors: LoadError[]
  editedFileIds: string[]
}

const initialState: PdfState = {
  files: [],
  activeFileId: null,
  viewMode: "pages",
  selectedPages: [],
  outlineFilter: null,
  isLoading: false,
  loadErrors: [],
  editedFileIds: [],
}

// ===== Actions =====

type PdfAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "ADD_FILE"; payload: LoadedPdf }
  | { type: "REMOVE_FILE"; payload: string }
  | { type: "SET_ACTIVE_FILE"; payload: string | null }
  | { type: "SET_VIEW_MODE"; payload: ViewMode }
  | { type: "SET_SELECTED_PAGES"; payload: number[] }
  | { type: "DELETE_PAGES"; payload: { fileId: string; indices: number[] } }
  | { type: "REORDER_PAGES"; payload: { fileId: string; newOrder: number[] } }
  | { type: "UPDATE_OUTLINE"; payload: { fileId: string; outline: OutlineNode[] } }
  | { type: "UPDATE_METADATA"; payload: { fileId: string; metadata: PdfMetadata } }
  | { type: "UPDATE_FILE_DATA"; payload: { fileId: string; data: ArrayBuffer } }
  | { type: "REPLACE_FILE"; payload: LoadedPdf }
  | { type: "SET_OUTLINE_FILTER"; payload: OutlineFilter | null }
  | { type: "REORDER_FILES"; payload: string[] }
  | { type: "SET_LOAD_ERRORS"; payload: LoadError[] }
  | { type: "CLEAR_LOAD_ERRORS" }

// ===== Reducer =====

function reducer(state: PdfState, action: PdfAction): PdfState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }

    case "ADD_FILE":
      return {
        ...state,
        files: [...state.files, action.payload],
        activeFileId: state.activeFileId ?? action.payload.id,
        selectedPages: [],
      }

    case "REMOVE_FILE": {
      const newFiles = state.files.filter((f) => f.id !== action.payload)
      return {
        ...state,
        files: newFiles,
        editedFileIds: state.editedFileIds.filter((id) => id !== action.payload),
        activeFileId:
          state.activeFileId === action.payload
            ? (newFiles[0]?.id ?? null)
            : state.activeFileId,
        selectedPages: [],
      }
    }

    case "SET_ACTIVE_FILE":
      return { ...state, activeFileId: action.payload, selectedPages: [], outlineFilter: null }

    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.payload }

    case "SET_SELECTED_PAGES":
      return { ...state, selectedPages: action.payload }

    case "DELETE_PAGES": {
      const toDelete = new Set(action.payload.indices)
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.payload.fileId
            ? { ...f, pageOrder: f.pageOrder.filter((_, i) => !toDelete.has(i)) }
            : f
        ),
        editedFileIds: state.editedFileIds.includes(action.payload.fileId)
          ? state.editedFileIds
          : [...state.editedFileIds, action.payload.fileId],
        selectedPages: [],
      }
    }

    case "REORDER_PAGES":
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.payload.fileId
            ? { ...f, pageOrder: action.payload.newOrder }
            : f
        ),
        editedFileIds: state.editedFileIds.includes(action.payload.fileId)
          ? state.editedFileIds
          : [...state.editedFileIds, action.payload.fileId],
      }

    case "UPDATE_OUTLINE":
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.payload.fileId
            ? { ...f, outline: action.payload.outline }
            : f
        ),
        editedFileIds: state.editedFileIds.includes(action.payload.fileId)
          ? state.editedFileIds
          : [...state.editedFileIds, action.payload.fileId],
      }

    case "UPDATE_METADATA":
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.payload.fileId
            ? { ...f, metadata: action.payload.metadata }
            : f
        ),
        editedFileIds: state.editedFileIds.includes(action.payload.fileId)
          ? state.editedFileIds
          : [...state.editedFileIds, action.payload.fileId],
      }

    case "UPDATE_FILE_DATA":
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.payload.fileId
            ? { ...f, data: action.payload.data }
            : f
        ),
        editedFileIds: state.editedFileIds.includes(action.payload.fileId)
          ? state.editedFileIds
          : [...state.editedFileIds, action.payload.fileId],
      }

    case "REPLACE_FILE":
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.payload.id ? action.payload : f
        ),
        editedFileIds: state.editedFileIds.includes(action.payload.id)
          ? state.editedFileIds
          : [...state.editedFileIds, action.payload.id],
      }

    case "SET_OUTLINE_FILTER":
      return { ...state, outlineFilter: action.payload, viewMode: "pages" }

    case "REORDER_FILES": {
      const orderMap = new Map(action.payload.map((id, i) => [id, i]))
      const sorted = [...state.files].sort(
        (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
      )
      return { ...state, files: sorted }
    }

    case "SET_LOAD_ERRORS":
      return { ...state, loadErrors: action.payload }

    case "CLEAR_LOAD_ERRORS":
      return { ...state, loadErrors: [] }

    default:
      return state
  }
}

// ===== Context =====

interface PdfStoreActions {
  loadFiles: (files: File[]) => Promise<void>
  removeFile: (id: string) => void
  setActiveFile: (id: string | null) => void
  setViewMode: (mode: ViewMode) => void
  setSelectedPages: (pages: number[]) => void
  togglePageSelection: (index: number, shiftKey: boolean) => void
  selectAllPages: () => void
  deselectAllPages: () => void
  deleteSelectedPages: () => void
  reorderPages: (newOrder: number[]) => void
  reorderFiles: (fileIds: string[]) => void
  updateOutline: (outline: OutlineNode[]) => void
  updateMetadata: (metadata: PdfMetadata) => void
  setOutlineFilter: (filter: OutlineFilter | null) => void
  clearLoadErrors: () => void
}

interface PdfStoreContextType {
  state: PdfState
  actions: PdfStoreActions
}

const PdfStoreContext = createContext<PdfStoreContextType | null>(null)

// ===== Provider =====

export function PdfStoreProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(reducer, initialState)

  const loadFiles = useCallback(
    async (files: File[]) => {
      dispatch({ type: "SET_LOADING", payload: true })
      dispatch({ type: "CLEAR_LOAD_ERRORS" })
      const errors: LoadError[] = []
      try {
        for (const file of files) {
          if (!file.name.toLowerCase().endsWith(".pdf")) {
            errors.push({ fileName: file.name, message: t("errors.notPdf") })
            continue
          }
          try {
            const rawData = await file.arrayBuffer()
            const { pageCount, outline, metadata } = await parsePdf(rawData)
            // Always keep an undetached copy in the store
            const data = rawData.slice(0)
            dispatch({
              type: "ADD_FILE",
              payload: {
                id: crypto.randomUUID(),
                name: file.name,
                data,
                originalPageCount: pageCount,
                outline,
                metadata,
                pageOrder: Array.from({ length: pageCount }, (_, i) => i),
              },
            })
          } catch (err) {
            const message =
              err instanceof Error ? err.message : t("common.error")
            errors.push({ fileName: file.name, message })
          }
        }
      } finally {
        if (errors.length > 0) {
          dispatch({ type: "SET_LOAD_ERRORS", payload: errors })
        }
        dispatch({ type: "SET_LOADING", payload: false })
      }
    },
    [t]
  )

  const removeFile = useCallback((id: string) => {
    dispatch({ type: "REMOVE_FILE", payload: id })
  }, [])

  const setActiveFile = useCallback((id: string | null) => {
    dispatch({ type: "SET_ACTIVE_FILE", payload: id })
  }, [])

  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: "SET_VIEW_MODE", payload: mode })
  }, [])

  const setSelectedPages = useCallback((pages: number[]) => {
    dispatch({ type: "SET_SELECTED_PAGES", payload: pages })
  }, [])

  const togglePageSelection = useCallback(
    (index: number, shiftKey: boolean) => {
      dispatch({
        type: "SET_SELECTED_PAGES",
        payload: (() => {
          const current = state.selectedPages
          if (shiftKey && current.length > 0) {
            const last = current[current.length - 1]
            const min = Math.min(last, index)
            const max = Math.max(last, index)
            const range = Array.from({ length: max - min + 1 }, (_, i) => min + i)
            return [...new Set([...current, ...range])]
          }
          return current.includes(index)
            ? current.filter((i) => i !== index)
            : [...current, index]
        })(),
      })
    },
    [state.selectedPages]
  )

  const selectAllPages = useCallback(() => {
    const file = state.files.find((f) => f.id === state.activeFileId)
    if (file) {
      dispatch({
        type: "SET_SELECTED_PAGES",
        payload: Array.from({ length: file.pageOrder.length }, (_, i) => i),
      })
    }
  }, [state.files, state.activeFileId])

  const deselectAllPages = useCallback(() => {
    dispatch({ type: "SET_SELECTED_PAGES", payload: [] })
  }, [])

  const deleteSelectedPages = useCallback(() => {
    if (state.activeFileId && state.selectedPages.length > 0) {
      dispatch({
        type: "DELETE_PAGES",
        payload: { fileId: state.activeFileId, indices: state.selectedPages },
      })
    }
  }, [state.activeFileId, state.selectedPages])

  const reorderPages = useCallback(
    (newOrder: number[]) => {
      if (state.activeFileId) {
        dispatch({
          type: "REORDER_PAGES",
          payload: { fileId: state.activeFileId, newOrder },
        })
      }
    },
    [state.activeFileId]
  )

  const reorderFiles = useCallback(
    (fileIds: string[]) => {
      dispatch({ type: "REORDER_FILES", payload: fileIds })
    },
    []
  )

  const updateOutline = useCallback(
    (outline: OutlineNode[]) => {
      if (state.activeFileId) {
        dispatch({
          type: "UPDATE_OUTLINE",
          payload: { fileId: state.activeFileId, outline },
        })
      }
    },
    [state.activeFileId]
  )

  const updateMetadata = useCallback(
    (metadata: PdfMetadata) => {
      if (state.activeFileId) {
        dispatch({
          type: "UPDATE_METADATA",
          payload: { fileId: state.activeFileId, metadata },
        })
      }
    },
    [state.activeFileId]
  )

  const setOutlineFilter = useCallback(
    (filter: OutlineFilter | null) => {
      dispatch({ type: "SET_OUTLINE_FILTER", payload: filter })
    },
    []
  )

  const clearLoadErrors = useCallback(() => {
    dispatch({ type: "CLEAR_LOAD_ERRORS" })
  }, [])

  const actions = useMemo<PdfStoreActions>(
    () => ({
      loadFiles,
      removeFile,
      setActiveFile,
      setViewMode,
      setSelectedPages,
      togglePageSelection,
      selectAllPages,
      deselectAllPages,
      deleteSelectedPages,
      reorderPages,
      reorderFiles,
      updateOutline,
      updateMetadata,
      setOutlineFilter,
      clearLoadErrors,
    }),
    [
      loadFiles,
      removeFile,
      setActiveFile,
      setViewMode,
      setSelectedPages,
      togglePageSelection,
      selectAllPages,
      deselectAllPages,
      deleteSelectedPages,
      reorderPages,
      reorderFiles,
      updateOutline,
      updateMetadata,
      setOutlineFilter,
      clearLoadErrors,
    ]
  )

  return (
    <PdfStoreContext.Provider value={{ state, actions }}>
      {children}
    </PdfStoreContext.Provider>
  )
}

// ===== Hooks =====

export function usePdfStore() {
  const ctx = useContext(PdfStoreContext)
  if (!ctx) throw new Error("usePdfStore must be used within PdfStoreProvider")
  return ctx
}

export function useActiveFile(): LoadedPdf | null {
  const { state } = usePdfStore()
  return state.files.find((f) => f.id === state.activeFileId) ?? null
}
