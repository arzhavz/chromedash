document.addEventListener('DOMContentLoaded', () => {
    // Load settings from storage
    chrome.storage.sync.get({
        animations: true,
        gridOverlay: true,
        soundEffects: false,
        bookmarksHistory: false
    }, (settings) => {
        // Set toggle states
        document.getElementById('animToggle').classList.toggle('active', settings.animations);
        document.getElementById('gridToggle').classList.toggle('active', settings.gridOverlay);
        document.getElementById('soundToggle').classList.toggle('active', settings.soundEffects);
        document.getElementById('bookmarksHistoryToggle').classList.toggle('active', settings.bookmarksHistory);
    });

    // Add click handlers
    document.querySelectorAll('.toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            // Save settings
            const settings = {
                animations: document.getElementById('animToggle').classList.contains('active'),
                gridOverlay: document.getElementById('gridToggle').classList.contains('active'),
                soundEffects: document.getElementById('soundToggle').classList.contains('active'),
                bookmarksHistory: document.getElementById('bookmarksHistoryToggle').classList.contains('active')
            };
            chrome.storage.sync.set(settings);
        });
    });
});