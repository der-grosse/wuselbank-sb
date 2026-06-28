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

| Slot            | Display box | Recommended source (2×) |
| --------------- | ----------- | ----------------------- |
| **Side** (each) | 270 × 1024  | 540 × 2048              |
| **Top**         | 1240 × 160  | 2480 × 320              |
