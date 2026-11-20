import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadCaveat} from '@remotion/google-fonts/Caveat';
import type {Act} from '../../lib/data';
import {overlayPalette, ownerTokensFor, type StackCard} from '../../lib/overlays';
import {STAGE_W, linger} from '../../lib/stage';

/**
 * Employer, bank, platform.
 *
 * Cut from the same cardstock as the figures: a filled paper shape, one torn
 * edge, one accent. They land on the word and stay on the table together,
 * the way the prints do, because the narration names three owners.
 */

const caveat = loadCaveat('normal', {weights: ['400', '700'], subsets: ['latin']});

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ENTER = 0.42;

const PAPER = '#E4D2B0';
const INK = '#1C140E';
const SHADOW = 'drop-shadow(8px 16px 14px rgba(8,8,12,0.48))';

const TORN =
  'polygon(0 0, 86% 0, 92% 6%, 88% 14%, 96% 22%, 90% 34%, 98% 46%, 91% 58%, 97% 72%, 90% 84%, 96% 100%, 0 100%)';

/** Which accent detail a token carries. The rest of the shape is plain stock. */
const Shape: React.FC<{asset: string; accent: string}> = ({asset, accent}) => {
  const which = asset.split('/')[1];
  return (
    <svg viewBox="0 0 100 100" width={168} height={168} style={{display: 'block', overflow: 'visible'}}>
        {which === 'bank' ? (
          <>
            <path d="M50 14 L88 38 H12 Z" fill={accent} />
            <path d="M18 40 H30 V78 H18 Z" fill={PAPER} stroke={INK} strokeWidth={2.2} />
            <path d="M44 40 H56 V78 H44 Z" fill={PAPER} stroke={INK} strokeWidth={2.2} />
            <path d="M70 40 H82 V78 H70 Z" fill={PAPER} stroke={INK} strokeWidth={2.2} />
            <path d="M10 78 H90 V90 H10 Z" fill={PAPER} stroke={INK} strokeWidth={2.2} />
          </>
        ) : which === 'phone' ? (
          <>
            <rect x={28} y={8} width={44} height={84} rx={6} fill={PAPER} stroke={INK} strokeWidth={2.4} />
            <rect x={34} y={22} width={32} height={46} fill={accent} />
            <rect x={42} y={14} width={16} height={3} rx={1} fill={INK} />
          </>
        ) : (
          <>
            <path d="M24 90 V18 H76 V90 Z" fill={PAPER} stroke={INK} strokeWidth={2.4} />
            <rect x={34} y={30} width={12} height={12} fill={INK} />
            <rect x={54} y={30} width={12} height={12} fill={accent} />
            <rect x={34} y={50} width={12} height={12} fill={INK} />
            <rect x={54} y={50} width={12} height={12} fill={INK} />
            <rect x={34} y={70} width={12} height={12} fill={INK} />
            <rect x={54} y={70} width={12} height={12} fill={INK} />
          </>
        )}
    </svg>
  );
};

const SLOTS = [
  {x: -360, y: 0, r: -5.5},
  {x: 0, y: 16, r: 1.4},
  {x: 340, y: 6, r: 4.8},
];

const Token: React.FC<{
  card: StackCard;
  accent: string;
  x: number;
  y: number;
  rotate: number;
  opacity: number;
  z: number;
}> = ({card, accent, x, y, rotate, opacity, z}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 220,
      opacity,
      zIndex: z,
      transform: `rotate(${rotate}deg)`,
      transformOrigin: '50% 40%',
      filter: SHADOW,
    }}
  >
    <div style={{clipPath: TORN, background: PAPER, padding: '18px 18px 8px'}}>
      <Shape asset={card.asset} accent={accent} />
    </div>
    <div
      style={{
        marginTop: 10,
        textAlign: 'center',
        fontFamily: caveat.fontFamily,
        fontWeight: 700,
        fontSize: 40,
        color: PAPER,
        textShadow: '0 2px 0 rgba(0,0,0,0.45)',
      }}
    >
      {card.title}
    </div>
  </div>
);

export const TokenRow: React.FC<{act: Act}> = ({act}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cards = ownerTokensFor(act);
  if (cards.length === 0) return null;

  const pal = overlayPalette(act);
  const last = cards[cards.length - 1];
  const exitK = 1 - linger(t, last.end);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {cards.map((card, i) => {
        if (t < card.start || exitK >= 1) return null;
        const slot = SLOTS[i % SLOTS.length];
        const enter = EASE(clamp01((t - card.start) / ENTER));
        const x = STAGE_W / 2 - 110 + slot.x + (1 - enter) * 36;
        const y = 168 + slot.y + (1 - enter) * 28 - exitK * 18;
        return (
          <Token
            key={`${card.asset}-${card.start}`}
            card={card}
            accent={pal.accent}
            x={x}
            y={y}
            rotate={slot.r * enter}
            opacity={enter * (1 - exitK)}
            z={10 + i}
          />
        );
      })}
    </AbsoluteFill>
  );
};
