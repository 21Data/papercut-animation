import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {ACTS, FPS, TOTAL_FRAMES} from './lib/data';
import {ownerTokensFor, photoStackFor} from './lib/overlays';
import {PhotoStack} from './components/overlays/PhotoStack';
import {TokenRow} from './components/overlays/TokenRow';
import {Shot} from './components/Shot';
import {Captions} from './components/Captions';
import {PaperGrade} from './components/PaperGrade';
import {ActTitle} from './components/ActTitle';
import {KineticCopy} from './components/KineticCopy';
import {SoundDesign} from './components/SoundDesign';
import {titleSpan} from './lib/stage';

/**
 * The film. Every timing here comes from build/timeline.json and
 * build/shotlist.json - never from a hand-typed number.
 *
 * Act title cards cover the chapter pause at the top of acts 1–7.
 * That pause is in timeline.json (chapterPause). The voice file has no
 * leader, so it starts when the card ends. Captions use the same shifted
 * clock, and the first plate holds underneath the card.
 */

export const BankBalance: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    {/* ── Voiceover audio — delayed per act to let each junction breathe ── */}
    {ACTS.filter((act) => act.audio).map((act) => {
      const pause = act.chapterPause ?? 0;
      return (
        <Sequence
          key={`vo-${act.id}`}
          from={Math.round((act.start + pause) * FPS)}
          durationInFrames={Math.max(1, Math.round((act.duration - pause) * FPS))}
          name={`VO - ${act.title}`}
        >
          <Audio src={staticFile(act.audio)} />
        </Sequence>
      );
    })}

    {/* ── Shot plates ── */}
    {ACTS.flatMap((act) =>
      act.shots.map((shot) => (
        <Sequence
          key={`${act.id}-${shot.index}`}
          from={shot.startFrame}
          durationInFrames={Math.max(1, shot.endFrame - shot.startFrame)}
          name={`${act.title} #${shot.index}`}
        >
          <Shot shot={shot} act={act} />
        </Sequence>
      )),
    )}

    {/* ── Pinned plates. They outlive the shot they enter on, so they are
           rendered on the act's clock rather than inside a shot sequence. ── */}
    {ACTS.filter((act) => photoStackFor(act).length > 0).map((act) => (
      <Sequence
        key={`stack-${act.id}`}
        from={Math.round(act.start * FPS)}
        durationInFrames={Math.max(1, Math.round(act.duration * FPS))}
        name={`Photo stack - ${act.title}`}
      >
        <PhotoStack act={act} />
      </Sequence>
    ))}

    {/* ── The three owners. Same clock as the prints: they stay after the cut. ── */}
    {ACTS.filter((act) => ownerTokensFor(act).length > 0).map((act) => (
      <Sequence
        key={`tokens-${act.id}`}
        from={Math.round(act.start * FPS)}
        durationInFrames={Math.max(1, Math.round(act.duration * FPS))}
        name={`Owners - ${act.title}`}
      >
        <TokenRow act={act} />
      </Sequence>
    ))}

    {/* ── Act title cards. Opaque for the whole silence, including the
           spoken "first 24 hours" that opens act 1. ── */}
    {ACTS.map((act) => {
      const span = titleSpan(act);
      if (!span) return null;
      const from = Math.round(span.from * FPS);
      const to = Math.round(span.to * FPS);
      return (
        <Sequence
          key={`title-${act.id}`}
          from={from}
          durationInFrames={Math.max(1, to - from)}
          name={`Title - ${act.title}`}
        >
          <ActTitle act={act} />
        </Sequence>
      );
    })}

    {/* ── Kinetic type: ads, thought bubbles, the guest check, the outro. ── */}
    <KineticCopy />

    {/* ── Global overlays (paper grain, vignette, captions, sound) ── */}
    <PaperGrade />
    <Captions />

    {/* ── Fix #8: Paper foley sound layer ── */}
    <SoundDesign />
  </AbsoluteFill>
);

export const COMPOSITION = {
  id: 'BankBalance',
  durationInFrames: TOTAL_FRAMES,
  fps: FPS,
  width: 1920,
  height: 1080,
};
