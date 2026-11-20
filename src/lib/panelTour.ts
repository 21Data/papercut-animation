import type {Shot} from './data';
import type {CameraState} from './camera';
import {Easing} from 'remotion';

/**
 * Word-locked dolly + push-in across a split plate (or any plate whose
 * objects are already in frame). The paper stays on the 12fps clock;
 * only this camera eases at 60fps.
 */

export interface TourStop {
  /** Composition seconds. If the shot misses these, the tour spreads across it. */
  at?: number;
  /** Focus as a percentage of the plate. */
  fx: number;
  fy: number;
  scale: number;
}

const SMOOTH = Easing.bezier(0.22, 1, 0.36, 1);
const W = 1920;
const H = 1080;

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const drift = (frame: number, seed: number) =>
  Math.sin(frame * 0.13 + seed) * 0.55 + Math.sin(frame * 0.37 + seed * 1.7) * 0.3;

function focusToCamera(fx: number, fy: number, scale: number, frame: number): CameraState {
  return {
    scale,
    x: (0.5 - fx / 100) * W * scale,
    y: (0.5 - fy / 100) * H * scale,
    rotate: drift(frame, 2.1) * 0.04,
    blur: 0,
  };
}

function lerpCam(a: CameraState, b: CameraState, t: number): CameraState {
  const k = SMOOTH(clamp01(t));
  return {
    scale: lerp(a.scale, b.scale, k),
    x: lerp(a.x, b.x, k),
    y: lerp(a.y, b.y, k),
    rotate: lerp(a.rotate, b.rotate, k),
    blur: 0,
  };
}

function timedStops(stops: TourStop[], shot: Shot): Array<TourStop & {at: number}> {
  const hits = stops.filter(
    (s): s is TourStop & {at: number} =>
      s.at !== undefined && s.at >= shot.start - 0.6 && s.at <= shot.end + 0.6,
  );
  if (hits.length >= 2) return hits;
  if (hits.length === 1 && stops.length === 1) return hits;
  const n = stops.length;
  return stops.map((s, i) => ({
    ...s,
    at: shot.start + (n <= 1 ? shot.duration * 0.12 : (i / (n - 1)) * shot.duration * 0.92),
  }));
}

export function tourAt(stops: TourStop[], shot: Shot, tAbs: number, frame: number): CameraState {
  const pts = timedStops(stops, shot);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (tAbs <= first.at) return focusToCamera(first.fx, first.fy, first.scale, frame);
  if (tAbs >= last.at) return focusToCamera(last.fx, last.fy, last.scale, frame);

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (tAbs <= b.at) {
      const p = (tAbs - a.at) / Math.max(0.05, b.at - a.at);
      return lerpCam(
        focusToCamera(a.fx, a.fy, a.scale, frame),
        focusToCamera(b.fx, b.fy, b.scale, frame),
        p,
      );
    }
  }
  return focusToCamera(last.fx, last.fy, last.scale, frame);
}

/**
 * Composition-time stops for every split (and the few wide plates that
 * must travel to a noun). Times match build/timeline.json startAbs.
 */
