import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { signEnvelope } from "../netlify/lib/apps-script";
import { GUEST_HEADERS, loadAppsScript, seed } from "./helpers/gas";

const SECRET = "s".repeat(64);
const TOKEN_A = "1".repeat(64);
const TOKEN_B = "2".repeat(64);
const sha = (t: string) => createHash("sha256").update(t).digest("hex");

const SETTINGS = {
  event_date: "2027-01-16",
  start_time: "14:00",
  time_zone: "America/New_York",
  venue_name: "Example Hall",
  venue_address: "1 Main St",
  site_url: "https://example.netlify.app",
  sender_name: "The Saintfleur Family",
  rsvp_deadline: "2099-01-01",
  max_party_size: "4",
};

function call(env: ReturnType<typeof loadAppsScript>, body: unknown, opts: { secret?: string; ts?: number; nonce?: string } = {}) {
  const envlp = signEnvelope(JSON.stringify(body), opts.secret ?? SECRET, opts.ts, opts.nonce);
  const out = env.context.doPost({ postData: { contents: JSON.stringify(envlp) } });
  return JSON.parse(out.getContent());
}

function rows(env: ReturnType<typeof loadAppsScript>) {
  const g = env.sheets.get("Guests")!;
  return g.data.slice(1).filter((r) => r.length).map((r) => Object.fromEntries(GUEST_HEADERS.map((h, i) => [h, r[i]])));
}

describe("Code.gs crypto helpers", () => {
  const env = loadAppsScript();
  it("hashes exactly like Node (signed-byte → hex)", () => {
    expect(env.context.sha256Hex_(TOKEN_A)).toBe(sha(TOKEN_A));
    expect(env.context.sha256Hex_("héllo ✓")).toBe(sha("héllo ✓"));
  });
  it("generates 64-hex unguessable tokens", () => {
    const a = env.context.newToken_();
    const b = env.context.newToken_();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(b);
  });
  it("compares in constant time and correctly", () => {
    expect(env.context.constantTimeEquals_("abc", "abc")).toBe(true);
    expect(env.context.constantTimeEquals_("abc", "abd")).toBe(false);
    expect(env.context.constantTimeEquals_("abc", "abcd")).toBe(false);
  });
});

