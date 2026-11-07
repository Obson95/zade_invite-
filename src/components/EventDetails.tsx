import { event } from "../config/event";
import { buildIcsHref, getEventDisplay } from "../lib/event-display";
import { PageSection, WatercolorSpot } from "./Stationery";
export function EventDetails() {
  const d = getEventDisplay(event);
  const ics = buildIcsHref(event, d);
  return <section id="details" className="details-section" aria-labelledby="details-title"><PageSection className="details-layout">
    <div><WatercolorSpot kind="balloon" /><p className="eyebrow">The next page</p><h2 id="details-title">The birthday<br />plans.</h2><p>We’d love to have you there.<br />Here’s what you need to know.</p></div>
    <div><dl className="event-lines">
      <div><dt>When</dt><dd>{d.dateLabel}<span>{d.timeLabel}</span></dd></div>
      <div><dt>Where</dt><dd>{d.venueLabel}<span>{d.addressLabel || "Address [TBD]"}</span></dd></div>
      <div><dt>Please reply by</dt><dd>{d.deadlineLabel || "[TBD]"}</dd></div>
    </dl><div className="detail-actions">{d.mapUrl && <a className="text-link" href={d.mapUrl} target="_blank" rel="noopener noreferrer">Directions <span className="sr-only">(opens in a new tab)</span></a>}{ics && <a className="text-link" href={ics} download="zade-first-birthday.ics">Add to calendar</a>}</div>
    {event.contactEmail && <p>Questions? <a className="text-link" href={`mailto:${event.contactEmail}`}>{event.contactEmail}</a></p>}</div>
  </PageSection></section>;
}
