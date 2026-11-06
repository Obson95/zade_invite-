# Google Sheets + Apps Script setup

This folder is the "back office" for the invitation: the guest list, the
RSVP endpoint the Netlify site talks to, and (optionally) invitation emails.

**RSVPs are open:** anyone with the site link can reply through "RSVP Now".
Each new reply adds a row to the Guests tab with `invite_status = web`;
replying again with the same email (or, without one, the same name) updates
that row. You only need steps 1–3 below for RSVPs to work. Sections 4–5
(emailing personal invitation links) are optional.

| File | Where it goes |
|---|---|
| `Code.gs` | Apps Script editor → file `Code.gs` |
| `EmailTemplate.html` | Apps Script editor → **+ → HTML** → name it exactly `EmailTemplate` |
| `appsscript.json` | Apps Script editor → ⚙️ Project Settings → tick *Show "appsscript.json"* → paste over it |
| `sample/*.csv` | Reference only — **Setup** creates these tabs for you |

## 1. Create the sheet and script (5 min)

1. Create a new Google Sheet, e.g. **Zade 1st Birthday — Guests**. Keep it private (don't share the link publicly).
2. **Extensions → Apps Script**. Replace the default code with `Code.gs`, add the `EmailTemplate` HTML file, and update `appsscript.json` as above. Save.
3. Reload the spreadsheet. A **Birthday Invitations** menu appears.
4. Click **Birthday Invitations → Setup**. Google asks you to authorize the script — it needs to read/write *this* spreadsheet, send email as you, and show dialogs. (You may see "Google hasn't verified this app": that's normal for your own script → *Advanced → Go to project*.)
5. Setup creates the **Guests**, **Settings** and **Audit** tabs and generates `RSVP_SHARED_SECRET` in Script Properties. It shows the secret **once** — copy it straight into Netlify (step 3 below). Don't paste it in chats, emails or the sheet.

## 2. Fill in the sheet

**Settings tab** — replace every `TBD`. Use exact formats:

| setting | example |
|---|---|
| event_date | `2027-01-16` |
| start_time / end_time | `14:00` / `17:00` (24-hour) |
| time_zone | `America/New_York` |
| site_url | `https://your-site.netlify.app` (no trailing slash) |
| rsvp_deadline | `2027-01-02` (last day RSVPs are accepted) |
| max_party_size | `4` |

These must match `src/config/event.ts` on the website. **Real invitations stay
locked until every required setting is filled in** — the menu refuses to send
and tells you what's missing.

**Guests tab** — one row per invitation (a household counts as one row). Fill
`guest_name` and `email`; optionally `max_party_size` to override the default
for that household. Leave the other columns empty: the script manages them.

| column | managed by | meaning |
|---|---|---|
| guest_id | script | assigned on first send |
| invite_token_hash | script | SHA-256 of the guest's private link token. The raw token is only in their email. |
| invite_status | script | blank → `sending` → `sent`, or `error`; `web` = replied through the open RSVP form |
| sent_at / last_error | script | |
| rsvp_status / party_size / rsvp_at | website | `yes` / `no`, latest answer wins |
| guest_message / dietary_notes | website | guest's optional note |
| notes | you | private notes — never shown to guests |

## 3. Deploy the RSVP Web App

1. In the Apps Script editor: **Deploy → New deployment → ⚙️ → Web app**.
2. *Execute as:* **Me**. *Who has access:* **Anyone**.
3. **Deploy**, then copy the **Web app URL** ending in `/exec`.
4. In Netlify → *Site configuration → Environment variables* add:
   - `APPS_SCRIPT_URL` = that `/exec` URL
   - `RSVP_SHARED_SECRET` = the secret from Setup
   - (optional) `ALLOWED_ORIGIN` = your custom domain if you add one
   Then **redeploy** the site so the functions pick them up.

**Why "Anyone"?** Netlify's server can't sign in to a Google account, so the
web app must accept anonymous requests. It is still locked down:

- Every request must carry an HMAC-SHA256 signature made with the shared
  secret; unsigned/forged requests get `unauthorized` and nothing else.
- Requests older than 5 minutes are rejected, and each nonce works once
  (replay protection via `CacheService`).
- Rate limits: 15 requests per invitation and 300 overall per 10 minutes.
- It only answers "is this one hash on the list?" — it never lists guests.
- `doGet` returns nothing useful.

**After editing `Code.gs`:** *Deploy → Manage deployments → ✏️ Edit → Version:
New version → Deploy*. This keeps the same `/exec` URL. (Creating a *new*
deployment gives a new URL, which you'd then have to update in Netlify.)

To rotate the secret: edit `RSVP_SHARED_SECRET` under ⚙️ Project Settings →
Script Properties, update Netlify's env var to match, and redeploy the site.

## 4. (Optional) Test email invitations

1. **Birthday Invitations → Preview email** — sends ONE email to you only
   (your account, or the `TEST_EMAIL` Script Property if you set one). The
   preview link opens the site in preview mode; it can't submit an RSVP.
2. Add yourself as a guest row, select that row, **Send selected**. On your
   phone, open the email, tap the button, RSVP, and check that your row's
   `rsvp_status`, `party_size` and `rsvp_at` update. Change your answer — the
   same row updates; no new row appears.
3. Check the date, time, venue and map link in the email are correct.

## 5. (Optional) Send email invitations

Rows marked `web` are never included in **Send unsent**.

- **Send selected** — select rows on the Guests tab first.
- **Send unsent** — every row whose status is blank or `error`.

Both show a confirmation with the exact recipient count, your remaining daily
quota, and warnings before anything is sent. Nothing ever sends automatically
on edit.

- Re-sending to a `sent` guest creates a **new** link and the old one stops
  working (only one hash is stored).
- A row stuck at `sending` means the script was interrupted mid-send; that
  guest may already have the email and their link works. Check with them
  before re-sending.
- Failed rows are marked `error` with the reason; fix and use **Send unsent**.

**Google email limits:** Apps Script mail is subject to Google's daily quota
(roughly 100 recipients/day for a free Gmail account, more on Google
Workspace). The confirmation shows what's left today; each run sends at most
50, and you can run it again (or the next day) for the rest.

**View summary** shows sent/unsent counts, yes/no/pending, expected headcount,
quota and whether the web app is deployed.

## Privacy & security notes

- The open form means anyone with the site link can add an RSVP. Spam is filtered (honeypot, time-on-form, rate limits), but check the Guests tab for anything odd before final counts.
- Personal links are personal but **can be forwarded** — anyone holding a link can
  RSVP for that guest. If that matters, the next step would be asking guests
  to confirm the email address their invitation was sent to before an RSVP is
  accepted (not enabled by default).
- The Audit tab records timestamp, action, guest_id and result only — never
  tokens, hashes, emails or messages.
- Guest messages are stored with a leading `'` if they start with `= + - @`,
  so nothing a guest types can run as a spreadsheet formula.
