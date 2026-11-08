/**
 * End-to-end: Netlify Function → (signed envelope) → Code.gs doPost, with the
 * network replaced by a direct call into the in-memory Apps Script.
 */
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import rsvp from "../netlify/functions/rsvp";
import invite from "../netlify/functions/invite";
import { _resetRateLimits } from "../netlify/lib/http";
import { loadAppsScript, seed } from "./helpers/gas";

const SECRET = "k".repeat(64);
const TOKEN = "c".repeat(64);
const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const ORIGIN = "https://zade.netlify.app";

let env: ReturnType<typeof loadAppsScript>;
let sentBodies: string[] = [];

function req(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}/.netlify/functions/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  _resetRateLimits();
  process.env.APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfyc_test-123/exec";
  process.env.RSVP_SHARED_SECRET = SECRET;
  env = loadAppsScript({ secret: SECRET });
  seed(env, [{ guest_id: "G-1", guest_name: "Marie Joseph", email: "m@example.com", invite_token_hash: sha(TOKEN), invite_status: "sent" }], {
    rsvp_deadline: "2099-01-01",
    time_zone: "America/New_York",
    max_party_size: "4",
  });
  sentBodies = [];
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    sentBodies.push(String(init.body));
    const out = env.context.doPost({ postData: { contents: String(init.body) } });
    return new Response(out.getContent(), { status: 200 });
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("invite function", () => {
  it("returns the guest's own info", async () => {
    const res = await invite(req("invite", { inviteToken: TOKEN }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, guestName: "Marie Joseph", maxPartySize: 4 });
  });
  it("gives a generic 404 for unknown tokens", async () => {
    const res = await invite(req("invite", { inviteToken: "d".repeat(64) }));
    expect(res.status).toBe(404);
  });
});

describe("rsvp function", () => {
  it("saves an RSVP and never sends the raw token to Apps Script", async () => {
    const res = await rsvp(req("rsvp", { inviteToken: TOKEN, attending: true, partySize: 2, message: "See you!" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, attending: true, partySize: 2, updated: false });
    expect(sentBodies.join()).not.toContain(TOKEN);
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
  });

  it("duplicate submissions do not create duplicate guests", async () => {
    for (let i = 0; i < 3; i++) await rsvp(req("rsvp", { inviteToken: TOKEN, attending: true, partySize: 2 }));
    const rowsWithData = env.sheets.get("Guests")!.data.slice(1).filter((r) => r.some((v) => v !== ""));
    expect(rowsWithData).toHaveLength(1);
  });

  it("rejects other origins", async () => {
    const res = await rsvp(req("rsvp", { inviteToken: TOKEN, attending: true }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rejects bad input, wrong method and wrong content type", async () => {
    expect((await rsvp(req("rsvp", { inviteToken: TOKEN, attending: "maybe" }))).status).toBe(400);
    expect((await rsvp(req("rsvp", "{not json"))).status).toBe(400);
    expect((await rsvp(new Request(`${ORIGIN}/.netlify/functions/rsvp`, { method: "GET" }))).status).toBe(405);
    expect((await rsvp(req("rsvp", { inviteToken: TOKEN, attending: true }, { "content-type": "text/plain" }))).status).toBe(415);
  });

  it("returns a generic error for unknown tokens", async () => {
    const res = await rsvp(req("rsvp", { inviteToken: "e".repeat(64), attending: false }));
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toMatch(/isn't valid or has expired/);
  });

  it("rate-limits a single client", async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await rsvp(req("rsvp", { inviteToken: TOKEN, attending: false }, { "x-nf-client-connection-ip": "1.2.3.4" }))).status;
    expect(last).toBe(429);
  });

  it("returns 503 (not a crash) when env vars are missing", async () => {
    delete process.env.RSVP_SHARED_SECRET;
    const res = await rsvp(req("rsvp", { inviteToken: TOKEN, attending: false }));
    expect(res.status).toBe(503);
  });
});

describe("rsvp function — open RSVP", () => {
  const body = { guestName: "Rose Saint-Fleur", email: "rose@example.com", attending: true, partySize: 3, message: "Bravo!", website: "", formMs: 9000 };

  it("saves a new guest from the public form", async () => {
    const res = await rsvp(req("rsvp", body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, attending: true, partySize: 3, updated: false });
    const names = env.sheets.get("Guests")!.data.map((r) => r[1]);
    expect(names).toContain("Rose Saint-Fleur");
  });

  it("a second RSVP from the same person is refused, not duplicated", async () => {
    await rsvp(req("rsvp", body));
    const res = await rsvp(req("rsvp", { ...body, attending: false }));
    expect(res.status).toBe(409);
    expect(((await res.json()) as { field: string }).field).toBe("guestName");
    const rose = env.sheets.get("Guests")!.data.filter((r) => r[1] === "Rose Saint-Fleur");
    expect(rose).toHaveLength(1);
  });

  it("silently drops bot submissions without saving", async () => {
    const res = await rsvp(req("rsvp", { ...body, website: "spam.example" }));
    expect(res.status).toBe(200);
    expect(sentBodies).toHaveLength(0);
  });

  it("requires a name", async () => {
    const res = await rsvp(req("rsvp", { ...body, guestName: "" }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { field: string }).field).toBe("guestName");
  });
});
