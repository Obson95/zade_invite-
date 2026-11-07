import { useEffect, useState } from "react";
import { event } from "../config/event";
import { getEventDisplay } from "../lib/event-display";
import { remainingUntil } from "../lib/time";

export function Countdown() {
  const { startUtc, endUtc } = getEventDisplay(event);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startUtc === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, [startUtc]);

  if (startUtc === null || endUtc === null) {
    return <p className="countdown">We’ll start counting the days once the date is set.</p>;
  }
  const r = remainingUntil(startUtc, now);
  if (r) {
    return (
      <p className="countdown">
        <span aria-hidden="true">{r.days} days, {r.hours} hours and {r.minutes} minutes to go.</span>
        {/* Screen readers get one calm summary, not a clock changing every minute. */}
        <span className="sr-only">{r.days} days until the party.</span>
      </p>
    );
  }
  return <p className="countdown">{now < endUtc ? "Today’s the day. See you soon." : "Thank you to everyone who came. Zade is one."}</p>;
}
