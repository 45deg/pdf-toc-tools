/**
 * ImageBitmap cache for PDF thumbnails.
 *
 * Key: String in `${fingerprint}:${pageNumber}:${width}` format
 * Value: ImageBitmap (Held in GPU memory, fast drawing to canvas)
 *
 * Limits max entries with LRU policy to prevent memory leaks.
 */

const DEFAULT_MAX_ENTRIES = 500

class ThumbnailCache {
  private cache = new Map<string, ImageBitmap>()
  private maxEntries: number

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries
  }

  /** Generates a cache key */
  static key(fingerprint: string, pageNumber: number, width: number): string {
    // Include devicePixelRatio in the key (Retina display support)
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1
    return `${fingerprint}:${pageNumber}:${width}:${dpr}`
  }

  /** Gets a thumbnail from cache. Updates LRU order on hit. */
  get(key: string): ImageBitmap | undefined {
    const bitmap = this.cache.get(key)
    if (bitmap) {
      // LRU: Move to the end (most recent)
      this.cache.delete(key)
      this.cache.set(key, bitmap)
    }
    return bitmap
  }

  /** Stores a thumbnail in cache. Evicts the oldest entry if capacity is exceeded. */
  set(key: string, bitmap: ImageBitmap): void {
    // If key already exists, release the old bitmap
    const existing = this.cache.get(key)
    if (existing) {
      existing.close()
      this.cache.delete(key)
    }

    // Remove oldest entries if capacity is exceeded
    while (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value
      if (oldest === undefined) break
      this.cache.get(oldest)?.close()
      this.cache.delete(oldest)
    }

    this.cache.set(key, bitmap)
  }

  /** Evicts all cache entries associated with a specific fingerprint */
  evictByFingerprint(fingerprint: string): void {
    const prefix = `${fingerprint}:`
    for (const [key, bitmap] of this.cache) {
      if (key.startsWith(prefix)) {
        bitmap.close()
        this.cache.delete(key)
      }
    }
  }

  /** Clears all cache entries */
  clear(): void {
    for (const bitmap of this.cache.values()) {
      bitmap.close()
    }
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

/** Singleton instance shared across the application */
export const thumbnailCache = new ThumbnailCache()

/** Utility function to generate a cache key */
export function ThumbnailCacheKey(fingerprint: string, pageNumber: number, width: number): string {
  return ThumbnailCache.key(fingerprint, pageNumber, width)
}
