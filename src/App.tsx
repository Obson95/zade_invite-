import { useState } from "react";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { readInviteToken } from "./lib/invite-token";
import { Hero } from "./components/Hero";
import { EventDetails } from "./components/EventDetails";
import { Countdown } from "./components/Countdown";
import { PhotoGallery } from "./components/PhotoGallery";
import { RsvpForm } from "./components/RsvpForm";
import { MusicToggle } from "./components/MusicToggle";
import { Cloud } from "./components/Decor";

export default function App() {
  const [invite] = useState(readInviteToken);

  return (
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
      <a href="#rsvp" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-royal-800">
        Skip to RSVP
      </a>

      <main>
        <Hero />
        <div className="celebration-body">
          <div className="celebration-content">
            <div className="event-grid"><EventDetails /><Countdown /></div>
            <PhotoGallery />
            <RsvpForm invite={invite} />
          </div>
        </div>
      </main>

      <footer className="relative overflow-hidden bg-[#d4e6fc] px-4 pt-16 pb-12 text-center">
        <Cloud className="pointer-events-none absolute top-0 -left-10 w-56 opacity-80" />
        <Cloud className="pointer-events-none absolute top-1 -right-12 w-64 opacity-80" />
        <p className="relative font-script text-2xl font-bold text-royal-800">With love, the Saintfleur family</p>
        <p className="relative mt-1 text-sm text-royal-700/80">Made with 💙 for Zade&rsquo;s first birthday</p>
      </footer>

      <MusicToggle />
    </MotionConfig>
    </LazyMotion>
  );
}
