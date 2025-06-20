// Highscore persistence for Slowtris
const HIGHSCORE_KEY = 'slowtris_highscores';
const HIGHSCORE_SIZE = 10;
let highscores = [];

export function loadHighscores() {
    const data = localStorage.getItem(HIGHSCORE_KEY);
    if (data) {
        highscores = JSON.parse(data);
    } else {
        highscores = Array.from({length: HIGHSCORE_SIZE}, (_, i) => ({ name: '----', score: 0 }));
    }
    return highscores;
}

export function saveHighscores() {
    localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(highscores));
}

export function checkHighscore(score) {
    return score > highscores[HIGHSCORE_SIZE - 1].score;
}

export function insertHighscore(name, score) {
    highscores.push({ name, score });
    highscores.sort((a, b) => b.score - a.score);
    highscores = highscores.slice(0, HIGHSCORE_SIZE);
    saveHighscores();
}

export function getHighscores() {
    return highscores;
}
