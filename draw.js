// Unified High-DPI Canvas Renderer for Slowtris
// Renders: full-viewport stress-reactive aurora background, crisp 10x20 playfield,
// beveled tetrominoes, ghost piece, particles, lock flashes, trails, and floating popups.

import { TETROMINOES } from './tetromino.js';
import { COLS, ROWS, STATE_TITLE, STATE_PLAY, STATE_PAUSED, STATE_GAMEOVER, STATE_NAME_ENTRY } from './game.js';

let bgCanvas = null;
let bgCtx = null;
let boardCanvas = null;
let boardCtx = null;
let nextCanvas = null;
let nextCtx = null;
let boardFrameEl = null;

let bgWidth = 0;
let bgHeight = 0;
let boardWidth = 0;
let boardHeight = 0;
let cellSize = 24;

let animTime = 0;
let displayStress = 0;
let lastFrameTime = 0;

// Visual effects pools
const particles = [];
const popups = [];
const lockFlashes = [];
const dropTrails = [];
let shakeIntensity = 0;

// Animated drifting tetrominoes for the Title screen background
let titlePieces = [];
const TITLE_PIECE_COUNT = 14;

export function initRenderer({ bg, board, next, frame }) {
    bgCanvas = bg;
    bgCtx = bg ? bg.getContext('2d') : null;
    boardCanvas = board;
    boardCtx = board ? board.getContext('2d') : null;
    nextCanvas = next;
    nextCtx = next ? next.getContext('2d') : null;
    boardFrameEl = frame || null;

    initTitlePieces();
    resizeCanvases();
    lastFrameTime = performance.now();
}

function createTitlePiece(randomY = false) {
    const type = Math.floor(Math.random() * TETROMINOES.length);
    const def = TETROMINOES[type];
    return {
        type,
        shape: def.preview,
        color: def.color,
        highlight: def.highlight,
        shadow: def.shadow,
        x: Math.random(), // normalized 0..1
        y: randomY ? Math.random() * 1.2 - 0.1 : -0.18 - Math.random() * 0.25,
        speed: 0.025 + Math.random() * 0.045,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.45,
        scale: 0.65 + Math.random() * 0.75,
        alpha: 0.16 + Math.random() * 0.22,
        swayPhase: Math.random() * Math.PI * 2,
    };
}

function initTitlePieces() {
    titlePieces = [];
    for (let i = 0; i < TITLE_PIECE_COUNT; i++) {
        titlePieces.push(createTitlePiece(true));
    }
}

