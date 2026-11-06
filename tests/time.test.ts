import { describe, expect, it } from "vitest";
import { formatEventDate, formatTime, isPastDeadline, isValidDateString, remainingUntil, todayInZone, zonedTimeToUtc } from "../src/lib/time";
import { buildIcsHref, getEventDisplay } from "../src/lib/event-display";
import { event, isEventConfirmed, missingEventFields } from "../src/config/event";

describe("time helpers", () => {
  it("converts New York wall time to UTC in winter (EST, -5)", () => {
    expect(new Date(zonedTimeToUtc("2027-01-16", "14:00", "America/New_York")).toISOString()).toBe("2027-01-16T19:00:00.000Z");
  });
  it("converts New York wall time to UTC in summer (EDT, -4)", () => {
    expect(new Date(zonedTimeToUtc("2027-06-12", "14:00", "America/New_York")).toISOString()).toBe("2027-06-12T18:00:00.000Z");
  });
  it("handles a non-US zone", () => {
    expect(new Date(zonedTimeToUtc("2027-01-16", "14:00", "America/Port-au-Prince")).toISOString()).toBe("2027-01-16T19:00:00.000Z");
  });
  it("formats dates without shifting the day", () => {
    expect(formatEventDate("2027-01-16")).toBe("Saturday, January 16, 2027");
    expect(formatTime("14:05")).toBe("2:05 PM");
    expect(formatTime("00:30")).toBe("12:30 AM");
  });
  it("validates calendar dates", () => {
    expect(isValidDateString("2027-02-29")).toBe(false);
    expect(isValidDateString("2028-02-29")).toBe(true);
  });
  it("treats the deadline day as inclusive in the event zone", () => {
    // 2027-01-03 03:00 UTC is still Jan 2 in New York
    const lateJan2 = new Date("2027-01-03T03:00:00Z");
    expect(todayInZone("America/New_York", lateJan2)).toBe("2027-01-02");
    expect(isPastDeadline("2027-01-02", "America/New_York", lateJan2)).toBe(false);
    expect(isPastDeadline("2027-01-02", "America/New_York", new Date("2027-01-03T06:00:00Z"))).toBe(true);
  });
  it("counts down and stops at zero", () => {
    expect(remainingUntil(90_061_000, 0)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1 });
    expect(remainingUntil(0, 1)).toBeNull();
  });
});

describe("event config", () => {
  it("ships with no invented event facts", () => {
    expect(event.date).toBeNull();
    expect(event.venueName).toBeNull();
    expect(isEventConfirmed()).toBe(false);
    expect(missingEventFields()).toContain("Event date");
  });
  it("shows 'Details coming soon' while facts are missing", () => {
    const d = getEventDisplay(event);
    expect(d.dateLabel).toBe("Details coming soon");
    expect(d.startUtc).toBeNull();
    expect(buildIcsHref(event, d)).toBeNull();
  });
  it("builds labels and a calendar file once facts are filled in", () => {
    const filled = {
      ...event,
      date: "2027-01-16",
      startTime: "14:00",
      endTime: "17:00",
      timeZone: "America/New_York",
      venueName: "Example Hall",
      venueAddress: "1 Main St, Trenton, NJ",
      rsvpDeadline: "2027-01-02",
      maxGuestsPerInvite: 4,
    };
    const d = getEventDisplay(filled);
    expect(d.timeLabel).toBe("2:00 PM – 5:00 PM EST");
    expect(isEventConfirmed(filled)).toBe(true);
    const ics = decodeURIComponent(buildIcsHref(filled, d)!.split(",").slice(1).join(","));
    expect(ics).toContain("DTSTART:20270116T190000Z");
    expect(ics).toContain("DTEND:20270116T220000Z");
  });
});
