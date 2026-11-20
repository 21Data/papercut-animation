import type {Act, Shot} from './data';

/**
 * Where a caption is allowed to sit, and how big it is allowed to be.
 *
 * The strip sits in one place for the whole film: horizontally centred, low
 * enough to clear the heads, still enough that the line does not dance.
 */

export interface Placement {
  /** Centre of the strip, percent of frame width. */
  x: number;
  /** Centre of the strip, percent of frame height. */
  y: number;
  scale: number;
}

export interface CaptionSkin {
  paper: string;
  ink: string;
  accent: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

/** Relative luminance, 0..1. Used to decide if the scene is a light one. */
export function luminance(hex: string): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const ch = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`.toUpperCase();
}

function contrast(a: string, b: string): number {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The strip is cardstock, so it takes the act's temperature. A light scene
 * (the gallery white act) inverts to ink so the word still reads as paper
 * pressed onto the frame rather than a sticker floating over it.
 * A little of the act accent tints the stock, so the fill follows the scene.
 */
export function skinFor(act: Act | undefined): CaptionSkin {
  const bg = act?.color.bg ?? '#1A1614';
  const accent = act?.color.accent ?? '#C9BFA8';
  const temp = act?.color.temp;

  if (luminance(bg) > 0.55) {
    return {paper: mixHex('#1A1A1A', accent, 0.14), ink: '#F4F1EA', accent};
  }
  const base = temp === 'cold' ? '#E4E7E6' : temp === 'hot' ? '#F2E4CC' : '#EDE6D6';
  const ink = temp === 'hot' ? '#1A0F0B' : temp === 'cold' ? '#14161A' : '#12100E';
  return {paper: mixHex(base, accent, 0.1), ink, accent};
}

/**
 * The spoken word changes colour, and that colour has to clear the cardstock
 * it is printed on. A bright accent on a bright act (gold on cream) is pushed
 * toward the dark; a dark accent on a dark card is pushed toward the light.
 */
export function emphasisFor(paper: string, ink: string, accent: string): string {
  const toward = luminance(paper) > 0.45 ? '#160E08' : '#FFF6E6';
  const candidates = [accent, mixHex(accent, toward, 0.42), mixHex(accent, toward, 0.68)];
  let best = luminance(paper) > 0.45 ? '#7A1F14' : '#F3E2A2';
  let bestScore = 2.4;
  for (const c of candidates) {
    const onPaper = contrast(c, paper);
    const onInk = contrast(c, ink);
    if (onPaper < 2.4 || onInk < 1.45) continue;
    const score = onPaper + onInk * 0.35;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/**
 * One caption position for the whole film. `index` is kept so callers do not
 * have to change; the strip no longer walks with it.
 */
export function placementFor(
  shot: Shot | undefined,
  wordCount: number,
  _index: number,
): Placement {
  const density = shot?.hudAnchors.length ?? 0;
  // A crowd of chips owns the middle. The line stays centred and steps down.
  const y = density >= 8 ? 90 : 84;
  const scale = wordCount > 6 ? 0.86 : 0.94;
  return {x: 50, y, scale};
}
