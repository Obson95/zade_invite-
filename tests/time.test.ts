import { describe, expect, it } from "vitest";
import { formatEventDate, formatTime, isPastDeadline, isValidDateString, remainingUntil, todayInZone, zonedTimeToUtc } from "../src/lib/time";
import { buildIcsHref, getEventDisplay } from "../src/lib/event-display";
import { event, isEventConfirmed, missingEventFields, rsvpClosed } from "../src/config/event";

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
  const unset = { ...event, date: null, startTime: null, timeZone: null, venueName: null, venueAddress: null, rsvpDeadline: null };
  it("holds the confirmed party date and leaves unknown facts empty", () => {
    expect(event.date).toBe("2026-11-22");
    expect(new Date(`${event.date}T12:00:00Z`).getUTCDay()).toBe(0); // a Sunday
    expect(getEventDisplay(event).timeLabel).toBe("12:00 PM EST");
    expect(event.venueAddress).toBe("Bellmawr, NJ 08031");
    expect(event.rsvpDeadline).toBe("2026-11-18");
    expect(new Date("2026-11-18T12:00:00Z").getUTCDay()).toBe(3); // a Wednesday
    expect(isEventConfirmed()).toBe(false);
    expect(missingEventFields()).toEqual(["Max guests per invitation"]);
  });
  it("shows [TBD] while facts are missing", () => {
    const d = getEventDisplay(unset);
    expect(d.dateLabel).toBe("[TBD]");
    expect(d.startUtc).toBeNull();
    expect(buildIcsHref(unset, d)).toBeNull();
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

describe("RSVPs stay open after the reply-by date", () => {
  it("accepts late replies until the end of party day, Eastern time", () => {
    expect(rsvpClosed(event, new Date("2026-11-19T15:00:00Z"))).toBe(false); // the day after "reply by"
    expect(rsvpClosed(event, new Date("2026-11-23T04:30:00Z"))).toBe(false); // 11:30 PM Nov 22 in New Jersey
    expect(rsvpClosed(event, new Date("2026-11-23T05:30:00Z"))).toBe(true); // 12:30 AM Nov 23
  });
  it("without a separate closing day, closes after the reply-by date", () => {
    expect(rsvpClosed({ ...event, rsvpClosesOn: null }, new Date("2026-11-19T15:00:00Z"))).toBe(true);
  });
});
