import { createHash, createHmac, randomBytes } from "node:crypto";

/**
 * Server-to-server call to the Google Apps Script Web App.
 *
 * Apps Script web apps cannot read request headers, so the request is an
 * envelope: { payload, ts, nonce, sig } where
 *   sig = HMAC-SHA256(RSVP_SHARED_SECRET, `${ts}.${nonce}.${payload}`)
 * Apps Script recomputes the HMAC (constant-time compare), rejects stale
 * timestamps (> 5 min) and replayed nonces (CacheService).
 *
 * The raw invite token never leaves this function — only its SHA-256 hash.
 */

export type AppsScriptAction =
  | { action: "lookup"; tokenHash: string }
  | {
      action: "rsvp";
      tokenHash: string;
      attending: boolean;
      partySize: number;
      message: string;
      dietaryNotes: string;
    }
  | {
      action: "public_rsvp";
      guestName: string;
      email: string;
      attending: boolean;
      partySize: number;
      message: string;
      dietaryNotes: string;
    };

export interface AppsScriptResult {
  updated?: boolean;
  ok: boolean;
  code?: string;
  guestName?: string;
  maxPartySize?: number;
  rsvpStatus?: string;
  partySize?: number;
  closed?: boolean;
  limit?: number;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function signEnvelope(payload: string, secret: string, ts = Date.now(), nonce = randomBytes(16).toString("hex")) {
  const sig = createHmac("sha256", secret).update(`${ts}.${nonce}.${payload}`, "utf8").digest("hex");
  return { payload, ts, nonce, sig };
}

export class BackendNotConfigured extends Error {}

export async function callAppsScript(body: AppsScriptAction): Promise<AppsScriptResult> {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.RSVP_SHARED_SECRET;
  if (!url || !secret || secret.length < 32) throw new BackendNotConfigured("RSVP backend is not configured.");
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) {
    throw new BackendNotConfigured("APPS_SCRIPT_URL must be the /exec URL of the deployed web app.");
  }

  const envelope = signEnvelope(JSON.stringify(body), secret);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(envelope),
    redirect: "follow", // Apps Script answers via a 302 to googleusercontent.com
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Apps Script HTTP ${res.status}`);
  try {
    return JSON.parse(text) as AppsScriptResult;
  } catch {
    // Usually means the web app isn't deployed with "Anyone" access (HTML login page returned).
    throw new Error("Apps Script returned a non-JSON response");
  }
}
