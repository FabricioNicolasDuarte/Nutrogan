// Ejecutado antes de cada suite Vitest (happy-dom + Quasar)

if (typeof window !== 'undefined') {
  // Quasar Screen plugin lee window.screen.orientation en install
  const orientation = {
    type: 'portrait-primary',
    angle: 0,
    addEventListener() {},
    removeEventListener() {},
    unlock() {},
  }
  try {
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      get() {
        return orientation
      },
    })
  } catch {
    window.screen.orientation = orientation
  }

  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false
      },
    })
  }
}
