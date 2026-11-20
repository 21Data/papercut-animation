import timelineJson from '../../build/timeline.json';
import shotlistJson from '../../build/shotlist.json';

export type HudMode = 'none' | 'six' | 'one' | 'hero' | 'many' | 'drop';

export type CameraMove =
  | 'pushIn'
  | 'snapZoom'
  | 'whipPan'
  | 'craneUp'
  | 'dollyLateral'
  | 'handheldDrift'
  | 'rackFocus'
  | 'dutchTilt'
  | 'crashZoom'
  | 'orbit';

export interface Word {
  text: string;
  start: number;
  end: number;
  startAbs: number;
  endAbs: number;
}

export interface Caption {
  text: string;
  start: number;
  end: number;
  startAbs: number;
  endAbs: number;
  words: Word[];
}

export interface ColorScript {
  bg: string;
  accent: string;
  temp: string;
  name: string;
}

/** One floating number: where it hangs, what it is worth, where it is going. */
export interface HudAnchor {
  x: number;
  y: number;
  v: number;
  /** When present the balance ticks from v to to across the shot. */
  to?: number;
  /** Sits before the figure - the teaser reads LIES 1,402, not $1,402.00. */
  label?: string;
  fmt?: 'money' | 'count';
  /** Chip scale, for crowds where the plate is dense. */
  s?: number;
}

export interface Shot {
  index: number;
  globalIndex: number;
  start: number;
  end: number;
  duration: number;
  startFrame: number;
  endFrame: number;
  asset: string;
  assetHandle: string;
  assetPath: string;
  camera: CameraMove;
  hud: HudMode;
  hudAnchors: HudAnchor[];
  hudFall: boolean;
  /** No plate at all: the frame is black. */
  blank: boolean;
  cutOnBreath: boolean;
  note: string;
}

export interface Act {
  id: string;
  title: string;
  audio: string;
  /** Silence before this act's voiceover, matching the chapter card. */
  chapterPause?: number;
  start: number;
  end: number;
  duration: number;
  color: ColorScript;
  captions: Caption[];
  shots: Shot[];
}

export interface Timeline {
  fps: number;
  width: number;
  height: number;
  totalDuration: number;
  totalFrames: number;
  acts: Act[];
}

// The generated JSON carries every field we need; the act list in shotlist.json
// is the authoritative one because it already has shots merged in.
export const TIMELINE = timelineJson as unknown as Omit<Timeline, 'acts'> & {
  acts: Array<Omit<Act, 'shots'>>;
};

export const SHOTLIST = shotlistJson as unknown as {
  fps: number;
  totalDuration: number;
  shotCount: number;
  averageShotLength: number;
  acts: Act[];
};

const AUDIO_BY_ACT = new Map(TIMELINE.acts.map((a) => [a.id, a.audio]));

// shotlist.json is authoritative for shots but carries no audio field, so the
// VO path for each act is joined back in from the timeline by act id.
export const ACTS: Act[] = SHOTLIST.acts.map((a) => ({
  ...a,
  audio: AUDIO_BY_ACT.get(a.id) ?? '',
}));

export const ALL_SHOTS: Shot[] = ACTS.flatMap((a) => a.shots);

export const ALL_CAPTIONS: Caption[] = TIMELINE.acts.flatMap((a) => a.captions);

export const FPS = SHOTLIST.fps;
export const TOTAL_FRAMES = Math.round(SHOTLIST.totalDuration * FPS);
export const WIDTH = TIMELINE.width;
export const HEIGHT = TIMELINE.height;

export function actAt(seconds: number): Act | undefined {
  return ACTS.find((a) => seconds >= a.start && seconds < a.end);
}

export function shotAt(seconds: number): Shot | undefined {
  return ALL_SHOTS.find((s) => seconds >= s.start && seconds < s.end);
}
