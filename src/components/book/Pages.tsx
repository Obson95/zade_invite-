import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { covers, type BookPage } from "../../config/book";
import { event } from "../../config/event";
import { buildIcsHref, getEventDisplay } from "../../lib/event-display";
import type { InviteTokenState } from "../../lib/invite-token";
import type { Face } from "../../lib/book-model";
import { Countdown } from "../Countdown";
import { RsvpForm } from "../RsvpForm";
import { InkBorder, InkCrown, InkRule, InkStar, WrittenName } from "./Ink";
import { Print, VideoFrame } from "./Prints";

type Art = "cloud-1" | "cloud-2" | "moon" | "balloon" | "star";

/** A watercolor that blooms in when its page opens. */
function Wash({ name, className = "", delay = 0 }: { name: "a" | "b" | "c" | "d" | "band"; className?: string; delay?: number }) {
  return <img className={`wash bleed ${className}`} style={{ "--delay": `${delay}s` } as CSSProperties} src={`/images/book/wash-${name}.webp`} alt="" draggable={false} />;
}

/** Illustration on a parallax layer. Higher depth moves more. */
function Painted({ art, depth, className = "" }: { art: Art; depth: number; className?: string }) {
  return (
    <span className={`painted painted-${art} ${className}`} data-depth={depth}>
      <img src={`/images/book/${art}.webp`} alt="" draggable={false} />
    </span>
  );
}

function Twinkles({ at }: { at: [number, number, number][] }) {
  return (
    <>
      {at.map(([x, y, size], i) => (
        <InkStar key={`${x}-${y}`} className="twinkle" style={{ left: `${x}%`, top: `${y}%`, width: `${size}em`, "--twinkle": `${(i % 4) * 1.3}s` } as CSSProperties} />
      ))}
    </>
  );
}

function Heading({ page, children }: { page: BookPage; children?: ReactNode }) {
  return (
    <header className="page-head">
      <h2 tabIndex={-1} data-page-heading>{page.title}</h2>
      <InkRule />
      {children}
    </header>
  );
}

function Details() {
  const d = getEventDisplay(event);
  const ics = buildIcsHref(event, d);
  const rows: [string, ReactNode][] = [
    ["Date", d.dateLabel],
    ["Time", d.timeLabel],
    ["Place", <>{d.venueLabel}{d.addressLabel ? <span>{d.addressLabel}</span> : null}</>],
    ["Dress code", event.dressCode ?? "[TBD]"],
    ["Reply by", d.deadlineLabel ?? "[TBD]"],
  ];
  return (
    <>
      <dl className="party-lines">
        {rows.map(([label, value], i) => (
          <div key={label} style={{ "--order": i } as CSSProperties}>
            <dt>{label}</dt>
            <dd>{value}</dd>
            <InkRule />
          </div>
        ))}
      </dl>
      {d.mapUrl || ics || event.contactEmail ? (
        <p className="party-links">
          {d.mapUrl ? <a href={d.mapUrl} target="_blank" rel="noopener noreferrer">Directions<span className="sr-only"> (opens in a new tab)</span></a> : null}
          {ics ? <a href={ics} download="zade-first-birthday.ics">Add to calendar</a> : null}
          {event.contactEmail ? <a href={`mailto:${event.contactEmail}`}>{event.contactEmail}</a> : null}
        </p>
      ) : null}
    </>
  );
}

