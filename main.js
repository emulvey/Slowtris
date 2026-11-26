// Unified entry point for Slowtris (Desktop, Mobile, and Browser Extension)

import {
    initGame,
    startNewGame,
    togglePause,
    openHighscores,
    returnToTitle,
    submitHighscoreName,
    moveLeft,
    moveRight,
    softDrop,
    hardDrop,
    rotatePiece,
    getState,
    getSnapshot,
    STATE_TITLE,
    STATE_PLAY,
    STATE_PAUSED,
    STATE_GAMEOVER,
    STATE_NAME_ENTRY,
    STATE_HIGHSCORES,
} from './game.js';
import {
    initRenderer,
    resizeCanvases,
    renderFrame,
    handleGameEffect,
    clearEffects,
    getDisplayStress,
} from './draw.js';
import {
    unlockAudio,
    playSfx,
    setSfxEnabled,
    setMusicEnabled,
    setMusicActive,
    setMusicStress,
} from './audio.js';
import { getHighscores, getBestScore, loadSettings, saveSettings } from './storage.js';

// Detect browser extension context so popup sizes cleanly
const isExtensionContext =
    typeof location !== 'undefined' &&
    (location.protocol === 'chrome-extension:' ||
        location.protocol === 'moz-extension:' ||
        location.protocol === 'safari-web-extension:');

if (isExtensionContext) {
    document.documentElement.classList.add('is-extension');
}

// DOM references
const bgCanvas = document.getElementById('bgCanvas');
const boardCanvas = document.getElementById('boardCanvas');
const nextCanvas = document.getElementById('nextCanvas');
const boardFrame = document.getElementById('boardFrame');
const gameLayout = document.querySelector('.game-layout');

const btnHome = document.getElementById('btn-home');
const btnSfx = document.getElementById('btn-sfx');
const btnMusic = document.getElementById('btn-music');
const btnTouch = document.getElementById('btn-touch');
const btnPause = document.getElementById('btn-pause');

const hudScore = document.getElementById('hud-score');
const hudBest = document.getElementById('hud-best');
const hudLines = document.getElementById('hud-lines');
const hudTurns = document.getElementById('hud-turns');
const hudTurnCard = document.getElementById('hud-turn-card');
const hudTurnLabel = document.getElementById('hud-turn-label');
const hudTurnPips = document.getElementById('hud-turn-pips');

const touchControls = document.getElementById('touchControls');
const overlayLayer = document.getElementById('overlayLayer');
const screenTitle = document.getElementById('screen-title');
const screenPause = document.getElementById('screen-pause');
const screenGameover = document.getElementById('screen-gameover');
const screenName = document.getElementById('screen-name');
const screenHighscores = document.getElementById('screen-highscores');

const titleBestWrap = document.getElementById('title-best-wrap');
const titleBest = document.getElementById('title-best');
const goScore = document.getElementById('go-score');
const goLines = document.getElementById('go-lines');
const goTurns = document.getElementById('go-turns');
const nameScore = document.getElementById('name-score');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const highscoreList = document.getElementById('highscore-list');

let settings = loadSettings();
let touchAutoDetected =
    (typeof window !== 'undefined' &&
        (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)) &&
    !isExtensionContext;

function shouldShowTouchControls() {
    if (settings.touchControls === 'on') return true;
    if (settings.touchControls === 'off') return false;
    return touchAutoDetected;
}

function syncToolbarUI() {
    btnSfx.classList.toggle('is-muted', !settings.sfxEnabled);
    btnSfx.setAttribute('aria-pressed', String(settings.sfxEnabled));

    btnMusic.classList.toggle('is-muted', !settings.musicEnabled);
    btnMusic.setAttribute('aria-pressed', String(settings.musicEnabled));

    const showTouch = shouldShowTouchControls();
    btnTouch.classList.toggle('is-active', showTouch);
    btnTouch.setAttribute('aria-pressed', String(showTouch));

    const state = getState();
    const playingOrPaused = state === STATE_PLAY || state === STATE_PAUSED;
    touchControls.classList.toggle('hidden', !showTouch || !playingOrPaused);
    btnPause.classList.toggle('hidden', !playingOrPaused);

    // Recompute canvas dimensions when touch bar visibility changes
    requestAnimationFrame(() => resizeCanvases());
}

