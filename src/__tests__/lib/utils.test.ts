import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn (className utility)", () => {
  it("returns a single class", () => {
    expect(cn("foo")).toBe("foo")
  })

  it("joins multiple classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("filters out falsy values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar")
  })

  it("handles conditional classes", () => {
    const isActive = true
    const isDisabled = false
    expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe(
      "base active"
    )
  })

  it("resolves Tailwind class conflicts", () => {
    // tailwind-merge prioritizes classes appearing later in the same category
    const result = cn("px-2", "px-4")
    expect(result).toBe("px-4")
  })

  it("supports clsx array syntax", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar")
  })

  it("supports clsx object syntax", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz")
  })

  it("returns an empty string with no arguments", () => {
    expect(cn()).toBe("")
  })
})
