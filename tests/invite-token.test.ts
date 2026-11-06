import { afterEach, describe, expect, it, vi } from "vitest";
import { readInviteToken } from "../src/lib/invite-token";

function browser(href: string, stored?: string) {
  const data = new Map(stored ? [["zade-invite-token", stored]] : []);
  const replaceState = vi.fn();
  vi.stubGlobal("window", { location: { href }, history: { replaceState } });
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
  return { data, replaceState };
}

afterEach(() => vi.unstubAllGlobals());

describe("invitation identity across the separate RSVP page", () => {
  it("keeps a preview link in preview mode after navigating to RSVP or reloading", () => {
    browser("https://birthday.test/?invite=preview");
    expect(readInviteToken()).toEqual({ kind: "preview" });
    vi.stubGlobal("window", { location: { href: "https://birthday.test/rsvp" }, history: { replaceState: vi.fn() } });
    expect(readInviteToken()).toEqual({ kind: "preview" });
  });
  it("does not reuse a previous guest token when opening an explicit preview", () => {
    const b = browser("https://birthday.test/?invite=preview", "a".repeat(64));
    expect(readInviteToken()).toEqual({ kind: "preview" });
    expect(b.data.get("zade-invite-token")).toBe("preview");
  });
  it("strips a personal token from the URL while retaining the RSVP path", () => {
    const token = "a".repeat(64);
    const b = browser(`https://birthday.test/rsvp?invite=${token}`);
    expect(readInviteToken()).toEqual({ kind: "token", token });
    expect(b.replaceState).toHaveBeenCalledWith(null, "", "/rsvp");
  });
  it("still opens preview when browser storage is unavailable", () => {
    browser("https://birthday.test/rsvp?invite=preview");
    vi.stubGlobal("sessionStorage", { setItem: () => { throw new Error("unavailable"); } });
    expect(readInviteToken()).toEqual({ kind: "preview" });
  });
});
