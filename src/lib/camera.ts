import {Easing} from 'remotion';
import type {CameraMove} from './data';

/**
 * Three motion vocabularies, and they never blur:
 *   camera  - 60fps, eased, confident   (the predator)
 *   paper   - 12fps, stepped, fragile   (the prey)
 *   HUD     - 60fps, linear, mechanical (the god)
 *
 * Everything in this file is the camera. The camera never stops moving.
 */

export interface CameraState {
  scale: number;
  x: number;
  y: number;
  rotate: number;
  blur: number;
}

const REST: CameraState = {scale: 1, x: 0, y: 0, rotate: 0, blur: 0};

const SMOOTH = Easing.bezier(0.22, 1, 0.36, 1);
const PUNCH = Easing.bezier(0.1, 0.92, 0.2, 1);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Progress through a sub-window [from, to] of the shot, clamped 0..1. */
const window01 = (p: number, from: number, to: number) =>
  clamp01((p - from) / Math.max(1e-6, to - from));

/** Sum of two out-of-phase sines - cheap, non-repeating handheld noise. */
const drift = (frame: number, seed: number) =>
  Math.sin(frame * 0.13 + seed) * 0.65 + Math.sin(frame * 0.37 + seed * 1.7) * 0.35;

export function cameraAt(move: CameraMove, p: number, frame: number): CameraState {
  switch (move) {
    // Slow creep. Dread. The workhorse.
    case 'pushIn': {
      const t = SMOOTH(clamp01(p));
      return {scale: lerp(1.0, 1.22, t), x: 0, y: lerp(0, -8, t), rotate: 0, blur: 0};
    }

    // Three-frame punch. Shock and reveals. No easing at all.
    case 'snapZoom': {
      const t = clamp01(p / 0.05);
      return {scale: lerp(1.0, 1.6, PUNCH(t)), x: 0, y: 0, rotate: 0, blur: 0};
    }

    // Four-frame lateral rip with motion blur.
    case 'whipPan': {
      const t = clamp01(p / 0.07);
      const out = clamp01((p - 0.07) / 0.15);
      return {
        scale: 1.04,
        x: lerp(-1400, 0, SMOOTH(t)),
        y: 0,
        rotate: 0,
        blur: lerp(16, 0, out),
      };
    }

    // Vertical reveal. Hierarchy, scale.
    case 'craneUp': {
      const t = SMOOTH(clamp01(p));
      return {scale: lerp(1.12, 1.0, t), x: 0, y: lerp(120, 0, t), rotate: 0, blur: 0};
    }

    // The Wes Anderson traverse.
    case 'dollyLateral': {
      const t = clamp01(p);
      return {scale: 1.04, x: lerp(-70, 70, t), y: 0, rotate: 0, blur: 0};
    }

    // Always-on unease. Small, but it is never absent when used.
    // Halved from 2.5/2.0/0.15: at 60fps the old amplitude read as a shaky
    // phone rather than a held breath, and it fought the paper cardstock sway.
    case 'handheldDrift': {
      return {
        scale: 1.02,
        x: drift(frame, 0) * 1.05,
        y: drift(frame, 1.3) * 0.85,
        rotate: drift(frame, 2.1) * 0.06,
        blur: 0,
      };
    }

    // Attention moves between planes without the camera moving much.
    case 'rackFocus': {
      const t = Math.sin(clamp01(p) * Math.PI);
      return {scale: lerp(1.0, 1.06, clamp01(p)), x: 0, y: 0, rotate: 0, blur: t * 5};
    }

    // Two to four degrees of wrongness.
    case 'dutchTilt': {
      const t = SMOOTH(clamp01(p));
      return {scale: 1.05, x: 0, y: 0, rotate: lerp(0, 3.2, t), blur: 0};
    }

    // Six frames, with overshoot. Panic.
    case 'crashZoom': {
      const t = clamp01(p / 0.1);
      const settle = clamp01((p - 0.1) / 0.12);
      const peak = PUNCH(t) * 2.25;
      return {
        scale: lerp(peak, 2.05, SMOOTH(settle)),
        x: 0,
        y: 0,
        rotate: 0,
        blur: lerp(10, 0, settle),
      };
    }

    // Fake 3D on a flat plate: lateral sway + breath in scale.
    case 'orbit': {
      const t = clamp01(p);
      return {
        scale: 1.07 - 0.03 * Math.sin(t * Math.PI),
        x: Math.sin(t * Math.PI * 2) * 46,
        y: Math.sin(t * Math.PI) * -6,
        rotate: Math.sin(t * Math.PI * 2) * 1.4,
        blur: 0,
      };
    }

    default:
      return REST;
  }
}

export function cameraTransform(c: CameraState): string {
  return `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, 0) `
    + `scale(${c.scale.toFixed(4)}) rotate(${c.rotate.toFixed(3)}deg)`;
}
