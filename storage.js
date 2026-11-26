// Highscore and settings persistence for Slowtris (safe across web, private mode, and extensions)

const HIGHSCORE_KEY = 'slowtris_highscores';
const SETTINGS_KEY = 'slowtris_settings';
const HIGHSCORE_SIZE = 10;

const DEFAULT_SETTINGS = {
    sfxEnabled: true,
    musicEnabled: true,
    touchControls: 'auto', // 'auto' | 'on' | 'off'
};

let highscores = createEmptyHighscores();
let settings = { ...DEFAULT_SETTINGS };

function createEmptyHighscores() {
    return Array.from({ length: HIGHSCORE_SIZE }, () => ({ name: '----', score: 0 }));
}

function safeGetItem(key) {
    try {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeSetItem(key, value) {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(key, value);
    } catch {
        // Ignore storage errors (private mode / sandboxed iframe)
    }
}

function sanitizeHighscores(parsed) {
    if (!Array.isArray(parsed)) return createEmptyHighscores();
    const cleaned = parsed
        .filter(item => item && typeof item === 'object')
        .map(item => ({
            name: String(item.name || '----')
                .toUpperCase()
                .replace(/[^A-Z0-9-]/g, '')
                .slice(0, 4)
                .padEnd(4, '-'),
            score: Number.isFinite(Number(item.score)) && Number(item.score) >= 0
                ? Math.floor(Number(item.score))
                : 0,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, HIGHSCORE_SIZE);

    while (cleaned.length < HIGHSCORE_SIZE) {
        cleaned.push({ name: '----', score: 0 });
    }
    return cleaned;
}

export function loadHighscores() {
    const raw = safeGetItem(HIGHSCORE_KEY);
    if (raw) {
        try {
            highscores = sanitizeHighscores(JSON.parse(raw));
        } catch {
            highscores = createEmptyHighscores();
        }
    } else {
        highscores = createEmptyHighscores();
    }
    return highscores;
}

export function saveHighscores() {
    safeSetItem(HIGHSCORE_KEY, JSON.stringify(highscores));
}

export function checkHighscore(score) {
    if (!Number.isFinite(score) || score <= 0) return false;
    return score > highscores[HIGHSCORE_SIZE - 1].score;
}

export function insertHighscore(name, score) {
    const cleanName = String(name || 'PLAY')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 4)
        .padEnd(4, '-') || '----';
    const cleanScore = Math.max(0, Math.floor(Number(score) || 0));
    highscores.push({ name: cleanName, score: cleanScore });
    highscores.sort((a, b) => b.score - a.score);
    highscores = highscores.slice(0, HIGHSCORE_SIZE);
    saveHighscores();
    return highscores;
}

export function getHighscores() {
    return highscores;
}

export function getBestScore() {
    return highscores.length > 0 ? highscores[0].score : 0;
}

export function loadSettings() {
    const raw = safeGetItem(SETTINGS_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                settings = {
                    sfxEnabled: typeof parsed.sfxEnabled === 'boolean' ? parsed.sfxEnabled : DEFAULT_SETTINGS.sfxEnabled,
                    musicEnabled: typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : DEFAULT_SETTINGS.musicEnabled,
                    touchControls: ['auto', 'on', 'off'].includes(parsed.touchControls) ? parsed.touchControls : DEFAULT_SETTINGS.touchControls,
                };
            }
        } catch {
            settings = { ...DEFAULT_SETTINGS };
        }
    }
    return { ...settings };
}

export function saveSettings(partial) {
    settings = { ...settings, ...partial };
    safeSetItem(SETTINGS_KEY, JSON.stringify(settings));
    return { ...settings };
}

export function getSettings() {
    return { ...settings };
}