export function resizeCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (bgCanvas && bgCtx) {
        bgWidth = Math.max(1, window.innerWidth);
        bgHeight = Math.max(1, window.innerHeight);
        bgCanvas.width = Math.round(bgWidth * dpr);
        bgCanvas.height = Math.round(bgHeight * dpr);
        bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    if (boardCanvas && boardCtx && boardCanvas.parentElement) {
        const stage = boardCanvas.parentElement.parentElement;
        if (stage) {
            const rect = stage.getBoundingClientRect();
            const availW = Math.max(120, rect.width - 18);
            const availH = Math.max(240, rect.height - 18);

            // Compute largest integer cell size that fits 10x20 cleanly
            const maxCellW = Math.floor(availW / COLS);
            const maxCellH = Math.floor(availH / ROWS);
            cellSize = Math.max(11, Math.min(maxCellW, maxCellH, 38));

            boardWidth = cellSize * COLS;
            boardHeight = cellSize * ROWS;

            boardCanvas.style.width = `${boardWidth}px`;
            boardCanvas.style.height = `${boardHeight}px`;
            boardCanvas.width = Math.round(boardWidth * dpr);
            boardCanvas.height = Math.round(boardHeight * dpr);
            boardCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }

    if (nextCanvas && nextCtx) {
        const rect = nextCanvas.getBoundingClientRect();
        const nw = Math.max(56, Math.round(rect.width || 88));
        const nh = Math.max(40, Math.round(rect.height || 64));
        nextCanvas.width = Math.round(nw * dpr);
        nextCanvas.height = Math.round(nh * dpr);
        nextCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
}

export function handleGameEffect(effect) {
    if (!effect) return;

    if (effect.type === 'hardDrop') {
        dropTrails.push({
            cells: effect.cells,
            dropDist: effect.dropDist,
            color: effect.color,
            age: 0,
            duration: 0.18,
        });
        shakeIntensity = Math.max(shakeIntensity, Math.min(3.5, 1.2 + effect.dropDist * 0.12));
    } else if (effect.type === 'lock') {
        lockFlashes.push({
            cells: effect.cells,
            color: effect.color,
            age: 0,
            duration: 0.18,
        });
    } else if (effect.type === 'lineClear') {
        // Spawn celebratory particles from every cleared block
        const perBlock = effect.count >= 4 ? 5 : 3;
        for (const blk of effect.blocks) {
            for (let i = 0; i < perBlock; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = (1.6 + Math.random() * 4.5) * (effect.count >= 4 ? 1.35 : 1);
                particles.push({
                    x: blk.x + 0.5 + (Math.random() - 0.5) * 0.6,
                    y: blk.y + 0.5 + (Math.random() - 0.5) * 0.6,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 2.2,
                    size: 0.18 + Math.random() * 0.24,
                    color: i === 0 ? blk.highlight : blk.color,
                    age: 0,
                    life: 0.42 + Math.random() * 0.38,
                    rot: Math.random() * Math.PI,
                    vrot: (Math.random() - 0.5) * 10,
                });
            }
        }

        // Floating score popup
        const subLabel = effect.combo > 1 ? `COMBO ×${effect.combo}` : effect.label;
        popups.push({
            text: `+${effect.points}`,
            sub: subLabel,
            x: COLS / 2,
            y: Math.max(2, effect.centerY),
            age: 0,
            duration: 1.05,
            isBig: effect.count >= 4 || effect.combo >= 3,
            color: effect.count >= 4 ? '#facc15' : '#ffffff',
        });

        if (effect.count >= 4) {
            shakeIntensity = 6.5;
        } else if (effect.count >= 2) {
            shakeIntensity = Math.max(shakeIntensity, 2.8);
        }
    }
}

export function clearEffects() {
    particles.length = 0;
    popups.length = 0;
    lockFlashes.length = 0;
    dropTrails.length = 0;
    shakeIntensity = 0;
}

export function getDisplayStress() {
    return displayStress;
}

export function renderFrame(snapshot, now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;

    // Target stress based on stack height during play/gameover/name-entry; calm on title
    const isBoardActive = snapshot.gameState === STATE_PLAY ||
        snapshot.gameState === STATE_PAUSED ||
        snapshot.gameState === STATE_GAMEOVER ||
        snapshot.gameState === STATE_NAME_ENTRY;
    const targetStress = isBoardActive ? Math.min(1, snapshot.stackHeight / 17) : 0.08;
    displayStress += (targetStress - displayStress) * Math.min(1, dt * 3.2);

    const speedMult = 1 + 1.65 * displayStress;
    animTime += dt * speedMult;

    // Update effects
    updateEffects(dt);

    // 1. Background canvas (always alive!)
    drawDynamicBackground(snapshot.gameState === STATE_TITLE, dt);

    // 2. Sync glowing stress border on board frame
    updateBoardFrameGlow(displayStress, isBoardActive);

    // 3. Playfield canvas
    if (boardCtx && isBoardActive) {
        drawPlayfield(snapshot, now);
    }

    // 4. Next piece preview canvas
    if (nextCtx && snapshot.next) {
        drawNextPreview(snapshot.next);
    }
}

function updateEffects(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;
        if (p.age >= p.life) {
            particles.splice(i, 1);
            continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 12.5 * dt; // gravity in cell units
        p.rot += p.vrot * dt;
    }

    for (let i = popups.length - 1; i >= 0; i--) {
        const pop = popups[i];
        pop.age += dt;
        if (pop.age >= pop.duration) {
            popups.splice(i, 1);
        }
    }

    for (let i = lockFlashes.length - 1; i >= 0; i--) {
        lockFlashes[i].age += dt;
        if (lockFlashes[i].age >= lockFlashes[i].duration) {
            lockFlashes.splice(i, 1);
        }
    }

    for (let i = dropTrails.length - 1; i >= 0; i--) {
        dropTrails[i].age += dt;
        if (dropTrails[i].age >= dropTrails[i].duration) {
            dropTrails.splice(i, 1);
        }
    }

    if (shakeIntensity > 0.05) {
        shakeIntensity *= Math.pow(0.001, dt);
    } else {
        shakeIntensity = 0;
    }
}

function computeStressPalette(pct) {
    // Calm: deep cyan/teal (198) -> Mid: indigo/amber (45) -> High: crimson (8)
    let baseHue, accentHue;
    if (pct < 0.55) {
        const t = pct / 0.55;
        baseHue = 205 * (1 - t) + 172 * t;
        accentHue = 190 * (1 - t) + 48 * t;
    } else {
        const t = (pct - 0.55) / 0.45;
        baseHue = 48 * (1 - t) + 6 * t;
        accentHue = 32 * (1 - t) + 348 * t;
    }
    return { baseHue, accentHue };
}

function updateBoardFrameGlow(pct, active) {
    if (!boardFrameEl) return;
    if (!active) {
        boardFrameEl.style.setProperty('--border-color', 'rgba(56, 189, 248, 0.45)');
        boardFrameEl.style.setProperty('--border-glow', 'rgba(56, 189, 248, 0.18)');
        boardFrameEl.style.transform = '';
        return;
    }

    const hue = 175 * (1 - pct) + 4 * pct;
    const sat = 75 + 20 * pct;
    const light = 48 + 12 * pct;
    const pulse = pct > 0.65 ? (0.5 + 0.5 * Math.sin(animTime * 4.5)) * (pct - 0.65) * 2.5 : 0;
    const glowAlpha = Math.min(0.75, 0.22 + 0.38 * pct + pulse * 0.22);

    boardFrameEl.style.setProperty('--border-color', `hsl(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`);
    boardFrameEl.style.setProperty('--border-glow', `hsla(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%, ${glowAlpha.toFixed(2)})`);

    if (shakeIntensity > 0.1) {
        const sx = (Math.random() - 0.5) * 2 * shakeIntensity;
        const sy = (Math.random() - 0.5) * 2 * shakeIntensity;
        boardFrameEl.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
    } else {
        boardFrameEl.style.transform = '';
    }
}

function drawDynamicBackground(isTitle, dt) {
    if (!bgCtx) return;

    const pct = displayStress;
    const { baseHue, accentHue } = computeStressPalette(pct);

    // Rich deep ambient base gradient
    const bgGrad = bgCtx.createLinearGradient(0, 0, 0, bgHeight);
    bgGrad.addColorStop(0, `hsl(${baseHue}, ${32 + 28 * pct}%, ${9 + 4 * pct}%)`);
    bgGrad.addColorStop(0.55, `hsl(${(baseHue + 18) % 360}, ${36 + 32 * pct}%, ${6 + 4 * pct}%)`);
    bgGrad.addColorStop(1, `hsl(${accentHue}, ${30 + 35 * pct}%, ${7 + 5 * pct}%)`);
    bgCtx.fillStyle = bgGrad;
    bgCtx.fillRect(0, 0, bgWidth, bgHeight);

    // Layered undulating aurora ribbons (elevated signature Slowtris visual!)
    const ribbonCount = 5;
    bgCtx.save();
    for (let r = 0; r < ribbonCount; r++) {
        const ratio = r / (ribbonCount - 1);
        const yBase = bgHeight * (0.14 + ratio * 0.74);
        const amp = (20 + 48 * pct) * (0.7 + ratio * 0.5);
        const freq = 0.0032 + 0.0018 * r;
        const phase = animTime * (0.55 + r * 0.18) + r * 1.4;
        const hue = baseHue + (accentHue - baseHue) * ratio + Math.sin(animTime * 0.6 + r) * (16 + 24 * pct);
        const sat = 52 + 34 * pct;
        const light = 22 + 12 * pct;

        bgCtx.beginPath();
        bgCtx.moveTo(0, bgHeight);
        const step = Math.max(24, Math.floor(bgWidth / 28));
        for (let x = 0; x <= bgWidth + step; x += step) {
            const wave =
                Math.sin(x * freq + phase) * amp +
                Math.cos(x * freq * 0.55 - phase * 0.7) * (amp * 0.45);
            bgCtx.lineTo(x, yBase + wave);
        }
        bgCtx.lineTo(bgWidth, bgHeight);
        bgCtx.closePath();

        const rGrad = bgCtx.createLinearGradient(0, yBase - amp, 0, yBase + bgHeight * 0.35);
        rGrad.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, ${0.14 + 0.12 * pct})`);
        rGrad.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0)`);
        bgCtx.fillStyle = rGrad;
        bgCtx.fill();
    }
    bgCtx.restore();

    // Subtle radial spotlight behind center
    const cx = bgWidth / 2;
    const cy = bgHeight / 2;
    const rad = Math.max(bgWidth, bgHeight) * 0.55;
    const glowGrad = bgCtx.createRadialGradient(cx, cy, 20, cx, cy, rad);
    glowGrad.addColorStop(0, `hsla(${accentHue}, ${60 + 30 * pct}%, ${36 + 12 * pct}%, ${0.09 + 0.12 * pct})`);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    bgCtx.fillStyle = glowGrad;
    bgCtx.fillRect(0, 0, bgWidth, bgHeight);

    // Drifting beveled tetrominoes on the title screen
    if (isTitle) {
        updateAndDrawTitlePieces(dt);
    }
}

