type P = { className?: string };
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export const MusicIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </svg>
);

export const PauseIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M9 5v14M15 5v14" strokeWidth={3} />
  </svg>
);
