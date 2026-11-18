/* Flip-O: traffic lights under the board, one per column.
   Red = the column still has mixed colors. Green = every tile in the column is the same color.
   Add to the puzzle pages that use the "make every COLUMN one color" rule, after game2.js:
       <script src="column-lights.js"></script>
   It only watches the board, so game2.js needs no changes. It follows level changes
   (a 3x3 level gets 3 lights, a 4x4 level gets 4). To remove the feature, remove that line. */
(function () {
    'use strict';

    var gridEl = document.getElementById('grid');
    if (!gridEl) return;

    var FLIP_WAIT = 220;   // ms: let the tile finish flipping before its light changes

    var CSS = '' +
        '.column-lights{display:grid;padding:6px 3px;gap:4px;margin:8px auto 0;align-items:start;' +
            'background:var(--md-sys-color-primary-container);border-radius:14px;' +
            'box-shadow: 0 2px 3px rgba(0,0,0,.14);touch-action:none;user-select:none;-webkit-user-select:none}' +
        '.col-light{justify-self:center;display:flex;flex-direction:column;gap:5px;padding:6px 5px;' +
            'background:linear-gradient(180deg,#3a3a3f,#1f1f23);border-radius:11px;' +
            'box-shadow:inset 0 1px 1px rgba(255,255,255,.18),0 3px 0 #0d0d0f,0 6px 8px rgba(0,0,0,.28)}' +
        '.lamp{width:16px;height:16px;border-radius:50%;transition:background .18s,box-shadow .18s}' +
        /* red lamp: lit by default, off when the column is OK */
        '.lamp-red{background:radial-gradient(circle at 35% 30%,#ffb3aa,#e53935 55%,#9b1c1a);' +
            'box-shadow:0 0 8px 2px rgba(255,64,54,.65)}' +
        '.ok .lamp-red{background:#4a2423;box-shadow:inset 0 1px 2px rgba(0,0,0,.65)}' +
        /* green lamp: off by default, lit when the column is OK */
        '.lamp-green{background:#1f3b27;box-shadow:inset 0 1px 2px rgba(0,0,0,.65)}' +
        '.ok .lamp-green{background:radial-gradient(circle at 35% 30%,#c4ffcd,#43c95a 55%,#1b7a2e);' +
            'box-shadow:0 0 8px 2px rgba(76,217,100,.75)}' +
        '.all-ok .col-light .lamp-green{animation:cl-pulse 1s ease-in-out 2}' +
        '@keyframes cl-pulse{50%{transform:scale(1.2)}}' +
        '@media (prefers-reduced-motion:reduce){.all-ok .col-light .lamp-green{animation:none}.lamp{transition:none}}' +
        /* the lights add height: leave room for them on desktop (desktop.css reserved 300px) */
        '@media (min-width:768px){:root{--board-size:min(560px,calc(100vh - 370px))}}' +
        '@media (min-width:1600px) and (min-height:1000px){:root{--board-size:min(680px,calc(100vh - 370px))}}';

    var style = document.createElement('style');
    style.id = 'column-lights-style';
    style.textContent = CSS;
    document.head.appendChild(style);

    var bar = document.createElement('div');
    bar.id = 'column-lights';
    bar.className = 'column-lights';
    bar.setAttribute('aria-hidden', 'true');
    gridEl.parentNode.insertBefore(bar, gridEl.nextSibling);

    var lights = [];        // one element per board column
    var rebuildId = 0;      // changes whenever the lights are rebuilt (new level)

    // true for every board column whose tiles are all the same color
    function columnStates() {
        var tiles = Array.prototype.slice.call(gridEl.querySelectorAll('.tile:not(.outer)'));
        var cols = {};
        tiles.forEach(function (t) {
            var x = parseInt(t.dataset.x, 10);
            var c = cols[x] || (cols[x] = { black: 0, white: 0 });
            if (t.classList.contains('flipped')) c.black++; else c.white++;
        });
        return Object.keys(cols)
            .map(Number)
            .sort(function (a, b) { return a - b; })
            .map(function (x) { return cols[x].black === 0 || cols[x].white === 0; });
    }

    function rebuild(count) {
        rebuildId++;
        bar.innerHTML = '';
        lights = [];
        // same columns, width and gap as the board, so each light sits under its column
        bar.style.gridTemplateColumns = gridEl.style.gridTemplateColumns || '';
        bar.style.width = gridEl.style.width || '';
        for (var i = 0; i < count; i++) {
            var light = document.createElement('div');
            light.className = 'col-light';
            light.style.gridColumn = String(i + 2);      // skip the free ring column on the left
            light.innerHTML = '<span class="lamp lamp-red"></span><span class="lamp lamp-green"></span>';
            bar.appendChild(light);
            lights.push(light);
        }
    }

    function paint(states) {
        if (states.length !== lights.length) return;
        var all = states.length > 0;
        states.forEach(function (ok, i) {
            lights[i].classList.toggle('ok', ok);
            if (!ok) all = false;
        });
        bar.classList.toggle('all-ok', all);
    }

    var needRebuild = true;
    var scheduled = false;

    function run() {
        scheduled = false;
        var states = columnStates();
        if (needRebuild || states.length !== lights.length) {
            needRebuild = false;
            rebuild(states.length);
            paint(states);                      // new level: show it immediately
            return;
        }
        var id = rebuildId;
        setTimeout(function () {                // flip: wait for the animation, then update
            if (id === rebuildId) paint(states);
        }, FLIP_WAIT);
    }

    new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
            if (records[i].type === 'childList') { needRebuild = true; break; }
        }
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(run);
        }
    }).observe(gridEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    run();
})();
