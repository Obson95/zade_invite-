import { useEffect, useState } from "react";
import { m } from "motion/react";
import { event } from "../config/event";
import { getEventDisplay } from "../lib/event-display";
import { remainingUntil } from "../lib/time";

export function Countdown() {
  const { startUtc, endUtc } = getEventDisplay(event);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startUtc === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startUtc]);

  let body: React.ReactNode;
  if (startUtc === null || endUtc === null) {
    body = <p className="mt-3 text-center text-lg text-royal-600 italic">The countdown begins once the date is announced.</p>;
  } else {
    const r = remainingUntil(startUtc, now);
    if (r) {
      const units: [string, number][] = [
        ["Days", r.days],
        ["Hours", r.hours],
        ["Minutes", r.minutes],
        ["Seconds", r.seconds],
      ];
      body = (
        <>
          <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3" aria-hidden="true">
            {units.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-gradient-to-b from-royal-600 to-royal-800 px-1 py-3 text-center text-white shadow-md ring-2 ring-gold-400/70">
                <div className="font-display text-3xl font-bold tabular-nums sm:text-4xl">{String(value).padStart(2, "0")}</div>
                <div className="mt-0.5 text-[0.68rem] font-bold tracking-[0.12em] text-gold-300 uppercase sm:text-xs">{label}</div>
              </div>
            ))}
          </div>
          {/* Screen readers get a calm, minute-level summary instead of a ticking clock. */}
          <p className="sr-only">
            {r.days} days, {r.hours} hours and {r.minutes} minutes until the party.
          </p>
        </>
      );
    } else if (now < endUtc) {
      body = <p className="mt-3 text-center font-display text-2xl font-bold text-royal-700">The party is happening now! 🎉</p>;
    } else {
      body = (
        <p className="mt-3 text-center text-lg text-royal-700">
          Thank you to everyone who celebrated with us. Zade is officially ONE! 💙
        </p>
      );
    }
  }

  return (
    <m.section
      aria-labelledby="countdown-title"
      className="card px-4 py-7 sm:px-8"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
    >
      <h2 id="countdown-title" className="section-title text-center text-2xl sm:text-3xl">
        Counting Down
      </h2>
      {body}
    </m.section>
  );
}
