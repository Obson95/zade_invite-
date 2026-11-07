import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { skyOffset } from "../lib/story-motion";
import { LineCrown, WatercolorSpot } from "./Stationery";

const MotionContext = createContext({ enabled: false, reduced: true, paused: false, toggle: () => {} });
export function StoryMotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [paused, setPaused] = useState(() => {
    try { return sessionStorage.getItem("zade-motion-paused") === "true"; } catch { return false; }
  });
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const toggle = useCallback(() => setPaused(previous => {
    try { sessionStorage.setItem("zade-motion-paused", String(!previous)); } catch { /* optional preference */ }
    return !previous;
  }), []);
  return <MotionContext.Provider value={{ enabled: !reduced && !paused, reduced, paused, toggle }}>{children}</MotionContext.Provider>;
}
export const useStoryMotion = () => useContext(MotionContext);

export function MotionControl() {
  const { paused, reduced, toggle } = useStoryMotion();
  if (reduced) return null;
  return <button className="motion-control" type="button" onClick={toggle} aria-pressed={paused}>{paused ? "Play story animations" : "Pause story animations"}</button>;
}

/** Native dialog handles keyboard focus, modal isolation and Escape. */
export function BookOpening({ onOpened }: { onOpened: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [turning, setTurning] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, []);
  useEffect(() => {
    if (!turning) return;
    const timer = window.setTimeout(onOpened, 1450);
    return () => window.clearTimeout(timer);
  }, [turning, onOpened]);
  return <dialog ref={ref} className={`book-dialog ${turning ? "book-turning" : ""}`} aria-labelledby="book-title" onCancel={e => { e.preventDefault(); onOpened(); }}>
    <div className="book-stage"><div className="book-endpaper" aria-hidden="true"><WatercolorSpot kind="moon" /><p>The story begins.</p></div><div className="book-cover">
      <p className="eyebrow">A little book of our favorite year</p><LineCrown className="book-crown" /><h2 id="book-title"><span>Zade</span><br />Chapter one</h2><WatercolorSpot kind="cloud" /><p>A first birthday invitation</p>
      <button className="btn-royal" type="button" onClick={() => setTurning(true)} aria-disabled={turning}>Open the invitation</button>
    </div></div><button className="book-skip text-link" type="button" onClick={onOpened}>Skip opening</button>
  </dialog>;
}

/** One passive listener, one frame at a time; disabled for coarse pointers and reduced motion. */
export function SkyParallax() {
  const ref = useRef<HTMLDivElement>(null);
  const { enabled } = useStoryMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled || !window.matchMedia("(pointer: fine)").matches) {
      el.style.removeProperty("--sky-offset"); return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const offset = skyOffset(rect.top);
      el.style.setProperty("--sky-offset", `${offset}px`);
    };
    const scroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    scroll(); window.addEventListener("scroll", scroll, { passive: true });
    return () => { window.removeEventListener("scroll", scroll); window.cancelAnimationFrame(frame); el.style.removeProperty("--sky-offset"); };
  }, [enabled]);
  return <div className="story-sky" ref={ref} aria-hidden="true"><div className="sky-layer"><WatercolorSpot kind="cloud" className="sky-cloud" /><WatercolorSpot kind="moon" className="sky-moon" /><svg className="sky-stars" viewBox="0 0 500 500" fill="none" stroke="currentColor" strokeWidth="1.2">{[[45,80],[420,45],[365,190],[60,350]].map(([x,y],i) => <path key={i} className={`ink-star star-${i}`} pathLength={1} d={`M${x} ${y-7}l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z`} />)}</svg></div></div>;
}
