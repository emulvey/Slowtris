// mobile-draw.js - All mobile drawing logic
import { getMobileBoard, getMobileCurrent, getMobileCurrentX, getMobileCurrentY, getMobileNext, getMobileScore, getMobileFlashRowsActive, getMobilePlayerName } from './mobile-state.js';

let ctx, canvas;
export function setMobileContext(c, cv) {
    ctx = c;
    canvas = cv;
}

export function drawMobileGame() {
    // ...draw the board, current, next, score, etc. using ctx and canvas...
}

export function drawMobileGameOver() {
    // ...draw the game over overlay...
}

export function drawMobileHighscores() {
    // ...draw highscores overlay...
}

export function drawMobileNameEntry() {
    // ...draw name entry overlay...
}
