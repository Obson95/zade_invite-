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
