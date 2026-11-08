/**
 * Zade Noah Saintfleur — First Birthday Invitations
 * Google Apps Script bound to the guest-list spreadsheet.
 *
 *  • Custom menu: Birthday Invitations → Setup / Preview email / Send selected /
 *    Send unsent / View summary
 *  • Sends personalised invitations with a unique, unguessable link per guest.
 *    Only the SHA-256 hash of each link token is stored in the sheet.
 *  • Open RSVPs from the website's form are added to (or update) the Guests
 *    tab with invite_status "web". Sending email invitations is optional.
 *  • Web App endpoint (doPost) used ONLY by the Netlify Function, authenticated
 *    with an HMAC signature (shared secret in Script Properties), with
 *    timestamp + nonce replay protection and per-invitation rate limiting.
 *
 * Nothing is ever sent automatically: every send requires a confirmation
 * dialog that shows the exact recipient count.
 */

/* ───────────────────────────── Constants ───────────────────────────── */

var SHEET_GUESTS = 'Guests';
var SHEET_SETTINGS = 'Settings';
var SHEET_AUDIT = 'Audit';

var GUEST_HEADERS = [
  'guest_id', 'guest_name', 'email', 'invite_token_hash', 'invite_status', 'sent_at',
  'last_error', 'rsvp_status', 'party_size', 'rsvp_at', 'notes',
  // Optional extras (safe to leave blank):
  'max_party_size', 'guest_message', 'dietary_notes'
];

var SETTINGS_ROWS = [
  ['event_name', "Zade Noah Saintfleur's 1st Birthday", 'Shown in emails'],
  ['child_name', 'Zade Noah Saintfleur', ''],
  ['event_date', '2026-11-22', 'YYYY-MM-DD, e.g. 2027-01-16'],
  ['start_time', '12:00', '24-hour HH:MM, e.g. 14:00'],
  ['end_time', '', 'Optional, HH:MM'],
  ['time_zone', 'America/New_York', 'IANA name, e.g. America/New_York'],
  ['venue_name', '205 Walnut Ave', ''],
  ['venue_address', 'Bellmawr, NJ 08031', 'Town, state and ZIP (the street is in venue_name)'],
  ['map_url', '', 'Optional link; otherwise a Google Maps search is used'],
  ['site_url', 'https://zade1st.netlify.app', 'https://your-site.netlify.app (no trailing slash)'],
  ['sender_name', 'Obson & Maelle', 'e.g. The Saintfleur Family'],
  ['reply_to', '', 'Optional reply-to email address'],
  ['rsvp_deadline', '2026-11-18', 'YYYY-MM-DD (inclusive, event time zone)'],
  ['max_party_size', 'TBD', 'Default max people per invitation, e.g. 4']
];

var REQUIRED_SETTINGS = ['event_date', 'start_time', 'time_zone', 'venue_name', 'venue_address',
  'site_url', 'sender_name', 'rsvp_deadline', 'max_party_size'];

var AUDIT_HEADERS = ['timestamp', 'action', 'guest_id', 'result'];

var EMAIL_SUBJECT = "You're invited! Zade Noah Saintfleur turns ONE 👑";
var MAX_SENDS_PER_RUN = 50;
var RUN_TIME_BUDGET_MS = 4.5 * 60 * 1000;
var SIGNATURE_WINDOW_MS = 5 * 60 * 1000;
var RATE_LIMIT_PER_INVITE = 15;      // requests per invitation…
var RATE_LIMIT_WINDOW_S = 10 * 60;   // …per 10 minutes
var GLOBAL_RATE_LIMIT = 300;         // all requests per 10 minutes

/* ───────────────────────────── Menu ───────────────────────────── */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Birthday Invitations')
    .addItem('Setup', 'menuSetup')
    .addItem('Preview email', 'menuPreviewEmail')
    .addSeparator()
    .addItem('Send selected', 'menuSendSelected')
    .addItem('Send unsent', 'menuSendUnsent')
    .addSeparator()
    .addItem('View summary', 'menuViewSummary')
    .addToUi();
}

/* ───────────────────────────── Setup ───────────────────────────── */

