import { setupGame, getGameState, getBoard, getCurrent, getCurrentX, getCurrentY, getNext, getScore, getFlashRowsActive, getPlayerName, STATE_TITLE, STATE_PLAY, STATE_HIGHSCORES, STATE_NAME_ENTRY } from './game.js';
import { drawGame, drawTitleScreen, drawHighscores, drawNameEntry } from './draw.js';

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (isMobile()) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            import('./mobile.js').then(mod => {
                console.log('[Main] Mobile detected, running mobile entry');
                mod.setupMobileGame();
            });
        });
    } else {
        import('./mobile.js').then(mod => {
            console.log('[Main] Mobile detected, running mobile entry');
            mod.setupMobileGame();
        });
    }
} else {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[Main] Desktop detected, DOM ready, running setupGame');
            setupGame();
            animationLoop();
        });
    } else {
        console.log('[Main] Desktop detected, DOM already ready, running setupGame');
        setupGame();
        animationLoop();
    }
}

function animationLoop() {
    if (isMobile()) {
        // If on mobile, redirect to the mobile animation loop
        import('./mobile.js').then(mod => {
            console.warn('[Main] animationLoop called on mobile, redirecting to mobileAnimationLoop.');
            if (typeof mod.mobileAnimationLoop === 'function') {
                mod.mobileAnimationLoop();
            } else {
                // fallback for default export or legacy
                (mod.default?.mobileAnimationLoop || mod.default?.animationLoop)?.();
            }
        });
        return;
    }
    const state = getGameState();
    if (state === STATE_TITLE) {
        drawTitleScreen();
    } else if (state === STATE_PLAY) {
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
    requestAnimationFrame(animationLoop);
}
