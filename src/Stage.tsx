import { useRef } from 'react'
import { gsap, useGsap } from './lib/hooks'
import { BRAND, SCENES, SCENE_COPY, alt, src, srcSet } from './content'

/**
 * Layer inside the pinned stage.
 *
 * Every scene is a full-bleed absolutely positioned layer stacked in one place. The master
 * timeline moves them in and out, which is what makes the story read as one continuous
 * transformation rather than as sections scrolling past: nothing ever leaves the frame,
 * it dissolves into the next material.
 */
function Layer({
  id, z = 0, children, className = '', flow = false,
}: {
  id: string
  z?: number
  children: React.ReactNode
  className?: string
  /** Static mode: the layer becomes an ordinary block instead of stacking absolutely. */
  flow?: boolean
}) {
  return (
    <div
      data-layer={id}
      className={(flow ? 'relative h-[78svh] w-full overflow-hidden ' : 'absolute inset-0 ') + className}
      style={flow ? undefined : { zIndex: z }}
    >
      {children}
    </div>
  )
}

/** Full-bleed photographic layer. */
function Photo({ name, className = '', priority = false }: {
  name: string
  className?: string
  priority?: boolean
}) {
  return (
    <div className="frame absolute inset-0 h-full w-full">
      <img
        src={src(name)}
        srcSet={srcSet(name)}
        sizes="100vw"
        alt={alt(name)}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        {...(priority ? { fetchPriority: 'high' as const } : {})}
      />
    </div>
  )
}

