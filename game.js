// Core unified turn-based Slowtris game engine

import { TETROMINOES, WALL_KICKS, nextTetromino, newBag, rotateCW, rotateCCW } from './tetromino.js';
import { loadHighscores, checkHighscore, insertHighscore, getBestScore } from './storage.js';

export const COLS = 10;
export const ROWS = 20;
export const MOVES_PER_DROP = 2;
export const LOCK_DELAY_MOVES = 2;

export const STATE_TITLE = 0;
export const STATE_PLAY = 1;
export const STATE_GAMEOVER = 2;
export const STATE_HIGHSCORES = 3;
export const STATE_NAME_ENTRY = 4;
export const STATE_PAUSED = 5;

const FLASH_EFFECT_DURATION = 200;
const LINE_POINTS = [0, 100, 300, 500, 800];
const CLEAR_LABELS = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'SLOWTRIS!'];

let gameState = STATE_TITLE;
let board = createEmptyBoard();
let current = null;
let next = null;
let currentX = 0;
let currentY = 0;
let moveCount = 0;
let lockMoves = 0;
let score = 0;
let linesCleared = 0;
let turns = 0;
let combo = 0;
let flashRowsActive = null;
let flashTimeoutId = null;

let callbacks = {
    onStateChange: null,
    onHudChange: null,
    onAudio: null,
    onEffect: null,
};

function createEmptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function emitAudio(event, payload) {
    if (callbacks.onAudio) callbacks.onAudio(event, payload);
}

function emitEffect(effect) {
    if (callbacks.onEffect) callbacks.onEffect(effect);
}

function notifyHud() {
    if (callbacks.onHudChange) callbacks.onHudChange(getSnapshot());
}

function clearFlashTimeout() {
    if (flashTimeoutId !== null) {
        clearTimeout(flashTimeoutId);
        flashTimeoutId = null;
    }
    flashRowsActive = null;
}

export function initGame(cb = {}) {
    callbacks = {
        onStateChange: cb.onStateChange || null,
        onHudChange: cb.onHudChange || null,
        onAudio: cb.onAudio || null,
        onEffect: cb.onEffect || null,
    };
    loadHighscores();
    setGameState(STATE_TITLE, true);
}

export function setGameState(newState, force = false) {
    if (!force && gameState === newState) return;
    if (newState !== STATE_PLAY) {
        clearFlashTimeout();
    }
    gameState = newState;
    if (callbacks.onStateChange) callbacks.onStateChange(gameState, getSnapshot());
    notifyHud();
}

export function startNewGame() {
    clearFlashTimeout();
    board = createEmptyBoard();
    newBag();
    next = nextTetromino();
    score = 0;
    linesCleared = 0;
    turns = 0;
    combo = 0;
    moveCount = 0;
    lockMoves = 0;
    spawnTetromino();
    gameState = STATE_PLAY;
    emitAudio('start');
    if (callbacks.onStateChange) callbacks.onStateChange(gameState, getSnapshot());
    notifyHud();
}

export function togglePause() {
    if (gameState === STATE_PLAY) {
        if (flashRowsActive) return;
        setGameState(STATE_PAUSED);
        emitAudio('ui');
    } else if (gameState === STATE_PAUSED) {
        setGameState(STATE_PLAY);
        emitAudio('ui');
    }
}

export function openHighscores() {
    emitAudio('ui');
    setGameState(STATE_HIGHSCORES);
}

export function returnToTitle() {
    clearFlashTimeout();
    emitAudio('ui');
    setGameState(STATE_TITLE);
}

export function submitHighscoreName(name) {
    if (gameState !== STATE_NAME_ENTRY) return;
    const trimmed = String(name || '').trim();
    const finalName = trimmed.length > 0 ? trimmed : 'ANON';
    insertHighscore(finalName, score);
    emitAudio('ui');
    setGameState(STATE_HIGHSCORES);
}

function getTopOffset(shape) {
    for (let r = 0; r < shape.length; r++) {
        if (shape[r].some(cell => cell)) return r;
    }
    return 0;
}

function spawnTetromino() {
    current = next !== null ? next : nextTetromino();
    next = nextTetromino();
    currentX = Math.floor((COLS - current.shape[0].length) / 2);
    // Align highest filled row of the bounding matrix to row 0
    currentY = -getTopOffset(current.shape);
    moveCount = 0;
    lockMoves = 0;
}