export const PANEL_TOURS: Record<string, TourStop[]> = {
  rule_unhideable: [
    {at: 59.053, fx: 17, fy: 52, scale: 1.38},
    {at: 59.653, fx: 50, fy: 50, scale: 1.38},
    {at: 60.413, fx: 83, fy: 52, scale: 1.38},
  ],
  salary_debt_now: [
    {at: 61.853, fx: 17, fy: 52, scale: 1.36},
    {at: 63.373, fx: 50, fy: 50, scale: 1.36},
    {at: 65.173, fx: 83, fy: 52, scale: 1.4},
  ],
  leased_car: [
    // The owner holds until the word "leased", then the keys.
    {at: 101.11, fx: 26, fy: 52, scale: 1.82},
    {at: 101.72, fx: 26, fy: 52, scale: 1.82},
    {at: 101.85, fx: 76, fy: 48, scale: 1.86},
    {at: 102.45, fx: 76, fy: 48, scale: 1.86},
  ],
  copied_coat: [
    // The coat holds until the word "copied", then the copier.
    {at: 102.57, fx: 24, fy: 48, scale: 1.7},
    {at: 103.2, fx: 24, fy: 48, scale: 1.7},
    {at: 103.35, fx: 76, fy: 50, scale: 1.78},
    {at: 104.3, fx: 76, fy: 50, scale: 1.78},
  ],
  three_choices: [
    // Wide through "who you love", then borrow / sit / split on the noun.
    {at: 377.33, fx: 50, fy: 48, scale: 1.02},
    {at: 382.62, fx: 50, fy: 48, scale: 1.02},
    {at: 382.95, fx: 17, fy: 48, scale: 2.65},
    {at: 384.05, fx: 17, fy: 48, scale: 2.65},
    {at: 384.25, fx: 50, fy: 50, scale: 2.65},
    {at: 385.3, fx: 50, fy: 50, scale: 2.65},
    {at: 385.53, fx: 83, fy: 48, scale: 2.65},
    {at: 386.4, fx: 83, fy: 48, scale: 2.65},
  ],
  already_sorted: [
    // Houses for "postcodes", children for "schools". Hold each until the word.
    {at: 453.93, fx: 17, fy: 50, scale: 2.6},
    {at: 454.92, fx: 17, fy: 50, scale: 2.6},
    {at: 455.11, fx: 50, fy: 50, scale: 2.6},
    {at: 456.15, fx: 50, fy: 50, scale: 2.6},
  ],
  number_says_no: [
    {at: 569.618, fx: 17, fy: 50, scale: 1.34},
    {at: 570.578, fx: 50, fy: 50, scale: 1.34},
    {at: 571.778, fx: 83, fy: 50, scale: 1.34},
    {at: 575.038, fx: 50, fy: 50, scale: 1.08},
  ],
  coffee_two_prices: [
    {at: 576.318, fx: 25, fy: 46, scale: 1.28},
    {at: 580.0, fx: 75, fy: 46, scale: 1.28},
  ],
  flight_two_prices: [
    {at: 584.338, fx: 25, fy: 48, scale: 1.28},
    {at: 592.138, fx: 25, fy: 42, scale: 1.36},
    {at: 598.0, fx: 75, fy: 48, scale: 1.36},
  ],
  scam_kit: [
    {at: 654.195, fx: 17, fy: 50, scale: 1.36},
    {at: 655.175, fx: 50, fy: 50, scale: 1.36},
    {at: 656.235, fx: 83, fy: 50, scale: 1.36},
  ],
  wedding_costs: [
    // Wide until the list, then flight, hotel, gift, outfit on each noun.
    {at: 339.05, fx: 50, fy: 50, scale: 1.02},
    {at: 340.0, fx: 50, fy: 50, scale: 1.02},
    {at: 340.21, fx: 13, fy: 50, scale: 1.85},
    {at: 340.58, fx: 13, fy: 50, scale: 1.85},
    {at: 340.71, fx: 37, fy: 50, scale: 1.85},
    {at: 341.35, fx: 37, fy: 50, scale: 1.85},
    {at: 341.51, fx: 62, fy: 50, scale: 1.85},
    {at: 342.0, fx: 62, fy: 50, scale: 1.85},
    {at: 342.17, fx: 87, fy: 50, scale: 1.85},
    {at: 342.65, fx: 87, fy: 50, scale: 1.85},
  ],
  status_flat: [
    // Wide long enough to read the plate, then each object on its noun.
    // Job title is the figure. The street you live on is the house.
    {at: 80.5, fx: 50, fy: 50, scale: 1.04},
    {at: 82.55, fx: 50, fy: 50, scale: 1.05},
    {at: 83.01, fx: 22, fy: 76, scale: 2.05},
    {at: 83.95, fx: 22, fy: 76, scale: 2.05},
    {at: 84.23, fx: 50, fy: 17, scale: 1.9},
    {at: 85.2, fx: 50, fy: 17, scale: 1.9},
    {at: 85.45, fx: 50, fy: 56, scale: 1.7},
    {at: 86.8, fx: 50, fy: 56, scale: 1.7},
    {at: 87.05, fx: 79, fy: 38, scale: 1.95},
    {at: 87.7, fx: 79, fy: 38, scale: 1.95},
    {at: 87.87, fx: 79, fy: 79, scale: 2.15},
    {at: 88.4, fx: 79, fy: 79, scale: 2.15},
    {at: 88.59, fx: 18, fy: 42, scale: 2.15},
    {at: 89.1, fx: 18, fy: 42, scale: 2.15},
    {at: 89.31, fx: 50, fy: 17, scale: 1.85},
    {at: 90.4, fx: 50, fy: 17, scale: 1.85},
    {at: 90.7, fx: 50, fy: 48, scale: 1.05},
    {at: 92.4, fx: 48, fy: 46, scale: 1.08},
  ],
  earth_crowd: [
    {at: 49.833, fx: 50, fy: 56, scale: 1.02},
    {at: 56.73, fx: 50, fy: 46, scale: 1.16},
    {at: 57.71, fx: 50, fy: 42, scale: 1.24},
  ],
  street: [
    // The row reads as one street, then the camera walks the houses.
    {at: 110.5, fx: 50, fy: 62, scale: 1.04},
    {at: 125.5, fx: 50, fy: 64, scale: 1.06},
    {at: 127.31, fx: 14, fy: 70, scale: 1.72},
    {at: 129.55, fx: 86, fy: 70, scale: 1.74},
  ],
  feed_missing: [
    {at: 734.26, fx: 28, fy: 50, scale: 1.42},
    {at: 735.12, fx: 28, fy: 50, scale: 1.42},
    {at: 735.28, fx: 74, fy: 48, scale: 1.48},
    {at: 736.1, fx: 74, fy: 48, scale: 1.48},
  ],
  unremarkable: [
    {at: 879.48, fx: 50, fy: 50, scale: 1.04},
    {at: 880.05, fx: 50, fy: 46, scale: 1.16},
    {at: 882.4, fx: 50, fy: 44, scale: 1.26},
  ],
  dollhouse: [
    {at: 130.692, fx: 50, fy: 52, scale: 1.06},
    {at: 133.912, fx: 22, fy: 55, scale: 1.42},
    {at: 137.492, fx: 50, fy: 55, scale: 1.42},
    {at: 141.032, fx: 78, fy: 58, scale: 1.42},
  ],
  party: [
    {at: 418.352, fx: 50, fy: 50, scale: 1.08},
    {at: 425.452, fx: 22, fy: 28, scale: 1.55},
    {at: 432.0, fx: 62, fy: 38, scale: 1.5},
    {at: 438.0, fx: 22, fy: 70, scale: 1.5},
    {at: 444.0, fx: 78, fy: 72, scale: 1.5},
  ],
  dinner_side: [
    {at: 456.252, fx: 50, fy: 58, scale: 1.08},
    {at: 457.0, fx: 50, fy: 58, scale: 1.14},
  ],
};

export function tourFor(shot: Shot): TourStop[] | undefined {
  const stops = PANEL_TOURS[shot.assetHandle];
  if (!stops || stops.length === 0) return undefined;
  if (stops.every((s) => s.at === undefined)) return stops;
  const hits = stops.filter(
    (s) => s.at !== undefined && s.at >= shot.start - 0.6 && s.at <= shot.end + 0.6,
  );
  if (hits.length >= 2) return stops;
  if (hits.length === 1 && stops.length === 1) return stops;
  return undefined;
}
