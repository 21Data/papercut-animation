import React from 'react';
import {AbsoluteFill, Easing, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadCaveat} from '@remotion/google-fonts/Caveat';
import type {Act} from '../../lib/data';
import {overlayPalette, photoStackFor, type OverlayPalette, type StackCard} from '../../lib/overlays';
import {STACK_FAN, STACK_IMG, STACK_TOP, STACK_W, STAGE_W, linger} from '../../lib/stage';

const caveat = loadCaveat('normal', {weights: ['400', '700'], subsets: ['latin']});

/**
 * The pinned plates, held as a pile.
 *
 * Each print lands at full size and stays that size. The next one is set on
 * top, a little askew, the way a hand drops a second sheet onto the first.
 * Nothing shrinks onto a rail. The pile holds after the last line, then eases
 * out together — it does not blink off.
 */

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

const ENTER = 0.48;

const SHADOW = 'drop-shadow(8px 16px 18px rgba(8,8,12,0.45))';

const Print: React.FC<{
  card: StackCard;
  pal: OverlayPalette;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
  z: number;
}> = ({card, pal, x, y, scale, rotate, opacity, z}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: STACK_W,
      transformOrigin: '0 0',
      transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(4)}) rotate(${rotate.toFixed(2)}deg)`,
      opacity,
      zIndex: z,
      filter: SHADOW,
    }}
  >
    <div style={{background: pal.paper, padding: 14}}>
      <Img
        src={staticFile(card.asset)}
        style={{
          width: '100%',
          height: STACK_IMG,
          objectFit: 'cover',
          objectPosition: card.focus ?? '50% 50%',
        }}
      />
      <div style={{padding: '14px 8px 8px'}}>
        <div
          style={{
            fontFamily: caveat.fontFamily,
            fontWeight: 700,
            fontSize: 42,
            letterSpacing: '0.01em',
            color: pal.ink,
            lineHeight: 1.05,
          }}
        >
          {card.title}
        </div>
      </div>
    </div>
  </div>
);

export const PhotoStack: React.FC<{act: Act}> = ({act}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const cards = photoStackFor(act);
  if (cards.length === 0) return null;

  const pal = overlayPalette(act);
  const last = cards[cards.length - 1];
  // Hold, then ease. The pile stays at full size for the whole exit.
  const exitK = 1 - linger(t, last.end);
  const homeX = (STAGE_W - STACK_W) / 2;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {cards.map((card, i) => {
        if (t < card.start) return null;
        if (exitK >= 1) return null;

        const fan = STACK_FAN[i % STACK_FAN.length];
        const enter = EASE(clamp01((t - card.start) / ENTER));

        // The sheet drops onto its place in the pile. It does not then
        // travel, and it does not change size.
        const x = homeX + fan.x + (1 - enter) * 64;
        const y = STACK_TOP + fan.y + (1 - enter) * 48 - exitK * 22;
        const rotate = fan.r * enter;

        return (
          <Print
            key={`${card.asset}-${card.start}`}
            card={card}
            pal={pal}
            x={x}
            y={y}
            scale={1}
            rotate={rotate}
            opacity={enter * (1 - exitK)}
            z={10 + i}
          />
        );
      })}
    </AbsoluteFill>
  );
};
