/**
 * PDF サムネイルの ImageBitmap キャッシュ。
 *
 * キー: `${fingerprint}:${pageNumber}:${width}` 形式の文字列
 * 値 : ImageBitmap（GPU メモリに保持され、canvas への描画が高速）
 *
 * LRU 方式で最大エントリ数を制限し、メモリリークを防止する。
 */

const DEFAULT_MAX_ENTRIES = 500

class ThumbnailCache {
  private cache = new Map<string, ImageBitmap>()
  private maxEntries: number

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries
  }

  /** キャッシュキーを生成する */
  static key(fingerprint: string, pageNumber: number, width: number): string {
    // devicePixelRatio もキーに含める（Retina 切替対応）
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1
    return `${fingerprint}:${pageNumber}:${width}:${dpr}`
  }

  /** キャッシュからサムネイルを取得する。ヒット時は LRU 順序を更新。 */
  get(key: string): ImageBitmap | undefined {
    const bitmap = this.cache.get(key)
    if (bitmap) {
      // LRU: 末尾（最新）に移動
      this.cache.delete(key)
      this.cache.set(key, bitmap)
    }
    return bitmap
  }

  /** サムネイルをキャッシュに格納する。容量超過時は最も古いエントリを破棄。 */
  set(key: string, bitmap: ImageBitmap): void {
    // 既存キーがあれば古い bitmap を解放
    const existing = this.cache.get(key)
    if (existing) {
      existing.close()
      this.cache.delete(key)
    }

    // 容量超過時に古いエントリを削除
    while (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value
      if (oldest === undefined) break
      this.cache.get(oldest)?.close()
      this.cache.delete(oldest)
    }

    this.cache.set(key, bitmap)
  }

  /** 指定 fingerprint に紐づくキャッシュをすべて破棄する */
  evictByFingerprint(fingerprint: string): void {
    const prefix = `${fingerprint}:`
    for (const [key, bitmap] of this.cache) {
      if (key.startsWith(prefix)) {
        bitmap.close()
        this.cache.delete(key)
      }
    }
  }

  /** 全キャッシュを破棄する */
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

/** アプリ全体で共有するシングルトンインスタンス */
export const thumbnailCache = new ThumbnailCache()

/** キャッシュキーを生成するユーティリティ関数 */
export function ThumbnailCacheKey(fingerprint: string, pageNumber: number, width: number): string {
  return ThumbnailCache.key(fingerprint, pageNumber, width)
}
