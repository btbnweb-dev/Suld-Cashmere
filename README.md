# SULD Cashmere

A fictional Mongolian-inspired cashmere portfolio concept. The 160-frame film follows
raw down -> fibre -> yarn -> weave -> fabric -> garment -> editorial -> campaign.
The imagery is illustrative, not evidence of real SULD products or manufacturing.

## Run and check

```sh
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run preview
```

React 19, TypeScript, Vite, Tailwind CSS 4 and GSAP ScrollTrigger. Fonts are local
Playfair Display, Inter and JetBrains Mono, including Cyrillic.

## Live architecture - preserve this

- `src/App.tsx` renders `Film`, then the collection after the pin spacer.
- `src/Film.tsx` only mounts/disposes the independent controller and manages DOM copy.
- `src/film/filmController.ts` maps ScrollTrigger progress directly to a frame:
  `Math.round(self.progress * (frameCount - 1))`, then immediately `drawFrame(frame)`.
  No tweened playhead, React frame state, or animation wrapper mediates drawing.
- The first image loads and paints first; frames 2-30 load sequentially, then the rest
  in batches of six. A missing image uses the nearest loaded neighbour.
- Canvas uses centered cover cropping, preserves the 16:9 source aspect ratio, and
  caps device pixel ratio at 2. Narrow screens crop the same centered composition.
- Pin distance remains **1400vh desktop / 820vh mobile**. Mobile starts at 900px.
  The existing scrub settings remain unchanged; frame selection still uses raw progress.
- Copy uses separate ScrollTriggers over the same pin range. Chapter windows now derive
  from `SCENES`; each exits before the next appears. Copy remains selectable DOM text.
- Reduced motion renders eight full-bleed chapter stills from the same sequence,
  with no canvas or pin. Updated alt text describes the new coat and final campaign.
- The original accessibility and page structure remain. See the focused UI polish notes for the later collection, navbar and typography changes.

`src/Stage.tsx` is an **unused legacy layered GSAP stage**.
`public/proof.html` is a **legacy 40-frame diagnostic**, not the live 160-frame film.
Both are retained unchanged. The protected-file checksum record is
`verification/protected-baseline.json`.

## Imagery audit and art direction

The original contact sheet (`verification/before-contact.jpg`) showed warm raw material,
black-backed fibre, loose linen, smooth sculptural cloth, cool chunky knit, a dark
street-fashion coat and a different folded-knit ending. These were unrelated materials,
lighting conditions and garments. The original renderer primarily used dissolves and
vector line overlays; its source files were outside the project in a temporary scratch
directory.

The new plates share oatmeal, cream and taupe, diffuse daylight from the upper left,
fine cashmere nap and a single coat. Review the nine requested samples in
`verification/final-contact.jpg` (001, 020, 040, 060, 080, 100, 120, 140, 160).
The candidate contact sheet was reviewed **before** the public sequence was replaced.
The initial editorial crop cut off the face; it was corrected before the full render. A second source-plate revision added headroom after browser QA showed the fixed navbar covering the model. The revised contact sheet was reviewed before replacement.

| Frames | Label | Visual continuity |
| --- | --- | --- |
| 001-020 | 01 ORIGIN | Push into an identifiable raw down tuft |
| 021-040 | 02 FIBRE | Same tuft/plate; horizontal fibres converge toward yarn |
| 041-060 | 03 THREAD | Central yarn axis carries into the first warp threads |
| 061-082 | 04 WEAVE | Camera follows the diagonal woven edge |
| 083-108 | 05 MATERIAL | Fine nap and diagonal fold lead toward the lapel |
| 109-130 | 06 FORM | Pull back from the same oatmeal coat |
| 131-150 | 07 EDITORIAL | Same model, garment, lighting and camera pullback |
| 151-160 | 08 SULD | Camera settles; frames 154-160 are identical |

This is a **still-plate cinematic composite**, not live-action footage or a physical
simulation of spinning/weaving. Spatial feathered masks follow yarn axes and cloth
edges; continuous crop/scale moves carry each handover. The final three chapters share
one plate, eliminating outfit changes and crossfades in the ending.

## Source plates and provenance

Five original AI-generated concept plates were created with OpenAI image generation
on 2026-09-24 specifically for this fictional demo. No luxury-brand campaign photos,
external stock downloads, real product images or real-person reference photographs were
used for the new film. These are generated assets, **not Unsplash-licensed photographs**.

Local source files, attribution and reference chain are in `sources/campaign/`:

- `campaign.png`: original fictional model wearing the oatmeal shawl-collar coat.
- `fabric.png`: generated using that campaign's material/light as reference.
- `weave.png`: generated using fabric as reference.
- `yarn.png`: generated using weave as reference.
- `raw.png`: generated using yarn as reference.
- `provenance.json`: provider, date, purpose and plate roles.

There are no external source URLs or stock photographers for these generated plates.
They are original generated demo assets; no claim of exclusive copyright or third-party
stock license is made. Full-resolution sources stay outside `public`, so they are
not shipped to visitors. Existing collection/legacy photography is retained separately,
with the original source record below.

## Reproduce the film

The original **Chromium compositor -> PNG capture -> FFmpeg WebP** approach is retained.
The renderer now lives in the project, uses relative paths, has no recursive deletion,
and always writes a candidate directory first.

