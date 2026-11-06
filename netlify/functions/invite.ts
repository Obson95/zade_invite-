/**
 * POST /.netlify/functions/invite   Body: { inviteToken }
 * Returns ONLY the invited guest's own first-party info so the RSVP form can
 * greet them and show their existing answer. Never returns other guests.
 * → { ok: true, guestName, maxPartySize, rsvpStatus, partySize, closed } | { ok: false, error }
 */
import { event } from "../../src/config/event";
import { ABSOLUTE_MAX_PARTY, isValidToken } from "../../src/lib/rsvp-schema";
import { isPastDeadline, isValidDateString, isValidTimeZone } from "../../src/lib/time";
import { BackendNotConfigured, callAppsScript, hashToken } from "../lib/apps-script";
import { clientIp, gate, json, rateLimited } from "../lib/http";

export default async (req: Request): Promise<Response> => {
  const g = await gate(req);
  if ("early" in g) return g.early;

  if (rateLimited(`invite:${clientIp(req)}`, 20, 60_000)) {
    return json(req, 429, { ok: false, error: "Too many attempts. Please wait a minute and try again." });
  }

  const body = g.body as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Object.keys(body).length !== 1 || !isValidToken(body.inviteToken)) {
    return json(req, 400, { ok: false, error: "This invitation link isn't valid." });
  }

  try {
    const r = await callAppsScript({ action: "lookup", tokenHash: hashToken(body.inviteToken) });
    if (!r.ok) {
      if (r.code === "rate_limited") return json(req, 429, { ok: false, error: "Too many attempts. Please try again later." });
      return json(req, 404, { ok: false, error: "This invitation link isn't valid or has expired." });
    }
    const configClosed =
      isValidDateString(event.rsvpDeadline) &&
      isValidTimeZone(event.timeZone) &&
      isPastDeadline(event.rsvpDeadline, event.timeZone);
    return json(req, 200, {
      ok: true,
      guestName: r.guestName ?? "",
      maxPartySize: Math.min(r.maxPartySize ?? event.maxGuestsPerInvite ?? 1, ABSOLUTE_MAX_PARTY),
      rsvpStatus: r.rsvpStatus ?? "",
      partySize: r.partySize ?? 0,
      closed: Boolean(r.closed) || configClosed,
    });
  } catch (err) {
    if (err instanceof BackendNotConfigured) {
      console.error("RSVP backend not configured:", err.message);
      return json(req, 503, { ok: false, error: "RSVPs aren't open yet. Please check back soon." });
    }
    console.error("Invite lookup error:", (err as Error).name, (err as Error).message);
    return json(req, 502, { ok: false, error: "We couldn't load your invitation. Please try again shortly." });
  }
};
