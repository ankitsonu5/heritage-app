// Line icons, drawn as SVG paths.
//
// The app used emoji before. Emoji are rendered by the operating system, so the
// same "🔔" is a flat glyph on one Android and a glossy cartoon on another — the
// app looked different on every phone and nothing like a hospital. These are drawn
// by us: one weight, one corner radius, the brand's colour, identical everywhere.
//
// Stroke-based, 24×24 grid, 1.75 stroke — matched to the UI's type weight.

import React from 'react';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

export type IconName =
  | 'home' | 'status' | 'report' | 'camera' | 'bell' | 'phone' | 'speaker'
  | 'check' | 'close' | 'chevron' | 'download' | 'refresh' | 'switch'
  | 'user' | 'flask' | 'money' | 'clock' | 'alert' | 'eye' | 'eye-off' | 'logout'
  | 'speaker-off';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export default function Icon({ name, size = 22, color = '#5E111B', strokeWidth = 1.75 }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <>
          <Path d="M3 10.5 12 3l9 7.5" {...common} />
          <Path d="M5.5 9.5V20h13V9.5" {...common} />
          <Path d="M9.5 20v-6h5v6" {...common} />
        </>
      )}

      {name === 'status' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...common} />
          <Circle cx="12" cy="12" r="3" {...common} />
        </>
      )}

      {name === 'report' && (
        <>
          <Path d="M6 3h8l4 4v14H6z" {...common} />
          <Path d="M14 3v4h4" {...common} />
          <Path d="M9 12h6M9 16h4" {...common} />
        </>
      )}

      {name === 'camera' && (
        <>
          <Path d="M3 8h3.5l1.5-2.5h8L17.5 8H21v11H3z" {...common} />
          <Circle cx="12" cy="13" r="3.5" {...common} />
        </>
      )}

      {name === 'bell' && (
        <>
          <Path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z" {...common} />
          <Path d="M10 19a2 2 0 0 0 4 0" {...common} />
        </>
      )}

      {name === 'phone' && (
        <Path
          d="M6 3h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L15.5 12l4 1.5v3.5a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 6.2 2 2 0 0 1 6 3Z"
          {...common}
        />
      )}

      {name === 'speaker' && (
        <>
          <Path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" {...common} />
          <Path d="M16 9a4 4 0 0 1 0 6" {...common} />
          <Path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" {...common} />
        </>
      )}

      {name === 'check' && <Polyline points="4.5,12.5 9.5,17.5 19.5,6.5" {...common} />}

      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...common} />}

      {name === 'chevron' && <Polyline points="9,5 16,12 9,19" {...common} />}

      {name === 'download' && (
        <>
          <Path d="M12 3v11" {...common} />
          <Polyline points="7.5,10 12,14.5 16.5,10" {...common} />
          <Path d="M4.5 19h15" {...common} />
        </>
      )}

      {name === 'refresh' && (
        <>
          <Path d="M20 12a8 8 0 1 1-2.6-5.9" {...common} />
          <Polyline points="20,3.5 20,7.5 16,7.5" {...common} />
        </>
      )}

      {name === 'switch' && (
        <>
          <Polyline points="7,7 4,10 7,13" {...common} />
          <Path d="M4 10h13a3 3 0 0 1 0 6h-1" {...common} />
          <Polyline points="17,21 20,18 17,15" {...common} />
        </>
      )}

      {name === 'user' && (
        <>
          <Circle cx="12" cy="8" r="3.75" {...common} />
          <Path d="M4.5 20a7.5 7.5 0 0 1 15 0" {...common} />
        </>
      )}

      {name === 'flask' && (
        <>
          <Path d="M9.5 3v6L5 18.5A1.5 1.5 0 0 0 6.4 21h11.2a1.5 1.5 0 0 0 1.4-2.5L14.5 9V3" {...common} />
          <Path d="M8.5 3h7M7.5 15h9" {...common} />
        </>
      )}

      {name === 'money' && (
        <>
          <Rect x="3" y="6" width="18" height="12" rx="2" {...common} />
          <Circle cx="12" cy="12" r="2.5" {...common} />
        </>
      )}

      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...common} />
          <Polyline points="12,7 12,12 15.5,14" {...common} />
        </>
      )}

      {name === 'alert' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...common} />
          <Path d="M12 7.5v5.5" {...common} />
          <Circle cx="12" cy="16.5" r=".9" fill={color} stroke="none" />
        </>
      )}

      {name === 'eye' && (
        <>
          <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...common} />
          <Circle cx="12" cy="12" r="3" {...common} />
        </>
      )}

      {name === 'eye-off' && (
        <>
          <Path d="M9.9 5.8A9.5 9.5 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.7" {...common} />
          <Path d="M6.4 7.8A17 17 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 3.6-.7" {...common} />
          <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" {...common} />
          <Path d="M3.5 3.5l17 17" {...common} />
        </>
      )}

      {name === 'logout' && (
        <>
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...common} />
          <Path d="M16 17l5-5-5-5" {...common} />
          <Path d="M21 12H9" {...common} />
        </>
      )}

      {/* Same speaker cone, waves replaced by a cross — voice guidance is off. */}
      {name === 'speaker-off' && (
        <>
          <Path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" {...common} />
          <Path d="M16.5 9.5l5 5" {...common} />
          <Path d="M21.5 9.5l-5 5" {...common} />
        </>
      )}
    </Svg>
  );
}
