# Ads

Drop image files into these folders to show them on the terminal. Changes are
picked up automatically while the app is running (the list refreshes every few
seconds) — no rebuild or restart required.

- `top/` — banner ads shown across the top, above the centered content.
- `side/` — ads shown in the left and right columns.

Supported formats: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.svg`.

Ads cycle every ~10 seconds, in alphabetical order. The `side/` pool feeds both
the left and right columns at once, and the two columns are always offset so
they never show the same ad simultaneously (when there are at least two side
ads). The ad areas are always reserved, so the centered content keeps a constant
size and position whether or not any ads are present.

## Sizes (fullscreen 1920×1080)

Images are scaled to fit (`object-fit: contain`), so any size is safe — nothing
gets cropped. To fill the slot with no empty bands, match the aspect ratio
below. The slot dimensions are fixed in code (top is 160px tall, each side is
270px wide and full height — see `src/renderer/src/assets/main.css`).

| Slot              | Display box | Aspect ratio   | Recommended source (2×) |
| ----------------- | ----------- | -------------- | ----------------------- |
| **Side** (each)   | 270 × 1080  | **1:4**        | 540 × 2160              |
| **Top**           | 1380 × 160  | ~8.6:1 (69:8)  | 2760 × 320              |

Notes:

- The **side** ratio is a constant **1:4**. Both columns use the same size.
- The **top** banner spans the area between the two side columns
  (1920 − 270 − 270 = 1380px wide).
- The 2× source sizes keep images crisp on high-DPI displays; exact 1× pixel
  values also work on a native 1920×1080 screen.