function updateHud(snapshot) {
    hudScore.textContent = snapshot.score.toLocaleString();
    hudBest.textContent = snapshot.bestScore.toLocaleString();
    hudLines.textContent = String(snapshot.lines);
    hudTurns.textContent = String(snapshot.turns);

    // Turn / Lock Pips indicator
    const pips = hudTurnPips.querySelectorAll('.pip');
    hudTurnCard.classList.remove('is-locking', 'is-locking-urgent');

    if (snapshot.isGrounded && snapshot.current) {
        const remaining = Math.max(1, snapshot.lockDelay - snapshot.lockMoves);
        hudTurnLabel.textContent = 'LOCK IN';
        hudTurnCard.classList.add('is-locking');
        if (remaining === 1) {
            hudTurnCard.classList.add('is-locking-urgent');
        }
        pips.forEach((pip, idx) => {
            pip.classList.toggle('is-filled', idx < remaining);
        });
    } else {
        const remaining = Math.max(1, snapshot.movesPerDrop - snapshot.moveCount);
        hudTurnLabel.textContent = 'DROP IN';
        pips.forEach((pip, idx) => {
            pip.classList.toggle('is-filled', idx < remaining);
        });
    }
}

function renderHighscoreList() {
    const scores = getHighscores();
    highscoreList.textContent = '';
    scores.forEach((entry, idx) => {
        const li = document.createElement('li');
        li.className = 'hs-row' + (idx < 3 ? ` hs-rank-${idx + 1}` : '');

        const rankSpan = document.createElement('span');
        rankSpan.className = 'hs-rank';
        rankSpan.textContent = `${idx + 1}.`;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'hs-name';
        nameSpan.textContent = entry.name;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'hs-score';
        scoreSpan.textContent = entry.score.toLocaleString();

        li.append(rankSpan, nameSpan, scoreSpan);
        highscoreList.appendChild(li);
    });
}

function updateScreens(state, snapshot) {
    const screens = [screenTitle, screenPause, screenGameover, screenName, screenHighscores];
    screens.forEach(s => s.classList.add('hidden'));

    const showOverlay = state !== STATE_PLAY;
    const hideBoardBehind = state === STATE_TITLE || state === STATE_HIGHSCORES;
    overlayLayer.classList.toggle('hidden', !showOverlay);
    overlayLayer.classList.toggle('is-title', state === STATE_TITLE);
    gameLayout.classList.toggle('is-dimmed', hideBoardBehind);

    setMusicActive(state === STATE_PLAY);

    if (state === STATE_TITLE) {
        clearEffects();
        const best = getBestScore();
        titleBestWrap.classList.toggle('hidden', best <= 0);
        titleBest.textContent = best.toLocaleString();
        screenTitle.classList.remove('hidden');
    } else if (state === STATE_PAUSED) {
        screenPause.classList.remove('hidden');
    } else if (state === STATE_GAMEOVER) {
        goScore.textContent = snapshot.score.toLocaleString();
        goLines.textContent = String(snapshot.lines);
        goTurns.textContent = String(snapshot.turns);
        screenGameover.classList.remove('hidden');
    } else if (state === STATE_NAME_ENTRY) {
        nameScore.textContent = snapshot.score.toLocaleString();
        nameInput.value = '';
        screenName.classList.remove('hidden');
        setTimeout(() => nameInput.focus(), 60);
    } else if (state === STATE_HIGHSCORES) {
        renderHighscoreList();
        screenHighscores.classList.remove('hidden');
    }

    syncToolbarUI();
}

// --- Action Dispatch ---

function performAction(action) {
    unlockAudio();
    switch (action) {
        case 'left': moveLeft(); break;
        case 'right': moveRight(); break;
        case 'down': softDrop(); break;
        case 'rotateCW': rotatePiece(1); break;
        case 'rotateCCW': rotatePiece(-1); break;
        case 'hardDrop': hardDrop(); break;
        default: break;
    }
}

// --- Keyboard Controls ---

