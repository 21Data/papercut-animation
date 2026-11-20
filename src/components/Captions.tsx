import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ACTS, actAt, shotAt} from '../lib/data';
import {emphasisFor, placementFor, skinFor} from '../lib/composition';
import {PHRASES} from '../lib/phrases';
import {overlayAt, overlayReplacesCaptions, type OverlayCue} from '../lib/overlays';
import {titleSpan} from '../lib/stage';

/**
 * Captions are paper too, and they are not furniture.
 *
 * Each chunk is a cardstock strip held dead centre. It fades in once and stays.
 * It does not walk between lanes, and it does not punch on every word.
 *
 * The strip yields to the number. The number never yields to the strip.
 */

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);

const fontSizeFor = (count: number) => (count > 6 ? 44 - (count - 6) * 3 : 44);

/** Approximate advance of a Helvetica Neue bold line, in px. Used only as a ratio. */
function visualWidth(text: string, count: number): number {
  const size = fontSizeFor(count);
  let em = 0;
  for (const ch of text) {
    if (ch === ' ') em += 0.33;
    else if ('iljtfrI.,\'!:;|'.includes(ch)) em += 0.34;
    else if ('mwMW'.includes(ch)) em += 0.92;
    else if (ch >= 'A' && ch <= 'Z') em += 0.72;
    else em += 0.58;
  }
  return Math.max(em, 0.5) * size;
}

/** How long a phrase stays up after its last word before the strip clears. */
const HOLD = 0.6;

const bare = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** True when the card is already saying what the strip would repeat. */
function saysSame(cue: OverlayCue, text: string): boolean {
  const spoken = bare(text);
  if (spoken.length < 8) return false;
  for (const line of [cue.title, cue.copy ?? '']) {
    const printed = bare(line);
    if (printed.length >= 8 && (printed === spoken || printed.includes(spoken) || spoken.includes(printed))) {
      return true;
    }
  }
  return false;
}

/**
 * The strip cuts on the voice, not on the silence. Phrases are separated by
 * breaths, and dropping the card in every gap made the lower third strobe, so
 * a phrase holds until the next one begins.
 */
function phraseCovering(t: number): number {
  let lo = 0;
  let hi = PHRASES.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (PHRASES[mid].startAbs <= t) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (best < 0) return -1;
  const p = PHRASES[best];
  return t > p.endAbs + HOLD ? -1 : best;
}

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;

  const index = phraseCovering(time);
  if (index < 0) return null;

  const cap = PHRASES[index];

  const act = actAt(time);
  const shot = shotAt(time);

  // The chapter card is the only text on screen while it is up.
  if (ACTS.some((a) => {
    const span = titleSpan(a);
    return !!span && time >= span.from && time < span.to;
  })) {
    return null;
  }

  // The outro poster carries the last lines. A caption strip under it doubles them.
  if (time >= 890.88) return null;

  // A takeover or card is already speaking. Two voices, one frame, is noise.
  // Overlay cues are timed from the start of their shot, not the film.
  if (shot && act && overlayReplacesCaptions(shot, act, time - shot.start)) return null;

  // A note that prints the same sentence would make the frame stutter, so the
  // card keeps the words and the strip steps out of the way.
  const cue = shot && act ? overlayAt(shot, act, time - shot.start) : null;
  if (cue && saysSame(cue, cap.text)) return null;

  const skin = skinFor(act);
  const highlight = emphasisFor(skin.paper, skin.ink, skin.accent);

  const words = cap.words ?? [];
  const count = cap.text.split(/\s+/).length;
  const here = placementFor(shot, count, index);
  // Scope bars own the top and bottom of acts 4 and 5. The strip stays above them.
  const y = act && (act.id === 'act4' || act.id === 'act5') ? Math.min(here.y, 80) : here.y;

  // A six-word phrase at full size runs out of frame. Long thoughts step down so
  // every phrase stays on one line.
  const fontSize = fontSizeFor(count);

  // One place for the whole film. The strip fades; it does not travel.
  const fade = clamp01((time - cap.startAbs) / 0.12);
  const est = count * fontSize * 0.62 + 56;
  const fit = Math.min(1, 1680 / Math.max(est, 1));

  // The fill is a band. A longer line stretches it, a shorter one lets it snap
  // back, and the spring overshoots once so the stock behaves like elastic.
  const prevIndex = phraseCovering(cap.startAbs - 0.05);
  const continuous = prevIndex >= 0 && prevIndex !== index;
  const curW = visualWidth(cap.text, count);
  const prevW = continuous ? visualWidth(PHRASES[prevIndex].text, PHRASES[prevIndex].text.split(/\s+/).length) : curW * 0.8;
  const fromRatio = continuous ? clamp(prevW / curW, 0.45, 1.85) : 0.8;
  const age = Math.max(0, frame - Math.round(cap.startAbs * fps));
  const band = spring({
    frame: age,
    fps,
    config: {damping: 9, stiffness: 170, mass: 0.55},
  });
  const scaleX = fromRatio + (1 - fromRatio) * band;
  // A rubber band thins as it stretches and thickens as it contracts.
  const scaleY = 1 / Math.pow(Math.max(scaleX, 0.4), 0.32);

  let active = -1;
  for (let i = 0; i < words.length; i++) {
    if (time + 0.03 >= words[i].startAbs) active = i;
  }

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: `${here.x}%`,
          top: `${y}%`,
          transform: `translate(-50%, -50%) scale(${here.scale * fit})`,
          opacity: fade,
          maxWidth: '74%',
        }}
      >
        <div style={{position: 'relative', display: 'inline-block', maxWidth: '100%'}}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '100%',
              height: '100%',
              transform: `translate(-50%, -50%) scale(${scaleX}, ${scaleY})`,
              background: skin.paper,
              borderRadius: 3,
              borderLeft: `5px solid ${highlight}`,
              borderTop: '1px solid rgba(0,0,0,0.18)',
              borderRight: '1px solid rgba(0,0,0,0.18)',
              borderBottom: '1px solid rgba(0,0,0,0.18)',
              filter: 'drop-shadow(4px 8px 5px rgba(15, 15, 20, 0.45))',
            }}
          />
          <div
            style={{
              position: 'relative',
              color: skin.ink,
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontWeight: 700,
              fontSize,
              letterSpacing: '0.01em',
              padding: '10px 22px 12px',
              textAlign: 'center',
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
            }}
          >
            {words.map((w, i) => (
              <span
                key={`${w.text}-${i}`}
                style={{
                  display: 'inline-block',
                  color: i === active ? highlight : skin.ink,
                  marginRight: i < words.length - 1 ? '0.28em' : 0,
                }}
              >
                {w.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
