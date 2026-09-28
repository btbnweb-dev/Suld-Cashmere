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
  /** Index of the frame actually on the canvas; -1 before the first paint. */
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
   * Draw frame `i`, or hold whatever is already on the canvas.
   *
   * There is deliberately no nearest-neighbour substitution. An earlier version searched
   * outwards for any decoded frame, which was tolerable only while the cache was a
   * contiguous block from 0: the substitute was then an immediate neighbour and looked
   * near-identical. Once the loader began filling around the reader, the cache became
   * sparse and the nearest decoded frame could be twenty indices away, in a different
   * chapter — so the canvas visibly popped between unrelated images while scrolling.
   *
   * Holding the last correct frame for a moment is far less noticeable than jumping to the
   * wrong one, so a missing frame now paints nothing and simply waits for `load` to arrive.
   */
  const drawFrame = (i: number) => {
    const idx = Math.min(frameCount - 1, Math.max(0, i))
    const img = images[idx]
    if (!img) return
    if (painted !== idx) { drawCover(img); painted = idx }
  }

  const load = (i: number) => new Promise<void>(resolve => {
    if (disposed || images[i]) return resolve()
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      images[i] = img
      // Paint immediately if this is the frame the scroll is sitting on: `onUpdate` does
      // not fire while the reader is still, so a frame that arrives during a hold has to
      // draw itself or the canvas would stay on the previous one.
      if (!disposed && wanted === i) drawFrame(i)
      resolve()
    }
    img.onerror = () => resolve()
    img.src = frameURL(dir, i)
  })

  /**
   * Staged preload: the opening run first, then a priority window around the reader, then
   * the rest in order.
   *
   * The original loader walked 0…159 strictly in order. That kept the cache contiguous,
   * which is what made the film look smooth, but it meant a visitor entering part-way — a
   * reload mid-scroll, or a nav link into a later chapter — waited for every earlier frame
   * before the one on screen was even requested.
   *
   * The fix is only about priority, not order. Frames are still fetched in ascending runs,
   * so the cache stays in contiguous blocks; the loader simply starts with the block the
   * reader is actually in. `sweep` fills an ascending range and skips what is already held,
   * so no frame is fetched twice however the windows overlap.
   */
  ;(async () => {
    await load(0)
    if (disposed) return
    // Frame 0 can take seconds on a slow connection, by which time the reader may already
    // be deep in the film. Only paint it if nothing else has been painted yet.
    if (painted < 0) drawFrame(0)
    options.onReady?.()

    /**
     * Load `from`…`to` in ascending order, skipping frames already held.
     *
     * Ascending and contiguous is the point: it is what keeps the decoded cache in solid
     * blocks, so a frame that is not ready is surrounded by frames that are, and the hold
     * is brief. `abort` lets a sweep give way when the reader has moved elsewhere.
     */
    const sweep = async (from: number, to: number, abort?: () => boolean) => {
      for (let i = Math.max(0, from); i <= Math.min(frameCount - 1, to) && !disposed; i++) {
        if (abort?.()) return
        if (!images[i]) await load(i)
      }
    }

    // The opening run, so the start is scrubbable immediately. It yields as soon as the
    // reader has moved out of it, so entering the film part-way is not made to wait for
    // thirty frames nobody is looking at.
    await sweep(1, 29, () => wanted > 29)

    // Then keep serving the reader's own neighbourhood before filling the gaps. `wanted`
    // is re-read every pass, so someone who jumps mid-download is picked up on the next
    // window rather than after the whole sequence drains.
    while (!disposed) {
      const at = wanted
      // Ascending window that leads the reader slightly: forward scrolling is the common
      // case, and a small backward margin covers reverse scrubbing.
      await sweep(at - 8, at + 24)
      if (disposed) return
      // Nothing left to do for this position — fill the earliest remaining gap so the
      // sequence still completes, then re-check where the reader has moved to.
      if (wanted === at) {
        const gap = images.findIndex(img => !img)
        if (gap < 0) return
        await sweep(gap, gap + 11)
      }
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
      // Direct scroll-to-frame, unchanged: no tweened playhead sits between the two.
      // `wanted` is set before the draw and regardless of it, because the loader steers by
      // it and a frame that cannot be drawn yet is exactly the one to prioritise.
      wanted = frame
      if (frame !== painted) drawFrame(frame)
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
