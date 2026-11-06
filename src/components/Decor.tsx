/**
 * Hand-built SVG decorations (no external images). Every piece is
 * decorative, so each one is aria-hidden.
 */
import { useId, type CSSProperties } from "react";

type Props = { className?: string; style?: CSSProperties };

const BALLOON_COLORS = {
  royal: ["#7ea7f5", "#2f5fd6", "#163a9c"],
  powder: ["#ffffff", "#bcd6fb", "#7fa6e0"],
  gold: ["#fff3c4", "#e9c25a", "#a87719"],
} as const;

export function BalloonSvg({ color = "royal", className, style }: Props & { color?: keyof typeof BALLOON_COLORS }) {
  const id = useId().replace(/:/g, "");
  const [hi, mid, lo] = BALLOON_COLORS[color];
  return (
    <svg viewBox="0 0 100 190" className={className} style={style} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`b${id}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={hi} />
          <stop offset="45%" stopColor={mid} />
          <stop offset="100%" stopColor={lo} />
        </radialGradient>
      </defs>
      <path d="M50 118 C 46 140, 58 152, 48 170 S 52 186, 50 190" stroke="#d4a437" strokeWidth="1.4" fill="none" />
      <path d="M50 4 C 22 4, 4 28, 4 56 C 4 86, 30 112, 50 116 C 70 112, 96 86, 96 56 C 96 28, 78 4, 50 4 Z" fill={`url(#b${id})`} />
      <path d="M44 116 L56 116 L52 123 L48 123 Z" fill={lo} />
      <ellipse cx="32" cy="32" rx="9" ry="15" fill="#fff" opacity="0.55" transform="rotate(-25 32 32)" />
      <ellipse cx="27" cy="54" rx="3" ry="5" fill="#fff" opacity="0.35" />
    </svg>
  );
}

export function Crown({ className, style }: Props) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 84" className={className} style={style} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`c${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff1b8" />
          <stop offset="35%" stopColor="#f2cf6b" />
          <stop offset="70%" stopColor="#c9952f" />
          <stop offset="100%" stopColor="#f0cd68" />
        </linearGradient>
      </defs>
      <path
        d="M10 70 L4 22 L32 46 L60 8 L88 46 L116 22 L110 70 Z"
        fill={`url(#c${id})`}
        stroke="#8a6418"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="9" y="66" width="102" height="14" rx="4" fill={`url(#c${id})`} stroke="#8a6418" strokeWidth="2" />
      <circle cx="4" cy="20" r="5" fill="#f5dc8c" stroke="#8a6418" strokeWidth="1.5" />
      <circle cx="60" cy="7" r="6" fill="#f5dc8c" stroke="#8a6418" strokeWidth="1.5" />
      <circle cx="116" cy="20" r="5" fill="#f5dc8c" stroke="#8a6418" strokeWidth="1.5" />
      <circle cx="60" cy="50" r="7" fill="#2f5fd6" stroke="#8a6418" strokeWidth="1.5" />
      <circle cx="34" cy="58" r="4.5" fill="#bcd6fb" stroke="#8a6418" strokeWidth="1.2" />
      <circle cx="86" cy="58" r="4.5" fill="#bcd6fb" stroke="#8a6418" strokeWidth="1.2" />
      <path d="M20 26 L28 60" stroke="#fff" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
    </svg>
  );
}

export function Sparkle({ className, style }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true" focusable="false">
      <path d="M12 0 C13 8, 16 11, 24 12 C16 13, 13 16, 12 24 C11 16, 8 13, 0 12 C8 11, 11 8, 12 0 Z" fill="currentColor" />
    </svg>
  );
}

export function Cloud({ className, style }: Props) {
  return (
    <svg viewBox="0 0 200 80" className={className} style={style} aria-hidden="true" focusable="false">
      <path
        d="M20 70 C2 70, 2 46, 22 44 C20 24, 48 16, 60 32 C66 10, 104 6, 112 30 C124 18, 152 22, 152 42 C176 36, 196 56, 182 70 Z"
        fill="#fff"
      />
    </svg>
  );
}

export function Cake({ className, style }: Props) {
  return (
    <svg viewBox="0 0 140 150" className={className} style={style} aria-hidden="true" focusable="false">
      {/* candle */}
      <rect x="64" y="20" width="12" height="34" rx="3" fill="#fff" stroke="#2f5fd6" strokeWidth="2" />
      <path d="M64 30 L76 24 M64 40 L76 34 M64 50 L76 44" stroke="#2f5fd6" strokeWidth="3" />
      <path d="M70 2 C78 10, 76 18, 70 20 C64 18, 62 10, 70 2 Z" fill="#f5b942" />
      <path d="M70 8 C73 12, 72 16, 70 17 C68 16, 67 12, 70 8 Z" fill="#fff6c9" />
      {/* top tier */}
      <rect x="34" y="54" width="72" height="34" rx="8" fill="#fff" stroke="#bcd3fc" strokeWidth="2" />
      <path d="M34 66 Q43 76 52 66 T70 66 T88 66 T106 66" fill="none" stroke="#8eb5f8" strokeWidth="4" />
      {/* bottom tier */}
      <rect x="18" y="86" width="104" height="40" rx="9" fill="#fff" stroke="#bcd3fc" strokeWidth="2" />
      <path d="M18 104 Q31 116 44 104 T70 104 T96 104 T122 104" fill="none" stroke="#2f5fd6" strokeWidth="4" />
      {[30, 50, 70, 90, 110].map((x) => (
        <circle key={x} cx={x} cy="92" r="3.5" fill="#2f5fd6" />
      ))}
      {/* stand */}
      <rect x="8" y="126" width="124" height="8" rx="4" fill="#e9c25a" stroke="#a87719" strokeWidth="1.5" />
      <path d="M60 134 L54 148 L86 148 L80 134 Z" fill="#d4a437" />
    </svg>
  );
}

