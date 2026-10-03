const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
// Add these DOM references at the top of game.js
const modalEl = document.getElementById('modal');
const modalTextEl = document.getElementById('modal-text');
const levelSelectorEl = document.getElementById('level-selector');
// Level configurations (0 = white, 1 = black). 
// The array remains 5x5; the script will generate the outer space automatically.
// Define 5 different puzzles
const levels = [
     // Level 1: Asymmetric challenge
    [
         [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 0],
        [1, 1, 1, 1, 1]
    ],
     // Level 2: Asymmetric challenge
    [
        [0, 0, 1, 0, 0],
        [1, 1, 0, 1, 1],
        [1, 1, 0, 1, 1],
        [1, 1, 0, 1, 1],
        [0, 0, 1, 0, 0]
    ],
     // Level 3: Asymmetric challenge
    [
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0]
    ],
     // Level 4: Asymmetric challenge
    [
        [0, 1, 0, 1, 1],
        [0, 1, 0, 1, 1],
        [0, 0, 1, 0, 0],
        [1, 1, 0, 1, 1],
        [1, 1, 0, 1, 1]
    ],
     // Level 5: Asymmetric challenge
    [
        [1, 0, 1, 0, 1],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [1, 0, 1, 0, 1]
    ],
     // Level 6: Asymmetric challenge
    [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0]
    ],
     // Level 7: Asymmetric challenge
    [
       [1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0],
        [1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0],
        [1, 0, 1, 0, 1]
    ],
     // Level 8: Asymmetric challenge
    [
        [0, 0, 0, 0, 0],
        [1, 1, 0, 1, 1],
        [0, 0, 0, 0, 0],
        [1, 1, 0, 1, 1],
        [0, 0, 0, 0, 0]
    ],
     // Level 9: Asymmetric challenge
    [
        [1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0],
        [1, 0, 0, 0, 1],
        [0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1]
    ],
     // Level 10: Asymmetric challenge
    [
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0]
    ],
     // Level 11: Asymmetric challenge
    [
        [1, 1, 0, 0, 0],
        [1, 0, 0, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 0, 1]
    ],
     // Level 12: Asymmetric challenge
    [
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0]
    ],
     // Level 13: Asymmetric challenge
    [
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0]
    ],
     // Level 14: Asymmetric challenge
    [
       [0, 0, 0, 0, 1],
        [0, 0, 1, 0, 0],
        [1, 1, 0, 1, 1],
        [0, 0, 1, 0, 0],
        [1, 0, 0, 0, 0]
    ],
    // Level 15: Standard checkerboard-ish
    [
        [1, 0, 1, 0, 1],
        [0, 0, 0, 0, 0],
        [1, 0, 1, 0, 1],
        [0, 0, 0, 0, 0],
        [1, 0, 1, 0, 1]
    ],
    // Level 16: Horizontal stripes
    [
       [0, 0, 0, 1, 0],
        [0, 1, 0, 0, 1],
        [0, 0, 1, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 1, 0, 1]
    ],
    // Level 17: Hollow square
    [
       [0, 1, 0, 0, 0],
        [1, 0, 1, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 1, 0, 1],
        [0, 0, 0, 1, 0]
    ],
    // Level 18: Diagonal cross
    [
        [1, 0, 0, 0, 1],
        [0, 1, 0, 1, 0],
        [0, 0, 1, 0, 0],
        [0, 1, 0, 1, 0],
        [1, 0, 0, 0, 1]
    ],
    // Level 19: Asymmetric challenge
    [
       [1, 0, 0, 0, 1],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [1, 0, 0, 0, 1]
    ],
    // Level 20: Asymmetric challenge
    [
       [0, 0, 1, 0, 0],
        [0, 1, 0, 1, 0],
        [1, 0, 0, 0, 1],
        [0, 1, 0, 1, 0],
        [0, 0, 1, 0, 0]
    ],
     // Level 21: Asymmetric challenge
    [
        [1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0],
        [1, 0, 0, 0, 1],
        [0, 1, 0, 1, 0],
        [1, 0, 1, 0, 1]
    ],
];

let currentLevel = 0;
// Track which levels have been solved
let completedLevels = new Array(levels.length).fill(false);
let tiles = [];
let isDrawing = false;
let currentPath = new Set();
let lastTileIndex = -1;

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
    const layout = levels[levelIndex];
    
    const gridWidth = 7;
    const gridHeight = 7;

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
            
            if (isOuter) {
                tile.classList.add('outer');
            } else {
                if (layout[y - 1][x - 1] === 1) {
                    // Apply 'flipped' instead of 'black' to start the tile on the dark face
                    tile.classList.add('flipped');
                }
            }
            
            tile.dataset.index = y * gridWidth + x;
            tile.dataset.x = x;
            tile.dataset.y = y;
            tile.dataset.isOuter = isOuter; 

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

// Initialize
initLevel(currentLevel);

// Helper function to locate a specific tile in the 1D array using 2D coordinates
function getTileAt(x, y) {
    const gridWidth = 7;
    return tiles[y * gridWidth + x];
}

function checkWinCondition() {
    let isSolved = true;

    for (let x = 1; x <= 5; x++) {
        const firstTileIsBlack = getTileAt(x, 1).classList.contains('flipped');
        
        for (let y = 2; y <= 5; y++) {
            const currentTileIsBlack = getTileAt(x, y).classList.contains('flipped');
            
            if (currentTileIsBlack !== firstTileIsBlack) {
                isSolved = false; 
                break;
            }
        }
        
        if (!isSolved) break; 
    }

    if (isSolved) {
        // Mark current level as completed and update UI
        completedLevels[currentLevel] = true;
        renderLevelSelector();

        modalTextEl.textContent = "Completed";
        modalTextEl.style.color = "#4CAF50";
        modalEl.classList.add('active');
        
        // Auto-close modal after success
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

// Initialize the game
renderLevelSelector();
initLevel(currentLevel);
