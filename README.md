# Zade Noah Saintfleur Turns ONE! — Digital Invitation

Mobile-first, blue-and-gold interactive invitation. **Anyone with the site link can RSVP**: "RSVP Now" jumps to the form (name, optional email, yes/no, party size, note) and answers land in the Google Sheet. Emailing personal invitation links from the sheet is optional.

- **Website:** React + Vite + TypeScript, Tailwind CSS, Motion, canvas-confetti
- **RSVP API:** Netlify Functions (`/.netlify/functions/invite`, `/.netlify/functions/rsvp`)
- **Guest list + emails:** Google Sheets + Apps Script (`apps-script/`)

```
Guest opens site link ─▶ "RSVP Now" ─▶ form on the Netlify site (static)
   (or a personal link /?invite=<token> from an optional invitation email)
                                           │  POST name/email/answer (or token)
                                           ▼
                                 Netlify Function (server)
                                   • validates input, deadline, origin, rate limit
                                   • spam checks (honeypot field + time-on-form)
                                   • hashes any token (SHA-256)
                                   • signs request with RSVP_SHARED_SECRET (HMAC)
                                           │  signed request
                                           ▼
                                 Apps Script Web App ──▶ Google Sheet (Guests row upsert)
```

The browser never sees a secret, a spreadsheet ID, or anyone else's data.

---

## ⚠️ Before you send anything — facts still needed

Nothing has been invented. These are still **TBD** and must be filled in
**both** in `src/config/event.ts` (website) **and** on the sheet's Settings tab
(emails):

- [ ] Event date
- [ ] Start time (and optional end time)
- [ ] Time zone (e.g. `America/New_York`)
- [ ] Venue name
- [ ] Venue address
- [ ] RSVP deadline
- [ ] Max guests per invitation
- [ ] Netlify URL / custom domain → sheet `site_url`
- [ ] Contact / reply-to email (optional) → `contactEmail` + sheet `reply_to`
- [ ] Sender name for emails (e.g. "The Saintfleur Family") → sheet `sender_name`

Until then the site shows "Details coming soon" and the sheet refuses to send
real invitations.

> The date, time and venue in the earlier design mockup were examples only and
> are deliberately **not** used anywhere.

---

## Deploying to Netlify

### Option A — Git + Netlify (recommended; RSVP works)

