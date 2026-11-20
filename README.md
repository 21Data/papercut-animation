# Bank Balance

A 15-minute paper-cut film, built in [Remotion](https://www.remotion.dev/). This repo has the picture, the voice, and the score. It does not include a finished video. You render that on this machine.

## What you need

- [Node.js](https://nodejs.org/) 18 or newer
- npm, which comes with Node
- A few free gigabytes of disk space. The render writes a 1080p, 60fps file.

## Render

From this folder:

```bash
npm install
npm run render
```

The video is written to `out/bank-balance.mp4`. A full render takes a while. On a machine with more cores, open `remotion.config.ts` and raise `setConcurrency` before you start.

To preview a shot without rendering the whole film:

```bash
npm run studio
```

That opens a browser at `http://localhost:3000`.

To check one stretch of frames:

```bash
npx remotion render src/index.ts BankBalance out/clip.mp4 --frames=0-300
```

Frame numbers are at 60 frames per second. Frame 0 is the start of the film.

## What is in here

- `src/` is the film.
- `public/` is every image, voice file, and music cue the render opens.
- `build/timeline.json`, `build/shotlist.json`, and `build/score_cues.json` are the timings. The picture reads these. Do not rename them.

`npm install` creates `node_modules/`. That folder is not in the repo, and you should not commit it.
