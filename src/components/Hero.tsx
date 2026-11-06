import { useState, type CSSProperties } from "react";
import { m, useReducedMotion } from "motion/react";
import { event } from "../config/event";
import { getEventDisplay } from "../lib/event-display";
import { BalloonCluster, LEFT_CLUSTER, RIGHT_CLUSTER, Sparkles } from "./Balloons";
import { Cake, Cloud, Crown, Gift, Ribbon, Teddy } from "./Decor";
import { CalendarIcon, ClockIcon, PinIcon } from "./Icons";

export function Hero() {
  const d = getEventDisplay(event);
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const still = paused || reduce;
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0 : 0.85, delay: reduce ? 0 : delay },
  });
  const facts = [
    { icon: CalendarIcon, label: "The day", value: d.dateLabel },
    { icon: ClockIcon, label: "The time", value: d.timeLabel },
    { icon: PinIcon, label: "The place", value: d.venueLabel },
  ];
  return (
    <header id="home" className={`sky birthday-hero ${still ? "motion-paused" : ""}`}>
      <nav className="invite-nav" aria-label="Invitation navigation">
        <a href="#home" className="invite-monogram" aria-label="Zade’s first birthday home"><Crown className="w-7" /> Z<span>•</span>ONE</a>
        <div className="invite-links"><a href="#details">The celebration</a><a href="#photos">Our little prince</a><a href="#rsvp" className="nav-rsvp">RSVP <span aria-hidden="true">↗</span></a></div>
      </nav>
      <div className="hero-atmosphere" aria-hidden="true">
        {!still && <Sparkles />}
        <div className="confetti-field">{Array.from({ length: 20 }, (_, i) => <i key={i} style={{ left: `${(i * 17 + 3) % 100}%`, top: `${(i * 23) % 92}%`, "--delay": `${-i * 0.7}s`, "--turn": `${i * 29}deg` } as CSSProperties} />)}</div>
        <div className="cloud-wisp cloud-wisp-one" /><div className="cloud-wisp cloud-wisp-two" />
      </div>
      <BalloonCluster paused={!!still} balloons={LEFT_CLUSTER} className="hero-balloons-left" />
      <BalloonCluster paused={!!still} balloons={RIGHT_CLUSTER} className="hero-balloons-right" />
      <div className="hero-layout">
        <m.div {...rise(0.1)} className="hero-portraits">
          <div className="portrait-orbit" aria-hidden="true" />
          <div className="family-frame gold-ring">
            <picture>
              <source type="image/webp" srcSet="/images/family-480.webp 480w, /images/family-576.webp 576w" sizes="(min-width: 900px) 410px, 65vw" />
              <img src="/images/family-576.jpg" width={576} height={1024} alt="Zade with his mom and dad, dressed up together at church." fetchPriority="high" className="family-photo" />
            </picture>
          </div>
          <div className="baby-frame gold-ring">
            <img src="/images/zade-400.webp" width={400} height={600} alt="Our little prince Zade in his blue vest." className="baby-photo" />
          </div>
          <span className="photo-note">Our greatest little blessing <span aria-hidden="true">♡</span></span>
          <span className="portrait-star" aria-hidden="true">✦</span>
        </m.div>
        <div className="hero-copy">
          <m.p {...rise(0.15)} className="eyebrow">A little prince. A whole lot of love.</m.p>
          <m.p {...rise(0.25)} className="invited-script">You’re invited to</m.p>
          <m.h1 {...rise(0.35)} className="birthday-heading"><span className="hero-name">{event.child.firstName}’s</span><span className="birthday-line"><span className="birthday-number"><Crown className="number-crown" /><span className="text-gold">1</span><sup className="text-gold">st</sup></span><span className="sr-only"> birthday celebration</span></span></m.h1>
          <m.div {...rise(0.45)}><Ribbon><span className="hero-ribbon-label">Birthday Celebration</span></Ribbon></m.div>
          <m.p {...rise(0.55)} className="hero-message">One year of tiny hands, big smiles, and endless love.<br className="hidden sm:block" /> Come make a beautiful memory with us.</m.p>
          <m.div {...rise(0.65)} className="hero-actions"><a href="#rsvp" className="btn-royal">Celebrate with us <span aria-hidden="true">↗</span></a><a href="#details" className="details-link">See the details <span aria-hidden="true">↓</span></a></m.div>
          <m.p {...rise(0.75)} className="hero-signature">With love, the Saintfleur family</m.p>
        </div>
      </div>
      <m.dl {...rise(0.8)} className="hero-facts">{facts.map(({ icon: Icon, label, value }) => <div key={label}><Icon className="h-6 w-6" /><div><dt>{label}</dt><dd>{value}</dd></div></div>)}</m.dl>
      <div className="hero-cloud-floor" aria-hidden="true"><Cloud className="floor-cloud floor-cloud-left" /><Cloud className="floor-cloud floor-cloud-right" /><Cake className="floor-cake" /><Teddy className="floor-teddy" /><Gift className="floor-gift" /></div>
      {!reduce && <button type="button" className="motion-toggle" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? "Play animations" : "Pause animations"}</button>}
    </header>
  );
}
