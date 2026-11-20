import type {Act, HudAnchor, Shot} from './data';
import {luminance} from './composition';
import {phrasesIn} from './phrases';
import {ACT_TITLE_SEC, OVERLAY_TAIL, TITLE_ACTS, linger} from './stage';

/**
 * Presentation layer.
 *
 * The cold open is a number over a face. By Act II the film is an essay, and an
 * essay cannot be a slideshow of plates. Long shots get a second voice: a paper
 * card, a drawn glyph, a split, a dragged panel, a receipt, a chart. Every cue
 * starts on a spoken phrase so the graphic lands with the narration, never on a
 * grid.
 *
 * The plates are paper. The overlays are the art director's board laid over the
 * paper: cream stock, ink, tape, torn edges. Motion is 60fps and confident,
 * except the receipt, which is paper and runs on the 12fps clock.
 */

export type OverlayKind =
  | 'slam'
  | 'note'
  | 'glyph'
  | 'stock'
  | 'split'
  | 'drag'
  | 'receipt'
  | 'chart'
  | 'morph';

export type OverlayIntensity = 'annotation' | 'card' | 'takeover';

export type GlyphName =
  | 'coin'
  | 'receipt'
  | 'eye'
  | 'house'
  | 'car'
  | 'watch'
  | 'scale'
  | 'bubble'
  | 'hand'
  | 'bulb'
  | 'lock'
  | 'chart'
  | 'toggle'
  | 'chair'
  | 'lamp'
  | 'token'
  | 'gate'
  | 'guard'
  | 'briefcase'
  | 'bank'
  | 'building'
  | 'phone';

export interface OverlayValue {
  label: string;
  value: string;
}

export interface OverlayCue {
  kind: OverlayKind;
  intensity: OverlayIntensity;
  /** Seconds from the start of the shot. */
  start: number;
  end: number;
  kicker: string;
  title: string;
  copy?: string;
  glyph: GlyphName;
  asset?: string;
  /** object-position for the asset, when the default crop would cut the subject. */
  focus?: string;
  values: OverlayValue[];
  align: 'left' | 'right';
  seed: number;
  replacesCaptions: boolean;
  /**
   * Act-relative second this card must land on, when the shot is too short
   * to hold the entrance and the exit. The print pile and the owner tokens
   * read this and ignore the clamped cue window.
   */
  mark?: number;
}

export interface OverlayPalette {
  paper: string;
  ink: string;
  accent: string;
  meta: string;
  scrim: string;
}

const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);
const clamp01 = (t: number) => clamp(t, 0, 1);
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