/** Scene copy block, positioned and revealed by the timeline. */
function Copy({
  id, lines, meta, tags, tone = 'light', place = 'center', flow = false, as = 'h2',
}: {
  id: string
  lines: readonly string[]
  meta?: readonly string[]
  tags?: readonly string[]
  tone?: 'light' | 'dark'
  place?: 'center' | 'left' | 'bottom'
  flow?: boolean
  /** The opening scene carries the page's only h1. */
  as?: 'h1' | 'h2'
}) {
  const Head = as
  const colour = tone === 'light' ? 'text-[var(--ivory)]' : 'text-[var(--charcoal)]'
  const box = place === 'left'
    ? 'items-start justify-center text-left'
    : place === 'bottom'
      ? 'items-start justify-end pb-[18vh] text-left'
      : 'items-center justify-center text-center'

  return (
    <div
      data-copy={id}
      className={
        `pointer-events-none absolute inset-0 flex flex-col ${box} px-[1.5rem] sm:px-[3rem] ${colour}`
      }
    >
      <div className={!flow && place === 'center' ? 'mx-auto max-w-[900px]' : 'w-full max-w-[1500px]'}>
        {meta && (
          <p data-copy-meta className="meta mb-[1.75rem] opacity-70">
            {meta.join(' · ')}
          </p>
        )}
        <Head data-copy-head className="display text-[clamp(30px,5.4vw,78px)]">
          {lines.map((line, i) => (
            <span className="line" key={i}>
              <span>{line}{i < lines.length - 1 ? ' ' : ''}</span>
            </span>
          ))}
        </Head>
        {tags && (
          <ul data-copy-tags className="mt-[2rem] flex flex-wrap gap-x-[2rem] gap-y-[0.75rem]">
            {tags.map(tag => (
              <li key={tag} className="meta opacity-60">{tag}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * THE STAGE — one pinned scene running the whole cashmere story.
 *
 * A single master timeline scrubs eight scenes: raw fibre → drawn strands → spun thread →
 * woven grid → fabric → garment silhouette → editorial → final reveal. Every scene overlaps
 * its neighbour, so no frame is ever a hard cut, and because it is scrubbed the whole thing
 * runs backwards exactly as well as forwards.
 *
 * `onProgress` reports scroll position for the chapter indicator. It is the only value that
 * crosses into React, rounded so it updates on visible change rather than per frame.
 */
export function Stage({
  mobile, motion, onProgress,
}: {
  mobile: boolean
  motion: boolean
  onProgress: (p: number) => void
}) {
  const stage = useRef<HTMLDivElement>(null)
  // Without motion the stage cannot stack layers on top of one another — there is no
  // timeline to separate them in time, so they must be separated in space instead.
  const flow = !motion

  const scope = useGsap(root => {
    const q = gsap.utils.selector(root)
    const layer = (id: string) => q(`[data-layer="${id}"]`)[0] as HTMLElement
    const copy = (id: string) => q(`[data-copy="${id}"]`)[0] as HTMLElement
    const heads = q('[data-copy-head] .line > span') as HTMLElement[]

    // ---- initial state -------------------------------------------------------
    // Everything starts hidden except the opening fibre frame; the timeline is the only
    // thing that reveals a layer, so a partial load can never show a half-built scene.
    gsap.set(q('[data-layer]'), { autoAlpha: 0 })
    gsap.set(q('[data-copy]'), { autoAlpha: 0 })
    gsap.set(heads, { yPercent: 108 })
    gsap.set(layer('origin'), { autoAlpha: 1 })

    if (!motion) {
      // Reduced motion: show the story as a plain readable stack, no pin, no scrub.
      gsap.set(q('[data-layer]'), { autoAlpha: 1 })
      gsap.set(q('[data-copy]'), { autoAlpha: 1 })
      gsap.set(heads, { yPercent: 0 })
      return
    }

    const reveal = (id: string, atPct: number, outPct?: number) => {
      const node = copy(id)
      if (!node) return
      const spans = node.querySelectorAll('[data-copy-head] .line > span')
      // Entry is quick and the exit is quicker, so two headings are never both legible —
      // the previous block is essentially gone before the next is readable.
      tl.to(node, { autoAlpha: 1, duration: 1.2 }, atPct)
      tl.to(spans, { yPercent: 0, duration: 2, stagger: 0.25, ease: 'expo.out' }, atPct)
      // `fromTo`, not `from`: a `from` tween records the element's value when the timeline
      // is built — which is the hidden state — and then fights the reveal above it for
      // control of the same opacity.
      tl.fromTo(node.querySelectorAll('[data-copy-meta], [data-copy-tags]'),
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 1.4, stagger: 0.12 }, atPct + 0.6)
      if (outPct !== undefined) tl.to(node, { autoAlpha: 0, y: -24, duration: 0.9 }, outPct)
    }

    // Timeline is 100 units long; scene boundaries map straight onto the brief's
    // percentages, so a scene's position in code matches its position on screen.
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '#story',
        start: 'top top',
        end: mobile ? '+=620%' : '+=1050%',
        scrub: mobile ? 0.5 : 0.85,
        pin: '#stage',
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: self => {
          onProgress(Math.round(self.progress * 1000) / 1000)
          // The in-stage counter is written directly rather than through state: it changes
          // on nearly every frame and must never trigger a React render.
          const node = root.querySelector('[data-scene-n]')
          if (node) {
            const n = SCENES.reduce((found, sc) => (self.progress >= sc.from ? sc.n : found), '01')
            if (node.textContent !== n) node.textContent = n
          }
        },
      },
    })

    // ---- opening ----
    // The first frame has to present itself before any scrolling happens. A scrubbed
    // timeline plays nothing at progress 0, so the entry runs on its own clock: the image
    // settles from 1.06, the wordmark is uncovered, and the metadata follows.
    const originCopy = copy('origin')
    const originSpans = originCopy.querySelectorAll('[data-copy-head] .line > span')
    gsap.set(originCopy, { autoAlpha: 1 })
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .fromTo(layer('origin').querySelector('img'),
        { scale: 1.06 }, { scale: 1, duration: 2.4 }, 0)
      .to(originSpans, { yPercent: 0, duration: 1.5, stagger: 0.12 }, 0.3)
      .from(originCopy.querySelectorAll('[data-copy-meta]'),
        { autoAlpha: 0, y: 14, duration: 1 }, 1.0)

    // Motion scale. Every transform below is expressed in viewport units, so the travel is
    // the same fraction of the screen at any size. Mobile gets ~60% of the distance so a
    // composition built for a wide frame is not thrown off a narrow one.
    const M = mobile ? 0.6 : 1
    const vw = (n: number) => (n * M) + 'vw'
    const vh = (n: number) => (n * M) + 'vh'

    // ================= 01 ORIGIN 0-12% =================
    // The camera pushes bodily into the fibre: a third again in scale plus a vertical rise,
    // so the frame is visibly travelling well before the first handover.
    tl.fromTo(layer('origin').querySelector('img'),
      { scale: 1, yPercent: 0 },
      { scale: 1.42, yPercent: -9 * M, duration: 12 }, 0)
    tl.to(originCopy, { autoAlpha: 0, y: -30, duration: 2 }, 9)
    tl.to(layer('origin'), { autoAlpha: 0, duration: 4 }, 10)

    // ================= 02 FIBER 12-27% =================
    tl.to(layer('fiber'), { autoAlpha: 1, duration: 3 }, 10)
    // Background plate: the slowest layer, so the strands in front read as nearer.
    tl.fromTo(layer('fiber').querySelector('img'),
      { scale: 1.3, xPercent: 4 * M }, { scale: 1.02, xPercent: -4 * M, duration: 16 }, 10)
    // Three strand bands at different speeds. The differential is what creates depth: if
    // they all moved together the scene would read flat however far it travelled.
    tl.fromTo(q('[data-strands="back"]'),
      { x: vw(-8), y: vh(4) }, { x: vw(7), y: vh(-3), duration: 22, ease: 'sine.inOut' }, 6)
    tl.fromTo(q('[data-strands="mid"]'),
      { x: vw(-20), y: vh(8) }, { x: vw(16), y: vh(-7), duration: 22, ease: 'sine.inOut' }, 6)
    tl.fromTo(q('[data-strands="fore"]'),
      { x: vw(-38), y: vh(13), scale: 1.25 },
      { x: vw(30), y: vh(-12), scale: 1, duration: 22, ease: 'sine.inOut' }, 6)
    tl.fromTo(q('[data-strand]'),
      { autoAlpha: 0 }, { autoAlpha: 0.95, duration: 9, stagger: 0.5, ease: 'sine.out' }, 6)
    tl.to(q('[data-strand]'), { autoAlpha: 0, duration: 4, stagger: 0.2 }, 24)
    reveal('fiber', 11, 24.5)
    tl.to(layer('fiber'), { autoAlpha: 0, duration: 3 }, 25)

    // ================= 03 SPINNING 27-40% =================
    tl.to(layer('spinning'), { autoAlpha: 1, duration: 3 }, 25)
    // Loose strands enter spread apart and converge onto one axis. The spread closing IS
    // the transformation, so it is animated as position, not as opacity.
    tl.fromTo(q('[data-spin-band]'),
      { x: vw(-30), y: (i: number) => vh((i - 2.5) * 9), scaleY: 1 },
      { x: vw(24), y: 0, scaleY: 0.18, duration: 15, ease: 'power2.inOut', stagger: 0.5 }, 26)
    tl.fromTo(q('[data-spin-line]'),
      { autoAlpha: 0 }, { autoAlpha: 0.75, duration: 5, stagger: 0.2 }, 26)
    // The merged thread then crosses the frame as one object.
    tl.fromTo(q('[data-twist-wrap]'),
      { x: vw(-34) }, { x: vw(28), duration: 14, ease: 'sine.inOut' }, 30)
    tl.fromTo(q('[data-twist]'),
      { strokeDashoffset: 900, autoAlpha: 0 },
      { strokeDashoffset: 0, autoAlpha: 1, duration: 9 }, 30)
    tl.to(q('[data-spin-line]'), { autoAlpha: 0, duration: 4 }, 36)
    tl.fromTo(layer('spinning').querySelector('img'),
      { scale: 1.34, xPercent: -6 * M, autoAlpha: 0 },
      { scale: 1.04, xPercent: 5 * M, autoAlpha: 0.9, duration: 12 }, 30)
    reveal('spinning', 26, 37.5)
    tl.to(layer('spinning'), { autoAlpha: 0, duration: 3 }, 38)

    // ================= 04 WEAVE 40-55% =================
    tl.to(layer('weaving'), { autoAlpha: 1, duration: 3 }, 38)
    // The cloth is built in stages and the whole surface grows through it, so the
    // construction stays legible: warp slides in, weft drops in, the grid expands past
    // full size rather than simply appearing.
    tl.fromTo(q('[data-weave-grid]'),
      { scale: 0.72, y: vh(6) }, { scale: 1.18, y: vh(-5), duration: 18, ease: 'none' }, 39)
    tl.fromTo(q('[data-warp-wrap]'),
      { x: vw(-26) }, { x: 0, duration: 9, ease: 'power2.out' }, 40)
    tl.fromTo(q('[data-warp]'),
      { strokeDashoffset: 200, autoAlpha: 0 },
      { strokeDashoffset: 0, autoAlpha: 0.9, duration: 7, stagger: 0.16 }, 40)
    tl.fromTo(q('[data-weft-wrap]'),
      { y: vh(-24) }, { y: 0, duration: 9, ease: 'power2.out' }, 45)
    tl.fromTo(q('[data-weft]'),
      { strokeDashoffset: 200, autoAlpha: 0 },
      { strokeDashoffset: 0, autoAlpha: 0.9, duration: 7, stagger: 0.13 }, 45)
    reveal('weaving', 39, 49.5)
    // The cloth beneath is established before a line is removed, and keeps travelling into
    // the fabric scene so the two share a direction at the handover.
    tl.to(layer('weaving').querySelector('img'), { autoAlpha: 1, duration: 7 }, 46)
    tl.fromTo(layer('weaving').querySelector('img'),
      { scale: 1, xPercent: 0 }, { scale: 1.3, xPercent: -7 * M, duration: 12 }, 46)
    tl.to(q('[data-weave-grid]'), { autoAlpha: 0, duration: 7 }, 50)
    tl.to(layer('fabric'), { autoAlpha: 1, duration: 5 }, 52)
    tl.to(layer('weaving'), { autoAlpha: 0, duration: 5 }, 55)

    // ================= 05 FABRIC 55-68% =================
    // A camera crossing the cloth: the texture travels diagonally while scaling well past
    // the frame, which is what makes the surface feel physically large.
    tl.fromTo(layer('fabric').querySelector('img'),
      { scale: 1, x: vw(9), y: vh(5) },
      { scale: 1.5, x: vw(-9), y: vh(-7), duration: 18, ease: 'none' }, 51)
    // The sheen runs at its own rate, so light crosses a surface that is itself moving
    // rather than appearing painted onto it.
    tl.fromTo(q('[data-sheen]'),
      { x: vw(-60), autoAlpha: 0 },
      { x: vw(60), autoAlpha: 0.95, duration: 13, ease: 'sine.inOut' }, 54)
    reveal('fabric', 51, 65.5)
    tl.to(layer('fabric'), { autoAlpha: 0, duration: 3 }, 66)

    // ================= 06 FORM 68-81% =================
    tl.to(layer('form'), { autoAlpha: 1, duration: 3 }, 66)
    // The fabric plate keeps moving under the aperture, so the cloth is visibly being cut
    // into a garment shape rather than swapped for a photograph of one.
    tl.fromTo(layer('form').querySelector('img'),
      { scale: 1.28, x: vw(-7) }, { scale: 1.02, x: vw(6), duration: 16 }, 66)
    tl.fromTo(q('[data-silhouette]'),
      { clipPath: 'inset(100% 0 0 0)', y: vh(10), scale: 1.1 },
      { clipPath: 'inset(0% 0 0 0)', y: 0, scale: 1, duration: 10, ease: 'power2.inOut' }, 68)
    // The finished piece travels in from off-frame and settles. It moves; it does not fade.
    tl.fromTo(q('[data-garment]'),
      { autoAlpha: 0, x: vw(26), y: vh(5), scale: 0.78, rotate: 3 },
      { autoAlpha: 1, x: vw(-4), y: vh(-3), scale: 1.12, rotate: -1, duration: 20, ease: 'none' }, 69)
    tl.to(q('[data-silhouette]'), { x: vw(-16), autoAlpha: 0, duration: 7 }, 74)
    reveal('form', 67, 79.5)
    tl.to(layer('form'), { autoAlpha: 0, duration: 3 }, 79)

    // ================= 07 EDITORIAL 81-93% =================
    tl.to(layer('editorial'), { autoAlpha: 1, duration: 3 }, 79)
    // Three frames crossing the viewport at different depths and rates. B is the near
    // frame: it travels furthest and scales largest, so it reads as passing close to the
    // viewer while A settles as the dominant image and C drifts behind.
    tl.fromTo(q('[data-ed="a"]'),
      { x: vw(42), y: vh(6), scale: 0.78, rotate: 3 },
      { x: vw(-18), y: vh(-4), scale: 1.1, rotate: -1, duration: 16, ease: 'none' }, 79)
    tl.fromTo(q('[data-ed="b"]'),
      { x: vw(-38), y: vh(16), scale: 0.9, rotate: -4 },
      { x: vw(16), y: vh(-11), scale: 1.34, rotate: 2, duration: 16, ease: 'none' }, 80)
    tl.fromTo(q('[data-ed="c"]'),
      { x: vw(8), y: vh(42), scale: 0.66, rotate: 2 },
      { x: vw(-6), y: vh(-26), scale: 1.02, rotate: -2, duration: 16, ease: 'none' }, 81)
    tl.fromTo(q('[data-ed]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 5, stagger: 0.6 }, 79)
    reveal('editorial', 81, 95)
    tl.to(layer('editorial'), { autoAlpha: 0, duration: 4 }, 96)

    // ================= 08 REVEAL 93-100% =================
    tl.to(layer('reveal'), { autoAlpha: 1, duration: 4 }, 96)
    // The closing image settles: it arrives large and slightly low, then comes to rest.
    // After a whole story of travel, the final frame earns stillness.
    tl.fromTo(layer('reveal').querySelector('img'),
      { scale: 1.32, y: vh(8) }, { scale: 1, y: 0, duration: 11, ease: 'power2.out' }, 96)
    reveal('reveal', 99)
    // A deliberate hold: the pin must not release the instant the headline becomes
    // readable, or the campaign cover is gone before it has registered.
    tl.to({}, { duration: 7 })
  }, [mobile, motion])

  const C = SCENE_COPY

  return (
    <section
      ref={scope as React.Ref<HTMLElement>}
      id="story"
      className="relative"
      aria-label="SULD Cashmere — ноолуурын түүх"
    >
      <div
        id="stage"
        ref={stage}
        className={(flow ? 'relative w-full ' : 'relative h-[100svh] min-h-[540px] w-full overflow-hidden ') + 'bg-[var(--ink)]'}
        style={flow ? undefined : { perspective: '1400px' }}
      >
        {/* ---------- 01 ORIGIN ---------- */}
        <Layer id="origin" z={10} flow={flow}>
          <Photo name="origin" priority />
          <div className="absolute inset-0 bg-[var(--ink)]/45" />
          <Copy id="origin" lines={C.origin.headline} meta={C.origin.meta} flow={flow} as="h1" />
        </Layer>

        {/* ---------- 02 FIBER ---------- */}
        <Layer id="fiber" z={11} flow={flow}>
          <Photo name="fleece" />
          <div className="absolute inset-0 bg-[var(--ink)]/55" />
          <Copy id="fiber" lines={C.fiber.headline} tags={C.fiber.tags} place="left" flow={flow} />
        </Layer>

        {/* Drawn strands, in three depth bands. Their own overlay rather than children of
            the fibre layer: they travel across the ORIGIN-to-FIBER handover, so they must
            not be gated by either layer opacity. Each band is moved a different distance by
            the timeline, which is what produces depth. Decorative. */}
        {([
          ['back', [12, 34, 58, 80], 0.7, 0.45],
          ['mid', [20, 46, 70], 1.1, 0.7],
          ['fore', [28, 62, 88], 1.9, 1],
        ] as const).map(([band, ys, weight, alpha]) => (
          <div
            key={band}
            data-strands={band}
            className="pointer-events-none absolute inset-0 will-change-transform"
            style={{ zIndex: 20, opacity: alpha }}
            aria-hidden="true"
          >
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {ys.map(y => (
                <path
                  key={y}
                  data-strand
                  d={`M-40 ${y} C 15 ${y - 9}, 60 ${y + 10}, 140 ${y - 5}`}
                  fill="none"
                  stroke="var(--cream)"
                  strokeWidth={weight}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </div>
        ))}

        {/* ---------- 03 SPINNING ---------- */}
        <Layer id="spinning" z={12} flow={flow}>
          <Photo name="yarn" className="opacity-0" />
          <div className="absolute inset-0 bg-[var(--ink)]/50" />
          {/* Each loose strand is its own positioned band so the timeline can close the
              spread between them — that convergence is the scene, and it has to be real
              movement rather than a fade. */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              data-spin-band
              className="pointer-events-none absolute inset-x-0 top-1/2 h-px will-change-transform"
              aria-hidden="true"
            >
              <svg className="h-[2px] w-full overflow-visible" viewBox="0 0 100 2" preserveAspectRatio="none">
                <line
                  data-spin-line
                  x1="-20" y1="1" x2="120" y2="1"
                  stroke="var(--taupe)" strokeWidth="1.4" vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          ))}
          {/* The merged thread travels as one object once the strands have converged. */}
          <div data-twist-wrap className="pointer-events-none absolute inset-0 will-change-transform" aria-hidden="true">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path
                data-twist
                d="M-10 50 C 20 42, 32 58, 50 50 S 80 42, 110 50"
                fill="none"
                stroke="var(--cream)"
                strokeWidth="2.2"
                strokeDasharray="900"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <Copy id="spinning" lines={C.spinning.headline} tags={C.spinning.tags} place="left" flow={flow} />
        </Layer>

        {/* ---------- 04 WEAVE ---------- */}
        <Layer id="weaving" z={13} flow={flow}>
          <Photo name="weave" className="opacity-0" />
          <div className="absolute inset-0 bg-[var(--ink)]/55" />
          <div
            data-weave-grid
            className="will-change-transform absolute inset-0"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {/* Warp and weft live in separate groups so each can slide into place from
                  its own edge — the cloth is seen being built, not switched on. */}
              <g data-warp-wrap stroke="var(--cream)" strokeWidth="0.5" strokeDasharray="200" vectorEffect="non-scaling-stroke">
                {Array.from({ length: 22 }, (_, i) => (
                  <line key={'w' + i} data-warp x1={i * 4.8} y1="-5" x2={i * 4.8} y2="105" />
                ))}
              </g>
              <g data-weft-wrap stroke="var(--cream)" strokeWidth="0.5" strokeDasharray="200" vectorEffect="non-scaling-stroke">
                {Array.from({ length: 16 }, (_, i) => (
                  <line key={'f' + i} data-weft x1="-5" y1={i * 6.6} x2="105" y2={i * 6.6} />
                ))}
              </g>
            </svg>
          </div>
          <Copy id="weaving" lines={C.weaving.headline} tags={C.weaving.tags} place="bottom" flow={flow} />
        </Layer>

        {/* ---------- 05 FABRIC ---------- */}
        <Layer id="fabric" z={14} flow={flow}>
          <Photo name="fold" />
          <div className="absolute inset-0 bg-[var(--ink)]/30" />
          {/* Raking light across the cloth. */}
          <div
            data-sheen
            className="will-change-transform absolute inset-y-0 -left-1/3 w-2/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            aria-hidden="true"
          />
          <Copy id="fabric" lines={C.fabric.headline} flow={flow} />
        </Layer>

        {/* ---------- 06 FORM ---------- */}
        <Layer id="form" z={15} flow={flow}>
          <Photo name="knit-rib" />
          <div className="absolute inset-0 bg-[var(--ink)]/35" />
          {/* Fabric fills a garment-shaped opening, then the finished piece arrives. */}
          <div
            data-silhouette
            className="will-change-transform absolute left-1/2 top-1/2 h-[68vh] w-[min(46vw,420px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden"
          >
            <img
              src={src('sweater')}
              srcSet={srcSet('sweater')}
              sizes="46vw"
              alt={alt('sweater')}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div
            data-garment
            className="will-change-transform absolute left-1/2 top-1/2 h-[72vh] w-[min(52vw,520px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden"
          >
            <img
              src={src('coat')}
              srcSet={srcSet('coat')}
              sizes="52vw"
              alt={alt('coat')}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
          <Copy id="form" lines={C.form.headline} tags={C.form.tags} place="bottom" flow={flow} />
        </Layer>

        {/* ---------- 07 EDITORIAL ---------- */}
        <Layer id="editorial" z={16} flow={flow}>
          <div className="absolute inset-0 bg-[var(--charcoal)]" />
          <div data-ed="b" className="absolute left-[4%] top-[14%] h-[44vh] w-[34vw] max-w-[420px]">
            <div className="frame h-full w-full">
              <img src={src('knit-waffle')} srcSet={srcSet('knit-waffle')} sizes="34vw"
                alt={alt('knit-waffle')} loading="lazy" decoding="async" />
            </div>
          </div>
          <div data-ed="a" className="absolute right-[6%] top-[8%] h-[70vh] w-[38vw] max-w-[460px]">
            <div className="frame h-full w-full">
              <img src={src('coat-walk')} srcSet={srcSet('coat-walk')} sizes="38vw"
                alt={alt('coat-walk')} loading="lazy" decoding="async" />
            </div>
          </div>
          <div data-ed="c" className="absolute bottom-[6%] left-[26%] h-[40vh] w-[30vw] max-w-[360px]">
            <div className="frame h-full w-full">
              <img src={src('scarf')} srcSet={srcSet('scarf')} sizes="30vw"
                alt={alt('scarf')} loading="lazy" decoding="async" />
            </div>
          </div>
          <Copy id="editorial" lines={C.editorial.headline} tags={C.editorial.items} place="bottom" flow={flow} />
        </Layer>

        {/* ---------- 08 REVEAL ---------- */}
        <Layer id="reveal" z={17} flow={flow}>
          <Photo name="stack-soft" />
          <div className="absolute inset-0 bg-[var(--ink)]/55" />
        </Layer>

        {/* The closing frame carries the brand and the exits, so it is built out rather
            than reusing the generic copy block. */}
        <div className={flow ? 'relative' : 'pointer-events-none absolute inset-0'} style={flow ? undefined : { zIndex: 40 }}>
          <div data-copy="reveal" className={(flow ? 'relative py-[10vh] ' : 'absolute inset-0 justify-center ') + 'flex flex-col items-center px-[1.5rem] text-center text-[var(--ivory)] sm:px-[3rem]'}>
            <div className="mx-auto max-w-[820px]">
              <p data-copy-meta className="meta mb-[2rem] opacity-70">
                {BRAND.name} · {BRAND.suffix}
              </p>
              <h2 data-copy-head className="display text-[clamp(32px,5.6vw,80px)]">
                {C.reveal.headline.map((line, i) => (
                  <span className="line" key={i}>
                    <span>{line}{i < C.reveal.headline.length - 1 ? ' ' : ''}</span>
                  </span>
                ))}
              </h2>
              <div data-copy-tags>
                <p className="body-copy mx-auto mt-[2rem] max-w-[38ch] opacity-75">
                  {C.reveal.body}
                </p>
                <div className="pointer-events-auto mt-[2.75rem] flex flex-wrap items-center justify-center gap-[0.75rem]">
                  <a className="btn btn-solid" href="#collection">{C.reveal.primary}</a>
                  <button
                    type="button"
                    className="btn btn-ghost text-[var(--ivory)]"
                    onClick={() => scrollTo({ top: 0, behavior: 'smooth' })}
                  >
                    {C.reveal.secondary}
                  </button>
                </div>
                <p className="meta mt-[2.5rem] opacity-45">{C.reveal.disclosure}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Masthead scrim: the stage photography ranges from near-black to pale fleece, so
            the navbar needs its own ground rather than depending on whatever frame is up. */}
        <div
          className={(flow ? 'hidden ' : '') + 'pointer-events-none absolute inset-x-0 top-0 h-[150px] bg-gradient-to-b from-[#1a1715b8] to-transparent'}
          style={{ zIndex: 50 }}
          aria-hidden="true"
        />

        {/* Scene index, bottom-right. Decorative; the same order is in the sr-only outline. */}
        <div
          className={(flow ? 'hidden ' : '') + 'pointer-events-none absolute bottom-[1.75rem] right-[1.5rem] hidden text-right text-[var(--ivory)] sm:right-[3rem] md:block'}
          style={{ zIndex: 60 }}
          aria-hidden="true"
        >
          <span data-scene-n className="meta opacity-70">01</span>
          <span className="meta opacity-35"> / {String(SCENES.length).padStart(2, '0')}</span>
        </div>
      </div>
    </section>
  )
}