describe("Code.gs RSVP web app", () => {
  let env: ReturnType<typeof loadAppsScript>;
  beforeEach(() => {
    env = loadAppsScript({ secret: SECRET });
    seed(
      env,
      [
        { guest_id: "G-1", guest_name: "Marie Joseph", email: "marie@example.com", invite_token_hash: sha(TOKEN_A), invite_status: "sent" },
        { guest_id: "G-2", guest_name: "Jean Pierre", email: "jean@example.com", invite_token_hash: sha(TOKEN_B), invite_status: "sent", max_party_size: "2" },
      ],
      SETTINGS,
    );
  });

  it("looks up only the matching guest", () => {
    const r = call(env, { action: "lookup", tokenHash: sha(TOKEN_B) });
    expect(r).toEqual({ ok: true, guestName: "Jean Pierre", maxPartySize: 2, rsvpStatus: "", partySize: 0, closed: false });
    expect(JSON.stringify(r)).not.toContain("marie");
  });

  it("returns a generic not_found for unknown tokens", () => {
    expect(call(env, { action: "lookup", tokenHash: sha("x") })).toEqual({ ok: false, code: "not_found" });
  });

  it("upserts idempotently — repeat submissions update the same row, never add rows", () => {
    expect(call(env, { action: "rsvp", tokenHash: sha(TOKEN_A), attending: true, partySize: 3, message: "Yay", dietaryNotes: "" }).ok).toBe(true);
    expect(call(env, { action: "rsvp", tokenHash: sha(TOKEN_A), attending: true, partySize: 3, message: "Yay", dietaryNotes: "" }).ok).toBe(true);
    expect(call(env, { action: "rsvp", tokenHash: sha(TOKEN_A), attending: false, partySize: 0, message: "Sorry", dietaryNotes: "" }).ok).toBe(true);
    const r = rows(env);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ guest_id: "G-1", rsvp_status: "no", party_size: 0, guest_message: "Sorry" });
    expect(r[1].rsvp_status).toBe(""); // other guest untouched
  });

  it("enforces the per-guest party limit", () => {
    expect(call(env, { action: "rsvp", tokenHash: sha(TOKEN_B), attending: true, partySize: 3, message: "", dietaryNotes: "" }))
      .toEqual({ ok: false, code: "party_limit", limit: 2 });
  });

  it("rejects bad signatures, stale timestamps and replays", () => {
    const body = { action: "lookup", tokenHash: sha(TOKEN_A) };
    expect(call(env, body, { secret: "x".repeat(64) }).code).toBe("unauthorized");
    expect(call(env, body, { ts: Date.now() - 10 * 60 * 1000 }).code).toBe("unauthorized");
    const nonce = "ab".repeat(16);
    expect(call(env, body, { nonce }).ok).toBe(true);
    expect(call(env, body, { nonce }).code).toBe("unauthorized");
  });

  it("refuses RSVPs after the deadline", () => {
    const s = env.sheets.get("Settings")!;
    const row = s.data.findIndex((r) => r[0] === "rsvp_deadline");
    s.data[row][1] = "2020-01-01";
    expect(call(env, { action: "rsvp", tokenHash: sha(TOKEN_A), attending: true, partySize: 1, message: "", dietaryNotes: "" }).code).toBe("closed");
    expect(call(env, { action: "lookup", tokenHash: sha(TOKEN_A) }).closed).toBe(true);
  });

  it("rate-limits repeated attempts per invitation", () => {
    let last: { code?: string } = {};
    for (let i = 0; i < 16; i++) last = call(env, { action: "lookup", tokenHash: sha(TOKEN_A) });
    expect(last.code).toBe("rate_limited");
  });

  it("never writes raw tokens or payloads to the Audit tab", () => {
    call(env, { action: "rsvp", tokenHash: sha(TOKEN_A), attending: true, partySize: 1, message: "secret note", dietaryNotes: "" });
    const audit = JSON.stringify(env.sheets.get("Audit")!.data);
    expect(audit).not.toContain(TOKEN_A);
    expect(audit).not.toContain(sha(TOKEN_A));
    expect(audit).not.toContain("secret note");
  });
});

describe("Code.gs sending", () => {
  it("blocks real invitations while settings contain TBD", () => {
    const env = loadAppsScript({ secret: SECRET });
    expect(env.context.settingsProblems_({ ...SETTINGS, event_date: "TBD" })).toContain("event_date is missing");
    expect(env.context.settingsProblems_(SETTINGS)).toEqual([]);
  });

  it("sends with a fresh token, stores only its hash, and marks the row sent", () => {
    const env = loadAppsScript({ secret: SECRET });
    seed(env, [{ guest_name: "Marie Joseph", email: "marie@example.com" }], SETTINGS);
    const settings = env.context.getSettings_();
    const guests = env.context.readGuests_().guests;
    const res = env.context.sendInvitations_(guests, settings);
    expect(res).toMatchObject({ sent: 1, failed: 0 });
    const row = rows(env)[0];
    expect(row.invite_status).toBe("sent");
    expect(row.guest_id).toMatch(/^G-/);
    const link = String(env.sent[0].body).match(/\?invite=([a-f0-9]{64})/)![1];
    expect(row.invite_token_hash).toBe(sha(link)); // hash stored, raw token only in the email
    expect(JSON.stringify(env.sheets.get("Guests")!.data)).not.toContain(link);
    expect(env.sent[0].subject).toBe("You're invited! Zade Noah Saintfleur turns ONE 👑");
  });

  it("marks failures for retry and clears the undelivered token hash", () => {
    const env = loadAppsScript({ secret: SECRET });
    seed(env, [{ guest_name: "Marie", email: "marie@example.com" }], SETTINGS);
    (env.context.MailApp as { sendEmail: () => void }).sendEmail = () => { throw new Error("Service invoked too many times"); };
    const res = env.context.sendInvitations_(env.context.readGuests_().guests, env.context.getSettings_());
    expect(res).toMatchObject({ sent: 0, failed: 1 });
    expect(rows(env)[0]).toMatchObject({ invite_status: "error", invite_token_hash: "" });
  });

  it("email never contains guessed facts when details are TBD", () => {
    const env = loadAppsScript();
    const e = env.context.buildEmail_("Marie", "https://x.netlify.app/?invite=preview", { ...SETTINGS, event_date: "TBD", venue_name: "TBD" }, true);
    expect(e.body).toContain("Details coming soon");
    expect(e.body).not.toContain("Example Hall");
    expect(e.subject.startsWith("[PREVIEW]")).toBe(true);
  });
});

