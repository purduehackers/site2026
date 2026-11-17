# Website restructure plan

Status: **implemented, revision 3** (see "Revision 3" at the bottom for the latest pass).
Owner: Orca workers, tasks `task_8402efb06057` and `task_4e2b1965f20b`. Last updated 2026-11-17.

## Goal

Turn the one-page purduehackers.com into a short, vivid front door plus a small set of
real pages that answer the questions people (and search/answer engines) actually ask:
what Purdue Hackers is, who can come, what Hack Night is and when the next one is, what
tools and funding exist, what the shows are, and how to help. Keep the current site's
personality; extend it instead of replacing it.

## Navigation

Old header: `DISCORD · EVENTS · BLOG · MICROGRANTS` (all external).

New header (all internal pages, plus one external action):

| Label | Route | Why this label |
| --- | --- | --- |
| HACK NIGHT | `/hack-night` | The thing most people are looking for. Gets its own landing page, not a sub-item. |
| EVENTS | `/events` | Everything else on the calendar: workshops, sessions and circles, guests, callouts, programs. Links to Shows. |
| MAKERSPACE | `/makerspace` | A physical place with tools; people search for it by name. |
| COMMUNITY | `/community` | Discord, ships, blog, the things members have built, the satellite sites. |
| SUPPORT | `/support` | Reads both ways on purpose: "get backed" (µgrants) and "back us" (friends, donating). |
| ABOUT | `/about` | Start-here answers, history, contact. |
| JOIN DISCORD (button) | discord invite | The one action we want from every page. |

`/shows` is a real page too but lives under Events in the IA (linked from Events, the
homepage Show block and the footer) so the header stays at six words.

Differences from the tentative suggestion: Hack Night is promoted out of Events (a later
coordinator message asked for a dedicated landing page), circles live with Hack Night and
Events, blog/ships stay under Community, and About is added because "what is this / can I
come" had no home.

## Route map

| Route | Purpose | Main content | Sources |
| --- | --- | --- | --- |
| `/` | Front door. Short. | Existing hero + glider, collage, one-paragraph identity, Hack Night teaser with the live next date, Community with the live #ship feed, the user's Show block, tools/grants pair, Friends wall. Every block links into its page. | Existing homepage, events API |
| `/hack-night` | The landing page for Hack Night. | Next Hack Night from live event data with an honest fallback; free and open to everyone; where (HIVE, BHEE 270/280) and first-visit arrival notes; an hour-by-hour walkthrough (hacking, kickoff, sessions, circles, checkpoints, after hours) in clock time and Lightning Time; badges; photos; projects that came out of Hack Night; history links. | events API, Evergreen (checkpoints, circles, workshops), blog (Hack Night 1.0/2.0, How We Cracked Demos, The Best Badge, Lightning Time), public announcements for the usual schedule |
| `/events` | What else happens and how to find it. | Live upcoming and recent events with a type filter; plain explanations of workshops, sessions, circles, callouts, guest talks and partner events; Commit Overflow and SIGHORSE as dated programs; pointer to Shows. | events API, Evergreen events pages, commit.purduehackers.com, sig.horse |
| `/shows` | Dated record of the shows, by format. | The existing pinned show reel; a record of BURST (gallery exhibition, Dec 8 2024), spill (coffee shop showcase, Dec 6 2025), BENTO (lightning talks, Apr 11 2026), waveforum (upcoming Dec 5 2026). Formats are named per show; nothing claims "annual". | burst/spill/bento/waveforum sites, spill blog post |
| `/makerspace` | The HIVE makerspace, BHEE 280N. | What is there (3D printing, electronics, hand and power tools, storage), PrintHive, how a first visit works, shop rules, links to live hours. No hardcoded hours. | makerspace.purduehackers.com, print.purduehackers.com |
| `/community` | Where the people are and what they have made. | Discord, live #ship feed, latest blog post, artifacts (passports story, badges, the Sign, Lightning Time, door opener, phone bell, Awestruck printer, Wack Hacker), and a directory of satellite sites (ships, ring, directory, shelter, merch, ask, Evergreen, GitHub, time, scribe, creaturas). | Existing feed/ship/blog helpers, burst site, blog, repo list |
| `/support` | Funding in both directions. | µgrants (up to $1000, public funded examples, link to the intake form on the grants site); Friends wall reusing the existing logos; donating through HCB with accurate fiscal-sponsorship wording; other ways to help. | grants.purduehackers.com, sponsors data, HCB page |
| `/about` | Start here. | What Purdue Hackers is, who can come, what a first visit looks like, history as a changelog with blog links, contact. | Blog (Galactic Empire, College Clubs Are Awesome, Hack Night posts), main site copy |
| `/sitemap.xml`, `/robots.txt` | Crawl basics. | Generated from the same route list as the nav. | — |

