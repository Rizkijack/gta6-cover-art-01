// Fixed scenes for the four screenshots. ?shot=cover is the bare exported cover, ?shot=editor is the full studio;
// ?photo / ?photo2 pick bundled samples, ?caption sets the headline, ?size sets the canvas and ?solo=1 fills every
// panel from one photo. window.__shotReady flips only after the scene has been painted.

function sampleUrl(name, fallback) {
  const clean = /^[a-z0-9_-]+$/i.test(name ?? '') ? name : fallback;
  return `samples/${clean}.jpg`;
}

/** Builds one screenshot scene through the editor's own setters, then signals readiness. */
export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');

  if (query.get('size')) api.setSize(query.get('size'));

  const first = query.get('photo');
  const second = query.get('photo2');
  if (first || second) {
    await Promise.all([
      api.setPhoto(0, sampleUrl(first ?? 'pier', 'pier')),
      second ? api.setPhoto(1, sampleUrl(second, 'boulevard')) : Promise.resolve(),
    ]);
    api.setPanelSources(second ? [0, 1, 0, 1] : [0, 0, 0, 0]);
  } else if (shot === 'editor') {
    await Promise.all([
      api.setPhoto(0, sampleUrl('pier', 'pier')),
      api.setPhoto(1, sampleUrl('boulevard', 'boulevard')),
    ]);
    api.setPanelSources([0, 1, 0, 0]);
  } else {
    await api.setPhoto(0, sampleUrl('pier', 'pier'));
    api.setPanelSources([0, 0, 0, 0]);
  }

  if (query.get('solo') === '1') api.setPanelSources([0, 0, 0, 0]);
  api.setCaption(query.get('caption') ?? 'SUNSET HEIST');
  api.redraw();

  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
