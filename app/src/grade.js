// Vice City colour science: deterministic grain, halftone printing texture, the sunset grade and a vignette.
// Everything here draws on a CanvasRenderingContext2D at the canvas's own pixel size.

/** Mulberry32: a tiny seeded PRNG so a cover (and its screenshot) is reproducible from the same inputs. */
export function makeSeededRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Parks a polygon defined by normalised [0..1] corner pairs as a path on the context. */
export function tracePolygon(ctx, w, h, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0] * w, points[0][1] * h);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0] * w, points[i][1] * h);
  ctx.closePath();
}

/** A cached tile of monochrome noise; tiled once over the poster by addFilmGrain. */
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const size = 160;
  const tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(size, size);
  const rand = makeSeededRandom(0x5eed1986);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(rand() * 145);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

/** Fine film grain laid over the whole cover in overlay blend mode. */
export function addFilmGrain(ctx, w, h, strength = 0.14) {
  const tile = getGrainTile();
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = strength;
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A newspaper-style dot screen in the lower-right: a printed-poster cue, kept faint. */
export function drawHalftone(ctx, w, h) {
  const step = Math.max(6, Math.round(w / 150));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(255, 210, 170, 0.22)';
  for (let y = Math.floor(h * 0.56); y < h; y += step) {
    const fade = (y - h * 0.56) / (h * 0.44);
    for (let x = Math.floor(w * 0.52); x < w; x += step) {
      const r = step * (0.10 + 0.22 * fade);
      ctx.beginPath();
      ctx.arc(x + (y % (step * 2) ? step / 2 : 0), y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The magenta / orange / violet sunset wash, a warm sun flare and a soft corner vignette. */
export function applyViceCityGrade(ctx, w, h) {
  ctx.save();

  // Violet sky at the top, clean middle, hot pink and orange toward the street.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, 'rgba(58, 16, 122, 0.55)');
  wash.addColorStop(0.28, 'rgba(126, 26, 140, 0.12)');
  wash.addColorStop(0.62, 'rgba(236, 40, 122, 0.20)');
  wash.addColorStop(0.85, 'rgba(255, 76, 84, 0.42)');
  wash.addColorStop(1, 'rgba(255, 150, 46, 0.50)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  // Sun flare, high and off-centre, in screen blend so the highlights stay luminous.
  ctx.globalCompositeOperation = 'screen';
  const sun = ctx.createRadialGradient(w * 0.68, h * 0.30, 0, w * 0.68, h * 0.30, w * 0.62);
  sun.addColorStop(0, 'rgba(255, 176, 84, 0.46)');
  sun.addColorStop(0.35, 'rgba(255, 90, 120, 0.18)');
  sun.addColorStop(1, 'rgba(255, 60, 160, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  // A cool cyan rim on the left keeps the neon palette from turning into plain red.
  const neon = ctx.createLinearGradient(0, h * 0.25, w, h * 0.75);
  neon.addColorStop(0, 'rgba(30, 220, 230, 0.16)');
  neon.addColorStop(0.45, 'rgba(120, 40, 200, 0)');
  neon.addColorStop(1, 'rgba(255, 40, 130, 0.18)');
  ctx.fillStyle = neon;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  // Vignette last: darker corners make the lettering pop.
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.46, Math.min(w, h) * 0.24, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(12, 4, 28, 0)');
  vig.addColorStop(1, 'rgba(12, 4, 28, 0.62)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}
