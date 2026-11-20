import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The bounty's own caps: app/ entries and bytes, image count and size, text cap.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000
};

const root = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

mkdirSync(out, { recursive: true });
// Clear only what we own so a reused output dir still writes identical bytes.
for (const name of ['app', 'screenshots', 'dossier.json']) {
  rmSync(join(out, name), { recursive: true, force: true });
}
cpSync(join(root, 'app'), join(out, 'app'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(join(out, 'dossier.json'), buildDossier(out, CAPS));
console.log(`Wrote dossier.json with app/ and screenshots/ to ${out}`);
