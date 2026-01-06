// Canvas and Context
const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-block');
const nextCtx = nextCanvas.getContext('2d');

// Game Constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = canvas.width / COLS;
const NEXT_BLOCK_SIZE = 25;

// Colors for tetrominos
const COLORS = [
    null,
    '#00f5ff', // I - Cyan
    '#ffee00', // O - Yellow
    '#9b59b6', // T - Purple
    '#2ecc71', // S - Green
    '#e74c3c', // Z - Red
    '#3498db', // J - Blue
    '#e67e22'  // L - Orange
];

// Tetromino shapes
const SHAPES = [
    null,
    // I
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    // O
    [
        [2, 2],
        [2, 2]
    ],
    // T
    [
        [0, 3, 0],
        [3, 3, 3],
        [0, 0, 0]
    ],
    // S
    [
        [0, 4, 4],
        [4, 4, 0],
        [0, 0, 0]
    ],
    // Z
    [
        [5, 5, 0],
        [0, 5, 5],
        [0, 0, 0]
    ],
    // J
    [
        [6, 0, 0],
        [6, 6, 6],
        [0, 0, 0]
    ],
    // L
    [
        [0, 0, 7],
        [7, 7, 7],
        [0, 0, 0]
    ]
];

// Game State
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let paused = false;
let gameStarted = false;
let dropInterval = 1000;
let lastDropTime = 0;
let animationId = null;

// DOM Elements
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const gameOverOverlay = document.getElementById('game-over-overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Initialize board
function createBoard() {
    board = [];
    for (let row = 0; row < ROWS; row++) {
        board.push(new Array(COLS).fill(0));
    }
}

// Create a new piece
function createPiece(type) {
    const shape = SHAPES[type].map(row => [...row]);
    return {
        shape: shape,
        type: type,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0
    };
}

// Get random piece type
function getRandomPieceType() {
    return Math.floor(Math.random() * 7) + 1;
}

// Spawn new piece
function spawnPiece() {
    if (nextPiece) {
        currentPiece = nextPiece;
        currentPiece.x = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
        currentPiece.y = 0;
    } else {
        currentPiece = createPiece(getRandomPieceType());
    }
    nextPiece = createPiece(getRandomPieceType());
    
    // Check game over
    if (checkCollision(currentPiece)) {
        gameOver = true;
        showGameOver();
    }
    
    drawNextPiece();
}

// Check collision
function checkCollision(piece, offsetX = 0, offsetY = 0) {
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
            if (piece.shape[row][col]) {
                const newX = piece.x + col + offsetX;
                const newY = piece.y + row + offsetY;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Rotate piece
function rotatePiece() {
    const rotated = [];
    const shape = currentPiece.shape;
    const size = shape.length;
    
    for (let col = 0; col < size; col++) {
        rotated.push([]);
        for (let row = size - 1; row >= 0; row--) {
            rotated[col].push(shape[row][col]);
        }
    }
    
    const originalShape = currentPiece.shape;
    currentPiece.shape = rotated;
    
    // Wall kick - try to adjust position if collision
    if (checkCollision(currentPiece)) {
        // Try moving left
        if (!checkCollision(currentPiece, -1, 0)) {
            currentPiece.x -= 1;
        }
        // Try moving right
        else if (!checkCollision(currentPiece, 1, 0)) {
            currentPiece.x += 1;
        }
        // Try moving left twice (for I piece)
        else if (!checkCollision(currentPiece, -2, 0)) {
            currentPiece.x -= 2;
        }
        // Try moving right twice
        else if (!checkCollision(currentPiece, 2, 0)) {
            currentPiece.x += 2;
        }
        // Revert if all fails
        else {
            currentPiece.shape = originalShape;
        }
    }
}

// Move piece
function movePiece(dir) {
    if (!checkCollision(currentPiece, dir, 0)) {
        currentPiece.x += dir;
    }
}

// Drop piece down
function dropPiece() {
    if (!checkCollision(currentPiece, 0, 1)) {
        currentPiece.y++;
        return true;
    }
    return false;
}

// Hard drop
function hardDrop() {
    while (dropPiece()) {
        score += 2;
    }
    lockPiece();
}

// Lock piece to board
function lockPiece() {
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const boardY = currentPiece.y + row;
                const boardX = currentPiece.x + col;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.type;
                }
            }
        }
    }
    
    clearLines();
    spawnPiece();
}

// Clear completed lines
function clearLines() {
    let linesCleared = 0;
    
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== 0)) {
            // Remove the line
            board.splice(row, 1);
            // Add empty line at top
            board.unshift(new Array(COLS).fill(0));
            linesCleared++;
            row++; // Check same row again
        }
    }
    
    if (linesCleared > 0) {
        // Score calculation
        const lineScores = [0, 100, 300, 500, 800];
        score += lineScores[linesCleared] * level;
        lines += linesCleared;
        
        // Level up every 10 lines
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        }
        
        updateUI();
    }
}

// Update UI
function updateUI() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    linesEl.textContent = lines;
}