function menuSetup() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActive();

  // Guests
  var guests = ss.getSheetByName(SHEET_GUESTS) || ss.insertSheet(SHEET_GUESTS);
  ensureHeaders_(guests, GUEST_HEADERS);
  guests.setFrozenRows(1);
  var statusCol = GUEST_HEADERS.indexOf('rsvp_status') + 1;
  guests.getRange(2, statusCol, guests.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['', 'yes', 'no'], true).setAllowInvalid(true).build());

  // Settings (plain-text column B so dates/times are not auto-converted)
  var settings = ss.getSheetByName(SHEET_SETTINGS) || ss.insertSheet(SHEET_SETTINGS);
  if (settings.getLastRow() === 0) settings.appendRow(['setting', 'value', 'notes']);
  settings.getRange('B:B').setNumberFormat('@');
  var existing = readSettingsRaw_(settings);
  SETTINGS_ROWS.forEach(function (row) {
    if (!(row[0] in existing)) settings.appendRow(row);
  });
  settings.setFrozenRows(1);
  settings.getRange(1, 1, 1, 3).setFontWeight('bold');

  // Audit
  var audit = ss.getSheetByName(SHEET_AUDIT) || ss.insertSheet(SHEET_AUDIT);
  ensureHeaders_(audit, AUDIT_HEADERS);
  audit.setFrozenRows(1);

  // Shared secret for the Netlify Function ↔ Web App link
  var props = PropertiesService.getScriptProperties();
  var msg = 'Tabs are ready: Guests, Settings, Audit.\n\n' +
    '1. Fill in every "TBD" on the Settings tab.\n' +
    '2. Add guests (guest_name, email; optional max_party_size).\n' +
    '3. Use "Preview email" to send a test to yourself.\n';
  if (!props.getProperty('RSVP_SHARED_SECRET')) {
    var secret = newToken_();
    props.setProperty('RSVP_SHARED_SECRET', secret);
    msg += '\nA new RSVP secret was generated and saved in Script Properties.\n' +
      'Copy it into Netlify → Site configuration → Environment variables as RSVP_SHARED_SECRET.\n' +
      'It is shown only this once (you can also view it under Project Settings → Script Properties):\n\n' +
      secret + '\n';
  } else {
    msg += '\nRSVP_SHARED_SECRET already exists in Script Properties (unchanged).';
  }
  if (!ScriptApp.getService().getUrl()) {
    msg += '\n\nThe RSVP Web App is not deployed yet — see apps-script/README.md (Deploy → New deployment → Web app).';
  }
  audit_('setup', '', 'ok');
  ui.alert('Birthday Invitations — Setup', msg, ui.ButtonSet.OK);
}

function ensureHeaders_(sheet, headers) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var current = sheet.getLastRow() === 0 ? [] : sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (current.length === 0 || current.every(function (c) { return c === ''; })) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    return;
  }
  // Append any missing headers without disturbing existing columns.
  headers.forEach(function (h) {
    if (current.indexOf(h) === -1) {
      current.push(h);
      sheet.getRange(1, current.length).setValue(h).setFontWeight('bold');
    }
  });
}

/* ───────────────────────────── Settings ───────────────────────────── */

function readSettingsRaw_(sheet) {
  var out = {};
  if (!sheet || sheet.getLastRow() < 2) return out;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  values.forEach(function (r) {
    var k = String(r[0]).trim();
    if (k) out[k] = r[1];
  });
  return out;
}

function getSettings_() {
  var raw = readSettingsRaw_(SpreadsheetApp.getActive().getSheetByName(SHEET_SETTINGS));
  var tz = String(raw.time_zone || '').trim() || Session.getScriptTimeZone();
  var s = {};
  Object.keys(raw).forEach(function (k) {
    var v = raw[k];
    if (v instanceof Date) {
      v = /time/.test(k) ? Utilities.formatDate(v, tz, 'HH:mm') : Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    }
    s[k] = String(v === null || v === undefined ? '' : v).trim();
  });
  if (s.site_url) s.site_url = s.site_url.replace(/\/+$/, '');
  return s;
}

function isBlankOrTbd_(v) {
  var t = String(v === null || v === undefined ? '' : v).trim();
  return t === '' || /^tbd$/i.test(t);
}

/** Returns a list of problems; empty list means real invitations may be sent. */
function settingsProblems_(s) {
  var problems = [];
  REQUIRED_SETTINGS.forEach(function (k) { if (isBlankOrTbd_(s[k])) problems.push(k + ' is missing'); });
  if (!isBlankOrTbd_(s.event_date) && !/^\d{4}-\d{2}-\d{2}$/.test(s.event_date)) problems.push('event_date must be YYYY-MM-DD');
  if (!isBlankOrTbd_(s.rsvp_deadline) && !/^\d{4}-\d{2}-\d{2}$/.test(s.rsvp_deadline)) problems.push('rsvp_deadline must be YYYY-MM-DD');
  if (!isBlankOrTbd_(s.start_time) && !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.start_time)) problems.push('start_time must be HH:MM (24-hour)');
  if (s.end_time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.end_time)) problems.push('end_time must be HH:MM (24-hour)');
  if (!isBlankOrTbd_(s.site_url) && !/^https:\/\/[^\s/]+$/.test(s.site_url)) problems.push('site_url must look like https://example.netlify.app');
  if (!isBlankOrTbd_(s.max_party_size) && !(parseInt(s.max_party_size, 10) >= 1)) problems.push('max_party_size must be a number ≥ 1');
  if (!isBlankOrTbd_(s.time_zone)) {
    try { Utilities.formatDate(new Date(), s.time_zone, 'yyyy'); } catch (e) { problems.push('time_zone is not a valid IANA name'); }
  }
  return problems;
}

