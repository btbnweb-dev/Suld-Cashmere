import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from './lib/hooks'
import { mountFilm } from './film/filmController'
import { BRAND, SCENE_COPY, SCENES } from './content'

const FRAME_COUNT = 160
const DIR = '/sequence'

/**
 * Pin length, as a single constant so the film and its captions can never disagree.
 *
 * Long on purpose. At ~950vh one wheel notch advanced roughly nine frames, which skates
 * over the transformation; at 1400vh the same notch moves two or three, so the reader can
 * actually watch fibre become thread. The frame mapping itself is untouched — pacing is a
 * function of scroll distance, not of the mapping.
 */
const PIN_END = { desktop: '+=1400%', mobile: '+=820%' }
const endFor = (mobile: boolean) => (mobile ? PIN_END.mobile : PIN_END.desktop)

/**
 * Copy beats, as playhead windows.
 *
 * Text is DOM over the canvas, never baked into the frames, so it stays selectable,
 * translatable and readable by assistive technology. Windows are spaced so no two large
 * headings are ever legible at once.
 */
const BEATS = SCENES.filter(scene => scene.id !== 'reveal').map(scene => ({
  id: scene.id,
  from: scene.from + (scene.id === 'origin' ? 0 : 0.008),
  to: scene.to - 0.04,
  place: scene.id === 'origin' || scene.id === 'fabric'
    ? 'center'
    : scene.id === 'fiber' || scene.id === 'spinning' ? 'left' : 'bottom',
}))

