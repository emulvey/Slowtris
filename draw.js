// Drawing functions for Slowtris
import { TETROMINOES } from './tetromino.js';
import { getHighscores } from './storage.js';

export let ctx, canvas;
export function setContext(c, cv) {
    ctx = c;
    canvas = cv;
    if (!ctx || !canvas) {
        console.error('[Draw] setContext failed: ctx or canvas is null', ctx, canvas);
    } else {
        console.log('[Draw] setContext called', ctx, canvas);
    }
}

export function drawBlock(x, y, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(40 + x * 24, 60 + y * 24, 24, 24);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.strokeRect(40 + x * 24, 60 + y * 24, 24, 24);
    ctx.restore();
}

export function drawBoard(board, flashRowsActive) {
    for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 10; x++) {
            if (board[y][x]) {
                if (flashRowsActive && flashRowsActive.includes(y)) {
                    drawBlock(x, y, '#fff');
                } else {
                    drawBlock(x, y, TETROMINOES[board[y][x] - 1].color);
                }
            }
        }
    }
}

export function drawCurrent(current, currentX, currentY) {
    const tet = current;
    for (let y = 0; y < tet.shape.length; y++) {
        for (let x = 0; x < tet.shape[y].length; x++) {
            if (tet.shape[y][x]) {
                drawBlock(currentX + x, currentY + y, TETROMINOES[tet.type].color);
            }
        }
    }
}

export function drawNext(next) {
    ctx.save();
    ctx.font = '12px "Press Start 2P", Consolas, monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('NEXT', 40 + 10 * 24 + 32, 60 + 24);
    if (next && next.shape) {
        const tet = next;
        let nextX = 40 + 10 * 24 + 32;
        let nextY = 60 + 40;
        let shapeW = tet.shape[0].length * 24;
        let offsetX = (4 * 24 - shapeW) / 2;
        for (let y = 0; y < tet.shape.length; y++) {
            for (let x = 0; x < tet.shape[y].length; x++) {
                if (tet.shape[y][x]) {
                    ctx.globalAlpha = 0.8;
                    ctx.save();
                    ctx.translate(nextX + offsetX + x * 24, nextY + y * 24);
                    ctx.fillStyle = TETROMINOES[tet.type].color;
                    ctx.fillRect(0, 0, 24, 24);
                    ctx.strokeStyle = '#222';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(0, 0, 24, 24);
                    ctx.restore();
                    ctx.globalAlpha = 1.0;
                }
            }
        }
    }
    ctx.restore();
}

export function drawScore(score) {
    ctx.save();
    ctx.font = '12px "Press Start 2P", Consolas, monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 40 + 10 * 24 + 32, 60 + 170);
    ctx.font = '16px "Press Start 2P", Consolas, monospace';
    if (typeof score !== 'undefined') {
        ctx.fillText(score, 40 + 10 * 24 + 32, 60 + 190);
    }
    ctx.restore();
}

// Title screen animated background state
let TITLE_BG_BLOCKS = 18;
let titleBgBlocks = [];

export function resetTitleBgBlocks() {
    titleBgBlocks = [];
    for (let i = 0; i < TITLE_BG_BLOCKS; i++) {
        titleBgBlocks.push(genTitleBgBlock());
    }
}

function genTitleBgBlock() {
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

export function updateTitleBgBlocks(dt) {
    for (let block of titleBgBlocks) {
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
                Object.assign(block, genTitleBgBlock());
            }
        }
    }
}

export function drawTitleBgBlocks() {
    for (let block of titleBgBlocks) {
        let px = 40 + block.x * 24;
        let py = 60 + block.y * 24;
        ctx.save();
        if (block.flashing) {
            ctx.globalAlpha = 0.7 + 0.3 * Math.sin(block.flashTime / 30);
            ctx.fillStyle = '#fff';
        } else {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = block.color;
        }
        ctx.fillRect(px, py, 24, 24);
        ctx.globalAlpha = 1.0;
        ctx.restore();
    }
}

