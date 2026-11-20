import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import type {Act} from '../lib/data';

const inter = loadInter('normal', {weights: ['400', '700', '800'], subsets: ['latin']});
const mono = loadMono();

/**
 * A breathing room between acts.
 *
 * Three to five seconds of pure typography over the act's palette. The viewer
 * exhales, reorients, and walks into the next chapter knowing where they are.
 * Paper grain stays on top (PaperGrade is rendered globally), so this card
 * still lives inside the paper world.
 */

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const paperStep = (t: number) => Math.floor(t * 12) / 12;

const ACT_LABELS: Record<string, {number: string; title: string}> = {
  cold_open: {number: '', title: 'COLD OPEN'},
  rule: {number: '', title: 'THE RULE OF THIS WORLD'},
  act1: {number: '01', title: 'THE FIRST 24 HOURS'},
  act2: {number: '02', title: 'THE ETIQUETTE COLLAPSE'},
  act3: {number: '03', title: 'RELATIONSHIPS RE-SORT THEMSELVES'},
  act4: {number: '04', title: 'THE MARKET TURNS INSIDE OUT'},
  act5: {number: '05', title: "THE PREDATOR'S MARKET"},
  act6: {number: '06', title: 'WE DID THIS ALREADY'},
  act7: {number: '07', title: 'THE OPT-IN'},
  close: {number: '', title: 'CLOSE'},
};

/** Duration of the act title card in frames. */
export const ACT_TITLE_FRAMES = 150; // 2.5s at 60fps

export const ActTitle: React.FC<{act: Act}> = ({act}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const label = ACT_LABELS[act.id] ?? {number: '', title: act.title};

  // The card is opaque on the first frame and stays opaque until the sequence
  // ends. A fade here lets the next plate flash through the silence.
  const steppedT = paperStep(t);
  const enterP = clamp01(steppedT / 0.35);

  // Smooth scale for the number badge
  const scaleIn = EASE(clamp01(t / 0.55));

  // The horizontal rule draws itself
  const ruleW = EASE(clamp01((t - 0.25) / 0.6));

  // Line-by-line word reveal for the title
  const words = label.title.split(' ');
  const wordDelay = 0.08;

  const bg = act.color.bg;
  const accent = act.color.accent;
  const isLight = act.id === 'act6';
  const ink = isLight ? '#161616' : '#F4F1EA';
  const meta = isLight ? '#6F6A62' : 'rgba(244,241,234,0.5)';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - enterP) * 30}px) scale(${0.96 + scaleIn * 0.04})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
          maxWidth: 1560,
          padding: '0 80px',
          boxSizing: 'border-box',
        }}
      >
        {/* Act number badge */}
        {label.number ? (
          <div
            style={{
              fontFamily: mono.fontFamily,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.3em',
              color: accent,
              marginBottom: 22,
              opacity: clamp01((t - 0.12) / 0.3),
            }}
          >
            ACT {label.number}
          </div>
        ) : null}

        {/* Title words, staggered */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {words.map((word, i) => {
            const delay = 0.15 + i * wordDelay;
            const wordP = clamp01(paperStep(Math.max(0, t - delay)) / 0.2);
            return (
              <span
                key={`${word}-${i}`}
                style={{
                  fontFamily: inter.fontFamily,
                  fontSize: words.length > 3 ? 62 : 78,
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  lineHeight: 1.0,
                  color: ink,
                  opacity: wordP,
                  transform: `translateY(${(1 - wordP) * 10}px)`,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        {/* Horizontal rule */}
        <div
          style={{
            marginTop: 28,
            height: 2,
            width: `${ruleW * 180}px`,
            background: accent,
            opacity: 0.8,
          }}
        />

        {/* Timestamp */}
        <div
          style={{
            marginTop: 16,
            fontFamily: mono.fontFamily,
            fontSize: 13,
            letterSpacing: '0.2em',
            color: meta,
            opacity: clamp01((t - 0.6) / 0.3),
          }}
        >
          {formatTime(act.start)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

