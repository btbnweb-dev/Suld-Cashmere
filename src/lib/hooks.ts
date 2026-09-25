import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof matchMedia === 'function' ? matchMedia(query).matches : false)
  useEffect(() => {
    const media = matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')
export const useIsMobile = () => useMedia('(max-width: 900px)')
export const useIsTouch = () => useMedia('(pointer: coarse)')

/**
 * Runs a GSAP setup inside a scoped context.
 *
 * `gsap.context` collects every tween and ScrollTrigger created inside it, so one revert
 * tears the whole scene down. That is what makes StrictMode's double mount safe — the
 * first pass is fully undone before the second builds, leaving no duplicate pins.
 *
 * Layout phase, so pins are measured before paint and the page never flashes unpinned.
 */
export function useGsap(
  setup: (root: HTMLElement, context: gsap.Context) => void,
  deps: React.DependencyList = [],
) {
  const scope = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const root = scope.current
    if (!root) return
    const context = gsap.context(self => setup(root, self), scope)
    return () => context.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return scope
}

/**
 * Recomputes ScrollTrigger measurements once fonts and images settle.
 *
 * Pin distances come from element heights, and those change when a webfont swaps in or a
 * lazy image finally lays out. Without this, every pin is measured against stale geometry.
 */
export function useScrollRefresh() {
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh()
    const timer = setTimeout(refresh, 300)
    document.fonts?.ready.then(refresh).catch(() => {})
    addEventListener('load', refresh)
    return () => {
      clearTimeout(timer)
      removeEventListener('load', refresh)
    }
  }, [])
}

/**
 * Re-measures on width change only.
 *
 * Mobile browsers fire `resize` as the URL bar collapses. Re-measuring pins mid-scroll on
 * that event makes the page jump, so only a real width change counts.
 */
export function useResizeRefresh() {
  useEffect(() => {
    let width = innerWidth
    let timer = 0
    const onResize = () => {
      if (innerWidth === width) return
      width = innerWidth
      clearTimeout(timer)
      timer = setTimeout(() => ScrollTrigger.refresh(), 180)
    }
    addEventListener('resize', onResize)
    return () => {
      clearTimeout(timer)
      removeEventListener('resize', onResize)
    }
  }, [])
}

/** Clamped 0→1 ramp over [a,b] — the building block for every progress-driven value. */
export const ramp = (v: number, a: number, b: number) =>
  Math.min(1, Math.max(0, (v - a) / (b - a)))

/** Rises 0→1 over [a,b] then falls back to 0 over [c,d]. Used to fade a scene in and out. */
export const band = (v: number, a: number, b: number, c: number, d: number) =>
  Math.min(ramp(v, a, b), 1 - ramp(v, c, d))

export { gsap, ScrollTrigger }
