import { event } from "../config/event";
import { getEventDisplay } from "../lib/event-display";
import { PageSection, WatercolorSpot, WrittenName, LineCrown } from "./Stationery";

import { SkyParallax } from "./StoryMotion";

export function Hero({ rsvpHref = "/rsvp" }: { rsvpHref?: string }) {
  const d = getEventDisplay(event);
  return <header className="invitation-hero" id="home">
    <PageSection className="hero-copy">
      <p className="eyebrow">Chapter one / Le premier anniversaire</p>
      <div className="painted-crown"><WatercolorSpot kind="crown" className="hero-crown" /><LineCrown className="hero-ink-crown" /></div>
      <h1><WrittenName name={event.child.firstName} /><span className="turns-one">is turning <em>one.</em></span></h1>
      <p className="hero-letter">Once upon a time, there was a little boy named Zade.<br />A year of getting to know him has been our favorite story. We’d love you to be part of his first birthday.</p>
      <p className="hero-date">{d.dateLabel}<span aria-hidden="true"> / </span>{d.timeLabel}</p>
      <div className="hero-actions"><a href={rsvpHref} className="btn-royal">RSVP</a><a className="text-link" href="#details">The birthday plans <span aria-hidden="true">↓</span></a></div>
    </PageSection>
    <PageSection className="hero-photo-area"><SkyParallax />
      <img className="hero-watercolor" src="/images/watercolor-wash.svg" width={600} height={700} alt="" aria-hidden="true" />
      <img className="zade-cutout" src="/images/zade-cutout.png" width={1025} height={1535} alt="Zade standing with his hands together, in his blue birthday outfit and white shoes." fetchPriority="high" />
      <p className="photo-annotation">Our boy, Zade Noah Saintfleur.</p>
      <WatercolorSpot kind="balloon" className="hero-balloon" />
    </PageSection>
    <p className="hero-bottom-note">The story is only beginning.</p>
  </header>;
}
