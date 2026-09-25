import { useEffect, useState } from 'react'
import { Cursor, Navbar, ProgressThread } from './components/Chrome'
import {
  useIsMobile, useIsTouch, useReducedMotion, useResizeRefresh, useScrollRefresh,
} from './lib/hooks'
import { Film } from './Film'
import { BRAND, COLLECTION, FOOTER, SCENES, src, srcSet } from './content'

/**
 * Writes the active section's tone onto <html> for the navbar to read.
 *
 * A data attribute rather than React state keeps the update out of the render path: the
 * navbar samples it from its own scroll handler, so nothing re-renders per frame.
 */
function useNavTheme() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-nav]'))
    if (!sections.length) return
    let frame = 0
    const update = () => {
      frame = 0
      const probe = scrollY + 82
      let tone = 'dark'
      for (const section of sections) {
        if (section.offsetTop <= probe) tone = section.dataset.nav ?? 'dark'
      }
      if (document.documentElement.dataset.navTheme !== tone) {
        document.documentElement.dataset.navTheme = tone
      }
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', onScroll)
    }
  }, [])
}

export default function App() {
  const reduced = useReducedMotion()
  const mobile = useIsMobile()
  const touch = useIsTouch()
  const [progress, setProgress] = useState(0)

  const motion = !reduced

  useNavTheme()
  useScrollRefresh()
  useResizeRefresh()

  return (
    <>
      <a href="#content" className="skip-link">Үндсэн агуулга руу очих</a>
      <Navbar />
      {!touch && <Cursor />}
      <ProgressThread progress={progress} shown={motion && progress > 0.02 && progress < 0.995} />

      <main id="content">
        <div id="top" />

        {/* The pinned story. `data-nav="dark"` because the stage is dark throughout. */}
        <div data-nav="dark">
          <Film mobile={mobile} motion={motion} onProgress={setProgress} />
        </div>

        {/* ---------- COLLECTION ----------
            The static landing after the pin releases. Deliberately calm and ordinary: the
            cinematic sequence has just ended, and a second spectacle here would compete
            with it rather than close it. */}
        <section
          id="collection"
          data-nav="light"
          className="relative bg-[var(--ivory)] px-[1.5rem] py-[14vh] sm:px-[3rem]"
          aria-labelledby="collection-heading"
        >
          <div className="mx-auto max-w-[1500px]">
            <p className="meta mb-[2rem] opacity-55">COLLECTION · {BRAND.year}</p>
            <h2 id="collection-heading" className="display mb-[9vh] max-w-[16ch] text-[clamp(28px,4vw,56px)]">
              Өдөр тутмын ноолууран эдлэл.
            </h2>

            <ul className="grid grid-cols-2 gap-x-[1.5rem] gap-y-[3rem] lg:grid-cols-4">
              {COLLECTION.map((item, i) => (
                <li key={item.img} data-cursor="view">
                  <div className="frame aspect-[3/4] w-full">
                    <img
                      src={src(item.img)}
                      srcSet={srcSet(item.img)}
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      alt={item.alt}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="collection-caption">
                    <span className="text-[15px]">{item.mn}</span>
                    <span className="meta opacity-45">
                      {String(i + 1).padStart(2, '0')} — {item.en}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer
          data-nav="light"
          className="bg-[var(--ivory)] px-[1.5rem] pb-[4rem] sm:px-[3rem]"
        >
          <div className="mx-auto max-w-[1500px] border-t border-[var(--charcoal)]/15 pt-[2.5rem]">
            <div className="flex flex-wrap items-end justify-between gap-[2rem]">
              <div>
                {FOOTER.lines.map((line, i) => (
                  <p
                    key={line}
                    className={i === 0
                      ? 'font-serif text-[20px] tracking-[0.14em]'
                      : 'meta mt-[0.4rem] opacity-45'}
                  >
                    {line}
                  </p>
                ))}
              </div>
              <p className="meta opacity-35">© {new Date().getFullYear()}</p>
            </div>
            <p className="meta mt-[2rem] max-w-[60ch] !normal-case !tracking-normal !text-[11.5px] leading-relaxed opacity-50">
              {FOOTER.note}
            </p>
          </div>
        </footer>
      </main>

      {/* Text outline of the pinned story. The scenes are visual and scroll-driven, so the
          same sequence is stated here for assistive technology and for anyone who never
          reaches the animation. */}
      <section className="sr-only" aria-label="Түүхийн агуулга">
        <h2>{BRAND.full} — ноолуурын түүх</h2>
        <p>
          {BRAND.full} бол зохиомол концепц брэнд. Портфолиод зориулан бүтээсэн демо төсөл
          бөгөөд бодит үйлдвэр, борлуулалт, гэрчилгээ байхгүй.
        </p>
        <ol>
          {SCENES.map(scene => (
            <li key={scene.id}>{scene.n} — {scene.en} · {scene.mn}</li>
          ))}
        </ol>
        <p>
          Түүхийн дараалал: түүхий ноолуур, ширхэг, ээрэлт, нэхэлт, даавуу, хэлбэр,
          цуглуулга, төгсгөл.
        </p>
        <p>{COLLECTION[3].alt}</p>
      </section>
    </>
  )
}
