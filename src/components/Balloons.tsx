import { m, useReducedMotion } from "motion/react";
import { BalloonSvg, Sparkle } from "./Decor";

type BalloonSpec = {
  color: "royal" | "powder" | "gold";
  left: string;
  top: string;
  width: string;
  rotate: number;
  delay: number;
  z?: number;
};

/** A cluster of floating balloons. Positioned absolutely by the parent. */
export function BalloonCluster({ balloons, className, paused = false }: { balloons: BalloonSpec[]; className?: string; paused?: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const reduce = prefersReducedMotion || paused;
  return (
    <div className={`pointer-events-none absolute ${className ?? ""}`} aria-hidden="true">
      {balloons.map((b, i) => (
        <m.div
          key={i}
          className="absolute"
          style={{ left: b.left, top: b.top, width: b.width, zIndex: b.z ?? 0, rotate: b.rotate }}
          initial={{ opacity: 0, y: 40 }}
          animate={
            reduce
              ? { opacity: 1, y: 0 }
              : { opacity: 1, y: [0, -10, 0], rotate: [b.rotate, b.rotate + 3, b.rotate] }
          }
          transition={
            reduce
              ? { duration: 0.3 }
              : {
                  opacity: { duration: 0.8, delay: b.delay },
                  y: { duration: 5 + i * 0.7, repeat: Infinity, ease: "easeInOut", delay: b.delay },
                  rotate: { duration: 6 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: b.delay },
                }
          }
        >
          <BalloonSvg color={b.color} className="block h-auto w-full" />
        </m.div>
      ))}
    </div>
  );
}

export const LEFT_CLUSTER: BalloonSpec[] = [
  { color: "powder", left: "0%", top: "0%", width: "46%", rotate: -12, delay: 0.1 },
  { color: "royal", left: "34%", top: "-4%", width: "48%", rotate: 6, delay: 0.2 },
  { color: "gold", left: "22%", top: "14%", width: "48%", rotate: -4, delay: 0.3, z: 2 },
  { color: "royal", left: "-6%", top: "28%", width: "46%", rotate: -14, delay: 0.4, z: 1 },
];

export const RIGHT_CLUSTER: BalloonSpec[] = [
  { color: "gold", left: "40%", top: "0%", width: "50%", rotate: 10, delay: 0.25 },
  { color: "royal", left: "4%", top: "10%", width: "50%", rotate: -6, delay: 0.35, z: 1 },
  { color: "powder", left: "46%", top: "22%", width: "48%", rotate: 12, delay: 0.45, z: 2 },
];

const SPARKLES = [
  { left: "8%", top: "12%", size: 12, delay: 0 },
  { left: "88%", top: "8%", size: 10, delay: 0.8 },
  { left: "72%", top: "30%", size: 14, delay: 1.6 },
  { left: "16%", top: "46%", size: 10, delay: 0.4 },
  { left: "92%", top: "52%", size: 12, delay: 1.2 },
  { left: "6%", top: "70%", size: 9, delay: 2 },
  { left: "60%", top: "62%", size: 8, delay: 2.4 },
  { left: "40%", top: "4%", size: 9, delay: 1 },
  { left: "82%", top: "78%", size: 10, delay: 0.6 },
];

/** Gentle twinkling sparkles. Static (but visible) when reduced motion is on. */
export function Sparkles() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {SPARKLES.map((s, i) => (
        <m.span
          key={i}
          className="absolute text-gold-400"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
          initial={{ opacity: reduce ? 0.7 : 0 }}
          animate={reduce ? { opacity: 0.7 } : { opacity: [0, 1, 0], scale: [0.6, 1.1, 0.6] }}
          transition={reduce ? undefined : { duration: 2.8, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        >
          <Sparkle className="h-full w-full" />
        </m.span>
      ))}
    </div>
  );
}
