import { setupGame, getGameState, getBoard, getCurrent, getCurrentX, getCurrentY, getNext, getScore, getFlashRowsActive, getPlayerName, STATE_TITLE, STATE_PLAY, STATE_HIGHSCORES, STATE_NAME_ENTRY } from './game.js';
import { drawGame, drawTitleScreen, drawHighscores, drawNameEntry } from './draw.js';

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (isMobile()) {
    import('./mobile.js').then(mod => {
        mod.setupMobileGame();
    });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setupGame();
        animationLoop();
    });
}

function animationLoop() {
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
