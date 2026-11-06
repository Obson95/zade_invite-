import { describe, expect, it } from "vitest";
import { validateRsvp, neutraliseFormula, cleanText } from "../src/lib/rsvp-schema";

const token = "a".repeat(64);

describe("validateRsvp", () => {
  it("accepts a valid yes with party size", () => {
    const r = validateRsvp({ inviteToken: token, attending: true, partySize: 3, message: "  Can't wait! " }, 4);
    expect(r).toEqual({ ok: true, value: { inviteToken: token, attending: true, partySize: 3, message: "Can't wait!", dietaryNotes: "" } });
  });

  it("defaults party size to 1 when attending without one", () => {
    const r = validateRsvp({ inviteToken: token, attending: true }, 4);
    expect(r.ok && r.value.partySize).toBe(1);
  });

  it("forces party size 0 for a no", () => {
    const r = validateRsvp({ inviteToken: token, attending: false, partySize: 3 }, 4);
    expect(r.ok && r.value.partySize).toBe(0);
  });

  it.each([
    [{ inviteToken: "short", attending: true }],
    [{ inviteToken: token.toUpperCase(), attending: true }],
    [{ inviteToken: token, attending: "yes" }],
    [{ inviteToken: token, attending: true, partySize: 0 }],
    [{ inviteToken: token, attending: true, partySize: 5 }],
    [{ inviteToken: token, attending: true, partySize: 2.5 }],
    [{ inviteToken: token, attending: true, partySize: "2" }],
    [{ inviteToken: token, attending: true, message: "x".repeat(501) }],
    [{ inviteToken: token, attending: true, message: 42 }],
    [{ inviteToken: token, attending: true, isAdmin: true }],
    [null],
    [[]],
    ["string"],
  ])("rejects %j", (body) => {
    expect(validateRsvp(body, 4).ok).toBe(false);
  });

  it("caps the limit at 20 even if config says more", () => {
    expect(validateRsvp({ inviteToken: token, attending: true, partySize: 21 }, 100).ok).toBe(false);
    expect(validateRsvp({ inviteToken: token, attending: true, partySize: 20 }, 100).ok).toBe(true);
  });

  it("neutralises spreadsheet formula injection", () => {
    const r = validateRsvp({ inviteToken: token, attending: false, message: "=HYPERLINK(\"x\")" }, 4);
    expect(r.ok && r.value.message).toBe("'=HYPERLINK(\"x\")");
    expect(neutraliseFormula("+1")).toBe("'+1");
    expect(neutraliseFormula("Hello")).toBe("Hello");
  });

  it("strips control characters but keeps newlines", () => {
    expect(cleanText("a\u0000b\nc\u0007")).toBe("ab\nc");
  });
});

import { validatePublicRsvp } from "../src/lib/rsvp-schema";

describe("validatePublicRsvp (open RSVP form)", () => {
  const base = { guestName: "  Marie   Joseph ", attending: true, partySize: 2, website: "", formMs: 8000 };

  it("accepts a normal submission and tidies the name/email", () => {
    const r = validatePublicRsvp({ ...base, email: " Marie@Example.com " }, 10);
    expect(r).toEqual({
      ok: true,
      value: { guestName: "Marie Joseph", email: "marie@example.com", attending: true, partySize: 2, message: "", dietaryNotes: "" },
    });
  });
  it("email is optional", () => {
    const r = validatePublicRsvp(base, 10);
    expect(r.ok && "value" in r && r.value.email).toBe("");
  });
  it("flags bots: honeypot filled or submitted too fast", () => {
    expect(validatePublicRsvp({ ...base, website: "http://spam" }, 10)).toEqual({ ok: true, spam: true });
    expect(validatePublicRsvp({ ...base, formMs: 300 }, 10)).toEqual({ ok: true, spam: true });
    expect(validatePublicRsvp({ guestName: "Marie", attending: true }, 10)).toEqual({ ok: true, spam: true });
  });
  it.each([
    [{ ...base, guestName: "" }],
    [{ ...base, guestName: "M" }],
    [{ ...base, guestName: "x".repeat(81) }],
    [{ ...base, email: "not-an-email" }],
    [{ ...base, attending: "yes" }],
    [{ ...base, partySize: 11 }],
    [{ ...base, extra: 1 }],
  ])("rejects %j", (body) => {
    expect(validatePublicRsvp(body, 10).ok).toBe(false);
  });
  it("guards names against spreadsheet formulas", () => {
    const r = validatePublicRsvp({ ...base, guestName: "=IMPORTXML(x)" }, 10);
    expect(r.ok && "value" in r && r.value.guestName).toBe("'=IMPORTXML(x)");
  });
});
