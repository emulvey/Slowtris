// Tetromino definitions, colors, 7-bag generator, and rotation helpers

export const TETROMINOES = [
    {
        name: 'I',
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ],
        preview: [[1, 1, 1, 1]],
        color: '#22d3ee',
        highlight: '#a5f3fc',
        shadow: '#0e7490',
        glow: 'rgba(34, 211, 238, 0.55)',
    },
    {
        name: 'J',
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0],
        ],
        preview: [[1, 0, 0], [1, 1, 1]],
        color: '#3b82f6',
        highlight: '#93c5fd',
        shadow: '#1d4ed8',
        glow: 'rgba(59, 130, 246, 0.55)',
    },
    {
        name: 'L',
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0],
        ],
        preview: [[0, 0, 1], [1, 1, 1]],
        color: '#fb923c',
        highlight: '#fed7aa',
        shadow: '#c2410c',
        glow: 'rgba(251, 146, 60, 0.55)',
    },
    {
        name: 'O',
        shape: [
            [1, 1],
            [1, 1],
        ],
        preview: [[1, 1], [1, 1]],
        color: '#facc15',
        highlight: '#fef08a',
        shadow: '#a16207',
        glow: 'rgba(250, 204, 21, 0.55)',
    },
    {
        name: 'S',
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0],
        ],
        preview: [[0, 1, 1], [1, 1, 0]],
        color: '#4ade80',
        highlight: '#bbf7d0',
        shadow: '#15803d',
        glow: 'rgba(74, 222, 128, 0.55)',
    },
    {
        name: 'T',
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0],
        ],
        preview: [[0, 1, 0], [1, 1, 1]],
        color: '#c084fc',
        highlight: '#e9d5ff',
        shadow: '#7e22ce',
        glow: 'rgba(192, 132, 252, 0.55)',
    },
    {
        name: 'Z',
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0],
        ],
        preview: [[1, 1, 0], [0, 1, 1]],
        color: '#fb7185',
        highlight: '#fecdd3',
        shadow: '#be123c',
        glow: 'rgba(251, 113, 133, 0.55)',
    },
];

// Wall kick offsets tried in order when rotating
export const WALL_KICKS = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [-2, 0],
    [2, 0],
    [0, 1],
    [0, -1],
    [-1, -1],
    [1, -1],
];

let bag = [];

export function newBag() {
    bag = [...Array(TETROMINOES.length).keys()];
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

export function rotateCW(shape) {
    return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
}

export function rotateCCW(shape) {
    return shape[0].map((_, i) => shape.map(row => row[shape[0].length - 1 - i]));
}

// Alias for compatibility
export const rotate = rotateCW;
