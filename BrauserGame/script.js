// constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 20;
const PLAYER_SPEED = 200; // pixels per second

const ENEMY_RADIUS = 10;

// difficulty presets
const DIFFICULTIES = {
    Easy: {
        enemySpeed: 80,
        enemySpeedIncrement: 3,
        spawnInterval: 4,
        spawnDecrement: 0.05
    },
    Medium: {
        enemySpeed: 100,
        enemySpeedIncrement: 5,
        spawnInterval: 3,
        spawnDecrement: 0.1
    },
    Hard: {
        enemySpeed: 120,
        enemySpeedIncrement: 7,
        spawnInterval: 2.5,
        spawnDecrement: 0.15
    }
};

const SPAWN_INTERVAL_MIN = 0.5; // cap (shared)

// screen shake
const SHAKE_DURATION = 0.2; // seconds
const SHAKE_MAGNITUDE = 5; // pixels

// particles for explosions
const PARTICLE_COUNT = 30;
const PARTICLE_SPEED = 100; // pixels per second
const PARTICLE_LIFE = 1; // seconds

// background dots
const BG_DOT_COUNT = 100;
const BG_DOT_SPEED_MIN = 20;
const BG_DOT_SPEED_MAX = 60;

// state
const state = {
    ctx: null,
    keysPressed: {},
    player: {
        x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2,
        y: CANVAS_HEIGHT / 2 - PLAYER_SIZE / 2,
        size: PLAYER_SIZE,
        color: 'green'
    },
    enemies: [],
    gameOver: false,
    time: 0, // seconds survived
    spawnTimer: 0, // seconds since last enemy
    score: 0,
    currentEnemySpeed: 0,
    currentSpawnInterval: 0,
    baseEnemySpeed: 0,
    baseSpawnInterval: 0,
    enemySpeedIncrement: 0,
    spawnDecrement: 0,
    mode: 'MENU', // or 'PLAY'
    highScore: 0,
    shakeTimer: 0,
    particles: [],
    bgDots: []
};

// helpers for high score
function loadHighScore() {
    const stored = localStorage.getItem('canvas_apocalypse_highscore');
    return stored ? parseInt(stored, 10) : 0;
}

function saveHighScore(value) {
    localStorage.setItem('canvas_apocalypse_highscore', value);
}

// setup
function init() {
    const canvas = document.getElementById('gameCanvas');
    state.ctx = canvas.getContext('2d');
    state.highScore = loadHighScore();
    initBackground();

    // input listeners
    window.addEventListener('keydown', e => {
        if (state.mode === 'MENU') {
            if (e.key === '1') startGame('Easy');
            if (e.key === '2') startGame('Medium');
            if (e.key === '3') startGame('Hard');
            return;
        }

        state.keysPressed[e.key] = true;
        // restart if game over
        if (state.gameOver && (e.key === 'r' || e.key === 'R')) {
            resetGame();
        }
    });
    window.addEventListener('keyup', e => {
        state.keysPressed[e.key] = false;
    });


    requestAnimationFrame(gameLoop);
}

// helper: spawn enemy at random edge
function spawnEnemy() {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    switch (edge) {
        case 0: // top
            x = Math.random() * CANVAS_WIDTH;
            y = -ENEMY_RADIUS;
            break;
        case 1: // right
            x = CANVAS_WIDTH + ENEMY_RADIUS;
            y = Math.random() * CANVAS_HEIGHT;
            break;
        case 2: // bottom
            x = Math.random() * CANVAS_WIDTH;
            y = CANVAS_HEIGHT + ENEMY_RADIUS;
            break;
        case 3: // left
            x = -ENEMY_RADIUS;
            y = Math.random() * CANVAS_HEIGHT;
            break;
    }
    state.enemies.push({ x, y, radius: ENEMY_RADIUS, color: 'red' });
}

// update state
function update(delta) {
    // convert to seconds for consistent speed
    const dt = delta / 1000;
    const p = state.player;
    let vx = 0,
        vy = 0;

    if (state.keysPressed['ArrowLeft'] || state.keysPressed['a'] || state.keysPressed['A']) {
        vx = -PLAYER_SPEED;
    }
    if (state.keysPressed['ArrowRight'] || state.keysPressed['d'] || state.keysPressed['D']) {
        vx = PLAYER_SPEED;
    }
    if (state.keysPressed['ArrowUp'] || state.keysPressed['w'] || state.keysPressed['W']) {
        vy = -PLAYER_SPEED;
    }
    if (state.keysPressed['ArrowDown'] || state.keysPressed['s'] || state.keysPressed['S']) {
        vy = PLAYER_SPEED;
    }

    p.x += vx * dt;
    p.y += vy * dt;

    // clamp to canvas bounds
    p.x = Math.max(0, Math.min(p.x, CANVAS_WIDTH - p.size));
    p.y = Math.max(0, Math.min(p.y, CANVAS_HEIGHT - p.size));

    // update timer and score
    state.time += dt;
    state.score += dt; // score increases by seconds survived

    // difficulty adjustments (using state variables set by difficulty)
    state.currentEnemySpeed += state.enemySpeedIncrement * dt;
    state.currentSpawnInterval = Math.max(
        SPAWN_INTERVAL_MIN,
        state.currentSpawnInterval - state.spawnDecrement * dt
    );

    // spawn new enemies periodically
    state.spawnTimer += dt;
    if (state.spawnTimer >= state.currentSpawnInterval) {
        spawnEnemy();
        state.spawnTimer -= state.currentSpawnInterval;
    }

    // move enemies toward player center
    const px = p.x + p.size / 2;
    const py = p.y + p.size / 2;
    state.enemies.forEach(e => {
        const dx = px - e.x;
        const dy = py - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;
        e.x += nx * state.currentEnemySpeed * dt;
        e.y += ny * state.currentEnemySpeed * dt;

        // collision check: rectangle-circle
        if (rectCircleColliding(e, p)) {
            // explosion and shake
            spawnExplosion(px, py);
            state.shakeTimer = SHAKE_DURATION;
            state.gameOver = true;
            // update high score if beaten
            if (Math.floor(state.score) > state.highScore) {
                state.highScore = Math.floor(state.score);
                saveHighScore(state.highScore);
            }
        }
    });

    // update particles
    updateParticles(dt);
    // update background dots
    updateBackground(dt);
    // update shake timer
    if (state.shakeTimer > 0) {
        state.shakeTimer -= dt;
        if (state.shakeTimer < 0) state.shakeTimer = 0;
    }
}