export function Film({
  mobile, motion, onProgress,
}: {
  mobile: boolean
  motion: boolean
  onProgress: (p: number) => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const section = useRef<HTMLElement>(null)
  const [ready, setReady] = useState(false)

  // The film controller owns the scrub; React only mounts and disposes it.
  useEffect(() => {
    if (!motion || !canvas.current || !stage.current || !section.current) return
    const root = section.current

    const film = mountFilm({
      canvas: canvas.current,
      stage: stage.current,
      trigger: root,
      frameCount: FRAME_COUNT,
      dir: DIR,
      // A long pin is what lets the reader scrub slowly through the film rather than
      // skating over it.
      end: endFor(mobile),
      scrub: mobile ? 0.45 : 0.65,
      onProgress,
      onReady: () => setReady(true),
      onFrame: (_frame, p) => {
        // The scene counter is written straight to the DOM: it changes on most frames and
        // must never cause a React render.
        const node = root.querySelector('[data-film-scene]')
        if (node) {
          const n = SCENES.reduce((f, s) => (p >= s.from ? s.n : f), '01')
          if (node.textContent !== n) node.textContent = n
        }
      },
    })

    // Copy beats ride their own trigger over the same range, so type and film share a clock.
    const beatTriggers = BEATS.map(beat => {
      const node = root.querySelector<HTMLElement>(`[data-beat="${beat.id}"]`)
      if (!node) return null
      const spans = node.querySelectorAll('.line > span')
      gsap.set(node, { autoAlpha: 0 })
      gsap.set(spans, { yPercent: 108 })
      return ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: endFor(mobile),
        scrub: true,
        onUpdate: self => {
          const p = self.progress
          const enter = Math.min(1, Math.max(0, (p - beat.from) / 0.035))
          const exit = 1 - Math.min(1, Math.max(0, (p - beat.to) / 0.035))
          gsap.set(node, { autoAlpha: Math.max(0, Math.min(enter, exit)) })
          gsap.set(spans, { yPercent: 108 - 108 * Math.min(1, enter * 1.15) })
        },
      })
    })

    // The closing block holds through the final settle rather than fading with a beat.
    const revealNode = root.querySelector<HTMLElement>('[data-beat="reveal"]')
    let revealTrigger: ScrollTrigger | null = null
    if (revealNode) {
      gsap.set(revealNode, { autoAlpha: 0 })
      const spans = revealNode.querySelectorAll('.line > span')
      gsap.set(spans, { yPercent: 108 })
      revealTrigger = ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: endFor(mobile),
        scrub: true,
        onUpdate: self => {
          // Fully up by frame 154, then held: the closing frame must be readable for the
          // whole hold, not still arriving as the pin releases.
          const enter = Math.min(1, Math.max(0, (self.progress - SCENES[7].from) / 0.02))
          gsap.set(revealNode, { autoAlpha: enter })
          gsap.set(spans, { yPercent: 108 - 108 * enter })
        },
      })
    }

    return () => {
      film.destroy()
      beatTriggers.forEach(t => t?.kill())
      revealTrigger?.kill()
    }
  }, [motion, mobile, onProgress])

  const C = SCENE_COPY

  // Reduced motion: no scrub, no pin — but the film still has to read as a film.
  //
  // The first version of this dumped all eight headings into one black column, which turned
  // the cinematic story into a wall of text. Instead each chapter keeps its own frame from
  // the sequence, full-bleed, with its caption over it: the same eight scenes in the same
  // order, presented as stills rather than as motion.
  if (!motion) {
    const still = (i: number) => `${DIR}/frame-${String(i).padStart(4, '0')}.webp`
    // One representative frame per chapter, sampled from the rendered sequence.
    const chapters = [
      { id: 'origin', frame: 10, alt: 'Боловсруулаагүй ноолуурын ширхэгийн ойрын харагдац' },
      { id: 'fiber', frame: 34, alt: 'Хөвсгөр ноолуурын ширхэг' },
      { id: 'spinning', frame: 50, alt: 'Ээрсэн ноолууран утас' },
      { id: 'weaving', frame: 72, alt: 'Нэхмэл даавууны бүтэц' },
      { id: 'fabric', frame: 96, alt: 'Зөөлөн эвхэгдсэн ноолууран даавуу' },
      { id: 'form', frame: 120, alt: 'Шаргал ноолууран пальтоны энгэр, хэлбэр' },
      { id: 'editorial', frame: 144, alt: 'Ноолууран пальто өмссөн эмэгтэй' },
    ] as const

    return (
      <section id="film" className="story-still relative bg-[var(--ink)]">
        {chapters.map((ch, i) => {
          const copy = C[ch.id as keyof typeof C] as {
            headline: readonly string[]
            meta?: readonly string[]
          }
          const Head = i === 0 ? 'h1' : 'h2'
          return (
            <div key={ch.id} className="relative h-[78svh] min-h-[420px] w-full overflow-hidden">
              <img
                src={still(ch.frame)}
                alt={ch.alt}
                className="h-full w-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding={i === 0 ? 'sync' : 'async'}
              />
              <div className="absolute inset-0 bg-[var(--ink)]/40" />
              <div className="absolute inset-0 flex flex-col items-start justify-end px-[1.5rem] pb-[10vh] text-[var(--ivory)] sm:px-[3rem]">
                <div className="w-full max-w-[1500px]">
                  {copy.meta && <p className="meta mb-[1.25rem] opacity-70">{copy.meta.join(' · ')}</p>}
                  <Head className="display story-headline max-w-[18ch]">
                    {copy.headline.join(' ')}
                  </Head>
                </div>
              </div>
            </div>
          )
        })}

        {/* Closing frame, matching the film's final hold. */}
        <div className="relative h-[86svh] min-h-[480px] w-full overflow-hidden">
          <img
            src={still(160)}
            alt="Шаргал пальтотой загвар өмсөгчийн SULD концепц зураг"
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-[var(--ink)]/55" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-[1.5rem] text-center text-[var(--ivory)] sm:px-[3rem]">
            <div className="mx-auto max-w-[820px]">
              <p className="meta mb-[1.5rem] opacity-70">{BRAND.name} · {BRAND.suffix}</p>
              <h2 className="display story-headline">{C.reveal.headline.join(' ')}</h2>
              <p className="body-copy mx-auto mt-[1.5rem] max-w-[38ch] opacity-75">{C.reveal.body}</p>
              <div className="mt-[2rem] flex flex-wrap items-center justify-center gap-[0.75rem]">
                <a className="btn btn-solid" href="#collection">{C.reveal.primary}</a>
              </div>
              <p className="meta mt-[2rem] opacity-45">{C.reveal.disclosure}</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={section} id="film" className="relative bg-[var(--ink)]">
      <div ref={stage} id="film-stage" className="relative h-[100svh] min-h-[540px] w-full overflow-hidden">
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden="true" />

        {/* Shown only until the first frame paints. No invented percentage — there is
            nothing meaningful to count. */}
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-[var(--ink)]">
            <p className="meta text-[var(--ivory)] opacity-60">{BRAND.name} · {BRAND.suffix}</p>
          </div>
        )}


        <div className="pointer-events-none absolute inset-0 text-[var(--ink)]">
          {BEATS.map(beat => {
            const copy = C[beat.id as keyof typeof C] as {
              headline: readonly string[]
              meta?: readonly string[]
              tags?: readonly string[]
            }
            const box = beat.place === 'left'
              ? 'items-start justify-center text-left'
              : beat.place === 'bottom'
                ? 'items-start justify-end pb-[16vh] text-left'
                : 'items-center justify-center text-center'
            const Head = beat.id === 'origin' ? 'h1' : 'h2'
            return (
              <div
                key={beat.id}
                data-beat={beat.id}
                className={`absolute inset-0 flex flex-col px-[1.5rem] sm:px-[3rem] ${box}`}
              >
                <div className={`story-copy ${beat.place === 'center' ? 'mx-auto' : ''}`}>
                  <p className="meta story-kicker mb-[1rem]">
                    {SCENES.find(scene => scene.id === beat.id)?.n} {SCENES.find(scene => scene.id === beat.id)?.en}
                  </p>
                  {copy.meta && (
                    <p className="meta story-kicker mb-[1.75rem]">{copy.meta.join(' · ')}</p>
                  )}
                  <Head className="display story-headline">
                    {copy.headline.map((line, i) => (
                      <span className="line" key={i}><span>{line} </span></span>
                    ))}
                  </Head>
                  {copy.tags && (
                    <ul className="story-tags mt-[2rem] flex flex-wrap gap-x-[2rem] gap-y-[0.75rem]">
                      {copy.tags.map(tag => <li key={tag} className="meta opacity-60">{tag}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Closing frame: wordmark, CTA and the concept disclosure, over the settled image. */}
        <div
          data-beat="reveal"
          style={{ background: 'linear-gradient(0deg, rgba(26,23,21,.65), rgba(26,23,21,.30) 65%, transparent)' }}
          className="story-close pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[1.5rem] text-center text-[var(--ivory)] sm:px-[3rem]"
        >
          <div className="mx-auto max-w-[820px]">
            <p className="meta mb-[2rem] opacity-70">{BRAND.name} · {BRAND.suffix}</p>
            <h2 className="display story-headline">
              {C.reveal.headline.map((line, i) => (
                <span className="line" key={i}><span>{line} </span></span>
              ))}
            </h2>
            <p className="body-copy mx-auto mt-[2rem] max-w-[38ch] opacity-75">{C.reveal.body}</p>
            <div className="story-actions pointer-events-auto mt-[2.75rem] flex flex-wrap items-center justify-center gap-[0.75rem]">
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

        <div
          className="story-counter pointer-events-none absolute bottom-[1.75rem] right-[1.5rem] hidden text-right text-[var(--ivory)] sm:right-[3rem] md:block"
          aria-hidden="true"
        >
          <span data-film-scene className="meta opacity-70">01</span>
          <span className="meta opacity-35"> / {String(SCENES.length).padStart(2, '0')}</span>
        </div>
      </div>

      <p className="sr-only">
        {BRAND.full} — ноолуурын хувирлын түүх: түүхий ширхэг, ээрэлт, нэхэлт, даавуу,
        хэлбэр, эцсийн цуглуулга. Зохиомол концепц төсөл.
      </p>
    </section>
  )
}
