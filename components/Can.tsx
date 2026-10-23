import type { ReactNode } from "react";
import type { Pattern } from "@/lib/flavors";

type CanProps = {
  name: string;
  color: string;
  accent: string;
  secondary?: string;
  pattern?: Pattern;
  className?: string;
};

// Bulles placées à la main pour un rendu régulier (x, y, rayon)
const BUBBLES: [number, number, number][] = [
  [24, 186, 7], [44, 172, 4], [92, 182, 9], [74, 160, 5], [30, 148, 3],
  [98, 140, 4], [20, 118, 6], [86, 112, 3], [36, 92, 4], [100, 86, 7],
  [26, 64, 3], [90, 52, 4], [40, 36, 6], [70, 30, 3],
];

function sunburstRays() {
  const cx = 60;
  const cy = 200;
  const r = 260;
  const rays: string[] = [];
  for (let i = 0; i < 36; i += 2) {
    const a1 = (i * 10 * Math.PI) / 180;
    const a2 = ((i + 1) * 10 * Math.PI) / 180;
    const p = (a: number) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    rays.push(`${cx},${cy} ${p(a1)} ${p(a2)}`);
  }
  return rays;
}

function PatternLayer({ pattern, id, color }: { pattern: Pattern; id: string; color: string }) {
  const fill = `url(#pat-${id})`;
  let defs: ReactNode = null;
  let shapes: ReactNode = <rect x="0" y="0" width="120" height="230" fill={fill} />;

  switch (pattern) {
    case "stripes":
      defs = (
        <pattern id={`pat-${id}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="6" height="14" fill={color} />
        </pattern>
      );
      break;
    case "dots":
      defs = (
        <pattern id={`pat-${id}`} width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="2.4" fill={color} />
          <circle cx="9" cy="9" r="2.4" fill={color} />
        </pattern>
      );
      break;
    case "waves":
      defs = (
        <pattern id={`pat-${id}`} width="24" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 6 Q6 0 12 6 T24 6" fill="none" stroke={color} strokeWidth="2.6" />
        </pattern>
      );
      break;
    case "zigzag":
      defs = (
        <pattern id={`pat-${id}`} width="16" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 9 L8 3 L16 9" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
        </pattern>
      );
      break;
    case "checker":
      defs = (
        <pattern id={`pat-${id}`} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill={color} />
          <rect x="8" y="8" width="8" height="8" fill={color} />
        </pattern>
      );
      break;
    case "rings":
      shapes = (
        <g fill="none" stroke={color} strokeWidth="5">
          {Array.from({ length: 16 }, (_, i) => (
            <circle key={i} cx="106" cy="30" r={14 + i * 15} />
          ))}
        </g>
      );
      break;
    case "sunburst":
      shapes = (
        <g fill={color}>
          {sunburstRays().map((pts) => (
            <polygon key={pts} points={pts} />
          ))}
        </g>
      );
      break;
    case "bubbles":
      shapes = (
        <g fill="none" stroke={color} strokeWidth="2">
          {BUBBLES.map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
      break;
    case "split":
      shapes = (
        <g>
          <polygon points="0,150 120,96 120,230 0,230" fill={color} />
          <polygon points="0,150 120,96 120,104 0,158" fill="#f4ffe8" opacity="0.9" />
          {[[30, 128], [52, 120], [76, 108], [40, 112], [64, 100], [88, 92]].map(([x, y]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y - 40} rx="2" ry="3.2" fill="#1a1a1a" opacity="0.75" />
          ))}
        </g>
      );
      break;
  }

  return (
    <>
      {defs && <defs>{defs}</defs>}
      {shapes}
    </>
  );
}

// Gouttes de condensation (x, y, taille)
const DROPS: [number, number, number][] = [
  [22, 58, 1.6], [34, 74, 1.1], [90, 50, 1.3], [98, 70, 1.8], [26, 104, 1.2],
  [96, 112, 1.1], [84, 132, 1.5], [20, 140, 1.9], [36, 158, 1.2], [100, 154, 1.4],
  [88, 92, 0.9], [30, 122, 0.8], [94, 176, 1.1], [24, 182, 1.4], [82, 64, 0.8],
];

export default function Can({ name, color, accent, secondary, pattern, className }: CanProps) {
  const id = name.replace(/\W+/g, "-").toLowerCase();
  const metal = `url(#metal-${id})`;

  return (
    <svg
      viewBox="0 0 120 230"
      className={className}
      role="img"
      aria-label={`Canette ${name}`}
    >
      <defs>
        {/* Ombrage cylindrique : bords sombres, reflet spéculaire, liseré de lumière */}
        <linearGradient id={`body-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="0.08" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.2" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="0.28" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.34" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="0.82" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.9" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        {/* Légère ombre en haut et en bas du corps */}
        <linearGradient id={`vshade-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.3" />
          <stop offset="0.08" stopColor="#000" stopOpacity="0" />
          <stop offset="0.92" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`metal-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#5f646b" />
          <stop offset="0.18" stopColor="#c9ced4" />
          <stop offset="0.3" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#aeb4bb" />
          <stop offset="0.7" stopColor="#8d939a" />
          <stop offset="0.88" stopColor="#d5d9de" />
          <stop offset="1" stopColor="#4e535a" />
        </linearGradient>
        <radialGradient id={`lid-${id}`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#f4f6f8" />
          <stop offset="0.6" stopColor="#b3b9c0" />
          <stop offset="1" stopColor="#7c828a" />
        </radialGradient>
        <filter id={`blur-${id}`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <clipPath id={`clip-${id}`}>
          <path d="M14 38 L106 38 L106 196 A46 7 0 0 1 14 196 Z" />
        </clipPath>
      </defs>

      {/* Ombre au sol */}
      <ellipse cx="60" cy="214" rx="44" ry="6" fill="#000" opacity="0.35" filter={`url(#blur-${id})`} />

      {/* Corps peint + motif */}
      <g clipPath={`url(#clip-${id})`}>
        <rect x="14" y="30" width="92" height="174" fill={color} />
        {pattern && secondary && <PatternLayer pattern={pattern} id={id} color={secondary} />}

        {/* Bandeau vertical derrière le logo */}
        <rect x="45" y="58" width="30" height="110" rx="15" fill={color} />
        <rect x="45" y="58" width="30" height="110" rx="15" fill="none" stroke={accent} strokeWidth="1.2" opacity="0.6" />

        {/* Bandeau du nom, courbé comme la canette */}
        <path d="M14 174 A46 6 0 0 0 106 174 L106 188 A46 6 0 0 1 14 188 Z" fill={accent} />

        {/* Ombrages et reflets */}
        <rect x="14" y="30" width="92" height="174" fill={`url(#vshade-${id})`} />
        <rect x="14" y="30" width="92" height="174" fill={`url(#body-${id})`} />
        <rect x="38" y="30" width="2.5" height="174" fill="#fff" opacity="0.35" />

        {/* Condensation */}
        {DROPS.map(([x, y, s]) => (
          <g key={`${x}-${y}`}>
            <ellipse cx={x} cy={y} rx={s} ry={s * 1.3} fill="#fff" opacity="0.28" />
            <ellipse cx={x - s * 0.35} cy={y - s * 0.4} rx={s * 0.35} ry={s * 0.45} fill="#fff" opacity="0.8" />
          </g>
        ))}
      </g>

      {/* Étiquette */}
      <text
        x="60"
        y="113"
        textAnchor="middle"
        dominantBaseline="central"
        fill={accent}
        fontSize="20"
        fontWeight="800"
        letterSpacing="1"
        transform="rotate(-90 60 113)"
        style={{ fontFamily: "var(--font-bricolage)" }}
      >
        PÉTILLE
      </text>
      <text
        x="60"
        y="183"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="7"
        fontWeight="700"
        letterSpacing="0.5"
      >
        {name.toUpperCase()}
      </text>
      <text x="60" y="53" textAnchor="middle" fill={accent} fontSize="6" fontWeight="600" opacity="0.8">
        33 cl · BIO
      </text>

      {/* Épaulement métallique */}
      <path d="M14 38 C14 31 20 27 22 22 L98 22 C100 27 106 31 106 38 A46 7 0 0 1 14 38 Z" fill={metal} />
      <path d="M14 38 A46 7 0 0 0 106 38" fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="0.8" />

      {/* Couvercle */}
      <ellipse cx="60" cy="22" rx="38" ry="6" fill={metal} />
      <ellipse cx="60" cy="22" rx="38" ry="6" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" />
      <ellipse cx="60" cy="22.6" rx="33" ry="4.6" fill={`url(#lid-${id})`} />
      <ellipse cx="60" cy="22.6" rx="33" ry="4.6" fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="0.6" />

      {/* Ouverture et languette */}
      <path d="M62 20.2 Q72 19.6 76 21.6 Q72 24 62 23.4 Z" fill="#9097a0" stroke="#6b7179" strokeWidth="0.4" />
      <path d="M44 21.4 Q44 18.6 52 18.6 L60 18.6 Q64 18.6 64 21.4 Q64 24.4 60 24.4 L52 24.4 Q44 24.4 44 21.4 Z" fill="#d9dde2" stroke="#7c828a" strokeWidth="0.5" />
      <ellipse cx="51" cy="21.5" rx="3.6" ry="1.6" fill="#7c828a" />
      <circle cx="60" cy="21.6" r="1.4" fill="#aeb4bb" stroke="#6b7179" strokeWidth="0.4" />

      {/* Fond métallique */}
      <path d="M14 196 A46 7 0 0 0 106 196 C106 202 102 206 98 208 A38 5 0 0 1 22 208 C18 206 14 202 14 196 Z" fill={metal} />
      <path d="M14 196 A46 7 0 0 0 106 196" fill="none" stroke="#000" strokeOpacity="0.3" strokeWidth="0.8" />
    </svg>
  );
}
