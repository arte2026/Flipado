const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
// Add these DOM references at the top of game.js
const modalEl = document.getElementById('modal');
const modalTextEl = document.getElementById('modal-text');
// Level configurations (0 = white, 1 = black). 
// The array remains 5x5; the script will generate the outer space automatically.
const levels = [
    [
        [1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0],
        [1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0],
        [1, 0, 1, 0, 1]
    ]
];

let currentLevel = 0;
let tiles = [];
let isDrawing = false;
let currentPath = new Set();
let lastTileIndex = -1;

function initLevel(levelIndex) {
    gridEl.innerHTML = '';
    tiles = [];
    const layout = levels[levelIndex];
    
    // We make the grid 7x7 to accommodate the outer margin
    const gridWidth = 7;
    const gridHeight = 7;

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            
            // Check if we are on the outer border (x=0, x=6, y=0, or y=6)
            const isOuter = x === 0 || x === gridWidth - 1 || y === 0 || y === gridHeight - 1;
            
            if (isOuter) {
                tile.classList.add('outer');
            } else {
                // Map the 7x7 coordinates back to the 5x5 layout array
                if (layout[y - 1][x - 1] === 1) {
                    tile.classList.add('black');
                }
            }
            
            // Store coordinates and properties for logic checks
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
    
    // Clear the visual path traces left in the outer space from previous attempts
    document.querySelectorAll('.path-trace').forEach(t => t.classList.remove('path-trace'));
    
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
    
    // CONDITION 1: Flip only once. 
    if (currentPath.has(index)) return;
    
    // CONDITION 2: Continuous path.
    if (currentPath.size > 0) {
        const lastTile = tiles[lastTileIndex];
        const dx = Math.abs(parseInt(tile.dataset.x) - parseInt(lastTile.dataset.x));
        const dy = Math.abs(parseInt(tile.dataset.y) - parseInt(lastTile.dataset.y));
        
        // Block diagonal jumps and disconnected skips
        if (dx + dy !== 1) return;
    }

    // Add to path history
    currentPath.add(index);
    lastTileIndex = index;
    
    // Apply logic depending on whether it's an outer margin tile or playable tile
    if (tile.dataset.isOuter === "true") {
        // Leave a visual dot to indicate the path successfully travelled outside
        tile.classList.add('path-trace');
    } else {
        // Flip the visual state of standard inner tiles
        tile.classList.toggle('black');
        tile.classList.add('flip');
        setTimeout(() => tile.classList.remove('flip'), 80);
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

    // Check inner columns x=1 through x=5
    for (let x = 1; x <= 5; x++) {
        // Capture the color of the top tile in the current column (y=1)
        const firstTileIsBlack = getTileAt(x, 1).classList.contains('black');
        
        // Compare the rest of the tiles in this column (y=2 to y=5) to the top tile
        for (let y = 2; y <= 5; y++) {
            const currentTileIsBlack = getTileAt(x, y).classList.contains('black');
            
            if (currentTileIsBlack !== firstTileIsBlack) {
                isSolved = false; // A mixed column was found
                break;
            }
        }
        
        if (!isSolved) break; // Stop checking further columns if one fails
    }

    // Handle Pop-ups and Reset
    if (isSolved) {
        modalTextEl.textContent = "Completed";
        modalTextEl.style.color = "#4CAF50";
        modalEl.classList.add('active');
    } else {
        modalTextEl.textContent = "Failed";
        modalTextEl.style.color = "#F44336";
        modalEl.classList.add('active');
        
        // Reset the board automatically after a brief delay so the player can try again
        setTimeout(() => {
            modalEl.classList.remove('active');
            initLevel(currentLevel);
        }, 1200);
    }
}
