// cover.js — the poster composition: four angled photo panels, bold gradient
// lettering and original poster furniture. All drawing is local Canvas 2D.

import {
  getPalette, rgba, roundRectPath, halftonePattern,
  paintBackdrop, paintOverlays
} from './grade.js';

const CARD_FONT = 'Impact, "Arial Black", "Arial Narrow", sans-serif';
const UI_FONT = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif';

// Panel geometry for landscape, square and portrait exports.
export function panelLayout(w, h) {
  if (w / h >= 1.5) {
    const pad = w * 0.05;
    const gap = w * 0.013;
    const pw = (w - pad * 2 - gap * 3) / 4;
    const ph = h * 0.63;
    const cy = h * 0.45;
    const rolls = [-10, -5, 5, 10];
    return [0, 1, 2, 3].map((i) => ({
      cx: pad + pw / 2 + i * (pw + gap),
      cy: cy + (i % 2 ? h * 0.018 : -h * 0.012),
      pw, ph, rot: rolls[i]
    }));
  }
  const pad = w * 0.075;
  const gap = w * 0.032;
  const pw = (w - pad * 2 - gap) / 2;
  const ph = h * 0.285;
  const top = h * 0.19;
  const rolls = [-7, 7, -5, 5];
  return [0, 1, 2, 3].map((i) => ({
    cx: pad + pw / 2 + (i % 2) * (pw + gap),
    cy: top + Math.floor(i / 2) * (ph + gap) + ph / 2,
    pw, ph, rot: rolls[i]
  }));
}

// Cover-fit an image inside a centred clip, with zoom and pan in [-1, 1].
function drawCoverImage(ctx, img, w, h, zoom, panX, panY) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = (w - dw) / 2 - panX * w * 0.5;
  let dy = (h - dh) / 2 - panY * h * 0.5;
  dx = Math.min(0, Math.max(w - dw, dx));
  dy = Math.min(0, Math.max(h - dh, dy));
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawPanel(ctx, spec, img, panel, p) {
  const { cx, cy, pw, ph, rot } = spec;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rot * Math.PI) / 180);

  ctx.shadowColor = 'rgba(0,0,0,0.62)';
  ctx.shadowBlur = pw * 0.10;
  ctx.shadowOffsetY = ph * 0.025;
  ctx.fillStyle = '#f3efe6';
  roundRectPath(ctx, -pw / 2, -ph / 2, pw, ph, pw * 0.018);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const inset = Math.max(3, pw * 0.014);
  const iw = pw - inset * 2;
  const ih = ph - inset * 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-iw / 2, -ih / 2, iw, ih);
  ctx.clip();

  if (img && img.complete && (img.naturalWidth || img.width)) {
    drawCoverImage(ctx, img, iw, ih, panel.zoom, panel.panX, panel.panY);
    const grade = ctx.createLinearGradient(-iw / 2, -ih / 2, iw / 2, ih / 2);
    grade.addColorStop(0, rgba(p.panelA, 0.44));
    grade.addColorStop(1, rgba(p.panelB, 0.30));
    ctx.fillStyle = grade;
    ctx.fillRect(-iw / 2, -ih / 2, iw, ih);
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = halftonePattern(ctx, p.shadow, Math.max(5, iw * 0.014));
    ctx.fillRect(-iw / 2, -ih / 2, iw, ih);
    ctx.globalAlpha = 1;
    const shine = ctx.createLinearGradient(-iw / 2, -ih / 2, iw / 2, ih / 2);
    shine.addColorStop(0, 'rgba(255,255,255,0.26)');
    shine.addColorStop(0.38, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(-iw / 2, -ih / 2, iw, ih);
  } else {
    const fallback = ctx.createLinearGradient(0, -ih / 2, 0, ih / 2);
    fallback.addColorStop(0, p.panelB);
    fallback.addColorStop(1, p.panelA);
    ctx.fillStyle = fallback;
    ctx.fillRect(-iw / 2, -ih / 2, iw, ih);
  }
  ctx.restore();

  ctx.strokeStyle = rgba(p.shadow, 0.9);
  ctx.lineWidth = Math.max(1, pw * 0.004);
  ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
  ctx.restore();
}

// Greedy word wrap, capped at three lines, measured with the live font.
function wrapCaption(ctx, text, maxWidth, maxLines) {
  const words = String(text || 'VICE CITY').toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) words.push('VICE CITY');
  const lines = [];
  let line = '';
  for (const word of words) {
    const probe = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(probe).width > maxWidth && lines.length < maxLines - 1) {
      lines.push(line);
      line = word;
    } else {
      line = probe;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) lines.length = maxLines;
  return lines;
}

