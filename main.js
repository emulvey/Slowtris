// Only device detection and dynamic import remain. No other imports needed.
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (isMobile()) {
    import('./main-mobile.js');
} else {
    import('./main-desktop.js');
}
