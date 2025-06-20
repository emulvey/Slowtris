// Mobile-specific game setup for Slowtris
// This will be expanded with touch controls and responsive layout
import { setupGame, getGameState, getBoard, getCurrent, getCurrentX, getCurrentY, getNext, getScore, getFlashRowsActive, getPlayerName, STATE_TITLE, STATE_PLAY, STATE_HIGHSCORES, STATE_NAME_ENTRY } from './game.js';
import { drawGame, drawMobileTitleScreen, drawHighscores, drawNameEntry, enableMobileCanvasResize, setContext, showMobileTitleButtons, hideMobileTitleButtons } from './draw-mobile.js';

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
    setupGame();
    setContext(document.getElementById('gameCanvas').getContext('2d'), document.getElementById('gameCanvas'));
    setupTouchControls();
    animationLoop();
}

function setupTouchControls() {
    const canvas = document.getElementById('gameCanvas');
    let startX = 0, startY = 0, moved = false;

    // Swipe detection for left/right/down
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

    // On-screen buttons for fallback
    addMobileButtons();
}

function animationLoop() {
    const state = getGameState();
    if (state === STATE_TITLE) {
        drawMobileTitleScreen();
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
    requestAnimationFrame(animationLoop);
}

function simulateKey(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

function addMobileButtons() {
    if (document.getElementById('mobile-controls')) return;
    // Create a simple overlay for left, right, rotate, down, hard drop
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

function showMobileControls() {
    const controls = document.getElementById('mobile-controls');
    if (controls) controls.style.display = 'flex';
}
function hideMobileControls() {
    const controls = document.getElementById('mobile-controls');
    if (controls) controls.style.display = 'none';
}
