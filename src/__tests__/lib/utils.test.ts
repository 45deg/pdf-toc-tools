import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn (className utility)", () => {
  it("単一のクラスを返す", () => {
    expect(cn("foo")).toBe("foo")
  })

  it("複数クラスを結合する", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("falsy な値を除外する", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar")
  })

  it("条件付きクラスを処理する", () => {
    const isActive = true
    const isDisabled = false
    expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe(
      "base active"
    )
  })

  it("Tailwind のクラス競合を解決する", () => {
    // tailwind-merge は同カテゴリの後のクラスを優先する
    const result = cn("px-2", "px-4")
    expect(result).toBe("px-4")
  })

  it("clsx の配列構文をサポートする", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar")
  })

  it("clsx のオブジェクト構文をサポートする", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz")
  })

  it("空の引数で空文字を返す", () => {
    expect(cn()).toBe("")
  })
})
