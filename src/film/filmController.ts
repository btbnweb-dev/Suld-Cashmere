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
  /** Index of the image actually on the canvas — a substitute's index when one is showing. */
  let painted = -1
  /**
   * Frame the scroll position wants. Written only by `onUpdate` — the scroll owns it — and
   * read by the loader, so the frames under the reader are fetched before the ones nobody
   * is looking at. A draw must never write it: the opening `drawFrame(0)` lands seconds
   * late on a slow connection, and resetting it there sent the loader back to index 0.
   */
  let wanted = 0
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

  /**
   * Draw frame `i`, falling back to the nearest decoded neighbour.
   *
   * `current` records what is actually on the canvas, so it is only advanced when the exact
   * frame was drawn. Recording a substituted neighbour as `current` made `onUpdate`'s
   * `frame !== current` guard believe the right image was already up: the correct frame
   * then arrived from the network and was never drawn, and the canvas stayed frozen on the
   * substitute until the frame index happened to change again.
   */
  const drawFrame = (i: number) => {
    const idx = Math.min(frameCount - 1, Math.max(0, i))
    const exact = images[idx]
    if (exact) {
      if (painted !== idx) { drawCover(exact); painted = idx }
      current = idx
      return
    }
    // No exact frame. Show the nearest decoded neighbour rather than a blank canvas, but
    // leave `current` short of `idx` so the substitute is never mistaken for the real thing.
    let sub: HTMLImageElement | null = null
    let subIdx = -1
    for (let d = 1; d < frameCount && !sub; d++) {
      if (images[idx - d]) { sub = images[idx - d]!; subIdx = idx - d }
      else if (images[idx + d]) { sub = images[idx + d]!; subIdx = idx + d }
    }
    if (!sub) return
    if (painted !== subIdx) { drawCover(sub); painted = subIdx }
    current = -1
  }

  const load = (i: number) => new Promise<void>(resolve => {
    if (disposed || images[i]) return resolve()
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      images[i] = img
      // Repaint if this is the frame the scroll is sitting on. `onUpdate` does not fire
      // while the reader is still, so without this the canvas would keep showing a
      // substituted neighbour even though the real frame has arrived.
      if (!disposed && wanted === i && painted !== i) drawFrame(i)
      resolve()
    }
    img.onerror = () => resolve()
    img.src = frameURL(dir, i)
  })

  /**
   * Staged preload, continuously re-aimed at the reader.
   *
   * The original version awaited frames strictly in index order from 0. That is fine if the
   * visitor starts at the top and scrolls steadily, and badly wrong otherwise: entering the
   * film part-way — a reload mid-scroll, or a nav link into a later chapter — left the frame
   * actually on screen queued behind every earlier one, so on a slow connection the canvas
   * held the same image for tens of seconds. That is the reported stall.
   *
   * Two properties matter here and a batched loop has neither. The next frame to fetch is
   * chosen one at a time, so a reader who jumps is served by the very next request rather
   * than after the current batch drains; and several requests stay in flight, so the pipe
   * stays full while still being re-aimed between each completion.
   */
  ;(async () => {
    await load(0)
    if (disposed) return
    // Frame 0 can take seconds on a slow connection, by which time the reader may already
    // be deep in the film. Only paint it if nothing better is called for; `wanted` is owned
    // by the scroll, so drawing must never write to it.
    if (painted < 0 && wanted === 0) drawFrame(0)
    options.onReady?.()

    const remaining = new Set<number>()
    for (let i = 1; i < frameCount; i++) remaining.add(i)

    /** Nearest still-missing frame to where the reader actually is. */
    const claimNearest = (): number | null => {
      let best: number | null = null
      let bestDistance = Infinity
      for (const i of remaining) {
        const d = Math.abs(i - wanted)
        if (d < bestDistance) { bestDistance = d; best = i }
      }
      if (best !== null) remaining.delete(best)
      return best
    }

    // Enough parallelism to keep the connection busy, few enough that a jump is reflected
    // within one frame's transfer rather than a whole batch's.
    const LANES = 4
    const lane = async () => {
      while (!disposed) {
        const i = claimNearest()
        if (i === null) return
        await load(i)
        if (disposed) return
        // The frame under the reader may have just landed.
        if (painted !== wanted && images[wanted]) drawFrame(wanted)
      }
    }
    await Promise.all(Array.from({ length: LANES }, lane))
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
      // Direct scroll-to-frame, unchanged: no tweened playhead sits between the two.
      // `wanted` is set unconditionally and before the draw: the loader steers by it, and
      // leaving it behind (as an early return from `drawFrame` would) sends the loader off
      // fetching frames nobody is looking at.
      wanted = frame
      if (frame !== current) drawFrame(frame)
      options.onProgress?.(self.progress)
      options.onFrame?.(frame, self.progress)
    },
  })

  // `painted` suppresses redundant draws, so a resize has to invalidate it explicitly or
  // the canvas would keep the old backing-store size after the viewport changes.
  const onResize = () => { painted = -1; drawFrame(wanted) }
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
