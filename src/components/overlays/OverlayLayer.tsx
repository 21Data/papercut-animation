import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {loadFont as loadCaveat} from '@remotion/google-fonts/Caveat';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {interpolatePath} from '@remotion/paths';
import type {Act, Shot} from '../../lib/data';
import {
  overlayPalette,
  seriesFor,
  visibleOverlays,
  type GlyphName,
  type OverlayCue,
  type OverlayPalette,
  type OverlayValue,
} from '../../lib/overlays';
import {TEXT_SCALE, linger} from '../../lib/stage';
import {Glyph} from './Glyphs';

const caveat = loadCaveat('normal', {weights: ['400', '700'], subsets: ['latin']});
const inter = loadInter('normal', {weights: ['400', '600', '700', '800'], subsets: ['latin']});
const mono = loadMono();

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const paperStep = (t: number) => Math.floor(t * 12) / 12;

const TORN =
  'polygon(0 2%, 1.4% 0.4%, 99% 0, 100% 3%, 99.2% 97%, 100% 100%, 0.8% 99.2%, 0 96%)';
const TORN_BOTTOM =
  'polygon(0 0, 100% 0, 100% 94%, 97% 97%, 94% 94.5%, 91% 98%, 88% 95%, 85% 98.5%, 82% 95%, 79% 98%, 76% 95.2%, 73% 98%, 70% 95%, 67% 98%, 64% 95%, 61% 98%, 58% 95%, 55% 98%, 52% 95%, 49% 98%, 46% 95%, 43% 98%, 40% 95%, 37% 98%, 34% 95%, 31% 98%, 28% 95%, 25% 98%, 22% 95%, 19% 98%, 16% 95%, 13% 98%, 10% 95%, 7% 98%, 4% 95%, 1% 98%, 0 95%)';

const SHADOW = 'drop-shadow(8px 16px 18px rgba(8,8,12,0.45))';

// A receipt is torn off a roll, so both ends are ragged and the sides are not.
const RECEIPT_TEAR = (() => {
  const steps = 26;
  const amp = 1.6;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = ((i / steps) * 100).toFixed(2);
    points.push(`${x}% ${i % 2 === 0 ? 0 : amp}%`);
  }
  for (let i = steps; i >= 0; i--) {
    const x = ((i / steps) * 100).toFixed(2);
    points.push(`${x}% ${i % 2 === 0 ? 100 : 100 - amp}%`);
  }
  return `polygon(${points.join(', ')})`;
})();

const Kicker: React.FC<{text: string; color: string}> = ({text, color}) => (
  <div
    style={{
      fontFamily: mono.fontFamily,
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color,
      opacity: 0.85,
    }}
  >
    {text}
  </div>
);

const Tape: React.FC<{left?: number | string; top?: number; rotate?: number; width?: number}> = ({
  left = '50%',
  top = -12,
  rotate = -3,
  width = 96,
}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width,
      height: 26,
      transform: `translateX(-50%) rotate(${rotate}deg)`,
      background: 'rgba(226,214,186,0.62)',
      borderLeft: '1px solid rgba(255,255,255,0.35)',
      borderRight: '1px solid rgba(0,0,0,0.08)',
      mixBlendMode: 'multiply',
    }}
  />
);

const Punch: React.FC<{color: string; left?: number | string; top?: number}> = ({
  color,
  left = '50%',
  top = 18,
}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width: 14,
      height: 14,
      borderRadius: 8,
      transform: 'translateX(-50%)',
      background: 'rgba(20,16,12,0.34)',
      boxShadow: `inset 0 1px 2px ${color}44`,
    }}
  />
);