Requirements: Node/npm, Chromium for Playwright, FFmpeg on PATH; Python + Pillow only
for contact sheets. If Chromium is absent, run `npx playwright install chromium`.

```sh
npm run film:preview
python scripts/film/contact.py
# Inspect verification/candidate-contact.jpg before proceeding.
npm run film:render
python scripts/film/contact.py verification/candidate-sequence
# Review, then install the reviewed candidate with backup and validation:
node scripts/film/publish.mjs
python scripts/film/contact.py public/sequence
```

- `scripts/film/storyboard.mjs`: deterministic cameras and handover windows.
- `scripts/film/compositor.html`: offline compositing and feathered spatial masks.
- `scripts/film/render.mjs`: headless capture and WebP encoding at quality 78.
- `scripts/film/publish.mjs`: validates names, dimensions, weight and protected files;
  retains the old public frames in `verification/original-sequence/` before replacement.
- Output: **160 x 1600x900 WebP**, **11,059,392 bytes** (10.55 MiB).
  Previous sequence: 11,370,638 bytes. Reduction: **2.7%**.
- Final hold is encoded in the images, leaving the runtime controller untouched.

## Browser QA

With the local server running, run `npm run film:qa`.
For the production preview set `SULD_QA_URL=http://127.0.0.1:4173`.

The script sends browser `mouse.wheel` events (not only scripted scroll positions).
It checks 0/25/50/75/100%, pixel-identical reverse traversal, no drawing while stopped,
canvas cover geometry, pin distances, collection release, one copy block, all 160 image
responses and console/page errors at **1440, 1280, 1024, 768, 390 and 320px**.
Reduced motion is checked at desktop and both narrow phone widths.
Evidence is saved in `verification/browser-qa.json` and `verification/browser/`.
These are automated browser wheel checks; a physical mouse was not available.

The pre-existing Fast Refresh lint warning in `src/components/Chrome.tsx` is unrelated
to the imagery work.



## Original collection / legacy image source record

The following is retained from the original project; photographer names were not recorded. These legacy images are not used by the current film or collection.

### Original attribution

Photographs are from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license), which permits free commercial and
non-commercial use. Unsplash+ results were filtered out, since those need a paid licence.
Images are downloaded, converted to WebP at two widths and served from `public/img/`.

The photographs show unrelated real textiles and garments. They stand in for a brand that
does not exist and do not depict any actual SULD product.

| File | Unsplash slug |
| --- | --- |
| origin | `photo-1647699926980-b7d360761521` |
| fiber-macro | `photo-1747755648920-7b82b58ea400` |
| fleece | `photo-1777181647707-0df0f312fe0c` |
| fibre-dark | `photo-1770122985578-0fc7023eb6e8` |
| yarn | `photo-1651651705570-0a081884ce44` |
| thread | `photo-1670764732262-331943e5af5e` |
| spool | `photo-1597386983929-d55c63310a18` |
| weave | `photo-1776278515617-09ab61ec1eb8` |
| linen | `photo-1612676777268-24594d85b631` |
| fold | `photo-1714682597753-a646ba506cee` |
| fabric-fold | `photo-1699009437744-aeaa28006c16` |
| knit | `photo-1643313260651-9c335822ecde` |
| knit-rib | `photo-1595026525047-dfa997df8a4a` |
| knit-waffle | `photo-1633175118641-6001540f5dc7` |
| sweater | `photo-1709920668708-90df0211e4d0` |
| coat | `photo-1637102146291-c408b298e22b` |
| coat-walk | `photo-1618244965061-1d27b208d6e8` |
| scarf | `photo-1604176132453-922aeee365df` |
| stack | `photo-1601379327928-bedfaf9da2d0` |
| stack-soft | `photo-1641642231157-0849081598a2` |
| steppe | `photo-1612592150792-f66811ebf8c4` |
| steppe-wide | `photo-1707669904569-072dbdd02e47` |

Re-fetch with `https://images.unsplash.com/<slug>?w=1800&q=72&fm=webp&fit=max`


## Focused UI polish (2026-09-25)

- Collection: four original generated knit, coat, scarf and essentials still-lifes share
  the film's oatmeal palette, plaster wall, limestone and upper-left daylight.
  The scarf has an unmistakable long shape with fringed ends; essentials shows a scarf,
  beanie and gloves. Responsive 900/1800px WebP variants and Mongolian alt text are
  installed. Mobile labels stack cleanly. See sources/collection/provenance.json.
- Navbar: stable translucent ivory, dark readable links, 64px desktop / 60px phone height,
  controlled blur, fine border/shadow, larger wordmark and visible CONCEPT metadata.
  The old brown masthead overlay was removed.
- Film copy: headlines increased to 32-80px with 1.12 line-height, stronger chapter labels,
  restrained feathered light backing behind dark copy, and clearer progress indicators.
  Caption timing and the independent frame controller remain unchanged.
- UI evidence: `verification/polish/ui-qa.json` and screenshots cover all eight copy beats
  at 1440, 1024, 768, 390 and 320px. Check `verification/browser-qa.json` for film regression.
- `verification/polish/protected-baseline.json` records the controller, legacy stage,
  proof and all 160 sequence files before this pass. The earlier architecture baseline
  remains as historical evidence; App/CSS changes in this UI pass are intentional.