const money = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 100_000) return `${sign}$${Math.round(abs / 1000)}K`;
  return `${sign}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const valueOf = (a: HudAnchor) =>
  a.fmt === 'count' ? a.v.toLocaleString('en-US') : money(a.v);

const KICKER: Record<string, string> = {
  cold_open: 'COLD OPEN',
  rule: 'THE RULE',
  act1: '01 — THE FIRST 24 HOURS',
  act2: '02 — THE ETIQUETTE COLLAPSE',
  act3: '03 — RELATIONSHIPS RE-SORT',
  act4: '04 — THE MARKET TURNS',
  act5: "05 — PREDATOR'S MARKET",
  act6: '06 — WE DID THIS ALREADY',
  act7: '07 — THE OPT-IN',
  close: 'CLOSE',
};

export function overlayPalette(act: Act): OverlayPalette {
  switch (act.id) {
    case 'cold_open':
      return {paper: '#EDE4D2', ink: '#171310', accent: '#C9913D', meta: '#6B5A3E', scrim: '#120F0C'};
    case 'rule':
      return {paper: '#E6DDC6', ink: '#23262B', accent: '#3D4A5C', meta: '#6A6250', scrim: '#B7A98C'};
    case 'act1':
      return {paper: '#E8E5DD', ink: '#191B1E', accent: '#6B7280', meta: '#5E646C', scrim: '#4C525A'};
    case 'act2':
      return {paper: '#E4DCE6', ink: '#1A151E', accent: '#7C6B85', meta: '#5F5169', scrim: '#312637'};
    case 'act3':
      return {paper: '#DED9E2', ink: '#1A161F', accent: '#5B4B6B', meta: '#584A64', scrim: '#211D29'};
    case 'act4':
      return {paper: '#E7D8D3', ink: '#17110F', accent: '#8B1E1E', meta: '#6B3A34', scrim: '#131113'};
    case 'act5':
      return {paper: '#141416', ink: '#FDE047', accent: '#FDE047', meta: '#8C7B33', scrim: '#0B0B0D'};
    case 'act6':
      // The gallery stays white. The cards are the other stock: black, with one red accent.
      return {paper: '#121214', ink: '#F4F1EA', accent: '#C4232A', meta: '#E7B4B4', scrim: '#F4F1EA'};
    case 'act7':
      return {paper: '#1B1E1C', ink: '#EAF5EE', accent: '#4ADE80', meta: '#7E9B88', scrim: '#161817'};
    default:
      return {paper: '#EADFCB', ink: '#1A1310', accent: '#C9913D', meta: '#6B5A3E', scrim: '#15120F'};
  }
}

const GLYPH_RULES: Array<[RegExp, GlyphName]> = [
  [/receipt|bill|arithmetic|cost|rent|price|statement|fee/i, 'receipt'],
  [/scale|weigh|balance|tier|sorted/i, 'scale'],
  [/watch/i, 'watch'],
  [/sportscar|\bcar\b|\bcoat\b|accessor|status made/i, 'car'],
  [/bodyguard|guard/i, 'guard'],
  [/lawyer|attorney|counsel|contract|brief\b/i, 'briefcase'],
  [/\bgates?\b|wrought|driveway/i, 'gate'],
  [/bank|deposit|ledger|lender/i, 'bank'],
  [/employer|payroll|salary|company|office\b/i, 'building'],
  [/platform|\bfeed\b|\bapp\b|\bpost\b|scroll/i, 'phone'],
  [/lock|shutter|denied|blocked|entrance|tower|employer|vault/i, 'lock'],
  [/bubble|lie|says?\b|speak|phone|gloss|smile/i, 'bubble'],
  [/hand|hold\b|rests|touch|finger/i, 'hand'],
  [/bulb|idea|light|glow|lamp|candle/i, 'bulb'],
  [/toggle|switch|opt-in|opt in|yes\b/i, 'toggle'],
  [/eye|look|seen|read\b|scanner|x-ray|heads? turn|gaze|stare/i, 'eye'],
  [/market|chart|crash|tank|descend|flicker|number|board|counter|drop/i, 'chart'],
  [/\bhouse|home|street|door|room|apartment|dollhouse|window|lawn/i, 'house'],
  [/crowd|queue|wait|line\b|chair|table|huddle|diner/i, 'chair'],
  [/token|migration|cross|rug|party|dot\b/i, 'token'],
  [/coin|money|dollar|balance|\$/i, 'coin'],
];

function glyphFor(note: string): GlyphName {
  for (const [re, name] of GLYPH_RULES) if (re.test(note)) return name;
  return 'coin';
}

function labelsFor(note: string): [string, string] {
  const cleaned = note
    .replace(/^split[: -]*/i, '')
    .replace(/^50\/50\s*/i, '')
    .replace(/[^a-zA-Z0-9$/ ]+/g, ' ')
    .trim();
  const parts = cleaned
    .split(/\s+(?:vs\.?|versus|against)\s+|\s*\/\s*|\s+-\s+/i)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
  return parts.length >= 2 ? [parts[0], parts[1]] : ['PERCEIVED', 'ACTUAL'];
}

function valuesFor(shot: Shot): OverlayValue[] {
  return shot.hudAnchors.map((a, i) => ({
    label:
      a.label ??
      (a.fmt === 'count' ? 'COUNT' : `ACCOUNT ${String(i + 1).padStart(2, '0')}`),
    value: valueOf(a),
  }));
}

function seriesFor(shot: Shot): number[] {
  const anchors = shot.hudAnchors;
  if (anchors.length >= 3) {
    return [...anchors].sort((a, b) => a.x - b.x).map((a) => a.v);
  }
  const base = anchors[0]?.v ?? 12480;
  const seed = shot.globalIndex * 1.37;
  const down = base * 0.28;
  return Array.from({length: 9}, (_, i) => {
    const p = i / 8;
    const jitter = Math.sin(seed + i * 2.1) * Math.abs(base) * 0.035;
    return base + (down - base) * Math.pow(p, 1.35) + jitter;
  });
}

function assetFor(shot: Shot, act: Act, seed: number): string {
  const pool = act.shots.map((s) => s.assetPath).filter((p) => p !== shot.assetPath);
  if (pool.length === 0) return shot.assetPath;
  return pool[Math.abs(seed) % pool.length];
}

const CURATED: Record<string, OverlayKind> = {
  'act6:6': 'stock',
  'act6:7': 'split',
  'act7:4': 'split',
};

interface Pin {
  /** Act-relative seconds. Omit to attach to whatever the planner placed first. */
  at?: number;
  kind?: OverlayKind;
  glyph?: GlyphName;
  title?: string;
  /** A plate drawn for this beat, instead of one picked from the act's pool. */
  asset?: string;
  focus?: string;
  /** Seconds the card holds. Only for shots carrying more than one pinned plate. */
  len?: number;
}

/**
 * Cues the narration demands and the heuristic cannot find on its own.
 *
 * Act V is where the film stops describing a number and starts naming who
 * reads it: the bodyguards, then the gates, then the three parties who own the
 * window. Those lines fall on shots that are three or four seconds long, which
 * the generic planner leaves bare, so the pin states what must land, on which
 * glyph, and at the second the voiceover says it.
 */
/** Pins keyed by `actId:shotIndex` so they survive a shotlist rebuild. */
const PINNED: Record<string, Pin[]> = {
  'act4:7': [{at: 110.1, kind: 'morph', glyph: 'coin', len: 2.5}],

  // Bodyguards, then gates, then lawyers. The prints land on the noun and stay piled.
  'act5:3': [
    {
      at: 28.945,
      kind: 'stock',
      glyph: 'guard',
      asset: 'overlay/rich-bodyguards.jpg',
      title: 'Bodyguards',
      len: 2.2,
    },
    {
      at: 30.625,
      kind: 'stock',
      glyph: 'gate',
      asset: 'overlay/rich-gates.jpg',
      title: 'Gates',
      len: 2.2,
    },
    {
      at: 31.275,
      kind: 'stock',
      glyph: 'briefcase',
      asset: 'overlay/rich-lawyers.jpg',
      title: 'Lawyers',
      len: 6,
    },
  ],
  'act5:5': [
    {at: 52.2, kind: 'glyph', glyph: 'building', asset: 'token/building', title: 'Employer'},
  ],
  'act5:6': [{at: 54.64, kind: 'glyph', glyph: 'bank', asset: 'token/bank', title: 'Bank'}],
  'act5:7': [{at: 56.68, kind: 'glyph', glyph: 'phone', asset: 'token/phone', title: 'Platform'}],

  'act6:1': [{at: 2.7, kind: 'morph', glyph: 'receipt', len: 2.5}],
  'act6:3': [{at: 11.7, kind: 'glyph', glyph: 'phone', title: 'A balance you choose to display'}],
  'act6:4': [{at: 16.7, kind: 'glyph', glyph: 'phone', title: 'The holiday, the dinner, the car'}],
  'act6:6': [{kind: 'split'}],
  'act6:7': [{at: 26.2, kind: 'stock'}],
  'act6:8': [{kind: 'glyph', glyph: 'phone', title: 'The number people already publish'}],
  'act6:11': [{kind: 'glyph', glyph: 'phone', title: 'A number, posted'}],
  'act6:12': [{kind: 'glyph', glyph: 'phone', title: 'The feed is already a balance'}],
};

function pinsFor(shot: Shot, act: Act): Pin[] | undefined {
  return PINNED[`${act.id}:${shot.index}`];
}

function kindFor(note: string, values: OverlayValue[], seed: number): OverlayKind {
  if (/split|vs\.?|versus|triptych|perceived|actual|relief|debt|packing.*phon|wealth \/ huddle/i.test(note)) {
    return values.length >= 2 ? 'split' : 'glyph';
  }
  // A chart is never chosen from a note. Act IV pins the one ticker, on the market.
  // A morph is never chosen from a note. The film morphs twice, both pinned.
  if (/receipt|bill|arithmetic|cost|statement|counter/i.test(note)) return 'receipt';
  if (/phone|screen|scroll|swipe|drag|toggle|switch|opt/i.test(note)) return 'drag';
  if (/macro|wish|hope|idea|light|glow|breathes|silence|hold/i.test(note)) return 'glyph';
  if (seed % 4 === 0) return 'stock';
  if (seed % 4 === 1) return 'glyph';
  return 'slam';
}

function intensityFor(shot: Shot, index: number, density: number): OverlayIntensity {
  const d = shot.duration;
  let level: OverlayIntensity;
  if (index === 0) level = d >= 7.2 ? 'takeover' : d >= 5.4 ? 'card' : 'annotation';
  else if (index === 1) level = d >= 9 ? 'card' : 'annotation';
  else level = 'annotation';

  // A frame already carrying twelve floating numbers is not an empty canvas.
  if (density >= 12 && level === 'takeover') level = 'card';
  if (density >= 9 && level !== 'annotation') level = index === 0 ? 'card' : 'annotation';
  return level;
}

function cueCount(shot: Shot): number {
  const density = shot.hudAnchors.length;
  if (density >= 12) return shot.duration >= 7 ? 2 : 1;
  if (shot.duration >= 9.2) return 3;
  if (shot.duration >= 6.4) return 2;
  return 1;
}

const TARGETS: Record<number, number[]> = {
  1: [0.38],
  2: [0.2, 0.64],
  3: [0.16, 0.46, 0.76],
};

/** Seconds from the shot start before a card may enter. The title owns that window. */
function titleClearance(shot: Shot, act: Act): number {
  if (!TITLE_ACTS.has(act.id)) return 0;
  return Math.max(0, ACT_TITLE_SEC - (shot.start - act.start));
}

/**
 * Every card finishes its hold and its ease before the shot unmounts it.
 * A tail that runs past the cut is a flash: the component is simply gone.
 */
function settle(cues: OverlayCue[], shot: Shot, act: Act): OverlayCue[] {
  // A shot too short to hold and ease a card still squeezes something in when
  // a pin demands it: the word must not play over a bare frame. The tail is
  // what gives way, not the card.
  const pinned = pinsFor(shot, act)?.length ?? 0;
  const limit =
    pinned > 0
      ? Math.max(shot.duration - 0.1, 0.9)
      : shot.duration - OVERLAY_TAIL;
  if (limit < 0.55) return [];
  const kept: OverlayCue[] = [];
  for (const c of cues) {
    let start = c.start;
    // A beat that lands too late to ease out is pulled forward, not dropped.
    if (start > limit - 0.45) start = Math.max(0.16, limit - 0.65);
    let end = Math.min(c.end, limit);
    if (end < start + 0.45) end = Math.min(limit, start + 0.45);
    if (end > limit || end < start + 0.4) continue;
    c.start = start;
    c.end = end;
    kept.push(c);
  }
  kept.sort((a, b) => a.start - b.start);
  for (let i = 1; i < kept.length; i++) {
    const prev = kept[i - 1];
    if (prev.end > kept[i].start - 0.08) {
      prev.end = Math.max(prev.start + 0.4, kept[i].start - 0.08);
    }
  }
  return kept.filter((c) => c.end >= c.start + 0.4 && c.end <= limit + 0.001);
}

/**
 * Land the pinned cues on the words they belong to.
 *
 * A pin is anchored to the act's clock rather than to a cue index, because the
 * planner snaps cues to spoken phrases and the number of them a shot gets
 * depends on its length. If the planner already put a cue near the pinned
 * second it is retyped in place; if the shot was too short to earn one, the
 * cue is built here so the line is never spoken over a bare frame.
 */
function applyPins(cues: OverlayCue[], shot: Shot, act: Act): void {
  const pins = pinsFor(shot, act);
  if (!pins) return;

  const shotActRel = shot.start - act.start;
  const clearance = titleClearance(shot, act);
  const claimed = new Set<OverlayCue>();

  for (const pin of pins) {
    const target = pin.at === undefined ? null : pin.at - shotActRel;

    let cue: OverlayCue | undefined;
    if (target === null) {
      cue = cues[0];
    } else {
      let bestD = Infinity;
      for (const c of cues) {
        const d = Math.abs(c.start - target);
        if (d < bestD) {
          bestD = d;
          cue = c;
        }
      }
      // A second pin on this shot is a second card. Reusing the first one
      // dropped "gates" the moment "lawyers" was named.
      if (cue && (bestD > 0.55 || claimed.has(cue))) cue = undefined;
    }

    if (!cue) {
      const at = clamp(
        target ?? shot.duration * 0.32,
        Math.max(0.3, clearance + 0.12),
        Math.max(0.3, shot.duration - OVERLAY_TAIL - 0.4),
      );
      const len = Math.min(pin.len ?? 2.4, shot.duration - at - 0.12);
      if (len < 0.9) continue;
      cue = {
        kind: pin.kind ?? 'glyph',
        intensity: 'card',
        start: at,
        end: at + len,
        kicker: KICKER[act.id] ?? act.title,
        title: pin.title ?? shot.note,
        glyph: pin.glyph ?? glyphFor(shot.note),
        asset: pin.asset ?? assetFor(shot, act, shot.globalIndex * 97),
        focus: pin.focus,
        values: valuesFor(shot),
        align: shot.globalIndex % 2 === 0 ? 'left' : 'right',
        seed: shot.globalIndex * 97,
        replacesCaptions: true,
      };
      cues.push(cue);
    }

    // A pin that names its own plate is a deliberate placement, so it moves the
    // cue onto the word instead of inheriting whatever beat the planner chose.
    if (pin.asset && target !== null) {
      cue.start = clamp(
        Math.max(target, clearance + 0.12),
        0.3,
        Math.max(0.3, shot.duration - OVERLAY_TAIL - 0.4),
      );
    }

    const wantsSplit = pin.kind === 'split' && cue.values.length >= 2;
    if (pin.kind) cue.kind = pin.kind === 'split' && !wantsSplit ? 'glyph' : pin.kind;
    if (cue.kind === 'stock' && act.shots.length < 2) cue.kind = 'glyph';
    if (pin.glyph) cue.glyph = pin.glyph;
    if (pin.asset) cue.asset = pin.asset;
    if (pin.focus) cue.focus = pin.focus;
    if (pin.title) cue.title = pin.title;
    // Prints and owner-tokens outlive the shot. The mark is the spoken second,
    // and the pile uses it even when the shot is too short to ease the card out.
    if (pin.at !== undefined && pin.asset && (pin.asset.startsWith('token/') || pin.asset.startsWith('overlay/'))) {
      cue.mark = pin.at;
    }
    if (pin.len) {
      cue.end = Math.max(cue.start + 0.8, cue.start + Math.min(pin.len, shot.duration - cue.start - 0.1));
    }
    if (cue.intensity === 'annotation') cue.intensity = 'card';
    cue.replacesCaptions = true;
    claimed.add(cue);
  }

  cues.sort((a, b) => a.start - b.start);
  // Two cards may never share a cue window; the earlier one yields to the later.
  // The print pile still keeps every sheet — yielding only ends the beat, it
  // does not take the paper off the stack.
  for (let i = 1; i < cues.length; i++) {
    const prev = cues[i - 1];
    if (prev.end > cues[i].start - 0.1) {
      prev.end = Math.max(prev.start + 0.8, cues[i].start - 0.1);
    }
  }
}

function preferHeld(cues: OverlayCue[]): OverlayCue[] {
  const held = cues.filter(
    (c) => c.asset?.startsWith('overlay/') || c.asset?.startsWith('token/'),
  );
  return held.length > 0 ? held : cues;
}

function billCue(shot: Shot): OverlayCue {
  // "the bill arrives" is spoken at 2.46s. The check opens on that word.
  const start = 2.35;
  return {
    kind: 'receipt',
    intensity: 'card',
    start,
    end: Math.max(start + 1.2, shot.duration - OVERLAY_TAIL - 0.05),
    kicker: '',
    title: '',
    glyph: 'receipt',
    values: [],
    align: 'right',
    seed: shot.globalIndex,
    replacesCaptions: true,
  };
}

function dayCue(shot: Shot): OverlayCue {
  // "For about a day" is 28.30s. Shot 8 starts at 27.60s.
  const start = 0.62;
  return {
    kind: 'glyph',
    intensity: 'card',
    start,
    end: Math.max(start + 1.2, shot.duration - OVERLAY_TAIL - 0.05),
    kicker: 'A NOVELTY',
    title: 'One day',
    glyph: 'watch',
    values: [],
    align: 'left',
    seed: shot.globalIndex,
    replacesCaptions: true,
  };
}

function plan(shot: Shot, act: Act): OverlayCue[] {
  // A three-second shot still has a spoken line over it. Cutting every shot
  // under four seconds left the back half of the film's most quotable lines
  // with nothing on the frame at all. A pinned shot always earns its cue, even
  // below the floor — the pin is a word that must not play over a bare frame.
  if (shot.blank || (shot.duration < 2.6 && !pinsFor(shot, act))) return [];

  // These plates are the graphic. A second card on top of them is the wrong voice.
  if (shot.assetHandle === 'status_flat' || shot.assetHandle === 'three_choices') return [];
  if (act.id === 'rule' && shot.note.startsWith('compared by')) return [];
  if (act.id === 'close' && shot.index === 1) return [];
  if (act.id === 'act7') return [];

  if (act.id === 'act4') {
    const pinned: OverlayCue[] = [];
    applyPins(pinned, shot, act);
    return settle(preferHeld(pinned), shot, act);
  }

  // The guest check belongs to the opening plate, on "the bill arrives".
  if (act.id === 'cold_open' && shot.assetHandle === 'bill' && shot.index === 1) {
    return settle([billCue(shot)], shot, act);
  }

  // The same plate returns under "for about a day". That beat is a watch, not the check.
  if (act.id === 'cold_open' && shot.assetHandle === 'bill' && shot.index === 8) {
    return settle([dayCue(shot)], shot, act);
  }

  // The balance is part of the still. A card laid over the same heads covers
  // the number and fights the plate. Shots that already carry a balance keep
  // only the cues a specific line demands.
  if (shot.hudAnchors.length > 0) {
    const pinned: OverlayCue[] = [];
    applyPins(pinned, shot, act);
    return settle(preferHeld(pinned), shot, act);
  }

  const clearance = titleClearance(shot, act);

  const density = shot.hudAnchors.length;
  const n = cueCount(shot);
  const targets = TARGETS[n];
  const inside = phrasesIn(shot.start + 0.3, shot.end - 0.25)
    .map((p) => ({...p, rel: p.startAbs - shot.start}))
    .filter((p) => p.rel >= 0.3 && p.rel <= shot.duration - 0.4);

  const used = new Set<number>();
  const starts: Array<{rel: number; phrase: (typeof inside)[number] | null}> = [];

  for (const target of targets) {
    const want = shot.duration * target;
    let best = -1;
    let bestDist = Infinity;
    inside.forEach((p, i) => {
      if (used.has(i)) return;
      const dist = Math.abs(p.rel - want);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    if (best >= 0) {
      used.add(best);
      starts.push({rel: inside[best].rel, phrase: inside[best]});
    } else {
      starts.push({rel: clamp(want, 0.45, shot.duration - 1.1), phrase: null});
    }
  }

  starts.sort((a, b) => a.rel - b.rel);

  const cues: OverlayCue[] = [];
  for (let i = 0; i < starts.length; i++) {
    let {rel} = starts[i];
    const {phrase} = starts[i];
    if (rel < clearance + 0.15) rel = clearance + 0.15;
    const nextStart = starts[i + 1]?.rel ?? shot.duration - 0.18;
    const phraseLen = phrase ? phrase.endAbs - phrase.startAbs : 1.9;
    let len = clamp(phraseLen + 0.9, 1.5, 3.0);
    len = Math.min(len, nextStart - rel - 0.15, shot.duration - rel - 0.2);
    if (len < 1.2) {
      // The phrase landed too late in a short shot to hold a card. Place the
      // cue on this slot's beat instead of dropping it: a three-second shot
      // with a spoken line over it should not be left bare.
      rel = clamp(shot.duration * (0.24 + 0.34 * i), 0.3, Math.max(0.3, shot.duration - 1.5));
      len = Math.min(2.2, shot.duration - rel - 0.15);
    }
    if (len < 0.9) continue;

    const intensity = intensityFor(shot, i, density);
    const seed = shot.globalIndex * 97 + i * 13;
    const values = valuesFor(shot);
    let kind: OverlayKind;
    if (intensity === 'annotation') kind = 'note';
    else if (i === 0 && CURATED[`${act.id}:${shot.index}`]) kind = CURATED[`${act.id}:${shot.index}`];
    else kind = kindFor(shot.note, values, seed);

    if (kind === 'split' && values.length < 2) kind = 'glyph';
    if (kind === 'stock' && act.shots.length < 2) kind = 'glyph';
    if (kind === 'chart') kind = 'glyph';
    if (kind === 'morph') kind = 'glyph';

    const title = (phrase?.text ?? shot.note)
      .replace(/\s*[,;:]$/, '')
      .trim();

    // The next spoken thought becomes the supporting line, so a card never
    // speaks copy the voiceover is not already saying.
    const nextPhrase = phrase
      ? inside.find((p) => p.rel > rel + 0.1 && p !== phrase)
      : inside.find((p) => p.rel > rel);

    const [left, right] = labelsFor(shot.note);
    const ordered = [...values].sort((a, b) => (a.value < b.value ? -1 : 1));
    const splitValues =
      values.length >= 2
        ? [
            {label: left, value: ordered[0].value},
            {label: right, value: ordered[ordered.length - 1].value},
          ]
        : values;

    cues.push({
      kind,
      intensity,
      start: rel,
      end: rel + len,
      kicker: KICKER[act.id] ?? act.title,
      title,
      copy: nextPhrase?.text.replace(/\s*[,;:]$/, ''),
      glyph: glyphFor(shot.note),
      asset: assetFor(shot, act, seed),
      values: kind === 'split' ? splitValues : values,
      align: seed % 2 === 0 ? 'left' : 'right',
      seed,
      replacesCaptions: intensity !== 'annotation',
    });
  }

  applyPins(cues, shot, act);
  if (act.id === 'act6') {
    for (const cue of cues) {
      if (cue.asset?.startsWith('token/')) continue;
      if (cue.kind === 'glyph' || cue.kind === 'chart' || cue.kind === 'receipt') {
        cue.kind = 'glyph';
        cue.glyph = 'phone';
      }
    }
  }
  return settle(preferHeld(cues), shot, act);
}

const CACHE = new Map<number, OverlayCue[]>();

export function overlaysForShot(shot: Shot, act: Act): OverlayCue[] {
  const hit = CACHE.get(shot.globalIndex);
  if (hit) return hit;
  const cues = plan(shot, act);
  CACHE.set(shot.globalIndex, cues);
  return cues;
}

export function overlayAt(shot: Shot, act: Act, time: number): OverlayCue | null {
  let best: OverlayCue | null = null;
  for (const c of overlaysForShot(shot, act)) {
    if (time < c.start || time >= c.end + OVERLAY_TAIL) continue;
    if (!best || c.start >= best.start) best = c;
  }
  return best;
}

/** Every card still on screen, including the ones holding and easing out. */
export function visibleOverlays(shot: Shot, act: Act, time: number): OverlayCue[] {
  return overlaysForShot(shot, act).filter((c) => {
    if (isDrawnPlate(c.asset) || c.asset?.startsWith('token/')) return false;
    return time >= c.start && time < c.end + OVERLAY_TAIL;
  });
}

/** How far the plate behind the overlay is thrown out of focus, in px. */
export function overlayBlurAt(shot: Shot, act: Act, time: number): number {
  if (act.id === 'act4') return 0;
  let blur = 0;
  for (const c of overlaysForShot(shot, act)) {
    if (time < c.start || time >= c.end + OVERLAY_TAIL) continue;
    // The plate is expensive art. A light blur is enough to put the card in front.
    const amp = c.intensity === 'takeover' ? 3 : c.intensity === 'card' ? 1.5 : 0;
    if (amp === 0) continue;
    const kIn = smooth((time - c.start) / 0.42);
    const kOut = linger(time, c.end);
    blur = Math.max(blur, amp * Math.min(kIn, kOut));
  }
  const actTime = shot.start - act.start + time;
  const pile = Math.max(stackPresence(act, actTime), tokenPresence(act, actTime));
  if (pile > 0) blur = Math.max(blur, 1.5 * pile);
  return blur;
}

/** How much the plate behind the overlay is dimmed, 0..1. */
export function overlayDimAt(shot: Shot, act: Act, time: number): number {
  if (act.id === 'act4') return 0;
  let dim = 0;
  for (const c of overlaysForShot(shot, act)) {
    if (time < c.start || time >= c.end + OVERLAY_TAIL) continue;
    const amp = c.intensity === 'takeover' ? 0.55 : c.intensity === 'card' ? 0.35 : 0;
    if (amp === 0) continue;
    const kIn = smooth((time - c.start) / 0.42);
    const kOut = linger(time, c.end);
    dim = Math.max(dim, amp * Math.min(kIn, kOut));
  }
  const actTime = shot.start - act.start + time;
  const pile = Math.max(stackPresence(act, actTime), tokenPresence(act, actTime));
  if (pile > 0) dim = Math.max(dim, 0.32 * pile);
  return dim;
}

/** True while an overlay is carrying the words, so the caption strip can cut out. */
export function overlayReplacesCaptions(shot: Shot, act: Act, time: number): boolean {
  const cue = overlayAt(shot, act, time);
  return cue?.replacesCaptions ?? false;
}

/** A pinned plate that outlives the shot it enters on. */
export interface StackCard {
  asset: string;
  focus?: string;
  kicker: string;
  title: string;
  /** Seconds from the start of the act. */
  start: number;
  end: number;
  align: 'left' | 'right';
}

/** Plates drawn for a specific beat live in public/overlay/, not in the act pool. */
const isDrawnPlate = (asset: string | undefined) => !!asset && asset.startsWith('overlay/');

const STACK_CACHE = new Map<string, StackCard[]>();

/**
 * How present the pinned-print pile is, 0..1, on the act clock.
 * The pile outlives any one shot, and the plate under it should ease
 * back with the paper instead of snapping sharp while the prints are still up.
 */
export function stackPresence(act: Act, actTime: number): number {
  const cards = photoStackFor(act);
  if (cards.length === 0) return 0;
  const last = cards[cards.length - 1];
  if (actTime < cards[0].start || actTime >= last.end + OVERLAY_TAIL) return 0;
  const inn = smooth((actTime - cards[0].start) / 0.4);
  return inn * linger(actTime, last.end);
}

const TOKEN_CACHE = new Map<string, StackCard[]>();

/** Employer, bank, platform. They land on the word and leave together. */
export function ownerTokensFor(act: Act): StackCard[] {
  const hit = TOKEN_CACHE.get(act.id);
  if (hit) return hit;
  const out: StackCard[] = [];
  for (const shot of act.shots) {
    const base = shot.start - act.start;
    for (const cue of overlaysForShot(shot, act)) {
      if (!cue.asset?.startsWith('token/')) continue;
      out.push({
        asset: cue.asset,
        focus: cue.focus,
        kicker: '',
        title: cue.title,
        start: cue.mark ?? base + cue.start,
        end: base + cue.end,
        align: cue.align,
      });
    }
  }
  out.sort((a, b) => a.start - b.start);
  if (out.length > 0) {
    const last = out[out.length - 1];
    // A beat after the platform is named, the three leave as one set.
    last.end = Math.max(last.end, last.start + 2.5);
  }
  TOKEN_CACHE.set(act.id, out);
  return out;
}

export function tokenPresence(act: Act, actTime: number): number {
  const cards = ownerTokensFor(act);
  if (cards.length === 0) return 0;
  const last = cards[cards.length - 1];
  if (actTime < cards[0].start || actTime >= last.end + OVERLAY_TAIL) return 0;
  const inn = smooth((actTime - cards[0].start) / 0.4);
  return inn * linger(actTime, last.end);
}

/**
 * The plates a shot cannot animate on its own.
 *
 * A shot sequence unmounts at its cut, so a card that is supposed to slide
 * aside and stay on screen has to be rendered by something that lives as long
 * as the act does. This collects those cards on the act's clock.
 */
export function photoStackFor(act: Act): StackCard[] {
  const hit = STACK_CACHE.get(act.id);
  if (hit) return hit;
  const out: StackCard[] = [];
  for (const shot of act.shots) {
    const base = shot.start - act.start;
    for (const cue of overlaysForShot(shot, act)) {
      if (!isDrawnPlate(cue.asset)) continue;
      const crowd = cue.asset?.includes('rich-crowd');
      const start = cue.mark ?? base + cue.start;
      // The crowd is the accusation. It holds a beat longer than the sheets under it.
      const end = crowd ? start + 1.9 : base + cue.end;
      out.push({
        asset: cue.asset as string,
        focus: cue.focus,
        kicker: '',
        title: cue.title,
        start,
        end,
        align: cue.align,
      });
    }
  }
  out.sort((a, b) => a.start - b.start);
  STACK_CACHE.set(act.id, out);
  return out;
}

export {seriesFor, money, valueOf, smooth, clamp01};
