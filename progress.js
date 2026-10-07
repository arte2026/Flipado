// Flip-O progress storage.
// Shared by the main menu and every puzzle page, so one file decides how progress is saved.
//
// Saved in localStorage under "flipo.progress.v1", in this shape:
//   { "puzzle1-1": { "solved": [0, 3, 4], "total": 18 }, ... }
// "solved" lists the positions of the solved puzzles in that page's `levels` array (0 = the first).
// Each solved puzzle is worth one star.

const Progress = (function () {
    const STORAGE_KEY = 'flipo.progress.v1';

    function readAll() {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
        } catch (err) {
            return {};      // nothing saved yet, damaged data, or storage is blocked
        }
    }

    function writeAll(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (err) {
            return false;   // storage blocked or full: the game keeps working, it just can't remember
        }
    }

    // A clean, sorted list of solved positions: whole numbers only, no repeats,
    // and (when the puzzle count is known) none beyond the end of the list.
    function cleanSolved(entry, total) {
        const list = entry && Array.isArray(entry.solved) ? entry.solved : [];
        const seen = new Set();
        list.forEach((i) => {
            if (Number.isInteger(i) && i >= 0 && (total === undefined || i < total)) seen.add(i);
        });
        return [...seen].sort((a, b) => a - b);
    }

    function knownTotal(entry) {
        return entry && Number.isInteger(entry.total) ? entry.total : undefined;
    }

    return {
        // One true/false per puzzle in the set, e.g. [true, false, true, ...]
        getSolvedFlags(setId, total) {
            const data = readAll();
            const entry = data[setId];
            const solved = cleanSolved(entry, total);

            // Self-heal: if puzzles were removed from the list, drop their saved stars
            // and remember the new puzzle count.
            if (entry && (entry.total !== total || !Array.isArray(entry.solved) || entry.solved.length !== solved.length)) {
                data[setId] = { solved: solved, total: total };
                writeAll(data);
            }

            const set = new Set(solved);
            return Array.from({ length: total }, (_, i) => set.has(i));
        },

        // Remember that puzzle `index` of `setId` is solved. Safe to call again for a solved puzzle.
        markSolved(setId, index, total) {
            const data = readAll();
            const entry = data[setId] && typeof data[setId] === 'object' ? data[setId] : {};
            const solved = new Set(cleanSolved(entry, total));
            solved.add(index);
            data[setId] = { solved: [...solved].sort((a, b) => a - b), total: total };
            return writeAll(data);
        },

        // Stars earned across every puzzle page
        totalStars() {
            const data = readAll();
            return Object.keys(data).reduce((sum, setId) => {
                const entry = data[setId];
                return sum + cleanSolved(entry, knownTotal(entry)).length;
            }, 0);
        },

        // Per-page breakdown, handy for a future Stats screen: [{ setId, solved, total }]
        summary() {
            const data = readAll();
            return Object.keys(data).map((setId) => ({
                setId: setId,
                solved: cleanSolved(data[setId], knownTotal(data[setId])).length,
                total: knownTotal(data[setId])
            }));
        },

        // Erase all saved progress (for a future "Reset progress" button in Settings)
        reset() {
            try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* nothing to do */ }
        }
    };
})();

// Main menu: show the star count on the Stats button.
// This only does anything on pages that contain an element with id="stats-stars".
(function () {
    function refreshStatsBadge() {
        const el = document.getElementById('stats-stars');
        if (el) el.textContent = Progress.totalStars();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refreshStatsBadge);
    } else {
        refreshStatsBadge();
    }
    window.addEventListener('pageshow', refreshStatsBadge);  // returning with the Back button
    window.addEventListener('storage', refreshStatsBadge);   // another tab or window saved progress
})();

// Immediately apply the saved theme to prevent color flashing on page load
const savedTheme = localStorage.getItem('flipGridTheme') || 'theme-default';
document.documentElement.className = savedTheme;

// Wait for the DOM to load before attaching event listeners
document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsClose = document.getElementById('settings-close');
    const themeBtns = document.querySelectorAll('.theme-btn');

    // Open and close logic for the modal
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => settingsModal.removeAttribute('hidden'));
    }
    
    if (settingsClose && settingsModal) {
        settingsClose.addEventListener('click', () => settingsModal.setAttribute('hidden', 'true'));
    }

    // Apply and save the theme when a button is clicked
    themeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const theme = e.target.dataset.theme;
            document.documentElement.className = theme;
            localStorage.setItem('flipGridTheme', theme); // Saves across all HTML files
        });
    });
});