function PageBody({ page, active, invite }: { page: BookPage; active: boolean; invite: InviteTokenState }) {
  switch (page.kind) {
    case "story":
      return (
        <div className="layout-story">
          <Wash name="a" className="story-wash" />
          <Wash name="band" className="story-wash-low" delay={0.5} />
          <Painted art="cloud-2" depth={2} className="drift-slow story-cloud" />
          <p className="chapter">{page.chapter}</p>
          <h2 className="sr-only" tabIndex={-1} data-page-heading>{page.title}</h2>
          <p className="opening">{page.opening}</p>
          <div className="story-portrait print-settle" style={{ "--tilt": "0deg" } as CSSProperties}>
            <Wash name="c" className="portrait-wash" />
            <img src={page.portrait.src} alt={page.portrait.alt} width={page.portrait.width} height={page.portrait.height} draggable={false} />
          </div>
          <p className="story-body">{page.body}</p>
        </div>
      );
    case "arrival":
      return (
        <div className="layout-arrival">
          <Wash name="d" className="arrival-wash" />
          <Painted art="moon" depth={3} className="sway arrival-moon" />
          <Twinkles at={[[80, 6, 0.9], [90, 21, 0.6], [69, 15, 0.55]]} />
          <Heading page={page} />
          <div className="arrival-prints">
            {/* Each cell is a size container, so its print can shrink to hug the whole photo. */}
            <div className="arrival-cell arrival-main"><Print photo={page.photos[0]} tilt={-2.4} /></div>
            {page.photos.slice(1).map((photo, i) => <div className="arrival-cell" key={photo.src}><Print photo={photo} tilt={i ? -1.5 : 2.6} order={i + 1} /></div>)}
          </div>
          <div className="arrival-text">{page.body.map((line) => <p key={line}>{line}</p>)}</div>
        </div>
      );
    case "milestones":
      return (
        <div className="layout-milestones">
          <Wash name="b" className="milestones-wash" />
          <Heading page={page}><p className="lede">{page.intro}</p></Heading>
          <ol className="milestones">
            {page.items.map((item, i) => (
              <li key={item.label}>
                <Print photo={item.photo} tilt={[-2, 1.6, -1.2, 2.2][i % 4]} order={i} tape={false} />
                <div>
                  <h3>{item.label}</h3>
                  {item.when ? <p className="when">{item.when}</p> : null}
                  <p>{item.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    case "videos":
      return (
        <div className="layout-videos">
          <Wash name="c" className="videos-wash" />
          <Painted art="balloon" depth={3} className="sway videos-balloon" />
          <Heading page={page}><p className="lede">{page.intro}</p></Heading>
          <div className={`video-wall videos-${page.videos.length}`}>
            {page.videos.map((video, i) => <VideoFrame key={video.title} video={video} active={active} order={i} className={i === 0 && page.videos.length !== 2 ? "video-main" : ""} />)}
          </div>
        </div>
      );
    case "collage":
      return (
        <div className="layout-collage">
          <Wash name="a" className="collage-wash" />
          <Wash name="d" className="collage-wash-2" delay={0.5} />
          <Twinkles at={[[86, 7, 0.8], [8, 92, 0.7]]} />
          <Heading page={page}><p className="lede">{page.intro}</p></Heading>
          <div className="collage">
            {page.photos.map((photo, i) => <Print key={`${photo.src}-${i}`} photo={photo} tilt={[-3.5, 2.5, -1.5, 3, -2.5, 1.8][i % 6]} order={i} className={`collage-${i + 1}`} />)}
          </div>
        </div>
      );
    case "party":
      return (
        <div className="layout-party">
          <Wash name="band" className="party-wash" />
          <Painted art="balloon" depth={3} className="sway party-balloon" />
          <Painted art="cloud-1" depth={1} className="drift party-cloud" />
          <Heading page={page}><p className="lede">{page.intro}</p></Heading>
          <Details />
          <Countdown />
        </div>
      );
    case "letter":
      return (
        <div className="layout-letter">
          <Wash name="d" className="letter-wash" />
          <Painted art="moon" depth={2} className="sway letter-moon" />
          <Twinkles at={[[66, 52, 0.7], [90, 74, 0.55]]} />
          <div className="letter-top">
            <Print photo={page.photo} tilt={2.4} className="letter-photo" />
            <Heading page={page} />
            <div className="letter-body">{page.body.map((line, i) => <p key={line} className={i === 0 ? "letter-first" : ""}>{line}</p>)}</div>
          </div>
          <div className="letter-foot">
            <p className="creole" lang="ht">{page.creole}</p>
            <p className="creole-meaning">{page.creoleMeaning}</p>
            <p className="with-love">With love,</p>
            <p className="signature">{page.signOff}</p>
          </div>
        </div>
      );
    case "rsvp":
      return (
        <div className="layout-rsvp">
          <Wash name="b" className="rsvp-wash" />
          <h2 className="sr-only" tabIndex={-1} data-page-heading>{page.title}</h2>
          <RsvpForm invite={invite} intro={page.intro} />
        </div>
      );
  }
}

function Crown({ className = "" }: { className?: string }) {
  return (
    <span className={`crown ${className}`}>
      <img src="/images/book/crown.webp" alt="" draggable={false} />
      <InkCrown />
    </span>
  );
}

function Cover({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="cover" onClick={onOpen}>
      <img className="cover-sky" src="/images/book/cover-sky.webp" alt="" draggable={false} />
      <InkBorder />
      <span className="cover-title">
        <Crown className="cover-crown" />
        <WrittenName />
        <span className="cover-rest">{covers.titleRest}</span>
      </span>
      <span className="cover-figure">
        <img src={covers.photo.src} alt={covers.photo.alt} width={covers.photo.width} height={covers.photo.height} draggable={false} />
      </span>
      <span className="cover-foot">
        <span className="cover-tagline">{covers.tagline}</span>
        <span className="cover-hint btn-3d">{covers.openHint}</span>
      </span>
    </button>
  );
}

function BackCover() {
  return (
    <div className="back-cover">
      <img className="cover-sky" src="/images/book/cover-sky.webp" alt="" draggable={false} />
      <InkBorder />
      <div className="back-cover-text">
        <h2 tabIndex={-1} data-page-heading className="sr-only">The end</h2>
        <p className="thanks">{covers.thanks}</p>
        <Crown />
        <p className="the-end">{covers.theEnd}</p>
      </div>
    </div>
  );
}

function Endpaper({ children }: { children?: ReactNode }) {
  return (
    <div className="endpaper">
      <img className="cover-sky" src="/images/book/endpaper.webp" alt="" draggable={false} />
      <Twinkles at={[[14, 12, 0.9], [78, 8, 0.7], [62, 26, 0.6], [24, 38, 0.6]]} />
      {children}
    </div>
  );
}

const MIN_TEXT_PX = 11;

/**
 * Shrinks a page's type (everything on it is sized in em) until it fits
 * without scrolling, so a phone shows the whole page like a printed book.
 * Form fields stay at 16px (so phones don't zoom in); if a page still can't
 * fit, it scrolls.
 */
function useFitPage() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const fit = () => {
      // Don't reflow a form under someone's fingers while the keyboard is up.
      if (el.contains(document.activeElement) && document.activeElement?.matches("input, textarea, select")) return;
      el.style.fontSize = "";
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollHeight > el.clientHeight + 1 && size > MIN_TEXT_PX) {
        size = Math.max(MIN_TEXT_PX, size - 0.5);
        el.style.fontSize = `${size}px`;
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    // The content grows too (an error message, the thank-you note).
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    void document.fonts?.ready.then(schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  return ref;
}

function PageFace({ face, active, invite }: { face: Extract<Face, { kind: "page" }>; active: boolean; invite: InviteTokenState }) {
  const ref = useFitPage();
  return (
    <article className={`page page-${face.page.kind}`} ref={ref}>
      <PageBody page={face.page} active={active} invite={invite} />
      <span className="folio" aria-label={`Page ${face.number}`}>{face.number}</span>
    </article>
  );
}

export function FaceContent({ face, active, invite, onOpen }: { face: Face; active: boolean; invite: InviteTokenState; onOpen: () => void }) {
  switch (face.kind) {
    case "cover":
      return <Cover onOpen={onOpen} />;
    case "back-cover":
      return <BackCover />;
    case "endpaper-front":
      return (
        <Endpaper>
          <div className="bookplate">
            <Crown />
            <p>{covers.bookplate}</p>
          </div>
        </Endpaper>
      );
    case "endpaper-back":
      return (
        <Endpaper>
          <Painted art="moon" depth={2} className="sway end-moon" />
          <Painted art="balloon" depth={3} className="sway end-balloon" />
          <p className="end-note">{covers.closingNote}</p>
        </Endpaper>
      );
    case "blank":
      return <div className="blank-page" />;
    case "page":
      return <PageFace face={face} active={active} invite={invite} />;
  }
}
