const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
// Add these DOM references at the top of game.js
const modalEl = document.getElementById('modal');
const modalTextEl = document.getElementById('modal-text');
const levelSelectorEl = document.getElementById('level-selector');
// SHAPES VARIANT of the engine (game2.js is left untouched for the colour puzzles).
//
// Every tile has a SHAPE (heart or star) and a COLOUR (dark or light).
// Flipping a tile swaps its shape. The goal: every ROW must end up with one shape
// (a row may be all hearts or all stars, each row decides for itself).
//
// Level format, in the page's  const levels = [ ... ]:
//   { layout: [ "HsHS",       one string per board row, one letter per tile:
//               "ShSs",         H = dark heart     S = dark star
//               "hSSs",         h = light heart    s = light star
//               "hhhH" ],
//     blocked: [ {x:0,y:2} ]   optional, same as before (outer ring tiles only)
//   }
// Numbers still work too: 0 = heart, 1 = star (all dark), e.g. layout: [[0,1,0],[1,1,0]].
// Any rectangular size works (every row must have the same length).
// The script generates the free outer ring automatically.

// false: a flip changes only the shape, the colour stays on its tile (colour is a decoy).
// true:  a flip changes the shape AND swaps dark/light.
const FLIP_CHANGES_COLOR = false;

// Heart and star outlines (24x24 icon paths)
const SHAPE_PATHS = {
    heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'
};

function makeShapeSvg(name) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'shape-svg');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', SHAPE_PATHS[name]);
    svg.appendChild(path);
    return svg;
}

// One letter (or 0/1) -> { star: true/false, dark: true/false }
function parseCell(value, levelIndex) {
    if (value === 0 || value === 1) return { star: value === 1, dark: true };
    const ch = String(value);
    if ('HhSs'.indexOf(ch) === -1 || ch.length !== 1) {
        console.error(`Level ${levelIndex + 1}: "${value}" is not a tile. Use H, h, S or s (or 0 / 1).`);
        return { star: false, dark: true };
    }
    return { star: ch === 'S' || ch === 's', dark: ch === 'H' || ch === 'S' };
}

let currentLevel = 0;
// Solved puzzles are saved in the browser (see progress.js), one list per puzzle page.
// The page's file name (e.g. "puzzle1-1") identifies it; <body data-level-set="..."> overrides that.
const levelSetId = document.body.dataset.levelSet ||
    (location.pathname.split('/').pop() || 'puzzle').replace(/\.html?$/i, '');

if (typeof Progress === 'undefined') {
    console.warn('progress.js is not loaded on this page, so solved puzzles will not be saved.');
}

// Sound and vibration come from feedback.js. If it isn't loaded, the game simply stays silent.
const feedback = (typeof Feedback !== 'undefined') ? Feedback : { play() {}, vibrate() {} };

// Track which levels have been solved (restored from saved progress)
let completedLevels = (typeof Progress !== 'undefined')
    ? Progress.getSolvedFlags(levelSetId, levels.length)
    : new Array(levels.length).fill(false);
let tiles = [];
let isDrawing = false;
let currentPath = new Set();
let lastTileIndex = -1;

// Board dimensions, set in initLevel() from the level's layout.
// "board" = the playable inner area; "grid" = the board plus the 1-tile outer ring.
let boardRows = 0;
let boardCols = 0;
let gridWidth = 0;
let gridHeight = 0;

// Tall boards must fit on screen: the grid is never taller than this share of the viewport.
const MAX_GRID_HEIGHT_VH = 60;

// Render the level buttons
function renderLevelSelector() {
    levelSelectorEl.innerHTML = ''; // Clear previous buttons
    
    levels.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.classList.add('level-btn');
        btn.textContent = index + 1;
        
        if (index === currentLevel) {
            btn.classList.add('active');
        }
        
        if (completedLevels[index]) {
            btn.classList.add('completed');
        }
        
        btn.addEventListener('click', () => {
            currentLevel = index;
            renderLevelSelector();
            initLevel(currentLevel);
        });
        
        levelSelectorEl.appendChild(btn);
    });
}

