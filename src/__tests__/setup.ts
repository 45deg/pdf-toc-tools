import "@testing-library/jest-dom/vitest"

// DOMMatrix mock (required by pdfjs-dist)
if (typeof globalThis.DOMMatrix === "undefined") {
  class MockDOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
    constructor() {}
    inverse() { return new MockDOMMatrix() }
    multiply() { return new MockDOMMatrix() }
    translate() { return new MockDOMMatrix() }
    scale() { return new MockDOMMatrix() }
    rotate() { return new MockDOMMatrix() }
    transformPoint() { return { x: 0, y: 0, z: 0, w: 1 } }
    static fromMatrix() { return new MockDOMMatrix() }
    static fromFloat32Array() { return new MockDOMMatrix() }
    static fromFloat64Array() { return new MockDOMMatrix() }
  }
  Object.defineProperty(globalThis, "DOMMatrix", { value: MockDOMMatrix })
}

// Path2D mock
if (typeof globalThis.Path2D === "undefined") {
  class MockPath2D {
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
  }
  Object.defineProperty(globalThis, "Path2D", { value: MockPath2D })
}

// IntersectionObserver mock
class MockIntersectionObserver {
  callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }
  observe() {
    // 即座にisIntersectingをtrueで呼び出す
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    )
  }
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, "IntersectionObserver", {
  value: MockIntersectionObserver,
})

// URL.createObjectURL / revokeObjectURL mock
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = () => "blob:mock-url"
}
if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = () => {}
}

// crypto.randomUUID mock
if (typeof crypto.randomUUID === "undefined") {
  Object.defineProperty(crypto, "randomUUID", {
    value: () => "00000000-0000-0000-0000-000000000000",
  })
}

// window.devicePixelRatio
if (typeof window.devicePixelRatio === "undefined") {
  Object.defineProperty(window, "devicePixelRatio", { value: 1 })
}