function updateAndDrawTitlePieces(dt) {
    const baseBlock = Math.max(14, Math.min(26, Math.min(bgWidth, bgHeight) * 0.036));
    for (const p of titlePieces) {
        p.y += p.speed * dt;
        p.rotation += p.rotSpeed * dt;
        if (p.y > 1.2) {
            Object.assign(p, createTitlePiece(false));
        }

        const px = p.x * bgWidth + Math.sin(animTime * 0.7 + p.swayPhase) * 18;
        const py = p.y * bgHeight;
        const size = baseBlock * p.scale;
        const rows = p.shape.length;
        const cols = p.shape[0].length;

        bgCtx.save();
        bgCtx.globalAlpha = p.alpha;
        bgCtx.translate(px, py);
        bgCtx.rotate(p.rotation);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!p.shape[r][c]) continue;
                const bx = (c - cols / 2) * size;
                const by = (r - rows / 2) * size;
                drawBeveledBlock(bgCtx, bx, by, size, TETROMINOES[p.type], 1);
            }
        }
        bgCtx.restore();
    }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function drawBeveledBlock(ctx, px, py, size, def, alpha = 1) {
    const pad = Math.max(1, size * 0.055);
    const x = px + pad;
    const y = py + pad;
    const w = size - pad * 2;
    const h = size - pad * 2;
    const r = Math.max(2, size * 0.14);
    const bevel = Math.max(2, size * 0.14);

    ctx.save();
    if (alpha < 1) ctx.globalAlpha *= alpha;

    // Base fill
    drawRoundedRect(ctx, x, y, w, h, r);
    ctx.fillStyle = def.color;
    ctx.fill();

    // Subtle top-to-bottom sheen gradient
    const sheen = ctx.createLinearGradient(x, y, x, y + h);
    sheen.addColorStop(0, 'rgba(255,255,255,0.28)');
    sheen.addColorStop(0.45, 'rgba(255,255,255,0.03)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.26)');
    ctx.fillStyle = sheen;
    ctx.fill();

    // Top-left crisp highlight strip
    ctx.fillStyle = def.highlight;
    ctx.globalAlpha *= 0.55;
    ctx.fillRect(x + bevel * 0.6, y + 1, w - bevel * 1.2, Math.max(1.5, bevel * 0.55));
    ctx.fillRect(x + 1, y + bevel * 0.6, Math.max(1.5, bevel * 0.55), h - bevel * 1.2);

    // Bottom-right depth shadow strip
    ctx.globalAlpha = alpha * 0.45;
    ctx.fillStyle = def.shadow;
    ctx.fillRect(x + bevel * 0.5, y + h - Math.max(2, bevel * 0.7), w - bevel, Math.max(2, bevel * 0.7));

    // Inner gem facet
    ctx.globalAlpha = alpha * 0.2;
    ctx.fillStyle = '#ffffff';
    const inset = bevel * 1.05;
    if (w - inset * 2 > 3) {
        drawRoundedRect(ctx, x + inset, y + inset, w - inset * 2, (h - inset * 2) * 0.45, r * 0.5);
        ctx.fill();
    }

    ctx.restore();
}

