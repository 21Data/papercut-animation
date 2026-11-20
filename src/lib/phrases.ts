import {ALL_CAPTIONS} from './data';
import type {Word} from './data';

/**
 * The timeline gives word-level truth. The cut used to show every 2-3 word
 * chunk, which made the strip flicker at 1.15 chunks a second. Here the same
 * word timestamps are re-grouped into spoken phrases: the caption changes when
 * the voice takes a breath or lands a thought, not when a word ends.
 *
 * Nothing is hand-typed. This is derived from build/timeline.json every run.
 */

export interface Phrase {
  text: string;
  startAbs: number;
  endAbs: number;
  words: Word[];
}

const MAX_WORDS = 6;
const MAX_SPAN = 2.4;
const PAUSE = 0.42;
const HARD = /[.!?—]$/;
const SOFT = /[,;:]$/;

function buildPhrases(): Phrase[] {
  const out: Phrase[] = [];
  let cur: Word[] = [];

  const flush = () => {
    if (!cur.length) return;
    out.push({
      text: cur.map((w) => w.text).join(' '),
      startAbs: cur[0].startAbs,
      endAbs: cur[cur.length - 1].endAbs,
      words: cur,
    });
    cur = [];
  };

  for (const cap of ALL_CAPTIONS) {
    for (const w of cap.words) {
      if (cur.length) {
        const last = cur[cur.length - 1];
        const gap = w.startAbs - last.endAbs;
        const span = w.endAbs - cur[0].startAbs;
        if (gap > PAUSE || span > MAX_SPAN || cur.length >= MAX_WORDS) flush();
      }

      cur.push(w);
      const last = cur[cur.length - 1];
      if (HARD.test(last.text)) flush();
      else if (SOFT.test(last.text) && cur.length >= 3) flush();
    }
  }
  flush();
  return out;
}

export const PHRASES: Phrase[] = buildPhrases();

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Index of the phrase covering `seconds`, or -1 inside a silence. */
export function phraseIndexAt(seconds: number): number {
  let lo = 0;
  let hi = PHRASES.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const p = PHRASES[mid];
    if (seconds < p.startAbs) hi = mid - 1;
    else if (seconds >= p.endAbs) lo = mid + 1;
    else return mid;
  }
  return -1;
}

export function phraseAt(seconds: number): Phrase | null {
  const i = phraseIndexAt(seconds);
  return i < 0 ? null : PHRASES[i];
}

export function phrasesIn(startAbs: number, endAbs: number): Phrase[] {
  return PHRASES.filter((p) => p.endAbs > startAbs && p.startAbs < endAbs);
}

/** Every spoken word start inside a window, ascending. */
export function wordStartsIn(startAbs: number, endAbs: number): number[] {
  const starts: number[] = [];
  for (const p of phrasesIn(startAbs, endAbs)) {
    for (const w of p.words) {
      if (w.startAbs >= startAbs && w.startAbs <= endAbs) starts.push(w.startAbs);
    }
  }
  return starts.sort((a, b) => a - b);
}

export {clamp01};
