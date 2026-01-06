let canvas, ctx;
let gameStarted = false;
let animationId = null;  // 게임 루프 ID

// 게임 상태
let level = 1;
let coverage = 0;
let gameOver = false;
let gameWon = false;

// 게임 영역 설정
let gameArea = {
    x: 20,
    y: 20,
    width: 760,
    height: 560
};

// 그리드 설정
const gridSize = 5;
let cols = 152;
let rows = 112;

// 영역 상태 (0: 빈 공간, 1: 내 영역, 2: 테두리)
let grid = [];

// 모서리 점들 저장
let corners = [];

// 플레이어 설정
const player = {
    x: 0,
    y: 0,
    gridX: 0,
    gridY: 0,
    size: 4,
    speed: 2,
    color: '#666',
    isDrawing: false,  // 선 그리기 모드
    trail: []  // 그리고 있는 선
};

// 장애물 배열
let obstacles = [];

// 키 입력 상태
const keys = {};
let currentDirection = null;

// 그리드 초기화
function initGrid() {
    grid = [];
    corners = [];  // 모서리 초기화
    for (let row = 0; row < rows; row++) {
        grid[row] = [];
        for (let col = 0; col < cols; col++) {
            // 테두리는 2로 표시
            if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) {
                grid[row][col] = 2;
            } else {
                grid[row][col] = 0;
            }
        }
    }
}

// 초기화
function init() {
    initGrid();
    
    // 플레이어 시작 위치 (왼쪽 하단 모서리)
    player.gridX = 0;
    player.gridY = rows - 1;
    player.x = gameArea.x + player.gridX * gridSize + gridSize / 2;
    player.y = gameArea.y + player.gridY * gridSize + gridSize / 2;
    player.isDrawing = false;
    player.trail = [];
    
    obstacles = [];
    gameOver = false;
    gameWon = false;
    
    // 장애물 생성 (레벨 + 10)
    const obstacleCount = level + 10;
    for (let i = 0; i < obstacleCount; i++) {
        obstacles.push(createObstacle());
    }
    
    calculateCoverage();
    updateInfo();
}

// 장애물 생성
function createObstacle() {
    const size = 4;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.0 + Math.random() * 0.3;  // 속도 (1.0 ~ 1.3)
    
    // 빈 공간에서만 생성
    let x, y;
    do {
        x = gameArea.x + gridSize * 2 + Math.random() * (gameArea.width - gridSize * 4);
        y = gameArea.y + gridSize * 2 + Math.random() * (gameArea.height - gridSize * 4);
    } while (isInSafeZone(x, y));
    
    return {
        x: x,
        y: y,
        size: size,
        angle: angle,
        speed: speed,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
    };
}

// 안전 영역인지 확인 (테두리 또는 내 영역)
function isInSafeZone(x, y) {
    const col = Math.floor((x - gameArea.x) / gridSize);
    const row = Math.floor((y - gameArea.y) / gridSize);
    if (row < 0 || row >= rows || col < 0 || col >= cols) return true;
    return grid[row][col] > 0;
}

// 경계선인지 확인 (주변에 빈 공간이 있는 안전 영역)
function isBorderCell(col, row) {
    if (row < 0 || row >= rows || col < 0 || col >= cols) return false;
    if (grid[row][col] === 0) return false;  // 빈 공간은 경계선 아님
    if (grid[row][col] === 2) return true;   // 원래 테두리는 항상 경계선
    
    // 모서리 점이면 이동 가능
    for (let corner of corners) {
        if (corner.x === col && corner.y === row) return true;
    }
    
    // 주변 4방향 중 하나라도 빈 공간(0)이 있으면 경계선
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let [dr, dc] of directions) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (grid[nr][nc] === 0) return true;
        }
    }
    return false;
}

