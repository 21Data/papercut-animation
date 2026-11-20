import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadCaveat} from '@remotion/google-fonts/Caveat';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import type {Act, HudAnchor, Shot} from '../lib/data';
import {wordStartsIn} from '../lib/phrases';
import {overlaysForShot, ownerTokensFor, photoStackFor} from '../lib/overlays';
import {
  ACT_TITLE_SEC,
  OVERLAY_TAIL,
  TITLE_ACTS,
  intersects,
  placeChip,
  stackVisualRect,
  textCardRect,
  tokenVisualRect,
  type Box,
} from '../lib/stage';

const caveat = loadCaveat('normal', {weights: ['400', '700'], subsets: ['latin']});
const mono = loadMono();

/**
 * The number is God, but the number is now written down.
 *
 * Each balance is a paper scrap pinned above one person's head, with a tail
 * pointing at the crown. The scrap pops in on the director's three-frame
 * flicker at the first spoken word that cue belongs to. After that the amount
 * stays put: a balance is a fact about this person, not a counter. The paper
 * is hand-made. The number is not.
 */

type Band = 'high' | 'buffer' | 'danger';

const BAND_SCALE: Record<Band, number> = {high: 1.08, buffer: 1, danger: 0.94};

const BAND_INK: Record<Band, {paperInk: string; bright: string}> = {
  high: {paperInk: '#2F7D4F', bright: '#4ADE80'},
  buffer: {paperInk: '#A56A12', bright: '#FBBF24'},
  danger: {paperInk: '#A62626', bright: '#F87171'},
};

const bandOf = (v: number): Band => (v > 50000 ? 'high' : v < 250 ? 'danger' : 'buffer');

const CHIP_SCALE = 1.3;

const money = (n: number) => {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return sign + '$' + abs.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
};

const count = (n: number) => Math.round(n).toLocaleString('en-US');

const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);
const clamp01 = (t: number) => clamp(t, 0, 1);
const paperStep = (t: number) => Math.floor(t * 12) / 12;

/**
 * Cue every note on the voice, not on the shot clock. Notes arrive in reading
 * order, so a wide plate fills left to right; a crane fills from the bottom up.
 *
 * Dense shots (12+ anchors) now stagger one-by-one synced to individual spoken
 * words so the viewer can *count* with the narrator instead of being hit by a
 * wall of numbers. This is Fix #7: Progressive Reveal.
 */
function cueTimes(shot: Shot, fps: number): number[] {
  const anchors = shot.hudAnchors;
  const n = anchors.length;
  if (n === 0) return [];

  if (shot.assetHandle === 'earth_crowd') {
    // Every crown, in no reading order. A fixed hash so the pops stay put
    // across renders and do not march left to right.
    const first = 0.35;
    const last = Math.max(first + 0.6, Math.min(shot.duration - 0.4, shot.duration * 0.72));
    return anchors.map((_, i) => {
      let h = Math.imul(i + 1, 0x9e3779b1);
      h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
      h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
      h ^= h >>> 16;
      const u = (h >>> 0) / 4294967296;
      return first + u * (last - first);
    });
  }

  // Anchors are already stored left to right, one per person. Re-sorting by
  // height on a crane put the rightmost head's number on the leftmost body.
  const order = anchors.map((_, i) => i);

  const starts = wordStartsIn(shot.start, shot.end).map((t) => t - shot.start);
  const rank = new Map<number, number>();
  order.forEach((idx, r) => rank.set(idx, r));

  // Spread the reveals across a larger window — let the viewer breathe.
  const spread = Math.min(shot.duration * 0.7, n > 12 ? shot.duration * 0.75 : 3.2);

  return anchors.map((_, i) => {
    const r = rank.get(i) ?? i;
    let nominal: number;

    if (shot.hud === 'hero' || shot.hud === 'one') nominal = 0.32 + r * 0.1;
    else if (shot.hud === 'drop') nominal = 0.5 + r * 0.12;
    // Dense shots: one-by-one stagger matched to voice cadence, not batched
    else if (n > 12) nominal = 0.3 + (r / (n - 1)) * spread;
    else if (n === 1) nominal = 0.3;
    else nominal = 0.22 + (r / (n - 1)) * spread;

    // Land on the nearest spoken word when one is close enough.
    let best = nominal;
    let bestDist = n > 8 ? 0.5 : 0.3;
    for (const s of starts) {
      const d = Math.abs(s - nominal);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }

    return clamp(best, 0.12, Math.max(0.12, shot.duration - 0.55));
  });
}

