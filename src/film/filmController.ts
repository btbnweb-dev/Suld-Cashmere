import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Scroll-scrubbed frame sequence, deliberately framework-independent.
 *
 * This module owns the canvas context, the decode cache, the ScrollTrigger and the frame
 * mapping. React only mounts it and tears it down. Keeping the scrub outside the component
 * tree is not stylistic: an earlier React-hosted version advanced its playhead correctly
 * while drawing exactly once, because StrictMode's double mount left the surviving trigger
 * and the surviving draw holding state from different mounts. Plain module scope removes
 * that whole class of failure.
 *
 * The mapping is the proven one and must stay literal:
 *
 *   onUpdate(self) -> frame = round(self.progress * (count - 1)) -> drawFrame(frame)
 *
 * No tweened playhead sits between scroll and the draw.
 */

export type FilmOptions = {
  canvas: HTMLCanvasElement
  /** Pinned element; stays fixed while the film plays. */
  stage: HTMLElement
  /** Scroll container that defines the film's length. */
  trigger: HTMLElement
  frameCount: number
  /** Directory holding frame-0001.webp … */
  dir: string
  /** Pin length, e.g. '+=900%'. */
  end: string
  scrub: number | boolean
  /** Fired with 0–1 progress; for chrome only, never per-frame React state. */
  onProgress?: (p: number) => void
  /** Fired once the first frame has painted. */
  onReady?: () => void
  /** Optional per-frame hook, used by the debug HUD. */
  onFrame?: (frame: number, progress: number) => void
}

export type FilmHandle = { destroy: () => void }

const frameURL = (dir: string, i: number) =>
  `${dir}/frame-${String(i + 1).padStart(4, '0')}.webp`

export function mountFilm(options: FilmOptions): FilmHandle {
  const { canvas, stage, trigger, frameCount, dir, end, scrub } = options
  const ctx = canvas.getContext('2d')
  if (!ctx) return { destroy: () => {} }

  const images: (HTMLImageElement | null)[] = new Array(frameCount).fill(null)
  let current = -1
  let disposed = false

  /** object-fit: cover, computed rather than stretched. */
  const drawCover = (img: HTMLImageElement) => {
    // DPR is capped at 2: beyond that the canvas costs more to fill than the extra
    // sharpness is worth, and this has to stay smooth on integrated graphics.
    const dpr = Math.min(devicePixelRatio || 1, 2)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const dw = img.naturalWidth * s
    const dh = img.naturalHeight * s
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
  }

  /** Draw frame `i`, falling back to the nearest decoded neighbour. */
  const drawFrame = (i: number) => {
    const idx = Math.min(frameCount - 1, Math.max(0, i))
    let img = images[idx]
    if (!img) {
      // A gap in the cache shows a slightly stale frame rather than a blank canvas.
      for (let d = 1; d < frameCount && !img; d++) {
        img = images[idx - d] ?? images[idx + d] ?? null
      }
    }
    if (!img) return
    drawCover(img)
    current = idx
  }

  const load = (i: number) => new Promise<void>(resolve => {
    if (disposed || images[i]) return resolve()
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => { images[i] = img; resolve() }
    img.onerror = () => resolve()
    img.src = frameURL(dir, i)
  })

  // Staged preload. The first frame gates the loading state; the opening run follows so the
  // start is scrubbable immediately; the remainder streams in small batches so decoding
  // never blocks the scroll thread.
  ;(async () => {
    await load(0)
    if (disposed) return
    drawFrame(0)
    options.onReady?.()
    const head = Math.min(frameCount, 30)
    for (let i = 1; i < head && !disposed; i++) await load(i)
    for (let i = head; i < frameCount && !disposed; i += 6) {
      await Promise.all(
        Array.from({ length: 6 }, (_, k) => (i + k < frameCount ? load(i + k) : Promise.resolve())),
      )
    }
  })()

  const st = ScrollTrigger.create({
    trigger,
    start: 'top top',
    end,
    scrub,
    pin: stage,
    pinSpacing: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: self => {
      const frame = Math.round(self.progress * (frameCount - 1))
      if (frame !== current) drawFrame(frame)
      options.onProgress?.(self.progress)
      options.onFrame?.(frame, self.progress)
    },
  })

  const onResize = () => { if (current >= 0) drawFrame(current) }
  addEventListener('resize', onResize)

  return {
    destroy() {
      disposed = true
      removeEventListener('resize', onResize)
      st.kill()
      images.fill(null)
    },
  }
}
