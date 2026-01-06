// 게임 캔버스 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameArea = document.getElementById('gameArea');

// UI 요소
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const ringsDisplay = document.getElementById('rings');
const distanceDisplay = document.getElementById('distance');
const scoreDisplay = document.getElementById('score');
const finalDistance = document.getElementById('finalDistance');
const finalRings = document.getElementById('finalRings');
const finalScore = document.getElementById('finalScore');

// 게임 상수
const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const HIGH_JUMP_FORCE = -20;
const GROUND_Y_RATIO = 0.75; // 땅 위치 (캔버스 높이의 75%)
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const SLIDE_HEIGHT = 25;

// 게임 상태
let gameState = {
    isRunning: false,
    isPaused: false,
    speed: 6,
    maxSpeed: 15,
    speedIncrement: 0.002,
    distance: 0,
    rings: 0,
    score: 0
};

// 플레이어 상태
let player = {
    x: 80,
    y: 0,
    vy: 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    color: '#3498db',
    frame: 0,
    frameTimer: 0
};

// 장애물 배열
let obstacles = [];
let rings = [];
let particles = [];

// 터치 관련 변수
let touchStartY = 0;
let touchStartTime = 0;
let isTouching = false;

// 캔버스 크기 설정
function resizeCanvas() {
    canvas.width = gameArea.offsetWidth;
    canvas.height = gameArea.offsetHeight;
    player.y = canvas.height * GROUND_Y_RATIO - player.height;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 장애물 생성
function createObstacle() {
    const types = ['spike', 'box', 'bird'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let obstacle = {
        x: canvas.width + 50,
        type: type,
        passed: false
    };
    
    switch(type) {
        case 'spike':
            obstacle.width = 30;
            obstacle.height = 40;
            obstacle.y = canvas.height * GROUND_Y_RATIO - obstacle.height;
            obstacle.color = '#e74c3c';
            break;
        case 'box':
            obstacle.width = 50;
            obstacle.height = 50;
            obstacle.y = canvas.height * GROUND_Y_RATIO - obstacle.height;
            obstacle.color = '#8B4513';
            break;
        case 'bird':
            obstacle.width = 40;
            obstacle.height = 30;
            obstacle.y = canvas.height * GROUND_Y_RATIO - 100 - Math.random() * 50;
            obstacle.color = '#9b59b6';
            obstacle.amplitude = 20;
            obstacle.frequency = 0.05;
            obstacle.initialY = obstacle.y;
            break;
    }
    
    obstacles.push(obstacle);
}

// 링 생성
function createRing() {
    const ring = {
        x: canvas.width + 50,
        y: canvas.height * GROUND_Y_RATIO - 60 - Math.random() * 80,
        radius: 15,
        collected: false,
        rotation: 0
    };
    rings.push(ring);
}

// 파티클 생성
function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30,
            color: color,
            size: 3 + Math.random() * 4
        });
    }
}

// 점프
function jump(highJump = false) {
    if (!player.isJumping && !player.isSliding) {
        player.vy = highJump ? HIGH_JUMP_FORCE : JUMP_FORCE;
        player.isJumping = true;
        createParticles(player.x, player.y + player.height, '#7CB342', 5);
    }
}

// 슬라이드
function slide() {
    if (!player.isJumping && !player.isSliding) {
        player.isSliding = true;
        player.slideTimer = 30; // 30프레임 동안 슬라이드
        player.height = SLIDE_HEIGHT;
        player.y = canvas.height * GROUND_Y_RATIO - SLIDE_HEIGHT;
    }
}

// 터치 이벤트
gameArea.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameState.isRunning) return;
    
    const touch = e.touches[0];
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    isTouching = true;
}, { passive: false });

gameArea.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!gameState.isRunning || !isTouching) return;
    
    const touchEndY = e.changedTouches[0].clientY;
    const touchDuration = Date.now() - touchStartTime;
    const swipeDistance = touchEndY - touchStartY;
    
    // 아래로 스와이프 → 슬라이드
    if (swipeDistance > 50) {
        slide();
    }
    // 길게 누르기 → 높이 점프
    else if (touchDuration > 200) {
        jump(true);
    }
    // 짧게 탭 → 일반 점프
    else {
        jump(false);
    }
    
    isTouching = false;
}, { passive: false });

gameArea.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// PC 키보드 지원 (테스트용)
document.addEventListener('keydown', (e) => {
    if (!gameState.isRunning) return;
    
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump(e.shiftKey);
    } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        slide();
    }
});

