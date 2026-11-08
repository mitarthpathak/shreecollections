# Optional sound

Owner-supplied, royalty-free files only. Sound is off by default and never autoplays.

- `bansuri-ambience.mp3` — a soft, loopable flute bed (≤ 600 KB, 64–96 kbps)
- `tick.mp3` — a tiny UI tick (≤ 10 KB)

Once both files are here, build with `NEXT_PUBLIC_SOUND=on` to show the sound toggle (header
on desktop, the menu on phones). Until then the toggle is hidden and no audio is requested;
if a file is still missing, it is tried once and then left silent.
