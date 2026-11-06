import { event } from "../config/event";
import { getEventDisplay } from "../lib/event-display";
import { Fade, LineBalloons, LineCrown } from "./Stationery";

export function Hero({ rsvpHref = "/rsvp" }: { rsvpHref?: string }) {
  const d = getEventDisplay(event);
  return <header className="invitation-hero" id="home">
    <div className="hero-copy">
      <p className="eyebrow">A birthday invitation from our family</p>
      <LineCrown className="hero-crown" />
      <h1><span className="zade-script">{event.child.firstName}</span><span className="turns-one">is turning <em>one.</em></span></h1>
      <p className="hero-letter">A year ago, we met our favorite little person.<br />Now we get to celebrate his first birthday with the people we love.</p>
      <p className="hero-date">{d.dateLabel}<span aria-hidden="true"> / </span>{d.timeLabel}</p>
      <div className="hero-actions"><a href={rsvpHref} className="btn-royal">RSVP</a><a className="text-link" href="#details">The birthday plans <span aria-hidden="true">↓</span></a></div>
    </div>
    <Fade className="hero-photo-area">
      <span className="hero-year" aria-hidden="true">01</span>
      <img className="zade-cutout" src="/images/zade-cutout.png" width={1025} height={1535} alt="Zade standing with his hands together, in his blue birthday outfit and white shoes." fetchPriority="high" />
      <p className="photo-annotation">Our boy, Zade Noah Saintfleur.</p>
      <LineBalloons />
    </Fade>
    <p className="hero-bottom-note">One small boy. So much love.</p>
  </header>;
}
