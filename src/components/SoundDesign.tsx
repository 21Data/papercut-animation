import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {ACTS, ALL_SHOTS, FPS} from '../lib/data';
import cues from '../../build/score_cues.json';

/**
 * The bed under a slow narration.
 *
 * The score is the bed. Each Flow generation was longer and louder than the
 * act it belongs to; tools/cut_score.py trims it to the picture and pulls it
 * down so the voice stays in front. A paper hush still marks the cuts.
 * The synthetic drone and the chapter thumps are gone — they were a second
 * bed under the score.
 */

type Cue = {
  id: string;
  act: string;
  file: string;
  delay: number;
  duration: number;
};

/**
 * One soft hush as the plate changes. Impact moves are a little fuller.
 * Ordinary cuts stay under the voice.
 */
const CutRustles: React.FC = () => {
  const cuts = ALL_SHOTS.filter((s) => s.globalIndex > 1 && !s.blank);

  return (
    <>
      {cuts.map((shot) => {
        const isImpact = shot.camera === 'crashZoom' || shot.camera === 'snapZoom' || shot.camera === 'whipPan';
        return (
          <Sequence
            key={`rustle-${shot.globalIndex}`}
            from={shot.startFrame}
            durationInFrames={Math.min(18, Math.max(1, shot.endFrame - shot.startFrame))}
            name={`SFX rustle #${shot.globalIndex}`}
          >
            <Audio
              src={staticFile('sfx/paper_rustle.wav')}
              volume={isImpact ? 0.2 : 0.1}
            />
          </Sequence>
        );
      })}
    </>
  );
};

/** The cut score. Timing comes from the act clock; the files are already trimmed. */
const ScoreBed: React.FC = () => {
  return (
    <>
      {(cues as Cue[]).map((cue) => {
        const act = ACTS.find((a) => a.id === cue.act);
        if (!act) return null;
        const start = act.start + cue.delay;
        return (
          <Sequence
            key={cue.id}
            from={Math.max(0, Math.round(start * FPS))}
            durationInFrames={Math.max(1, Math.round(cue.duration * FPS))}
            name={`Score ${cue.id}`}
          >
            <Audio src={staticFile(cue.file)} />
          </Sequence>
        );
      })}
    </>
  );
};

export const SoundDesign: React.FC = () => {
  return (
    <>
      <ScoreBed />
      <CutRustles />
    </>
  );
};
