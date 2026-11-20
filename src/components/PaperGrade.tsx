import React from 'react';
import {AbsoluteFill} from 'remotion';

/**
 * Global paper treatment: vignette plus a 6% grain plate in multiply.
 * Applied once over the whole film so every shot shares the same stock.
 */

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>" +
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter>" +
    "<rect width='160' height='160' filter='url(#n)' opacity='0.55'/>" +
    '</svg>',
)}")`;

export const PaperGrade: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(0,0,0,0) 42%, rgba(8,8,12,0.58) 100%)',
      }}
    />
    <AbsoluteFill
      style={{
        backgroundImage: GRAIN,
        backgroundRepeat: 'repeat',
        opacity: 0.06,
        mixBlendMode: 'multiply',
      }}
    />
  </AbsoluteFill>
);