// 충돌 감지
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 플레이어 업데이트
function updatePlayer() {
    // 중력 적용
    player.vy += GRAVITY;
    player.y += player.vy;
    
    // 땅 충돌
    const groundY = canvas.height * GROUND_Y_RATIO - player.height;
    if (player.y >= groundY) {
        player.y = groundY;
        player.vy = 0;
        player.isJumping = false;
    }
    
    // 슬라이드 타이머
    if (player.isSliding) {
        player.slideTimer--;
        if (player.slideTimer <= 0) {
            player.isSliding = false;
            player.height = PLAYER_HEIGHT;
            player.y = canvas.height * GROUND_Y_RATIO - PLAYER_HEIGHT;
        }
    }
    
    // 달리기 애니메이션
    player.frameTimer++;
    if (player.frameTimer > 5) {
        player.frame = (player.frame + 1) % 4;
        player.frameTimer = 0;
    }
}

// 장애물 업데이트
function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= gameState.speed;
        
        // 새 타입 움직임
        if (obs.type === 'bird') {
            obs.y = obs.initialY + Math.sin(obs.x * obs.frequency) * obs.amplitude;
        }
        
        // 충돌 체크
        const playerRect = {
            x: player.x + 10,
            y: player.y + 5,
            width: player.width - 20,
            height: player.height - 10
        };
        
        if (checkCollision(playerRect, obs)) {
            gameOver();
            return;
        }
        
        // 화면 밖으로 나가면 제거
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

// 링 업데이트
function updateRings() {
    for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.x -= gameState.speed;
        ring.rotation += 0.1;
        
        // 수집 체크
        const dx = (player.x + player.width / 2) - ring.x;
        const dy = (player.y + player.height / 2) - ring.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < ring.radius + 20) {
            rings.splice(i, 1);
            gameState.rings++;
            gameState.score += 10;
            createParticles(ring.x, ring.y, '#FFD700', 8);
            updateUI();
            continue;
        }
        
        // 화면 밖으로 나가면 제거
        if (ring.x + ring.radius < 0) {
            rings.splice(i, 1);
        }
    }
}

// 파티클 업데이트
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.life--;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// 배경 그리기
let bgOffset = 0;
function drawBackground() {
    // 하늘 그라데이션
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);
    
    // 구름
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 5; i++) {
        const cloudX = ((i * 200 - bgOffset * 0.3) % (canvas.width + 200)) - 100;
        const cloudY = 30 + i * 25;
        ctx.beginPath();
        ctx.arc(cloudX, cloudY, 25, 0, Math.PI * 2);
        ctx.arc(cloudX + 30, cloudY, 30, 0, Math.PI * 2);
        ctx.arc(cloudX + 60, cloudY, 25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 언덕 (뒷배경)
    ctx.fillStyle = '#8BC34A';
    for (let i = 0; i < 3; i++) {
        const hillX = ((i * 300 - bgOffset * 0.5) % (canvas.width + 300)) - 150;
        ctx.beginPath();
        ctx.arc(hillX + 150, canvas.height * 0.75, 150, Math.PI, 0);
        ctx.fill();
    }
    
    // 땅
    const groundGradient = ctx.createLinearGradient(0, canvas.height * 0.75, 0, canvas.height);
    groundGradient.addColorStop(0, '#7CB342');
    groundGradient.addColorStop(0.5, '#689F38');
    groundGradient.addColorStop(1, '#558B2F');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, canvas.height * GROUND_Y_RATIO, canvas.width, canvas.height * 0.25);
    
    // 땅 라인
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * GROUND_Y_RATIO);
    ctx.lineTo(canvas.width, canvas.height * GROUND_Y_RATIO);
    ctx.stroke();
    
    bgOffset += gameState.speed;
}