export function drawTitleScreen(isMobile = false) {
    if (!ctx || !canvas) { console.log('drawTitleScreen: ctx or canvas not set'); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#111';
    // Dynamically calculate board size and position for current canvas
    const boardW = Math.floor(canvas.width * 0.75);
    const boardH = Math.floor(boardW * 2);
    const boardX = Math.floor((canvas.width - boardW) / 2);
    const boardY = Math.floor((canvas.height - boardH) / 2);
    ctx.fillRect(boardX, boardY, boardW, boardH);
    ctx.restore();
    drawTitleBgBlocks();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px "Press Start 2P", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Slowtris', canvas.width / 2, boardY + 80);
    ctx.font = '16px "Press Start 2P", Consolas, monospace';
    if (isMobile) {
        // Do not show Enter/H text on mobile
    } else {
        ctx.fillText('Press [Enter] to Start', canvas.width / 2, boardY + 160);
        ctx.fillText('Press [H] for Highscores', canvas.width / 2, boardY + 200);
    }
    // Debug output
    // console.log('drawTitleScreen called');
}

let bgAnimStart = performance.now();

function getStackHeight(board) {
    for (let y = 0; y < 20; y++) {
        if (board[y].some(cell => cell)) {
            return 20 - y;
        }
    }
    return 0;
}

function drawDynamicBackground(board) {
    // Calculate stress level
    let stack = board ? getStackHeight(board) : 0;
    let pct = Math.min(stack / 20, 1);
    // Use real time for animation, but accelerate with stress
    let now = performance.now();
    // Animation speed multiplier: 1 at calm, up to 2.5 at max stress
    let animSpeed = 1 + 1.5 * pct;
    let bgAnimTime = (now - bgAnimStart) * 0.001 * animSpeed;

    // Outer background (outside playfield)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.rect(40, 60, 10 * 24, 20 * 24);
    ctx.closePath();
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.clip('evenodd');

    // Palette: blue/teal (calm) to yellow/red (stress)
    // At high stress, clamp to only warm hues (10–50)
    let baseHue, colorVar;
    if (pct < 0.7) {
        baseHue = 200 * (1 - pct / 0.7) + 50 * (pct / 0.7); // blue/teal to yellow
        colorVar = 40 + 80 * pct;
    } else {
        // Only warm hues at high stress
        let stressPct = (pct - 0.7) / 0.3;
        baseHue = 50 * (1 - stressPct) + 10 * stressPct; // yellow to red
        colorVar = 40 + 120 * stressPct; // more color range at max stress
    }
    let sat = 40 + 40 * pct;      // more saturation at high stress
    let lightBase = 14 + 6 * (1 - pct); // slightly lighter at low stress
    let waveAmp = 8 + 40 * pct;
    let waveFreq = 0.10 + 0.35 * pct;
    let speed = 1 + 2 * pct;
    let pulse = Math.sin(bgAnimTime * (1.5 + 2 * pct)) * (pct * 8);
    for (let y = 0; y < canvas.height; y += 3) {
        let t = y / canvas.height;
        let hue = baseHue + colorVar * Math.sin(bgAnimTime * speed + t * 8 + Math.cos(bgAnimTime + t * 4) * (1 + 2 * pct));
        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lightBase + 8 * Math.sin(bgAnimTime + t * 4)}%)`;
        let xOffset = Math.sin(bgAnimTime * (1 + pct) + y * waveFreq) * waveAmp * Math.sin(Math.PI * t) + pulse;
        xOffset += Math.sin(bgAnimTime * 2 + y * 0.04) * (pct * 6);
        ctx.fillRect(0 + xOffset, y, canvas.width, 3);
    }
    ctx.restore();

    // Playfield background (inside border)
    let grad = ctx.createLinearGradient(0, 60, 0, 60 + 20 * 24);
    grad.addColorStop(0, `hsl(${baseHue}, 40%, 18%)`);
    grad.addColorStop(1, `hsl(${baseHue + 30}, 40%, 10%)`);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(40 - 16, 60 - 16, 10 * 24 + 32, 20 * 24 + 32);
    ctx.restore();
}
// NOTE: For true real-time animation, ensure your main render loop uses requestAnimationFrame and calls drawGame (or the appropriate draw function) every frame, not just on game moves.

function drawDynamicBorder(board) {
    let stack = getStackHeight(board);
    let pct = Math.min(stack / 20, 1);
    let borderColor = `hsl(${120 - 60 * pct}, 80%, ${40 + 30 * pct}%)`;
    ctx.save();
    ctx.lineWidth = 8;
    ctx.strokeStyle = borderColor;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 16 * pct;
    ctx.strokeRect(40 - 4, 60 - 4, 10 * 24 + 8, 20 * 24 + 8);
    ctx.restore();
}

export function drawGame(board, current, currentX, currentY, next, score, flashRowsActive) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawDynamicBackground(board);
    drawDynamicBorder(board);
    ctx.fillStyle = '#222';
    ctx.fillRect(40, 60, 10 * 24, 20 * 24);
    drawBoard(board, flashRowsActive);
    if (current) drawCurrent(current, currentX, currentY);
    drawNext(next);
    drawScore(score);
}

export function drawHighscores() {
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
    ctx.fillText('Press [Enter] to return', canvas.width / 2, 500);
}

export function drawNameEntry(playerName) {
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
    ctx.fillText('[Enter] to confirm.', canvas.width / 2, 320);
}

function resizeCanvasForMobile() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    // Use window size to set canvas size, keeping 10:20 aspect ratio
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

if (typeof window !== 'undefined') {
    window.addEventListener('resize', resizeCanvasForMobile);
}

export function enableMobileCanvasResize() {
    resizeCanvasForMobile();
    setTimeout(resizeCanvasForMobile, 100); // handle late layout
}
