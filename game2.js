const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
const modalEl = document.getElementById('modal');
const modalTextEl = document.getElementById('modal-text');
const levelSelectorEl = document.getElementById('level-selector');

// Define levels using objects to include blocked coordinates for the 7x7 grid
// (0,0) is top-left outer tile, (6,6) is bottom-right outer tile
const levels = [
    {
        layout: [
            [1, 0, 1, 0, 1],
            [0, 1, 0, 1, 0],
            [1, 0, 1, 0, 1],
            [0, 1, 0, 1, 0],
            [1, 0, 1, 0, 1]
        ],
        // Block top-middle and bottom-left outer tiles as seen in the reference
        blocked: [ {x: 3, y: 0}, {x: 1, y: 6} ] 
    }
    // You can add more levels here following the same structure
];

let currentLevel = 0;
let completedLevels = new Array(levels.length).fill(false);
let tiles = [];
let isDrawing = false;
let currentPath = new Set();
let lastTileIndex = -1;

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
    const gridWidth = 7;
    return tiles[y * gridWidth + x];
}

function initLevel(levelIndex) {
    gridEl.innerHTML = '';
    tiles = [];
    const levelData = levels[levelIndex];
    const layout = levelData.layout;
    const blockedCoords = levelData.blocked || [];
    
    const gridWidth = 7;
    const gridHeight = 7;

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
            const isBlocked = blockedCoords.some(coord => coord.x === x && coord.y === y);
            
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