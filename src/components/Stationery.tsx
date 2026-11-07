import { type ReactNode } from "react";

export function PageSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function WatercolorSpot({ kind, className = "" }: { kind: "cloud" | "moon" | "balloon" | "crown"; className?: string }) {
  return <img className={`watercolor-spot ${className}`} src={`/images/watercolor-${kind}.svg`} width={200} height={180} alt="" aria-hidden="true" />;
}

export function LineCrown({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 100 75" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m13 27 12 34 53-2 10-36-23 20L49 14 35 44 13 27ZM25 67l52-2M18 53l62-2"/><circle cx="12" cy="23" r="3"/><circle cx="49" cy="10" r="3"/><circle cx="89" cy="19" r="3"/><path d="m46 52 4-6 5 6-4 5-5-5"/></svg>;
}
