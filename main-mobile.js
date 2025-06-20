// Animation frame ID for mobile title screen (must be declared before any function uses it)
let mobileTitleAnimFrameId = null;
let lastTitleAnimTime = 0;

import { getGameState, getBoard, getCurrent, getCurrentX, getCurrentY, getNext, getScore, getFlashRowsActive, getPlayerName, STATE_TITLE, STATE_PLAY, STATE_HIGHSCORES, STATE_NAME_ENTRY, STATE_GAMEOVER, handleKeydown } from './game.js';
import { drawGame, drawTitleScreen, drawHighscores, drawNameEntry, drawMobileGameOver, enableMobileCanvasResize, setContext, showMobileTitleButtons, hideMobileTitleButtons, updateMobileTitleBgBlocks } from './draw-mobile.js';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupMobileGame();
    });
} else {
    setupMobileGame();
}

function setupMobileGame() {
    console.log('[Mobile] DOM ready, setting up game');
    enableMobileCanvasResize();
    window.addEventListener('orientationchange', enableMobileCanvasResize);
    window.addEventListener('resize', enableMobileCanvasResize);
    setContext(document.getElementById('gameCanvas').getContext('2d'), document.getElementById('gameCanvas'));
    document.addEventListener('keydown', handleKeydown); // Attach to document for simulated events
    // Mobile-specific: set initial game state to STATE_TITLE
    window.mobileTitleBgBlocks = undefined; // Ensure re-init in drawMobileTitleScreen
    if (typeof window._mobileGameState === 'undefined') {
        window._mobileGameState = 0; // 0 = STATE_TITLE
    }
    setupTouchControls();
    mobileAnimationLoop();
}

function setupTouchControls() {
    const canvas = document.getElementById('gameCanvas');
    let startX = 0, startY = 0, moved = false;
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            moved = false;
        }
    });
    canvas.addEventListener('touchmove', (e) => {
        moved = true;
    });
    canvas.addEventListener('touchend', (e) => {
        if (!moved) {
            simulateKey('ArrowUp');
            return;
        }
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

function startMobileTitleScreen() {
    if (mobileTitleAnimFrameId) cancelAnimationFrame(mobileTitleAnimFrameId);
    lastTitleAnimTime = performance.now();
    mobileTitleScreenAnimLoop();
}

function stopMobileTitleScreen() {
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

// --- Mobile Game Over Tap Handler ---
import { STATE_GAMEOVER, STATE_TITLE } from './game.js';
import { drawMobileGameOver } from './draw-mobile.js';

function mobileAnimationLoop() {
    const state = getGameState();
    console.log('[Mobile] Animation loop state:', state);
    if (state === STATE_TITLE) {
        stopMobileTitleScreen();
        startMobileTitleScreen();
        hideMobileControls();
        return;
    } else {
        stopMobileTitleScreen();
        hideMobileTitleButtons();
        showMobileControls();
        if (state === STATE_PLAY) {
            drawGame(
                getBoard(),
                getCurrent(),
                getCurrentX(),
                getCurrentY(),
                getNext(),
                getScore(),
                getFlashRowsActive()
            );
        } else if (state === STATE_HIGHSCORES) {
            drawHighscores();
        } else if (state === STATE_NAME_ENTRY) {
            drawNameEntry(getPlayerName());
        } else if (state === STATE_GAMEOVER) {
            drawMobileGameOver(getScore());
            hideMobileControls();
        }
    }
    requestAnimationFrame(mobileAnimationLoop);
}

window.mobileAnimationLoop = mobileAnimationLoop;

if (typeof window._mobileGameOverTapHandlerAttached === 'undefined') {
    window._mobileGameOverTapHandlerAttached = true;
    document.addEventListener('touchend', function gameOverTapHandler() {
        if (getGameState() === STATE_GAMEOVER) {
            window._mobileGameState = STATE_TITLE;
        }
    });
}

function simulateKey(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

function showMobileControls() {
    if (!document.getElementById('mobile-controls')) addMobileButtons();
    const controls = document.getElementById('mobile-controls');
    if (controls.style.display === 'none' || controls.style.display === '') {
        controls.style.display = 'block';
        setTimeout(() => {
            controls.classList.add('fade-in');
        }, 10);
    }
}

function hideMobileControls() {
    const controls = document.getElementById('mobile-controls');
    if (controls.style.display !== 'none') {
        controls.classList.remove('fade-in');
        controls.style.display = 'none';
    }
}

// Initial call to kick things off
mobileAnimationLoop();
