import { afterEach, describe, expect, it, vi } from "vitest";
import { shouldOpenBook, skyOffset } from "../src/lib/story-motion";

afterEach(() => vi.unstubAllGlobals());
function visit(pathname: string, hash = "", seen = false) {
  vi.stubGlobal("window", { location: { pathname, hash } });
  vi.stubGlobal("sessionStorage", { getItem: () => seen ? "true" : null });
}
describe("storybook cover navigation", () => {
  it("opens on the first home visit", () => {
    visit("/"); expect(shouldOpenBook()).toBe(true);
  });
  it("never obstructs direct RSVP or section links", () => {
    visit("/rsvp"); expect(shouldOpenBook()).toBe(false);
    visit("/", "#details"); expect(shouldOpenBook()).toBe(false);
  });
  it("does not replay after the cover was opened", () => {
    visit("/", "", true); expect(shouldOpenBook()).toBe(false);
  });
  it("still works when session storage is unavailable", () => {
    visit("/"); vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("blocked"); } });
    expect(shouldOpenBook()).toBe(true);
  });
});
describe("bounded parallax", () => {
  it("caps displacement even after a long scroll", () => {
    expect(skyOffset(-10000)).toBe(24);
    expect(skyOffset(10000)).toBe(-24);
    expect(Math.abs(skyOffset(0))).toBe(0);
  });
});
