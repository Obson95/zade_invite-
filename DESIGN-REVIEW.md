# The book

The invitation is now a picture book that follows `zade-invite-redesign-prompt.md`. Before and after pictures are in `docs/before-after/`.

| Part | Before | After |
| --- | --- | --- |
| Structure | One long scrolling page with a separate `/rsvp` page | Cover, eight pages, back cover. Two-page spreads on a computer, one page at a time on a phone. All content comes from the `pages` array in `src/config/book.ts`. |
| Page turns | Cover dissolve only | Paper fold geometry: the sheet folds along the line between the lifted corner and its resting place, and the real next page rides on the flap with shadow at the fold. Covers swing on a hinge. Turns follow a finger, and corners lift under a mouse. |
| Navigation | Scroll and nav links | Page corners, arrows, keyboard arrows, swipe, a contents list and an RSVP button. Page numbers are printed on each page, and `/rsvp` and `/#page` links still work. |
| Painting | SVG blobs | `scripts/paint-watercolors.py` lays down original washes, crown, balloon, clouds, moon, stars and paper from layered, seeded pigment with edge pooling and granulation. No book artwork was used as a reference. |
| Photos | Cutout, three prints | Painted-edge close-up as the largest image in the book, cleaned cutout on the cover, 13 taped print slots, and a smaller family print. |
| Video | None | Three framed slots with a painted play button. Muted, with controls and captions. Loads only on play and stops when the page turns. MP4 or YouTube/Vimeo link. |
| Name | Uniform wire lettering | Allura outlines revealed through eight pen strokes, in writing order, so thick and thin lines appear as it is written. Allura was chosen over prettier scripts because they read as "Jade". |
| Removed | | Skip button, pause button, session cover memory, Tailwind, Motion, canvas-confetti, Playfair, Nunito, Dancing Script, stacked cards, and stock phrasing. |
| Reduced motion | Static page | Pages fade with no curl, all drawings finished, no drifting, and the thank-you note shows at once. |

## Verified

Node 22 and headless Chromium, on the built site, served with the real Content-Security-Policy from `public/_headers`.

- `npm test`: all suites pass, including new tests for page order, spreads, URLs, turn routes and fold geometry (paper area is conserved, the sheet stays on the spine, the back page lands exactly on the flap and is never mirrored).
- 64 browser checks: cover, peel and fall-back, corner click, queued key presses, contents, RSVP jump, browser back, reload, swipe, cancelled swipe, vertical scroll, form state across turns, validation, public and personal-link submissions (mocked Netlify responses), preview mode, reduced motion, focus handling, hidden pages inert, and resizing between layouts.
- 8 media checks with a real clip in a throwaway build: nothing downloads before play, muted with controls, captions showing, embed allowed by the CSP, pauses on turn.
- axe-core (WCAG 2 A/AA and best practice): no violations on the cover, sample pages, RSVP and back cover, on desktop and phone.
- Page fit at 10 screen sizes from 360×640 to 1920×1080. Pages fit without scrolling, except the RSVP form on short screens and everything on a phone held sideways, where the page scrolls.
- Turn frame rate: 60 fps at 390×844 with the CPU throttled 4×. About 42 fps at 1440×900 in a headless browser with no GPU, so a real computer should do better.

## Not verified

- A real iPhone or Android phone. Everything above is emulation, and Safari was not tested at all. The layout uses container query units, so iPhones older than iOS 16 are the most likely to look wrong.
- A live submission to Google Sheets. The Netlify functions and Apps Script are unchanged and their tests pass, but the connection is still not configured.
- A real MP4. Playback was tested with a WebM clip.
- A Netlify deploy, and real YouTube or Vimeo playback (the player was stubbed).

## Still to fill in

- The wife's name in the sign-off, and every `[bracketed]` memory, date and caption in `src/config/book.ts`.
- 12 placeholder photos, 3 videos, and the party details in `src/config/event.ts`, including the new `dressCode`.
- Some opening lines are drafts in a parent's voice, such as "We counted his fingers." Please check that they are true to you. Please also have a Haitian Creole speaker read the Creole line.