// 키 이벤트
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    // 방향키 기본 동작(스크롤) 방지
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase()) || e.code === 'Space') {
        e.preventDefault();
    }
    
    keys[key] = true;
    
    if (key === 'arrowup' || key === 'w') currentDirection = 'up';
    else if (key === 'arrowdown' || key === 's') currentDirection = 'down';
    else if (key === 'arrowleft' || key === 'a') currentDirection = 'left';
    else if (key === 'arrowright' || key === 'd') currentDirection = 'right';
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// 플레이어 이동
function updatePlayer() {
    if (gameOver || gameWon) return;
    
    let dx = 0;
    let dy = 0;
    
    if (keys['arrowup'] || keys['w']) dy = -1;
    else if (keys['arrowdown'] || keys['s']) dy = 1;
    else if (keys['arrowleft'] || keys['a']) dx = -1;
    else if (keys['arrowright'] || keys['d']) dx = 1;
    
    if (dx === 0 && dy === 0) return;
    
    // 새 위치 계산
    const newGridX = player.gridX + dx;
    const newGridY = player.gridY + dy;
    
    // 경계 체크
    if (newGridX < 0 || newGridX >= cols || newGridY < 0 || newGridY >= rows) return;
    
    const oldInSafe = grid[player.gridY][player.gridX] > 0;
    const newInSafe = grid[newGridY][newGridX] > 0;
    
    // 안전 영역에서 안전 영역으로 이동할 때는 경계선만 가능
    if (!player.isDrawing && oldInSafe && newInSafe) {
        if (!isBorderCell(newGridX, newGridY)) {
            return;  // 내부로는 이동 불가
        }
    }
    
    // 이동
    player.gridX = newGridX;
    player.gridY = newGridY;
    player.x = gameArea.x + player.gridX * gridSize + gridSize / 2;
    player.y = gameArea.y + player.gridY * gridSize + gridSize / 2;
    
    // 안전 영역에서 빈 공간으로 나가면 선 그리기 시작
    if (oldInSafe && !newInSafe) {
        player.isDrawing = true;
        player.trail = [{x: player.gridX, y: player.gridY}];
    }
    // 선 그리기 중 (되돌아가면 실행취소)
    else if (player.isDrawing && !newInSafe) {
        // 되돌아가는 경우: trail에서 마지막 점 제거 (실행취소)
        if (player.trail.length >= 2) {
            const secondLast = player.trail[player.trail.length - 2];
            if (secondLast.x === player.gridX && secondLast.y === player.gridY) {
                player.trail.pop();  // 마지막 점 제거
                // trail이 비면 선 그리기 취소
                if (player.trail.length === 0) {
                    player.isDrawing = false;
                }
                return;
            }
        }
        // trail의 첫 점으로 돌아오면 선 그리기 취소
        if (player.trail.length === 1) {
            const first = player.trail[0];
            if (first.x === player.gridX && first.y === player.gridY) {
                player.trail = [];
                player.isDrawing = false;
                return;
            }
        }
        // 새로운 방향으로 이동: trail에 추가
        player.trail.push({x: player.gridX, y: player.gridY});
    }
    // 선 그리기 중 안전 영역으로 돌아오면 영역 확보
    else if (player.isDrawing && newInSafe) {
        // 충분한 영역을 그렸을 때만 캡처 (최소 3개 점 이상)
        if (player.trail.length >= 3) {
            player.trail.push({x: player.gridX, y: player.gridY});
            captureArea();
            
            // 플레이어 위치를 새 영역의 끝지점으로 설정 (현재 위치 유지)
            // 현재 위치가 새 영역의 일부가 되도록 표시
            if (grid[player.gridY] && grid[player.gridY][player.gridX] === 0) {
                grid[player.gridY][player.gridX] = 1;
            }
        }
        player.isDrawing = false;
        player.trail = [];
    }
}

// 영역 확보 (Flood Fill 알고리즘)
function captureArea() {
    // 모서리 점 찾기 (방향이 바뀌는 점)
    if (player.trail.length >= 2) {
        // 시작점 추가
        corners.push({x: player.trail[0].x, y: player.trail[0].y});
        
        // 방향이 바뀌는 점 찾기
        for (let i = 1; i < player.trail.length - 1; i++) {
            const prev = player.trail[i - 1];
            const curr = player.trail[i];
            const next = player.trail[i + 1];
            
            const dir1X = curr.x - prev.x;
            const dir1Y = curr.y - prev.y;
            const dir2X = next.x - curr.x;
            const dir2Y = next.y - curr.y;
            
            // 방향이 바뀌면 모서리
            if (dir1X !== dir2X || dir1Y !== dir2Y) {
                corners.push({x: curr.x, y: curr.y});
            }
        }
        
        // 끝점 추가
        corners.push({x: player.trail[player.trail.length - 1].x, y: player.trail[player.trail.length - 1].y});
    }
    
    // 선을 영역으로 표시
    for (let point of player.trail) {
        if (point.y >= 0 && point.y < rows && point.x >= 0 && point.x < cols) {
            grid[point.y][point.x] = 1;
        }
    }
    
    // 장애물이 없는 쪽을 채우기
    // 먼저 각 빈 영역을 찾고, 장애물이 있는지 확인
    const visited = [];
    for (let r = 0; r < rows; r++) {
        visited[r] = [];
        for (let c = 0; c < cols; c++) {
            visited[r][c] = false;
        }
    }
    
    const regions = [];
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 0 && !visited[r][c]) {
                const region = [];
                const queue = [{x: c, y: r}];
                let hasObstacle = false;
                
                while (queue.length > 0) {
                    const current = queue.shift();
                    const cx = current.x;
                    const cy = current.y;
                    
                    if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) continue;
                    if (visited[cy][cx] || grid[cy][cx] !== 0) continue;
                    
                    visited[cy][cx] = true;
                    region.push({x: cx, y: cy});
                    
                    // 이 셀에 장애물이 있는지 확인
                    const cellX = gameArea.x + cx * gridSize + gridSize / 2;
                    const cellY = gameArea.y + cy * gridSize + gridSize / 2;
                    for (let obs of obstacles) {
                        const dist = Math.sqrt((obs.x - cellX) ** 2 + (obs.y - cellY) ** 2);
                        if (dist < obs.size + gridSize) {
                            hasObstacle = true;
                        }
                    }
                    
                    queue.push({x: cx + 1, y: cy});
                    queue.push({x: cx - 1, y: cy});
                    queue.push({x: cx, y: cy + 1});
                    queue.push({x: cx, y: cy - 1});
                }
                
                regions.push({cells: region, hasObstacle: hasObstacle});
            }
        }
    }
    
    // 장애물이 없는 영역을 내 영역으로 채우기
    for (let region of regions) {
        if (!region.hasObstacle) {
            for (let cell of region.cells) {
                grid[cell.y][cell.x] = 1;
            }
        }
    }
    
    calculateCoverage();
}

