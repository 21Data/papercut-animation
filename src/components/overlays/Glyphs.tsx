import React from 'react';
import {evolvePath} from '@remotion/paths';
import type {GlyphName} from '../../lib/overlays';

/**
 * Every icon here is drawn, not imported. They share one hand: slightly
 * off-true lines, round caps, a filled paper body under a drawn outline.
 */

interface Spec {
  paths: string[];
  fillPath?: string;
  dots?: Array<{x: number; y: number; r: number}>;
}

const GLYPHS: Record<GlyphName, Spec> = {
  coin: {
    paths: [
      'M50 10 C72 10 90 28 90 50 C90 72 72 90 50 90 C28 90 10 72 10 50 C10 28 28 10 50 10 Z',
      'M50 27 V73',
      'M61 36 C61 31 39 31 39 38 C39 45 61 45 61 52 C61 59 39 59 39 54',
      'M30 28 C26 34 25 40 26 44',
    ],
  },
  receipt: {
    paths: [
      'M27 12 H73 V78 L67 84 L61 78 L55 84 L49 78 L43 84 L37 78 L31 84 L27 78 Z',
      'M36 30 H64',
      'M36 42 H64',
      'M36 54 H58',
      'M36 66 H50',
    ],
  },
  eye: {
    paths: [
      'M8 50 C26 24 74 24 92 50 C74 76 26 76 8 50 Z',
      'M50 38 C57 38 62 43 62 50 C62 57 57 62 50 62 C43 62 38 57 38 50 C38 43 43 38 50 38 Z',
      'M50 14 V6',
      'M50 94 V86',
      'M14 50 H6',
      'M94 50 H86',
    ],
    fillPath: 'M8 50 C26 24 74 24 92 50 C74 76 26 76 8 50 Z',
  },
  house: {
    paths: [
      'M12 48 L50 16 L88 48',
      'M20 45 V88 H80 V45',
      'M43 88 V64 H57 V88',
      'M28 55 H38 V65 H28 Z',
    ],
    fillPath: 'M20 45 L50 22 L80 45 V88 H20 Z',
  },
  car: {
    paths: [
      'M12 62 C18 62 20 54 26 54 H62 C68 54 72 58 78 62 H88 V72 H12 Z',
      'M26 54 C30 42 40 38 50 38 C60 38 68 44 72 54',
      'M30 74 C30 68 40 68 40 74 C40 80 30 80 30 74 Z',
      'M62 74 C62 68 72 68 72 74 C72 80 62 80 62 74 Z',
      'M8 82 H92',
    ],
    fillPath: 'M12 62 C18 62 20 54 26 54 H62 C68 54 72 58 78 62 H88 V72 H12 Z',
  },
  watch: {
    paths: [
      'M38 8 H62 V30 H38 Z',
      'M38 70 H62 V92 H38 Z',
      'M50 30 C61 30 70 39 70 50 C70 61 61 70 50 70 C39 70 30 61 30 50 C30 39 39 30 50 30 Z',
      'M50 50 V36',
      'M50 50 L62 56',
    ],
    fillPath: 'M50 30 C61 30 70 39 70 50 C70 61 61 70 50 70 C39 70 30 61 30 50 C30 39 39 30 50 30 Z',
  },
  scale: {
    paths: [
      'M50 22 V84',
      'M32 88 H68',
      'M18 34 H82',
      'M18 34 L10 52',
      'M18 34 L26 52',
      'M82 34 L74 52',
      'M82 34 L90 52',
      'M10 52 C10 60 26 60 26 52',
      'M74 52 C74 60 90 60 90 52',
      'M42 22 H58',
    ],
  },
  bubble: {
    paths: [
      'M14 22 C14 15 20 10 28 10 H72 C80 10 86 15 86 22 V56 C86 63 80 68 72 68 H46 L30 82 L32 68 H28 C20 68 14 63 14 56 Z',
      'M34 39 H36',
      'M48 39 H50',
      'M62 39 H64',
    ],
    fillPath:
      'M14 22 C14 15 20 10 28 10 H72 C80 10 86 15 86 22 V56 C86 63 80 68 72 68 H46 L30 82 L32 68 H28 C20 68 14 63 14 56 Z',
  },
  hand: {
    paths: [
      'M30 52 C30 44 34 40 40 40 H68 C74 40 78 44 78 50 V66 C78 80 68 88 54 88 H46 C34 88 26 80 26 68 Z',
      'M38 40 V24',
      'M50 40 V20',
      'M62 40 V24',
      'M74 44 V32',
      'M30 54 C22 54 18 60 22 66 C26 70 30 66 30 62',
    ],
    fillPath:
      'M30 52 C30 44 34 40 40 40 H68 C74 40 78 44 78 50 V66 C78 80 68 88 54 88 H46 C34 88 26 80 26 68 Z',
  },
  bulb: {
    paths: [
      'M50 14 C66 14 78 26 78 42 C78 52 72 58 66 64 V72 H34 V64 C28 58 22 52 22 42 C22 26 34 14 50 14 Z',
      'M36 78 H64',
      'M38 84 H62',
      'M42 62 C46 52 54 52 58 62',
      'M50 6 V0',
      'M20 22 L14 16',
      'M80 22 L86 16',
    ],
    fillPath:
      'M50 14 C66 14 78 26 78 42 C78 52 72 58 66 64 V72 H34 V64 C28 58 22 52 22 42 C22 26 34 14 50 14 Z',
  },
  lock: {
    paths: [
      'M30 44 V32 C30 20 40 14 50 14 C60 14 70 20 70 32 V44',
      'M24 44 H76 V86 H24 Z',
      'M50 58 C55 58 58 62 58 66 C58 70 55 72 55 74 V78 H45 V74 C45 72 42 70 42 66 C42 62 45 58 50 58 Z',
    ],
    fillPath: 'M24 44 H76 V86 H24 Z',
  },
  chart: {
    paths: [
      'M16 16 V84 H88',
      'M20 30 L34 44 L46 38 L58 58 L70 54 L84 74',
      'M84 74 L73 72',
      'M84 74 L82 63',
    ],
  },
  toggle: {
    paths: [
      'M18 32 H82 C90 32 94 37 94 44 C94 51 90 56 82 56 H18 C10 56 6 51 6 44 C6 37 10 32 18 32 Z',
      'M74 36 C79 36 83 40 83 44 C83 48 79 52 74 52 C69 52 65 48 65 44 C65 40 69 36 74 36 Z',
      'M20 44 H40',
    ],
    fillPath:
      'M18 32 H82 C90 32 94 37 94 44 C94 51 90 56 82 56 H18 C10 56 6 51 6 44 C6 37 10 32 18 32 Z',
  },
  chair: {
    paths: [
      'M24 54 H76',
      'M28 54 V22 H72 V54',
      'M28 54 V84',
      'M72 54 V84',
      'M24 54 C24 60 30 62 34 62 H70 C76 62 78 58 76 54',
    ],
  },
  lamp: {
    paths: [
      'M28 18 H72 L84 48 H16 Z',
      'M50 48 V82',
      'M32 88 H68 C68 84 60 82 50 82 C40 82 32 84 32 88 Z',
      'M50 8 V2',
      'M20 12 L14 6',
      'M80 12 L86 6',
    ],
    fillPath: 'M28 18 H72 L84 48 H16 Z',
  },
  token: {
    paths: [
      'M50 12 L82 30 V68 L50 86 L18 68 V30 Z',
      'M50 30 L68 40 V60 L50 70 L32 60 V40 Z',
      'M42 50 L48 56 L60 42',
    ],
    fillPath: 'M50 12 L82 30 V68 L50 86 L18 68 V30 Z',
  },
  gate: {
    paths: [
      'M16 88 V32 H84 V88',
      'M16 32 C24 22 32 18 50 18 C68 18 76 22 84 32',
      'M30 34 V88',
      'M50 34 V88',
      'M70 34 V88',
      'M8 88 H92',
      'M16 56 H84',
    ],
  },
  guard: {
    paths: [
      'M50 16 C56 16 60 21 60 27 C60 33 56 37 50 37 C44 37 40 33 40 27 C40 21 44 16 50 16 Z',
      'M32 88 V62 C32 52 40 46 50 46 C60 46 68 52 68 62 V88',
      'M50 46 V64',
      'M38 64 H62',
      'M68 42 C74 40 78 34 77 28',
    ],
    fillPath: 'M32 88 V62 C32 52 40 46 50 46 C60 46 68 52 68 62 V88 Z',
    dots: [{x: 77, y: 26, r: 3.4}],
  },
  briefcase: {
    paths: [
      'M12 40 H88 V84 H12 Z',
      'M38 40 V30 C38 26 41 24 45 24 H55 C59 24 62 26 62 30 V40',
      'M12 56 H88',
      'M44 56 H56 V66 H44 Z',
    ],
    fillPath: 'M12 40 H88 V84 H12 Z',
  },
  bank: {
    paths: [
      'M50 12 L90 34 H10 Z',
      'M18 38 V72',
      'M38 38 V72',
      'M62 38 V72',
      'M82 38 V72',
      'M10 72 H90',
      'M10 72 V88 H90 V72',
    ],
    fillPath: 'M50 12 L90 34 H10 Z',
    dots: [
      {x: 28, y: 84, r: 2.6},
      {x: 50, y: 84, r: 2.6},
      {x: 72, y: 84, r: 2.6},
    ],
  },
  building: {
    paths: [
      'M26 90 V14 H74 V90',
      'M8 90 H92',
      'M38 26 H46 V36 H38 Z',
      'M54 26 H62 V36 H54 Z',
      'M38 46 H46 V56 H38 Z',
      'M54 46 H62 V56 H54 Z',
      'M38 66 H46 V76 H38 Z',
      'M54 66 H62 V76 H54 Z',
    ],
    fillPath: 'M26 90 V14 H74 V90 Z',
  },
  phone: {
    paths: [
      'M32 8 H68 C72 8 74 11 74 15 V85 C74 89 72 92 68 92 H32 C28 92 26 89 26 85 V15 C26 11 28 8 32 8 Z',
      'M42 16 H58',
      'M34 26 H66 V74 H34 Z',
      'M44 84 H56',
    ],
    fillPath: 'M32 8 H68 C72 8 74 11 74 15 V85 C74 89 72 92 68 92 H32 C28 92 26 89 26 85 V15 C26 11 28 8 32 8 Z',
  },
};

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export const Glyph: React.FC<{
  name: GlyphName;
  color: string;
  accent: string;
  progress: number;
  size?: number;
  strokeWidth?: number;
}> = ({name, color, accent, progress, size = 220, strokeWidth = 3}) => {
  const spec = GLYPHS[name];
  const n = spec.paths.length;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{overflow: 'visible', display: 'block'}}
    >
      {spec.fillPath ? (
        <path
          d={spec.fillPath}
          fill={color}
          opacity={0.14 * clamp01((progress - 0.5) / 0.5)}
        />
      ) : null}

      {spec.paths.map((d, i) => {
        const local = clamp01((progress * (1 + 0.28 * (n - 1)) - 0.28 * i));
        const dash = evolvePath(local, d);
        return (
          <path
            key={`${name}-p-${i}`}
            d={d}
            fill="none"
            stroke={i === 0 ? color : accent}
            strokeWidth={i === 0 ? strokeWidth : strokeWidth * 0.72}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dash.strokeDasharray}
            strokeDashoffset={dash.strokeDashoffset}
          />
        );
      })}

      {spec.dots?.map((dot, i) => (
        <circle
          key={`${name}-d-${i}`}
          cx={dot.x}
          cy={dot.y}
          r={dot.r}
          fill={accent}
          opacity={clamp01((progress - 0.5) / 0.5)}
        />
      ))}
    </svg>
  );
};

export {GLYPHS};
