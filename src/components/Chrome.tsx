import { useEffect, useRef, useState } from 'react'
import { BRAND, NAV, SCENES } from '../content'

/** Wordmark: SULD with the category lockup on its baseline. */
export function Logo() {
  return (
    <span className="flex items-baseline gap-[0.6rem]">
      <span className="font-serif text-[24px] leading-none tracking-[0.18em]">{BRAND.name}</span>
      <span className="font-mono text-[8px] tracking-[0.24em] opacity-80">{BRAND.suffix}</span>
    </span>
  )
}

/**
 * Scrolls to a point inside the pinned story.
 *
 * The scenes are timeline positions, not elements, so an `#id` anchor cannot reach them —
 * every anchor after the pin resolves to the same offset. `at` is the master timeline's
 * 0–1 progress, mapped here onto the pin spacer's scroll range.
 */
export function scrollToScene(at: number): boolean {
  const spacer = document.querySelector<HTMLElement>('.pin-spacer')
  if (!spacer) return false
  const distance = spacer.offsetHeight - innerHeight
  if (distance <= 0) return false
  scrollTo({ top: Math.round(spacer.offsetTop + distance * at), behavior: 'smooth' })
  return true
}

/**
 * Minimal navbar.
 *
 * A stable translucent ivory surface keeps dark type readable across every film frame
 * and the collection. Contrast does not depend on scroll position or scene color.
 */
export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header" data-menu-open={open}>
      <div className="nav-inner">
        <a
          href="#top"
          aria-label={`${BRAND.full} — эхлэл`}
          onClick={event => { event.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }) }}
        >
          <Logo />
        </a>

        <nav className="hidden items-center gap-[2.25rem] lg:flex" aria-label="Үндсэн цэс">
          {NAV.map(item => (
            <button
              key={item.label}
              type="button"
              className="nav-link"
              onClick={() => scrollToScene(item.at)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="nav-tools flex items-center gap-[1.25rem]">
          <span className="nav-edition">{BRAND.year}</span>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Цэс хаах' : 'Цэс нээх'}
            onClick={() => setOpen(v => !v)}
          >
            <span className="relative block h-3 w-6" aria-hidden="true">
              <span
                className="absolute left-0 block h-px w-full bg-current transition-transform duration-300"
                style={{ top: open ? 6 : 1, transform: open ? 'rotate(45deg)' : 'none' }}
              />
              <span
                className="absolute left-0 block h-px w-full bg-current transition-transform duration-300"
                style={{ top: open ? 6 : 10, transform: open ? 'rotate(-45deg)' : 'none' }}
              />
            </span>
          </button>
        </div>
      </div>

      <nav
        id="mobile-nav"
        hidden={!open}
        aria-label="Гар утасны цэс"
        className="mobile-nav lg:hidden"
      >
        {NAV.map((item, i) => (
          <button
            key={item.label}
            type="button"
            className="flex w-full items-baseline gap-[1.25rem] border-t border-[var(--charcoal)]/15 py-[1rem] text-left text-[18px]"
            onClick={() => { scrollToScene(item.at); setOpen(false) }}
          >
            <span className="meta opacity-40">{String(i + 1).padStart(2, '0')}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  )
}

/**
 * Custom cursor. Fine pointer, motion-safe, desktop only.
 *
 * Position is written straight to the node inside a rAF so pointer movement never enters
 * React. The label comes from the nearest `data-cursor` ancestor, which keeps states to
 * the handful of places that earn one.
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState('')

  useEffect(() => {
    const fine = matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)')
    if (!fine.matches) return

    let x = innerWidth / 2, y = innerHeight / 2
    let cx = x, cy = y
    let frame = 0
    let current = ''

    const move = (event: PointerEvent) => {
      x = event.clientX
      y = event.clientY
      const host = (event.target as Element)?.closest?.('[data-cursor]')
      const next = host?.getAttribute('data-cursor') ?? ''
      if (next !== current) {
        current = next
        setLabel(next)
        ring.current?.classList.toggle('is-on', Boolean(next))
      }
    }
    const loop = () => {
      cx += (x - cx) * 0.18
      cy += (y - cy) * 0.18
      if (ring.current) ring.current.style.transform = `translate3d(${cx}px, ${cy}px, 0)`
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    addEventListener('pointermove', move, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('pointermove', move)
    }
  }, [])

  return <div ref={ring} className="cursor-ring" aria-hidden="true">{label}</div>
}

/**
 * Progress thread.
 *
 * A single vertical line whose filled length tracks the story, with the current scene
 * named beside it — the indicator reads as a thread being drawn, which is the subject of
 * the page. Driven by the `progress` prop the stage already computes, so it costs no extra
 * scroll listener.
 */
export function ProgressThread({ progress, shown }: { progress: number; shown: boolean }) {
  const active = SCENES.reduce((found, scene, i) => (progress >= scene.from ? i : found), 0)
  const scene = SCENES[active]

  return (
    <div
      className="pointer-events-none fixed right-[1.75rem] top-1/2 z-[250] hidden -translate-y-1/2 flex-row-reverse items-center gap-[1rem] transition-opacity duration-700 xl:flex"
      style={{ opacity: shown ? 1 : 0, color: progress >= 0.94 ? 'var(--ivory)' : 'var(--ink)' }}
      aria-hidden="true"
    >
      <div className="relative h-[34vh] w-px bg-current/20">
        <div
          className="absolute inset-x-0 top-0 bg-current/85 will-change-transform"
          style={{ height: `${progress * 100}%` }}
        />
      </div>
      <div className="text-right">
        <p className="meta opacity-85">{scene.n}</p>
        <p className="meta mt-[0.4rem] !text-[11px] opacity-80">{scene.en}</p>
      </div>
    </div>
  )
}