Not built, on purpose: a passport registration page (being rebuilt elsewhere; the footer
link to passports.purduehackers.com is removed, the passport story stays as an artifact),
a reimplemented print queue, a member directory, an hours table.

## Visual vocabulary (taken from the current homepage)

- Type: Pixel Hackers for display, Inconsolata semibold uppercase for labels and ledes, PolySans for body.
- Color: cream `#fffbf1` paper and pure black, with purple, yellow, pink, blue as accents. No grey text on cream.
- Graph-paper grid behind cream sections; ordered (Bayer) dither as the only transition between cream and black.
- Conway's Life: the glider mark, the hero gun, and now one small interactive Life pattern per page as its sigil.
- Square corners, 1px or 3px hard borders, polaroid mounts, pixel icons, pixels that switch on one by one on hover.
- From components.purduehackers.com: labelled hairline separators, numbered colour tiles, event-card category colours (hack night yellow, workshop pink, show orange, other purple), marquee, reveal rows, `dither-field` fills, short staggered enter motion, press-to-0.97 buttons.

The component library's `ph.css` is not imported wholesale: it redefines `--color-primary`,
`--color-secondary` and `--color-accent`, which this site already uses with different
values, and would re-download fonts the site self-hosts. Its patterns are adopted in
`src/styles/site.css` on top of the existing tokens instead.

## Interaction concepts

