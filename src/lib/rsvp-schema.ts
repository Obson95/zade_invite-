/**
 * RSVP request validation shared by the browser form and the Netlify Function.
 * The server ALWAYS re-validates; client checks are only for friendly errors.
 */

export const TOKEN_RE = /^[a-f0-9]{64}$/;
export const MAX_MESSAGE_LENGTH = 500;
export const MAX_DIETARY_LENGTH = 200;
export const ABSOLUTE_MAX_PARTY = 20;

export interface RsvpInput {
  inviteToken: string;
  attending: boolean;
  partySize?: number;
  message?: string;
  dietaryNotes?: string;
}

export interface CleanRsvp {
  inviteToken: string;
  attending: boolean;
  partySize: number;
  message: string;
  dietaryNotes: string;
}

export type ValidationResult = { ok: true; value: CleanRsvp } | { ok: false; error: string; field?: string };

const ALLOWED_KEYS = new Set(["inviteToken", "attending", "partySize", "message", "dietaryNotes"]);

/** Removes control characters (keeps newlines/tabs) and trims. */
export function cleanText(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

/** Neutralises spreadsheet formula injection (=, +, -, @ at the start). */
export function neutraliseFormula(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function isValidToken(t: unknown): t is string {
  return typeof t === "string" && TOKEN_RE.test(t);
}

/**
 * @param maxParty the per-invitation limit (global config or per-guest override)
 */
export function validateRsvp(body: unknown, maxParty: number): ValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request." };
  }
  const b = body as Record<string, unknown>;
  for (const k of Object.keys(b)) {
    if (!ALLOWED_KEYS.has(k)) return { ok: false, error: "Invalid request." };
  }
  if (!isValidToken(b.inviteToken)) {
    return { ok: false, error: "This invitation link isn't valid." };
  }
  if (typeof b.attending !== "boolean") {
    return { ok: false, error: "Please choose whether you can attend.", field: "attending" };
  }

  const limit = Math.max(1, Math.min(ABSOLUTE_MAX_PARTY, Math.floor(maxParty)));
  let partySize = 0;
  if (b.attending) {
    const raw = b.partySize === undefined ? 1 : b.partySize;
    if (typeof raw !== "number" || !Number.isInteger(raw)) {
      return { ok: false, error: "Party size must be a whole number.", field: "partySize" };
    }
    if (raw < 1 || raw > limit) {
      return { ok: false, error: `Party size must be between 1 and ${limit}.`, field: "partySize" };
    }
    partySize = raw;
  } else if (b.partySize !== undefined && b.partySize !== 0 && b.partySize !== null) {
    // Ignore party size for "no" — but reject garbage types.
    if (typeof b.partySize !== "number") return { ok: false, error: "Invalid request." };
  }

  const text = (v: unknown, max: number, field: string): string | { error: string; field: string } => {
    if (v === undefined || v === null) return "";
    if (typeof v !== "string") return { error: "Invalid text.", field };
    const c = cleanText(v);
    if (c.length > max) return { error: `Please keep this under ${max} characters.`, field };
    return c;
  };

  const message = text(b.message, MAX_MESSAGE_LENGTH, "message");
  if (typeof message !== "string") return { ok: false, ...message };
  const dietaryNotes = text(b.dietaryNotes, MAX_DIETARY_LENGTH, "dietaryNotes");
  if (typeof dietaryNotes !== "string") return { ok: false, ...dietaryNotes };

  return {
    ok: true,
    value: {
      inviteToken: b.inviteToken,
      attending: b.attending,
      partySize,
      message: neutraliseFormula(message),
      dietaryNotes: b.attending ? neutraliseFormula(dietaryNotes) : "",
    },
  };
}

/* ── Open (public) RSVP — anyone with the site link can reply ─────────────── */

export const DEFAULT_PUBLIC_MAX_PARTY = 10;
export const MAX_NAME_LENGTH = 80;
export const MAX_EMAIL_LENGTH = 120;
/** Submissions faster than this after the form appeared are treated as bots. */
export const MIN_FORM_MS = 2500;

export interface CleanPublicRsvp {
  guestName: string;
  email: string;
  attending: boolean;
  partySize: number;
  message: string;
  dietaryNotes: string;
}

export type PublicValidationResult =
  | { ok: true; value: CleanPublicRsvp }
  | { ok: true; spam: true }
  | { ok: false; error: string; field?: string };

const PUBLIC_KEYS = new Set(["guestName", "email", "attending", "partySize", "message", "dietaryNotes", "website", "formMs"]);
const EMAIL_RE = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]{2,}$/;

export function isValidEmail(s: string): boolean {
  return s.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(s);
}

/**
 * Validates an open RSVP. `website` is a hidden honeypot field humans never
 * fill in, and `formMs` is how long the form was open — either tripping
 * returns { spam: true } so the caller can pretend success without saving.
 */
export function validatePublicRsvp(body: unknown, maxParty: number): PublicValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid request." };
  const b = body as Record<string, unknown>;
  for (const k of Object.keys(b)) if (!PUBLIC_KEYS.has(k)) return { ok: false, error: "Invalid request." };

  if (typeof b.website === "string" && b.website.trim() !== "") return { ok: true, spam: true };
  if (typeof b.formMs !== "number" || !Number.isFinite(b.formMs) || b.formMs < MIN_FORM_MS) return { ok: true, spam: true };

  if (typeof b.guestName !== "string") return { ok: false, error: "Please enter your name.", field: "guestName" };
  const guestName = cleanText(b.guestName).replace(/\s+/g, " ");
  if (guestName.length < 2) return { ok: false, error: "Please enter your name.", field: "guestName" };
  if (guestName.length > MAX_NAME_LENGTH) return { ok: false, error: `Please keep your name under ${MAX_NAME_LENGTH} characters.`, field: "guestName" };

  let email = "";
  if (b.email !== undefined && b.email !== null && b.email !== "") {
    if (typeof b.email !== "string") return { ok: false, error: "Invalid email.", field: "email" };
    email = cleanText(b.email).toLowerCase();
    if (email && !isValidEmail(email)) return { ok: false, error: "Please check your email address.", field: "email" };
  }

  // Reuse the core checks for attending / party size / text fields.
  const core = validateRsvp(
    {
      inviteToken: "0".repeat(64),
      attending: b.attending,
      ...(b.partySize !== undefined ? { partySize: b.partySize } : {}),
      ...(b.message !== undefined ? { message: b.message } : {}),
      ...(b.dietaryNotes !== undefined ? { dietaryNotes: b.dietaryNotes } : {}),
    },
    maxParty,
  );
  if (!core.ok) return core;

  return {
    ok: true,
    value: {
      guestName: neutraliseFormula(guestName),
      email,
      attending: core.value.attending,
      partySize: core.value.partySize,
      message: core.value.message,
      dietaryNotes: core.value.dietaryNotes,
    },
  };
}
