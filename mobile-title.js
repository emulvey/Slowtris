// mobile-title.js - Handles mobile title screen animation

import { getGameState, STATE_TITLE } from './game.js';
import { drawTitleScreen, showMobileTitleButtons, updateMobileTitleBgBlocks } from './draw-mobile.js';

let mobileTitleAnimFrameId = null;
let lastTitleAnimTime = 0;

export function startMobileTitleScreen() {
    if (mobileTitleAnimFrameId) cancelAnimationFrame(mobileTitleAnimFrameId);
    lastTitleAnimTime = performance.now();
    mobileTitleScreenAnimLoop();
}

export function stopMobileTitleScreen() {
    if (mobileTitleAnimFrameId) {
        cancelAnimationFrame(mobileTitleAnimFrameId);
        mobileTitleAnimFrameId = null;
    }
}

function mobileTitleScreenAnimLoop() {
    if (getGameState() !== STATE_TITLE) return;
    let now = performance.now();
    let dt = (now - lastTitleAnimTime) * 0.25;
    lastTitleAnimTime = now;
    updateMobileTitleBgBlocks(dt);
    drawTitleScreen();
    showMobileTitleButtons();
    mobileTitleAnimFrameId = requestAnimationFrame(mobileTitleScreenAnimLoop);
}