function handleKeydown(e) {
    const state = getState();

    // Let native input handle typing during name entry
    if (state === STATE_NAME_ENTRY) {
        if (document.activeElement !== nameInput && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
            nameInput.focus();
        }
        return;
    }

    unlockAudio();

    // Global mute shortcut
    if ((e.key === 'm' || e.key === 'M') && !e.repeat && !e.ctrlKey && !e.metaKey) {
        toggleSfx();
        return;
    }

    if (state === STATE_TITLE) {
        if (e.key === 'Enter' && !e.repeat) {
            e.preventDefault();
            clearEffects();
            startNewGame();
        } else if ((e.key === 'h' || e.key === 'H') && !e.repeat) {
            e.preventDefault();
            openHighscores();
        }
        return;
    }

    if (state === STATE_HIGHSCORES) {
        if ((e.key === 'Enter' || e.key === 'Escape' || e.key === 'Backspace') && !e.repeat) {
            e.preventDefault();
            returnToTitle();
        }
        return;
    }

    if (state === STATE_GAMEOVER) {
        if (e.key === 'Enter' && !e.repeat) {
            e.preventDefault();
            clearEffects();
            startNewGame();
        } else if (e.key === 'Escape' && !e.repeat) {
            e.preventDefault();
            returnToTitle();
        }
        return;
    }

    if (state === STATE_PAUSED) {
        if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            togglePause();
        } else if ((e.key === 'r' || e.key === 'R') && !e.repeat) {
            e.preventDefault();
            clearEffects();
            startNewGame();
        }
        return;
    }

    if (state === STATE_PLAY) {
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                e.preventDefault();
                moveLeft();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                e.preventDefault();
                moveRight();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                e.preventDefault();
                softDrop();
                break;
            case 'ArrowUp':
            case 'x':
            case 'X':
            case 'w':
            case 'W':
                e.preventDefault();
                if (!e.repeat) rotatePiece(1);
                break;
            case 'z':
            case 'Z':
                e.preventDefault();
                if (!e.repeat) rotatePiece(-1);
                break;
            case ' ':
            case 'Enter':
                e.preventDefault();
                if (!e.repeat) hardDrop();
                break;
            case 'p':
            case 'P':
            case 'Escape':
                e.preventDefault();
                if (!e.repeat) togglePause();
                break;
            default:
                break;
        }
    }
}

// --- Board Touch / Swipe Gestures ---

function setupBoardGestures() {
    let activePointerId = null;
    let startX = 0;
    let startY = 0;
    let lastStepX = 0;
    let lastStepY = 0;
    let startTime = 0;
    let didDragStep = false;

    const STEP_PX = 28;
    const FLICK_MIN_DY = 62;
    const FLICK_MAX_MS = 230;
    const TAP_MAX_DIST = 14;
    const TAP_MAX_MS = 260;

    boardCanvas.addEventListener('pointerdown', (e) => {
        if (getState() !== STATE_PLAY) return;
        if (e.pointerType === 'touch') {
            touchAutoDetected = true;
            if (settings.touchControls === 'auto') syncToolbarUI();
        }
        unlockAudio();
        activePointerId = e.pointerId;
        startX = lastStepX = e.clientX;
        startY = lastStepY = e.clientY;
        startTime = performance.now();
        didDragStep = false;
        boardCanvas.setPointerCapture(e.pointerId);
    });

    boardCanvas.addEventListener('pointermove', (e) => {
        if (e.pointerId !== activePointerId || getState() !== STATE_PLAY) return;
        const dx = e.clientX - lastStepX;
        const dy = e.clientY - lastStepY;

        if (Math.abs(dx) >= STEP_PX && Math.abs(dx) > Math.abs(dy) * 0.85) {
            const steps = Math.trunc(dx / STEP_PX);
            for (let i = 0; i < Math.abs(steps); i++) {
                if (steps > 0) moveRight();
                else moveLeft();
            }
            lastStepX += steps * STEP_PX;
            lastStepY = e.clientY;
            didDragStep = true;
        } else if (dy >= STEP_PX * 1.25 && Math.abs(dy) > Math.abs(dx) * 1.1) {
            // Only soft-drop step on slow drags (leave room for quick flick hard-drop)
            const elapsed = performance.now() - startTime;
            if (elapsed > 140) {
                softDrop();
                lastStepY = e.clientY;
                didDragStep = true;
            }
        }
    });

    function endGesture(e) {
        if (e.pointerId !== activePointerId) return;
        activePointerId = null;
        if (getState() !== STATE_PLAY) return;

        const totalDx = e.clientX - startX;
        const totalDy = e.clientY - startY;
        const elapsed = performance.now() - startTime;

        if (!didDragStep) {
            if (totalDy >= FLICK_MIN_DY && Math.abs(totalDy) > Math.abs(totalDx) * 1.4 && elapsed <= FLICK_MAX_MS) {
                hardDrop();
            } else if (Math.hypot(totalDx, totalDy) <= TAP_MAX_DIST && elapsed <= TAP_MAX_MS) {
                rotatePiece(1);
            } else if (totalDy >= STEP_PX && Math.abs(totalDy) > Math.abs(totalDx)) {
                softDrop();
            }
        }
    }

    boardCanvas.addEventListener('pointerup', endGesture);
    boardCanvas.addEventListener('pointercancel', () => {
        activePointerId = null;
    });
}

