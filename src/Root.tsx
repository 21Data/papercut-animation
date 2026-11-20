import React from 'react';
import {Composition} from 'remotion';
import {BankBalance, COMPOSITION} from './Video';

export const RemotionRoot: React.FC = () => (
  <Composition
    id={COMPOSITION.id}
    component={BankBalance}
    durationInFrames={COMPOSITION.durationInFrames}
    fps={COMPOSITION.fps}
    width={COMPOSITION.width}
    height={COMPOSITION.height}
  />
);