describe("Code.gs open RSVPs", () => {
  let env: ReturnType<typeof loadAppsScript>;
  const pub = (over: Record<string, unknown>) =>
    call(env, { action: "public_rsvp", guestName: "Marie Joseph", email: "", attending: true, partySize: 2, message: "", dietaryNotes: "", ...over });

  beforeEach(() => {
    env = loadAppsScript({ secret: SECRET });
    seed(env, [{ guest_id: "G-1", guest_name: "Jean Pierre", email: "jean@example.com", invite_status: "sent", invite_token_hash: sha(TOKEN_A) }], SETTINGS);
  });

  it("adds a new guest row marked 'web'", () => {
    expect(pub({ email: "marie@example.com" })).toEqual({ ok: true, updated: false });
    const r = rows(env);
    expect(r).toHaveLength(2);
    expect(r[1]).toMatchObject({ guest_name: "Marie Joseph", email: "marie@example.com", invite_status: "web", rsvp_status: "yes", party_size: 2 });
    expect(String(r[1].guest_id)).toMatch(/^W-/);
  });

  it("re-submitting with the same email updates the same row", () => {
    pub({ email: "marie@example.com" });
    expect(pub({ email: "marie@example.com", attending: false, partySize: 0 })).toEqual({ ok: true, updated: true });
    const r = rows(env);
    expect(r).toHaveLength(2);
    expect(r[1]).toMatchObject({ rsvp_status: "no", party_size: 0 });
  });

  it("without email, the same name updates the earlier web RSVP", () => {
    pub({});
    pub({ guestName: "  marie   JOSEPH ", partySize: 3 });
    const r = rows(env);
    expect(r).toHaveLength(2);
    expect(r[1].party_size).toBe(3);
  });

  it("an existing guest's email matches their row (no duplicate)", () => {
    pub({ guestName: "Jean P.", email: "jean@example.com", partySize: 4 });
    const r = rows(env);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ guest_id: "G-1", rsvp_status: "yes", party_size: 4 });
  });

  it("a name alone never overwrites an invited guest who has an email", () => {
    pub({ guestName: "Jean Pierre" });
    expect(rows(env)).toHaveLength(2);
    expect(rows(env)[0].rsvp_status).toBe("");
  });

  it("enforces the default party limit and the deadline", () => {
    expect(pub({ partySize: 5 })).toEqual({ ok: false, code: "party_limit", limit: 4 });
    const s = env.sheets.get("Settings")!;
    s.data[s.data.findIndex((x) => x[0] === "rsvp_deadline")][1] = "2020-01-01";
    expect(pub({}).code).toBe("closed");
  });

  it("is not picked up by 'Send unsent'", () => {
    pub({ email: "marie@example.com" });
    const unsent = env.context.readGuests_().guests.filter((g: { invite_status: string }) => ["", "error"].includes(String(g.invite_status)));
    expect(unsent).toHaveLength(0);
  });
});
