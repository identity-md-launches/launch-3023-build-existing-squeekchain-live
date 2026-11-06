import type { CSSProperties } from 'react';

export function Icon({
  name,
  size = 20,
  className = '',
  style,
}: {
  name:
    | 'refresh'
    | 'arrow'
    | 'work'
    | 'wheel'
    | 'blocks'
    | 'settle'
    | 'check'
    | 'clock'
    | 'info'
    | 'pause'
    | 'play';
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const paths = {
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M6 7a7 7 0 0 1 11.5-2L20 8M4 16l2.5 3A7 7 0 0 0 18 17" />
      </>
    ),
    arrow: (
      <>
        <path d="M6 18 18 6M6 6h12v12" />
      </>
    ),
    work: (
      <>
        <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z" />
      </>
    ),
    wheel: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="2" />
        <path d="m6 6 4.5 4.5m3 3L18 18M6 18l4.5-4.5m3-3L18 6" />
      </>
    ),
    blocks: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    settle: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7v.01" />
      </>
    ),
    pause: (
      <>
        <path d="M9 5v14M15 5v14" />
      </>
    ),
    play: <path d="m8 5 11 7-11 7V5Z" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {paths[name]}
    </svg>
  );
}

export function HamsterMark() {
  return (
    <svg
      className="brand-mark"
      width="36"
      height="36"
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="19" fill="currentColor" />
      <g fill="#d1f5a5">
        <circle cx="20" cy="20" r="8" />
        <circle cx="44" cy="20" r="8" />
        <ellipse cx="32" cy="36" rx="21" ry="19" />
      </g>
      <g fill="currentColor">
        <circle cx="24" cy="33" r="2.5" />
        <circle cx="40" cy="33" r="2.5" />
        <ellipse cx="32" cy="42" rx="4" ry="2.5" />
      </g>
    </svg>
  );
}
