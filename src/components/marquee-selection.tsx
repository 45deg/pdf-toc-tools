import { useRef, useState, useCallback, useEffect } from "react"

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface MarqueeSelectionProps {
  /** Ref of the container to enable marquee selection on */
  containerRef: React.RefObject<HTMLElement | null>
  /** Selector for thumbnail elements with data-page-index attribute */
  itemSelector?: string
  /** When the indices selected by the marquee change */
  onSelectionChange: (indices: number[]) => void
  /** When dragging is complete (mouse up) */
  onSelectionEnd: (indices: number[]) => void
  /** Existing selection before marquee starts (for addition with Cmd key) */
  previousSelection?: number[]
  /** Disabled on touch devices */
  enabled?: boolean
}

/**
 * OS-style rectangular (marquee) selection.
 * Draws an overlay using position: absolute over containerRef.
 * Works on PC only (pointer: fine).
 */
export function useMarqueeSelection({
  containerRef,
  itemSelector = "[data-page-index]",
  onSelectionChange,
  onSelectionEnd,
  previousSelection = [],
  enabled = true,
}: MarqueeSelectionProps) {
  const [marqueeRect, setMarqueeRect] = useState<Rect | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const prevSelRef = useRef(previousSelection)
  prevSelRef.current = previousSelection
  const DRAG_THRESHOLD = 5

  const getContainerRelativePos = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current
      if (!container) return { x: 0, y: 0 }
      const rect = container.getBoundingClientRect()
      return {
        x: clientX - rect.left + container.scrollLeft,
        y: clientY - rect.top + container.scrollTop,
      }
    },
    [containerRef]
  )

  const getIntersectingIndices = useCallback(
    (rect: Rect) => {
      const container = containerRef.current
      if (!container) return []
      const items = container.querySelectorAll(itemSelector)
      const indices: number[] = []
      const containerRect = container.getBoundingClientRect()

      // Convert marquee rectangle to viewport coordinates
      const marqueeViewport = {
        left: containerRect.left + rect.x - container.scrollLeft,
        top: containerRect.top + rect.y - container.scrollTop,
        right: containerRect.left + rect.x + rect.w - container.scrollLeft,
        bottom: containerRect.top + rect.y + rect.h - container.scrollTop,
      }

      items.forEach((item) => {
        const idx = parseInt(item.getAttribute("data-page-index") ?? "", 10)
        if (isNaN(idx)) return
        const itemRect = item.getBoundingClientRect()
        // Determine rectangle intersection
        if (
          itemRect.right > marqueeViewport.left &&
          itemRect.left < marqueeViewport.right &&
          itemRect.bottom > marqueeViewport.top &&
          itemRect.top < marqueeViewport.bottom
        ) {
          indices.push(idx)
        }
      })
      return indices
    },
    [containerRef, itemSelector]
  )

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (!enabled) return
      // Disabled if pointer is not fine (mouse)
      const isFine = window.matchMedia("(pointer: fine)").matches
      if (!isFine) return
      // Ignore clicks on thumbnails themselves or checkboxes
      const target = e.target as HTMLElement
      if (target.closest("[data-page-index]") || target.closest("[role='checkbox']")) return
      // Ignore right click
      if (e.button !== 0) return

      startPosRef.current = getContainerRelativePos(e.clientX, e.clientY)
      isDraggingRef.current = false
    },
    [enabled, getContainerRelativePos]
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!startPosRef.current) return
      const pos = getContainerRelativePos(e.clientX, e.clientY)
      const dx = pos.x - startPosRef.current.x
      const dy = pos.y - startPosRef.current.y

      if (!isDraggingRef.current) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
        isDraggingRef.current = true
      }

      const rect: Rect = {
        x: Math.min(startPosRef.current.x, pos.x),
        y: Math.min(startPosRef.current.y, pos.y),
        w: Math.abs(dx),
        h: Math.abs(dy),
      }
      setMarqueeRect(rect)

      const marqueeIndices = getIntersectingIndices(rect)
      // Add to existing selection if Cmd/Ctrl is pressed
      const combined = e.metaKey || e.ctrlKey
        ? [...new Set([...prevSelRef.current, ...marqueeIndices])]
        : marqueeIndices
      onSelectionChange(combined)
    },
    [getContainerRelativePos, getIntersectingIndices, onSelectionChange]
  )

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (isDraggingRef.current && marqueeRect) {
        const marqueeIndices = getIntersectingIndices(marqueeRect)
        const combined = e.metaKey || e.ctrlKey
          ? [...new Set([...prevSelRef.current, ...marqueeIndices])]
          : marqueeIndices
        onSelectionEnd(combined)
      }
      startPosRef.current = null
      isDraggingRef.current = false
      setMarqueeRect(null)
    },
    [marqueeRect, getIntersectingIndices, onSelectionEnd]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return
    container.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
    return () => {
      container.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
    }
  }, [containerRef, enabled, handlePointerDown, handlePointerMove, handlePointerUp])

  return { marqueeRect, isDragging: isDraggingRef.current }
}

/** Marquee rectangle overlay rendering */
export function MarqueeOverlay({ rect }: { rect: Rect | null }) {
  if (!rect) return null
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-sm border border-blue-500/60 bg-blue-500/15"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
      }}
    />
  )
}
