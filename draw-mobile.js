// Mobile-specific drawing functions for Slowtris
import { getHighscores } from './storage.js';
import { TETROMINOES } from './tetromino.js';

let ctx, canvas;
export function setContext(c, cv) {
    ctx = c;
    canvas = cv;
}

export function enableMobileCanvasResize() {
    resizeCanvasForMobile();
    setTimeout(resizeCanvasForMobile, 100);
}

function resizeCanvasForMobile() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const margin = 0.98;
    let w = window.innerWidth * margin;
    let h = w * 2;
    if (h > window.innerHeight * margin) {
        h = window.innerHeight * margin;
        w = h / 2;
    }
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
}

export function drawTitleScreen() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Animate falling blocks in the background (reuse desktop logic)
    if (!window.mobileTitleBgBlocks) {
        window.mobileTitleBgBlocks = [];
        for (let i = 0; i < 18; i++) {
            window.mobileTitleBgBlocks.push(genMobileTitleBgBlock());
        }
    }
    updateMobileTitleBgBlocks(1);
    drawMobileTitleBgBlocks();
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#111';
    const boardW = Math.floor(canvas.width * 0.75);
    const boardH = Math.floor(boardW * 2);
    const boardX = Math.floor((canvas.width - boardW) / 2);
    const boardY = Math.floor((canvas.height - boardH) / 2);
    ctx.fillRect(boardX, boardY, boardW, boardH);
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px "Press Start 2P", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Slowtris', canvas.width / 2, boardY + 80);
    // No desktop instructions here
    if (!titleAnimFrameId) {
        titleAnimFrameId = requestAnimationFrame(titleScreenAnimLoop);
    }
}

function titleScreenAnimLoop() {
    titleAnimFrameId = null;
    drawTitleScreen();
}

function genMobileTitleBgBlock() {
    const color = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)].color;
    return {
        x: Math.floor(Math.random() * 10),
        y: Math.random() * -20,
        speed: 0.04 + Math.random() * 0.08,
        color,
        flashing: false,
        flashTime: 0
    };
}

function updateMobileTitleBgBlocks(dt) {
    for (let block of window.mobileTitleBgBlocks) {
        if (!block.flashing) {
            block.y += block.speed * dt;
            if (block.y >= 19) {
                block.y = 19;
                block.flashing = true;
                block.flashTime = 0;
            }
        } else {
            block.flashTime += dt;
            if (block.flashTime > 180) {
                Object.assign(block, genMobileTitleBgBlock());
            }
        }
    }
}

function drawMobileTitleBgBlocks() {
    for (let block of window.mobileTitleBgBlocks) {
        const boardRect = getBoardRect();
        const cellW = boardRect.boardW / 10;
        const cellH = boardRect.boardH / 20;
        let px = boardRect.boardX + block.x * cellW;
        let py = boardRect.boardY + block.y * cellH;
        ctx.save();
        if (block.flashing) {
            ctx.globalAlpha = 0.7 + 0.3 * Math.sin(block.flashTime / 30);
            ctx.fillStyle = '#fff';
        } else {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = block.color;
        }
        ctx.fillRect(px, py, cellW, cellH);
        ctx.globalAlpha = 1.0;
        ctx.restore();
    }
}

function getBoardRect() {
    // Fit board to 90% width, keep 10:20 aspect
    const boardW = Math.floor(canvas.width * 0.9);
    const boardH = Math.floor(boardW * 2);
    const boardX = Math.floor((canvas.width - boardW) / 2);
    const boardY = Math.floor((canvas.height - boardH) / 2);
    return { boardX, boardY, boardW, boardH };
}

function drawBlock(x, y, color, boardRect) {
    const cellW = boardRect.boardW / 10;
    const cellH = boardRect.boardH / 20;
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(boardRect.boardX + x * cellW, boardRect.boardY + y * cellH, cellW, cellH);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.strokeRect(boardRect.boardX + x * cellW, boardRect.boardY + y * cellH, cellW, cellH);
    ctx.restore();
}

function drawBoard(board, flashRowsActive, boardRect) {
    for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 10; x++) {
            if (board[y][x]) {
                if (flashRowsActive && flashRowsActive.includes(y)) {
                    drawBlock(x, y, '#fff', boardRect);
                } else {
                    drawBlock(x, y, TETROMINOES[board[y][x] - 1].color, boardRect);
                }
            }
        }
    }
}

function drawCurrent(current, currentX, currentY, boardRect) {
    if (!current) return;
    for (let y = 0; y < current.shape.length; y++) {
        for (let x = 0; x < current.shape[y].length; x++) {
            if (current.shape[y][x]) {
                drawBlock(currentX + x, currentY + y, TETROMINOES[current.type].color, boardRect);
            }
        }
    }
}

