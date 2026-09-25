/**
 * Copy and image manifest for the SULD Cashmere story.
 *
 * SULD Cashmere is a fictional brand written for a web-development portfolio. Nothing here
 * describes a real company: no factory, herder count, certification, export market, award,
 * price, store or customer claim appears anywhere, and the photographs show unrelated
 * textiles standing in for a concept that was never produced.
 *
 * Alt text is written by hand. Unsplash's auto-captions are unreliable — the yarn shot is
 * captioned "a baby's head" — so they are not used for accessibility.
 */

export const BRAND = {
  name: 'SULD',
  suffix: 'CASHMERE',
  full: 'SULD Cashmere',
  origin: 'MONGOLIAN CASHMERE',
  year: 'CONCEPT 2026',
}

export const NAV = [
  { label: 'Түүх', at: 0.06 },
  { label: 'Материал', at: 0.34 },
  { label: 'Бүтээл', at: 0.75 },
  { label: 'Цуглуулга', at: 0.88 },
]

/**
 * The eight scenes of the pinned story, as fractions of the master timeline.
 *
 * These drive both the progress indicator and the navigation, so the numbers live in one
 * place — a scene boundary can never disagree with the label pointing at it.
 */
export const SCENES = [
  { id: 'origin', n: '01', en: 'ORIGIN', mn: 'Эх үүсвэр', from: 0, to: 19.5 / 159 },
  { id: 'fiber', n: '02', en: 'FIBRE', mn: 'Ширхэг', from: 19.5 / 159, to: 39.5 / 159 },
  { id: 'spinning', n: '03', en: 'THREAD', mn: 'Ээрэлт', from: 39.5 / 159, to: 59.5 / 159 },
  { id: 'weaving', n: '04', en: 'WEAVE', mn: 'Нэхэлт', from: 59.5 / 159, to: 81.5 / 159 },
  { id: 'fabric', n: '05', en: 'MATERIAL', mn: 'Даавуу', from: 81.5 / 159, to: 107.5 / 159 },
  { id: 'form', n: '06', en: 'FORM', mn: 'Хэлбэр', from: 107.5 / 159, to: 129.5 / 159 },
  { id: 'editorial', n: '07', en: 'EDITORIAL', mn: 'Цуглуулга', from: 129.5 / 159, to: 149.5 / 159 },
  { id: 'reveal', n: '08', en: 'SULD', mn: 'Төгсгөл', from: 149.5 / 159, to: 159 / 159 },
] as const

export const SCENE_COPY = {
  origin: {
    headline: ['Зөөлөн чанар', 'ширхэгээс эхэлнэ.'],
    meta: [BRAND.origin, BRAND.year],
  },
  fiber: {
    headline: ['Нарийн ширхэг,', 'хөнгөн дулаан.'],
    tags: ['SOFTNESS', 'WARMTH', 'LIGHTNESS'],
  },
  spinning: {
    headline: ['Ширхэгүүд нийлж,', 'утас болно.'],
    tags: ['FIBER', 'THREAD'],
  },
  weaving: {
    headline: ['Утас сүлжилдэж,', 'нэхээс болно.'],
    tags: ['FIBER', 'THREAD', 'WEAVE'],
  },
  fabric: {
    headline: ['Зөөлөн гадаргуу,', 'уян нугалаас.'],
    note: 'Гар мэдрэмжийг дүрслэх зорилготой концепц дүрслэл.',
  },
  form: {
    headline: ['Даавуунаас', 'хувцасны хэлбэрт.'],
    tags: ['KNIT', 'COAT', 'SCARF'],
  },
  editorial: {
    headline: ['Өдөр тутмын', 'ноолууран хувцас.'],
    items: ['KNIT', 'COAT', 'SCARF', 'ESSENTIALS'],
  },
  reveal: {
    headline: ['Зөөлөн материал.', 'Энгийн хийц.'],
    body: 'Монгол ноолуураас сэдэвлэсэн зохиомол төсөл.',
    primary: 'Цуглуулга үзэх',
    secondary: 'Түүхийг дахин үзэх',
    disclosure: 'FICTIONAL CONCEPT PROJECT',
  },
} as const

/** Closing collection strip, shown after the pin releases. */
export const COLLECTION = [
  { img: 'collection-knit', mn: 'Нэхмэл', en: 'KNIT', alt: 'Чулуун тавцан дээр эвхэж тавьсан шаргал ноолууран цамц' },
  { img: 'collection-coat', mn: 'Пальто', en: 'COAT', alt: 'Модон өлгүүрт өлгөсөн шаргал ноолууран пальто' },
  { img: 'collection-scarf', mn: 'Ороолт', en: 'SCARF', alt: 'Чулуун тавцангаас унжуулсан цацагтай шаргал ноолууран ороолт' },
  { img: 'collection-essentials', mn: 'Багц', en: 'ESSENTIALS', alt: 'Ноолууран ороолт, малгай, бээлийн шаргал багц' },
] as const

export const FOOTER = {
  lines: [
    'SULD Cashmere',
    'Fictional cashmere concept',
    'Designed & developed as a portfolio project',
  ],
  note: 'SULD бол портфолиод зориулсан зохиомол брэнд. Бодит үйлдвэр, борлуулалт, гэрчилгээ, дэлгүүр байхгүй.',
}

/** Hand-written alt text, keyed by image name. */
export const ALT: Record<string, string> = {
  origin: 'Боловсруулаагүй ноолуурын ширхэгийн ойрын харагдац',
  'fiber-macro': 'Зөөлөн ноолуурын ширхэгийн макро зураг',
  fleece: 'Хар дэвсгэр дээрх цагаан ноолуурын ширхэг',
  'fibre-dark': 'Байгалийн ноолуурын түүхий ширхэг',
  yarn: 'Ноолууран утасны бөмбөлөг барьж буй гар',
  thread: 'Ээрсэн ноолууран утасны ойрын харагдац',
  spool: 'Ээрүүл дээрх цагаан утас',
  weave: 'Нэхмэл даавууны бүтэц, торон хээ',
  linen: 'Байгалийн утаснаас нэхсэн даавууны бүтэц',
  fold: 'Зөөлөн эвхэгдсэн ноолууран даавуу',
  'fabric-fold': 'Даавууны эвхэц дэх гэрэл сүүдэр',
  knit: 'Цагаан ноолууран нэхмэлийн гадаргуу',
  'knit-rib': 'Хавирган нэхээстэй цагаан нэхмэл',
  'knit-waffle': 'Бүдүүн нэхээстэй ноолууран нэхмэл',
  sweater: 'Ноолууран цамц өмссөн эмэгтэй',
  coat: 'Ноолууран пальто өмссөн эмэгтэй',
  'coat-walk': 'Хүрэн ноолууран пальто өмссөн эмэгтэй',
  scarf: 'Зөөлөн ноолууран ороолт',
  stack: 'Өрж тавьсан ноолууран нэхмэл',
  'stack-soft': 'Сандал дээр эвхэж тавьсан ноолууран цамц',
  steppe: 'Монголын тал нутаг, гэр',
  'steppe-wide': 'Уулс, голтой тал нутгийн өргөн дүрслэл',
}

export const srcSet = (name: string) => `/img/${name}-900.webp 900w, /img/${name}-1800.webp 1800w`
export const src = (name: string) => `/img/${name}-1800.webp`
export const alt = (name: string) => ALT[name] ?? ''
