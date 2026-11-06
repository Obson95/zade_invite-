import { m } from "motion/react";
import { event } from "../config/event";
import { buildIcsHref, COMING_SOON, getEventDisplay } from "../lib/event-display";
import { CalendarIcon, ClockIcon, PinIcon } from "./Icons";
import { Crown } from "./Decor";

export function EventDetails() {
  const d = getEventDisplay(event);
  const ics = buildIcsHref(event, d);

  const rows = [
    { icon: CalendarIcon, label: "Date", value: d.dateLabel },
    { icon: ClockIcon, label: "Time", value: d.timeLabel },
    { icon: PinIcon, label: "Venue", value: d.venueLabel, extra: d.addressLabel },
  ];

  return (
    <m.section
      id="details"
      aria-labelledby="details-title"
      className="card relative px-5 py-7 sm:px-8"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
    >
      <Crown className="absolute -top-6 left-1/2 w-12 -translate-x-1/2" />
      <h2 id="details-title" className="section-title text-center text-2xl sm:text-3xl">
        Celebration Details
      </h2>
      <dl className="mt-6 space-y-4">
        {rows.map(({ icon: Icon, label, value, extra }) => (
          <div key={label} className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-royal-50 text-royal-600 ring-1 ring-gold-400/50">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-bold tracking-[0.14em] text-gold-700 uppercase">{label}</dt>
              <dd className={`text-lg font-bold ${value === COMING_SOON ? "text-royal-500 italic" : "text-royal-900"}`}>
                {value}
              </dd>
              {extra && <dd className="text-[0.95rem] text-ink/80">{extra}</dd>}
            </div>
          </div>
        ))}
      </dl>

      {d.deadlineLabel && (
        <p className="mt-6 rounded-xl bg-gold-300/25 px-4 py-3 text-center text-[0.95rem] font-semibold text-gold-700">
          Kindly RSVP by {d.deadlineLabel}
        </p>
      )}

      {(d.mapUrl || ics) && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {d.mapUrl && (
            <a
              href={d.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-royal-600 px-5 font-bold text-royal-700 hover:bg-royal-50"
            >
              <PinIcon className="h-4 w-4" /> Open map<span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          {ics && (
            <a
              href={ics}
              download="zade-first-birthday.ics"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-royal-600 px-5 font-bold text-royal-700 hover:bg-royal-50"
            >
              <CalendarIcon className="h-4 w-4" /> Add to calendar
            </a>
          )}
        </div>
      )}
      {event.contactEmail && (
        <p className="mt-5 text-center text-sm text-ink/70">
          Questions?{" "}
          <a className="font-bold text-royal-700 underline" href={`mailto:${event.contactEmail}`}>
            {event.contactEmail}
          </a>
        </p>
      )}
    </m.section>
  );
}