// 장애물 업데이트
function updateObstacles() {
    obstacles.forEach(obstacle => {
        const nextX = obstacle.x + obstacle.vx;
        const nextY = obstacle.y + obstacle.vy;
        
        // 내 영역이나 테두리에 닿으면 반사
        if (isInSafeZone(nextX, obstacle.y)) {
            obstacle.vx = -obstacle.vx;
        } else {
            obstacle.x = nextX;
        }
        
        if (isInSafeZone(obstacle.x, nextY)) {
            obstacle.vy = -obstacle.vy;
        } else {
            obstacle.y = nextY;
        }
        
        // 게임 영역 경계 체크
        if (obstacle.x <= gameArea.x + gridSize || obstacle.x >= gameArea.x + gameArea.width - gridSize) {
            obstacle.vx = -obstacle.vx;
            obstacle.x = Math.max(gameArea.x + gridSize, Math.min(gameArea.x + gameArea.width - gridSize, obstacle.x));
        }
        if (obstacle.y <= gameArea.y + gridSize || obstacle.y >= gameArea.y + gameArea.height - gridSize) {
            obstacle.vy = -obstacle.vy;
            obstacle.y = Math.max(gameArea.y + gridSize, Math.min(gameArea.y + gameArea.height - gridSize, obstacle.y));
        }
    });
}

// 충돌 감지
function checkCollisions() {
    if (gameOver || gameWon) return;
    
    // 선 그리기 중일 때만 충돌 체크
    if (player.isDrawing) {
        for (let obstacle of obstacles) {
            const dx = player.x - obstacle.x;
            const dy = player.y - obstacle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 플레이어 크기(4) + 장애물 몸체(3) - 좀 더 타이트하게
            if (distance < player.size + obstacle.size * 0.7) {
                gameOver = true;
                document.getElementById('gameStatus').textContent = '장애물에 닿았습니다! 스페이스바로 다시 시작';
                return;
            }
        }
        
        // 선에 장애물이 닿았는지 확인
        for (let point of player.trail) {
            const trailX = gameArea.x + point.x * gridSize + gridSize / 2;
            const trailY = gameArea.y + point.y * gridSize + gridSize / 2;
            
            for (let obstacle of obstacles) {
                const dx = trailX - obstacle.x;
                const dy = trailY - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // 선 두께(1.5) + 장애물 크기로 더 정확한 충돌 판정
                if (distance < 1.5 + obstacle.size) {
                    gameOver = true;
                    document.getElementById('gameStatus').textContent = '선이 끊어졌습니다! 스페이스바로 다시 시작';
                    return;
                }
            }
        }
    }
}

// 영역 차지 계산
function calculateCoverage() {
    let total = 0;
    let covered = 0;
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            total++;
            if (grid[r][c] > 0) covered++;
        }
    }
    
    coverage = Math.floor((covered / total) * 100);
    
    // 70% 이상 차지하면 다음 레벨로 자동 진행
    if (coverage >= 70 && !gameWon) {
        gameWon = true;
        level++;
        document.getElementById('gameStatus').textContent = `레벨 ${level - 1} 클리어!`;
        
        // 1초 후 자동으로 다음 레벨 시작
        setTimeout(() => {
            document.getElementById('gameStatus').textContent = '';
            gameWon = false;
            init();
        }, 1000);
    }
}