1. Put this folder in a **private** GitHub repository (it contains Zade's photos).
2. Netlify → *Add new site → Import an existing project* → pick the repo.
   Build settings are read from `netlify.toml`: build `npm run build`, publish `dist`, functions `netlify/functions`.
3. *Site configuration → Environment variables*: add `APPS_SCRIPT_URL`, `RSVP_SHARED_SECRET` (and optionally `ALLOWED_ORIGIN`) — see `.env.example` and `apps-script/README.md`.
4. *Deploys → Trigger deploy*. Netlify sets `URL` during the build so link previews get an absolute image URL.

### Option B — Netlify CLI from your computer (RSVP works)

```bash
npm install
npm test
npx netlify-cli login
npx netlify-cli deploy --build          # draft URL to test
npx netlify-cli deploy --build --prod   # live
```

Set the environment variables in the Netlify UI (or `netlify env:set`) first.

### Option C — Drag-and-drop (Netlify Drop) — preview only

Dragging the prebuilt `dist/` folder onto app.netlify.com/drop publishes the
invitation page, but **Netlify Drop does not deploy Functions**, so RSVPs will
show "RSVPs aren't open yet". Use it to preview the design on your phone; use
A or B for the real invitation. (`_headers` and `_redirects` are inside `dist/`
so security headers still apply.)

---

## Editing

| What | Where |
|---|---|
| Date, time, venue, deadline, party size, contact | `src/config/event.ts` |
| Optional music (a track you own/licensed) | put file in `public/audio/`, set `music.src` in `src/config/event.ts` |
| Ask for dietary notes | `askDietaryNotes: true` in `src/config/event.ts` |
| Photos | `public/images/` (regenerate with `scripts/prepare-images.mjs`) |
| Colours / fonts | `src/index.css` (`@theme`) |
| Email wording | `apps-script/EmailTemplate.html` + `buildEmail_` in `Code.gs` |

Photos were resized and **stripped of EXIF/GPS metadata**. Originals are not
included. To replace them: `npm i -D sharp && node scripts/prepare-images.mjs family.jpg zade-closeup.jpg zade-standing.jpg`.

## Local development

```bash
npm install
npm run dev          # site only (RSVP calls will fail without functions)
npx netlify-cli dev  # site + functions; put env vars in a local .env (gitignored)
npm test             # 53 tests: validation, time zones, Apps Script logic, function ↔ Apps Script end-to-end
npm run build        # type-check + production build into dist/
```

`?invite=preview` shows the RSVP form in preview mode (cannot submit). Without Netlify Functions running (plain `npm run dev`), submitting shows a connection error — that's expected.

---

## Security & privacy

- **Open RSVP:** a new reply adds a row to Guests with `invite_status = web`. Replying again with the same email — or, without an email, the same name — updates that row instead of adding another. A name alone never overwrites a guest who has an email on file. Spam controls: hidden honeypot field, minimum time on the form (bots get a fake "success" and nothing is saved), 5 public RSVPs per connection per 10 minutes, plus the Apps Script limits.
- **Personal links (optional):** each guest gets a 64-hex token from two random UUIDs (~244 bits). Only its SHA-256 hash is stored in the sheet; the raw token exists only in the guest's email. Hash lookups use constant-time comparison.
- **Token hygiene:** the site removes `?invite=` from the address bar on load (kept in sessionStorage for the tab), sends `Referrer-Policy: no-referrer`, has no analytics, and functions never log tokens or request bodies.
- **Forwarding:** anyone with a guest's link can RSVP for that guest. An extra "confirm your email" step can be added if needed.
- **Server-side validation:** schema, lengths, allowed values, party-size limit (global and per guest), RSVP deadline (end of day in the event time zone), spreadsheet formula-injection guard.
- **Abuse controls:** per-IP limit in each function instance (best-effort — Netlify Functions are stateless and may run on several instances), plus shared per-invitation and global limits in Apps Script `CacheService`. For stronger limits, add Netlify's rate-limiting rules if your plan includes them.
- **CORS / origin:** only the site's own origin (and `ALLOWED_ORIGIN`) may call the functions; other origins get 403 and no CORS headers.
- **Function ↔ Apps Script:** HMAC-SHA256 signature over timestamp + nonce + payload, 5-minute window, single-use nonces.
- **Headers:** strict CSP (self only; fonts are bundled, no Google Fonts/CDNs), `X-Frame-Options: DENY`, `X-Robots-Tag: noindex`.
- **Photos are public to anyone with the site URL.** `noindex` keeps search engines away, but anyone who has (or is forwarded) the link can see and save the images. The link preview image (`og-image.png`) is an illustration — it does not include Zade's photo.

## Deployment checklist

- [ ] All TBD facts filled in `src/config/event.ts` and the Settings tab — and they match
- [ ] Apps Script: Setup run, Web App deployed (Execute as Me / Anyone), `/exec` URL copied
- [ ] Netlify env vars `APPS_SCRIPT_URL`, `RSVP_SHARED_SECRET` set, site redeployed
- [ ] Sheet `site_url` = the live Netlify URL
- [ ] `npm test` and `npm run build` pass
- [ ] Phone check (iPhone + Android): hero, countdown, map link, add-to-calendar
- [ ] Share the bare site URL in WhatsApp → preview shows title + illustration
- [ ] Preview email received; looks right in Gmail app
- [ ] Open the live site on your phone → **RSVP Now** → submit → a new row appears on the Guests tab; submit again with the same email → the same row updates
- [ ] Share the site link (WhatsApp, text, etc.). Emailing invitations from the sheet is optional

## Project structure

```
public/images/            optimized, metadata-free photos (webp + jpg)
public/og-image.png       privacy-safe link preview illustration
public/_headers, _redirects
src/config/event.ts       ← the one place for event facts
src/components/           Hero, Balloons, Decor (SVG), EventDetails, Countdown,
                          PhotoGallery, RsvpForm, MusicToggle, Icons
src/lib/                  time zones, RSVP validation, invite-token handling
netlify/functions/        invite.ts (lookup), rsvp.ts (submit)
netlify/lib/              Apps Script signing client, HTTP/CORS/rate-limit helpers
apps-script/              Code.gs, EmailTemplate.html, appsscript.json, README, sample CSVs
tests/                    Vitest suites (incl. an in-memory Apps Script harness)
```