/* ───────────────────────────── Guests ───────────────────────────── */

function guestSheet_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_GUESTS);
  if (!sh) throw new Error('Run Birthday Invitations → Setup first.');
  return sh;
}

function headerMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  headers.forEach(function (h, i) { map[String(h).trim()] = i; });
  GUEST_HEADERS.slice(0, 11).forEach(function (h) {
    if (!(h in map)) throw new Error('Guests tab is missing the "' + h + '" column. Run Setup.');
  });
  return map;
}

function rowToGuest_(row, map, rowNumber) {
  var g = { _row: rowNumber };
  Object.keys(map).forEach(function (k) { g[k] = row[map[k]]; });
  return g;
}

function readGuests_() {
  var sh = guestSheet_();
  var map = headerMap_(sh);
  var last = sh.getLastRow();
  if (last < 2) return { sheet: sh, map: map, guests: [] };
  var values = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  var guests = values.map(function (r, i) { return rowToGuest_(r, map, i + 2); })
    .filter(function (g) { return String(g.guest_name).trim() || String(g.email).trim(); });
  return { sheet: sh, map: map, guests: guests };
}

function setCells_(sheet, map, rowNumber, updates) {
  Object.keys(updates).forEach(function (k) {
    if (k in map) sheet.getRange(rowNumber, map[k] + 1).setValue(updates[k]);
  });
}

function isValidEmail_(e) {
  return /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]{2,}$/.test(String(e).trim());
}

/* ───────────────────────────── Crypto helpers ───────────────────────────── */

/** Byte array (Apps Script bytes are signed) → lowercase hex. */
function toHex_(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}

function sha256Hex_(s) {
  return toHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
}

function hmacHex_(message, secret) {
  return toHex_(Utilities.computeHmacSha256Signature(message, secret, Utilities.Charset.UTF_8));
}

/** Compares two strings without short-circuiting on the first difference. */
function constantTimeEquals_(a, b) {
  a = String(a); b = String(b);
  var diff = a.length ^ b.length;
  var n = Math.max(a.length, b.length);
  for (var i = 0; i < n; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * 64 hex chars from two version-4 UUIDs (Java SecureRandom, ~244 random bits).
 * The raw token goes ONLY into the guest's email link; the sheet keeps its hash.
 */
function newToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').toLowerCase();
}

/** Scans every row (no early exit) and returns the index of the matching hash, or -1. */
function findIndexByHash_(hashes, tokenHash) {
  var found = -1;
  for (var i = 0; i < hashes.length; i++) {
    var h = String(hashes[i] || '');
    if (h.length === 64 && constantTimeEquals_(h, tokenHash) && found === -1) found = i;
  }
  return found;
}

/* ───────────────────────────── Email ───────────────────────────── */

function formatTime_(hhmm) {
  var p = String(hhmm).split(':');
  var h = parseInt(p[0], 10), m = parseInt(p[1], 10);
  var suffix = h >= 12 ? 'PM' : 'AM';
  var h12 = h % 12 === 0 ? 12 : h % 12;
  return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + suffix;
}

function formatDateLong_(ymd) {
  var p = ymd.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12));
  return Utilities.formatDate(d, 'UTC', 'EEEE, MMMM d, yyyy');
}

/** Noon UTC on the event date — close enough to pick the right EST/EDT label. */
function eventInstantApprox_(ymd) {
  var p = ymd.split('-');
  return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 17));
}

function firstName_(name) {
  var t = String(name || '').trim();
  return t ? t.split(/\s+/)[0] : 'Friend';
}

/**
 * Builds the email. When event facts are not confirmed, the details read
 * "Details coming soon" — nothing is ever guessed.
 */
