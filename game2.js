const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
// Add these DOM references at the top of game.js
const modalEl = document.getElementById('modal');
const modalTextEl = document.getElementById('modal-text');
const levelSelectorEl = document.getElementById('level-selector');
// Level configurations (0 = white, 1 = black). 
// Any rectangular size works (every row must have the same length).
// The script generates the free outer ring automatically.


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
    const layout =  levels[levelIndex].layout;  
	const blockedCoords =  levels[levelIndex].blocked || [];
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
                if (layout[y - 1][x - 1] === 1) {
                    tile.classList.add('flipped');
                }
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

    for (let x = 1; x <= boardCols; x++) {
        const firstTileIsBlack = getTileAt(x, 1).classList.contains('flipped');
        
        for (let y = 2; y <= boardRows; y++) {
            const currentTileIsBlack = getTileAt(x, y).classList.contains('flipped');
            
            if (currentTileIsBlack !== firstTileIsBlack) {
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

        modalTextEl.textContent = "⭐ Completed";
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
resetBtn.addEventListener('click', () => {
            modalEl.classList.remove('active');
            initLevel(currentLevel);
        })
    } else {
        modalTextEl.textContent = "Failed";
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
        }, 1400);
    }
}

// Initialize the game
renderLevelSelector();
initLevel(currentLevel);