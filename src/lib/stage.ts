/**
 * Shared stage geometry for the 1920×1080 frame.
 *
 * Text cards live in the middle band. The floating balance owns the heads,
 * the caption strip owns the bottom, and the act title owns the 2.5s of
 * silence before a chapter's voice. Nothing in here is allowed to sit in
 * two of those places at once, or to hang off the frame.
 */

export const STAGE_W = 1920;
export const STAGE_H = 1080;

/** Matches ACT_TITLE_FRAMES in ActTitle.tsx (150 frames at 60fps). */
export const ACT_TITLE_SEC = 2.5;

export const TITLE_ACTS = new Set(['act1', 'act2', 'act3', 'act4', 'act5', 'act6', 'act7']);

/**
 * "The first 24 hours" is spoken at the end of the rule. The chapter card
 * starts on that phrase and holds through the silence that follows.
 */
export const ACT1_TITLE_AT = 108.75;

export function titleSpan(act: {
  id: string;
  start: number;
  chapterPause?: number;
}): {from: number; to: number} | null {
  if (!TITLE_ACTS.has(act.id)) return null;
  const pause = act.chapterPause ?? ACT_TITLE_SEC;
  const to = act.start + pause;
  const from = act.id === 'act1' ? Math.min(ACT1_TITLE_AT, act.start) : act.start;
  return {from, to};
}

/**
 * A card holds fully opaque after its beat, then eases out.
 * Cutting opacity across the last fifth of a second reads as a flash.
 */
export const EXIT_LAG = 0.5;
export const EXIT_EASE = 0.85;
export const OVERLAY_TAIL = EXIT_LAG + EXIT_EASE;

/** Text overlays are 30% larger than the previous cut. */
export const TEXT_SCALE = 1.3;

export interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

export function intersects(a: Box, b: Box): boolean {
  return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
}

/** 1 through the beat and the hold, then an ease-out to 0. */
export function linger(time: number, end: number): number {
  const tail = time - end;
  if (tail <= EXIT_LAG) return 1;
  const p = (tail - EXIT_LAG) / EXIT_EASE;
  if (p >= 1) return 0;
  const eased = 1 - Math.pow(1 - p, 3);
  return 1 - eased;
}

const NOIR = new Set(['act4', 'act5']);

/** True when the scope bars are on, so chips and cards clear them. */
export function letterboxed(actId: string): boolean {
  return NOIR.has(actId);
}

/**
 * Visual rectangle of a centered text card after the 30% scale.
 * Generous on purpose: a chip that crosses the card is hidden whole,
 * rather than sliced by the card's edge.
 */
export function textCardRect(kind: string): Box {
  const cx = STAGE_W / 2;
  const cy = 500;
  // A scrap sits low, just above the caption strip, as if it were passed under the table.
  if (kind === 'note') return {l: cx - 340, t: 630, r: cx + 340, b: 870};
  // A ticker is a tape under the scope bar, not a card over the heads.
  if (kind === 'chart') return {l: 220, t: 120, r: 1700, b: 340};
  const size: Record<string, [number, number]> = {
    glyph: [680, 740],
    receipt: [620, 720],
    slam: [1760, 620],
    split: [1720, 680],
    drag: [1720, 720],
    morph: [780, 800],
    stock: [840, 720],
  };
  const [w, h] = size[kind] ?? [960, 560];
  return {l: cx - w / 2, t: cy - h / 2, r: cx + w / 2, b: cy + h / 2};
}

/**
 * The three owners of the window, laid in a row and left there.
 * Same idea as the print pile: the rectangle is the whole set, not one token.
 */
export function tokenVisualRect(): Box {
  return {l: 420, t: 140, r: 1500, b: 560};
}

/** The bodyguard / gate / lawyer prints. Same numbers PhotoStack renders. */
export const STACK_W = 760;
export const STACK_IMG = 400;
export const STACK_TOP = 136;
export const STACK_CHROME = 132;

export const STACK_FAN: Array<{x: number; y: number; r: number}> = [
  {x: -42, y: -22, r: -3.1},
  {x: 46, y: -10, r: 3.4},
  {x: 0, y: 12, r: -1.2},
  {x: 20, y: 20, r: 1.8},
];

export function stackVisualRect(): Box {
  const left = (STAGE_W - STACK_W) / 2;
  const minX = Math.min(...STACK_FAN.map((f) => f.x));
  const maxX = Math.max(...STACK_FAN.map((f) => f.x));
  const minY = Math.min(...STACK_FAN.map((f) => f.y));
  const maxY = Math.max(...STACK_FAN.map((f) => f.y));
  const h = STACK_IMG + STACK_CHROME;
  return {
    l: left + minX - 16,
    t: STACK_TOP + minY - 16,
    r: left + STACK_W + maxX + 16,
    b: STACK_TOP + h + maxY + 20,
  };
}

/**
 * Where a balance chip actually paints, and how far to nudge it so the
 * whole scrap — not just its anchor — stays inside the frame.
 */
export function placeChip(opts: {
  text: string;
  k: number;
  xPct: number;
  yPct: number;
  letterbox: boolean;
  label: boolean;
}): {dx: number; dy: number; box: Box} {
  const {text, k, xPct, yPct, letterbox, label} = opts;
  const fontSize = 36 * k;
  const w = text.length * fontSize * 0.56 + 36 * k;
  const h = fontSize * 1.15 + (label ? 18 * k : 0) + 24 * k + 24 * k * 0.62;
  const cx = (xPct / 100) * STAGE_W;
  const ay = (yPct / 100) * STAGE_H;
  const box: Box = {l: cx - w / 2, t: ay - h, r: cx + w / 2, b: ay + 8};

  const side = 16;
  const top = letterbox ? 120 : 16;
  const bot = letterbox ? STAGE_H - 120 : STAGE_H - 16;
  let dx = 0;
  let dy = 0;
  if (box.l < side) dx = side - box.l;
  if (box.r + dx > STAGE_W - side) dx = STAGE_W - side - box.r;
  if (box.t + dy < top) dy = top - box.t;
  if (box.b + dy > bot) dy = bot - box.b;

  return {
    dx,
    dy,
    box: {l: box.l + dx, t: box.t + dy, r: box.r + dx, b: box.b + dy},
  };
}