function buildEmail_(guestName, link, s, isPreview) {
  var ready = settingsProblems_(s).length === 0;
  var dateLine = ready ? formatDateLong_(s.event_date) : 'Details coming soon';
  var timeLine = ready
    ? formatTime_(s.start_time) + (s.end_time ? ' – ' + formatTime_(s.end_time) : '') +
      ' (' + Utilities.formatDate(eventInstantApprox_(s.event_date), s.time_zone, 'z') + ')'
    : '';
  var mapUrl = ready ? (s.map_url || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.venue_address)) : '';
  var deadlineLine = ready ? 'Kindly RSVP by ' + formatDateLong_(s.rsvp_deadline) + '.' : '';
  var sender = isBlankOrTbd_(s.sender_name) ? 'The Saintfleur Family' : s.sender_name;

  var t = HtmlService.createTemplateFromFile('EmailTemplate');
  t.firstName = firstName_(guestName);
  t.childName = 'Zade Noah Saintfleur';
  t.ready = ready;
  t.dateLine = dateLine;
  t.timeLine = timeLine;
  t.venueName = ready ? s.venue_name : '';
  t.venueAddress = ready ? s.venue_address : '';
  t.mapUrl = mapUrl;
  t.link = link;
  t.deadlineLine = deadlineLine;
  t.sender = sender;
  t.isPreview = !!isPreview;
  var html = t.evaluate().getContent();

  var text = [
    (isPreview ? '[PREVIEW — not a real invitation]\n' : '') + 'Dear ' + firstName_(guestName) + ',',
    '',
    "You're invited to celebrate our little prince — Zade Noah Saintfleur turns ONE!",
    '',
    'When: ' + dateLine + (timeLine ? ', ' + timeLine : ''),
    ready ? 'Where: ' + s.venue_name + ', ' + s.venue_address : 'Where: Details coming soon',
    ready ? 'Map: ' + mapUrl : '',
    '',
    'View your invitation and RSVP here (this link is personal to you):',
    link,
    '',
    deadlineLine,
    '',
    'With love,',
    sender
  ].filter(function (line, i, arr) { return !(line === '' && arr[i - 1] === ''); }).join('\n');

  return {
    subject: (isPreview ? '[PREVIEW] ' : '') + EMAIL_SUBJECT,
    htmlBody: html,
    body: text,
    name: sender,
    replyTo: s.reply_to && isValidEmail_(s.reply_to) ? s.reply_to : undefined
  };
}

function inviteLink_(siteUrl, token) {
  return siteUrl + '/?invite=' + encodeURIComponent(token);
}

/* ───────────────────────────── Preview ───────────────────────────── */

function menuPreviewEmail() {
  var ui = SpreadsheetApp.getUi();
  var s = getSettings_();
  var to = PropertiesService.getScriptProperties().getProperty('TEST_EMAIL') || Session.getEffectiveUser().getEmail();
  if (!to) { ui.alert('Could not determine your email. Set a TEST_EMAIL Script Property.'); return; }

  var siteUrl = isBlankOrTbd_(s.site_url) ? 'https://YOUR-SITE.netlify.app' : s.site_url;
  var guestName = 'Guest Name';
  try {
    var data = readGuests_();
    if (data.guests.length && String(data.guests[0].guest_name).trim()) guestName = String(data.guests[0].guest_name).trim();
  } catch (e) { /* Guests tab not set up yet — use sample name */ }

  var problems = settingsProblems_(s);
  var confirm = ui.alert('Preview email',
    'Send ONE preview email to yourself only:\n' + to + '\n\n' +
    'Personalised for: ' + guestName + '\n' +
    'The link in a preview does not work for RSVPs.' +
    (problems.length ? '\n\nSettings incomplete, so details will read "Details coming soon":\n• ' + problems.join('\n• ') : ''),
    ui.ButtonSet.OK_CANCEL);
  if (confirm !== ui.Button.OK) return;

  var email = buildEmail_(guestName, inviteLink_(siteUrl, 'preview'), s, true);
  var opts = { to: to, subject: email.subject, htmlBody: email.htmlBody, body: email.body, name: email.name };
  if (email.replyTo) opts.replyTo = email.replyTo;
  MailApp.sendEmail(opts);
  audit_('preview', '', 'sent to owner');
  ui.alert('Preview sent to ' + to + '.');
}

/* ───────────────────────────── Sending ───────────────────────────── */

function menuSendSelected() {
  var ui = SpreadsheetApp.getUi();
  var data = readGuests_();
  var active = SpreadsheetApp.getActiveSheet();
  if (active.getName() !== SHEET_GUESTS) { ui.alert('Select one or more guest rows on the Guests tab first.'); return; }

  var rows = {};
  var rangeList = active.getActiveRangeList();
  (rangeList ? rangeList.getRanges() : []).forEach(function (r) {
    for (var i = r.getRow(); i < r.getRow() + r.getNumRows(); i++) if (i >= 2) rows[i] = true;
  });
  var selected = data.guests.filter(function (g) { return rows[g._row]; });
  if (!selected.length) { ui.alert('No guest rows selected.'); return; }
  confirmAndSend_(selected, 'selected');
}

