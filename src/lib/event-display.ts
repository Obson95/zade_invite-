import type { EventConfig } from "../config/event";
import {
  formatEventDate,
  formatTime,
  isValidDateString,
  isValidTimeString,
  isValidTimeZone,
  zonedTimeToUtc,
  zoneAbbreviation,
} from "./time";

export const COMING_SOON = "[TBD]";

export interface EventDisplay {
  dateLabel: string;
  timeLabel: string;
  venueLabel: string;
  addressLabel: string | null;
  mapUrl: string | null;
  deadlineLabel: string | null;
  /** UTC epoch of the start, when date + time + zone are all valid. */
  startUtc: number | null;
  endUtc: number | null;
}

export function getEventDisplay(e: EventConfig): EventDisplay {
  const dateOk = isValidDateString(e.date);
  const timeOk = isValidTimeString(e.startTime);
  const tzOk = isValidTimeZone(e.timeZone);

  const startUtc = dateOk && timeOk && tzOk ? zonedTimeToUtc(e.date!, e.startTime!, e.timeZone!) : null;
  let endUtc: number | null = null;
  if (startUtc !== null) {
    endUtc = isValidTimeString(e.endTime)
      ? zonedTimeToUtc(e.date!, e.endTime, e.timeZone!)
      : startUtc + 3 * 60 * 60 * 1000;
    if (endUtc <= startUtc) endUtc = startUtc + 3 * 60 * 60 * 1000;
  }

  let timeLabel = COMING_SOON;
  if (timeOk) {
    timeLabel = formatTime(e.startTime!);
    if (isValidTimeString(e.endTime)) timeLabel += ` – ${formatTime(e.endTime)}`;
    if (dateOk && tzOk) timeLabel += ` ${zoneAbbreviation(e.date!, e.startTime!, e.timeZone!)}`;
  }

  const mapUrl =
    e.mapUrl && /^https:\/\//.test(e.mapUrl)
      ? e.mapUrl
      : e.venueAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            [e.venueName, e.venueAddress].filter(Boolean).join(", "),
          )}`
        : null;

  return {
    dateLabel: dateOk ? formatEventDate(e.date!) : COMING_SOON,
    timeLabel,
    venueLabel: e.venueName || COMING_SOON,
    addressLabel: e.venueAddress || null,
    mapUrl,
    deadlineLabel: isValidDateString(e.rsvpDeadline) ? formatEventDate(e.rsvpDeadline) : null,
    startUtc,
    endUtc,
  };
}

function icsDate(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Where the built site serves the calendar file (written by vite.config.ts). */
export const ICS_PATH = "/zade-first-birthday.ics";

/** The .ics calendar file's text, or null when details are incomplete. */
export function buildIcs(e: EventConfig, d: EventDisplay): string | null {
  if (d.startUtc === null || d.endUtc === null || !e.venueName) return null;
  const notes = [e.dressCode ? `Dress code: ${e.dressCode}` : ""].filter(Boolean).join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Saintfleur Family//First Birthday//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:zade-first-birthday-${e.date}@invitation`,
    `DTSTAMP:${icsDate(Date.now())}`,
    `DTSTART:${icsDate(d.startUtc)}`,
    `DTEND:${icsDate(d.endUtc)}`,
    `SUMMARY:${icsEscape(`${e.child.fullName}'s 1st Birthday`)}`,
    `LOCATION:${icsEscape([e.venueName, e.venueAddress].filter(Boolean).join(", "))}`,
    ...(notes ? [`DESCRIPTION:${icsEscape(notes)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

/** A data: URL for the .ics file (used in tests; phones need the real file at ICS_PATH). */
export function buildIcsHref(e: EventConfig, d: EventDisplay): string | null {
  const ics = buildIcs(e, d);
  return ics === null ? null : `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

/** Google Calendar's "add event" page, filled in. */
export function googleCalendarUrl(e: EventConfig, d: EventDisplay): string | null {
  if (d.startUtc === null || d.endUtc === null || !e.venueName) return null;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${e.child.fullName}'s 1st Birthday`,
    dates: `${icsDate(d.startUtc)}/${icsDate(d.endUtc)}`,
    location: [e.venueName, e.venueAddress].filter(Boolean).join(", "),
    details: e.dressCode ? `Dress code: ${e.dressCode}` : "",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/**
 * The link "Add to calendar" should open. Android goes to Google Calendar;
 * iPhone, iPad and computers open the .ics file, which offers "Add to Calendar".
 */
export function calendarLink(e: EventConfig, d: EventDisplay, userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent): { href: string; external: boolean } | null {
  if (buildIcs(e, d) === null) return null;
  const google = /Android/i.test(userAgent) ? googleCalendarUrl(e, d) : null;
  return google ? { href: google, external: true } : { href: ICS_PATH, external: false };
}