// Draw block
function drawBlock(ctx, x, y, type, size) {
    const color = COLORS[type];
    
    // Main block
    ctx.fillStyle = color;
    ctx.fillRect(x * size, y * size, size - 1, size - 1);
    
    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * size, y * size, size - 1, 3);
    ctx.fillRect(x * size, y * size, 3, size - 1);
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x * size + size - 4, y * size, 3, size - 1);
    ctx.fillRect(x * size, y * size + size - 4, size - 1, 3);
}

// Draw board
function drawBoard() {
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let row = 0; row <= ROWS; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * BLOCK_SIZE);
        ctx.lineTo(canvas.width, row * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let col = 0; col <= COLS; col++) {
        ctx.beginPath();
        ctx.moveTo(col * BLOCK_SIZE, 0);
        ctx.lineTo(col * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    
    // Draw locked blocks
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                drawBlock(ctx, col, row, board[row][col], BLOCK_SIZE);
            }
        }
    }
    
    // Draw ghost piece
    if (currentPiece) {
        let ghostY = currentPiece.y;
        while (!checkCollision(currentPiece, 0, ghostY - currentPiece.y + 1)) {
            ghostY++;
        }
        
        ctx.globalAlpha = 0.3;
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    drawBlock(ctx, currentPiece.x + col, ghostY + row, currentPiece.type, BLOCK_SIZE);
                }
            }
        }
        ctx.globalAlpha = 1;
    }
    
    // Draw current piece
    if (currentPiece) {
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    drawBlock(ctx, currentPiece.x + col, currentPiece.y + row, currentPiece.type, BLOCK_SIZE);
                }
            }
        }
    }
}

// Draw next piece
function drawNextPiece() {
    nextCtx.fillStyle = '#0a0a0a';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const offsetX = (nextCanvas.width - nextPiece.shape[0].length * NEXT_BLOCK_SIZE) / 2 / NEXT_BLOCK_SIZE;
        const offsetY = (nextCanvas.height - nextPiece.shape.length * NEXT_BLOCK_SIZE) / 2 / NEXT_BLOCK_SIZE;
        
        for (let row = 0; row < nextPiece.shape.length; row++) {
            for (let col = 0; col < nextPiece.shape[row].length; col++) {
                if (nextPiece.shape[row][col]) {
                    const x = offsetX + col;
                    const y = offsetY + row;
                    const color = COLORS[nextPiece.type];
                    
                    nextCtx.fillStyle = color;
                    nextCtx.fillRect(x * NEXT_BLOCK_SIZE, y * NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE - 1, NEXT_BLOCK_SIZE - 1);
                }
            }
        }
    }
}

// Game loop
function gameLoop(timestamp) {
    if (gameOver || paused || !gameStarted) return;
    
    if (timestamp - lastDropTime > dropInterval) {
        if (!dropPiece()) {
            lockPiece();
        }
        lastDropTime = timestamp;
    }
    
    drawBoard();
    animationId = requestAnimationFrame(gameLoop);
}

// Show game over
function showGameOver() {
    finalScoreEl.textContent = score;
    gameOverOverlay.classList.remove('hidden');
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

// Start game
function startGame() {
    createBoard();
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    paused = false;
    gameStarted = true;
    dropInterval = 1000;
    
    nextPiece = null;
    spawnPiece();
    
    updateUI();
    gameOverOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    startBtn.style.display = 'none';
    
    lastDropTime = performance.now();
    animationId = requestAnimationFrame(gameLoop);
}

// Toggle pause
function togglePause() {
    if (gameOver || !gameStarted) return;
    
    paused = !paused;
    
    if (paused) {
        pauseOverlay.classList.remove('hidden');
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    } else {
        pauseOverlay.classList.add('hidden');
        lastDropTime = performance.now();
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (!gameStarted || gameOver) return;
    if (paused && e.key !== 'p' && e.key !== 'P') return;
    
    switch (e.key) {
        case 'ArrowLeft':
            movePiece(-1);
            drawBoard();
            break;
        case 'ArrowRight':
            movePiece(1);
            drawBoard();
            break;
        case 'ArrowDown':
            if (dropPiece()) {
                score += 1;
                updateUI();
            }
            drawBoard();
            break;
        case 'ArrowUp':
            rotatePiece();
            drawBoard();
            break;
        case ' ':
            e.preventDefault();
            hardDrop();
            updateUI();
            drawBoard();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
});

// Mobile controls
document.getElementById('btn-left').addEventListener('click', () => {
    if (!gameStarted || gameOver || paused) return;
    movePiece(-1);
    drawBoard();
});

document.getElementById('btn-right').addEventListener('click', () => {
    if (!gameStarted || gameOver || paused) return;
    movePiece(1);
    drawBoard();
});

document.getElementById('btn-rotate').addEventListener('click', () => {
    if (!gameStarted || gameOver || paused) return;
    rotatePiece();
    drawBoard();
});

document.getElementById('btn-down').addEventListener('click', () => {
    if (!gameStarted || gameOver || paused) return;
    if (dropPiece()) {
        score += 1;
        updateUI();
    }
    drawBoard();
});

document.getElementById('btn-drop').addEventListener('click', () => {
    if (!gameStarted || gameOver || paused) return;
    hardDrop();
    updateUI();
    drawBoard();
});

// Button events
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initial draw
createBoard();
drawBoard();
drawNextPiece();

