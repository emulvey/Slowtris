// mobile-controls.js - Handles mobile control UI

const MOBILE_CONTROLS_ID = 'mobile-controls';

export function showMobileControls(simulateKey) {
    if (!document.getElementById(MOBILE_CONTROLS_ID)) addMobileButtons(simulateKey);
    const controls = document.getElementById(MOBILE_CONTROLS_ID);
    if (controls) controls.style.display = 'flex';
}

export function hideMobileControls() {
    const controls = document.getElementById(MOBILE_CONTROLS_ID);
    if (controls) controls.style.display = 'none';
}

function addMobileButtons(simulateKey) {
    if (document.getElementById(MOBILE_CONTROLS_ID)) return;
    const controls = document.createElement('div');
    controls.id = MOBILE_CONTROLS_ID;
    controls.style.position = 'fixed';
    controls.style.left = '0';
    controls.style.right = '0';
    controls.style.bottom = '0';
    controls.style.zIndex = '100';
    controls.style.display = 'flex';
    controls.style.justifyContent = 'center';
    controls.style.gap = '12px';
    controls.style.padding = '12px 0 24px 0';
    controls.innerHTML = `
        <button data-key="ArrowLeft" aria-label="Move Left">◀️</button>
        <button data-key="ArrowDown" aria-label="Move Down">⬇️</button>
        <button data-key="ArrowUp" aria-label="Rotate">⟳</button>
        <button data-key=" " aria-label="Drop">⏬</button>
        <button data-key="ArrowRight" aria-label="Move Right">▶️</button>
    `;
    Array.from(controls.querySelectorAll('button')).forEach(btn => {
        btn.style.fontSize = '2rem';
        btn.style.padding = '12px 18px';
        btn.style.borderRadius = '12px';
        btn.style.border = 'none';
        btn.style.background = '#333';
        btn.style.color = '#fff';
        btn.style.boxShadow = '0 2px 8px #0006';
        btn.addEventListener('touchstart', e => {
            e.preventDefault();
            simulateKey(btn.dataset.key);
        });
    });
    document.body.appendChild(controls);
}
