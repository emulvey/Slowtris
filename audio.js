// Self-contained Web Audio API synthesizer for Slowtris SFX & adaptive chill BGM

let audioCtx = null;
let masterGain = null;
let sfxGain = null;
let musicGain = null;
let noiseBuffer = null;

let sfxEnabled = true;
let musicEnabled = true;
let musicShouldPlay = false;
let musicStress = 0;

let musicTimerId = null;
let nextNoteTime = 0;
let musicStep = 0;

// Chill ambient pentatonic / maj9 chord progression (frequencies in Hz)
// Cmaj9 -> Am9 -> Fmaj7 -> G6
const PROGRESSION = [
    { bass: 130.81, chord: [261.63, 329.63, 392.0, 493.88, 587.33] }, // Cmaj9
    { bass: 110.0, chord: [220.0, 261.63, 329.63, 392.0, 493.88] },   // Am9
    { bass: 87.31, chord: [174.61, 220.0, 261.63, 329.63, 392.0] },   // Fmaj7
    { bass: 98.0, chord: [196.0, 246.94, 293.66, 329.63, 440.0] },    // G6
];

// Gentle 8-step arpeggio index pattern per bar (null = rest)
const ARP_PATTERN = [0, 2, 4, null, 3, 2, 4, 1];

function ensureContext() {
    if (typeof window === 'undefined') return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    if (!audioCtx) {
        audioCtx = new Ctx();
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -16;
        compressor.knee.value = 18;
        compressor.ratio.value = 6;
        compressor.attack.value = 0.005;
        compressor.release.value = 0.15;

        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.85;

        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = sfxEnabled ? 0.65 : 0;

        musicGain = audioCtx.createGain();
        musicGain.gain.value = musicEnabled ? 0.24 : 0;

        sfxGain.connect(compressor);
        musicGain.connect(compressor);
        compressor.connect(masterGain);
        masterGain.connect(audioCtx.destination);

        // Pre-build short noise buffer for soft percussive transients
        const sampleRate = audioCtx.sampleRate;
        const length = Math.floor(sampleRate * 0.12);
        noiseBuffer = audioCtx.createBuffer(1, length, sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.28));
        }
    }

    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }

    return audioCtx;
}

export function unlockAudio() {
    const ctx = ensureContext();
    if (ctx && musicShouldPlay && musicEnabled && !musicTimerId) {
        startMusicLoop();
    }
}

export function setSfxEnabled(enabled) {
    sfxEnabled = Boolean(enabled);
    if (sfxGain && audioCtx) {
        sfxGain.gain.setTargetAtTime(sfxEnabled ? 0.65 : 0, audioCtx.currentTime, 0.02);
    }
}

export function setMusicEnabled(enabled) {
    musicEnabled = Boolean(enabled);
    if (musicGain && audioCtx) {
        musicGain.gain.setTargetAtTime(musicEnabled ? 0.24 : 0, audioCtx.currentTime, 0.08);
    }
    if (musicEnabled && musicShouldPlay) {
        startMusicLoop();
    } else if (!musicEnabled) {
        stopMusicLoop();
    }
}

export function setMusicActive(active) {
    musicShouldPlay = Boolean(active);
    if (musicShouldPlay && musicEnabled) {
        if (audioCtx && audioCtx.state === 'running') {
            startMusicLoop();
        }
    } else {
        stopMusicLoop();
    }
}

export function setMusicStress(stress) {
    musicStress = Math.max(0, Math.min(1, Number(stress) || 0));
}

function playTone({
    freq = 440,
    endFreq = null,
    type = 'sine',
    duration = 0.08,
    volume = 0.25,
    delay = 0,
    attack = 0.005,
    filterFreq = null,
    dest = null,
}) {
    const ctx = ensureContext();
    if (!ctx) return;
    const target = dest || sfxGain;
    if (!target) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null && endFreq > 0) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    if (filterFreq) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, now);
        osc.connect(filter);
        filter.connect(gain);
    } else {
        osc.connect(gain);
    }

    gain.connect(target);
    osc.start(now);
    osc.stop(now + duration + 0.02);
}

