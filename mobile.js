// Mobile-specific game setup for Slowtris
// This will be expanded with touch controls and responsive layout
import { getGameState, getBoard, getCurrent, getCurrentX, getCurrentY, getNext, getScore, getFlashRowsActive, getPlayerName, STATE_TITLE, STATE_PLAY, STATE_HIGHSCORES, STATE_NAME_ENTRY } from './game.js';
import { drawGame, drawTitleScreen, drawHighscores, drawNameEntry, enableMobileCanvasResize, setContext, showMobileTitleButtons, hideMobileTitleButtons } from './draw-mobile.js';

export function setupMobileGame() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            _setupMobileGame();
        });
    } else {
        _setupMobileGame();
    }
}

function _setupMobileGame() {
    console.log('[Mobile] DOM ready, setting up game');
    enableMobileCanvasResize();
    window.addEventListener('orientationchange', enableMobileCanvasResize);
    window.addEventListener('resize', enableMobileCanvasResize);
    setContext(document.getElementById('gameCanvas').getContext('2d'), document.getElementById('gameCanvas'));
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
            // Tap: rotate (clockwise)
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
            else if (dy < -30) simulateKey(' '); // swipe up = hard drop
        }
    });
}

function mobileAnimationLoop() {
    const state = getGameState();
    if (state === STATE_TITLE) {
        drawTitleScreen();
        showMobileTitleButtons();
        hideMobileControls();
    } else {
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
        }
    }
    requestAnimationFrame(mobileAnimationLoop);
}

function simulateKey(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

function showMobileControls() {
    if (!document.getElementById('mobile-controls')) addMobileButtons();
    const controls = document.getElementById('mobile-controls');
    if (controls) controls.style.display = 'flex';
}
