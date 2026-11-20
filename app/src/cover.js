// The poster engine. Four slanted panels, a sunset grade, print texture and a big original display caption.
// All drawing is plain Canvas 2D at the canvas's own pixel size; nothing is fetched and no font file is loaded.
import { tracePolygon, applyViceCityGrade, addFilmGrain, drawHalftone, clamp } from './grade.js';

// Panel shapes in normalised coordinates. Three leaning vertical bands plus one diagonal band laid across the
// lower third, the way a cover poster layers a crowd of cropped frames.
function bandPolygon(leftTop, rightTop, leftBottom, rightBottom) {
  return [[leftTop, 0], [rightTop, 0], [rightBottom, 1], [leftBottom, 1]];
}

export const PANEL_SHAPES = [
  bandPolygon(-0.03, 0.34, 0.04, 0.24),
  bandPolygon(0.34, 0.67, 0.24, 0.59),
  bandPolygon(0.67, 1.03, 0.59, 0.97),
  [[0.00, 0.58], [1.00, 0.47], [1.00, 0.69], [0.00, 0.80]],
];

// Each panel's own crop defaults: zoom, horizontal pan and vertical offset (-1..1).
export function defaultPanelSettings() {
  return [
    { source: 0, zoom: 1.18, x: 0.00, y: -0.10 },
    { source: 0, zoom: 1.55, x: 0.00, y: -0.14 },
    { source: 0, zoom: 1.30, x: 0.00, y: -0.05 },
    { source: 0, zoom: 1.30, x: 0.00, y: 0.18 },
  ];
}

const PANEL_FILTERS = [
  'saturate(1.22) contrast(1.10)',
  'saturate(1.42) contrast(1.18)',
  'saturate(1.28) contrast(1.14)',
  'saturate(1.55) contrast(1.22)',
];

/** Fills one panel's bounding box with a cropped, panned and zoomed source photo. */
function drawPanelPhoto(ctx, img, x, y, w, h, setting) {
  if (!img || !img.naturalWidth) {
    // Before any photo is picked the panel still reads as a poster: a lit sky and a low sun.
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#3a116e');
    g.addColorStop(0.55, '#c0297c');
    g.addColorStop(1, '#ff8a3d');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    return;
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const aspect = w / h;
  let sw = iw;
  let sh = iw / aspect;
  if (sh > ih) { sh = ih; sw = ih * aspect; }
  sw = clamp(sw / setting.zoom, 1, iw);
  sh = clamp(sh / setting.zoom, 1, ih);
  const sx = clamp((iw - sw) / 2 + setting.x * (iw - sw) / 2, 0, iw - sw);
  const sy = clamp((ih - sh) / 2 + setting.y * (ih - sh) / 2, 0, ih - sh);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Draws all four clipped panels, each from its own photo slot and with its own crop. */
export function buildViceCityPanels(ctx, w, h, photos, panels) {
  for (let i = 0; i < PANEL_SHAPES.length; i++) {
    const points = PANEL_SHAPES[i];
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const [px, py] of points) {
      x0 = Math.min(x0, px); y0 = Math.min(y0, py);
      x1 = Math.max(x1, px); y1 = Math.max(y1, py);
    }
    const box = { x: x0 * w, y: y0 * h, w: (x1 - x0) * w, h: (y1 - y0) * h };
    const setting = panels[i] ?? defaultPanelSettings()[i];
    ctx.save();
    tracePolygon(ctx, w, h, points);
    ctx.clip();
    ctx.filter = PANEL_FILTERS[i];
    const photo = photos[setting.source] ?? photos[0] ?? null;
    drawPanelPhoto(ctx, photo, box.x, box.y, box.w, box.h, setting);
    ctx.filter = 'none';
    ctx.restore();
  }
}

/** Dark cut lines with a hot neon core between the panels. */
export function drawPanelSeams(ctx, w, h) {
  ctx.save();
  ctx.lineJoin = 'round';
  for (const points of PANEL_SHAPES) {
    tracePolygon(ctx, w, h, points);
    ctx.lineWidth = Math.max(2, w * 0.006);
    ctx.strokeStyle = 'rgba(16, 4, 34, 0.82)';
    ctx.stroke();
    ctx.lineWidth = Math.max(1, w * 0.0016);
    ctx.strokeStyle = 'rgba(255, 196, 138, 0.55)';
    ctx.stroke();
  }
  ctx.restore();
}

/** Greedy word wrap for the caption, capped at three lines. */
function wrapCaption(ctx, text, maxWidth) {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = line + ' ' + words[i];
    if (ctx.measureText(candidate).width <= maxWidth || line.length < 2) line = candidate;
    else { lines.push(line); line = words[i]; }
  }
  lines.push(line);
  return lines.slice(0, 3);
}

