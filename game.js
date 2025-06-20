import { TETROMINOES, nextTetromino, newBag, rotate } from './tetromino.js';
import { drawGame, drawTitleScreen, drawHighscores, drawNameEntry, setContext, resetTitleBgBlocks, updateTitleBgBlocks } from './draw.js';
import { loadHighscores, saveHighscores, checkHighscore, insertHighscore, getHighscores } from './storage.js';

// --- State constants ---
export const STATE_TITLE = 0;
export const STATE_PLAY = 1;
export const STATE_GAMEOVER = 2;
export const STATE_HIGHSCORES = 3;
export const STATE_NAME_ENTRY = 4;

let canvas, ctx;
let COLS = 10, ROWS = 20;
let BOARD_X = 40, BOARD_Y = 60, BOARD_W = COLS * 24, BOARD_H = ROWS * 24;

let gameState;
let titleAnimLastTime = 0;
let titleAnimFrameId = null;

let board, current, next, currentX, currentY, moveCount, lockMoves, lockDelay, score;
let flashRowsActive = null;
let flashTimeoutId = null;
const FLASH_EFFECT_DURATION = 120;
let playerName = '';

// --- State accessors for animation loop ---
export function getGameState() { return gameState; }
export function getBoard() { return board; }
export function getCurrent() { return current; }
export function getCurrentX() { return currentX; }
export function getCurrentY() { return currentY; }
export function getNext() { return next; }
export function getScore() { return score; }
export function getFlashRowsActive() { return flashRowsActive; }
export function getPlayerName() { return playerName; }

export function setupGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    setContext(ctx, canvas);
    loadHighscores();
    setGameState(STATE_TITLE);
    window.addEventListener('keydown', handleKeydown);
    // Provide state accessors for animation loop
    console.log('setupGame called, canvas:', canvas, 'ctx:', ctx);
}

function setGameState(newState) {
    if (gameState === newState) return;
    gameState = newState;
    console.log('setGameState:', newState);
    if (gameState === STATE_TITLE) {
        startTitleScreen();
    } else if (gameState === STATE_PLAY) {
        stopTitleScreen();
        startGame();
    } else if (gameState === STATE_GAMEOVER) {
        stopTitleScreen();
        drawGameOver();
    } else if (gameState === STATE_HIGHSCORES) {
        stopTitleScreen();
        drawHighscores();
    } else if (gameState === STATE_NAME_ENTRY) {
        stopTitleScreen();
        drawNameEntry(playerName);
    }
}

function startTitleScreen() {
    titleAnimLastTime = performance.now();
    resetTitleBgBlocks();
    if (titleAnimFrameId) cancelAnimationFrame(titleAnimFrameId);
    console.log('Starting title screen animation');
    titleScreenAnimLoop();
}

function stopTitleScreen() {
    if (titleAnimFrameId) {
        cancelAnimationFrame(titleAnimFrameId);
        titleAnimFrameId = null;
        console.log('Stopped title screen animation');
    }
}

function titleScreenAnimLoop() {
    if (gameState !== STATE_TITLE) return;
    let now = performance.now();
    let dt = (now - titleAnimLastTime) * 0.25; // Slow animation to 25% speed (half of previous 50%)
    titleAnimLastTime = now;
    updateTitleBgBlocks(dt);
    drawTitleScreen();
    titleAnimFrameId = requestAnimationFrame(titleScreenAnimLoop);
    // Debug output
    // console.log('titleScreenAnimLoop running');
}

function startGame() {
    resetBoard();
    newBag();
    next = nextTetromino();
    score = 0;
    moveCount = 0;
    lockMoves = 0;
    lockDelay = 2;
    flashRowsActive = null;
    spawnTetromino();
    render();
}

function resetBoard() {
    board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
}

function spawnTetromino() {
    current = next !== undefined ? next : nextTetromino();
    next = nextTetromino();
    currentX = Math.floor(COLS / 2) - Math.ceil(current.shape[0].length / 2);
    currentY = 0;
    moveCount = 0;
}

function render() {
    if (gameState === STATE_PLAY) {
        drawGame(board, current, currentX, currentY, next, score, flashRowsActive);
    }
}