function initLevel(levelIndex) {
    gridEl.innerHTML = '';
    tiles = [];
    const level = levels[levelIndex];
    const layout = Array.isArray(level) ? level : level.layout;   // a bare array of rows works too
    const blockedCoords = level.blocked || [];
    gridEl.classList.add('shapes');                                // lets shapes.css style the tiles
    gridEl.classList.toggle('flip-color', FLIP_CHANGES_COLOR);
    // Derive every size from the layout itself, so any board shape works
    boardRows = layout.length;
    boardCols = layout[0].length;
    gridWidth = boardCols + 2;   // +2 for the free outer ring
    gridHeight = boardRows + 2;

    // Catch typos such as a row with a missing number
    if (!layout.every(row => row.length === boardCols)) {
        console.error(`Level ${levelIndex + 1}: every row must have ${boardCols} values.`);
    }
	blockedCoords.forEach(({ x, y }) => {
        const inside = x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
        const onRing = x === 0 || x === gridWidth - 1 || y === 0 || y === gridHeight - 1;
        if (!inside) {
            console.error(`Level ${levelIndex + 1}: blocked tile (${x}, ${y}) is outside the ${gridWidth}x${gridHeight} grid.`);
        } else if (!onRing) {
            console.warn(`Level ${levelIndex + 1}: blocked tile (${x}, ${y}) is inside the board. Only outer tiles can be blocked, so it is ignored.`);
        }
    });
    // Describe this grid's shape to CSS (inline styles override the old repeat(7, 1fr))
    gridEl.style.gridTemplateColumns = `repeat(${gridWidth}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${gridHeight}, 1fr)`;
    gridEl.style.aspectRatio = `${gridWidth} / ${gridHeight}`;
    gridEl.style.width = `min(100%, calc(${MAX_GRID_HEIGHT_VH}vh * ${gridWidth} / ${gridHeight}))`;
    gridEl.style.margin = '0 auto';

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            // Create the wrapper
            const tile = document.createElement('div');
            tile.classList.add('tile');
            
            // Create the 3D inner structure
            const tileInner = document.createElement('div');
            tileInner.classList.add('tile-inner');
            
            const tileFront = document.createElement('div');
            tileFront.classList.add('tile-face', 'tile-front');
            
            const tileBack = document.createElement('div');
            tileBack.classList.add('tile-face', 'tile-back');
            
            // Assemble the layers
            tileInner.appendChild(tileFront);
            tileInner.appendChild(tileBack);
            tile.appendChild(tileInner);
            
            const isOuter = x === 0 || x === gridWidth - 1 || y === 0 || y === gridHeight - 1;
            
            // Check if current coordinate is in the blocked array
            const isBlocked = isOuter && blockedCoords.some(coord => coord.x === x && coord.y === y);
            
            if (isOuter) {
                tile.classList.add('outer');
                if (isBlocked) {
                    tile.classList.add('blocked');
                }
            } else {
                // "flipped" = the tile is showing its star face; not flipped = heart face.
                const cell = parseCell(layout[y - 1][x - 1], levelIndex);
                if (cell.star) {
                    tile.classList.add('flipped');
                }
                // Front face shows a heart, back face shows a star. The colour belongs to the tile.
                tileFront.appendChild(makeShapeSvg('heart'));
                tileBack.appendChild(makeShapeSvg('star'));
                // data-color is the colour of the HEART side. When a flip also swaps the colour, the star side is
                // the opposite, so a star letter must store the opposite colour to be shown as written.
                const heartSideDark = (FLIP_CHANGES_COLOR && cell.star) ? !cell.dark : cell.dark;
                tile.dataset.color = heartSideDark ? 'dark' : 'light';
            }
            
            tile.dataset.index = y * gridWidth + x;
            tile.dataset.x = x;
            tile.dataset.y = y;
            tile.dataset.isOuter = isOuter; 
            tile.dataset.isBlocked = isBlocked;

            gridEl.appendChild(tile);
            tiles.push(tile);
        }
    }
}

gridEl.addEventListener('pointerdown', (e) => {
    const tile = e.target.closest('.tile');
    if (!tile) return;
    
    isDrawing = true;
    currentPath.clear();
    
    // Clear the path traces from outer space
    document.querySelectorAll('.path-trace').forEach(t => t.classList.remove('path-trace'));
    
    // NEW: Clear the yellow highlight borders from the previous attempt
    document.querySelectorAll('.highlight').forEach(t => t.classList.remove('highlight'));
    
    gridEl.setPointerCapture(e.pointerId);
    addTileToPath(tile);
});

