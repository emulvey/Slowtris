import { setupMobileGame } from './mobile.js';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[Main-Mobile] DOM ready, running setupMobileGame');
        setupMobileGame();
    });
} else {
    console.log('[Main-Mobile] DOM already ready, running setupMobileGame');
    setupMobileGame();
}