function menuSendUnsent() {
  var data = readGuests_();
  var unsent = data.guests.filter(function (g) {
    var st = String(g.invite_status).trim().toLowerCase();
    return st === '' || st === 'error';
  });
  if (!unsent.length) { SpreadsheetApp.getUi().alert('Every guest has already been sent an invitation.'); return; }
  confirmAndSend_(unsent, 'unsent');
}

function confirmAndSend_(guests, label) {
  var ui = SpreadsheetApp.getUi();
  var s = getSettings_();
  var problems = settingsProblems_(s);
  if (problems.length) {
    ui.alert('Invitations are locked',
      'Real invitations cannot be sent until the event details are confirmed on the Settings tab:\n\n• ' +
      problems.join('\n• ') + '\n\nUse "Preview email" to test in the meantime.', ui.ButtonSet.OK);
    return;
  }
  if (!ScriptApp.getService().getUrl() || !PropertiesService.getScriptProperties().getProperty('RSVP_SHARED_SECRET')) {
    var go = ui.alert('RSVP backend not ready',
      'The Web App is not deployed or RSVP_SHARED_SECRET is missing, so guests would not be able to RSVP yet.\n\nSend anyway?',
      ui.ButtonSet.YES_NO);
    if (go !== ui.Button.YES) return;
  }

  var valid = guests.filter(function (g) { return isValidEmail_(g.email); });
  var invalid = guests.length - valid.length;
  var resends = valid.filter(function (g) { return String(g.invite_status).trim().toLowerCase() === 'sent'; }).length;
  var stuck = valid.filter(function (g) { return String(g.invite_status).trim().toLowerCase() === 'sending'; }).length;
  var quota = MailApp.getRemainingDailyQuota();
  var thisRun = Math.min(valid.length, quota, MAX_SENDS_PER_RUN);

  if (!valid.length) { ui.alert('None of the ' + label + ' rows has a valid email address.'); return; }
  if (quota < 1) { ui.alert('Your daily Google email quota is used up. Try again tomorrow.'); return; }

  var msg = 'Send invitations to ' + thisRun + ' guest' + (thisRun === 1 ? '' : 's') + ' (' + label + ')?\n\n' +
    'Remaining Google email quota today: ' + quota + '\n';
  if (valid.length > thisRun) msg += 'Only ' + thisRun + ' will be sent now; run again for the rest.\n';
  if (invalid) msg += invalid + ' row(s) skipped: missing/invalid email.\n';
  if (resends) msg += '\n⚠️ ' + resends + ' guest(s) already received an invitation. Re-sending gives them a NEW link and their old link stops working.\n';
  if (stuck) msg += '\n⚠️ ' + stuck + ' row(s) show "sending" from an interrupted run — they may already have received an email.\n';
  msg += '\nThis cannot be undone.';

  if (ui.alert('Confirm send', msg, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var result = sendInvitations_(valid.slice(0, thisRun), s);
  ui.alert('Done', 'Sent: ' + result.sent + '\nFailed: ' + result.failed +
    (result.stoppedEarly ? '\nStopped early (time/quota). Run again to continue.' : '') +
    (result.failed ? '\n\nSee the last_error column; failed rows can be retried with "Send unsent".' : ''), ui.ButtonSet.OK);
}

/**
 * Sends one email per guest with a fresh token.
 * Order (retry-safe): store hash + status "sending" → send → status "sent".
 * If the script dies after sending, the stored hash still matches the link
 * the guest received, and the row is flagged "sending" for manual review.
 */
function sendInvitations_(guests, s) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Another send is already running. Try again in a minute.');
  var started = Date.now();
  var res = { sent: 0, failed: 0, stoppedEarly: false };
  try {
    var data = readGuests_(); // re-read under the lock
    var byRow = {};
    data.guests.forEach(function (g) { byRow[g._row] = g; });
    var sheet = data.sheet, map = data.map;

    for (var i = 0; i < guests.length; i++) {
      if (Date.now() - started > RUN_TIME_BUDGET_MS || MailApp.getRemainingDailyQuota() < 1) { res.stoppedEarly = true; break; }
      var g = byRow[guests[i]._row];
      if (!g || !isValidEmail_(g.email)) continue;

      var guestId = String(g.guest_id).trim();
      if (!guestId) {
        guestId = 'G-' + Utilities.getUuid().slice(0, 8);
        setCells_(sheet, map, g._row, { guest_id: guestId });
      }

      var token = newToken_();
      setCells_(sheet, map, g._row, { invite_token_hash: sha256Hex_(token), invite_status: 'sending', last_error: '' });
      SpreadsheetApp.flush();

      try {
        var email = buildEmail_(g.guest_name, inviteLink_(s.site_url, token), s, false);
        var opts = { to: String(g.email).trim(), subject: email.subject, htmlBody: email.htmlBody, body: email.body, name: email.name };
        if (email.replyTo) opts.replyTo = email.replyTo;
        MailApp.sendEmail(opts);
        setCells_(sheet, map, g._row, { invite_status: 'sent', sent_at: new Date(), last_error: '' });
        audit_('invite_sent', guestId, 'ok');
        res.sent++;
      } catch (err) {
        // Not delivered → clear the hash so the undelivered token can never be used.
        setCells_(sheet, map, g._row, { invite_token_hash: '', invite_status: 'error', last_error: String(err && err.message || err).slice(0, 200) });
        audit_('invite_sent', guestId, 'error');
        res.failed++;
      }
      SpreadsheetApp.flush();
      token = null;
    }
  } finally {
    lock.releaseLock();
  }
  return res;
}

/* ───────────────────────────── Summary ───────────────────────────── */

function summarize_(guests) {
  var s = { total: guests.length, sent: 0, unsent: 0, errors: 0, sending: 0, web: 0, yes: 0, no: 0, pending: 0, headcount: 0 };
  guests.forEach(function (g) {
    var st = String(g.invite_status).trim().toLowerCase();
    if (st === 'sent') s.sent++; else if (st === 'error') s.errors++; else if (st === 'sending') s.sending++; else if (st === 'web') s.web++; else s.unsent++;
    var r = String(g.rsvp_status).trim().toLowerCase();
    if (r === 'yes') { s.yes++; s.headcount += parseInt(g.party_size, 10) || 1; }
    else if (r === 'no') s.no++;
    else s.pending++;
  });
  return s;
}

function menuViewSummary() {
  var ui = SpreadsheetApp.getUi();
  var sum = summarize_(readGuests_().guests);
  var problems = settingsProblems_(getSettings_());
  ui.alert('Invitation summary',
    'Guests: ' + sum.total + (sum.web ? '   (RSVP\'d on the website: ' + sum.web + ')' : '') + '\n' +
    'Invitations sent: ' + sum.sent + '   Not sent: ' + sum.unsent + '   Errors: ' + sum.errors +
    (sum.sending ? '   Interrupted ("sending"): ' + sum.sending : '') + '\n\n' +
    'RSVP yes: ' + sum.yes + '   No: ' + sum.no + '   No reply yet: ' + sum.pending + '\n' +
    'Expected headcount: ' + sum.headcount + '\n\n' +
    'Email quota left today: ' + MailApp.getRemainingDailyQuota() + '\n' +
    'Web App deployed: ' + (ScriptApp.getService().getUrl() ? 'yes' : 'no') + '\n' +
    (problems.length ? '\nSettings still needed:\n• ' + problems.join('\n• ') : '\nSettings: complete ✓'),
    ui.ButtonSet.OK);
}

/* ───────────────────────────── Audit ───────────────────────────── */

/** Never pass tokens, emails or request bodies here. */
function audit_(action, guestId, result) {
  try {
    var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_AUDIT);
    if (sh) sh.appendRow([new Date(), action, guestId || '', result]);
  } catch (e) { /* auditing must never break the main flow */ }
}

