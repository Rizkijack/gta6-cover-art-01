// main.js — editor wiring. Loads photos locally, keeps panel state, renders the
// Canvas 2D cover live, and exports a full-resolution PNG. No network calls.

import { renderCover } from './cover.js';
import { SAMPLES, SIZES, readQuery, shotPlan, markReady } from './shots.js';

const $ = (id) => document.getElementById(id);

const state = {
  width: 1920,
  height: 1080,
  caption: 'VICE CITY NIGHTS',
  palette: 'vice',
  grade: 1,
  grain: true,
  panels: [
    { source: 0, zoom: 1.08, panX: 0, panY: 0 },
    { source: 0, zoom: 1.45, panX: -0.30, panY: 0.22 },
    { source: 0, zoom: 1.22, panX: 0.28, panY: -0.16 },
    { source: 0, zoom: 1.62, panX: 0.05, panY: 0.30 }
  ]
};

const images = [null, null, null];
const canvas = $('stage');
let frame = 0;

// Coalesce rapid slider / keystroke updates into one paint per frame.
function render() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    renderCover(canvas, state, images);
    $('statusLine').textContent = `${state.width}×${state.height} · ready`;
  });
}

function showThumb(slot, src) {
  const img = $(`thumb${slot}`);
  if (src) img.src = src;
}

function loadImage(slot, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images[slot] = img;
      showThumb(slot, src);
      render();
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

function loadFile(slot, file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => loadImage(slot, String(reader.result));
  reader.readAsDataURL(file);
}

// Build the four crop cards once, then bind their inputs to panel state.
function buildPanelControls() {
  const list = $('panelList');
  state.panels.forEach((panel, i) => {
    const card = document.createElement('div');
    card.className = 'panel-card';
    card.innerHTML = `
      <div class="row"><h3><b>0${i + 1}</b> PANEL</h3>
        <select id="panelSrc${i}" aria-label="Panel ${i + 1} photo">
          <option value="0">PHOTO 1</option><option value="1">PHOTO 2</option><option value="2">PHOTO 3</option>
        </select></div>
      <div class="sliders">
        <div><label for="zoom${i}">ZOOM</label><input id="zoom${i}" type="range" min="100" max="300" value="${Math.round(panel.zoom * 100)}"></div>
        <div><label for="panX${i}">HORIZ</label><input id="panX${i}" type="range" min="-100" max="100" value="${Math.round(panel.panX * 100)}"></div>
        <div><label for="panY${i}">VERT</label><input id="panY${i}" type="range" min="-100" max="100" value="${Math.round(panel.panY * 100)}"></div>
      </div>`;
    list.appendChild(card);

    $(`panelSrc${i}`).value = String(panel.source);
    $(`panelSrc${i}`).addEventListener('change', (e) => {
      panel.source = Number(e.target.value);
      render();
    });
    for (const [id, key] of [['zoom', 'zoom'], ['panX', 'panX'], ['panY', 'panY']]) {
      $(`${id}${i}`).addEventListener('input', (e) => {
        panel[key] = Number(e.target.value) / 100;
        render();
      });
    }
  });
}

function bindStaticControls() {
  for (let slot = 0; slot < 3; slot++) {
    $(`file${slot}`).addEventListener('change', (e) => loadFile(slot, e.target.files[0]));
    $(`sample${slot}`).addEventListener('change', (e) => {
      if (SAMPLES[e.target.value]) loadImage(slot, SAMPLES[e.target.value]);
    });
  }

  $('captionInput').addEventListener('input', (e) => {
    state.caption = e.target.value.trim() || 'VICE CITY';
    render();
  });
  $('paletteSelect').addEventListener('change', (e) => {
    state.palette = e.target.value;
    render();
  });
  $('gradeRange').addEventListener('input', (e) => {
    state.grade = Number(e.target.value) / 100;
    $('gradeOut').textContent = `${e.target.value}%`;
    render();
  });
  $('grainCheck').addEventListener('change', (e) => {
    state.grain = e.target.checked;
    render();
  });

  document.querySelectorAll('[data-size]').forEach((button) => {
    button.addEventListener('click', () => applySize(button.dataset.size));
  });

  $('exportBtn').addEventListener('click', exportPng);

  const frameEl = document.querySelector('.canvas-frame');
  frameEl.addEventListener('dragover', (e) => e.preventDefault());
  frameEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const slot = images.findIndex((x) => !x);
    loadFile(slot < 0 ? 0 : slot, e.dataTransfer.files[0]);
  });
}

function applySize(key) {
  const size = SIZES[key];
  if (!size) return;
  state.width = size.width;
  state.height = size.height;
  $('sizeLabel').textContent = size.label;
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === key);
  });
  render();
}

// Render at full resolution and hand the PNG to the browser as a download.
function exportPng() {
  renderCover(canvas, state, images);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const slug = state.caption.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
    link.href = url;
    link.download = `neon-vice-${slug}-${state.width}x${state.height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

// Apply the deterministic shot plan, wait for its sample photos, then signal.
async function init() {
  const plan = shotPlan(readQuery());
  applySize(plan.size);
  state.caption = plan.caption;
  $('captionInput').value = plan.caption;

  const keys = Object.keys(SAMPLES);
  const other = keys.find((k) => k !== plan.photo);
  await Promise.all([
    loadImage(0, SAMPLES[plan.photo]),
    plan.name === 'cover' ? Promise.resolve() : loadImage(1, SAMPLES[other])
  ]);

  if (plan.name === 'cover') {
    // One photo, four deliberately different crops.
    state.panels.forEach((p) => { p.source = 0; });
  } else {
    state.panels.forEach((p, i) => { p.source = i % 2; });
  }
  state.panels.forEach((p, i) => {
    $(`panelSrc${i}`).value = String(p.source);
  });

  if (plan.name !== 'editor') document.body.classList.add('focus');

  renderCover(canvas, state, images);
  $('statusLine').textContent = `${state.width}×${state.height} · ready`;
  markReady();
}

buildPanelControls();
bindStaticControls();
init();

window.__coverStudio = { state, images, render, exportPng };