export function isValidPosition(tet, x, y, shapeOverride = null, boardOverride = null) {
    if (!tet) return false;
    const shape = shapeOverride || tet.shape;
    const targetBoard = boardOverride || board;
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (!shape[row][col]) continue;
            const bx = x + col;
            const by = y + row;
            if (bx < 0 || bx >= COLS || by < 0 || by >= ROWS) {
                return false;
            }
            if (targetBoard[by][bx]) {
                return false;
            }
        }
    }
    return true;
}

export function isTouchingBottom(tet = current, x = currentX, y = currentY) {
    if (!tet) return false;
    return !isValidPosition(tet, x, y + 1);
}

export function getGhostY() {
    if (!current) return currentY;
    let gy = currentY;
    while (isValidPosition(current, currentX, gy + 1)) {
        gy++;
    }
    return gy;
}

export function getStackHeight(targetBoard = board) {
    for (let y = 0; y < ROWS; y++) {
        if (targetBoard[y].some(cell => cell)) {
            return ROWS - y;
        }
    }
    return 0;
}

function canAcceptPlayInput() {
    return gameState === STATE_PLAY && !flashRowsActive && current !== null;
}

function applyTurnAfterAction(wasTouching, actionType) {
    turns++;
    let didAutoDrop = false;

    moveCount++;
    if (moveCount >= MOVES_PER_DROP) {
        if (isValidPosition(current, currentX, currentY + 1)) {
            currentY++;
            didAutoDrop = true;
        }
        moveCount = 0;
    }

    const nowTouching = isTouchingBottom(current, currentX, currentY);

    if (nowTouching) {
        if (!wasTouching) {
            lockMoves = 0;
        } else {
            lockMoves++;
        }

        if (lockMoves >= LOCK_DELAY_MOVES) {
            placeTetromino(false);
            return;
        }

        if (lockMoves === LOCK_DELAY_MOVES - 1) {
            emitAudio('lockWarn');
        } else if (didAutoDrop) {
            emitAudio('autoDrop');
        } else {
            emitAudio(actionType);
        }
    } else {
        if (wasTouching && isValidPosition(current, currentX, currentY + 1)) {
            // Stepping off a ledge drops 1 row immediately so pieces can't hover
            currentY++;
            didAutoDrop = true;
            if (isTouchingBottom(current, currentX, currentY)) {
                lockMoves = 0;
            }
        }
        lockMoves = 0;
        emitAudio(didAutoDrop ? 'autoDrop' : actionType);
    }

    notifyHud();
}

export function moveLeft() {
    if (!canAcceptPlayInput()) return false;
    const wasTouching = isTouchingBottom();
    if (!isValidPosition(current, currentX - 1, currentY)) {
        emitAudio('bump');
        return false;
    }
    currentX--;
    applyTurnAfterAction(wasTouching, 'move');
    return true;
}

export function moveRight() {
    if (!canAcceptPlayInput()) return false;
    const wasTouching = isTouchingBottom();
    if (!isValidPosition(current, currentX + 1, currentY)) {
        emitAudio('bump');
        return false;
    }
    currentX++;
    applyTurnAfterAction(wasTouching, 'move');
    return true;
}

export function rotatePiece(direction = 1) {
    if (!canAcceptPlayInput()) return false;
    // O-piece doesn't change shape; still allow rotation feel? Better not waste a turn on O-piece
    if (TETROMINOES[current.type].name === 'O') {
        emitAudio('rotate');
        return false;
    }

    const wasTouching = isTouchingBottom();
    const rotated = direction >= 0 ? rotateCW(current.shape) : rotateCCW(current.shape);

    for (const [dx, dy] of WALL_KICKS) {
        if (isValidPosition(current, currentX + dx, currentY + dy, rotated)) {
            current.shape = rotated;
            currentX += dx;
            currentY += dy;
            applyTurnAfterAction(wasTouching, 'rotate');
            return true;
        }
    }

    emitAudio('bump');
    return false;
}

export function softDrop() {
    if (!canAcceptPlayInput()) return false;
    if (isValidPosition(current, currentX, currentY + 1)) {
        currentY++;
        turns++;
        moveCount = 0;
        if (isTouchingBottom(current, currentX, currentY)) {
            lockMoves = 0;
        }
        emitAudio('softDrop');
        notifyHud();
        return true;
    }
    // Already grounded: pressing down locks immediately
    turns++;
    placeTetromino(false);
    return true;
}

