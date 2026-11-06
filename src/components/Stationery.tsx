import { type ReactNode } from "react";
import { m, useReducedMotion } from "motion/react";

export function Fade({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return <m.div className={className} initial={{ opacity: reduce ? 1 : 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.08 }} transition={{ duration: reduce ? 0 : 0.65 }}>{children}</m.div>;
}
export function LineCrown({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 100 75" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m13 27 12 34 53-2 10-36-23 20L49 14 35 44 13 27ZM25 67l52-2M18 53l62-2"/><circle cx="12" cy="23" r="3"/><circle cx="49" cy="10" r="3"/><circle cx="89" cy="19" r="3"/><path d="m46 52 4-6 5 6-4 5-5-5"/></svg>;
}
export function LineBalloons() {
  return <svg className="line-balloons" viewBox="0 0 130 230" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true"><path d="M48 94c-24-9-38-40-27-62 9-19 32-22 47-7 19 20 9 56-20 69Zm0 0-4 7 9-1-5-6ZM83 113c-11-20-7-51 14-57 20-6 34 17 24 36-8 15-22 22-38 21Zm0 0-2 7 9-4-7-3M48 101c-5 39 44 41 24 80-8 17-4 28 6 38M85 119c-20 15-29 47-13 62M30 41c-3 10 0 20 4 25"/></svg>;
}