function drawNext(next, boardRect) {
    if (!next || !next.shape) return;
    ctx.save();
    ctx.font = '12px "Press Start 2P", Consolas, monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('NEXT', boardRect.boardX + boardRect.boardW + 16, boardRect.boardY + 24);
    let nextX = boardRect.boardX + boardRect.boardW + 16;
    let nextY = boardRect.boardY + 40;
    let cellW = boardRect.boardW / 10;
    let cellH = boardRect.boardH / 20;
    let shapeW = next.shape[0].length * cellW;
    let offsetX = (4 * cellW - shapeW) / 2;
    for (let y = 0; y < next.shape.length; y++) {
        for (let x = 0; x < next.shape[y].length; x++) {
            if (next.shape[y][x]) {
                ctx.globalAlpha = 0.8;
                ctx.save();
                ctx.translate(nextX + offsetX + x * cellW, nextY + y * cellH);
                ctx.fillStyle = TETROMINOES[next.type].color;
                ctx.fillRect(0, 0, cellW, cellH);
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 2;
                ctx.strokeRect(0, 0, cellW, cellH);
                ctx.restore();
                ctx.globalAlpha = 1.0;
            }
        }
    }
    ctx.restore();
}

function drawScore(score, boardRect) {
    ctx.save();
    ctx.font = '12px "Press Start 2P", Consolas, monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', boardRect.boardX + boardRect.boardW + 16, boardRect.boardY + 170);
    ctx.font = '16px "Press Start 2P", Consolas, monospace';
    if (typeof score !== 'undefined') {
        ctx.fillText(score, boardRect.boardX + boardRect.boardW + 16, boardRect.boardY + 190);
    }
    ctx.restore();
}

export function drawGame(board, current, currentX, currentY, next, score, flashRowsActive) {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const boardRect = getBoardRect();
    ctx.save();
    ctx.fillStyle = '#222';
    ctx.fillRect(boardRect.boardX, boardRect.boardY, boardRect.boardW, boardRect.boardH);
    ctx.restore();
    drawBoard(board, flashRowsActive, boardRect);
    drawCurrent(current, currentX, currentY, boardRect);
    drawNext(next, boardRect);
    drawScore(score, boardRect);
}

export function drawHighscores() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px "Press Start 2P", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HIGHSCORES', canvas.width / 2, 80);
    ctx.font = '16px "Press Start 2P", Consolas, monospace';
    const highscores = getHighscores();
    for (let i = 0; i < highscores.length; i++) {
        const entry = highscores[i];
        ctx.textAlign = 'left';
        ctx.fillText(
            (i + 1) + '. ' + entry.name.padEnd(4, '-') + '   ' + entry.score,
            canvas.width / 2 - 80,
            130 + i * 32
        );
    }
    ctx.textAlign = 'center';
    ctx.font = '12px "Press Start 2P", Consolas, monospace';
    ctx.fillText('Tap to return', canvas.width / 2, canvas.height - 40);
}

export function drawNameEntry(playerName) {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px "Press Start 2P", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NEW HIGH SCORE!', canvas.width / 2, 120);
    ctx.font = '16px "Press Start 2P", Consolas, monospace';
    ctx.fillText('Enter your name:', canvas.width / 2, 180);
    ctx.font = '32px "Press Start 2P", Consolas, monospace';
    let displayName = playerName.padEnd(4, '_');
    ctx.fillText(displayName, canvas.width / 2, 240);
    ctx.font = '12px "Press Start 2P", Consolas, monospace';
    ctx.fillText('Type letters/numbers.', canvas.width / 2, 280);
    ctx.fillText('[Backspace] to erase.', canvas.width / 2, 300);
    ctx.fillText('Tap to confirm.', canvas.width / 2, 320);
}

export function showMobileTitleButtons() {
    hideMobileTitleButtons();
    if (document.getElementById('mobile-title-buttons')) return;
    const container = document.createElement('div');
    container.id = 'mobile-title-buttons';
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.right = '0';
    container.style.top = '0';
    container.style.bottom = '0';
    container.style.zIndex = '200';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.pointerEvents = 'none';
    container.innerHTML = `
        <button id="mobile-start-btn" style="font-size:1.5rem;margin-bottom:24px;padding:18px 32px;border-radius:16px;background:#28a745;color:#fff;border:none;box-shadow:0 2px 8px #0006;pointer-events:auto;">Start</button>
        <button id="mobile-highscore-btn" style="font-size:1.5rem;padding:18px 32px;border-radius:16px;background:#007bff;color:#fff;border:none;box-shadow:0 2px 8px #0006;pointer-events:auto;">Highscores</button>
    `;
    document.body.appendChild(container);
    document.getElementById('mobile-start-btn').onclick = (e) => {
        e.stopPropagation();
        simulateKey('Enter');
    };
    document.getElementById('mobile-highscore-btn').onclick = (e) => {
        e.stopPropagation();
        simulateKey('h');
    };
}

export function hideMobileTitleButtons() {
    const el = document.getElementById('mobile-title-buttons');
    if (el) el.remove();
}

function simulateKey(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
}