export function hardDrop() {
    if (!canAcceptPlayInput()) return false;
    const startY = currentY;
    const targetY = getGhostY();
    const dropDist = targetY - startY;

    // Emit drop trail effect
    if (dropDist > 0) {
        const trailCells = [];
        for (let r = 0; r < current.shape.length; r++) {
            for (let c = 0; c < current.shape[r].length; c++) {
                if (current.shape[r][c]) {
                    trailCells.push({ x: currentX + c, y: startY + r });
                }
            }
        }
        emitEffect({
            type: 'hardDrop',
            cells: trailCells,
            dropDist,
            color: TETROMINOES[current.type].color,
        });
    }

    currentY = targetY;
    turns++;
    placeTetromino(true);
    return true;
}

function placeTetromino(wasHardDrop) {
    const lockedCells = [];
    for (let y = 0; y < current.shape.length; y++) {
        for (let x = 0; x < current.shape[y].length; x++) {
            if (current.shape[y][x]) {
                const bx = currentX + x;
                const by = currentY + y;
                if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
                    board[by][bx] = current.type + 1;
                    lockedCells.push({ x: bx, y: by });
                }
            }
        }
    }

    emitEffect({
        type: 'lock',
        cells: lockedCells,
        color: TETROMINOES[current.type].highlight,
        hardDrop: wasHardDrop,
    });

    const clearedRows = [];
    for (let y = 0; y < ROWS; y++) {
        if (board[y].every(cell => cell !== 0)) {
            clearedRows.push(y);
        }
    }

    if (clearedRows.length > 0) {
        handleLineClear(clearedRows, wasHardDrop);
    } else {
        combo = 0;
        emitAudio(wasHardDrop ? 'hardDrop' : 'lock');
        finishPieceCycle();
    }
}

function handleLineClear(clearedRows, wasHardDrop) {
    const count = clearedRows.length;
    combo++;
    const basePoints = LINE_POINTS[count] || 800;
    const comboBonus = combo > 1 ? (combo - 1) * 50 : 0;
    const gained = basePoints + comboBonus;

    score += gained;
    linesCleared += count;
    flashRowsActive = clearedRows.slice();

    // Capture cleared cells for shatter particle effect
    const clearedBlocks = [];
    for (const row of clearedRows) {
        for (let col = 0; col < COLS; col++) {
            const val = board[row][col];
            if (val > 0) {
                clearedBlocks.push({
                    x: col,
                    y: row,
                    color: TETROMINOES[val - 1].color,
                    highlight: TETROMINOES[val - 1].highlight,
                });
            }
        }
    }

    const avgRow = clearedRows.reduce((a, b) => a + b, 0) / count;
    emitEffect({
        type: 'lineClear',
        rows: clearedRows.slice(),
        blocks: clearedBlocks,
        count,
        combo,
        points: gained,
        label: CLEAR_LABELS[count] || 'CLEAR!',
        centerY: avgRow,
    });

    if (wasHardDrop) {
        emitAudio('hardDrop');
    }
    emitAudio('lineClear', { count, combo });

    // Hide current piece while rows flash
    current = null;
    notifyHud();

    clearFlashTimeout();
    flashRowsActive = clearedRows.slice();

    flashTimeoutId = setTimeout(() => {
        flashTimeoutId = null;
        const sorted = clearedRows.slice().sort((a, b) => b - a);
        for (const rowIndex of sorted) {
            board.splice(rowIndex, 1);
            board.unshift(Array(COLS).fill(0));
        }
        flashRowsActive = null;
        finishPieceCycle();
    }, FLASH_EFFECT_DURATION);
}

function finishPieceCycle() {
    spawnTetromino();
    if (!isValidPosition(current, currentX, currentY)) {
        endGame();
    } else {
        notifyHud();
    }
}

function endGame() {
    if (checkHighscore(score)) {
        emitAudio('highscore');
        setGameState(STATE_NAME_ENTRY);
    } else {
        emitAudio('gameover');
        setGameState(STATE_GAMEOVER);
    }
}

export function getState() {
    return gameState;
}

export function getSnapshot() {
    const grounded = current ? isTouchingBottom(current, currentX, currentY) : false;
    return {
        gameState,
        board,
        current,
        currentX,
        currentY,
        ghostY: getGhostY(),
        next,
        score,
        bestScore: Math.max(score, getBestScore()),
        lines: linesCleared,
        turns,
        combo,
        moveCount,
        movesPerDrop: MOVES_PER_DROP,
        lockMoves,
        lockDelay: LOCK_DELAY_MOVES,
        isGrounded: grounded,
        flashRowsActive,
        stackHeight: getStackHeight(board),
    };
}
