"use strict";
// main-mobile.js - Refactored for clarity and best practices

import {
    getGameState, getBoard, getCurrent, getCurrentX, getCurrentY, getNext, getScore, getFlashRowsActive, getPlayerName,
    STATE_TITLE, STATE_PLAY, STATE_HIGHSCORES, STATE_NAME_ENTRY, STATE_GAMEOVER, handleKeydown
} from './game.js';
import { showMobileControls, hideMobileControls } from './mobile-controls.js';
import { startMobileTitleScreen, stopMobileTitleScreen } from './mobile-title.js';
import {
    drawMobileGame, drawMobileHighscores, drawMobileNameEntry, drawMobileGameOver, setMobileContext
} from './mobile-draw.js';
import {
    getMobileGameState, getMobilePlayerName, getMobileScore
} from './mobile-state.js';

// --- Constants ---
const GAME_CANVAS_ID = 'gameCanvas';

// --- Setup ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMobileGame);
} else {
    setupMobileGame();
}

function setupMobileGame() {
    enableMobileCanvasResize();
    window.addEventListener('orientationchange', debounce(enableMobileCanvasResize, 100));
    window.addEventListener('resize', debounce(enableMobileCanvasResize, 100));
    const canvas = document.getElementById(GAME_CANVAS_ID);
    if (!canvas) {
        console.error(`[Mobile] No #${GAME_CANVAS_ID} found.`);
        return;
    }
    setMobileContext(canvas.getContext('2d'), canvas);
    document.addEventListener('keydown', handleKeydown);
    window.mobileTitleBgBlocks = undefined;
    if (typeof window._mobileGameState === 'undefined') window._mobileGameState = STATE_TITLE;
    setupTouchControls(canvas);
    mobileAnimationLoop();
}

// --- Input Handling ---
function setupTouchControls(canvas) {
    let startX = 0, startY = 0, moved = false;
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            moved = false;
        }
    });
    canvas.addEventListener('touchmove', () => { moved = true; });
    canvas.addEventListener('touchend', (e) => {
        if (!moved) { simulateKey('ArrowUp'); return; }
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 30) simulateKey('ArrowRight');
            else if (dx < -30) simulateKey('ArrowLeft');
        } else {
            if (dy > 30) simulateKey('ArrowDown');
            else if (dy < -30) simulateKey(' ');
        }
    });
}
function simulateKey(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

// --- Animation Loop & State ---
function mobileAnimationLoop() {
    const state = getMobileGameState();
    if (state === STATE_TITLE) {
        stopMobileTitleScreen();
        startMobileTitleScreen();
        hideMobileControls();
        return;
    } else {
        stopMobileTitleScreen();
        // hideMobileTitleButtons();
        showMobileControls(simulateKey);
        if (state === STATE_PLAY) {
            drawMobileGame();
        } else if (state === STATE_HIGHSCORES) {
            drawMobileHighscores();
        } else if (state === STATE_NAME_ENTRY) {
            drawMobileNameEntry(getMobilePlayerName());
        } else if (state === STATE_GAMEOVER) {
            drawMobileGameOver(getMobileScore());
            hideMobileControls();
        }
    }
    requestAnimationFrame(mobileAnimationLoop);
}
window.mobileAnimationLoop = mobileAnimationLoop;

// --- Game Over Tap Handler ---
if (typeof window._mobileGameOverTapHandlerAttached === 'undefined') {
    window._mobileGameOverTapHandlerAttached = true;
    document.addEventListener('touchend', function gameOverTapHandler() {
        if (getGameState() === STATE_GAMEOVER) {
            window._mobileGameState = STATE_TITLE;
        }
    });
}

// --- Listen for state change to STATE_PLAY to initialize the board ---
const _origSetMobileGameState = Object.getOwnPropertyDescriptor(window, '_mobileGameState')?.set;
Object.defineProperty(window, '_mobileGameState', {
    configurable: true,
    enumerable: true,
    get() { return window.__mobileGameState; },
    set(val) {
        window.__mobileGameState = val;
        if (val === STATE_PLAY && typeof window.initMobileBoard === 'function') {
            window.initMobileBoard();
        }
        if (typeof _origSetMobileGameState === 'function') _origSetMobileGameState(val);
    }
});

// --- Utility: Debounce ---
function debounce(fn, ms) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}
