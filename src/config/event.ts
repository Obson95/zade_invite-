/**
 * ─────────────────────────────────────────────────────────────────────────
 *  THE ONE PLACE TO EDIT EVENT DETAILS
 * ─────────────────────────────────────────────────────────────────────────
 *  Everything shown on the invitation (and the RSVP deadline the server
 *  enforces) comes from this file. Leave a value as `null` until it is
 *  confirmed — the site will show [TBD] instead of guessing.
 *
 *  ⚠️  This file is bundled into the public website. Never put secrets,
 *      spreadsheet IDs, emails you want private, or webhook URLs in here.
 *
 *  Keep the "Settings" tab of the Google Sheet in sync with these values —
 *  the invitation emails read their facts from the sheet.
 */

export interface EventConfig {
  child: { fullName: string; firstName: string };
  occasion: string;
  /** "YYYY-MM-DD" in the event's local time zone, e.g. "2027-01-16" */
  date: string | null;
  /** 24-hour "HH:MM", e.g. "14:00" */
  startTime: string | null;
  endTime: string | null;
  /** IANA time zone, e.g. "America/New_York" */
  timeZone: string | null;
  venueName: string | null;
  venueAddress: string | null;
  /** e.g. "Sunday best, shoes optional" */
  dressCode: string | null;
  /** Optional. If null, a Google Maps search link is built from the address. */
  mapUrl: string | null;
  /** "YYYY-MM-DD" — last day RSVPs are accepted (inclusive, event time zone) */
  rsvpDeadline: string | null;
  /** Default max people per invitation (a per-guest column can override). */
  maxGuestsPerInvite: number | null;
  /** Shown as "Questions? Contact …". Optional. */
  contactEmail: string | null;
  /** Show a dietary-notes field on the RSVP form. */
  askDietaryNotes: boolean;
  music: {
    /** Path to a track YOU own/licensed, e.g. "/audio/song.mp3". null hides the toggle. */
    src: string | null;
    title: string | null;
  };
}

export const event: EventConfig = {
  child: { fullName: "Zade Noah Saintfleur", firstName: "Zade" },
  occasion: "First birthday",

  date: null, //            TBD — e.g. "2027-01-16"
  startTime: null, //       TBD — e.g. "14:00"
  endTime: null, //         TBD (optional)
  timeZone: null, //        TBD — e.g. "America/New_York"
  venueName: null, //       TBD
  venueAddress: null, //    TBD
  dressCode: null, //       TBD
  mapUrl: null,
  rsvpDeadline: null, //    TBD — e.g. "2027-01-02"
  maxGuestsPerInvite: null, // TBD — e.g. 4
  contactEmail: null, //    TBD (optional)

  askDietaryNotes: false,
  music: { src: null, title: null },
};

/** True once every fact needed to send real invitations is filled in. */
export function isEventConfirmed(e: EventConfig = event): boolean {
  return Boolean(
    e.date && e.startTime && e.timeZone && e.venueName && e.venueAddress && e.rsvpDeadline && e.maxGuestsPerInvite,
  );
}

/** Missing facts, for the preview banner and the build checklist. */
export function missingEventFields(e: EventConfig = event): string[] {
  const labels: [keyof EventConfig, string][] = [
    ["date", "Event date"],
    ["startTime", "Start time"],
    ["timeZone", "Time zone"],
    ["venueName", "Venue name"],
    ["venueAddress", "Venue address"],
    ["rsvpDeadline", "RSVP deadline"],
    ["maxGuestsPerInvite", "Max guests per invitation"],
  ];
  return labels.filter(([k]) => e[k] === null || e[k] === "").map(([, l]) => l);
}