export function Teddy({ className, style }: Props) {
  return (
    <svg viewBox="0 0 140 150" className={className} style={style} aria-hidden="true" focusable="false">
      <g fill="#e2c093" stroke="#a9805a" strokeWidth="2">
        <circle cx="34" cy="26" r="16" />
        <circle cx="106" cy="26" r="16" />
        <ellipse cx="70" cy="112" rx="40" ry="34" />
        <ellipse cx="28" cy="104" rx="14" ry="20" transform="rotate(25 28 104)" />
        <ellipse cx="112" cy="104" rx="14" ry="20" transform="rotate(-25 112 104)" />
        <ellipse cx="44" cy="140" rx="18" ry="10" />
        <ellipse cx="96" cy="140" rx="18" ry="10" />
        <circle cx="70" cy="52" r="38" />
      </g>
      <circle cx="34" cy="26" r="8" fill="#f2d9b6" />
      <circle cx="106" cy="26" r="8" fill="#f2d9b6" />
      <ellipse cx="70" cy="64" rx="16" ry="12" fill="#f2d9b6" />
      <ellipse cx="70" cy="58" rx="6" ry="4.5" fill="#4a2f1d" />
      <path d="M70 62 L70 68 M62 70 Q70 76 78 70" stroke="#4a2f1d" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="56" cy="44" r="4.5" fill="#2b1a10" />
      <circle cx="84" cy="44" r="4.5" fill="#2b1a10" />
      <circle cx="57.5" cy="42.5" r="1.4" fill="#fff" />
      <circle cx="85.5" cy="42.5" r="1.4" fill="#fff" />
      <ellipse cx="70" cy="116" rx="22" ry="18" fill="#f2d9b6" />
      {/* bow tie */}
      <path d="M70 90 L48 80 L48 100 Z M70 90 L92 80 L92 100 Z" fill="#2f5fd6" stroke="#1b3fa0" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="70" cy="90" r="5.5" fill="#1b3fa0" />
    </svg>
  );
}

export function Gift({ className, style }: Props) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 130" className={className} style={style} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7ea7f5" />
          <stop offset="100%" stopColor="#1f48c0" />
        </linearGradient>
      </defs>
      <rect x="10" y="54" width="100" height="72" rx="6" fill={`url(#g${id})`} />
      <rect x="4" y="40" width="112" height="20" rx="5" fill="#3a6ae0" />
      <rect x="52" y="40" width="16" height="86" fill="#e9c25a" />
      <path d="M60 40 C40 10, 14 22, 30 38 Z M60 40 C80 10, 106 22, 90 38 Z" fill="#f2cf6b" stroke="#a87719" strokeWidth="2" />
      <circle cx="60" cy="40" r="7" fill="#d4a437" stroke="#a87719" strokeWidth="2" />
      {[24, 36, 86, 96].map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 ? 98 : 78} r="2" fill="#fff" opacity="0.8" />
      ))}
    </svg>
  );
}

/** Flat ribbon banner with folded tails; children are the label. */
export function Ribbon({ children, className }: { children: React.ReactNode; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className={`relative mx-auto w-full max-w-md ${className ?? ""}`}>
      <svg viewBox="0 0 400 90" className="block h-auto w-full" aria-hidden="true" focusable="false" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`r${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a6ae0" />
            <stop offset="60%" stopColor="#1f48c0" />
            <stop offset="100%" stopColor="#172f7a" />
          </linearGradient>
        </defs>
        <path d="M0 30 L46 30 L46 78 L0 78 L16 54 Z" fill="#14275f" />
        <path d="M400 30 L354 30 L354 78 L400 78 L384 54 Z" fill="#14275f" />
        <path d="M46 78 L62 66 L62 78 Z M354 78 L338 66 L338 78 Z" fill="#0d1b45" />
        <path
          d="M40 18 Q200 0 360 18 L360 66 Q200 48 40 66 Z"
          fill={`url(#r${id})`}
          stroke="#e9c25a"
          strokeWidth="3"
        />
      </svg>
      <span className="absolute inset-x-[14%] top-[10%] bottom-[24%] flex items-center justify-center text-center">
        {children}
      </span>
    </div>
  );
}