function drawGhostBlock(ctx, gx, gy, size, def) {
    const pad = Math.max(1.5, size * 0.08);
    const x = gx * size + pad;
    const y = gy * size + pad;
    const w = size - pad * 2;
    const h = size - pad * 2;
    const r = Math.max(2, size * 0.14);

    ctx.save();
    drawRoundedRect(ctx, x, y, w, h, r);
    ctx.fillStyle = def.color;
    ctx.globalAlpha = 0.13;
    ctx.fill();

    ctx.globalAlpha = 0.58;
    ctx.strokeStyle = def.highlight;
    ctx.lineWidth = Math.max(1.25, size * 0.06);
    ctx.stroke();
    ctx.restore();
}

function drawPlayfield(snapshot, now) {
    const ctx = boardCtx;
    ctx.clearRect(0, 0, boardWidth, boardHeight);

    // Recessed playfield interior
    const interiorGrad = ctx.createLinearGradient(0, 0, 0, boardHeight);
    interiorGrad.addColorStop(0, '#090e1a');
    interiorGrad.addColorStop(1, '#0e1628');
    ctx.fillStyle = interiorGrad;
    ctx.fillRect(0, 0, boardWidth, boardHeight);

    // Subtle danger zone glow at top 4 rows when stack is high
    if (snapshot.stackHeight >= 13) {
        const danger = Math.min(1, (snapshot.stackHeight - 12) / 6);
        const pulse = 0.55 + 0.45 * Math.sin(now * 0.008);
        const dangerGrad = ctx.createLinearGradient(0, 0, 0, cellSize * 4.5);
        dangerGrad.addColorStop(0, `rgba(244, 63, 94, ${(0.22 * danger * pulse).toFixed(3)})`);
        dangerGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
        ctx.fillStyle = dangerGrad;
        ctx.fillRect(0, 0, boardWidth, cellSize * 4.5);
    }

    // Crisp subtle board grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) {
        const px = x * cellSize + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, boardHeight);
    }
    for (let y = 1; y < ROWS; y++) {
        const py = y * cellSize + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(boardWidth, py);
    }
    ctx.stroke();

    // Hard-drop trails
    for (const trail of dropTrails) {
        const t = 1 - trail.age / trail.duration;
        ctx.save();
        for (const c of trail.cells) {
            const topY = c.y * cellSize;
            const height = trail.dropDist * cellSize;
            const grad = ctx.createLinearGradient(0, topY, 0, topY + height);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(1, trail.color);
            ctx.globalAlpha = t * 0.24;
            ctx.fillStyle = grad;
            ctx.fillRect(c.x * cellSize + 2, topY, cellSize - 4, height);
        }
        ctx.restore();
    }

    // Placed board blocks
    const { board, flashRowsActive } = snapshot;
    for (let y = 0; y < ROWS; y++) {
        const isFlashing = flashRowsActive && flashRowsActive.includes(y);
        for (let x = 0; x < COLS; x++) {
            const cell = board[y][x];
            if (!cell) continue;
            if (isFlashing) {
                const pulse = 0.72 + 0.28 * Math.sin(now * 0.045);
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#facc15';
                ctx.shadowBlur = 12;
                ctx.globalAlpha = pulse;
                drawRoundedRect(ctx, x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2, 3);
                ctx.fill();
                ctx.restore();
            } else {
                drawBeveledBlock(ctx, x * cellSize, y * cellSize, cellSize, TETROMINOES[cell - 1], 1);
            }
        }
    }

    // Lock flashes
    for (const lf of lockFlashes) {
        const t = 1 - lf.age / lf.duration;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = t * 0.55;
        for (const c of lf.cells) {
            drawRoundedRect(ctx, c.x * cellSize + 1, c.y * cellSize + 1, cellSize - 2, cellSize - 2, 3);
            ctx.fill();
        }
        ctx.restore();
    }

    // Ghost piece & active piece
    const { current, currentX, currentY, ghostY, isGrounded, lockMoves, lockDelay } = snapshot;
    if (current) {
        const def = TETROMINOES[current.type];

        // Ghost piece (only if below active piece)
        if (ghostY > currentY) {
            for (let r = 0; r < current.shape.length; r++) {
                for (let c = 0; c < current.shape[r].length; c++) {
                    if (current.shape[r][c]) {
                        drawGhostBlock(ctx, currentX + c, ghostY + r, cellSize, def);
                    }
                }
            }
        }

        // Active piece with subtle glow; warm pulse on final lock move
        const isLastLockMove = isGrounded && lockMoves >= lockDelay - 1;
        const lockPulse = isLastLockMove ? 0.5 + 0.5 * Math.sin(now * 0.016) : 0;

        ctx.save();
        ctx.shadowColor = isLastLockMove ? 'rgba(250, 204, 21, 0.85)' : def.glow;
        ctx.shadowBlur = isLastLockMove ? 14 : 8;
        for (let r = 0; r < current.shape.length; r++) {
            for (let c = 0; c < current.shape[r].length; c++) {
                if (!current.shape[r][c]) continue;
                const px = (currentX + c) * cellSize;
                const py = (currentY + r) * cellSize;
                drawBeveledBlock(ctx, px, py, cellSize, def, 1);
                if (isLastLockMove) {
                    ctx.save();
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = `rgba(255, 255, 255, ${(0.28 * lockPulse).toFixed(3)})`;
                    drawRoundedRect(ctx, px + 2, py + 2, cellSize - 4, cellSize - 4, 3);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }
        ctx.restore();
    }

    // Shatter particles
    for (const p of particles) {
        const t = 1 - p.age / p.life;
        const px = p.x * cellSize;
        const py = p.y * cellSize;
        const s = p.size * cellSize * (0.4 + 0.6 * t);
        ctx.save();
        ctx.globalAlpha = t;
        ctx.translate(px, py);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
    }

    // Floating score popups
    for (const pop of popups) {
        const progress = pop.age / pop.duration;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
        const px = pop.x * cellSize;
        const py = (pop.y - easeOut * 2.2) * cellSize;

        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const mainSize = Math.max(13, Math.round(cellSize * (pop.isBig ? 0.78 : 0.62)));
        ctx.font = `800 ${mainSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(5, 10, 20, 0.85)';
        ctx.strokeText(pop.text, px, py);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, px, py);

        if (pop.sub) {
            const subSize = Math.max(10, Math.round(cellSize * 0.42));
            ctx.font = `700 ${subSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
            ctx.lineWidth = 3;
            ctx.strokeText(pop.sub, px, py - mainSize * 0.9);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(pop.sub, px, py - mainSize * 0.9);
        }
        ctx.restore();
    }
}

export function drawNextPreview(next) {
    if (!nextCtx || !nextCanvas || !next) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = nextCanvas.width / dpr;
    const h = nextCanvas.height / dpr;

    nextCtx.clearRect(0, 0, w, h);
    const def = TETROMINOES[next.type];
    const shape = def.preview;
    const rows = shape.length;
    const cols = shape[0].length;

    const pad = 8;
    const bSize = Math.max(10, Math.floor(Math.min((w - pad * 2) / 4, (h - pad * 2) / 2.2)));
    const totalW = cols * bSize;
    const totalH = rows * bSize;
    const startX = Math.floor((w - totalW) / 2);
    const startY = Math.floor((h - totalH) / 2);

    nextCtx.save();
    nextCtx.shadowColor = def.glow;
    nextCtx.shadowBlur = 6;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!shape[r][c]) continue;
            drawBeveledBlock(nextCtx, startX + c * bSize, startY + r * bSize, bSize, def, 1);
        }
    }
    nextCtx.restore();
}
