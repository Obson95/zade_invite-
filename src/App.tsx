import { useEffect, useRef, useState, type MouseEvent } from "react";
import { domAnimation, LazyMotion, MotionConfig, useReducedMotion } from "motion/react";
import { readInviteToken } from "./lib/invite-token";
import { Hero } from "./components/Hero";
import { EventDetails } from "./components/EventDetails";
import { Countdown } from "./components/Countdown";
import { PhotoGallery } from "./components/PhotoGallery";
import { FirstYear } from "./components/FirstYear";
import { RsvpForm } from "./components/RsvpForm";
import { MusicToggle } from "./components/MusicToggle";
import { Fade, LineCrown } from "./components/Stationery";
import { personal } from "./config/personal";

export default function App() {
  const reduce = useReducedMotion();
  const [invite] = useState(readInviteToken);
  const [path, setPath] = useState(window.location.pathname);
  const rsvpHref = invite.kind === "preview" ? "/rsvp?invite=preview" : "/rsvp";
  const isRsvp = path.replace(/\/$/, "") === "/rsvp";
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    document.title = isRsvp ? "RSVP | Zade’s first birthday" : "Zade is turning one | A birthday invitation";
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0, behavior: "instant" });
    mainRef.current?.focus({ preventScroll: true });
  }, [isRsvp]);
  function navigate(e: MouseEvent<HTMLDivElement>) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
    if (!link || link.target || link.hasAttribute("download")) return;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin || url.hash || !["/", "/rsvp"].includes(url.pathname)) return;
    e.preventDefault();
    if (url.pathname === path) return;
    window.history.pushState(null, "", url.pathname + (invite.kind === "preview" ? "?invite=preview" : ""));
    setPath(url.pathname);
  }
  return <LazyMotion features={domAnimation} strict><MotionConfig reducedMotion="user" transition={{ duration: reduce ? 0 : 0.4 }}><div onClick={navigate}>
    <a href="#main" className="skip-link">Skip to content</a>
    <nav className="site-nav" aria-label="Main navigation"><a href="/" className="wordmark"><LineCrown /> ZADE <span>/ ONE</span></a><div><a href={isRsvp ? "/#details" : "#details"}>The plans</a><a href={rsvpHref} aria-current={isRsvp ? "page" : undefined}>RSVP <span aria-hidden="true">↗</span></a></div></nav>
    <main id="main" ref={mainRef} tabIndex={-1}>
      {isRsvp ? <div className="reply-page"><a href="/" className="text-link back-link">← Back to the invitation</a><div className="reply-heading"><p className="eyebrow">Zade’s first birthday</p><h1>A little reply.</h1><p>Let us know if you’ll be there. We’re looking forward to seeing you.</p></div><RsvpForm invite={invite} /></div> : <>
        <Hero rsvpHref={rsvpHref} />
        <section className="welcome-note"><p lang="ht">{personal.welcome}</p><p>We can’t wait to celebrate with you.</p></section>
        <EventDetails /><Countdown /><FirstYear /><PhotoGallery />
        <section className="family-note"><Fade className="family-note-layout"><img src="/images/family-576.webp" width={576} height={1024} loading="lazy" alt="Zade with his mom and dad at church." /><div><p className="eyebrow">A note from us</p><h2>Thank you for loving our boy.</h2><p>It means so much to have you in Zade’s life. We hope you can spend this day with us.</p><p>With love,</p><p className="family-signature">{personal.signOff}</p></div></Fade></section>
        <section className="reply-invitation"><LineCrown /><h2>Will we see you there?</h2><p>Leave us a little reply so we can plan for you.</p><a className="btn-royal" href={rsvpHref}>RSVP</a></section>
      </>}
    </main><footer className="site-footer"><span>Zade Noah Saintfleur</span><span>His first birthday. Our favorite year.</span></footer><MusicToggle />
  </div></MotionConfig></LazyMotion>;
}
