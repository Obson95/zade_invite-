import { useEffect, useRef, type CSSProperties } from "react";
import { InkStar } from "./Ink";

const STARS: [number, number, number][] = [
  [6, 12, 16], [14, 68, 12], [3, 42, 10], [22, 8, 11], [91, 16, 15], [96, 52, 11], [84, 6, 10], [88, 78, 13], [52, 4, 10], [34, 94, 10], [70, 95, 11],
];

const LAYERS: { art: string; depth: number; className: string }[] = [
  { art: "wash-band", depth: 1, className: "scene-wash-top" },
  { art: "wash-d", depth: 1, className: "scene-wash-low" },
  { art: "moon", depth: 2, className: "scene-moon" },
  { art: "cloud-2", depth: 3, className: "scene-cloud-a" },
  { art: "cloud-1", depth: 4, className: "scene-cloud-b" },
  { art: "balloon", depth: 6, className: "scene-balloon" },
];

/**
 * The sky behind the book. Layers shift by different amounts with the pointer
 * (only on a real mouse) and drift on their own, using transforms only.
 */
export function Scene() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!fine.matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const layers = () => document.querySelectorAll<HTMLElement>(".scene [data-depth], .face.is-open [data-depth]");
    const paint = () => {
      frame = 0;
      layers().forEach((el) => {
        const d = Number(el.dataset.depth);
        el.style.transform = `translate3d(${(x * d).toFixed(1)}px,${(y * d * 0.6).toFixed(1)}px,0)`;
      });
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = (e.clientX / window.innerWidth - 0.5) * -3;
      y = (e.clientY / window.innerHeight - 0.5) * -3;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="scene" ref={ref} aria-hidden="true">
      {LAYERS.map((layer) => (
        <span key={layer.className} className={`scene-layer ${layer.className}`} data-depth={layer.depth}>
          <img src={`/images/book/${layer.art}.webp`} alt="" draggable={false} />
        </span>
      ))}
      {STARS.map(([x, y, size], i) => (
        <InkStar key={`${x}-${y}`} className="twinkle" style={{ left: `${x}%`, top: `${y}%`, width: size, "--twinkle": `${(i % 5) * 1.1}s` } as CSSProperties} />
      ))}
    </div>
  );
}