/** The headline: heavy italic capitals, dark extrusion, light inner rim and a sunset gradient fill. */
export function drawBoldCaption(ctx, w, h, caption) {
  const text = (caption ?? '').trim();
  if (!text) return;
  ctx.save();
  const maxWidth = w * 0.86;
  const budget = h * 0.34;
  const fontFor = (size) => `900 ${size}px "Arial Black", Impact, system-ui, sans-serif`;
  let size = h * 0.17;
  ctx.font = fontFor(size);
  let lines = wrapCaption(ctx, text, maxWidth);
  // Shrink until every line fits the width and the stack fits the height budget.
  while (size > 10 && (lines.length > 3 || lines.some((l) => ctx.measureText(l).width > maxWidth) || lines.length * size * 0.92 > budget)) {
    size *= 0.97;
    ctx.font = fontFor(size);
    if (lines.length > 3) lines = wrapCaption(ctx, text, maxWidth);
  }
  ctx.font = fontFor(size);
  const lineHeight = size * 0.92;
  const bottom = h * 0.915;
  const shear = 0.14;
  ctx.translate(w / 2 + shear * bottom, 0);
  ctx.transform(1, 0, -shear, 1, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  const fill = ctx.createLinearGradient(0, bottom - (lines.length - 1) * lineHeight - size, 0, bottom);
  fill.addColorStop(0, '#fff2bd');
  fill.addColorStop(0.42, '#ffb347');
  fill.addColorStop(1, '#ff2e88');

  lines.forEach((line, i) => {
    const baseline = bottom - (lines.length - 1 - i) * lineHeight;
    ctx.fillStyle = 'rgba(24, 4, 44, 0.92)';
    ctx.fillText(line, size * 0.035, baseline + size * 0.045);
    ctx.lineWidth = size * 0.17;
    ctx.strokeStyle = '#190629';
    ctx.strokeText(line, 0, baseline);
    ctx.lineWidth = size * 0.055;
    ctx.strokeStyle = 'rgba(255, 240, 214, 0.9)';
    ctx.strokeText(line, 0, baseline);
    ctx.fillStyle = fill;
    ctx.fillText(line, 0, baseline);
  });
  ctx.restore();
}

/** Small original poster furniture: a kicker, a date stamp, corner ticks and a hairline frame. */
export function drawPosterMarks(ctx, w, h) {
  ctx.save();
  const unit = Math.max(9, w * 0.0135);
  ctx.textBaseline = 'top';
  ctx.font = `900 ${unit * 1.35}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255, 234, 200, 0.92)';
  ctx.fillRect(w * 0.035, h * 0.038, unit * 1.9, Math.max(2, unit * 0.24));
  ctx.fillText('VICE CITY', w * 0.035, h * 0.038 + unit * 0.7);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 206, 160, 0.82)';
  ctx.fillText('1986 / ORIGINAL CUT', w * 0.965, h * 0.044);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 224, 190, 0.55)';
  ctx.font = `700 ${unit * 0.72}px system-ui, sans-serif`;
  ctx.fillText('AN ORIGINAL COVER  •  MADE FROM YOUR PHOTO', w * 0.035, h * 0.957);

  ctx.strokeStyle = 'rgba(255, 214, 176, 0.28)';
  ctx.lineWidth = Math.max(1, w * 0.001);
  ctx.strokeRect(w * 0.018, h * 0.018, w * 0.964, h * 0.964);
  const tick = w * 0.022;
  ctx.strokeStyle = 'rgba(255, 214, 176, 0.55)';
  ctx.lineWidth = Math.max(1, w * 0.0016);
  for (const [cx, cy, sx, sy] of [
    [w * 0.018, h * 0.018, 1, 1], [w * 0.982, h * 0.018, -1, 1],
    [w * 0.018, h * 0.982, 1, -1], [w * 0.982, h * 0.982, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * tick, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * tick);
    ctx.stroke();
  }
  ctx.restore();
}

/** Paints the whole cover into the canvas from the current editor state. */
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';

  const back = ctx.createLinearGradient(0, 0, w, h);
  back.addColorStop(0, '#2a0e52');
  back.addColorStop(0.5, '#7d176f');
  back.addColorStop(1, '#ff7a3c');
  ctx.fillStyle = back;
  ctx.fillRect(0, 0, w, h);

  buildViceCityPanels(ctx, w, h, state.photos, state.panels);
  drawPanelSeams(ctx, w, h);
  applyViceCityGrade(ctx, w, h);
  drawHalftone(ctx, w, h);
  addFilmGrain(ctx, w, h, 0.08);
  drawBoldCaption(ctx, w, h, state.caption);
  drawPosterMarks(ctx, w, h);
  // A second, barely-there grain pass ties the lettering into the print texture.
  addFilmGrain(ctx, w, h, 0.02);
}

/** Encodes the live canvas as a PNG download; the whole export stays in the browser. */
export function exportCoverPng(canvas, filename = 'vice-city-cover.png') {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('PNG encode failed')); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      resolve(blob.size);
    }, 'image/png');
  });
}