gridEl.addEventListener('pointermove', (e) => {
    if (!isDrawing) return;
    
    const elementUnderPointer = document.elementFromPoint(e.clientX, e.clientY);
    if (!elementUnderPointer) return;
    
    const tile = elementUnderPointer.closest('.tile');
    if (tile) {
        addTileToPath(tile);
    }
});

function addTileToPath(tile) {
    const index = parseInt(tile.dataset.index);
    
	// Prevent dragging through blocked outer tiles
    if (tile.dataset.isBlocked === "true") return;
    if (currentPath.has(index)) return;
    
    if (currentPath.size > 0) {
        const lastTile = tiles[lastTileIndex];
        const dx = Math.abs(parseInt(tile.dataset.x) - parseInt(lastTile.dataset.x));
        const dy = Math.abs(parseInt(tile.dataset.y) - parseInt(lastTile.dataset.y));
        
        if (dx + dy !== 1) return;
    }

    currentPath.add(index);
    lastTileIndex = index;
    
    if (tile.dataset.isOuter === "true") {
        tile.classList.add('path-trace');
    } else {
        tile.classList.toggle('flipped');
         feedback.vibrate('flip');
        feedback.play('flip');
        // NEW: Add the highlight class to show the yellow border
        tile.classList.add('highlight');
    }
}

// Update your existing pointerup listener
window.addEventListener('pointerup', () => {
    if (isDrawing) {
        isDrawing = false;
        
        // Only run the check if the player actually drew a path
        if (currentPath.size > 0) {
            checkWinCondition();
        }
    }
});

// Helper function to locate a specific tile in the 1D array using 2D coordinates
function getTileAt(x, y) {
    return tiles[y * gridWidth + x];
}

function checkWinCondition() {
    let isSolved = true;

    // Every ROW must show a single shape (all hearts or all stars)
    for (let y = 1; y <= boardRows; y++) {
        const firstTileIsStar = getTileAt(1, y).classList.contains('flipped');

        for (let x = 2; x <= boardCols; x++) {
            const currentTileIsStar = getTileAt(x, y).classList.contains('flipped');

            if (currentTileIsStar !== firstTileIsStar) {
                isSolved = false;
                break;
            }
        }

        if (!isSolved) break;
    }

    const modalStatsEl = document.getElementById('modal-stats');
    const closeBtn = document.getElementById('modal-close-btn');
    const resetBtn = document.getElementById('modal-reset-btn');

    if (isSolved) {
        // Mark current level as completed and update UI
        completedLevels[currentLevel] = true;
        if (typeof Progress !== 'undefined') {
            Progress.markSolved(levelSetId, currentLevel, levels.length);
        }
        renderLevelSelector();
        feedback.play('solved');
        
        if (typeof window.AndroidBridge !== "undefined") {
            window.AndroidBridge.submitScore("", currentLevel + 1);
        }

        const movesMade = currentPath.size;

        modalTextEl.textContent = "Completed! - Great Job ⭐";
        modalTextEl.style.color = "#4CAF50";
        
        if (modalStatsEl) {
            modalStatsEl.textContent = `Total moves: ${movesMade}`;
        }
        
        // Show close button for success, hide/ignore auto-reset timers
        if (closeBtn) closeBtn.style.display = 'flex';
        modalEl.classList.add('active');
        if (resetBtn) resetBtn.style.display = 'flex'; // Show reset button on success
        // Handle manual close click
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            
            newCloseBtn.addEventListener('click', () => {
                modalEl.classList.remove('active');
            });
        }
        if (resetBtn) {
            // onclick (not addEventListener) so repeated wins don't stack up listeners
            resetBtn.onclick = () => {
                modalEl.classList.remove('active');
                initLevel(currentLevel);
            };
        }
    } else {
        modalTextEl.textContent = "Try Again - Make Every Row the Same Shape";
        modalTextEl.style.color = "#F44336";
        
        if (modalStatsEl) {
            modalStatsEl.textContent = "";
        }
        
        // Hide close button on failure so it auto-resets smoothly like before
        if (closeBtn) closeBtn.style.display = 'none';
        modalEl.classList.add('active');
        if (resetBtn) resetBtn.style.display = 'none'; // Hide reset button on failure
        setTimeout(() => {
            modalEl.classList.remove('active');
            initLevel(currentLevel);
        }, 1500);
    }
}

// Initialize the game
renderLevelSelector();
initLevel(currentLevel);
