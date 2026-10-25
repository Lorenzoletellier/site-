type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export const LeafIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" />
    <path d="M5 19 13 11" />
  </svg>
);

export const DropIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />
    <path d="M9 15a3 3 0 0 0 3 3" />
  </svg>
);

export const RecycleIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M7 19H4.5a1.5 1.5 0 0 1-1.3-2.2L6 12" />
    <path d="M10 19h9.5a1.5 1.5 0 0 0 1.3-2.2L18.5 13" />
    <path d="m8.5 7 2.2-3.8a1.5 1.5 0 0 1 2.6 0L16 8" />
    <path d="m13 16-3 3 3 3" />
    <path d="m4 9 2 3 3.5-1" />
    <path d="m19.5 9.5-1 3.5-3.5-1" />
  </svg>
);

export const ArrowIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const BagIcon = ({ className }: IconProps) => (
  <svg {...base} strokeWidth={1.5} className={className}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 10V6a3 3 0 0 1 6 0v4" />
  </svg>
);

export const UserIcon = ({ className }: IconProps) => (
  <svg {...base} strokeWidth={1.5} className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
