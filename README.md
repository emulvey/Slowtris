# Slowtris

A simple Tetris-like game playable in your browser.

## Play Online

You can play the game directly via GitHub Pages:

[Play Slowtris](https://emulvey.github.io/Slowtris/)

## How to Deploy on GitHub Pages

1. Push all files to your GitHub repository.
2. Go to your repository settings on GitHub.
3. Find the **Pages** section.
4. Set the source branch to `main` (or `master`) and the folder to `/ (root)`.
5. Save and wait a few minutes for the site to be published.
6. Visit the provided URL to play!

## Project Structure
- `index.html`: Main entry point
- `main.js`, `game.js`, `draw.js`, `tetromino.js`, `storage.js`: Game logic
- `style.css`: Styles

## Notes
- No server required, works fully in-browser.
- If you add folders starting with `_`, the `.nojekyll` file ensures they are not ignored by GitHub Pages.
