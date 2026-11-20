// Wires the studio: photo slots, per-panel crop controls, caption and size presets, then exports the PNG locally.
import { renderCover, exportCoverPng, defaultPanelSettings } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const status = document.getElementById('status');
const thumbs = [0, 1, 2].map((i) => document.getElementById('thumb' + i));
const sizeLabel = document.getElementById('sizeLabel');
const exportSize = document.getElementById('exportSize');
const zoomInput = document.getElementById('panelZoom');
const xInput = document.getElementById('panelX');
const yInput = document.getElementById('panelY');
const zoomOut = document.getElementById('zoomOut');
const sourceSelect = document.getElementById('panelSource');

const SAMPLES = ['samples/pier.jpg', 'samples/boulevard.jpg', 'samples/pier.jpg'];
thumbs.forEach((thumb) => thumb.addEventListener('error', () => thumb.removeAttribute('src')));

const state = {
  photos: [null, null, null],
  panels: defaultPanelSettings(),
  caption: captionInput.value,
  width: canvas.width,
  height: canvas.height,
};
let activePanel = 0;

/** Decodes an image URL into something the canvas can draw. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  renderCover(canvas, state);
}

async function setPhoto(index, url) {
  const img = await loadImage(url);
  state.photos[index] = img;
  thumbs[index].src = url;
  return img;
}

function setCaption(text) {
  state.caption = text;
  captionInput.value = text;
}

function setSize(spec) {
  const match = /^(\d+)x(\d+)$/.exec(spec);
  if (!match) return false;
  state.width = Number(match[1]);
  state.height = Number(match[2]);
  canvas.width = state.width;
  canvas.height = state.height;
  const label = `${state.width} × ${state.height}`;
  sizeLabel.textContent = label;
  exportSize.textContent = label;
  document.querySelectorAll('.preset').forEach((p) => p.classList.toggle('is-active', p.dataset.size === spec));
  return true;
}

function setPanelSources(sources) {
  sources.forEach((source, i) => { if (state.panels[i]) state.panels[i].source = source; });
}

function syncPanelControls() {
  const setting = state.panels[activePanel];
  sourceSelect.value = String(setting.source);
  zoomInput.value = String(Math.round(setting.zoom * 100));
  xInput.value = String(Math.round(setting.x * 100));
  yInput.value = String(Math.round(setting.y * 100));
  zoomOut.textContent = zoomInput.value + '%';
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('is-active', Number(tab.dataset.panel) === activePanel);
  });
}

for (let i = 0; i < 3; i++) {
  document.getElementById('photo' + i).addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      await setPhoto(i, URL.createObjectURL(file));
      redraw();
      status.textContent = `Photo ${'ABC'[i]} loaded — all editing is local.`;
    } catch {
      status.textContent = 'That image could not be opened.';
    }
  });
  document.querySelector(`[data-sample="${i}"]`).addEventListener('click', async () => {
    await setPhoto(i, SAMPLES[i]);
    redraw();
    status.textContent = `Sample loaded into photo ${'ABC'[i]}.`;
  });
}

document.getElementById('panelTabs').addEventListener('click', (event) => {
  const tab = event.target.closest('.tab');
  if (!tab) return;
  activePanel = Number(tab.dataset.panel);
  syncPanelControls();
});

sourceSelect.addEventListener('change', () => {
  state.panels[activePanel].source = Number(sourceSelect.value);
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.panels[activePanel].zoom = Number(zoomInput.value) / 100;
  zoomOut.textContent = zoomInput.value + '%';
  redraw();
});
xInput.addEventListener('input', () => {
  state.panels[activePanel].x = Number(xInput.value) / 100;
  redraw();
});
yInput.addEventListener('input', () => {
  state.panels[activePanel].y = Number(yInput.value) / 100;
  redraw();
});
document.getElementById('panelReset').addEventListener('click', () => {
  state.panels[activePanel] = defaultPanelSettings()[activePanel];
  syncPanelControls();
  redraw();
});

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});

document.getElementById('sizePresets').addEventListener('click', (event) => {
  const preset = event.target.closest('.preset');
  if (!preset) return;
  setSize(preset.dataset.size);
  document.querySelectorAll('.preset').forEach((p) => p.classList.toggle('is-active', p === preset));
  redraw();
});

document.getElementById('export').addEventListener('click', async () => {
  const name = `vice-city-cover-${state.width}x${state.height}.png`;
  try {
    const bytes = await exportCoverPng(canvas, name);
    status.textContent = `Saved ${name} (${Math.round(bytes / 1024)} KiB).`;
  } catch {
    status.textContent = 'PNG export failed — please try again.';
  }
});

const shotApi = { setPhoto, setCaption, setSize, setPanelSources, redraw };

async function start() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    await runShot(shot, params, shotApi);
  } else {
    await Promise.all([setPhoto(0, SAMPLES[0]), setPhoto(1, SAMPLES[1])]);
    state.panels[2].source = 1;
    syncPanelControls();
    redraw();
  }
}

start();