function drawCaption(ctx, caption, w, h, p) {
  const maxWidth = w * 0.86;
  let size = Math.min(h * 0.155, w * 0.185);
  const setFont = () => { ctx.font = `900 ${size}px ${CARD_FONT}`; };
  setFont();
  let lines = wrapCaption(ctx, caption, maxWidth, 3);
  const fits = () => lines.every((ln) => ctx.measureText(ln).width <= maxWidth);
  while (!fits() && size > 12) {
    size *= 0.93;
    setFont();
    lines = wrapCaption(ctx, caption, maxWidth, 3);
  }

  const lineHeight = size * 0.94;
  const blockH = lines.length * lineHeight;
  const firstY = h * 0.865 - blockH / 2 + lineHeight / 2;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  setFont();
  lines.forEach((line, i) => {
    const y = firstY + i * lineHeight;
    const tw = ctx.measureText(line).width;
    ctx.save();
    ctx.translate(w * 0.5, y);
    ctx.transform(1, 0, -0.10, 1, 0, 0);

    ctx.globalAlpha = 0.55;
    ctx.fillStyle = p.cap3;
    ctx.fillText(line, size * 0.025, size * 0.018);
    ctx.globalAlpha = 1;

    const fill = ctx.createLinearGradient(-tw / 2, 0, tw / 2, 0);
    fill.addColorStop(0, p.cap1);
    fill.addColorStop(0.52, p.cap2);
    fill.addColorStop(1, p.cap3);

    ctx.strokeStyle = '#0a0319';
    ctx.lineWidth = size * 0.11;
    ctx.shadowColor = 'rgba(0,0,0,0.72)';
    ctx.shadowBlur = size * 0.20;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(line, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = fill;
    ctx.fillText(line, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

// Tracked uppercase text, drawn a character at a time for poster labels.
function tracked(ctx, text, x, y, tracking) {
  let cursor = x;
  for (const ch of String(text)) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
}

function drawFurniture(ctx, w, h, p, state) {
  const m = Math.max(12, w * 0.018);
  ctx.save();

  ctx.strokeStyle = 'rgba(255,255,255,0.50)';
  ctx.lineWidth = Math.max(1, w * 0.0013);
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);

  ctx.strokeStyle = p.accent;
  ctx.lineWidth = Math.max(2, w * 0.0032);
  const tick = w * 0.035;
  for (const [x, y, sx, sy] of [
    [m, m, 1, 1], [w - m, m, -1, 1],
    [m, h - m, 1, -1], [w - m, h - m, -1, -1]
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + sx * tick, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * tick);
    ctx.stroke();
  }

  const label = Math.max(10, h * 0.019);
  ctx.font = `700 ${label}px ${UI_FONT}`;
  ctx.fillStyle = p.accent;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  tracked(ctx, 'MAKE.FUN PRESENTS', m * 1.7, m * 1.65, w * 0.004);

  ctx.textAlign = 'right';
  const right = 'A NEON VICE STORY  /  2026';
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  let cursor = w - m * 1.7;
  for (let i = right.length - 1; i >= 0; i--) {
    const ch = right[i];
    ctx.fillText(ch, cursor, m * 1.65);
    cursor -= ctx.measureText(ch).width + w * 0.003;
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const boxW = w * 0.19;
  const boxH = label * 2.1;
  const bx = m * 1.7;
  const by = h - m * 1.7 - boxH;
  ctx.fillStyle = rgba(p.shadow, 0.55);
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeStyle = rgba(p.accent, 0.85);
  ctx.lineWidth = Math.max(1, w * 0.0012);
  ctx.strokeRect(bx, by, boxW, boxH);
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${label * 0.92}px ${UI_FONT}`;
  ctx.fillText('REL. 02 AUG 1986', bx + boxW * 0.07, by + boxH / 2);

  ctx.textAlign = 'right';
  ctx.fillStyle = p.accent;
  ctx.font = `700 ${label * 0.9}px ${UI_FONT}`;
  ctx.fillText('MAKE YOUR OWN COVER', w - m * 1.7, h - m * 1.7 - boxH / 2);

  const barX = w - m * 1.7 - w * 0.10;
  const barY = h - m * 1.7 - boxH * 0.42;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  let bx2 = barX;
  const seed = String(state.caption || '').length + 7;
  for (let i = 0; i < 26; i++) {
    const bw = ((i * 37 + seed * 13) % 5 + 1) * w * 0.0009;
    ctx.fillRect(bx2, barY, bw, boxH * 0.36);
    bx2 += bw + w * 0.0016;
  }
  ctx.restore();
}

// Top-level draw used by the editor preview and the PNG export alike.
export function drawCover(ctx, state, images) {
  const w = state.width;
  const h = state.height;
  const p = getPalette(state.palette);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  paintBackdrop(ctx, w, h, p);
  const layout = panelLayout(w, h);
  layout.forEach((spec, i) => {
    const panel = state.panels[i];
    const img = images[panel.source] || null;
    drawPanel(ctx, spec, img, panel, p);
  });
  drawCaption(ctx, state.caption, w, h, p);
  drawFurniture(ctx, w, h, p, state);
  paintOverlays(ctx, w, h, state.grade, state.grain);
  ctx.restore();
}

export function renderCover(canvas, state, images) {
  if (canvas.width !== state.width) canvas.width = state.width;
  if (canvas.height !== state.height) canvas.height = state.height;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, state, images);
  return canvas;
}