1. **Page sigils.** Each page hero carries a small Life canvas running a different oscillator (pulsar, Kok's galaxy, tumbler, figure eight, toad). Click or drag to add cells, button to reset. Static first frame under reduced motion. Decorative only.
2. **Next Hack Night board** (`/hack-night`, teaser on `/`). Server-rendered from `events.purduehackers.com/api/events`; a countdown ticks on the client. If the feed fails or lists nothing upcoming, it says so and links to the calendar.
3. **The night, hour by hour** (`/hack-night`). An ordered list of the usual beats. A sticky clock follows the scroll, showing each beat in clock time and in real Lightning Time (computed, with its three colours). All text is plain HTML.
4. **Event filter** (`/events`). Buttons filter the live list by type, coloured with the component library's category colours.
5. **Show reel** (`/shows`). The existing pinned, pixel-revealed reel, reused with page-specific copy.
6. **Print-in-progress** (`/makerspace`). A glider that prints layer by layer in steps, next to a pegboard of the real equipment list.
7. **Satellite directory** (`/community`). Subdomains as a departure-board list whose rows fill with pixels on hover or focus, plus a live Lightning Time clock.
8. Existing interactions stay: hero Life sim, pixel cursor trail (home), collage parallax, dithered photo reveals, pixel-fill buttons, footer pixel blast and rotating "made with".

## SEO and answer-engine basics

- Fix head metadata: the homepage passes `<slot name="head">` where it needs `slot="head"`, so OG tags never reach `<head>`. The layout now takes `title`, `description`, `path` and emits title, description, canonical, OG/Twitter, and JSON-LD.
- JSON-LD: `Organization` site-wide, `BreadcrumbList` on subpages, `Event` only for a real upcoming Hack Night or show with a real date.
- One `h1` per page, real `h2`/`h3`, internal links between pages, all facts in server-rendered HTML.
- `sitemap.xml` and `robots.txt` routes.
- No FAQ schema, no duplicate pages, no superlatives.

## Content rules followed

- Hack Night: Fridays, 8 PM, HIVE (BHEE 270/280), free, anyone can come, runs until the last person leaves. Dates and exceptions come from the events feed. No fixed end time.
- Makerspace: BHEE 280N, organizer present, first visit coordinated on Discord, hours linked not copied.
- Tool and resource access is described separately from attending.
- Past circles and workshops are described as past examples. Art Circle is the only one called current.
- Event collaborators are not called sponsors. Donations go through HCB, which fiscally sponsors "Hackers at Purdue".
- Nothing from private Discord research is quoted. Public announcements informed the usual Hack Night schedule only.

## Implementation phases

1. Foundation: layout props and head fix, new nav with mobile menu, generalized dark-header detection, shared footer, `site.css`, shared components (page hero, dither band, pixel button, Life sigil), events helper with tests, Lightning Time helper with tests.
2. `/hack-night` (highest priority, full vertical slice).
3. `/events`, `/shows`.
4. `/makerspace`, `/support`.
5. `/community`, `/about`.
6. Homepage trim and cross-links, sitemap/robots.
7. Build, tests, browser checks at desktop and phone widths, fixes.

## Progress log

Last updated 2026-11-17.

- [x] Research and plan
- [x] Phase 1 foundation: `BaseLayout` (title/description/canonical/OG/JSON-LD, six-item nav + Discord button, mobile menu), `SiteFooter`, `site.css`, `PageHero` + `lifeField.ts`, `DitherBand`, `PixelButton`, `lib/events.ts` (+ tests), `lib/lightningTime.ts` (+ tests), generalized `[data-header-dark]` header detection
- [x] Phase 2 `/hack-night`
- [x] Phase 3 `/events`, `/shows`
- [x] Phase 4 `/makerspace`, `/support`
- [x] Phase 5 `/community`, `/about`
- [x] Phase 6 homepage (head fix, h2 headings, cross-links into each page, footer moved to the shared component, passports link removed), `/sitemap.xml`, `/robots.txt`
- [x] Phase 7 verification: `astro build` passes, `bun test` passes (14 tests), every route returns 200 with one `h1`, canonical, OG tags in `<head>` and JSON-LD; reviewed in the Orca browser at 1536px and at 390px (phone-width iframes) with no horizontal overflow; mobile menu opens and lists all six pages plus Discord

### Not done / possible next steps

- Not checked in Safari or Firefox, and not checked with a real touch device.
- `/community` shows the latest #ship card only when the Turso env vars are set (they are not set locally, so that card was not seen rendered).
- `ShowReel.astro` and `src/assets/shows/waveforum.jpg` are now unused.
- Homepage is unchanged in length; it gained cross-links only. Trimming it further is a content decision for the user.

### Deviations from the plan above

- `/shows` does not reuse the pinned `ShowReel`; the user had removed it from the homepage, so the page has its own per-show panels. `ShowReel.astro` is left in the repo, unused.
- The makerspace hero uses a CSS "printing glider" instead of a Life field.
- `ph.css` from the component library is not imported; its colours, hard borders, labelled rules, marquee and reveal patterns are reimplemented in `site.css` on the site's own tokens.

### Things a human should confirm

- "Second floor" for BHEE 270/280 and "doors can lock late at night" on `/hack-night` are inferred, not quoted from a source.
- `SITE_URL` in `src/data/site.ts` is `https://www.purduehackers.com` (used for canonical URLs and the sitemap).
- The typical-night times (8:00 hacking, 8:30 kickoff, 9:00 Sessions, 10:00 Circles, midnight Checkpoints) come from this fall's announcements.

---

## Revision 2 (2026-11-17): dark-first redesign on the real component system

The first pass was rejected: inconsistent, too much text, too many headings and lists,
generic, and it only imitated the component library. This revision replaces the inner-page
design; routes and facts stay.

### Audit of pass one

- Six different "box" styles (hard-shadow tiles, pegboard tags, tickets, boards, facts, rules) and three list styles per page.
- Every section had a numbered eyebrow label + headline + paragraph + list. The component system's rules say no eyebrows.
- Cream and black alternated with dither bands on every page, so nothing felt like one place.
- Almost no real imagery outside the Hack Night strip; project "cards" were text only.
- `ph.css` was not used; colours and patterns were hand-copied.

### Direction: "night exhibit"

- Inner pages are dark (`.dark` from the component theme): black, white text, yellow and pink accents. Cream appears only as objects (photos, paper).
- One anatomy for every page: a hero (giant `ph-headline`, one sentence, one dither button), then two to four scenes that each do one job. No eyebrow labels. Hairline `Separator`s, not boxes.
- Each page has exactly one signature object. Hack Night: a 3D model of The Sign that shows live Lightning Time. Shows: layered photo walls. Makerspace: the printing glider. Support: the µgrants tiles with real project photos. Community: an exhibit wall of BURST photos. Events: the live calendar. About: the changelog.
- Images are treated as exhibits: layered, slightly rotated photo stacks with a caption plate; small dithered grant thumbnails shown pixel-sharp; hover reveals from `RevealRow`.
- Copy cut by roughly half. Detail moves behind tabs, hover reveals and links. Facts stay in server-rendered HTML.

### Component inventory (installed from the registry into `src/components/ph/`)

`ph.css` is vendored at `src/styles/ph.css` and imported in `global.css`. Two narrow local edits: remote `@font-face` removed (fonts are self-hosted) and body type moved to `.ph-scope`. The homepage keeps its own `--color-primary/secondary/accent`; `.ph-scope` (inner-page `<main>`) maps them back to the theme's semantic tokens.

| Component | Used for |
| --- | --- |
| `DitherButton` | every primary call to action (replaces the local `PixelButton`) |
| `Button` | secondary actions |
| `Link` | inline links |
| `Separator`, `NumberedList` | scene dividers, steps and rules |
| `Badge` | event types, show formats, grant kinds |
| `EventCard` + `categories` | `/events` calendar, next Hack Night |
| `SegmentedToggle` | `/events` filter |
| `Tile` | `/support` funded projects (real photos, description on hover) |
| `RevealRow` | artifacts, satellite sites, changelogs (image on hover) |
| `Tabs` / `TabPanel` | `/makerspace` equipment |
| `Callout` | first-visit and door notes |
| `Marquee` | section breaks |
| `LightningGlider`, `LightningText`, `lightning.ts` (`@purduehackers/time`) | live Lightning Time colour everywhere, including the 3D Sign |
| `Icon`, `Glider` | supporting pieces |

### Assets pulled from public Purdue Hackers sites (`src/assets/sites/`)

BURST gallery photos (burst.purduehackers.com), spill project photos (spill.purduehackers.com), µgrants project thumbnails (grants.purduehackers.com), SIGHORSE book photos (sig.horse), HIVE makerspace photo (makerspace.purduehackers.com). No generated or stock images.

### Revision 2 status (implemented)

- All seven inner pages rebuilt on the registry components; `astro build` and `bun test` pass; every route returns 200; checked at 1536px and 390px.
- After a second steer (not boxy, no neobrutalism, registry code only): offset shadows removed everywhere, the events grid became one `EventCard` for what is next plus `RevealRow`s, funded projects became a scrolling shelf of `Tile`s, the subdomain table became a typographic run of names, and photo walls became draggable.
- Reference ideas taken from recent.design's website feed: photos scattered freely around large type, a single object on empty black, and a line-up of objects on open space. Adapted as the draggable `Exhibit` walls, the 3D Sign, and the µgrants shelf.
- Not used from the registry: `Navbar`/`Footer` (the site's existing header and photo footer are the homepage's own design), `LogoGrid` (the existing `LogoSoup` carries the user's brand-colour hover work), `Card`, `Dialog`, forms.
- Local, non-registry pieces: `PageHero`, `Scene`, `Exhibit` (wraps the homepage's `DitheredPhoto`), `SignObject` + `scripts/signObject.ts` (Three.js), `scripts/lifeField.ts`.
- Limits: the 3D Sign is a sketch of the real object (five lit blocks, live Lightning Time colours), not a scan; its colour-to-cell mapping follows the `LightningGlider` mark. Blog images in hover reveals are hot-linked from blog.purduehackers.com. Photo dragging is mouse/pen only. Not tested in Safari or Firefox. `src/pages/index.astro` was run through the project's Prettier along with the other pages.

---

## Revision 3 (2026-11-17): polish pass

Feedback addressed: clutter, rough animation, weird boundaries, the top gradient, and doubt
about whether the real component-system code was used. Task `task_4e2b1965f20b`.

### Registry verification

Every file in `src/components/ph/` was diffed against the published source at
`https://components.purduehackers.com/r/astro/<name>.json` on 2026-11-17: all are
byte-identical. `src/styles/ph.css` matches `/r/ph.css` except the two documented edits
(remote `@font-face` removed; body type moved to `.ph-scope`). Nothing was re-themed.

Registry components in use, and where:

| Component | Pages |
| --- | --- |
| `DitherButton` | every inner page (primary action) |
| `Button` | every inner page (secondary actions) |
| `Link` | every inner page, `SignObject` |
| `EventCard` + `categories` | `/events` (image list layout, as on events.purduehackers.com), `/hack-night` |
| `SegmentedToggle` | `/events` filter |
| `Tabs` / `TabPanel` | `/makerspace` room guide (the tabs are the equipment list; the 3D room drives them) |
| `NumberedList` | `/makerspace` shop rules, `/hack-night` |
| `RevealRow` | `/community`, `/about`, `/hack-night` |
| `Marquee` | `/events`, `/about`, `/hack-night` |
| `Badge` | `/shows` |
| `Callout` | `/hack-night` |
| `LightningText`, `LightningGlider` (+ `Glider`), `Icon` | `/community`, the Sign; `Glider`/`Icon` are required by other components |

Removed because nothing uses them any more: `Card`, `Separator`, `Tile` (+ `tile.css`).
Meaningful local divergences (all outside `src/components/ph/`): a `.keep-case` class in
`site.css` so `µgrants` keeps its case inside the uppercase `DitherButton` (uppercasing
U+00B5 yields Greek capital Mu, which rendered as "MGRANTS"); `/events` adds a rail and
month grid around `EventCard`s; the room guide reads and clicks the registry `Tabs` from
outside rather than changing it.

### What changed

- **Header.** Both backdrops are gone: the animated PixelBlast WebGL dither (from the
  original homepage; it also ran a render loop on every page) and the cream paper fade.
  The bar is transparent at the top, hides while scrolling down and returns as a solid
  bar (black over dark blocks, cream otherwise) with a 1px hairline when scrolling up.
  Focus inside the header always shows it. The mobile menu is unchanged.
- **Life hint removed** ("Life: drag to draw · reset") from every page hero, with its
  reset handler and the unused `hold` option.
- **/events.** "What the words mean" (Workshop, Session, Circle, Guest) moved above the
  calendar in a four-column layout with room around it. The calendar follows
  events.purduehackers.com: a timeline rail grouped by month, `EventCard`s in their image
  layout using each event's first photo (one batched request to the public CMS media API,
  `cms.purduehackers.com/api/media`; failures fall back to a placeholder), the type filter,
  and a sticky month grid of the current Eastern month with event days coloured by
  category. Honest fallback text is unchanged. "Longer than one night" became "Winter and
  summer programs", saying what Commit Overflow (winter-break daily-progress challenge;
  2025 round Dec 22 – Jan 12, 59 hackers, 1121 commits) and SIGHORSE (the Special Interest
  Group in HORSEing around's parody journal of summer projects, presented at spill) are.
  No future round is promised.
- **/makerspace.** The printing-glider animation and the fake print ticket are deleted.
  The hero shows the real room photo. "What's in the room" is an illustrated 3D room guide
  (`RoomGuide.astro`, `scripts/roomGuide.ts`): Three.js loads only when the section nears
  the viewport, renders on demand (no idle loop), and is labelled as an illustration drawn
  from a photo, not to scale. Three areas (printer shelf, electronics bench, workbench) are
  real `<button>` hotspots and clickable meshes that select the matching tab; selecting a
  tab lights the area. All equipment is plain HTML in the tabs, synced to the current
  makerspace site (including project lockers, iFixit set, socket set, cutters, tweezers).
  Without WebGL the stage shows the photo. On narrow stages hotspots shrink to numbers.
  The PrintHive scene shows a live count (printing / waiting, with the time checked) from
  the public `print.purduehackers.com/api/queue`; job titles are never shown. First-visit
  info is part of the layout, not a callout box; shop rules have more spacing; the outro
  button reads `µgrants`.
- **/community.** The "Everything else is a subdomain" heading is gone; the sites are a
  tidy three-column index of nine (dropped: directory, scribe, creaturas, time). Artifact
  rows that repeated the photo wall above them (badges, phone bell, printer) were removed.
- **/support.** The hearts are gone. The hero holds the nine funded µgrant objects as a
  loose, draggable pile (pixel images shown as-is via a new `dither={false}` on
  `Exhibit`); the separate tile shelf was folded into it. "Back us" is now "Your donation
  becomes µgrants, badges, filament, pizza and shows": each word is a link that swaps in a
  real photo on hover/focus (pure CSS `:has()`), followed by the HCB / Hackers at Purdue /
  Hack Club wording, the donate and email buttons and one line of other ways to help.
- **Motion.** The 3D Sign now runs its loop only while on screen and motion is allowed,
  draws on demand otherwise, and its drag tilt is clamped so it cannot flip.

### Checks run

- `bun test`: 17 pass (new: event photo ids, month grouping, month grid in Eastern time,
  PrintHive queue summary).
- `npm run build`: passes. `tsc --noEmit`: only the pre-existing `bun:test` type and
  `PixelBlast.ts` errors.
- Orca browser, own tab: `/events`, `/makerspace`, `/support`, `/community`, `/hack-night`
  and `/` at 390px, 1024px and 1440–1920px. No horizontal overflow at 390px. Hotspot →
  tab → highlight and tab → highlight verified; header states verified by script (top:
  transparent; down: hidden; up: solid); mobile menu opens over a transparent header;
  `µgrants` renders lowercase with U+00B5 in the button; reduced-motion emulation renders
  the room with no tweens.
- Note: after `src/lib/images.ts` gained the CMS host, the dev server needed a config
  reload; one in-process reload lost `sharp` (all `/_image` returned 500) and a second
  reload fixed it.

### Limits

- The room guide is drawn from one public photo; positions and proportions are
  approximate and the storage tab has no location in the drawing (the lockers' place is
  not public).
- Event photos and the queue count are fetched at render time (pages are ISR, up to an
  hour old in production).
- Not tested in Safari, Firefox or on a real touch device.