const NoteTail: React.FC<{paper: string; width: number}> = ({paper, width}) => (
  <svg
    width={width}
    height={width * 0.62}
    viewBox="0 0 30 19"
    style={{display: 'block', margin: '-1px auto 0'}}
  >
    <path
      d="M1 1 C8 2 11 8 15 18 C19 8 22 2 29 1 Z"
      fill={paper}
      stroke="rgba(0,0,0,0.06)"
      strokeWidth={0.6}
    />
  </svg>
);

const PaperNote: React.FC<{
  a: HudAnchor;
  index: number;
  shot: Shot;
  act: Act;
  frame: number;
  fps: number;
  showAt: number;
  dx: number;
  dy: number;
  durFrames: number;
}> = ({a, index, shot, act, frame, fps, showAt, dx, dy, durFrames}) => {
  const local = frame - showAt * fps;
  if (local < 0) return null;

  const t = frame / fps;
  const band = bandOf(a.v);

  const whiteAct = act.id === 'act6';
  const paper = whiteAct ? '#1D1D1D' : '#EDE4D2';
  const ink = whiteAct ? '#F4F1EA' : '#1A1510';
  const meta = whiteAct ? '#B8B2A6' : '#6B5A3E';
  const bandInk = whiteAct ? BAND_INK[band].bright : BAND_INK[band].paperInk;

  // The number is the star of the frame, so the chip is deliberately oversized.
  const k = (a.s ?? 1) * BAND_SCALE[band] * CHIP_SCALE;
  const fontSize = 36 * k;

  const fallStart =
    shot.assetHandle === 'shopper' && shot.hudFall
      ? Math.max(showAt, 174.652 - shot.start)
      : showAt;
  const shown =
    a.to !== undefined && shot.hudFall
      ? a.v + (a.to - a.v) * clamp01((t - fallStart) / 0.7)
      : a.v;
  const figure = a.fmt === 'count' ? count(shown) : money(shown);

  // The director's instantiation flicker: 0 -> 0.8 -> 0.2 -> 1.0.
  const f = Math.floor(local);
  const flicker = f < 1 ? 0 : f < 2 ? 0.8 : f < 3 ? 0.2 : 1;
  const pop = clamp01(local / 7);

  // Fix #7: entrance pulse — the chip briefly scales up 12% when it lands,
  // then settles. On dense shots this sequential pulse is what makes the
  // reveal feel intentional rather than dumped.
  const entrancePulse = f >= 1 && f < 12
    ? 1 + 0.12 * Math.max(0, 1 - (local - 1) / 10)
    : 1;

  // Paper falls on the 12fps clock. The digits inside it never slow down.
  const fall = shot.hudFall
    ? clamp01(paperStep((t - fallStart) / Math.max(0.7, shot.duration - fallStart - 0.25)))
    : 0;
  const fallY = fall * fall * 150;
  const fallX = Math.sin(fall * 14 + index) * 14;
  const fallOpacity = 1 - clamp01((fall - 0.52) / 0.48);

  const tremor = band === 'danger' ? Math.sin(frame * 1.9) * 1.4 : 0;
  const rotate = ((index * 7) % 5) - 2 + (1 - pop) * 5 + fall * 18;

  const x = a.x;
  const y = a.y;

  // The note hovers over the crown; it never lands on the hair. Anchoring the
  // block by its tail tip keeps that gap the same at every chip size.
  const HOVER = 10;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform:
          `translate(-50%, -100%) translateY(${-HOVER + fallY + dy}px) translateX(${tremor + fallX + dx}px) ` +
          `rotate(${rotate}deg) scale(${(0.86 + pop * 0.14 + (1 - pop) * 0.06) * entrancePulse})`,
        opacity: flicker * fallOpacity,
        filter: 'drop-shadow(4px 8px 6px rgba(10,8,6,0.42))',
        zIndex: 30,
        transformOrigin: '50% 100%',
      }}
    >
      <div
        style={{
          position: 'relative',
          background: paper,
          color: ink,
          padding: `${6 * k}px ${14 * k}px ${8 * k}px`,
          borderRadius: 2,
          clipPath:
            'polygon(0 4%, 2% 0, 98% 1%, 100% 6%, 99% 94%, 100% 100%, 1% 98%, 0 92%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: -4,
            width: 34 * k,
            height: 8 * k,
            transform: 'translateX(-50%) rotate(-2deg)',
            background: whiteAct ? 'rgba(220,214,200,0.28)' : 'rgba(214,198,166,0.55)',
            mixBlendMode: 'multiply',
          }}
        />

        {a.label ? (
          <div
            style={{
              fontFamily: mono.fontFamily,
              fontSize: 9 * k,
              fontWeight: 700,
              letterSpacing: '0.26em',
              color: meta,
              textAlign: 'center',
              lineHeight: 1,
              marginBottom: 1 * k,
            }}
          >
            {a.label}
          </div>
        ) : null}

        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            fontFamily: caveat.fontFamily,
            fontWeight: 700,
            fontSize,
            lineHeight: 0.96,
            color: bandInk,
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{visibility: 'hidden'}}>{figure}</span>
          <span
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              textAlign: 'center',
            }}
          >
            {figure}
          </span>
          <div
            style={{
              marginTop: 2 * k,
              height: 1.5 * k,
              width: '82%',
              marginLeft: '9%',
              background: bandInk,
              opacity: band === 'danger' ? 0.65 : 0.28,
              borderRadius: 1,
            }}
          />
        </div>
      </div>

      <NoteTail paper={paper} width={24 * k} />

      {/* Fix #7: thin connection line — draws from the tail down toward the
          character's head, making the chip feel *attached* to a person rather
          than floating randomly. Fades in after the flicker. */}
      {pop > 0.3 && !shot.hudFall ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            width: 1,
            height: `${clamp01((pop - 0.3) / 0.5) * 28}px`,
            transform: 'translateX(-50%) translateY(100%)',
            background: `linear-gradient(to bottom, ${bandInk}55, transparent)`,
          }}
        />
      ) : null}
    </div>
  );
};

