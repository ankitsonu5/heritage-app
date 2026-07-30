// Line icons for the dashboard, drawn as SVG.
//
// The sidebar used emoji-ish glyphs (◫ ▤ ☺ ☎ ⚑ ⚗ ₹). Those are font characters —
// they render differently on every machine and read as clip-art, not as a hospital
// system. These are drawn by us: one weight, one grid, the brand's colour.

type Props = { name: string; size?: number; color?: string };

export function Icon({ name, size = 17, color = 'currentColor' }: Props) {
  const p = {
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {name === 'dashboard' && (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" {...p} />
          <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.5" {...p} />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" {...p} />
          <rect x="13.5" y="11" width="7" height="9.5" rx="1.5" {...p} />
        </>
      )}

      {name === 'orders' && (
        <>
          <path d="M6 3h8l4 4v14H6z" {...p} />
          <path d="M14 3v4h4" {...p} />
          <path d="M9 12h6M9 16h4" {...p} />
        </>
      )}

      {name === 'users' && (
        <>
          <circle cx="9.5" cy="8" r="3.25" {...p} />
          <path d="M3.5 19.5a6 6 0 0 1 12 0" {...p} />
          <path d="M16 5.5a3.25 3.25 0 0 1 0 6.4" {...p} />
          <path d="M17.5 14.2a6 6 0 0 1 3 5.3" {...p} />
        </>
      )}

      {name === 'pro' && (
        <>
          <path
            d="M6 3h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L15.5 12l4 1.5v3.5a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 6.2 2 2 0 0 1 6 3Z"
            {...p}
          />
        </>
      )}

      {name === 'agents' && (
        <>
          <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" {...p} />
          <circle cx="12" cy="10" r="2.75" {...p} />
        </>
      )}

      {name === 'lab' && (
        <>
          <path d="M9.5 3v6L5 18.5A1.5 1.5 0 0 0 6.4 21h11.2a1.5 1.5 0 0 0 1.4-2.5L14.5 9V3" {...p} />
          <path d="M8.5 3h7M7.5 15h9" {...p} />
        </>
      )}

      {name === 'collection' && (
        <>
          <rect x="3" y="6" width="18" height="12" rx="2" {...p} />
          <circle cx="12" cy="12" r="2.5" {...p} />
          <path d="M6.5 9.5v5M17.5 9.5v5" {...p} />
        </>
      )}

      {name === 'bell' && (
        <>
          <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z" {...p} />
          <path d="M10 19a2 2 0 0 0 4 0" {...p} />
        </>
      )}

      {name === 'eye' && (
        <>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...p} />
          <circle cx="12" cy="12" r="3" {...p} />
        </>
      )}

      {name === 'eye-off' && (
        <>
          <path d="M9.9 5.8A9.5 9.5 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.7" {...p} />
          <path d="M6.4 7.8A17 17 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 3.6-.7" {...p} />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" {...p} />
          <path d="M3.5 3.5l17 17" {...p} />
        </>
      )}

      {name === 'close' && <path d="M6 6l12 12M18 6L6 18" {...p} />}
    </svg>
  );
}
