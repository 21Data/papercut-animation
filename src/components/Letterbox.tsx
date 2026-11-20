import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Act, Shot} from '../lib/data';

/**
 * Cinematic letterboxing for tonal shifts.
 *
 * Acts 4 and 5 (predator noir) get 2.39:1 bars. They slide in once at the top
 * of the act and out over 20 frames. The sudden openness when they leave in
 * Act 6 (gallery white) is deliberately liberating — pure Fincher direction.
 *
 * The component lives inside a per-shot Sequence, so `useCurrentFrame()` is
 * shot-relative. The bars are anchored to the act's own clock instead, or they
 * would slide in again on every cut and pulse through the whole act.
 */

const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

const NOIR_ACTS = new Set(['act4', 'act5']);

/**
 * Bar height at full deployment, in px.
 *
 * 108 rather than the theoretical 138 for a true 2.39:1, because these plates
 * are composed for 16:9 and the taller bars were eating faces and the bottom of
 * the bank tower. 108 still reads unmistakably as a scope frame while leaving
 * roughly 80% of the plate visible.
 */
const BAR_HEIGHT = 108;

/** Frames the bars take to deploy at the head of the act. */
const ENTRY = 0.5;

export const Letterbox: React.FC<{act: Act; shot: Shot}> = ({act, shot}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  if (!NOIR_ACTS.has(act.id)) return null;

  const actTime = shot.start - act.start + frame / fps;
  const entry = EASE(clamp01(actTime / ENTRY));
  const h = BAR_HEIGHT * entry;

  return (
    <AbsoluteFill style={{pointerEvents: 'none', zIndex: 50}}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: h,
          background: '#000',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: h,
          background: '#000',
        }}
      />
    </AbsoluteFill>
  );
};