export const BalanceHUD: React.FC<{
  shot: Shot;
  act: Act;
  durFrames: number;
}> = ({shot, act, durFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (shot.hudAnchors.length === 0) return null;

  const cues = cueTimes(shot, fps);
  const letterbox = act.id === 'act4' || act.id === 'act5';

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {shot.hudAnchors.map((a, i) => {
        const figure = a.fmt === 'count' ? count(a.v) : money(a.v);
        const k = (a.s ?? 1) * BAND_SCALE[bandOf(a.v)] * CHIP_SCALE;
        const placed = placeChip({
          text: figure,
          k,
          xPct: a.x,
          yPct: a.y,
          letterbox,
          label: !!a.label,
        });
        const wait = blockedUntil(shot, act, placed.box);
        const showAt = Math.max(cues[i], wait);
        if (showAt > shot.duration - 0.28) return null;
        return (
          <PaperNote
            key={`${a.x}-${a.y}-${i}`}
            a={a}
            index={i}
            shot={shot}
            act={act}
            frame={frame}
            fps={fps}
            showAt={showAt}
            dx={placed.dx}
            dy={placed.dy}
            durFrames={durFrames}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * When a chip may appear, in seconds from the shot start.
 * The title card, a text card in the middle, and the print pile all
 * own their rectangle. A balance waits them out instead of sitting on them.
 */
function blockedUntil(shot: Shot, act: Act, box: Box): number {
  let wait = 0;
  if (TITLE_ACTS.has(act.id)) {
    wait = Math.max(0, ACT_TITLE_SEC - (shot.start - act.start));
  }

  const cards = photoStackFor(act);
  if (cards.length > 0 && intersects(box, stackVisualRect())) {
    const gone = cards[cards.length - 1].end + OVERLAY_TAIL - (shot.start - act.start);
    if (gone > 0) wait = Math.max(wait, gone);
  }

  const tokens = ownerTokensFor(act);
  if (tokens.length > 0 && intersects(box, tokenVisualRect())) {
    const gone = tokens[tokens.length - 1].end + OVERLAY_TAIL - (shot.start - act.start);
    if (gone > 0) wait = Math.max(wait, gone);
  }

  for (const cue of overlaysForShot(shot, act)) {
    if (cue.asset?.startsWith('overlay/')) continue;
    if (!intersects(box, textCardRect(cue.kind))) continue;
    wait = Math.max(wait, cue.end + OVERLAY_TAIL);
  }

  return wait;
}
