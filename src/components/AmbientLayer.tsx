import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Act} from '../lib/data';

/**
 * Ambient life layered over the plate.
 *
 * Even without SVG puppets, the world should breathe. These are lightweight
 * CSS/SVG overlays running at 60fps that give the unconscious mind movement
 * cues: floating dust, flickering warmth, shifting shadow stripes.
 *
 * Each act activates a different ambient set keyed to its emotional
 * temperature. Cold acts get drifting cool particles. Warm acts get
 * candlelight flicker. Noir acts get venetian-blind shadow stripes.
 */

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/* ----------------------------------------------------------------- dust */

interface Mote {
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  size: number;
  speed: number;
  phase: number;
  opacity: number;
}

const MOTES: Mote[] = Array.from({length: 18}, (_, i) => ({
  x0: (i * 37 + 11) % 100,
  y0: (i * 53 + 7) % 100,
  dx: Math.sin(i * 1.3) * 14,
  dy: Math.sin(i * 2.1) * -8 - 4,
  size: 1.5 + (i % 4) * 0.7,
  speed: 0.012 + (i % 5) * 0.004,
  phase: i * 0.7,
  opacity: 0.12 + (i % 3) * 0.06,
}));

const DustMotes: React.FC<{time: number; color: string}> = ({time, color}) => (
  <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
    {MOTES.map((m, i) => {
      const t = time * m.speed + m.phase;
      const x = m.x0 + Math.sin(t * 2.3) * m.dx;
      const y = m.y0 + Math.cos(t * 1.7) * m.dy + (time * 0.8) % 100;
      const fadeEdge = clamp01(Math.sin(t * 0.6 + m.phase) * 0.5 + 0.5);
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${((x % 100) + 100) % 100}%`,
            top: `${((y % 100) + 100) % 100}%`,
            width: m.size,
            height: m.size,
            borderRadius: '50%',
            background: color,
            opacity: m.opacity * fadeEdge,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

/* --------------------------------------------------------- candle flicker */

const CandleFlicker: React.FC<{time: number; color: string}> = ({time, color}) => {
  // Two overlapping radial gradients with different oscillation rates
  const pulse1 = 0.08 + Math.sin(time * 3.7) * 0.04 + Math.sin(time * 7.1) * 0.02;
  const pulse2 = 0.06 + Math.sin(time * 5.3 + 1.2) * 0.03;
  const cx = 50 + Math.sin(time * 2.1) * 2;
  const cy = 35 + Math.sin(time * 1.8) * 1.5;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${cx}% ${cy}%, ${color} 0%, transparent 55%)`,
          opacity: pulse1,
          mixBlendMode: 'soft-light',
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${cx + 3}% ${cy + 8}%, ${color} 0%, transparent 70%)`,
          opacity: pulse2,
          mixBlendMode: 'overlay',
        }}
      />
    </AbsoluteFill>
  );
};

/* --------------------------------------------------------- shadow stripes */

const ShadowStripes: React.FC<{time: number}> = ({time}) => {
  // Venetian blind shadows drifting slowly across the frame — noir unease.
  const offset = time * 6;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `repeating-linear-gradient(
          78deg,
          transparent 0px,
          transparent 42px,
          rgba(0,0,0,0.18) 42px,
          rgba(0,0,0,0.18) 56px
        )`,
        backgroundPosition: `${offset}px 0`,
        mixBlendMode: 'multiply',
        opacity: 0.7,
      }}
    />
  );
};

/* ----------------------------------------------------------- cool drift */

const CoolDrift: React.FC<{time: number}> = ({time}) => {
  // A slow, cold light sweep — like headlights passing outside a window.
  const sweep = ((time * 8) % 200) - 40;
  const opacity = 0.06 + Math.sin(time * 0.4) * 0.03;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `linear-gradient(90deg, transparent ${sweep - 30}%, rgba(180,200,220,0.12) ${sweep}%, transparent ${sweep + 30}%)`,
        opacity,
        mixBlendMode: 'screen',
      }}
    />
  );
};

/* ------------------------------------------------------- gallery breath */

const GalleryBreath: React.FC<{time: number}> = ({time}) => {
  // Museum gallery: subtle vignette that breathes, surgical and clean.
  const pulse = 0.4 + Math.sin(time * 0.7) * 0.08;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${pulse.toFixed(3)}) 100%)`,
      }}
    />
  );
};

/* ---------------------------------------------------------------- index */

/**
 * Per-act ambient atmosphere selection.
 * Each act gets a distinct ambient treatment so the 14-minute runtime
 * never settles into visual wallpaper.
 */
export const AmbientLayer: React.FC<{act: Act}> = ({act}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;

  switch (act.id) {
    case 'cold_open':
    case 'close':
      // Warm candlelit — flickering warmth + golden dust
      return (
        <>
          <CandleFlicker time={time} color="#E8A94044" />
          <DustMotes time={time} color="rgba(232,185,75,0.5)" />
        </>
      );

    case 'rule':
    case 'act1':
      // Overcast mundane — faint dust, cool drift
      return (
        <>
          <DustMotes time={time} color="rgba(200,195,185,0.35)" />
          <CoolDrift time={time} />
        </>
      );

    case 'act2':
      // Bruised plum — cooler dust, subtle shadow play
      return (
        <>
          <DustMotes time={time} color="rgba(180,160,190,0.3)" />
          <CandleFlicker time={time} color="#7C6B8522" />
        </>
      );

    case 'act3':
      // Emotional core — warm flicker fading to cold
      return (
        <>
          <CandleFlicker time={time} color="#5B4B6B20" />
          <DustMotes time={time} color="rgba(160,150,180,0.3)" />
        </>
      );

    case 'act4':
      // Predator noir — venetian shadow stripes
      return (
        <>
          <ShadowStripes time={time} />
          <DustMotes time={time} color="rgba(140,30,30,0.2)" />
        </>
      );

    case 'act5':
      // Deep noir — heavy shadows + toxic dust
      return (
        <>
          <ShadowStripes time={time} />
          <DustMotes time={time} color="rgba(253,224,71,0.15)" />
        </>
      );

    case 'act6':
      // Museum gallery white — clean breathing vignette
      return <GalleryBreath time={time} />;

    case 'act7':
      // Clinical green — cool particles
      return (
        <>
          <DustMotes time={time} color="rgba(74,222,128,0.2)" />
          <CoolDrift time={time} />
        </>
      );

    default:
      return <DustMotes time={time} color="rgba(200,195,185,0.3)" />;
  }
};

