import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import type {Act, Shot as ShotSpec} from '../lib/data';
import {FPS} from '../lib/data';
import {cameraAt, cameraTransform} from '../lib/camera';
import {tourAt, tourFor} from '../lib/panelTour';
import {overlayBlurAt, overlayDimAt} from '../lib/overlays';
import {BalanceHUD} from './BalanceHUD';
import {OverlayLayer} from './overlays/OverlayLayer';
import {AmbientLayer} from './AmbientLayer';
import {Letterbox} from './Letterbox';

const PAPER_FPS = 12;

// The paper clock. Quantised to 12fps so it reads as hand-manipulated cardstock,
// never as an interpolated image.
const stepped = (t: number) => Math.floor(t * PAPER_FPS) / PAPER_FPS;
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Frames spent fading in / out on a shot cut. */
const CUT_IN = 8;
const CUT_OUT = 6;

/**
 * One shot: a plate, a camera move, and whatever the number is doing.
 * The camera never stops. Even the calmest frame here drifts.
 */
export const Shot: React.FC<{shot: ShotSpec; act: Act}> = ({shot, act}) => {
  const frame = useCurrentFrame();
  const dur = Math.max(1, shot.endFrame - shot.startFrame);
  const p = dur <= 1 ? 1 : frame / (dur - 1);

  // The last shot of the film is black. There is no plate under it.
  if (shot.blank) {
    return <AbsoluteFill style={{backgroundColor: '#000'}} />;
  }

  const tour = tourFor(shot);
  const tAbs = shot.start + frame / FPS;
  const cam = tour
    ? tourAt(tour, shot, tAbs, frame)
    : cameraAt(shot.camera, p, frame);
  const camera = cameraTransform(cam);

  // When a card takes the frame the plate is dimmed and lightly blurred, the way
  // an art director desaturates the photo they are laying type over. The card
  // stays sharp. The plate stays *visible* — it is expensive art, not wallpaper.
  // The number is part of the plate, so it is not inside this filter: a blur
  // would smear the digits while the head they belong to goes soft.
  const focus = cam.blur + overlayBlurAt(shot, act, frame / FPS);
  const dim = overlayDimAt(shot, act, frame / FPS);

  // The plate is paper, so it runs on the 12fps clock while the camera above it
  // keeps running at 60. Jerky handmade prey under a buttery digital predator.
  // The balance is glued to that same paper, or the camera walks the face out
  // from under the number.
  const paper = stepped(frame / FPS);
  const seed = shot.globalIndex * 1.37;
  const breath = Math.sin((paper / 1.5) * Math.PI * 2) * 2;
  const sway = Math.sin(paper * 1.1 + seed) * 0.22;
  const settle = 1 + 0.012 * Math.max(0, 1 - paper / 0.18);
  const paperXform =
    `translateY(${breath.toFixed(2)}px) rotate(${sway.toFixed(3)}deg) scale(${settle.toFixed(4)})`;

  // Soft cut: the plate fades in over CUT_IN frames and out over CUT_OUT frames.
  // This kills the hard-cut strobe rhythm. The first shot of the film and any
  // snap/crash zooms skip the fade-in so the impact lands cleanly.
  const isImpactCut = shot.camera === 'snapZoom' || shot.camera === 'crashZoom' || shot.camera === 'whipPan';
  const tooShortToFade = dur < FPS * 2;
  const fadeIn = isImpactCut || tooShortToFade || shot.index === 1 ? 1 : clamp01(frame / CUT_IN);
  const fadeOut = shot.blank || tooShortToFade ? 1 : clamp01((dur - 1 - frame) / CUT_OUT);
  const cutOpacity = Math.min(fadeIn, fadeOut);

  const plate = shot.assetPath;
  // A zoomed split leaves the frame's edges empty. A blurred, enlarged copy
  // of the same plate fills that black so the move never opens onto a void.
  const fill = !!tour;

  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000', opacity: cutOpacity}}>
      {fill ? (
        <AbsoluteFill
          style={{
            transform: 'scale(1.45)',
            filter: 'blur(34px)',
            opacity: 0.96,
          }}
        >
          <Img
            src={staticFile(plate)}
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
          />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill
        style={{
          transform: camera,
          filter: [
            focus > 0.01 ? `blur(${focus.toFixed(2)}px)` : '',
            dim > 0.01 ? `brightness(${(1 - dim * 0.6).toFixed(3)}) saturate(${(1 - dim * 0.5).toFixed(3)})` : '',
          ].filter(Boolean).join(' ') || undefined,
          willChange: 'transform, filter',
        }}
      >
        <AbsoluteFill style={{transform: paperXform, willChange: 'transform'}}>
          <Img
            src={staticFile(plate)}
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
          />
        </AbsoluteFill>
      </AbsoluteFill>

      <AbsoluteFill style={{transform: camera, willChange: 'transform'}}>
        <AbsoluteFill style={{transform: paperXform, willChange: 'transform'}}>
          <BalanceHUD shot={shot} act={act} durFrames={dur} />
        </AbsoluteFill>
      </AbsoluteFill>

      <AmbientLayer act={act} />

      <OverlayLayer shot={shot} act={act} />

      <Letterbox act={act} shot={shot} />
    </AbsoluteFill>
  );
};