/* ───────────────────────────── RSVP Web App ───────────────────────────── */

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Verifies { payload, ts, nonce, sig } from the Netlify Function. */
function verifyEnvelope_(env, secret, nowMs) {
  if (!secret || String(secret).length < 32) return { ok: false, code: 'not_configured' };
  if (!env || typeof env.payload !== 'string' || typeof env.nonce !== 'string' || typeof env.sig !== 'string') {
    return { ok: false, code: 'unauthorized' };
  }
  var ts = Number(env.ts);
  if (!isFinite(ts) || Math.abs(nowMs - ts) > SIGNATURE_WINDOW_MS) return { ok: false, code: 'unauthorized' };
  if (!/^[a-f0-9]{32}$/.test(env.nonce) || !/^[a-f0-9]{64}$/.test(env.sig)) return { ok: false, code: 'unauthorized' };
  var expected = hmacHex_(ts + '.' + env.nonce + '.' + env.payload, secret);
  if (!constantTimeEquals_(expected, env.sig)) return { ok: false, code: 'unauthorized' };
  return { ok: true };
}

/** Returns true if this request should be blocked. */
function rateLimit_(cache, key, limit) {
  var n = parseInt(cache.get(key) || '0', 10) + 1;
  cache.put(key, String(n), RATE_LIMIT_WINDOW_S);
  return n > limit;
}

