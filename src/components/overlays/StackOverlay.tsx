/**
 * StackOverlay — a list of labelled items that spring in one at a time,
 * synced to the voiceover, and stay on screen until the whole list is done.
 *
 * Usage: drop onto any shot where the VO calls out a series of items.
 * Items are pre-keyed to absolute voiceover timestamps.  The component
 * receives `voStart` (absolute seconds at which the act VO audio begins in
 * the composition) and uses it to convert item trigger times to frame offsets
 * within the current Remotion Sequence.
 *
 * Paper-cutout aesthetic: torn edges, tape strip, Caveat handwriting.
 */

import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig, staticFile} from 'remotion';
import {loadFont as loadCaveat} from '@remotion/google-fonts/Caveat';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

const caveat = loadCaveat('normal', {weights: ['700'], subsets: ['latin']});
const mono = loadMono();

const EASE_SPRING = {damping: 16, stiffness: 180, mass: 0.7};

const TORN =
  'polygon(0 2%, 1.4% 0.4%, 99% 0, 100% 3%, 99.2% 97%, 100% 100%, 0.8% 99.2%, 0 96%)';

export interface StackItem {
  /** Label shown on the card, e.g. "Steak", "Your car" */
  label: string;
  /** Optional sub-label (e.g. the price) */
  sub?: string;
  /** Absolute seconds in the act's VO audio when this item is first spoken */
  triggerAbs: number;
  /** Optional accent colour override */
  color?: string;
}

export interface StackOverlayProps {
  items: StackItem[];
  /**
   * Absolute seconds (in composition time) at which the act's VO audio
   * starts playing.  Used to convert triggerAbs → local frame offset.
   */
  voStart: number;
  /** Seconds after the LAST item's trigger until the whole stack exits */
  holdAfter?: number;
  /** Left or right alignment of the card stack */
  align?: 'left' | 'right';
  /** Paper colour */
  paper?: string;
  /** Ink colour */
  ink?: string;
  /** Accent colour for the dot / kicker line */
  accent?: string;
  /** Meta colour for sub-labels */
  meta?: string;
}

const Tape: React.FC<{rotate?: number}> = ({rotate = -3}) => (
  <div
    style={{
      position: 'absolute',
      left: '50%',
      top: -11,
      width: 80,
      height: 22,
      transform: `translateX(-50%) rotate(${rotate}deg)`,
      background: 'rgba(226,214,186,0.65)',
      borderLeft: '1px solid rgba(255,255,255,0.35)',
      borderRight: '1px solid rgba(0,0,0,0.08)',
      mixBlendMode: 'multiply',
    }}
  />
);

const ItemCard: React.FC<{
  item: StackItem;
  index: number;
  frame: number;
  fps: number;
  triggerFrame: number;
  exitFrame: number;
  paper: string;
  ink: string;
  accent: string;
  meta: string;
}> = ({item, index, frame, fps, triggerFrame, exitFrame, paper, ink, accent, meta}) => {
  const localIn = Math.max(0, frame - triggerFrame);
  const s = spring({frame: localIn, fps, config: EASE_SPRING});

  const localOut = Math.max(0, frame - exitFrame);
  const sOut = exitFrame > 0 ? spring({frame: localOut, fps, config: {...EASE_SPRING, stiffness: 220}}) : 0;

  if (frame < triggerFrame) return null;

  const opacity = Math.min(s * 1.1, 1) * (1 - sOut);
  const translateY = (1 - s) * 32 + sOut * -24;
  const scale = 0.88 + 0.12 * s - 0.06 * sOut;
  const rotate = (1 - s) * -6 + (index % 2 === 0 ? -1.2 : 1.4);

  return (
    <div
      style={{
        position: 'relative',
        marginBottom: 10,
        transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
        opacity,
        filter: 'drop-shadow(6px 12px 14px rgba(8,8,12,0.42))',
        transformOrigin: 'center center',
      }}
    >
      <div
        style={{
          position: 'relative',
          background: paper,
          clipPath: TORN,
          padding: '28px 36px 24px',
          minWidth: 240,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        {/* Tape strip on first item only */}
        {index === 0 && <Tape rotate={index % 2 === 0 ? -3 : 3} />}

        {/* Colour dot */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            background: item.color ?? accent,
            flexShrink: 0,
            boxShadow: `0 0 0 3px ${(item.color ?? accent)}30`,
          }}
        />

        <div>
          {/* Main label */}
          <div
            style={{
              fontFamily: caveat.fontFamily,
              fontSize: 46,
              fontWeight: 700,
              color: ink,
              lineHeight: 1.0,
              letterSpacing: '-0.01em',
            }}
          >
            {item.label}
          </div>

          {/* Sub-label */}
          {item.sub && (
            <div
              style={{
                fontFamily: mono.fontFamily,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: meta,
                marginTop: 4,
                opacity: 0.8,
              }}
            >
              {item.sub}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const StackOverlay: React.FC<StackOverlayProps> = ({
  items,
  voStart,
  holdAfter = 1.4,
  align = 'left',
  paper = '#EDE4D2',
  ink = '#171310',
  accent = '#C9913D',
  meta = '#6B5A3E',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  if (items.length === 0) return null;

  // Convert each item's absolute VO trigger time → local frame offset
  // localFrame = (triggerAbs - voStart) * fps
  const triggerFrames = items.map((item) => Math.round((item.triggerAbs - voStart) * fps));

  // All items exit together: last trigger + holdAfter
  const lastTrigger = Math.max(...triggerFrames);
  const exitFrame = lastTrigger + Math.round(holdAfter * fps);

  // Don't render at all if we haven't reached the first item yet or we've fully exited
  const firstTrigger = Math.min(...triggerFrames);
  if (frame < firstTrigger) return null;

  const left = align === 'left' ? '6%' : undefined;
  const right = align === 'right' ? '6%' : undefined;

  return (
    <AbsoluteFill style={{pointerEvents: 'none', zIndex: 30}}>
      <div
        style={{
          position: 'absolute',
          left,
          right,
          top: '20%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: align === 'left' ? 'flex-start' : 'flex-end',
        }}
      >
        {items.map((item, i) => (
          <ItemCard
            key={item.label}
            item={item}
            index={i}
            frame={frame}
            fps={fps}
            triggerFrame={triggerFrames[i]}
            exitFrame={exitFrame}
            paper={paper}
            ink={ink}
            accent={item.color ?? accent}
            meta={meta}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