---

## Previous design record

# Animated watercolor storybook update

The latest brief restores substantial motion, with slow storybook choreography and a complete static alternative. All original watercolor assets and the separate `/rsvp` page remain.

| Section | Before | After |
| --- | --- | --- |
| Opening | Invitation visible immediately | A keyboard-accessible book cover opens with a slow page turn; Escape and “Skip opening” bypass it. Seen once per tab session; direct RSVP and section links bypass it. |
| Hero | Static photo and script title | Hand-drawn SVG lettering writes “Zade” stroke by stroke; the gold crown draws in; watercolor grows behind the unchanged cutout. |
| Sky | Static illustration spots | Clouds, balloon, and moon drift; small gold stars draw and slowly brighten/dim. Bounded parallax is enabled only for fine pointers. |
| Sections | Static page layout | Soft page dissolves, spreading watercolor spots and washes, drawn gold rules. |
| Photos | Fixed taped prints | Staggered prints settle gently onto the page at their existing slight angles. |
| Reply | Immediate visual confirmation | After a successful save, a painted balloon floats away and the thank-you note appears. The saved response remains immediately available to assistive technology. |
| Accessibility | Static everywhere | System reduced-motion preference bypasses the cover and displays the completed page. A persistent pause control also shows finished letters and notes. |

## Motion and functionality checks

- Native modal dialog provides focus containment; opening has a skip button and Escape handler. Timers, observers, and scroll listeners clean up on unmount.
- Decorative loops pause when their section leaves the viewport. Parallax uses one passive scroll listener and one scheduled animation frame; it is disabled on coarse-pointer devices and when paused/reduced.
- Animation uses transform/opacity, plus short SVG stroke-dash animations. Existing lightweight SVGs are reused; no new packages or large image downloads were added. Gallery photos remain lazy-loaded.
- Backend handlers, invite-token behavior, OG image, form validation, and the DOM-enabled test configuration are unchanged.
- Ran the actual cover-routing and parallax helper logic in Node with TypeScript export/type syntax stripped: seven assertions passed. Added corresponding Vitest tests. Asset paths, CSS structure, whitespace, reduced-motion/pause safeguards, and unchanged backend sources passed static checks.
- Full TypeScript build, Vitest and rendered browser checks remain unavailable locally because dependencies are missing. This is not a claim of verified smoothness on devices or a successful Netlify deploy.

## Netlify review

Open the home page in a fresh tab session to see the cover. Verify keyboard opening/skip/Escape, scrolling reveals, pause/play, OS reduced-motion, phone layout, browser back, and direct `/rsvp?invite=preview`. The balloon confirmation runs only after a successful backend response; Apps Script integration is still a later step.

---

## Previous design record

# Storybook watercolor update

The latest brief replaces the earlier stationery direction with a static watercolor storybook. All new illustrations are original SVG paths with translucent pigment layers and seeded edge distortion. They do not reference existing book artwork. The original hero photo/cutout and OG image are unchanged.

| Section | Previous stationery design | Current storybook design |
| --- | --- | --- |
| Hero | Cutout on plain cream paper, large pale number | Zade against a loose blue-and-cream watercolor wash, painted crown and balloon, “Chapter one” title-page treatment |
| Welcome and sections | Plain rules and line drawings | Small original painted clouds, moon, crown, and balloon spots beside the text |
| Motion | Gentle scroll fades and form fades | No animation, transitions, or smooth scrolling; content is visible immediately |
| Countdown | Days, hours, minutes, and ticking seconds | Days, hours, and minutes, with a minute-level update and no animated digits |
| RSVP | Separate reply-card page | Same separate `/rsvp` page and submission behavior, with a small watercolor illustration and immediate state changes |

Editable family memories, smaller family portrait, Creole welcome, photo placeholders, [TBD] event details, keyboard focus, and the dedicated reply page remain. The TypeScript test configuration fix is preserved.