/**
 * Pure RSVP logic (unit-tested). Given the guest row and validated input,
 * returns the cell updates — always the same row, so repeat submissions
 * simply overwrite the latest answer (idempotent upsert).
 */
function applyRsvp_(guest, input, defaultMax, now) {
  var max = parseInt(guest.max_party_size, 10) || parseInt(defaultMax, 10) || 1;
  if (typeof input.attending !== 'boolean') return { ok: false, code: 'invalid' };
  var party = 0;
  if (input.attending) {
    party = Number(input.partySize);
    if (!(party >= 1 && party % 1 === 0)) return { ok: false, code: 'invalid' };
    if (party > max) return { ok: false, code: 'party_limit', limit: max };
  }
  var clip = function (v, n) {
    var t = String(v || '').slice(0, n);
    return /^[=+\-@\t\r]/.test(t) ? "'" + t : t; // formula-injection guard
  };
  return {
    ok: true,
    updates: {
      rsvp_status: input.attending ? 'yes' : 'no',
      party_size: party,
      rsvp_at: now,
      guest_message: clip(input.message, 500),
      dietary_notes: input.attending ? clip(input.dietaryNotes, 200) : ''
    }
  };
}

function rsvpClosed_(s, now) {
  if (isBlankOrTbd_(s.rsvp_deadline) || isBlankOrTbd_(s.time_zone)) return false;
  try {
    return Utilities.formatDate(now, s.time_zone, 'yyyy-MM-dd') > s.rsvp_deadline;
  } catch (e) { return false; }
}

/* ── Open RSVP (anyone with the site link, from the "RSVP Now" form) ── */

var PUBLIC_DEFAULT_MAX_PARTY = 10;

function normName_(n) {
  return String(n || '').replace(/^'/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[-.,_']+/g, ' ').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Pure rule (unit-tested): one RSVP per person. Returns the index of a row
 * that has already replied with this name (ignoring case, spacing, accents
 * and punctuation) or this email, else -1.
 */
function findDuplicate_(guests, email, name) {
  var e = String(email || '').trim().toLowerCase();
  var n = normName_(name);
  for (var i = 0; i < guests.length; i++) {
    var g = guests[i];
    if (!String(g.rsvp_status || '').trim()) continue;
    if (normName_(g.guest_name) === n) return i;
    if (e && String(g.email || '').trim().toLowerCase() === e) return i;
  }
  return -1;
}

/**
 * Pure matching rule (unit-tested) for open RSVPs:
 *  • with an email → the row with that email (so people can change their answer)
 *  • without one   → an earlier email-less web RSVP with the same name
 * Otherwise -1, meaning "add a new row". Invited guests with an email on file
 * are only matched by that email, never by name.
 */
function findPublicMatch_(guests, email, name) {
  var e = String(email || '').trim().toLowerCase();
  var n = normName_(name);
  for (var i = 0; i < guests.length; i++) {
    var g = guests[i];
    var ge = String(g.email || '').trim().toLowerCase();
    if (e) {
      if (ge && ge === e) return i;
    } else if (!ge && String(g.invite_status).trim().toLowerCase() === 'web' && normName_(g.guest_name) === n) {
      return i;
    }
  }
  return -1;
}

