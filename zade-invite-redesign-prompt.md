Redesign my son's 1st birthday invitation site so it feels handmade and personal, not AI-generated. Keep all existing functionality (RSVP form → Google Sheets, Netlify deploy, OG image, mobile layout) and the blue + gold "little prince" theme, but rework the visual design and copy.

THEME: Storybook watercolor
- The whole site IS a picture book, with a gentle French storybook feel
- Soft, hand-painted watercolor washes in sky blue and pale cream, with visible paper grain and uneven, bleeding edges (static image/SVG textures, not CSS gradients)
- Fine gold ink accents: thin hand-drawn lines, small stars, a simple crown, used sparingly
- Headings set like a storybook title page; opening line such as "Once upon a time, a little prince named Zade arrived…"
- All illustrations must be original — do not copy or imitate artwork from any existing book, including The Little Prince
- Zade's hero photo framed with a soft watercolor wash or painted border so it blends into the page

BOOK STRUCTURE — turn every section into its own page:
- Cover: "Zade Is One" title, Zade's photo, crown, closed-book look; tap/click to open
- Page 1 – Once upon a time: the story opening + large hero photo of Zade
- Page 2 – The day he arrived: newborn photos (2–3 slots) + short text
- Page 3 – Zade's first year: 3–4 editable milestones, each with its own photo slot
- Page 4 – Watch him grow: video page with 2–3 video slots (first laugh, first steps, etc.)
- Page 5 – Favorite things / little moments: photo collage page (4–6 slots, scrapbook style)
- Page 6 – The party: date, time, venue, dress code, all marked [TBD]
- Page 7 – A message from Mom & Dad: English + Haitian Creole/French line, family photo (smaller than Zade's), signed "Obson & [wife's name]" in script
- Page 8 – RSVP: reply card with the existing form
- Back cover: thank-you line, small crown, "The End… of chapter one"
- On desktop show two-page spreads (left/right pages); on phones show one page at a time
- Navigation: realistic page-turn when clicking page corners or arrows, swipe on touch, keyboard arrow keys, small page numbers at the bottom of each page, and a simple page index to jump to RSVP
- Make pages easy to add, remove, or reorder later (data-driven content, e.g. a pages array or JSON)

PHOTO & VIDEO PLACEHOLDERS:
- Many photo slots across pages, styled like taped/polaroid prints or painted frames, with placeholder images I can swap in one place (e.g. /images folder + config file)
- Zade is the star: his photo must be the largest, most prominent image in the book. Photos of me and my wife are smaller and secondary — it's his day, not ours
- Video slots styled like framed pictures in the book, with a painted play button over a poster image; tap to play, with sound off by default and controls shown
- Videos lazy-load only when their page opens, pause when the page turns, and support captions; use compressed MP4 (or allow a YouTube/Vimeo link instead) so the site stays fast on Netlify

REMOVE these AI tells:
- Gradient backgrounds, glassmorphism/frosted cards, glowing shadows
- Emojis in headings and buttons (👑🎈✨)
- Generic fonts (Inter, Poppins, Montserrat) and everything-centered layouts
- Identical rounded cards stacked in a column
- Generic, template-looking motion: bouncy pop-ins, glowing pulses, sparkle bursts, confetti cannons
- Stock phrasing like "Join us as we celebrate," "a magical day," "our little prince's special milestone," and em-dash-heavy sentences
- Remove the "Skip animation" button entirely
- Remove the pause/play animation button entirely (keep only the play controls on the videos themselves)

MAKE IT FEEL HANDMADE AND PRINTED:
- Off-white paper background with subtle texture; navy (#1F2A44-ish) and muted antique gold (not bright yellow), one soft sky-blue accent
- Typography: one elegant serif for headings (e.g. Cormorant Garamond or Playfair), a hand-lettered/script font used ONLY for "Zade" and maybe one phrase, a clean readable body font
- Editorial page layouts: mix left-aligned text, large photo slots, thin gold rule lines, generous whitespace; vary layouts from page to page
- Hand-painted watercolor illustrations (crown, balloon, clouds, moon) instead of glossy clipart

ANIMATION — lots of it, storybook-style and hand-crafted, not generic AI effects:
- Opening: the cover opens like a real book to reveal page 1
- Realistic page-turn animation between every page (paper curl, shadow on the fold)
- Watercolor washes that "bleed" and spread into place when each page opens
- Gold ink lines, stars and the crown that draw themselves in (SVG stroke animation)
- Zade's name hand-lettered in script, written out stroke by stroke
- Clouds and a small balloon drifting slowly, with gentle parallax between layers
- Twinkling gold stars and a soft moon in the background
- Photos that settle onto the page like prints being placed down, with a slight tilt
- RSVP: after submitting, a small painted balloon or paper envelope floats away, then a thank-you note appears
- Keep motion slow and soft (eased, organic timing), never fast or bouncy
- No skip button; instead, respect the system prefers-reduced-motion setting by showing pages with simple fades and no page-curl for those users
- Keep it smooth on phones (animate transform/opacity, preload the next page, lazy-load heavy assets)

COPY: Rewrite all text to sound warm, plain, and like a parent wrote it. Short sentences, no clichés. Keep placeholders for date, time, venue, and RSVP deadline clearly marked as [TBD].

RSVP PAGE: Make it look like a reply card tucked into the book — simple bordered form, labels above fields, one solid navy button with plain text ("Send RSVP"), friendly confirmation message after submitting.

Keep it accessible (WCAG AA contrast, real labels, keyboard navigation through pages, visible focus states, alt text on photos, captions on videos). Show me the before/after of the main pages when done.
