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
    if (!canvas) canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const margin = 0.99;
    // Use more of the vertical space for the canvas
    let w = window.innerWidth * margin;
    let h = window.innerHeight * 0.85; // Use 85% of height for canvas
    if (h / w > 2) {
        h = w * 2; // Keep aspect ratio no taller than 2:1
    } else {
        w = h / 2;
    }
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
}

export function drawMobileTitleScreen() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Animate falling blocks in the background (reuse desktop logic)
    if (!window.mobileTitleBgBlocks) {
        window.mobileTitleBgBlocks = [];
        for (let i = 0; i < 18; i++) {
            window.mobileTitleBgBlocks.push(genMobileTitleBgBlock());
        }
    }
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
    // Only mobile-specific UI here, no desktop instructions
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

export function updateMobileTitleBgBlocks(dt) {
    // Ensure the background blocks array is initialized
    if (!Array.isArray(window.mobileTitleBgBlocks)) {
        window.mobileTitleBgBlocks = [];
        for (let i = 0; i < 18; i++) {
            window.mobileTitleBgBlocks.push(genMobileTitleBgBlock());
        }
    }
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
    // Fit board to 60% width, keep 10:20 aspect, leaving more room for UI
    const boardW = Math.floor(canvas.width * 0.6); // was 0.7
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
    console.log('[Mobile] drawGame called', { board, current, currentX, currentY, next, score, flashRowsActive });
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

// Export drawMobileTitleScreen as drawTitleScreen for API consistency
export { drawMobileTitleScreen as drawTitleScreen };

export function showMobileTitleButtons() {
    hideMobileTitleButtons();
    if (document.getElementById('mobile-title-buttons')) return;
    const container = document.createElement('div');
    container.id = 'mobile-title-buttons';
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.right = '0';
    // Move buttons lower on the screen, below the play area
    container.style.top = 'unset';
    container.style.bottom = '60px'; // was 0, now leaves space above movement controls
    container.style.zIndex = '9999'; // ensure above all overlays
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.justifyContent = 'flex-end';
    container.style.alignItems = 'center';
    container.style.pointerEvents = 'none';
    container.innerHTML = `
        <button id="mobile-start-btn" style="font-size:1.5rem;margin-bottom:24px;padding:18px 32px;border-radius:16px;background:#28a745;color:#fff;border:none;box-shadow:0 2px 8px #0006;pointer-events:auto;">Start</button>
        <button id="mobile-highscore-btn" style="font-size:1.5rem;padding:18px 32px;border-radius:16px;background:#007bff;color:#fff;border:none;box-shadow:0 2px 8px #0006;pointer-events:auto;">Highscores</button>
    `;
    document.body.appendChild(container);
    document.getElementById('mobile-start-btn').onclick = (e) => {
        e.stopPropagation();
        console.log('[Mobile] Start button tapped');
        import('./game.js').then(mod => mod.handleKeydown({ key: 'Enter' }));
    };
    document.getElementById('mobile-highscore-btn').onclick = (e) => {
        e.stopPropagation();
        console.log('[Mobile] Highscore button tapped');
        import('./game.js').then(mod => mod.handleKeydown({ key: 'h' }));
    };
}

function addMobileButtons() {
    if (document.getElementById('mobile-controls')) return;
    const controls = document.createElement('div');
    controls.id = 'mobile-controls';
    controls.style.position = 'fixed';
    controls.style.left = '0';
    controls.style.right = '0';
    controls.style.bottom = '-10px'; // was 0, now lower
    controls.style.zIndex = '100';
    controls.style.display = 'flex';
    controls.style.justifyContent = 'center';
    controls.style.gap = '4px'; // was 8px
    controls.style.padding = '2px 0 2px 0'; // was 8px 0 8px 0
    controls.innerHTML = `
        <button data-key="ArrowLeft">◀️</button>
        <button data-key="ArrowDown">⬇️</button>
        <button data-key="ArrowUp">⟳</button>
        <button data-key=" ">⏬</button>
        <button data-key="ArrowRight">▶️</button>
    `;
    Array.from(controls.querySelectorAll('button')).forEach(btn => {
        btn.style.fontSize = '1.1rem'; // was 1.5rem
        btn.style.padding = '4px 7px'; // was 8px 12px
        btn.style.borderRadius = '7px'; // was 10px
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

export function hideMobileTitleButtons() {
    const el = document.getElementById('mobile-title-buttons');
    if (el) el.remove();
}

function simulateKey(key) {
    console.log('[Mobile] Simulate key:', key);
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

export function drawMobileGameOver(score) {
    if (!ctx || !canvas) return;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '24px Segoe UI, Arial, sans-serif';
    ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
    ctx.font = '18px Segoe UI, Arial, sans-serif';
    ctx.fillText('Tap to return to title', canvas.width / 2, canvas.height / 2 + 60);
    ctx.restore();
}