// utility: check circle-rect collision
// circle: {x,y,radius}, rect: {x,y,size}
function rectCircleColliding(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.size));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.size));
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    return dx * dx + dy * dy < circle.radius * circle.radius;
}

// particles update
function updateParticles(dt) {
    state.particles = state.particles.filter(p => {
        p.life -= dt;
        if (p.life <= 0) return false;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        return true;
    });
}

// spawn explosion at point
function spawnExplosion(x, y) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * PARTICLE_SPEED;
        state.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: PARTICLE_LIFE
        });
    }
}

// background dot helpers
function initBackground() {
    state.bgDots = [];
    for (let i = 0; i < BG_DOT_COUNT; i++) {
        state.bgDots.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            vy: BG_DOT_SPEED_MIN + Math.random() * (BG_DOT_SPEED_MAX - BG_DOT_SPEED_MIN)
        });
    }
}
function updateBackground(dt) {
    state.bgDots.forEach(d => {
        d.y += d.vy * dt;
        if (d.y > CANVAS_HEIGHT) d.y = 0;
    });
}

function drawBackground(ctx) {
    ctx.fillStyle = '#333';
    state.bgDots.forEach(d => {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawParticles(ctx) {
    ctx.fillStyle = 'orange';
    state.particles.forEach(p => {
        const alpha = p.life / PARTICLE_LIFE;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;
}

// draw everything
function draw() {
    const ctx = state.ctx;
    // clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // menu screen
    if (state.mode === 'MENU') {
        drawBackground(ctx);
        ctx.fillStyle = 'white';
        ctx.font = '36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Select Difficulty', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
        ctx.font = '24px sans-serif';
        ctx.fillText('1 - Easy', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
        ctx.fillText('2 - Medium', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.fillText('3 - Hard', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        // show high score
        ctx.font = '20px sans-serif';
        ctx.fillText(`High score: ${state.highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 90);
        return;
    }

    // screen shake offsets
    let offsetX = 0, offsetY = 0;
    if (state.shakeTimer > 0) {
        offsetX = (Math.random() * 2 - 1) * SHAKE_MAGNITUDE;
        offsetY = (Math.random() * 2 - 1) * SHAKE_MAGNITUDE;
    }

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // draw background
    drawBackground(ctx);

    // draw player
    ctx.fillStyle = state.player.color;
    ctx.fillRect(
        state.player.x,
        state.player.y,
        state.player.size,
        state.player.size
    );

    // draw enemies
    state.enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // draw particles
    drawParticles(ctx);

    // draw timer (top-left)
    ctx.fillStyle = 'white';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Time: ${state.time.toFixed(1)}s`, 10, 24);
    ctx.fillText(`Score: ${Math.floor(state.score)}`, 10, 48);

    // if game over, overlay text
    if (state.gameOver) {
        ctx.fillStyle = 'white';
        ctx.font = '48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
        ctx.font = '24px sans-serif';
        ctx.fillText('Press R to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
        ctx.font = '20px sans-serif';
        ctx.fillText(`High score: ${state.highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    }

    ctx.restore();
}

// reset game state to initial values (keeps difficulty parameters)
function resetGame() {
    state.particles = [];
    state.shakeTimer = 0;
    // maybe also reset background? optionally

    state.gameOver = false;
    state.player.x = CANVAS_WIDTH / 2 - PLAYER_SIZE / 2;
    state.player.y = CANVAS_HEIGHT / 2 - PLAYER_SIZE / 2;
    state.enemies = [];
    state.keysPressed = {};
    state.time = 0;
    state.score = 0;
    state.currentEnemySpeed = state.baseEnemySpeed;
    state.currentSpawnInterval = state.baseSpawnInterval;
    state.spawnTimer = 0;
    spawnEnemy();
}

// start the game with a chosen difficulty
function startGame(level) {
    const s = DIFFICULTIES[level];
    state.mode = 'PLAY';
    state.baseEnemySpeed = s.enemySpeed;
    state.enemySpeedIncrement = s.enemySpeedIncrement;
    state.baseSpawnInterval = s.spawnInterval;
    state.spawnDecrement = s.spawnDecrement;
    resetGame();
}

// game loop
let lastTime = 0;
function gameLoop(timestamp) {
    const delta = timestamp - lastTime;
    lastTime = timestamp;

    if (state.mode === 'PLAY' && !state.gameOver) update(delta);
    draw();

    requestAnimationFrame(gameLoop);
}

window.onload = init;