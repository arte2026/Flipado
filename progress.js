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

//Sounds
// Flip-O sound effects and vibration.
//
// Every sound has a built-in version synthesized with the Web Audio API, so the game is never silent.
// To use your own recording instead, put a .wav file in the "sounds" folder (see SOUND_FILES below):
// if the file is there it plays, and if it is missing the built-in sound plays.
// Used by:  the main menu (splash tapped)  and  the puzzle pages (tile flipped, puzzle solved).
//
// Public API:
//   Feedback.play('enter' | 'flip' | 'solved')   play a sound
//   Feedback.vibrate('flip')            vibrate (does nothing on devices without vibration)
//   Feedback.isSoundOn() / setSoundOn(true|false)
//   Feedback.isVibrationOn() / setVibrationOn(true|false)
// The on/off choices are saved in localStorage, so a future Settings screen can use them.

const Feedback = (function () {
    const SETTINGS_KEY = 'flipo.settings.v1';
    const MASTER_VOLUME = 0.5;            // overall loudness, 0 to 1

    // ---------- saved settings ----------
    function readSettings() {
        try {
            const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
            return s && typeof s === 'object' ? s : {};
        } catch (err) {
            return {};
        }
    }

    function saveSetting(key, value) {
        const s = readSettings();
        s[key] = value;
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (err) { /* storage blocked */ }
    }

    function isOn(key) {
        return readSettings()[key] !== false;     // on unless the player switched it off
    }

    // ---------- audio engine ----------
    let audioCtx = null;

    // Creates the audio engine on first use. Browsers keep it "suspended" until the player has
    // tapped something, so every call also asks it to resume.
    function getContext() {
        if (!audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            try { audioCtx = new Ctx(); } catch (err) { return null; }
        }
        if (audioCtx.state === 'suspended') {
            try {
                const p = audioCtx.resume();
                if (p && typeof p.catch === 'function') p.catch(() => {});
            } catch (err) { /* try again on the next tap */ }
        }
        return audioCtx;
    }

    // One note: a short fade-in and a smooth fade-out keep it from clicking.
    function tone(ctx, out, o) {
        const t0 = ctx.currentTime + (o.start || 0);
        const dur = o.dur || 0.2;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = o.type || 'sine';
        osc.frequency.setValueAtTime(o.freq, t0);
        if (o.toFreq) osc.frequency.exponentialRampToValueAtTime(o.toFreq, t0 + dur);   // glide to another pitch
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(o.gain || 0.4, t0 + 0.012);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(env);
        env.connect(out);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
    }

    // A rising "whoosh": filtered noise whose filter sweeps upward.
    function whoosh(ctx, out, o) {
        const t0 = ctx.currentTime + (o.start || 0);
        const dur = o.dur || 0.8;
        const length = Math.ceil(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

        const src = ctx.createBufferSource();
        src.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1.2;
        filter.frequency.setValueAtTime(o.from, t0);
        filter.frequency.exponentialRampToValueAtTime(o.to, t0 + dur * 0.6);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(o.gain || 0.3, t0 + dur * 0.25);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        src.connect(filter);
        filter.connect(env);
        env.connect(out);
        src.start(t0);
        src.stop(t0 + dur);
    }

    // ---------- your own sound files ----------
    // Put your recordings in a "sounds" folder next to the HTML files. In the Android Studio project that is
    // app/src/main/assets/sounds/. Change a name below if your file is called something else.
    //   src     the file, relative to the HTML page
    //   volume  0 to 1
    //   copies  how many can play at once (a fast swipe flips several tiles within one sound's length)
    const SOUND_FILES = {
        flip:   { src: 'bong.ogg',   volume: 0.6, copies: 4 },
        solved: { src: 'win.wav', volume: 1.0, copies: 1 }
    };

    const filePools = {};

    // Starts loading every file right away so the first sound has no delay.
    // A file that is missing or can't be read is skipped; the built-in sound is used for it.
    function loadSoundFiles() {
        if (typeof Audio !== 'function') return;
        Object.keys(SOUND_FILES).forEach((name) => {
            const cfg = SOUND_FILES[name];
            const pool = [];
            try {
                for (let i = 0; i < cfg.copies; i++) {
                    const el = new Audio();
                    el.preload = 'auto';
                    el.volume = cfg.volume;
                    el.src = cfg.src;
                    pool.push(el);
                }
            } catch (err) { return; }
            filePools[name] = { pool: pool, next: 0 };
        });
    }

    // Plays the player's own file. Returns false when there is none to play.
    function playFile(name) {
        const entry = filePools[name];
        if (!entry) return false;
        const el = entry.pool[entry.next];
        // readyState 0 means the file is missing or unreadable (1 or more means it was found)
        if (el.error || el.readyState < 1) return false;
        entry.next = (entry.next + 1) % entry.pool.length;
        try {
            el.currentTime = 0;                                   // restart if it is still playing
            const p = el.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});   // blocked by the browser: ignore
        } catch (err) {
            return false;
        }
        return true;
    }

    // ---------- the sounds ----------
    const SOUNDS = {
        // Splash tapped: a soft whoosh and two chime notes, about as long as the 0.9 s fade-out
        enter(ctx, out) {
            whoosh(ctx, out, { dur: 0.9, from: 250, to: 3000, gain: 0.35 });
            tone(ctx, out, { freq: 659.25, start: 0.05, dur: 0.35, gain: 0.35 });   // E5
            tone(ctx, out, { freq: 987.77, start: 0.16, dur: 0.6, gain: 0.3 });     // B5
        },

        // Tile flipped: a tiny "tick" that drops in pitch, short enough to repeat many times in one swipe
        flip(ctx, out) {
            tone(ctx, out, { freq: 900, toFreq: 450, dur: 0.07, type: 'triangle', gain: 0.3 });
        },

        // Puzzle solved: a quick rising arpeggio with a little sparkle on top
        solved(ctx, out) {
            [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {                 // C5 E5 G5 C6
                tone(ctx, out, { freq: freq, start: i * 0.1, dur: i === 3 ? 0.7 : 0.25, type: 'triangle', gain: 0.4 });
            });
            tone(ctx, out, { freq: 2093, start: 0.3, dur: 0.6, gain: 0.08 });       // C7
        }
    };

    // ---------- vibration patterns, in milliseconds ----------
    const PATTERNS = {
        flip: 12        // one short tick for each tile that flips
    };

    // Get the audio engine ready on the player's first touch, click or key press
    const FIRST_TOUCH_EVENTS = ['pointerdown', 'touchstart', 'click', 'keydown'];
    function onFirstTouch() {
        FIRST_TOUCH_EVENTS.forEach((name) => document.removeEventListener(name, onFirstTouch, true));
        if (isOn('sound')) getContext();
    }
    FIRST_TOUCH_EVENTS.forEach((name) => document.addEventListener(name, onFirstTouch, true));

    loadSoundFiles();

    return {
        play(name) {
            if (!isOn('sound')) return;
            if (playFile(name)) return;           // your own recording, when it is there
            if (!SOUNDS[name]) return;            // otherwise the built-in sound
            const ctx = getContext();
            if (!ctx) return;
            try {
                const out = ctx.createGain();
                out.gain.value = MASTER_VOLUME;
                out.connect(ctx.destination);
                SOUNDS[name](ctx, out);
            } catch (err) { /* sound is a bonus: never let it break the game */ }
        },

        vibrate(name) {
            if (!PATTERNS[name] || !isOn('vibration')) return;
            try {
                if (navigator.vibrate) navigator.vibrate(PATTERNS[name]);
            } catch (err) { /* not supported */ }
        },

        isSoundOn() { return isOn('sound'); },
        setSoundOn(on) { saveSetting('sound', !!on); },
        isVibrationOn() { return isOn('vibration'); },
        setVibrationOn(on) { saveSetting('vibration', !!on); }
    };
})();

// Main menu: play the entrance sound when the splash screen is tapped.
// Does nothing on pages without the splash.
(function () {
    function hookSplash() {
        const splash = document.getElementById('welcomeScreen') || document.getElementById('enterBtn');
        if (splash) splash.addEventListener('click', () => Feedback.play('enter'), { once: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hookSplash);
    } else {
        hookSplash();
    }
})();