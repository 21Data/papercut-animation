/**
 * CropPopOverlay — pops rectangular crops from a source image in sequence,
 * timed to the voiceover.  Each crop springs in with a slight rotation and
 * stays on screen until the whole sequence is done.
 *
 * Used for: "The Rule" section — car/house/coat/watch/phone cropped from
 * the status_flat image (`Paper_cutout_luxury_status_symbols_*.jpg`).
 *
 * Paper-cutout aesthetic: each crop is a physical cut-out pinned to the
 * composition with a tape strip and a torn-edge shadow.
 */

import React from 'react';
import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

const mono = loadMono();

const EASE_SPRING = {damping: 15, stiffness: 200, mass: 0.65};

export interface CropItem {
  /** Name displayed below the crop, e.g. "Your Car" */
  label: string;
  /** Crop rect in the SOURCE image's natural pixels */
  srcX: number;
  srcY: number;
  srcW: number;
  srcH: number;
  /** Absolute seconds in the act's VO audio when this item is first spoken */
  triggerAbs: number;
  /** Where the pop lands on the composition (% of 1920×1080) */
  destX: number;
  destY: number;
  /** Output size (px at 1920×1080 — roughly 220–300 for a compact crop) */
  outW: number;
  outH: number;
  /** Tape strip rotation (degrees) */
  tapeRot?: number;
  /** Card tilt (degrees) */
  cardRot?: number;
}

export interface CropPopOverlayProps {
  /** Path to the source image (staticFile path) */
  src: string;
  items: CropItem[];
  /**
   * Absolute seconds (in composition time) at which the act's VO audio
   * starts playing.  Used to convert triggerAbs → local frame offset.
   */
  voStart: number;
  /** Natural dimensions of the source image */
  srcNaturalW: number;
  srcNaturalH: number;
  /** Seconds after the LAST item's trigger until everything exits */
  holdAfter?: number;
}

const Tape: React.FC<{rotate?: number; ink?: string}> = ({rotate = 0, ink = '#D4C9A8'}) => (
  <div
    style={{
      position: 'absolute',
      left: '50%',
      top: -13,
      width: 72,
      height: 22,
      transform: `translateX(-50%) rotate(${rotate}deg)`,
      background: `${ink}99`,
      borderLeft: '1px solid rgba(255,255,255,0.3)',
      borderRight: '1px solid rgba(0,0,0,0.1)',
      mixBlendMode: 'multiply',
      zIndex: 2,
    }}
  />
);

const CropCard: React.FC<{
  item: CropItem;
  frame: number;
  fps: number;
  triggerFrame: number;
  exitFrame: number;
  src: string;
  srcNaturalW: number;
  srcNaturalH: number;
  zIndex: number;
}> = ({item, frame, fps, triggerFrame, exitFrame, src, srcNaturalW, srcNaturalH, zIndex}) => {
  const localIn = Math.max(0, frame - triggerFrame);
  const s = spring({frame: localIn, fps, config: EASE_SPRING});

  const localOut = Math.max(0, frame - exitFrame);
  const sOut = exitFrame > 0 ? spring({frame: localOut, fps, config: {...EASE_SPRING, stiffness: 240}}) : 0;

  if (frame < triggerFrame) return null;

  const opacity = Math.min(s * 1.1, 1) * (1 - sOut);
  const scale = (0.72 + 0.28 * s) * (1 - 0.12 * sOut);
  const tilt = item.cardRot ?? ((zIndex % 2 === 0) ? -2.4 : 2.1);

  // Scale factors to convert source pixels → natural image display pixels
  const scaleX = item.outW / item.srcW;
  const scaleY = item.outH / item.srcH;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${item.destX}%`,
        top: `${item.destY}%`,
        transform: `translate(-50%, -50%) scale(${scale}) rotate(${tilt}deg)`,
        opacity,
        zIndex: 30 + zIndex,
        filter: 'drop-shadow(10px 18px 20px rgba(8,8,12,0.55))',
        transformOrigin: 'center center',
      }}
    >
      {/* Tape strip */}
      <Tape rotate={item.tapeRot ?? (zIndex % 2 === 0 ? -4 : 3)} />

      {/* The crop itself — achieved by clipping a scaled image */}
      <div
        style={{
          width: item.outW,
          height: item.outH,
          overflow: 'hidden',
          border: '3px solid rgba(255,255,255,0.18)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
          position: 'relative',
        }}
      >
        <Img
          src={staticFile(src)}
          style={{
            position: 'absolute',
            left: -item.srcX * scaleX,
            top: -item.srcY * scaleY,
            width: srcNaturalW * scaleX,
            height: srcNaturalH * scaleY,
          }}
        />
      </div>

      {/* Label strip below */}
      <div
        style={{
          background: 'rgba(20,16,12,0.78)',
          padding: '5px 12px 6px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: mono.fontFamily,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#E8D9BC',
          }}
        >
          {item.label}
        </span>
      </div>
    </div>
  );
};

export const CropPopOverlay: React.FC<CropPopOverlayProps> = ({
  src,
  items,
  voStart,
  srcNaturalW,
  srcNaturalH,
  holdAfter = 1.6,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  if (items.length === 0) return null;

  const triggerFrames = items.map((item) => Math.round((item.triggerAbs - voStart) * fps));
  const lastTrigger = Math.max(...triggerFrames);
  const exitFrame = lastTrigger + Math.round(holdAfter * fps);
  const firstTrigger = Math.min(...triggerFrames);

  if (frame < firstTrigger) return null;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {items.map((item, i) => (
        <CropCard
          key={item.label}
          item={item}
          frame={frame}
          fps={fps}
          triggerFrame={triggerFrames[i]}
          exitFrame={exitFrame}
          src={src}
          srcNaturalW={srcNaturalW}
          srcNaturalH={srcNaturalH}
          zIndex={i + 1}
        />
      ))}
    </AbsoluteFill>
  );
};