function playNoiseBurst({ duration = 0.035, volume = 0.14, filterFreq = 1400, delay = 0 }) {
    const ctx = ensureContext();
    if (!ctx || !noiseBuffer || !sfxGain) return;
    const now = ctx.currentTime + delay;

    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);

    src.start(now);
    src.stop(now + duration + 0.01);
}

export function playSfx(event, payload = {}) {
    if (!sfxEnabled) return;
    const ctx = ensureContext();
    if (!ctx) return;

    const jitter = 0.97 + Math.random() * 0.06;

    switch (event) {
        case 'move':
            playTone({
                freq: 480 * jitter,
                endFreq: 560 * jitter,
                type: 'triangle',
                duration: 0.042,
                volume: 0.16,
                filterFreq: 2400,
            });
            break;

        case 'rotate':
            playTone({
                freq: 420 * jitter,
                endFreq: 640 * jitter,
                type: 'sine',
                duration: 0.068,
                volume: 0.2,
            });
            playTone({
                freq: 640 * jitter,
                endFreq: 860 * jitter,
                type: 'triangle',
                duration: 0.05,
                volume: 0.1,
                delay: 0.02,
            });
            break;

        case 'softDrop':
            playTone({
                freq: 270 * jitter,
                endFreq: 215 * jitter,
                type: 'triangle',
                duration: 0.05,
                volume: 0.18,
                filterFreq: 1400,
            });
            break;

        case 'autoDrop':
            // Distinct subtle dual-tick so player hears the 2-move gravity step
            playTone({
                freq: 330,
                endFreq: 250,
                type: 'sine',
                duration: 0.06,
                volume: 0.2,
            });
            playTone({
                freq: 520,
                endFreq: 440,
                type: 'triangle',
                duration: 0.035,
                volume: 0.08,
                delay: 0.015,
            });
            break;

        case 'hardDrop':
            playTone({
                freq: 155,
                endFreq: 48,
                type: 'sine',
                duration: 0.125,
                volume: 0.36,
            });
            playNoiseBurst({ duration: 0.04, volume: 0.18, filterFreq: 950 });
            break;

        case 'lock':
            playTone({
                freq: 195,
                endFreq: 120,
                type: 'triangle',
                duration: 0.075,
                volume: 0.24,
                filterFreq: 900,
            });
            break;

        case 'lockWarn':
            playTone({
                freq: 760,
                endFreq: 700,
                type: 'sine',
                duration: 0.055,
                volume: 0.13,
            });
            break;

        case 'bump':
            playTone({
                freq: 115,
                endFreq: 82,
                type: 'sine',
                duration: 0.045,
                volume: 0.12,
            });
            break;

        case 'lineClear': {
            const count = payload.count || 1;
            const combo = payload.combo || 1;
            const pitchMult = Math.pow(2, Math.min(combo - 1, 6) / 12);

            const chords = {
                1: [523.25, 659.25],                                   // C5 E5
                2: [523.25, 659.25, 783.99],                           // C5 E5 G5
                3: [523.25, 659.25, 783.99, 987.77],                   // C5 E5 G5 B5
                4: [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51],  // Slowtris fanfare!
            };
            const notes = chords[Math.min(count, 4)] || chords[4];
            const spacing = count >= 4 ? 0.052 : 0.058;

            notes.forEach((f, idx) => {
                const freq = f * pitchMult;
                playTone({
                    freq,
                    type: count >= 4 ? 'triangle' : 'sine',
                    duration: count >= 4 ? 0.34 : 0.24,
                    volume: count >= 4 ? 0.24 : 0.22,
                    delay: idx * spacing,
                    attack: 0.008,
                    filterFreq: 3600,
                });
                // Subtle shimmer harmonic on 3+ lines
                if (count >= 3) {
                    playTone({
                        freq: freq * 1.5,
                        type: 'sine',
                        duration: 0.22,
                        volume: 0.07,
                        delay: idx * spacing + 0.015,
                    });
                }
            });
            break;
        }

        case 'start': {
            const notes = [392.0, 493.88, 587.33]; // G4 B4 D5
            notes.forEach((f, i) => {
                playTone({
                    freq: f,
                    type: 'triangle',
                    duration: 0.16,
                    volume: 0.18,
                    delay: i * 0.055,
                    filterFreq: 2600,
                });
            });
            break;
        }

        case 'ui':
            playTone({
                freq: 660,
                endFreq: 740,
                type: 'sine',
                duration: 0.036,
                volume: 0.13,
            });
            break;

        case 'gameover': {
            const notes = [329.63, 293.66, 261.63, 196.0]; // E4 D4 C4 G3
            notes.forEach((f, i) => {
                playTone({
                    freq: f,
                    endFreq: f * 0.98,
                    type: 'triangle',
                    duration: i === notes.length - 1 ? 0.45 : 0.22,
                    volume: 0.2,
                    delay: i * 0.14,
                    filterFreq: 1400,
                });
            });
            break;
        }

        case 'highscore': {
            const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
            const delays = [0, 0.08, 0.16, 0.25, 0.37, 0.46];
            notes.forEach((f, i) => {
                playTone({
                    freq: f,
                    type: 'triangle',
                    duration: i === notes.length - 1 ? 0.42 : 0.16,
                    volume: 0.22,
                    delay: delays[i],
                    filterFreq: 3200,
                });
            });
            break;
        }

        default:
            break;
    }
}