Validation: original SVGs parse as XML; local image references and the active component import graph are checked; no motion library is imported by rendered components. Full build/tests/browser verification still require a working dependency installation and supported Node version. No successful Netlify deploy is claimed here.

---

## Previous redesign record

### Zade’s invitation: stationery redesign

The current design follows `zade-invite-redesign-prompt.md`, with the photo treatment informed by `Zade_1_inspo .PNG`. The earlier animated blue-and-gold design remains in Git history at `87bde26`.

## Before / after

| Section | Before | After |
| --- | --- | --- |
| Main invitation | Family photo in a gold arch; Zade in a smaller circle; shiny number and ribbon | Zade is the largest image, a full standing cutout directly on cream paper, without a frame. Script name, serif birthday line, small drawn crown. |
| Background and motion | Blue gradients, floating balloons, sparkles, confetti, glowing buttons | Textured off-white paper, navy ink, antique gold rules, one soft blue accent; gentle fades only, respecting reduced motion. |
| Event details | Rounded cards and icon badges | Left-aligned heading and a ruled list, with date, time, venue/address and RSVP deadline shown as `[TBD]` until set. Calendar and map links remain available when configured. |
| First year | No editable timeline | Four clearly marked memory slots in `src/config/personal.ts`. These are prompts for family memories, not claims about milestones already reached. |
| Photos | Three gold-framed images | Taped paper prints: two clearly labeled newborn/first-year placeholders and an existing photo of Zade. Replace the `src` fields in `personal.ts` with real photos. |
| Family | Primary hero image | A smaller family photo alongside a personal note, Creole welcome, and editable `Obson & [wife’s name]` sign-off. |
| RSVP | Form at the bottom of the home page, confetti on success | Dedicated `/rsvp` page with a bordered reply card, labels, navy “Send RSVP” button, plain choices, quiet confirmation, and a return link. |

## Behavior retained

Public/personal invitations, preview mode, form validation, duplicate-submission guard, existing reply edits, guest limits, dietary field, deadline checks, existing Netlify functions and Apps Script sources, OG image, music option, map/calendar links, and real countdown remain. Preview mode is now retained when moving to the RSVP page or reloading it. Internal navigation preserves the in-memory invitation state and browser back/forward navigation. Netlify’s existing SPA fallback serves direct `/rsvp` visits.

The Apps Script connection is still pending setup; no live submission verification is claimed.

## Image asset

`public/images/zade-cutout.png` was created with the built-in imagegen tool using the existing standing photo as the edit target. The original photo is retained. The generated PNG has an alpha channel. Review the likeness and cutout edges with the family before final invitations.

Prompt: “Use case: background-extraction. Edit target: supplied standing photograph of Zade. Remove ONLY the entire room, door, walls, floor and background. Produce a clean photographic cutout of the exact same child on a truly transparent alpha background. Preserve his exact identity, face, expression, skin tone, curls, hands, body proportions, light blue vest and trousers, white shirt and white shoes, all pose and clothing details. Do not beautify, restyle, redraw, add objects, crown, frame, border, text, shadow or new background. Keep the whole child including shoes, with a little transparent padding. This is a real family photo for a birthday invitation; preserving the original child is paramount.”

## Verification

Static checks cover local assets, whitespace, palette contrast, unchanged backend/OG assets, image alpha, and removal of decorative motion from active components. Added invite-token tests for page transitions and preview persistence. Full type checking, Vitest, production build and rendered desktop/mobile browser checks remain blocked locally: Node is 16.20.2, the project requires newer Node, npm packages are not cached, and registry.npmjs.org does not resolve.

For browser review on Netlify, check `/`, `/rsvp`, and `/rsvp?invite=preview`, including browser back, phone widths, keyboard navigation, reduced motion, and personal invite links. Build command: `npm run build`; publish directory: `dist`; Node 22 is declared in `netlify.toml`.
