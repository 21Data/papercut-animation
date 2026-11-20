/**
 * Shot-level cue registry for StackOverlay and CropPopOverlay.
 *
 * These overlays are keyed to `shot.asset` (the image handle) so they survive
 * shotlist rebuilds without needing to know the global index ahead of time.
 *
 * All timing values (`triggerAbs`) are **absolute seconds in the act's VO
 * audio** — the component converts them to frame offsets using `voStart`.
 *
 * voStart values come from build/timeline.json (act.start), which is the
 * composition-time second at which the act's audio begins. The ACT_AUDIO_PAUSES
 * offset in Video.tsx shifts the audio *later*, so the effective origin for
 * converting VO timestamps is:
 *   voStart = act.start + ACT_AUDIO_PAUSES[act.id]
 *
 * These are pre-computed below and embedded as constants so this module has
 * no runtime dependency on the timeline JSON.
 */

import type {StackItem} from '../components/overlays/StackOverlay';
import type {CropItem} from '../components/overlays/CropPopOverlay';

/** act.start values from build/timeline.json */
const ACT_STARTS: Record<string, number> = {
  cold_open: 0.0,
  rule:      44.513,
  act1:      110.472,
  act2:      213.413,
  act3:      374.032,
  act4:      521.198,
  act5:      638.375,
  act6:      712.921,
  act7:      786.5,
  close:     842.708,
};

/** Chapter pause before the voice. Mirrors timeline.json chapterPause. */
const ACT_AUDIO_PAUSES: Record<string, number> = {
  cold_open: 0,
  rule:      0,
  act1:      2.5,
  act2:      2.5,
  act3:      2.5,
  act4:      2.5,
  act5:      2.5,
  act6:      2.5,
  act7:      2.5,
  close:     0,
};

/** voStart = act.start + ACT_AUDIO_PAUSES[act.id] (composition seconds) */
export function voStartFor(actId: string): number {
  return (ACT_STARTS[actId] ?? 0) + (ACT_AUDIO_PAUSES[actId] ?? 0);
}

// ─── COLD OPEN — steak / soup list ─────────────────────────────────────────
//
// VO (relative to cold_open audio): "Who ordered the steak?" at 10.92s,
// "who ordered the soup?" at 12.22s.
// Assets that carry this overlay: 'dinner_wide', 'dinner_side', 'dinner_3shot'
// (whichever is on screen when the words land — the dinner shots run from ~6s).

/** cold_open voStart = 0.0 + 0 = 0.0 */
const COLD_OPEN_VO = voStartFor('cold_open');

export const COLD_OPEN_STACK: StackItem[] = [
  {
    label: 'The Steak',
    sub: 'Who ordered this?',
    triggerAbs: COLD_OPEN_VO + 10.92,
    color: '#C9913D',
  },
  {
    label: 'The Soup',
    sub: 'Who ordered this?',
    triggerAbs: COLD_OPEN_VO + 12.22,
    color: '#6B7280',
  },
];

// ─── THE RULE — status symbol crops from status_flat ───────────────────────
//
// VO (relative to rule audio): car 38.5s, house 39.72s, job 40.94s,
// clothes 42.54s, watch 43.36s, phone 44.08s, street 44.8s.
// Asset: 'status_flat'  (Paper_cutout_luxury_status_symbols_*.jpg, 1376×768)
//
// triggerAbs is composition time of the spoken word:
// act.start + chapterPause + time inside the mp3.

const RULE_VO_BASE = voStartFor('rule');

export const RULE_CROP_ITEMS: CropItem[] = [
  {
    label: 'Your Car',
    srcX: 0,   srcY: 400, srcW: 520, srcH: 368,
    triggerAbs: RULE_VO_BASE + 38.5,
    destX: 18,  destY: 32,
    outW: 300,  outH: 212,
    tapeRot: -4, cardRot: -2.5,
  },
  {
    label: 'Your House',
    srcX: 370, srcY: 0,   srcW: 420, srcH: 330,
    triggerAbs: RULE_VO_BASE + 39.72,
    destX: 48,  destY: 22,
    outW: 280,  outH: 220,
    tapeRot: 2, cardRot: 1.8,
  },
  {
    label: 'Your Clothes',
    srcX: 880, srcY: 50,  srcW: 480, srcH: 480,
    triggerAbs: RULE_VO_BASE + 42.54,
    destX: 76,  destY: 28,
    outW: 240,  outH: 240,
    tapeRot: -3, cardRot: -1.4,
  },
  {
    label: 'Your Watch',
    srcX: 960, srcY: 500, srcW: 280, srcH: 268,
    triggerAbs: RULE_VO_BASE + 43.36,
    destX: 28,  destY: 62,
    outW: 220,  outH: 210,
    tapeRot: 5, cardRot: 3.2,
  },
  {
    label: 'Your Phone',
    srcX: 110, srcY: 120, srcW: 250, srcH: 350,
    triggerAbs: RULE_VO_BASE + 44.08,
    destX: 62,  destY: 58,
    outW: 190,  outH: 265,
    tapeRot: -2, cardRot: -2.8,
  },
];

// ─── ACT 5 — Employer / Bank / Platform ────────────────────────────────────
//
// VO (relative to act5 audio): employer 49.7s, bank 52.14s, platform 54.18s.
// triggerAbs includes the chapter pause, same clock as the captions.

const ACT5_VO_BASE = voStartFor('act5');

export const ACT5_STACK: StackItem[] = [
  {
    label: 'Your Employer',
    sub: 'First gatekeeper',
    triggerAbs: ACT5_VO_BASE + 49.7,
    color: '#8B1E1E',
  },
  {
    label: 'Your Bank',
    sub: 'Second gatekeeper',
    triggerAbs: ACT5_VO_BASE + 52.14,
    color: '#FDE047',
  },
  {
    label: 'The Platform',
    sub: 'Third gatekeeper',
    triggerAbs: ACT5_VO_BASE + 54.18,
    color: '#4ADE80',
  },
];

// ─── Asset-keyed lookup ─────────────────────────────────────────────────────

/** Assets that should render the steak/soup StackOverlay during cold open */
export const COLD_OPEN_STACK_ASSETS = new Set(['dinner_wide', 'dinner_side', 'dinner_3shot', 'dinner_alt']);

/** Assets that should render the status-symbol CropPopOverlay during Rule */
export const RULE_CROP_ASSETS = new Set(['status_flat']);

/** Assets that should render the gatekeepers StackOverlay during Act 5 */
export const ACT5_STACK_ASSETS = new Set(['monolith']);