// 그리기 함수들
function drawGameArea() {
    // 빈 공간
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(gameArea.x, gameArea.y, gameArea.width, gameArea.height);
    
    // 내 영역 그리기
    ctx.fillStyle = 'rgba(100, 200, 100, 0.6)';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 1) {
                ctx.fillRect(
                    gameArea.x + c * gridSize,
                    gameArea.y + r * gridSize,
                    gridSize,
                    gridSize
                );
            }
        }
    }
    
    // 테두리
    ctx.fillStyle = 'rgba(100, 150, 200, 0.8)';
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 2) {
                ctx.fillRect(
                    gameArea.x + c * gridSize,
                    gameArea.y + r * gridSize,
                    gridSize,
                    gridSize
                );
            }
        }
    }
    
    // 외곽선
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(gameArea.x, gameArea.y, gameArea.width, gameArea.height);
}

function drawPlayer() {
    // 그리고 있는 선 표시
    if (player.trail.length > 0) {
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(
            gameArea.x + player.trail[0].x * gridSize + gridSize / 2,
            gameArea.y + player.trail[0].y * gridSize + gridSize / 2
        );
        for (let i = 1; i < player.trail.length; i++) {
            ctx.lineTo(
                gameArea.x + player.trail[i].x * gridSize + gridSize / 2,
                gameArea.y + player.trail[i].y * gridSize + gridSize / 2
            );
        }
        ctx.lineTo(player.x, player.y);
        ctx.stroke();
    }
    
    // 플레이어 그리기 (회색 동그라미)
    ctx.fillStyle = player.isDrawing ? '#ff6600' : player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        // 올챙이 모양 그리기
        ctx.save();
        ctx.translate(obstacle.x, obstacle.y);
        
        // 이동 방향으로 회전
        const angle = Math.atan2(obstacle.vy, obstacle.vx);
        ctx.rotate(angle);
        
        // 몸체 (더 얇은 타원형)
        ctx.fillStyle = '#4a7c59';
        ctx.beginPath();
        ctx.ellipse(0, 0, obstacle.size, obstacle.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 눈
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(obstacle.size * 0.4, -obstacle.size * 0.25, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(obstacle.size * 0.4, obstacle.size * 0.25, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 눈동자
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(obstacle.size * 0.5, -obstacle.size * 0.25, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(obstacle.size * 0.5, obstacle.size * 0.25, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // 꼬리
        ctx.strokeStyle = '#4a7c59';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-obstacle.size * 0.8, 0);
        ctx.quadraticCurveTo(-obstacle.size * 1.3, obstacle.size * 0.4, -obstacle.size * 1.6, 0);
        ctx.stroke();
        
        ctx.restore();
    });
}

function updateInfo() {
    document.getElementById('level').textContent = level;
    document.getElementById('coverage').textContent = coverage;
}

// 모서리 그리기
function drawCorners() {
    ctx.fillStyle = 'rgba(100, 200, 100, 0.6)';  // 영역 차지 색과 동일
    for (let corner of corners) {
        const x = gameArea.x + corner.x * gridSize + gridSize / 2;
        const y = gameArea.y + corner.y * gridSize + gridSize / 2;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 게임 루프
function gameLoop() {
    // 화면 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!gameOver && !gameWon) {
        updatePlayer();
        updateObstacles();
        checkCollisions();
        updateInfo();
    }
    
    // 그리기
    drawGameArea();
    drawCorners();  // 모서리 표시
    drawObstacles();
    drawPlayer();
    
    animationId = requestAnimationFrame(gameLoop);
}

// 스페이스바로 시작 화면으로 돌아가기
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && (gameOver || gameWon)) {
        // 시작 화면으로 돌아가기
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('startScreen').style.display = 'block';
        document.getElementById('gameStatus').textContent = '';
        
        // 다음 레벨로 진행하는 경우 입력창에 다음 레벨 표시
        if (gameWon) {
            document.getElementById('levelInput').value = level;
        } else {
            document.getElementById('levelInput').value = 1;
        }
        
        gameStarted = false;
    }
});

// 시작 버튼 이벤트
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('levelInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame();
});

function startGame() {
    // 기존 게임 루프 중지
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    const inputLevel = parseInt(document.getElementById('levelInput').value) || 1;
    level = Math.max(1, Math.min(100, inputLevel));
    
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    document.getElementById('gameScreen').style.flexDirection = 'column';
    document.getElementById('gameScreen').style.alignItems = 'center';
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // 게임 영역 초기화
    gameArea.width = canvas.width - 40;
    gameArea.height = canvas.height - 40;
    cols = Math.floor(gameArea.width / gridSize);
    rows = Math.floor(gameArea.height / gridSize);
    
    gameStarted = true;
    init();
    gameLoop();
}

