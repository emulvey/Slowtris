// mobile-state.js - All mobile-specific state

// Example state variables (expand as needed)
export let _mobileGameState = 0;
export let _mobileBoard = [];
export let _mobileCurrent = null;
export let _mobileCurrentX = 0;
export let _mobileCurrentY = 0;
export let _mobileNext = null;
export let _mobileScore = 0;
export let _mobileFlashRowsActive = null;
export let _mobilePlayerName = '';

// Example getters (expand as needed)
export function getMobileGameState() { return _mobileGameState; }
export function getMobileBoard() { return _mobileBoard; }
export function getMobileCurrent() { return _mobileCurrent; }
export function getMobileCurrentX() { return _mobileCurrentX; }
export function getMobileCurrentY() { return _mobileCurrentY; }
export function getMobileNext() { return _mobileNext; }
export function getMobileScore() { return _mobileScore; }
export function getMobileFlashRowsActive() { return _mobileFlashRowsActive; }
export function getMobilePlayerName() { return _mobilePlayerName; }
