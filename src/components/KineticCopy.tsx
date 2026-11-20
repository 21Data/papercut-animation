import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadCaveat} from '@remotion/google-fonts/Caveat';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

/**
 * Type that has to stay.
 *
 * These lines are not shot-local cards. A shot unmounts at the cut, and the
 * narration asks the words to hold, drift, and leave together. Each board is
 * parked in its own part of the frame so a later line never covers an earlier one.
 */

const inter = loadInter('normal', {weights: ['500', '700', '800'], subsets: ['latin']});
const caveat = loadCaveat('normal', {weights: ['700'], subsets: ['latin']});
const mono = loadMono();

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Side = 'left' | 'right';

interface Line {
  at: number;
  text: string;
  /** Parking slot, percent of the frame. */
  x: number;
  y: number;
  w: number;
  side: Side;
  kind: 'bar' | 'outline' | 'marker' | 'stamp';
}

const FIRST_THING: Line[] = [
  {at: 69.43, text: 'THE FIRST THING', x: 4, y: 58, w: 40, side: 'left', kind: 'bar'},
  {at: 73.57, text: 'A NUMBER YOU KNOW', x: 50, y: 8, w: 46, side: 'right', kind: 'outline'},
  {at: 75.99, text: 'COMPARED BY', x: 4, y: 8, w: 40, side: 'left', kind: 'marker'},
  {at: 78.09, text: "WE DON'T ADMIT", x: 52, y: 36, w: 42, side: 'right', kind: 'stamp'},
];

const LIES: Array<{at: number; text: string; x: number; y: number; rot: number; paper: string}> = [
  {at: 281.09, text: 'I’m fine', x: 6, y: 9, rot: -2.4, paper: '#F6F1E6'},
  {at: 283.23, text: 'I’m busy', x: 58, y: 11, rot: 2.1, paper: '#E7F0EA'},
  {at: 284.39, text: 'It’s on me', x: 7, y: 40, rot: 1.6, paper: '#F6E7EC'},
  {at: 285.73, text: 'No, really — I insist', x: 52, y: 42, rot: -1.8, paper: '#E9E7F4'},
];

const OUTRO: Line[] = [
  {at: 890.9, text: 'ONE RULE', x: 6, y: 8, w: 48, side: 'left', kind: 'bar'},
  {at: 892.89, text: 'BREAK IT', x: 46, y: 26, w: 48, side: 'right', kind: 'outline'},
  {at: 893.53, text: 'ON PURPOSE', x: 6, y: 46, w: 52, side: 'left', kind: 'marker'},
  {at: 894.59, text: 'SUBSCRIBE', x: 40, y: 58, w: 52, side: 'right', kind: 'stamp'},
  {at: 895.39, text: "DON'T MISS THE NEXT ONE", x: 6, y: 80, w: 88, side: 'left', kind: 'bar'},
];

