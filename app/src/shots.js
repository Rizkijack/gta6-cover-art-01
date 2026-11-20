// shots.js — deterministic hooks used to render the four hand-in screenshots.
// ?shot=cover|editor|square|story, ?photo=pier|boulevard, ?caption=... all work
// without any network access, and window.__shotReady flips once the draw lands.

export const SAMPLES = {
  pier: './samples/pier.jpg',
  boulevard: './samples/boulevard.jpg'
};

export const SHOTS = {
  cover: { size: '1920x1080', photo: 'pier', caption: 'VICE CITY NIGHTS' },
  editor: { size: '1920x1080', photo: 'boulevard', caption: 'VICE CITY NIGHTS' },
  square: { size: '1080x1080', photo: 'pier', caption: 'NEON NIGHTS' },
  story: { size: '1080x1350', photo: 'boulevard', caption: 'AFTER DARK' }
};

export const SIZES = {
  '1920x1080': { width: 1920, height: 1080, label: 'LANDSCAPE 1920×1080' },
  '1080x1080': { width: 1080, height: 1080, label: 'SQUARE 1080×1080' },
  '1080x1350': { width: 1080, height: 1350, label: 'PORTRAIT 1080×1350' }
};

export function readQuery() {
  return new URLSearchParams(window.location.search);
}

// Turn the query string into a plain plan the editor can apply to its state.
export function shotPlan(query) {
  const name = query.get('shot') || 'editor';
  const preset = SHOTS[name] || SHOTS.editor;
  const photoArg = query.get('photo');
  const captionArg = query.get('caption');
  return {
    name: SHOTS[name] ? name : 'editor',
    size: preset.size,
    photo: photoArg && SAMPLES[photoArg] ? photoArg : preset.photo,
    caption: captionArg !== null ? captionArg : preset.caption
  };
}

export function markReady() {
  window.__shotReady = true;
  document.documentElement.dataset.shotReady = 'true';
}