const Scrim: React.FC<{color: string; opacity: number; white: boolean}> = ({
  color,
  opacity,
  white,
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at center, ${color}${white ? '' : 'ff'} 0%, ${color} 100%)`,
      opacity,
    }}
  />
);

/** 0 while the card is fully up (including the hold), then eases to 1. */
const exitOf = (frame: number, fps: number, end: number) => 1 - linger(frame / fps, end);

const useEntry = (frame: number, fps: number, startFrame: number, distance = 120, rotate = 0) => {
  const local = Math.max(0, frame - startFrame);
  const s = spring({frame: local, fps, config: {damping: 17, stiffness: 150, mass: 0.8}});
  return {
    s,
    opacity: clamp01(s * 1.15),
    x: (1 - s) * distance,
    y: (1 - s) * 26,
    rotate: (1 - s) * rotate,
  };
};

/* ------------------------------------------------------------------ slam */

const Slam: React.FC<{cue: OverlayCue; pal: OverlayPalette; frame: number; fps: number}> = ({
  cue,
  pal,
  frame,
  fps,
}) => {
  const local = Math.max(0, frame - cue.start * fps);
  const s = spring({frame: local, fps, config: {damping: 13, stiffness: 210, mass: 0.55}});
  const exit = exitOf(frame, fps, cue.end);
  const words = cue.title.trim().split(/\s+/).filter(Boolean);
  const last = words.pop() ?? '';

  return (
    <div
      style={{
        position: 'relative',
        width: 1320,
        maxWidth: '100%',
        transform: `translateY(${(1 - s) * 80}px) scale(${TEXT_SCALE * (1.16 - 0.16 * s)}) rotate(${-1.4 + (1 - s) * 5}deg)`,
        transformOrigin: 'center center',
        opacity: clamp01(s * 1.2) * (1 - exit),
        filter: SHADOW,
      }}
    >
      <div
        style={{
          position: 'relative',
          background: pal.paper,
          color: pal.ink,
          clipPath: TORN,
          padding: '48px 64px 52px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
        }}
      >
        <div
          style={{
            fontFamily: inter.fontFamily,
            fontSize: 74,
            fontWeight: 800,
            lineHeight: 0.98,
            letterSpacing: '-0.035em',
          }}
        >
          {words.join(' ')}
          {words.length && last ? ' ' : ''}
          {last ? (
            <span
              style={{
                backgroundImage: `linear-gradient(transparent 64%, ${pal.accent} 64%, ${pal.accent} 92%, transparent 92%)`,
                paddingBottom: 2,
              }}
            >
              {last}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ note */

const Note: React.FC<{cue: OverlayCue; pal: OverlayPalette; frame: number; fps: number}> = ({
  cue,
  pal,
  frame,
  fps,
}) => {
  const local = frame - cue.start * fps;
  const stepped = paperStep(Math.max(0, local) / fps);

  // The director's 3-frame flicker: paper does not fade in, it is dropped.
  const flicker = local < 2 ? [0, 0.8][local] : local < 4 ? 0.2 : 1;
  const settle = clamp01(stepped / 0.25);
  const exit = exitOf(frame, fps, cue.end);

  const rotate = cue.seed % 2 === 0 ? -2.2 : 1.8;

  return (
    <div
      style={{
        position: 'relative',
        width: 520,
        maxWidth: '100%',
        transform: `rotate(${rotate}deg) translateY(${(1 - settle) * 12}px) scale(${TEXT_SCALE})`,
        transformOrigin: 'center center',
        opacity: (flicker ?? 1) * (1 - exit),
        filter: SHADOW,
      }}
    >
        <div
          style={{
            position: 'relative',
            background: pal.paper,
            color: pal.ink,
            clipPath: TORN_BOTTOM,
            padding: '28px 32px 36px',
          }}
        >
          <div
            style={{
              fontFamily: caveat.fontFamily,
              fontWeight: 700,
              fontSize: 44,
              lineHeight: 1.08,
            }}
          >
            {cue.title}
          </div>
        </div>
    </div>
  );
};

/* ----------------------------------------------------------------- glyph */

const GlyphCard: React.FC<{
  cue: OverlayCue;
  pal: OverlayPalette;
  frame: number;
  fps: number;
  bare?: boolean;
}> = ({cue, pal, frame, fps, bare}) => {
  const side = cue.align === 'left' ? -1 : 1;
  const e = useEntry(frame, fps, cue.start * fps, 150 * side, 2.5 * side);
  const exit = exitOf(frame, fps, cue.end);
  const draw = clamp01((frame / fps - cue.start - 0.12) / 0.85);

  return (
    <div
      style={{
        position: 'relative',
        width: 500,
        maxWidth: '100%',
        transform: `translateX(${e.x}px) translateY(${e.y}px) rotate(${e.rotate}deg) scale(${TEXT_SCALE})`,
        transformOrigin: 'center center',
        opacity: e.opacity * (1 - exit),
        filter: SHADOW,
      }}
    >
      <div
        style={{
          position: 'relative',
          background: pal.paper,
          color: pal.ink,
          clipPath: TORN,
          padding: '30px 30px 28px',
        }}
      >
        <Punch color={pal.ink} />
        {bare ? null : <Kicker text={cue.kicker} color={pal.meta} />}
        <div style={{margin: '16px 0 8px', marginLeft: -6}}>
          <Glyph
            name={cue.glyph}
            color={pal.ink}
            accent={pal.accent}
            progress={draw}
            size={176}
            strokeWidth={3.2}
          />
        </div>
        <div
          style={{
            fontFamily: inter.fontFamily,
            fontSize: 42,
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: '-0.025em',
          }}
        >
          {cue.title}
        </div>
        {cue.copy && !bare ? (
          <div
            style={{
              marginTop: 12,
              fontFamily: inter.fontFamily,
              fontSize: 19,
              fontWeight: 400,
              lineHeight: 1.35,
              opacity: 0.74,
            }}
          >
            {cue.copy}
          </div>
        ) : null}
        {bare ? null : (
        <div
          style={{
            marginTop: 18,
            paddingTop: 12,
            borderTop: `1px solid ${pal.ink}22`,
            fontFamily: mono.fontFamily,
            fontSize: 12,
            letterSpacing: '0.16em',
            color: pal.meta,
          }}
        >
          {cue.glyph.toUpperCase()} / {cue.kicker.split('—')[0].trim()}
        </div>
        )}
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------- stock */

const StockCard: React.FC<{cue: OverlayCue; pal: OverlayPalette; frame: number; fps: number}> = ({
  cue,
  pal,
  frame,
  fps,
}) => {
  const side = cue.align === 'left' ? -1 : 1;
  const e = useEntry(frame, fps, cue.start * fps, 170 * side, 3 * side);
  const e2 = useEntry(frame, fps, cue.start * fps + 5, 90 * side, -4);
  const exit = exitOf(frame, fps, cue.end);
  const pos = cue.focus ?? `${20 + (cue.seed % 55)}% ${25 + (cue.seed % 35)}%`;

  return (
    <div
      style={{
        position: 'relative',
        width: 620,
        height: 500,
        transform: `translateX(${e.x * 0.45}px) translateY(${e.y}px) scale(${TEXT_SCALE})`,
        transformOrigin: 'center center',
        opacity: e.opacity * (1 - exit),
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 8,
          top: 36,
          width: 560,
          transform: `rotate(${-3.2 + e2.rotate * 0.25}deg)`,
          filter: SHADOW,
        }}
      >
        <div style={{background: pal.paper, padding: 12}}>
          <Img
            src={staticFile(cue.asset ?? '')}
            style={{width: '100%', height: 300, objectFit: 'cover', objectPosition: pos}}
          />
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 36,
          top: 0,
          width: 560,
          transform: `rotate(${1.2 * side}deg)`,
          filter: SHADOW,
        }}
      >
        <div style={{position: 'relative', background: pal.paper, padding: 14}}>
          <Img
            src={staticFile(cue.asset ?? '')}
            style={{width: '100%', height: 318, objectFit: 'cover', objectPosition: pos}}
          />
          <div style={{padding: '16px 8px 6px'}}>
            <Kicker text={cue.kicker} color={pal.meta} />
            <div
              style={{
                marginTop: 8,
                fontFamily: inter.fontFamily,
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: pal.ink,
                lineHeight: 1.05,
              }}
            >
              {cue.title}
            </div>
          </div>
          <Tape left="72%" top={-14} rotate={5} width={80} />
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------- split */

const Split: React.FC<{cue: OverlayCue; pal: OverlayPalette; frame: number; fps: number}> = ({
  cue,
  pal,
  frame,
  fps,
}) => {
  const e = useEntry(frame, fps, cue.start * fps, 0, 0);
  const left = spring({
    frame: Math.max(0, frame - cue.start * fps),
    fps,
    config: {damping: 19, stiffness: 130, mass: 0.9},
  });
  const right = spring({
    frame: Math.max(0, frame - cue.start * fps - 5),
    fps,
    config: {damping: 19, stiffness: 130, mass: 0.9},
  });
  const exit = exitOf(frame, fps, cue.end);
  const seam = clamp01((frame / fps - cue.start - 0.1) / 0.5);

  const [a, b] = [
    cue.values[0] ?? {label: 'PERCEIVED', value: '—'},
    cue.values[1] ?? {label: 'ACTUAL', value: '—'},
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: 1280,
        height: 520,
        maxWidth: '100%',
        opacity: e.opacity * (1 - exit),
        transform: `scale(${TEXT_SCALE})`,
        transformOrigin: 'center center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '6%',
          left: '3%',
          width: '44%',
          transform: `translateX(${(1 - clamp01(left)) * -70}%) rotate(-1.4deg)`,
          filter: SHADOW,
        }}
      >
        <div
          style={{
            position: 'relative',
            background: pal.paper,
            color: pal.ink,
            clipPath: TORN,
            padding: '28px 28px 26px',
            minHeight: 340,
          }}
        >
          <svg viewBox="0 0 120 130" width={168} height={182} style={{display: 'block', margin: '0 auto'}}>
            <path
              d="M60 8 C86 8 104 28 104 54 C104 78 90 96 74 104 L78 122 H42 L46 104 C30 96 16 78 16 54 C16 28 34 8 60 8 Z"
              fill={pal.paper}
              stroke={pal.ink}
              strokeWidth={2.4}
            />
            <circle cx={46} cy={56} r={4} fill={pal.ink} />
            <circle cx={74} cy={56} r={4} fill={pal.ink} />
            <path d="M48 76 Q60 84 72 76" fill="none" stroke={pal.ink} strokeWidth={2.2} strokeLinecap="round" />
            <path d="M104 40 L112 28 L108 54 Z" fill={pal.accent} />
          </svg>
          <div
            style={{
              marginTop: 8,
              fontFamily: caveat.fontFamily,
              fontWeight: 700,
              fontSize: 36,
              lineHeight: 1.05,
              textAlign: 'center',
            }}
          >
            {a.label}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '6%',
          right: '3%',
          width: '44%',
          transform: `translateX(${(1 - clamp01(right)) * 70}%) rotate(1.5deg)`,
          filter: SHADOW,
        }}
      >
        <div
          style={{
            background: '#EDE4D2',
            color: '#171310',
            clipPath: RECEIPT_TEAR,
            padding: '32px 28px 36px',
            minHeight: 340,
          }}
        >
          <div
            style={{
              fontFamily: mono.fontFamily,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.18em',
              borderBottom: '2px solid #171310',
              paddingBottom: 8,
            }}
          >
            STATEMENT
          </div>
          <div
            style={{
              marginTop: 22,
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
            }}
          >
            <span style={{fontFamily: inter.fontFamily, fontSize: 18, fontWeight: 600}}>{b.label}</span>
            <span style={{flex: 1, borderBottom: '1px dotted #17131088'}} />
            <span style={{fontFamily: mono.fontFamily, fontSize: 18, fontWeight: 700}}>{b.value}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '8%',
          height: '76%',
          width: 16,
          transform: 'translateX(-50%)',
          background: pal.accent,
          clipPath:
            'polygon(55% 0, 80% 6%, 30% 14%, 85% 24%, 25% 36%, 90% 48%, 20% 60%, 78% 72%, 35% 84%, 70% 100%, 10% 100%, 0 86%, 28% 70%, 0 52%, 24% 34%, 0 16%)',
          opacity: 0.35 + seam * 0.65,
          zIndex: 4,
        }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ drag */

const Drag: React.FC<{cue: OverlayCue; pal: OverlayPalette; frame: number; fps: number}> = ({
  cue,
  pal,
  frame,
  fps,
}) => {
  const local = frame / fps - cue.start;
  const grab = EASE(clamp01((local - 0.2) / 0.45));
  const rise = useEntry(frame, fps, cue.start * fps, 0, 0);
  const exit = exitOf(frame, fps, cue.end);
  const statement = cue.copy ?? cue.title;

  return (
    <div
      style={{
        position: 'relative',
        width: 1180,
        height: 460,
        maxWidth: '100%',
        transform: `translateY(${(1 - rise.s) * 50}px) scale(${TEXT_SCALE * (0.97 + rise.s * 0.03)})`,
        transformOrigin: 'center center',
        opacity: rise.opacity * (1 - exit),
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '8%',
          right: '6%',
          top: 24,
          bottom: 16,
          background: '#EDE4D2',
          color: '#171310',
          clipPath: RECEIPT_TEAR,
          padding: '36px 40px',
          filter: SHADOW,
        }}
      >
        <div
          style={{
            fontFamily: mono.fontFamily,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.18em',
            borderBottom: '2px solid #171310',
            paddingBottom: 8,
          }}
        >
          STATEMENT
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: inter.fontFamily,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            maxWidth: '70%',
          }}
        >
          {statement}
        </div>
        {cue.values.length > 0 ? (
          <div style={{marginTop: 22}}>
            {cue.values.slice(0, 3).map((v) => (
              <div
                key={`${v.label}-${v.value}`}
                style={{display: 'flex', gap: 8, alignItems: 'baseline', marginTop: 10}}
              >
                <span style={{fontFamily: mono.fontFamily, fontSize: 13, letterSpacing: '0.08em'}}>{v.label}</span>
                <span style={{flex: 1, borderBottom: '1px dotted #17131066'}} />
                <span style={{fontFamily: mono.fontFamily, fontSize: 16, fontWeight: 700}}>{v.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: 'absolute',
          inset: '0 4% 0 4%',
          background: pal.paper,
          color: pal.ink,
          clipPath: TORN,
          padding: '42px 48px',
          transform: `translateX(${-58 * grab}%)`,
          filter: SHADOW,
        }}
      >
        <div
          style={{
            fontFamily: inter.fontFamily,
            fontSize: 54,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
            maxWidth: '78%',
          }}
        >
          {cue.title}
        </div>
        <svg
          viewBox="0 0 150 110"
          width={168}
          height={124}
          style={{
            position: 'absolute',
            left: -36,
            top: '34%',
            filter: SHADOW,
          }}
        >
          <path
            d="M18 48 C18 34 30 28 40 32 L52 38 L50 16 C50 8 60 6 62 16 L64 40 L70 12 C72 4 82 4 82 14 L78 44 L90 22 C94 14 106 16 102 28 L92 50 C108 58 112 74 100 88 C84 106 52 108 32 96 C14 84 8 64 18 48 Z"
            fill="#E4D2B0"
            stroke="#1C140E"
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          <path d="M62 16 L64 28" fill="none" stroke={pal.accent} strokeWidth={3} strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

/* --------------------------------------------------------------- receipt */

/** A bill prints money to the cent, never as "$880K". */
const exact = (n: number) =>
  '$' +
  n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

const centsOf = (s: string | undefined): number => {
  if (!s) return 0;
  const scale = /k$/i.test(s) ? 1e3 : /m$/i.test(s) ? 1e6 : 1;
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * scale * 100) : 0;
};

/** The cold-open check. These five lines are the only meal in the film, and they sum to $43.18. */
const COLD_BILL: OverlayValue[] = [
  {label: 'SOUP', value: '$9.00'},
  {label: 'GREENS', value: '$7.50'},
  {label: 'WINE', value: '$18.00'},
  {label: 'ESPRESSO', value: '$4.50'},
  {label: 'BREAD', value: '$4.18'},
];

const CANDLE = '#E8B04B';

/**
 * The cold open is a guest check. Everywhere else this stock is a statement:
 * the same torn roll, and not a bill.
 */
function receiptFor(cue: OverlayCue, shot: Shot, bill: boolean): {rows: OverlayValue[]; total: string} {
  if (bill) return {rows: COLD_BILL, total: '$43.18'};

  if (cue.values.length >= 1) {
    const rows = cue.values.slice(0, 7).map((v, i) => {
      const a = shot.hudAnchors[i];
      return a ? {label: v.label, value: exact(a.to ?? a.v)} : v;
    });
    const cents = rows.reduce((sum, r) => sum + centsOf(r.value), 0);
    const total = rows.length === 1 ? rows[0].value : exact(cents / 100);
    return {rows, total};
  }

  const line = cue.title.trim();
  return {rows: line ? [{label: line, value: ''}] : [], total: ''};
}

const Receipt: React.FC<{
  cue: OverlayCue;
  pal: OverlayPalette;
  frame: number;
  fps: number;
  shot: Shot;
  bill: boolean;
}> = ({cue, pal, frame, fps, shot, bill}) => {
  const local = frame / fps - cue.start;
  const unroll = clamp01(paperStep(local) / 0.55);
  const exit = exitOf(frame, fps, cue.end);
  const ink = bill ? '#171310' : pal.ink;
  const paper = bill ? '#EDE4D2' : pal.paper;

  const {rows, total} = receiptFor(cue, shot, bill);

  return (
    <div
      style={{
        position: 'relative',
        width: 480,
        maxWidth: '100%',
        transform: `rotate(${cue.align === 'left' ? -1.6 : 1.8}deg) scale(${TEXT_SCALE})`,
        transformOrigin: 'center center',
        opacity: 1 - exit,
        filter: SHADOW,
      }}
    >
      <div style={{clipPath: `inset(0 0 ${(1 - unroll) * 100}% 0)`}}>
      <div
        style={{
          background: paper,
          color: ink,
          padding: '34px 30px 42px',
          clipPath: RECEIPT_TEAR,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            paddingBottom: 10,
            borderBottom: `2px solid ${ink}`,
          }}
        >
          <div
            style={{
              fontFamily: mono.fontFamily,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.16em',
            }}
          >
            {bill ? 'GUEST CHECK' : 'STATEMENT'}
          </div>
        </div>

        <div style={{marginTop: 16}}>
          {rows.map((r, i) => {
            const at = paperStep(Math.max(0, local - 0.25 - i * 0.09));
            const shown = at > 0 ? 1 : 0;
            return (
              <div
                key={`${r.label}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  marginBottom: 12,
                  opacity: shown,
                }}
              >
                <span
                  style={{
                    fontFamily: inter.fontFamily,
                    fontSize: 17,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    maxWidth: 220,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.label}
                </span>
                <span
                  style={{
                    flex: 1,
                    borderBottom: `1px dotted ${ink}55`,
                    transform: 'translateY(-4px)',
                  }}
                />
                {r.value ? (
                  <span
                    style={{
                      fontFamily: mono.fontFamily,
                      fontSize: 15,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.value}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {total ? (
          <div
            style={{
              marginTop: 18,
              paddingTop: 12,
              borderTop: `2px solid ${ink}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span style={{fontFamily: mono.fontFamily, fontSize: 12, letterSpacing: '0.16em'}}>
              TOTAL
            </span>
            <span style={{fontFamily: mono.fontFamily, fontSize: 22, fontWeight: 700}}>{total}</span>
          </div>
        ) : null}

        {bill ? (
          <div style={{marginTop: 26, display: 'flex', justifyContent: 'center'}}>
            <div
              style={{
                transform: `rotate(-8deg) scale(${clamp01((local - 0.7) / 0.18)})`,
                background: CANDLE,
                color: '#2A1608',
                padding: '7px 16px',
                fontFamily: mono.fontFamily,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '0.22em',
                boxShadow: `0 0 22px ${CANDLE}`,
              }}
            >
              VISIBLE
            </div>
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------- chart */

const TICKER_TEAR =
  'polygon(0 8%, 1.2% 0, 2.4% 10%, 3.6% 0, 4.8% 9%, 6% 0, 94% 0, 95.2% 8%, 96.4% 0, 97.6% 10%, 98.8% 0, 100% 8%, 100% 92%, 98.8% 100%, 97.6% 90%, 96.4% 100%, 95.2% 92%, 94% 100%, 6% 100%, 4.8% 91%, 3.6% 100%, 2.4% 90%, 1.2% 100%, 0 92%)';

const Chart: React.FC<{cue: OverlayCue; pal: OverlayPalette; frame: number; fps: number; shot: Shot}> = ({
  cue,
  pal,
  frame,
  fps,
  shot,
}) => {
  const exit = exitOf(frame, fps, cue.end);
  const series = seriesFor(shot);
  const travel = clamp01((frame / fps - cue.start) / 1.15);
  const shown = lerp(series[0], series[series.length - 1], travel);
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = Math.max(1e-6, max - min);
  const W = 420;
  const H = 64;
  const pts = series.map((v, i) => {
    const x = 8 + (i / Math.max(1, series.length - 1)) * (W - 16);
    const y = 8 + (1 - (v - min) / span) * (H - 16);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  const abs = Math.abs(shown);
  const figure =
    abs >= 1_000_000
      ? `${shown < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(2)}M`
      : abs >= 1000
        ? `${shown < 0 ? '-' : ''}$${abs.toLocaleString('en-US', {maximumFractionDigits: 0})}`
        : `${shown < 0 ? '-' : ''}$${abs.toFixed(2)}`;

  return (
    <div
      style={{
        width: 1180,
        opacity: 1 - exit,
        filter: SHADOW,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          background: pal.paper,
          color: pal.ink,
          clipPath: TICKER_TEAR,
          padding: '16px 36px',
        }}
      >
        <div
          style={{
            fontFamily: mono.fontFamily,
            fontWeight: 700,
            fontSize: 42,
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
            minWidth: 280,
          }}
        >
          {figure}
        </div>
        <svg width={420} height={64} viewBox={`0 0 ${W} ${H}`}>
          <path d={pts.join(' ')} fill="none" stroke={pal.ink} strokeWidth={3} strokeLinejoin="round" />
          <circle
            cx={8 + travel * (W - 16)}
            cy={8 + (1 - (shown - min) / span) * (H - 16)}
            r={5}
            fill={pal.accent}
          />
        </svg>
        <div
          style={{
            marginLeft: 'auto',
            fontFamily: mono.fontFamily,
            fontSize: 13,
            letterSpacing: '0.16em',
            color: pal.accent,
          }}
        >
          {cue.title.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------- morph */

const BASE: Record<GlyphName, string> = {
  coin: 'M50 10 C72 10 90 28 90 50 C90 72 72 90 50 90 C28 90 10 72 10 50 C10 28 28 10 50 10 Z',
  receipt:
    'M30 12 C42 12 62 12 72 12 C72 34 72 58 72 78 C66 80 62 82 60 84 C56 82 52 80 50 84 C46 82 42 80 38 84 C34 82 32 80 30 78 C30 58 30 34 30 12 Z',
  eye: 'M8 50 C26 26 74 26 92 50 C74 74 26 74 8 50 C26 50 74 50 92 50 C74 50 26 50 8 50 Z',
  house:
    'M12 46 C24 36 38 26 50 16 C62 26 76 36 88 46 C72 46 58 46 50 46 C42 46 28 46 12 46 Z',
  car:
    'M12 62 C18 58 22 50 28 50 C38 50 54 50 64 50 C72 50 78 56 84 62 C72 68 56 70 46 70 C34 70 20 68 12 62 Z',
  watch:
    'M50 28 C62 28 72 38 72 50 C72 62 62 72 50 72 C38 72 28 62 28 50 C28 38 38 28 50 28 Z',
  scale:
    'M18 34 C30 42 38 46 50 46 C62 46 70 42 82 34 C74 42 66 50 62 58 C58 50 54 46 50 46 C46 46 42 50 38 58 C34 50 26 42 18 34 Z',
  bubble:
    'M20 20 C40 20 60 20 80 20 C80 38 80 50 80 60 C64 62 48 62 36 62 C30 74 26 78 22 80 C24 70 24 66 22 62 C20 52 20 32 20 20 Z',
  hand:
    'M30 52 C30 42 34 38 40 38 C48 38 60 38 68 38 C76 38 80 44 80 50 C80 70 68 88 52 88 C38 88 26 78 26 66 C26 58 30 54 30 52 Z',
  bulb:
    'M50 14 C66 14 78 26 78 42 C78 52 72 58 66 64 C62 70 60 76 58 80 C52 80 48 80 42 80 C40 76 38 70 34 64 C28 58 22 52 22 42 C22 26 34 14 50 14 Z',
  lock:
    'M30 44 C34 32 40 26 50 26 C60 26 66 32 70 44 C70 56 70 70 70 82 C58 82 42 82 30 82 C30 70 30 56 30 44 Z',
  chart:
    'M16 30 C30 42 38 40 46 46 C54 52 62 54 70 60 C76 64 82 70 86 76 C70 74 54 72 42 72 C30 72 22 72 16 72 C16 60 16 42 16 30 Z',
  toggle:
    'M18 32 C36 32 64 32 82 32 C90 32 94 37 94 44 C94 51 90 56 82 56 C64 56 36 56 18 56 C10 56 6 51 6 44 C6 37 10 32 18 32 Z',
  chair:
    'M24 54 C36 54 64 54 76 54 C76 64 76 74 76 84 C62 84 38 84 24 84 C24 74 24 64 24 54 Z',
  lamp:
    'M28 18 C42 18 58 18 72 18 C76 30 80 40 84 48 C64 48 36 48 16 48 C20 40 24 30 28 18 Z',
  token:
    'M50 12 C62 18 74 24 82 30 C82 44 82 56 82 68 C70 74 60 80 50 86 C40 80 30 74 18 68 C18 56 18 44 18 30 C26 24 38 18 50 12 Z',
  gate:
    'M16 88 C24 60 24 44 16 32 C30 22 70 22 84 32 C76 44 76 60 84 88 C62 88 38 88 16 88 Z',
  guard:
    'M32 88 C32 58 34 48 50 46 C66 48 68 58 68 88 C56 88 44 88 32 88 Z',
  briefcase:
    'M12 40 C36 40 64 40 88 40 C88 54 88 70 88 84 C62 84 38 84 12 84 C12 70 12 54 12 40 Z',
  bank: 'M50 12 C68 20 80 28 90 34 C64 34 36 34 10 34 C20 28 32 20 50 12 Z',
  building:
    'M26 90 C26 66 26 38 26 14 C42 14 58 14 74 14 C74 38 74 66 74 90 C58 90 42 90 26 90 Z',
  phone:
    'M32 8 C44 8 56 8 68 8 C72 8 74 11 74 15 C74 40 74 62 74 85 C74 89 72 92 68 92 C56 92 44 92 32 92 C28 92 26 89 26 85 C26 62 26 40 26 15 C26 11 28 8 32 8 Z',
};

const MORPH_TO: Record<GlyphName, GlyphName> = {
  coin: 'eye',
  receipt: 'phone',
  eye: 'lock',
  house: 'lock',
  car: 'coin',
  watch: 'eye',
  scale: 'coin',
  bubble: 'eye',
  hand: 'coin',
  bulb: 'coin',
  lock: 'eye',
  chart: 'coin',
  toggle: 'token',
  chair: 'house',
  lamp: 'bulb',
  token: 'eye',
  gate: 'lock',
  guard: 'eye',
  briefcase: 'coin',
  bank: 'house',
  building: 'lock',
  phone: 'eye',
};

const MorphView: React.FC<{cue: OverlayCue; pal: OverlayPalette; frame: number; fps: number}> = ({
  cue,
  pal,
  frame,
  fps,
}) => {
  const local = frame / fps - cue.start;
  const p = EASE(clamp01((local - 0.15) / 0.55));
  const exit = exitOf(frame, fps, cue.end);
  const to = MORPH_TO[cue.glyph];
  const d = interpolatePath(p, BASE[cue.glyph], BASE[to]);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 1 - exit,
        perspective: 900,
        transform: `scale(${TEXT_SCALE})`,
        transformOrigin: 'center center',
      }}
    >
      <div
        style={{
          transform: `rotateY(${(1 - p) * 16 - 8}deg) rotate(${(1 - p) * -4}deg)`,
          filter: 'drop-shadow(10px 20px 22px rgba(0,0,0,0.5))',
        }}
      >
        <svg width={430} height={430} viewBox="0 0 100 100" style={{overflow: 'visible'}}>
          <path
            d={d}
            fill={pal.paper}
            stroke={pal.ink}
            strokeWidth={2.6}
            strokeLinejoin="round"
          />
          <path
            d={d}
            fill="none"
            stroke={pal.accent}
            strokeWidth={1.2}
            strokeLinejoin="round"
            transform="translate(2.4 2.4)"
            opacity={0.8}
          />
          <path
            d="M50 38 C56 38 61 43 61 50 C61 57 56 62 50 62 C44 62 39 57 39 50 C39 43 44 38 50 38 Z"
            fill={pal.accent}
            opacity={to === 'eye' ? clamp01((p - 0.55) / 0.45) * 0.9 : 0}
          />
          <rect
            x={40}
            y={36}
            width={20}
            height={30}
            rx={1.5}
            fill={pal.accent}
            opacity={to === 'phone' ? clamp01((p - 0.62) / 0.38) : 0}
          />
        </svg>
      </div>

      {cue.title ? (
      <div style={{marginTop: 26, textAlign: 'center', maxWidth: 780}}>
        <div
          style={{
            fontFamily: inter.fontFamily,
            fontSize: 46,
            fontWeight: 800,
            color: pal.ink,
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
          }}
        >
          {cue.title}
        </div>
      </div>
      ) : null}
    </div>
  );
};

/* ---------------------------------------------------------------- switch */

const SwitchCard: React.FC<{cue: OverlayCue; pal: OverlayPalette; frame: number; fps: number}> = ({
  cue,
  pal,
  frame,
  fps,
}) => {
  const local = Math.max(0, frame - cue.start * fps);
  const settle = clamp01(paperStep(local / fps) / 0.3);
  const exit = exitOf(frame, fps, cue.end);
  return (
    <div
      style={{
        opacity: (local < 2 ? 0 : 1) * (1 - exit),
        transform: `scale(${TEXT_SCALE * (0.94 + 0.06 * settle)})`,
        filter: SHADOW,
      }}
    >
      <svg width={720} height={280} viewBox="0 0 360 140">
        <rect x={16} y={36} width={328} height={68} rx={34} fill="#141816" stroke="#E7DCC4" strokeWidth={4} />
        <rect x={176} y={46} width={156} height={48} rx={24} fill={pal.accent} />
        <circle cx={78} cy={70} r={38} fill="#E4D2B0" stroke="#1C140E" strokeWidth={3} />
      </svg>
    </div>
  );
};

const View: React.FC<{
  cue: OverlayCue;
  pal: OverlayPalette;
  frame: number;
  fps: number;
  shot: Shot;
  act: Act;
}> = ({cue, pal, frame, fps, shot, act}) => {
  switch (cue.kind) {
    case 'slam':
      return <Slam cue={cue} pal={pal} frame={frame} fps={fps} />;
    case 'note':
      return <Note cue={cue} pal={pal} frame={frame} fps={fps} />;
    case 'glyph':
      if (act.id === 'act7' && cue.glyph === 'toggle') {
        return <SwitchCard cue={cue} pal={pal} frame={frame} fps={fps} />;
      }
      return <GlyphCard cue={cue} pal={pal} frame={frame} fps={fps} bare={act.id === 'act6'} />;
    case 'stock':
      return <StockCard cue={cue} pal={pal} frame={frame} fps={fps} />;
    case 'split':
      return <Split cue={cue} pal={pal} frame={frame} fps={fps} />;
    case 'drag':
      return <Drag cue={cue} pal={pal} frame={frame} fps={fps} />;
    case 'receipt':
      return (
        <Receipt
          cue={cue}
          pal={pal}
          frame={frame}
          fps={fps}
          shot={shot}
          bill={act.id === 'cold_open' && shot.index === 1}
        />
      );
    case 'chart':
      return <Chart cue={cue} pal={pal} frame={frame} fps={fps} shot={shot} />;
    case 'morph':
      return <MorphView cue={cue} pal={pal} frame={frame} fps={fps} />;
    default:
      return null;
  }
};

export const OverlayLayer: React.FC<{shot: Shot; act: Act}> = ({shot, act}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;
  // Drawn plates are held by PhotoStack, on the act's clock. Everything else
  // stays mounted through the hold and the ease, so a card can leave instead
  // of being unmounted at full opacity.
  const cues = visibleOverlays(shot, act, time);
  if (cues.length === 0) return null;

  const pal = overlayPalette(act);
  const white = act.id === 'act6';
  const noir = act.id === 'act4' || act.id === 'act5';

  let scrim = 0;
  if (act.id !== 'act4') {
    for (const cue of cues) {
      const inn = EASE(clamp01((time - cue.start) / 0.4));
      const presence = inn * linger(time, cue.end);
      const amp = cue.intensity === 'takeover' ? 0.66 : cue.intensity === 'card' ? 0.52 : 0;
      scrim = Math.max(scrim, amp * presence);
    }
  }

  const band = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingTop: noir ? 124 : 56,
    paddingBottom: 168,
    paddingLeft: 72,
    paddingRight: 72,
    boxSizing: 'border-box' as const,
  };

  return (
    <>
      {scrim > 0 ? (
        <AbsoluteFill style={{zIndex: 22, pointerEvents: 'none'}}>
          <Scrim color={pal.scrim} opacity={scrim} white={white} />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{zIndex: 46, pointerEvents: 'none'}}>
        {cues.map((cue) => {
          const place =
            cue.kind === 'note'
              ? {...band, alignItems: 'flex-end' as const, paddingTop: 0, paddingBottom: 250}
              : cue.kind === 'chart'
                ? {...band, alignItems: 'flex-start' as const, paddingTop: 150, paddingBottom: 0}
                : band;
          return (
            <AbsoluteFill key={`${cue.kind}-${cue.start.toFixed(3)}`} style={place}>
              <View cue={cue} pal={pal} frame={frame} fps={fps} shot={shot} act={act} />
            </AbsoluteFill>
          );
        })}
      </AbsoluteFill>
    </>
  );
};

export {interpolate};