// 플레이어 그리기
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    
    // 점프 중이면 회전
    if (player.isJumping) {
        ctx.rotate(player.frame * 0.5);
    }
    
    // 소닉 스타일 캐릭터
    const w = player.width;
    const h = player.height;
    
    // 몸체 (파란색)
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.4, h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 배 (밝은색)
    ctx.fillStyle = '#f5deb3';
    ctx.beginPath();
    ctx.ellipse(5, 5, w * 0.2, h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 가시 (등 뒤)
    ctx.fillStyle = '#2980b9';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-w * 0.3 - i * 8, -h * 0.1 + i * 5);
        ctx.lineTo(-w * 0.5 - i * 10, -h * 0.2 + i * 3);
        ctx.lineTo(-w * 0.3 - i * 8, h * 0.1 + i * 5);
        ctx.closePath();
        ctx.fill();
    }
    
    // 눈
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(w * 0.15, -h * 0.15, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(w * 0.18, -h * 0.12, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // 슬라이드 중이면 효과
    if (player.isSliding) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(-20, 0, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
    
    // 달리기 먼지 효과
    if (!player.isJumping && !player.isSliding && gameState.isRunning) {
        if (Math.random() < 0.3) {
            createParticles(player.x, player.y + player.height, '#a0a0a0', 1);
        }
    }
}

// 장애물 그리기
function drawObstacles() {
    for (let obs of obstacles) {
        ctx.save();
        
        if (obs.type === 'spike') {
            // 가시
            ctx.fillStyle = obs.color;
            ctx.beginPath();
            ctx.moveTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
            ctx.lineTo(obs.x, obs.y + obs.height);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (obs.type === 'box') {
            // 박스
            ctx.fillStyle = obs.color;
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 3;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
            
            // X 표시
            ctx.strokeStyle = '#3E2723';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(obs.x + 10, obs.y + 10);
            ctx.lineTo(obs.x + obs.width - 10, obs.y + obs.height - 10);
            ctx.moveTo(obs.x + obs.width - 10, obs.y + 10);
            ctx.lineTo(obs.x + 10, obs.y + obs.height - 10);
            ctx.stroke();
        } else if (obs.type === 'bird') {
            // 새
            ctx.fillStyle = obs.color;
            ctx.beginPath();
            ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 날개
            ctx.fillStyle = '#8e44ad';
            const wingOffset = Math.sin(Date.now() * 0.02) * 10;
            ctx.beginPath();
            ctx.ellipse(obs.x + obs.width / 2, obs.y + wingOffset, 25, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 눈
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(obs.x + obs.width - 10, obs.y + obs.height / 2 - 3, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(obs.x + obs.width - 8, obs.y + obs.height / 2 - 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// 링 그리기
function drawRings() {
    for (let ring of rings) {
        ctx.save();
        ctx.translate(ring.x, ring.y);
        ctx.rotate(ring.rotation);
        
        // 링 외곽
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 링 내부 빛
        ctx.strokeStyle = '#FFF8DC';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, ring.radius - 4, 0, Math.PI * 2);
        ctx.stroke();
        
        // 반짝임
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-5, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// 파티클 그리기
function drawParticles() {
    for (let p of particles) {
        const alpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// UI 업데이트
function updateUI() {
    ringsDisplay.textContent = gameState.rings;
    distanceDisplay.textContent = Math.floor(gameState.distance);
    scoreDisplay.textContent = gameState.score;
}

// 게임 오버
function gameOver() {
    gameState.isRunning = false;
    
    finalDistance.textContent = Math.floor(gameState.distance);
    finalRings.textContent = gameState.rings;
    finalScore.textContent = gameState.score;
    
    gameOverOverlay.classList.remove('hidden');
}

// 게임 리셋
function resetGame() {
    gameState = {
        isRunning: false,
        isPaused: false,
        speed: 6,
        maxSpeed: 15,
        speedIncrement: 0.002,
        distance: 0,
        rings: 0,
        score: 0
    };
    
    player = {
        x: 80,
        y: canvas.height * GROUND_Y_RATIO - PLAYER_HEIGHT,
        vy: 0,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        isJumping: false,
        isSliding: false,
        slideTimer: 0,
        color: '#3498db',
        frame: 0,
        frameTimer: 0
    };
    
    obstacles = [];
    rings = [];
    particles = [];
    bgOffset = 0;
    
    updateUI();
}

// 스폰 타이머
let obstacleTimer = 0;
let ringTimer = 0;

// 게임 루프
function gameLoop() {
    if (!gameState.isRunning) return;
    
    // 화면 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 배경 그리기
    drawBackground();
    
    // 업데이트
    updatePlayer();
    updateObstacles();
    updateRings();
    updateParticles();
    
    // 거리 및 속도 증가
    gameState.distance += gameState.speed * 0.1;
    gameState.score = Math.floor(gameState.distance) + gameState.rings * 10;
    
    if (gameState.speed < gameState.maxSpeed) {
        gameState.speed += gameState.speedIncrement;
    }
    
    // 장애물 스폰
    obstacleTimer++;
    if (obstacleTimer > 80 + Math.random() * 60) {
        createObstacle();
        obstacleTimer = 0;
    }
    
    // 링 스폰
    ringTimer++;
    if (ringTimer > 40 + Math.random() * 40) {
        createRing();
        ringTimer = 0;
    }
    
    // 그리기
    drawRings();
    drawObstacles();
    drawPlayer();
    drawParticles();
    
    // UI 업데이트
    updateUI();
    
    requestAnimationFrame(gameLoop);
}

// 게임 시작
function startGame() {
    resetGame();
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    gameState.isRunning = true;
    gameLoop();
}

// 이벤트 리스너
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// 터치로도 시작 가능
startOverlay.addEventListener('click', (e) => {
    if (e.target === startOverlay || e.target.closest('.overlay-content')) {
        if (!e.target.closest('button')) return;
    }
});

// 초기화
resizeCanvas();