function handleKeydown(e) {
    if (gameState === STATE_TITLE) {
        if (e.key === 'Enter') {
            setGameState(STATE_PLAY);
        } else if (e.key.toLowerCase() === 'h') {
            setGameState(STATE_HIGHSCORES);
        }
        return;
    }
    if (gameState === STATE_PLAY) {
        if (flashRowsActive) return; // Block input during flash
        if (!current) return;
        let moved = false;
        let wasTouching = isTouchingBottom(current, currentX, currentY);
        let manualDown = false;
        if (e.key === 'ArrowLeft') {
            if (isValidPosition(current, currentX - 1, currentY)) {
                currentX--;
                moved = true;
            }
        } else if (e.key === 'ArrowRight') {
            if (isValidPosition(current, currentX + 1, currentY)) {
                currentX++;
                moved = true;
            }
        } else if (e.key === 'ArrowDown') {
            if (isValidPosition(current, currentX, currentY + 1)) {
                currentY++;
                moved = true;
                manualDown = true;
            } else {
                placeTetromino();
                render();
                return;
            }
        } else if (e.key === 'z' || e.key === 'Z') {
            let rotated = rotate(rotate(rotate(current.shape)));
            if (isValidPosition({ type: current.type, shape: rotated }, currentX, currentY)) {
                current.shape = rotated;
                moved = true;
            }
        } else if (e.key === 'x' || e.key === 'X' || e.key === 'ArrowUp') {
            let rotated = rotate(current.shape);
            if (isValidPosition({ type: current.type, shape: rotated }, currentX, currentY)) {
                current.shape = rotated;
                moved = true;
            }
        } else if (e.key === ' ' || e.key === 'Enter') {
            while (isValidPosition(current, currentX, currentY + 1)) {
                currentY++;
            }
            placeTetromino();
            render();
            return;
        }
        // --- TURN-BASED DROP LOGIC ---
        if (moved) {
            if (manualDown) {
                moveCount = 0;
            } else {
                moveCount++;
                if (moveCount >= 2) {
                    if (isValidPosition(current, currentX, currentY + 1)) {
                        currentY++;
                    }
                    moveCount = 0;
                }
            }
            // Lock delay logic
            if (isTouchingBottom(current, currentX, currentY)) {
                if (!wasTouching) {
                    lockMoves = 0;
                } else {
                    lockMoves++;
                }
                if (lockMoves >= lockDelay) {
                    placeTetromino();
                    render();
                    return;
                }
            } else {
                if (wasTouching && isValidPosition(current, currentX, currentY + 1)) {
                    currentY++;
                    if (isTouchingBottom(current, currentX, currentY)) {
                        lockMoves = 0;
                    }
                }
                lockMoves = 0;
            }
            render();
        }
    }
    if (gameState === STATE_GAMEOVER && e.key === 'Enter') {
        setGameState(STATE_TITLE);
        return;
    }
    if (gameState === STATE_NAME_ENTRY) {
        if (e.key === 'Backspace') {
            e.preventDefault();
            if (playerName.length > 0) {
                playerName = playerName.slice(0, -1);
                drawNameEntry(playerName);
            }
        } else if (e.key.length === 1 && playerName.length < 4 && /[a-zA-Z0-9]/.test(e.key)) {
            playerName += e.key.toUpperCase();
            drawNameEntry(playerName);
        } else if (e.key === 'Enter' && playerName.length > 0) {
            insertHighscore(playerName.padEnd(4, '-'), score);
            setGameState(STATE_HIGHSCORES);
        }
        return;
    }
    if (gameState === STATE_HIGHSCORES && e.key === 'Enter') {
        setGameState(STATE_TITLE);
        return;
    }
    // ...existing code...
}

function isValidPosition(tet, x, y, shapeOverride) {
    const shape = shapeOverride || tet.shape;
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                let boardX = x + col;
                let boardY = y + row;
                if (
                    boardX < 0 || boardX >= COLS ||
                    boardY < 0 || boardY >= ROWS ||
                    board[boardY][boardX]
                ) {
                    return false;
                }
            }
        }
    }
    return true;
}

function isTouchingBottom(tet, x, y) {
    return !isValidPosition(tet, x, y + 1);
}

function placeTetromino() {
    for (let y = 0; y < current.shape.length; y++) {
        for (let x = 0; x < current.shape[y].length; x++) {
            if (current.shape[y][x]) {
                board[currentY + y][currentX + x] = current.type + 1;
            }
        }
    }
    checkLineClear();
}

function checkLineClear() {
    let lines = [];
    for (let y = 0; y < ROWS; y++) {
        if (board[y].every(cell => cell)) {
            lines.push(y);
        }
    }
    if (lines.length > 0) {
        flashRowsActive = lines;
        score += [0, 100, 300, 500, 800][lines.length] || 0;
        render();
        if (flashTimeoutId) clearTimeout(flashTimeoutId);
        flashTimeoutId = setTimeout(() => {
            // Sort lines in descending order to avoid index shift issues
            lines.sort((a, b) => b - a);
            for (let i = 0; i < lines.length; i++) {
                board.splice(lines[i], 1);
                board.unshift(Array(COLS).fill(0));
            }
            flashRowsActive = null;
            spawnTetromino();
            if (!isValidPosition(current, currentX, currentY)) {
                endGameWithHighscore();
            } else {
                render();
            }
        }, FLASH_EFFECT_DURATION);
    } else {
        spawnTetromino();
        if (!isValidPosition(current, currentX, currentY)) {
            endGameWithHighscore();
        } else {
            render();
        }
    }
}

function endGameWithHighscore() {
    if (checkHighscore(score)) {
        playerName = '';
        setGameState(STATE_NAME_ENTRY);
    } else {
        setGameState(STATE_GAMEOVER);
    }
}

function drawGameOver() {
    drawGame(board, current, currentX, currentY, next, score);
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '24px Segoe UI';
    ctx.fillText('Press [Enter] for Title', canvas.width / 2, canvas.height / 2 + 30);
    ctx.restore();
}
