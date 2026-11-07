Redesign my son's 1st birthday invitation site so it feels handmade and personal, not AI-generated. Keep all existing functionality (RSVP form → Google Sheets, Netlify deploy, OG image, mobile layout) and the blue + gold "little prince" theme, but rework the visual design and copy.

THEME: Storybook watercolor
- The page should read like the pages of a classic children's picture book, with a gentle French storybook feel
- Soft, hand-painted watercolor washes in sky blue and pale cream, with visible paper grain and uneven, bleeding edges (static image/SVG textures, not CSS gradients)
- Fine gold ink accents: thin hand-drawn lines, small stars, a simple crown, used sparingly
- Each section feels like a book page: a watercolor illustration spot (cloud, small balloon, crown, little planet or moon) beside short text
- Headings set like a storybook title page; an optional opening line such as "Once upon a time, a little prince named Zade arrived…"
- All illustrations must be original — do not copy or imitate artwork from any existing book, including The Little Prince
- Zade's hero photo framed with a soft watercolor wash or painted border so it blends into the page

REMOVE these AI tells:
- Gradient backgrounds, glassmorphism/frosted cards, glowing shadows
- Emojis in headings and buttons (👑🎈✨)
- Generic fonts (Inter, Poppins, Montserrat) and everything-centered layouts
- Identical rounded cards stacked in a column
- Generic, template-looking motion: bouncy pop-ins, glowing pulses, sparkle bursts, confetti cannons
- Stock phrasing like "Join us as we celebrate," "a magical day," "our little prince's special milestone," and em-dash-heavy sentences

MAKE IT FEEL HANDMADE AND PRINTED:
- Off-white paper background with subtle texture; navy (#1F2A44-ish) and muted antique gold (not bright yellow), one soft sky-blue accent
- Typography: one elegant serif for headings (e.g. Cormorant Garamond or Playfair), a hand-lettered/script font used ONLY for "Zade" and maybe one phrase, a clean readable body font
- Asymmetric, editorial layout: mix left-aligned text, a large photo slot, thin gold rule lines, generous whitespace
- Hand-painted watercolor illustrations (crown, balloon, clouds) instead of glossy clipart
- Lots of animation, but storybook-style and hand-crafted, not generic AI effects:
  - Opening: a book cover that opens (or a page-turn) to reveal the invitation
  - Watercolor washes that "bleed" and spread into place as each section scrolls into view
  - Gold ink lines, stars and the crown that draw themselves in (SVG stroke animation)
  - Zade's name hand-lettered in script, written out stroke by stroke
  - Clouds and a small balloon drifting slowly across the sky, with gentle parallax between layers
  - Twinkling gold stars and a soft moon in the background
  - Photos that settle onto the page like prints being placed down, with a slight tilt
  - Page-turn or soft dissolve transitions between sections
  - RSVP: after submitting, a small painted balloon or paper envelope floats away, then a thank-you note appears
  - Keep motion slow and soft (eased, organic timing), never fast or bouncy
  - Respect prefers-reduced-motion: show the finished static version for those users
  - Keep it smooth on phones (animate transform/opacity, lazy-load heavy assets)

PERSONAL TOUCHES:
- Zade is the star: his photo must be the largest, most prominent image on the page (hero position). Any photos of me and my wife should be noticeably smaller and secondary — it's his day, not ours
- Photo slots for real pictures of Zade (newborn → now), styled like taped/polaroid prints with placeholder images I can swap
- A short "Zade's first year" section with 3–4 milestones I can edit
- A line in Haitian Creole and/or French alongside English (e.g. a welcome or "Nou pa ka tann pou nou fete avè w!"), reflecting our family
- Sign-off from "Obson & [wife's name]" in script

COPY: Rewrite all text to sound warm, plain, and like a parent wrote it. Short sentences, no clichés. Keep placeholders for date, time, venue, and RSVP deadline clearly marked as [TBD].

RSVP SECTION: Make it look like a reply card — simple bordered form, labels above fields, one solid navy button with plain text ("Send RSVP"), friendly confirmation message after submitting.

Keep it accessible (WCAG AA contrast, real labels, keyboard focus states, alt text). Show me the before/after of the main sections when done.
