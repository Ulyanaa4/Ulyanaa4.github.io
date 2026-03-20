// Pacman Game Logic
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const tileSize = 20;
const rows = 31;
const cols = 28;

// Simple map: 0 = empty, 1 = wall, 2 = pellet
const map = [
    // ...simple map, first and last rows are walls...
    ...Array(cols).fill(1),
    ...Array(rows - 2).fill().map(() => [1, ...Array(cols - 2).fill(2), 1]).flat(),
    ...Array(cols).fill(1)
];

// Add 3 obstacles (walls) in the middle of the map
// Obstacle 1: vertical wall
for (let i = 10; i < 15; i++) {
    map[i * cols + 7] = 1;
}
// Obstacle 2: horizontal wall
for (let j = 18; j < 23; j++) {
    map[20 * cols + j] = 1;
}
// Obstacle 3: block
for (let y = 25; y < 28; y++) {
    for (let x = 18; x < 21; x++) {
        map[y * cols + x] = 1;
    }
}

// Pacman
let pacman = {
    x: 14,
    y: 23,
    dx: 1,
    dy: 0,
    color: 'yellow'
};

// Ghosts
let ghosts = [
    { x: 13 * tileSize, y: 14 * tileSize, dx: 1, dy: 0, color: 'red' },
    { x: 14 * tileSize, y: 14 * tileSize, dx: 1, dy: 0, color: 'pink' },
    { x: 15 * tileSize, y: 14 * tileSize, dx: 1, dy: 0, color: 'cyan' },
    { x: 16 * tileSize, y: 14 * tileSize, dx: 1, dy: 0, color: 'orange' }
];

const MOVE_SPEED = 1; // px per frame for both Pacman and ghosts

function drawMap() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let tile = map[y * cols + x];
            if (tile === 1) {
                ctx.fillStyle = '#2222ff';
                ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            } else if (tile === 2) {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
}

function drawPacman() {
    ctx.fillStyle = pacman.color;
    ctx.beginPath();
    ctx.arc(pacman.x * tileSize + tileSize / 2, pacman.y * tileSize + tileSize / 2, tileSize / 2, 0.25 * Math.PI, 1.75 * Math.PI);
    ctx.lineTo(pacman.x * tileSize + tileSize / 2, pacman.y * tileSize + tileSize / 2);
    ctx.fill();
}

function drawGhosts() {
    ghosts.forEach(ghost => {
        ctx.fillStyle = ghost.color;
        ctx.beginPath();
        ctx.arc(ghost.x + tileSize / 2, ghost.y + tileSize / 2, tileSize / 2, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function movePacman() {
    // Move Pacman by pixels
    let newX = pacman.x + pacman.dx * MOVE_SPEED;
    let newY = pacman.y + pacman.dy * MOVE_SPEED;
    // Calculate tile position
    let tileX = Math.floor(newX);
    let tileY = Math.floor(newY);
    if (map[tileY * cols + tileX] !== 1) {
        pacman.x = newX;
        pacman.y = newY;
        // Eat pellet
        if (map[Math.floor(pacman.y) * cols + Math.floor(pacman.x)] === 2) {
            map[Math.floor(pacman.y) * cols + Math.floor(pacman.x)] = 0;
        }
    }
}

function moveGhosts() {
    ghosts.forEach(ghost => {
        // Move by pixels
        let nextX = ghost.x + ghost.dx * MOVE_SPEED;
        let nextY = ghost.y + ghost.dy * MOVE_SPEED;
        // Calculate tile position
        let tileX = Math.floor(nextX / tileSize);
        let tileY = Math.floor(nextY / tileSize);
        // Check map boundaries
        if (
            tileX >= 0 && tileX < cols &&
            tileY >= 0 && tileY < rows &&
            map[tileY * cols + tileX] !== 1
        ) {
            ghost.x = nextX;
            ghost.y = nextY;
        } else {
            // Change direction randomly if hit wall or margin
            let dirs = [
                { dx: 1, dy: 0 },
                { dx: -1, dy: 0 },
                { dx: 0, dy: 1 },
                { dx: 0, dy: -1 }
            ];
            let dir = dirs[Math.floor(Math.random() * dirs.length)];
            ghost.dx = dir.dx;
            ghost.dy = dir.dy;
        }
    });
}

function checkCollision() {
    ghosts.forEach(ghost => {
        // Check collision by pixel overlap
        let pacmanPxX = pacman.x * tileSize;
        let pacmanPxY = pacman.y * tileSize;
        if (
            Math.abs(ghost.x - pacmanPxX) < tileSize &&
            Math.abs(ghost.y - pacmanPxY) < tileSize
        ) {
            alert('Game Over!');
            window.location.reload();
        }
    });
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    movePacman();
    moveGhosts();
    drawPacman();
    drawGhosts();
    checkCollision();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') { pacman.dx = 0; pacman.dy = -1; }
    else if (e.key === 'ArrowDown') { pacman.dx = 0; pacman.dy = 1; }
    else if (e.key === 'ArrowLeft') { pacman.dx = -1; pacman.dy = 0; }
    else if (e.key === 'ArrowRight') { pacman.dx = 1; pacman.dy = 0; }
});

gameLoop();