function handlePublicRsvp_(req, cache) {
  var name = String(req.guestName || '').trim();
  var email = String(req.email || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 81) return { ok: false, code: 'invalid' };
  if (email && !isValidEmail_(email)) return { ok: false, code: 'invalid' };
  if (rateLimit_(cache, 'rl:pub:' + sha256Hex_(email || normName_(name)).slice(0, 40), RATE_LIMIT_PER_INVITE)) {
    return { ok: false, code: 'rate_limited' };
  }

  var s = getSettings_();
  var now = new Date();
  if (rsvpClosed_(s, now)) return { ok: false, code: 'closed' };
  var defaultMax = parseInt(s.max_party_size, 10) || PUBLIC_DEFAULT_MAX_PARTY;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false, code: 'busy' };
  try {
    var d = readGuests_();
    // Checked inside the lock, so two people sending the same name at the same moment can't both get in.
    if (findDuplicate_(d.guests, email, name) !== -1) {
      audit_('rsvp_web', '', 'duplicate refused');
      return { ok: false, code: 'duplicate' };
    }
    var idx = findPublicMatch_(d.guests, email, name);
    var existing = idx === -1 ? {} : d.guests[idx];
    var r = applyRsvp_(existing, req, defaultMax, now);
    if (!r.ok) return { ok: false, code: r.code, limit: r.limit };

    if (idx !== -1) {
      setCells_(d.sheet, d.map, existing._row, r.updates);
      SpreadsheetApp.flush();
      audit_('rsvp_web', existing.guest_id, 'updated: ' + r.updates.rsvp_status + ' (' + r.updates.party_size + ')');
      return { ok: true, updated: true };
    }

    var guestId = 'W-' + Utilities.getUuid().slice(0, 8);
    var values = { guest_id: guestId, guest_name: name, email: email, invite_status: 'web' };
    Object.keys(r.updates).forEach(function (k) { values[k] = r.updates[k]; });
    var width = d.sheet.getLastColumn();
    var row = [];
    for (var c = 0; c < width; c++) row.push('');
    Object.keys(values).forEach(function (k) { if (k in d.map) row[d.map[k]] = values[k]; });
    d.sheet.appendRow(row);
    SpreadsheetApp.flush();
    audit_('rsvp_web', guestId, 'new: ' + r.updates.rsvp_status + ' (' + r.updates.party_size + ')');
    return { ok: true, updated: false };
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  // Deliberately reveals nothing (no guest data, no status).
  return jsonOut_({ ok: false, code: 'method_not_allowed' });
}

function doPost(e) {
  try {
    var secret = PropertiesService.getScriptProperties().getProperty('RSVP_SHARED_SECRET');
    var env = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var v = verifyEnvelope_(env, secret, Date.now());
    if (!v.ok) return jsonOut_({ ok: false, code: v.code });

    var cache = CacheService.getScriptCache();
    if (cache.get('nonce:' + env.nonce)) return jsonOut_({ ok: false, code: 'unauthorized' }); // replay
    cache.put('nonce:' + env.nonce, '1', 600);

    if (rateLimit_(cache, 'rl:global', GLOBAL_RATE_LIMIT)) return jsonOut_({ ok: false, code: 'rate_limited' });

    var req = JSON.parse(env.payload);
    if (req && req.action === 'public_rsvp') return jsonOut_(handlePublicRsvp_(req, cache));
    if (!req || (req.action !== 'lookup' && req.action !== 'rsvp') || !/^[a-f0-9]{64}$/.test(String(req.tokenHash))) {
      return jsonOut_({ ok: false, code: 'invalid' });
    }
    if (rateLimit_(cache, 'rl:' + req.tokenHash.slice(0, 40), RATE_LIMIT_PER_INVITE)) {
      return jsonOut_({ ok: false, code: 'rate_limited' });
    }

    var s = getSettings_();
    var now = new Date();
    var closed = rsvpClosed_(s, now);

    if (req.action === 'lookup') {
      var data = readGuests_();
      var idx = findIndexByHash_(data.guests.map(function (g) { return g.invite_token_hash; }), req.tokenHash);
      if (idx === -1) return jsonOut_({ ok: false, code: 'not_found' });
      var g = data.guests[idx];
      return jsonOut_({
        ok: true,
        guestName: String(g.guest_name || '').trim(),
        maxPartySize: parseInt(g.max_party_size, 10) || parseInt(s.max_party_size, 10) || 1,
        rsvpStatus: String(g.rsvp_status || '').trim().toLowerCase(),
        partySize: parseInt(g.party_size, 10) || 0,
        closed: closed
      });
    }

    // action === 'rsvp'
    if (closed) return jsonOut_({ ok: false, code: 'closed' });
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) return jsonOut_({ ok: false, code: 'busy' });
    try {
      var d = readGuests_();
      var i = findIndexByHash_(d.guests.map(function (g) { return g.invite_token_hash; }), req.tokenHash);
      if (i === -1) return jsonOut_({ ok: false, code: 'not_found' });
      var guest = d.guests[i];
      var r = applyRsvp_(guest, req, s.max_party_size, now);
      if (!r.ok) {
        audit_('rsvp', guest.guest_id, 'rejected:' + r.code);
        return jsonOut_({ ok: false, code: r.code, limit: r.limit });
      }
      setCells_(d.sheet, d.map, guest._row, r.updates);
      SpreadsheetApp.flush();
      audit_('rsvp', guest.guest_id, r.updates.rsvp_status + ' (' + r.updates.party_size + ')');
      return jsonOut_({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    audit_('rsvp_error', '', String(err && err.name || 'Error')); // no payload details
    return jsonOut_({ ok: false, code: 'error' });
  }
}
