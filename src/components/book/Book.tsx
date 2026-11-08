import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { flushSync } from "react-dom";
import { pages } from "../../config/book";
import { BookEngine } from "../../lib/book-engine";
import { buildFaces, faceFromLocation, findFace, singleViews, spreadViews, urlOfFace, viewOfFace } from "../../lib/book-model";
import type { InviteTokenState } from "../../lib/invite-token";
import { MusicToggle } from "../MusicToggle";
import { Scene } from "./Scene";
import { FaceContent } from "./Pages";

const SPREAD_QUERY = "(min-width: 900px) and (min-aspect-ratio: 11/10)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const PAGE_RATIO = 0.74;
/** Phone pages: width ÷ height stays between these, with this much sky around. */
const SINGLE_RATIO_MIN = 0.56;
const SINGLE_RATIO_MAX = 0.74;
const SINGLE_MARGIN = 14;
const TITLE = "Zade is turning one | A birthday invitation";

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}

const IGNORE_KEYS = "input, textarea, select, video, iframe, [contenteditable]";
const IGNORE_SWIPE = "input, textarea, select, video, iframe, a, label";

export function Book({ invite }: { invite: InviteTokenState }) {
  const faces = useMemo(() => buildFaces(pages), []);
  const spread = useMedia(SPREAD_QUERY);
  const reduced = useMedia(REDUCED_QUERY);
  const views = useMemo(() => (spread ? spreadViews(faces) : singleViews(faces)), [faces, spread]);

  const [face, setFace] = useState(() => faceFromLocation(faces, window.location.pathname, window.location.hash));
  const [view, setView] = useState(() => viewOfFace(views, face));
  const [playing, setPlaying] = useState(true);
  const [mounted, setMounted] = useState<ReadonlySet<number>>(() => new Set([face]));
  const [indexOpen, setIndexOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const stage = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const sheetBack = useRef<HTMLDivElement>(null);
  const fxOuter = useRef<HTMLDivElement>(null);
  const fxFlap = useRef<HTMLDivElement>(null);
  const toolbar = useRef<HTMLElement>(null);
  const indexButton = useRef<HTMLButtonElement>(null);
  const faceEls = useRef<(HTMLElement | null)[]>([]);
  const engine = useRef<BookEngine | null>(null);
  const viewsRef = useRef(views);
  viewsRef.current = views;
  const pushNext = useRef(false);

  const describe = useCallback((viewIndex: number) => {
    const v = viewsRef.current[viewIndex];
    const shown = [v.left, v.right].flatMap((i) => (i === null ? [] : [faces[i]]));
    const named = shown.filter((f) => f.kind === "page");
    if (named.length) return named.map((f) => (f.kind === "page" ? `Page ${f.number}: ${f.page.title}` : "")).join(". ");
    return shown.some((f) => f.kind === "cover") ? "The cover" : shown.some((f) => f.kind === "back-cover") ? "The back cover" : "Inside the book";
  }, [faces]);

  const settled = useCallback((viewIndex: number) => {
    const v = viewsRef.current[viewIndex];
    const main = (v.right !== null && faces[v.right].kind === "page" ? v.right : v.left) ?? v.right ?? 0;
    flushSync(() => {
      setView(viewIndex);
      setFace(main);
      setPlaying(true);
    });
    const url = urlOfFace(faces[main]);
    if (window.location.pathname + window.location.hash !== url) {
      if (pushNext.current) window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    }
    pushNext.current = false;
    document.title = faces[main].key === "rsvp" ? "RSVP | Zade’s first birthday" : TITLE;
    setAnnouncement(describe(viewIndex));
    // Keep focus on the toolbar so its buttons can be pressed repeatedly.
    if (!toolbar.current?.contains(document.activeElement)) {
      const target = v.right !== null && faces[v.right].kind === "page" && v.left !== null && faces[v.left].kind === "page" ? v.left : main;
      faceEls.current[target]?.querySelector<HTMLElement>("[data-page-heading]")?.focus({ preventScroll: true });
    }
  }, [describe, faces]);

  useLayoutEffect(() => {
    if (engine.current) return;
    engine.current = new BookEngine({
      root: root.current!,
      face: (i) => faceEls.current[i] ?? null,
      sheetBack: sheetBack.current!,
      fxOuter: fxOuter.current!,
      fxFlap: fxFlap.current!,
      mount: (list) => flushSync(() => setMounted((seen) => (list.every((f) => seen.has(f)) ? seen : new Set([...seen, ...list])))),
      onLeave: () => setPlaying(false),
      onSettled: settled,
    });
  }, [settled]);

  // Lay the book out for this screen, keeping the reader on the same page.
  useLayoutEffect(() => {
    const at = viewOfFace(views, face);
    engine.current!.configure(views, faces.length, spread, at, reduced);
    setView(at);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `face` is read once per layout.
  }, [views, spread, faces.length]);

  useEffect(() => engine.current!.setReduced(reduced), [reduced]);

  useLayoutEffect(() => {
    const el = stage.current!;
    const measure = () => {
      const { clientWidth: w, clientHeight: h } = el;
      // One page at a time still looks like a book: sky around it, page
      // edges on the right, never taller than a printed page.
      const pw = spread
        ? Math.floor(Math.min((w - 72) / 2, (h - 32) * PAGE_RATIO, 760))
        : Math.floor(Math.min(w - 2 * SINGLE_MARGIN - 8, (h - 2 * SINGLE_MARGIN) * SINGLE_RATIO_MAX, 560));
      const ph = spread ? Math.floor(pw / PAGE_RATIO) : Math.floor(Math.min(h - 2 * SINGLE_MARGIN, pw / SINGLE_RATIO_MIN));
      root.current!.style.setProperty("--pw", `${pw}px`);
      root.current!.style.setProperty("--ph", `${ph}px`);
      engine.current!.resize(pw, ph);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [spread]);

  const go = useCallback((target: number, jump = false) => {
    pushNext.current = jump;
    setIndexOpen(false);
    void engine.current!.goTo(target);
  }, []);
  const step = useCallback((by: 1 | -1) => {
    go(engine.current!.destination + by);
  }, [go]);
  const jumpToFace = useCallback((target: number) => go(viewOfFace(viewsRef.current, target), true), [go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && indexOpen) {
        setIndexOpen(false);
        indexButton.current?.focus();
        return;
      }
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.target as Element | null)?.closest?.(IGNORE_KEYS)) return;
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    };
    const onPop = () => go(viewOfFace(viewsRef.current, faceFromLocation(faces, window.location.pathname, window.location.hash)));
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
    };
  }, [faces, go, indexOpen, step]);

  // A page turn follows the finger, then finishes or falls back when let go.
  const drag = useRef<{ id: number; x: number; y: number; t: number; dir: 0 | 1 | -1; width: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse" || (e.target as Element).closest(IGNORE_SWIPE)) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), dir: 0, width: root.current!.getBoundingClientRect().width };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.dir === 0) {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      const dir = dx < 0 ? 1 : -1;
      if (Math.abs(dx) < Math.abs(dy) * 1.2 || !engine.current!.dragStart(dir)) {
        drag.current = null;
        return;
      }
      d.dir = dir;
      setPlaying(false);
    }
    engine.current!.dragTo((Math.abs(dx) / d.width) * (dx < 0 === d.dir > 0 ? 1.3 : 0));
  };
  const onPointerEnd = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.dir === 0) return;
    const dx = e.clientX - d.x;
    const quick = performance.now() - d.t < 320 && Math.abs(dx) > 40;
    const toward = dx < 0 === d.dir > 0;
    const commit = e.type === "pointerup" && toward && (quick || Math.abs(dx) / d.width > 0.28);
    if (!commit) setPlaying(true);
    engine.current!.dragEnd(commit);
  };

  const lastView = views.length - 1;
  const rsvpFace = findFace(faces, "rsvp");
  const currentNumbers = [views[view]?.left, views[view]?.right].flatMap((i) => {
    const f = i === null || i === undefined ? null : faces[i];
    return f?.kind === "page" ? [f.number] : [];
  });
  const place = currentNumbers.length ? `Page ${currentNumbers.join(" & ")} of ${pages.length}` : view === 0 ? "Cover" : view === lastView ? "The end" : "";

  return (
    <div className="scene-wrap">
      <Scene />
      <a href="#book-controls" className="skip-link">Skip to page controls</a>
      <main
        className="stage"
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <h1 className="sr-only">Zade is turning one: a birthday book</h1>
        <div className={`book ${spread ? "is-spread" : "is-single"}`} ref={root} aria-label="Zade’s birthday book" role="group">
          {faces.map((f, i) => {
            const side = f.spreadOnly || spread ? (i % 2 === 0 ? "recto" : "verso") : "recto";
            const visible = views[view]?.left === i || views[view]?.right === i;
            return (
              <section key={f.key} ref={(el) => { faceEls.current[i] = el; }} className={`face face-${f.kind} ${side}`} data-role="hidden">
                {mounted.has(i) ? <FaceContent face={f} active={visible && playing} invite={invite} onOpen={() => step(1)} /> : null}
              </section>
            );
          })}
          <div className="sheet-back" ref={sheetBack} hidden />
          <div className="fx fx-outer" ref={fxOuter} hidden><i /></div>
          <div className="fx fx-flap" ref={fxFlap} hidden><i /></div>
          {spread && view > 0 ? (
            <button type="button" tabIndex={-1} aria-hidden="true" className="corner corner-left" onClick={() => step(-1)} onPointerEnter={(e) => { if (e.pointerType === "mouse") engine.current!.peel(-1); }} onPointerLeave={() => engine.current!.unpeel()} />
          ) : null}
          {spread && view < lastView ? (
            <button type="button" tabIndex={-1} aria-hidden="true" className="corner corner-right" onClick={() => step(1)} onPointerEnter={(e) => { if (e.pointerType === "mouse") engine.current!.peel(1); }} onPointerLeave={() => engine.current!.unpeel()} />
          ) : null}
        </div>
      </main>

      <nav className="toolbar" id="book-controls" ref={toolbar} aria-label="Book pages">
        <button type="button" className="tool" onClick={() => step(-1)} disabled={view === 0}><span aria-hidden="true">←</span> Back</button>
        <button type="button" className="tool tool-index" ref={indexButton} aria-expanded={indexOpen} aria-controls="book-index" onClick={() => setIndexOpen((o) => !o)}>Contents</button>
        <p className="place">{place}</p>
        {rsvpFace >= 0 ? <button type="button" className="tool tool-rsvp btn-3d" onClick={() => jumpToFace(rsvpFace)}>RSVP</button> : null}
        <button type="button" className="tool" onClick={() => step(1)} disabled={view === lastView}>Next <span aria-hidden="true">→</span></button>
      </nav>

      <div className="book-index" id="book-index" hidden={!indexOpen}>
        <h2>Contents</h2>
        <ol>
          {faces.flatMap((f, i) => f.kind === "page" ? [
            <li key={f.key}>
              <button type="button" onClick={() => jumpToFace(i)} aria-current={face === i ? "page" : undefined}>
                <span>{f.page.title}</span><span>{f.number}</span>
              </button>
            </li>,
          ] : [])}
        </ol>
      </div>

      <p className="sr-only" aria-live="polite">{announcement}</p>
      <MusicToggle />
    </div>
  );
}
