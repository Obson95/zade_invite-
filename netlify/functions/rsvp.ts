/**
 * POST /.netlify/functions/rsvp
 *
 * Open RSVP (default — from the "RSVP Now" form):
 *   { guestName, email?, attending, partySize?, message?, dietaryNotes?, website, formMs }
 * Personal-link RSVP (only if you email invitation links):
 *   { inviteToken, attending, partySize?, message?, dietaryNotes? }
 * → { ok: true, attending, partySize, updated? } | { ok: false, error, field? }
 */
import { event } from "../../src/config/event";
import { ABSOLUTE_MAX_PARTY, DEFAULT_PUBLIC_MAX_PARTY, validatePublicRsvp, validateRsvp } from "../../src/lib/rsvp-schema";
import { isPastDeadline, isValidDateString, isValidTimeZone } from "../../src/lib/time";
import { BackendNotConfigured, callAppsScript, hashToken, type AppsScriptAction } from "../lib/apps-script";
import { clientIp, gate, json, rateLimited } from "../lib/http";

const GENERIC_INVALID = "This invitation link isn't valid or has expired. Please use the link from your email.";

export default async (req: Request): Promise<Response> => {
  const g = await gate(req);
  if ("early" in g) return g.early;

  if (rateLimited(`rsvp:${clientIp(req)}`, 10, 60_000)) {
    return json(req, 429, { ok: false, error: "Too many attempts. Please wait a minute and try again." });
  }

  const body = g.body as Record<string, unknown> | null;
  const personal = !!body && typeof body === "object" && "inviteToken" in body;

  let call: AppsScriptAction;
  let attending: boolean;
  let partySize: number;

  if (personal) {
    const v = validateRsvp(body, event.maxGuestsPerInvite ?? ABSOLUTE_MAX_PARTY);
    if (!v.ok) return json(req, 400, { ok: false, error: v.error, field: v.field });
    ({ attending, partySize } = v.value);
    call = {
      action: "rsvp",
      tokenHash: hashToken(v.value.inviteToken),
      attending,
      partySize,
      message: v.value.message,
      dietaryNotes: v.value.dietaryNotes,
    };
  } else {
    const v = validatePublicRsvp(body, event.maxGuestsPerInvite ?? DEFAULT_PUBLIC_MAX_PARTY);
    if (!v.ok) return json(req, 400, { ok: false, error: v.error, field: v.field });
    if ("spam" in v) {
      // Looks like a bot: answer like a success so it learns nothing, but save nothing.
      return json(req, 200, { ok: true, attending: false, partySize: 0 });
    }
    // Extra per-IP brake for open submissions.
    if (rateLimited(`rsvp-public:${clientIp(req)}`, 5, 10 * 60_000)) {
      return json(req, 429, { ok: false, error: "Too many RSVPs from this connection. Please try again later." });
    }
    ({ attending, partySize } = v.value);
    call = { action: "public_rsvp", ...v.value };
  }

  if (
    isValidDateString(event.rsvpDeadline) &&
    isValidTimeZone(event.timeZone) &&
    isPastDeadline(event.rsvpDeadline, event.timeZone)
  ) {
    return json(req, 410, { ok: false, error: "RSVPs are now closed. Please contact the family directly." });
  }

  try {
    const r = await callAppsScript(call);

    if (r.ok) return json(req, 200, { ok: true, attending, partySize, updated: Boolean(r.updated) });

    switch (r.code) {
      case "not_found":
        return json(req, 404, { ok: false, error: GENERIC_INVALID });
      case "closed":
        return json(req, 410, { ok: false, error: "RSVPs are now closed. Please contact the family directly." });
      case "party_limit":
        return json(req, 400, {
          ok: false,
          field: "partySize",
          error: `Party size can be up to ${r.limit ?? 1} ${r.limit === 1 ? "guest" : "guests"}.`,
        });
      case "rate_limited":
        return json(req, 429, { ok: false, error: "Too many attempts. Please wait a few minutes and try again." });
      default:
        console.error("RSVP backend rejected request:", r.code ?? "unknown");
        return json(req, 502, { ok: false, error: "We couldn't save your RSVP. Please try again shortly." });
    }
  } catch (err) {
    // Never log the token or request body.
    if (err instanceof BackendNotConfigured) {
      console.error("RSVP backend not configured:", err.message);
      return json(req, 503, { ok: false, error: "RSVPs aren't open yet. Please check back soon." });
    }
    console.error("RSVP backend error:", (err as Error).name, (err as Error).message);
    return json(req, 502, { ok: false, error: "We couldn't save your RSVP. Please try again shortly." });
  }
};
