import { useEffect, useRef, useState, type ReactNode } from "react";

export function PageSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setVisible(true); setInView(true); return; }
    const observer = new IntersectionObserver(entries => {
      const intersects = entries.some(entry => entry.isIntersecting);
      setInView(intersects);
      if (intersects) setVisible(true);
    }, { threshold: 0.06 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`story-section ${visible ? "is-visible" : ""} ${inView ? "is-in-view" : ""} ${className}`}>{children}</div>;
}

export function WrittenName({ name }: { name: string }) {
  if (name !== "Zade") return <span className="zade-script">{name}</span>;
  return <span className="written-name"><span className="sr-only">Zade</span><svg viewBox="0 0 390 145" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path className="letter-stroke letter-z" pathLength={1} d="M24 43C40 18 91 35 124 26C96 43 60 71 38 102C57 88 86 93 104 101C118 107 128 108 138 94M34 104C16 125 26 136 49 120" />
    <path className="letter-stroke letter-a" pathLength={1} d="M168 76C151 54 125 81 132 100C139 117 162 94 169 73L159 100C158 114 174 108 185 95" />
    <path className="letter-stroke letter-d" pathLength={1} d="M226 73C207 58 183 84 190 102C199 119 220 94 230 71C248 37 259 9 248 14C235 20 220 77 219 101C221 115 238 106 247 95" />
    <path className="letter-stroke letter-e" pathLength={1} d="M250 92C281 94 291 66 272 70C247 76 242 110 267 111C280 112 294 102 304 93C321 80 331 88 343 81" />
    <path className="letter-stroke letter-finish" pathLength={1} strokeWidth="1.3" d="M69 131C142 119 241 127 319 117" />
  </svg></span>;
}

export function WatercolorSpot({ kind, className = "" }: { kind: "cloud" | "moon" | "balloon" | "crown"; className?: string }) {
  return <img className={`watercolor-spot ${className}`} src={`/images/watercolor-${kind}.svg`} width={200} height={180} alt="" aria-hidden="true" />;
}

export function LineCrown({ className = "" }: { className?: string }) {
  return <svg className={`drawn-crown ${className}`} viewBox="0 0 100 75" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path pathLength={1} className="ink-stroke" d="m13 27 12 34 53-2 10-36-23 20L49 14 35 44 13 27ZM25 67l52-2M18 53l62-2"/><circle cx="12" cy="23" r="3"/><circle cx="49" cy="10" r="3"/><circle cx="89" cy="19" r="3"/><path d="m46 52 4-6 5 6-4 5-5-5"/></svg>;
}