// --- On-Screen Touch Button Wiring ---

function setupTouchButtons() {
    const buttons = touchControls.querySelectorAll('.touch-btn');
    buttons.forEach(btn => {
        const action = btn.dataset.action;
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            btn.classList.add('is-pressed');
            performAction(action);
        });
        const release = () => btn.classList.remove('is-pressed');
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointercancel', release);
        btn.addEventListener('pointerleave', release);
    });
}

// --- Toolbar & Overlay Button Wiring ---

function toggleSfx() {
    unlockAudio();
    settings = saveSettings({ sfxEnabled: !settings.sfxEnabled });
    setSfxEnabled(settings.sfxEnabled);
    if (settings.sfxEnabled) playSfx('ui');
    syncToolbarUI();
}

function toggleMusic() {
    unlockAudio();
    settings = saveSettings({ musicEnabled: !settings.musicEnabled });
    setMusicEnabled(settings.musicEnabled);
    playSfx('ui');
    syncToolbarUI();
}

function toggleTouchPad() {
    unlockAudio();
    const currentlyShown = shouldShowTouchControls();
    settings = saveSettings({ touchControls: currentlyShown ? 'off' : 'on' });
    playSfx('ui');
    syncToolbarUI();
}

function setupButtons() {
    btnHome.addEventListener('click', () => {
        unlockAudio();
        if (getState() !== STATE_TITLE) {
            returnToTitle();
        }
    });
    btnSfx.addEventListener('click', toggleSfx);
    btnMusic.addEventListener('click', toggleMusic);
    btnTouch.addEventListener('click', toggleTouchPad);
    btnPause.addEventListener('click', () => {
        unlockAudio();
        togglePause();
    });

    document.getElementById('btn-start').addEventListener('click', () => {
        unlockAudio();
        clearEffects();
        startNewGame();
    });
    document.getElementById('btn-highscores').addEventListener('click', () => {
        unlockAudio();
        openHighscores();
    });
    document.getElementById('btn-resume').addEventListener('click', () => {
        unlockAudio();
        togglePause();
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
        unlockAudio();
        clearEffects();
        startNewGame();
    });
    document.getElementById('btn-pause-title').addEventListener('click', () => {
        unlockAudio();
        returnToTitle();
    });
    document.getElementById('btn-play-again').addEventListener('click', () => {
        unlockAudio();
        clearEffects();
        startNewGame();
    });
    document.getElementById('btn-go-highscores').addEventListener('click', () => {
        unlockAudio();
        openHighscores();
    });
    document.getElementById('btn-go-title').addEventListener('click', () => {
        unlockAudio();
        returnToTitle();
    });
    document.getElementById('btn-hs-play').addEventListener('click', () => {
        unlockAudio();
        clearEffects();
        startNewGame();
    });
    document.getElementById('btn-hs-back').addEventListener('click', () => {
        unlockAudio();
        returnToTitle();
    });

    nameInput.addEventListener('input', () => {
        nameInput.value = nameInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    });

    nameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        unlockAudio();
        submitHighscoreName(nameInput.value);
    });
}

// --- Animation Loop & Bootstrap ---

function animationLoop(now) {
    const snapshot = getSnapshot();
    renderFrame(snapshot, now);
    setMusicStress(getDisplayStress());
    requestAnimationFrame(animationLoop);
}

function boot() {
    setSfxEnabled(settings.sfxEnabled);
    setMusicEnabled(settings.musicEnabled);

    initRenderer({
        bg: bgCanvas,
        board: boardCanvas,
        next: nextCanvas,
        frame: boardFrame,
    });

    initGame({
        onStateChange: updateScreens,
        onHudChange: updateHud,
        onAudio: playSfx,
        onEffect: handleGameEffect,
    });

    setupButtons();
    setupTouchButtons();
    setupBoardGestures();
    window.addEventListener('keydown', handleKeydown);

    // Responsive canvas resizing on window resize, orientation change, and container layout shifts
    let resizeRaf = 0;
    const scheduleResize = () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
            resizeRaf = 0;
            resizeCanvases();
        });
    };
    window.addEventListener('resize', scheduleResize);
    window.addEventListener('orientationchange', () => setTimeout(scheduleResize, 120));
    if (typeof ResizeObserver !== 'undefined' && boardFrame.parentElement) {
        new ResizeObserver(scheduleResize).observe(boardFrame.parentElement);
    }

    syncToolbarUI();
    requestAnimationFrame(animationLoop);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
