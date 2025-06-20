// Only device detection and dynamic import remain. No other imports needed.
function isMobile() {
    // Reverted: use real device detection
    const result = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('[Main] Device detection:', navigator.userAgent, '=> isMobile:', result);
    return result;
}

if (isMobile()) {
    console.log('[Main] Importing main-mobile.js');
    import('./main-mobile.js');
} else {
    console.log('[Main] Importing main-desktop.js');
    import('./main-desktop.js');
}
