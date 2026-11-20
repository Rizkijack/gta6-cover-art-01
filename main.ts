// Vice City Cover Studio — handoff for gta6-cover-art-01 (Node 22, standard library only).
//
// The app/ folder is a static, offline site: index.html loads four ES modules with no library and no network
// request. cover.js paints four slanted photo panels, a sunset/neon grade, print texture and a bold original
// caption; main.js wires photo slots, per-panel crop controls, a live caption and three post-size presets;
// exportCoverPng encodes the finished canvas in the browser. Photos are read from the visitor's own machine.
// The two bundled samples were made for make.fun with an image model and are free to use.
//
// This program copies app/ and screenshots/ beside it to /output and writes /output/dossier.json with the
// vendored make.fun library. The first screenshot by name is the cover shown on top of the judge's sheet.
//
// Serve it locally with `node serve.ts`, then open the page on localhost.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
// buildDossier rebuilds the dossier byte-for-byte from the copied app/ and screenshots/ trees, so two runs
// into different output directories produce identical files and hashes.
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
// The judge's cover is the first screenshot by name, so copy them in an explicit sorted order rather than
// relying on filesystem enumeration. Sorting by name also keeps both handoff runs byte-for-byte identical.
const screenshotSource = join(here, 'screenshots');
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(screenshotSource)) {
  for (const name of readdirSync(screenshotSource).sort()) {
    cpSync(join(screenshotSource, name), join(out, 'screenshots', name));
  }
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
