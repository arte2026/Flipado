const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
const modalEl = document.getElementById('modal');
const modalTextEl = document.getElementById('modal-text');
const levelSelectorEl = document.getElementById('level-selector');

// Each level has a `layout` (the playable board: 1 = black, 0 = white) and an optional
// list of `blocked` outer tiles. Any rectangular layout works: every row must have the
// same length, and the grid adds a 1-tile outer ring around it automatically.
// `blocked` uses grid coordinates INCLUDING the ring: (0,0) is the top-left outer tile
// and (layout width + 1, layout height + 1) is the bottom-right outer tile.
// For a 5x5 layout that is (6,6); for a 4-wide, 6-tall layout it is (5,7).
const levels = [
    {
        layout: [
            [1, 0, 1, 0, 1],
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1]
        ],
        // Block top-middle and bottom-left outer tiles as seen in the reference
        blocked: [ {x: 3, y: 0}, {x: 3, y: 6} ] 
    },
    {
        layout: [
            [0, 0, 1, 0, 0],
        [1, 1, 0, 1, 1],
        [1, 1, 0, 1, 1],
        [1, 1, 0, 1, 1],
        [0, 0, 1, 0, 0]
        ],
        // Block top-middle and bottom-left outer tiles as seen in the reference
        blocked: [ {x: 3, y: 0}, {x: 3, y: 6} ] 
    },
    // Level 3: tall 4x6 board (a 6x8 grid with the ring). Shows non-square boards work; delete if unwanted.
    {
        layout: [
            [0, 1, 0, 1],
            [0, 1, 0, 1],
            [0, 1, 0, 1],
            [1, 0, 0, 1],
            [1, 1, 0, 0],
            [0, 1, 1, 0]
        ],
        // Here x runs 0-5 and y runs 0-7
        blocked: [ {x: 3, y: 0}, {x: 2, y: 7} ]
    }
    // You can add more levels here following the same structure
];

let currentLevel = 0;
let completedLevels = new Array(levels.length).fill(false);
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

function renderLevelSelector() {
    levelSelectorEl.innerHTML = ''; 
    
    levels.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.classList.add('level-btn');
        btn.textContent = index + 1;
        
        if (index === currentLevel) btn.classList.add('active');
        if (completedLevels[index]) btn.classList.add('completed');
        
        btn.addEventListener('click', () => {
            currentLevel = index;
            renderLevelSelector();
            initLevel(currentLevel);
        });
        
        levelSelectorEl.appendChild(btn);
    });
}

// Helper function to locate a specific tile in the 1D array using 2D coordinates
function getTileAt(x, y) {
    return tiles[y * gridWidth + x];
}

function initLevel(levelIndex) {
    gridEl.innerHTML = '';
    tiles = [];
    const levelData = levels[levelIndex];
    const layout = levelData.layout;
    const blockedCoords = levelData.blocked || [];

    // Derive every size from the layout itself, so any board shape works
    boardRows = layout.length;
    boardCols = layout[0].length;
    gridWidth = boardCols + 2;   // +2 for the free outer ring
    gridHeight = boardRows + 2;

    // Catch typos in level data (messages appear in the browser console)
    if (!layout.every(row => row.length === boardCols)) {
        console.error(`Level ${levelIndex + 1}: every layout row must have ${boardCols} values.`);
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
            const tile = document.createElement('div');
            tile.classList.add('tile');
            
            const tileInner = document.createElement('div');
            tileInner.classList.add('tile-inner');
            
            const tileFront = document.createElement('div');
            tileFront.classList.add('tile-face', 'tile-front');
            
            const tileBack = document.createElement('div');
            tileBack.classList.add('tile-face', 'tile-back');
            
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
    
    document.querySelectorAll('.path-trace').forEach(t => t.classList.remove('path-trace'));
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
        tile.classList.add('highlight');
    }
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

    if (isSolved) {
        completedLevels[currentLevel] = true;
        renderLevelSelector();

        modalTextEl.textContent = "Completed";
        modalTextEl.style.color = "#4CAF50";
        modalEl.classList.add('active');
        
        setTimeout(() => {
            modalEl.classList.remove('active');
        }, 1200);

    } else {
        modalTextEl.textContent = "Failed";
        modalTextEl.style.color = "#F44336";
        modalEl.classList.add('active');
        
        setTimeout(() => {
            modalEl.classList.remove('active');
            initLevel(currentLevel);
        }, 1200);
    }
}

window.addEventListener('pointerup', () => {
    if (isDrawing) {
        isDrawing = false;
        if (currentPath.size > 0) {
            checkWinCondition();
        }
    }
});

renderLevelSelector();
initLevel(currentLevel);