const Board: React.FC<{
  lines: Line[];
  leaveAt: number;
  exit: number;
  /** photo: sitting on a plate. night: sitting on the outro field. */
  on: 'photo' | 'night';
}> = ({lines, leaveAt, exit, on}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  if (t < lines[0].at - 0.05 || t > leaveAt + exit) return null;

  const leave = smooth((t - leaveAt) / exit);

  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: 1 - leave}}>
      {lines.map((line, i) => {
        const age = t - line.at;
        if (age < 0) return null;
        const inn = smooth(age / 0.42);
        const from = line.side === 'left' ? -72 : 72;
        const x = lerp(from, 0, inn);
        const idle = Math.sin(t * 0.7 + i * 1.3) * 7 * inn;
        const sheen = ((t * 28 + i * 40) % 140) - 20;
        return (
          <div
            key={line.text}
            style={{
              position: 'absolute',
              left: `${line.x}%`,
              top: `${line.y}%`,
              width: `${line.w}%`,
              transform: `translate(${x.toFixed(1)}px, ${(idle - leave * 28).toFixed(1)}px)`,
            }}
          >
            <LineFace line={line} inn={inn} sheen={sheen} on={on} age={age} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const LineFace: React.FC<{
  line: Line;
  inn: number;
  sheen: number;
  on: 'photo' | 'night';
  age: number;
}> = ({line, inn, sheen, on, age}) => {
  const font = {
    fontFamily: inter.fontFamily,
    fontWeight: 800 as const,
    letterSpacing: '-0.045em',
    lineHeight: 0.92,
    fontSize: line.kind === 'stamp' ? 78 : 64,
  };
  const night = on === 'night';

  if (line.kind === 'bar') {
    return (
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: night ? '#F4F1EA' : '#12110F',
          padding: '22px 28px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(100deg, transparent ${sheen}%, ${night ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.16)'} ${sheen + 8}%, transparent ${sheen + 16}%)`,
          }}
        />
        <div style={{...font, color: night ? '#14110E' : '#F4F1EA', position: 'relative'}}>{line.text}</div>
      </div>
    );
  }

  if (line.kind === 'outline') {
    return (
      <div
        style={{
          ...font,
          color: night ? '#F4F1EA' : '#16140F',
          textShadow: night ? '6px 8px 0 #000' : '6px 8px 0 #F4E7C8',
        }}
      >
        {line.text}
      </div>
    );
  }

  if (line.kind === 'marker') {
    const wipe = smooth(age / 0.55);
    return (
      <div style={{position: 'relative', display: 'inline-block', padding: '8px 10px'}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '38%',
            height: '46%',
            background: '#F5D76E',
            transform: `scaleX(${wipe})`,
            transformOrigin: 'left center',
            opacity: 0.92,
          }}
        />
        <div style={{...font, color: '#16140F', position: 'relative'}}>{line.text}</div>
      </div>
    );
  }

  const rock = Math.sin(age * 1.4) * 0.6;
  return (
    <div
      style={{
        display: 'inline-block',
        border: `4px solid #E24B4B`,
        outline: '2px solid #E24B4B',
        outlineOffset: 7,
        padding: '14px 22px 16px',
        transform: `rotate(${(-7 + rock).toFixed(2)}deg) scale(${(0.86 + inn * 0.14).toFixed(3)})`,
      }}
    >
      <div style={{...font, color: '#E24B4B'}}>{line.text}</div>
    </div>
  );
};

const LieBubbles: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const leaveAt = 292.15;
  const exit = 0.75;
  if (t < LIES[0].at || t > leaveAt + exit) return null;
  const leave = smooth((t - leaveAt) / exit);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {LIES.map((lie, i) => {
        const age = t - lie.at;
        if (age < 0) return null;
        const inn = smooth(age / 0.4);
        const float = Math.sin(t * 0.85 + i) * 8;
        return (
          <div
            key={lie.text}
            style={{
              position: 'absolute',
              left: `${lie.x}%`,
              top: `${lie.y}%`,
              width: i === 3 ? 460 : 380,
              opacity: inn * (1 - leave),
              transform: `translateY(${(float + (1 - inn) * 18 - leave * 24).toFixed(1)}px) rotate(${lie.rot}deg) scale(${(0.94 + inn * 0.06).toFixed(3)})`,
              filter: 'drop-shadow(6px 14px 16px rgba(12,10,16,0.38))',
            }}
          >
            <div
              style={{
                background: lie.paper,
                borderRadius: 28,
                padding: '22px 28px 20px',
                border: '2px solid rgba(24,18,22,0.78)',
              }}
            >
              <div
                style={{
                  fontFamily: caveat.fontFamily,
                  fontSize: 54,
                  fontWeight: 700,
                  color: '#1A1418',
                  lineHeight: 1,
                }}
              >
                {lie.text}
              </div>
            </div>
            <div
              style={{
                width: 22,
                height: 22,
                background: lie.paper,
                borderRight: '2px solid rgba(24,18,22,0.78)',
                borderBottom: '2px solid rgba(24,18,22,0.78)',
                transform: 'rotate(45deg)',
                marginLeft: 36,
                marginTop: -12,
              }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const GuestCheck: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const enterAt = 844.17;
  const leaveAt = 850.55;
  const exit = 0.7;
  if (t < enterAt || t > leaveAt + exit) return null;

  const local = Math.max(0, frame - Math.round(enterAt * fps));
  const s = spring({frame: local, fps, config: {damping: 16, stiffness: 90, mass: 1.05}});
  const leave = smooth((t - leaveAt) / exit);
  const rule = smooth((t - 844.55) / 0.45);
  const six = smooth((t - 845.35) / 0.28);
  const table = smooth((t - 846.55) / 0.28);
  const drift = Math.sin(t * 1.1) * 3;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: 78,
          top: 128 + drift,
          width: 560,
          opacity: clamp01(s * 1.2) * (1 - leave),
          transform: `translateY(${((1 - s) * -70 + leave * 40).toFixed(1)}px) rotate(${lerp(-5.5, -1.4, s).toFixed(2)}deg)`,
          filter: 'drop-shadow(10px 22px 22px rgba(10,8,6,0.45))',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '42%',
            top: -16,
            width: 108,
            height: 28,
            transform: 'translateX(-50%) rotate(-3deg)',
            background: 'rgba(226,214,186,0.7)',
          }}
        />
        <div
          style={{
            background: '#F3EBDA',
            color: '#1A140F',
            padding: '36px 36px 32px',
            clipPath:
              'polygon(0 0, 100% 0, 100% 96%, 97% 98%, 94% 96%, 91% 99%, 88% 96%, 85% 99%, 82% 96%, 79% 99%, 76% 96%, 73% 99%, 70% 96%, 67% 99%, 64% 96%, 61% 99%, 58% 96%, 55% 99%, 52% 96%, 49% 99%, 46% 96%, 43% 99%, 40% 96%, 37% 99%, 34% 96%, 31% 99%, 28% 96%, 25% 99%, 22% 96%, 19% 99%, 16% 96%, 13% 99%, 10% 96%, 7% 99%, 4% 96%, 1% 99%, 0 96%)',
          }}
        >
          <div
            style={{
              fontFamily: mono.fontFamily,
              fontSize: 15,
              letterSpacing: '0.28em',
              fontWeight: 700,
              opacity: 0.62,
            }}
          >
            SO, BACK TO
          </div>
          <div
            style={{
              fontFamily: inter.fontFamily,
              fontWeight: 800,
              fontSize: 92,
              letterSpacing: '-0.05em',
              lineHeight: 0.88,
              marginTop: 8,
            }}
          >
            THE BILL
          </div>
          <div
            style={{
              marginTop: 18,
              height: 3,
              width: `${rule * 100}%`,
              background: '#1A140F',
            }}
          />
          <Row label="SIX PEOPLE" k={six} />
          <Row label="ONE TABLE" k={table} />
          <div
            style={{
              marginTop: 16,
              height: 2,
              width: `${Math.max(rule, table) * 100}%`,
              background: '#C4503C',
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Row: React.FC<{label: string; k: number}> = ({label, k}) => (
  <div
    style={{
      marginTop: 16,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      opacity: k,
      transform: `translateX(${(1 - k) * 12}px)`,
      fontFamily: mono.fontFamily,
      fontSize: 22,
      letterSpacing: '0.14em',
      fontWeight: 700,
    }}
  >
    <span>{label}</span>
    <span style={{opacity: 0.45}}>{'·'.repeat(8)}</span>
  </div>
);

const OutroPoster: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  if (t < 890.88) return null;
  const wash = 0.5 + Math.sin(t * 0.6) * 0.04;

  return (
    <AbsoluteFill style={{pointerEvents: 'none', background: '#14110E'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 40%, rgba(201,145,61,${wash * 0.18}) 0%, transparent 62%)`,
        }}
      />
      <Board lines={OUTRO} leaveAt={896.6} exit={0.35} on="night" />
    </AbsoluteFill>
  );
};

export const KineticCopy: React.FC = () => (
  <>
    <Board lines={FIRST_THING} leaveAt={79.15} exit={0.6} on="photo" />
    <LieBubbles />
    <GuestCheck />
    <OutroPoster />
  </>
);
