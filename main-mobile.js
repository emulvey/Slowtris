// Animation frame ID for mobile title screen (must be declared before any function uses it)
let mobileTitleAnimFrameId = null;
let lastTitleAnimTime = 0;

import { getGameState, getBoard, getCurrent, getCurrentX, getCurrentY, getNext, getScore, getFlashRowsActive, getPlayerName, STATE_TITLE, STATE_PLAY, STATE_HIGHSCORES, STATE_NAME_ENTRY, handleKeydown } from './game.js';
import { drawGame, drawTitleScreen, drawHighscores, drawNameEntry, enableMobileCanvasResize, setContext, showMobileTitleButtons, hideMobileTitleButtons, updateMobileTitleBgBlocks } from './draw-mobile.js';

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
            console.log('[Mobile] Drawing game:', {
                board: getBoard(),
                current: getCurrent(),
                currentX: getCurrentX(),
                currentY: getCurrentY(),
                next: getNext(),
                score: getScore(),
                flashRowsActive: getFlashRowsActive()
            });
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

// Expose mobileAnimationLoop globally so it can be called from game.js
window.mobileAnimationLoop = mobileAnimationLoop;

function simulateKey(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

function showMobileControls() {
    if (!document.getElementById('mobile-controls')) addMobileButtons();
    const controls = document.getElementById('mobile-controls');
    if (controls) controls.style.display = 'flex';
}
function hideMobileControls() {
    const controls = document.getElementById('mobile-controls');
    if (controls) controls.style.display = 'none';
}

function addMobileButtons() {
    if (document.getElementById('mobile-controls')) return;
    const controls = document.createElement('div');
    controls.id = 'mobile-controls';
    controls.style.position = 'fixed';
    controls.style.left = '0';
    controls.style.right = '0';
    controls.style.bottom = '0';
    controls.style.zIndex = '100';
    controls.style.display = 'flex';
    controls.style.justifyContent = 'center';
    controls.style.gap = '12px';
    controls.style.padding = '12px 0 24px 0';
    controls.innerHTML = `
        <button data-key="ArrowLeft">◀️</button>
        <button data-key="ArrowDown">⬇️</button>
        <button data-key="ArrowUp">⟳</button>
        <button data-key=" ">⏬</button>
        <button data-key="ArrowRight">▶️</button>
    `;
    Array.from(controls.querySelectorAll('button')).forEach(btn => {
        btn.style.fontSize = '2rem';
        btn.style.padding = '12px 18px';
        btn.style.borderRadius = '12px';
        btn.style.border = 'none';
        btn.style.background = '#333';
        btn.style.color = '#fff';
        btn.style.boxShadow = '0 2px 8px #0006';
        btn.addEventListener('touchstart', e => {
            e.preventDefault();
            simulateKey(btn.dataset.key);
        });
    });
    document.body.appendChild(controls);
}
