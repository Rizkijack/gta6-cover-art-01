// grade.js — original Canvas 2D colour grading for the cover maker.
// Everything here is drawn locally: no fonts, images or shaders are fetched.

const PALETTES = {
  vice: {
    label: 'VICE SUNSET',
    skyTop: '#150735', skyMid: '#6b1b6d', skyLow: '#ff6b6b',
    sun: '#ffd76a', sunEdge: '#ff2e88', horizon: '#ff7ac6',
    panelA: '#ff2e88', panelB: '#24d8ff', shadow: '#0d0322',
    cap1: '#ffe66d', cap2: '#ff2e88', cap3: '#2ee6ff', accent: '#38e8ff'
  },
  midnight: {
    label: 'MIDNIGHT CYAN',
    skyTop: '#040b2b', skyMid: '#123a8c', skyLow: '#2ad7ff',
    sun: '#b7f8ff', sunEdge: '#4d6bff', horizon: '#66e0ff',
    panelA: '#4d6bff', panelB: '#38ffd0', shadow: '#02081f',
    cap1: '#d8fbff', cap2: '#4d8bff', cap3: '#38ffd0', accent: '#7df9ff'
  },
  heat: {
    label: 'MAGENTA HEAT',
    skyTop: '#2a0524', skyMid: '#a01256', skyLow: '#ff9a3c',
    sun: '#ffe08a', sunEdge: '#ff2e5e', horizon: '#ff5b9e',
    panelA: '#ff2e5e', panelB: '#ffd166', shadow: '#1a0318',
    cap1: '#fff0a8', cap2: '#ff2e5e', cap3: '#ffb347', accent: '#ffcf5c'
  }
};

export function getPalette(name) {
  return PALETTES[name] || PALETTES.vice;
}

export function paletteNames() {
  return Object.keys(PALETTES);
}

// #rgb or #rrggbb -> rgba(...) with an explicit alpha.
export function rgba(hex, alpha) {
  const s = String(hex).replace('#', '');
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Deterministic PRNG so every render of a shot is byte-identical.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const img = g.createImageData(128, 128);
  const rand = mulberry32(0xc0ffee);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 90 + rand() * 165;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

const halftoneTiles = new Map();
function getHalftoneTile(color, spacing) {
  const key = `${color}|${spacing}`;
  let tile = halftoneTiles.get(key);
  if (tile) return tile;
  const size = Math.max(4, Math.round(spacing));
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.beginPath();
  g.arc(size / 2, size / 2, size * 0.20, 0, Math.PI * 2);
  g.fill();
  halftoneTiles.set(key, c);
  return c;
}

export function grainPattern(ctx) {
  return ctx.createPattern(getGrainTile(), 'repeat');
}

export function halftonePattern(ctx, color, spacing) {
  return ctx.createPattern(getHalftoneTile(color, spacing), 'repeat');
}

// Rounded rectangle path without relying on ctx.roundRect.
export function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

// Sunset sky, sliced neon sun, horizon haze and a perspective grid.
export function paintBackdrop(ctx, w, h, p) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, p.skyTop);
  sky.addColorStop(0.42, p.skyMid);
  sky.addColorStop(0.70, p.skyLow);
  sky.addColorStop(1, p.shadow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.63;
  const cy = h * 0.40;
  const r = Math.min(w, h) * 0.29;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const disc = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  disc.addColorStop(0, p.sun);
  disc.addColorStop(1, p.sunEdge);
  ctx.fillStyle = disc;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = p.skyMid;
  for (let i = 0; i < 10; i++) {
    const y = cy + r * 0.05 + i * i * r * 0.011;
    ctx.globalAlpha = 0.22 + i * 0.055;
    ctx.fillRect(cx - r, y, r * 2, 1 + i * 0.7);
  }
  ctx.restore();

  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.4);
  glow.addColorStop(0, rgba(p.horizon, 0.42));
  glow.addColorStop(1, rgba(p.horizon, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const hy = h * 0.665;
  ctx.fillStyle = rgba(p.sunEdge, 0.9);
  ctx.fillRect(0, hy, w, Math.max(2, h * 0.004));

  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = Math.max(1, h * 0.0016);
  for (let i = -9; i <= 9; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5, hy);
    ctx.lineTo(w * 0.5 + i * w * 0.15, h);
    ctx.stroke();
  }
  for (let i = 1; i <= 8; i++) {
    const y = hy + Math.pow(i / 8, 2) * (h - hy);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  drawPalms(ctx, w, h, hy, p.shadow);
}

function drawPalms(ctx, w, h, hy, color) {
  const palms = [
    { x: w * 0.075, s: 1.0 },
    { x: w * 0.155, s: 0.66 },
    { x: w * 0.925, s: 0.86 }
  ];
  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  for (const palm of palms) {
    const baseY = hy + h * 0.03 * palm.s;
    const topY = hy - h * 0.30 * palm.s;
    ctx.lineWidth = Math.max(1, w * 0.006 * palm.s);
    ctx.beginPath();
    ctx.moveTo(palm.x - w * 0.008 * palm.s, baseY);
    ctx.quadraticCurveTo(palm.x + w * 0.012 * palm.s, (baseY + topY) / 2, palm.x, topY);
    ctx.lineTo(palm.x + w * 0.008 * palm.s, baseY);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + i * Math.PI / 6;
      const len = w * 0.08 * palm.s;
      ctx.beginPath();
      ctx.moveTo(palm.x, topY);
      ctx.quadraticCurveTo(
        palm.x + Math.cos(a) * len * 0.45,
        topY + Math.sin(a) * len * 0.35 - len * 0.18,
        palm.x + Math.cos(a) * len,
        topY + Math.sin(a) * len * 0.55
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Scanlines, deterministic film grain and a soft vignette on top of the art.
export function paintOverlays(ctx, w, h, strength, grain) {
  ctx.save();
  ctx.globalAlpha = 0.10 * strength;
  ctx.fillStyle = '#000';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  ctx.restore();

  if (grain) {
    ctx.save();
    ctx.globalAlpha = 0.09 * strength;
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  const vignette = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.28,
    w / 2, h / 2, Math.max(w, h) * 0.78
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(4,0,18,0.58)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}
