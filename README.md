# Slowtris

A **turn-based Tetris** game playable on desktop, mobile, and as a browser extension. No gravity timer — think as long as you want on every move.

## Play Online

Play directly via GitHub Pages:

[Play Slowtris](https://emulvey.github.io/Slowtris/)

## How Slowtris Works

- **No timer**: Pieces only fall as you take turns.
- **2-move gravity**: Every **2** lateral/rotate moves steps the active piece down 1 row.
- **2-move lock grace**: Once resting on the stack or floor, you get **2** adjustment moves to slide or tuck before the piece locks.
- **Stress-reactive visuals & audio**: As your stack climbs, the aurora background, board glow, and ambient soundtrack shift dynamically from calm teal to urgent crimson.

## Controls

| Action | Keyboard | Touch / Mobile |
|---|---|---|
| Move Left / Right | `←` / `→` or `A` / `D` | Left/Right buttons or horizontal drag |
| Rotate Clockwise | `↑`, `X`, or `W` | `↻` button or tap playfield |
| Rotate Counter-Clockwise | `Z` | `↺` button |
| Step Down / Lock | `↓` or `S` | Down button or slow drag down |
| Hard Drop | `Space` or `Enter` | `⤓` button or fast flick down |
| Pause / Resume | `P` or `Esc` | Pause button in top bar |
| Mute SFX | `M` | Sound button in top bar |

## Load as a Browser Extension (Chrome / Edge / Brave / Firefox)

Slowtris includes a Manifest V3 `manifest.json` and runs with zero external dependencies or inline scripts.

### Chrome / Edge / Brave
1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this repository folder.
4. Click the **Slowtris** icon in your toolbar to play!

### Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...** and select `manifest.json`.

## Deploy on GitHub Pages

1. Push all files to your GitHub repository.
2. Open **Settings → Pages**.
3. Set source to `main` branch and `/ (root)` folder, then save.

## Project Structure

- `index.html`, `style.css`: Responsive UI shell (desktop, mobile, and extension popup)
- `main.js`: Unified entry point, keyboard/touch input, and UI bindings
- `game.js`: Turn-based Tetris engine, scoring, combos, and state machine
- `tetromino.js`: 7-bag randomizer, SRS-style rotations, wall kicks, and palette
- `draw.js`: High-DPI canvas renderer (aurora stress background, beveled blocks, ghost piece, particles, popups)
- `audio.js`: Self-contained Web Audio API sound effects & adaptive ambient music
- `storage.js`: Safe `localStorage` persistence for highscores and settings
- `manifest.json`, `icons/`: Browser extension manifest and icons
