# NEON VICE — Cover Art Studio

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Rizkijack/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Rizkijack/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline Canvas 2D poster maker. Drop in a photo, write a caption, tune four
slanted panels and export a shareable PNG in 1080×1080, 1080×1350 or
1920×1080. Everything runs in the browser from the files in `app/` — photos
never leave the machine. Entered in the [Make GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01).

## Run

```sh
node serve.ts
```

Open the local address it prints (default `http://localhost:8080`). To build
the hand-in directory directly:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Design

The cover is four rotated photo cards over a Vice City sunset: a sliced neon
disc, indigo-to-magenta sky, horizon grid and palm silhouettes. Each card uses
a different crop of one photo (or of up to three) with its own zoom, horizontal
and vertical pan, then a duotone tint, halftone dots and a diagonal light
streak. The caption is drawn as skewed, outlined gradient lettering with a
small chromatic offset; a frame, corner ticks, release stamp and barcode-style
bars finish the poster. Scanlines, deterministic film grain and a vignette tie
the panels together.

All lettering uses system font stacks and every texture is generated at
runtime, so no font files, external images, CDNs or network requests are
needed. The editor has three photo pickers with sample fallbacks, four crop
cards, a live caption field, three grade palettes, effect strength and a
one-click full-resolution PNG export. `?shot=cover`, `?shot=editor`,
`?shot=square` and `?shot=story` render fixed compositions for screenshots;
`window.__shotReady` flips when the draw completes.