// --- Adaptive Ambient Synth Loop ---

function scheduleMusicStep(stepIndex, time) {
    if (!audioCtx || !musicGain || !musicEnabled || !musicShouldPlay) return;

    const bar = Math.floor(stepIndex / 8) % PROGRESSION.length;
    const beatInBar = stepIndex % 8;
    const harmony = PROGRESSION[bar];

    // Warm pad bass on beat 0 (and gentle pulse on beat 4 at higher stress)
    if (beatInBar === 0 || (beatInBar === 4 && musicStress > 0.45)) {
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(harmony.bass, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320 + musicStress * 360, time);

        const dur = beatInBar === 0 ? 1.45 : 0.65;
        const vol = beatInBar === 0 ? 0.32 : 0.16 * musicStress;

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);
        osc.start(time);
        osc.stop(time + dur + 0.04);
    }

    // Gentle bell-like ambient arpeggio note
    const noteIdx = ARP_PATTERN[beatInBar];
    if (noteIdx !== null) {
        const freq = harmony.chord[noteIdx % harmony.chord.length];
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = musicStress > 0.7 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900 + musicStress * 1200, time);

        const dur = 0.55 - musicStress * 0.15;
        const vol = 0.16 + musicStress * 0.06;

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);
        osc.start(time);
        osc.stop(time + dur + 0.04);
    }
}

function schedulerTick() {
    if (!audioCtx || !musicEnabled || !musicShouldPlay) {
        stopMusicLoop();
        return;
    }
    if (audioCtx.state !== 'running') return;

    // Step duration speeds gently from calm (~0.38s) to tense (~0.24s)
    const stepDur = 0.38 - musicStress * 0.14;
    const lookahead = 0.16;

    while (nextNoteTime < audioCtx.currentTime + lookahead) {
        scheduleMusicStep(musicStep, nextNoteTime);
        nextNoteTime += stepDur;
        musicStep = (musicStep + 1) % (PROGRESSION.length * 8);
    }
}

function startMusicLoop() {
    const ctx = ensureContext();
    if (!ctx || musicTimerId !== null) return;
    nextNoteTime = ctx.currentTime + 0.08;
    musicTimerId = setInterval(schedulerTick, 60);
}

function stopMusicLoop() {
    if (musicTimerId !== null) {
        clearInterval(musicTimerId);
        musicTimerId = null;
    }
}

// Pause music cleanly if browser tab goes hidden
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopMusicLoop();
        } else if (musicShouldPlay && musicEnabled && audioCtx && audioCtx.state === 'running') {
            startMusicLoop();
        }
    });
}
