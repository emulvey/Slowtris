// Tetromino definitions and helpers
export const TETROMINOES = [
    { shape: [[1,1,1,1]], color: '#00f0f0' },
    { shape: [[1,0,0],[1,1,1]], color: '#0000f0' },
    { shape: [[0,0,1],[1,1,1]], color: '#f0a000' },
    { shape: [[1,1],[1,1]], color: '#f0f000' },
    { shape: [[0,1,1],[1,1,0]], color: '#00f000' },
    { shape: [[0,1,0],[1,1,1]], color: '#a000f0' },
    { shape: [[1,1,0],[0,1,1]], color: '#f00000' },
];

let bag = [];
export function newBag() {
    bag = [...Array(7).keys()];
    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }
}

export function nextTetromino() {
    if (!bag || bag.length === 0) newBag();
    const type = bag.pop();
    const shape = TETROMINOES[type].shape.map(row => row.slice());
    return { type, shape };
}

export function rotate(shape) {
    // Rotate a matrix clockwise
    return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
}
