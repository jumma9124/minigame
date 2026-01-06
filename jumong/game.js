// 게임 변수
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const crosshair = document.getElementById('crosshair');
const gameArea = document.getElementById('gameArea');
const powerBar = document.getElementById('powerBar');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const gameOverDiv = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const startOverlay = document.getElementById('startOverlay');
const startBtn = document.getElementById('startBtn');
const nextLevelBtn = document.getElementById('nextLevelBtn');
const shopOverlay = document.getElementById('shopOverlay');
const shopScoreElement = document.getElementById('shopScore');
const shopItemsDiv = document.getElementById('shopItems');

// 모바일 기기 감지
function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || 
           (navigator.userAgent.indexOf('IEMobile') !== -1) ||
           ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0);
}

// 터치 관련 변수 (모바일용)
let touchStartTime = 0;
let touchTargetX = 0;
let touchTargetY = 0;
const MAX_CHARGE_TIME = 1500; // 최대 충전 시간 (1.5초)

// 이미지 로드
const playerImage = new Image();
playerImage.src = '1.png';

const backgroundImage = new Image();
backgroundImage.src = '2.jpg';

const enemyImage = new Image();
enemyImage.src = '1.png';

let imagesLoaded = 0;
const totalImages = 3;

function onImageLoad() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        // 모든 이미지가 로드되면 게임 시작 가능
        console.log('All images loaded');
    }
}

playerImage.onload = onImageLoad;
backgroundImage.onload = onImageLoad;
enemyImage.onload = onImageLoad;

// 활 위치 (화면 하단 중앙)
let bowX = 0;
let bowY = 0;
const playerSpeed = 3; // 플레이어 이동 속도

// 키보드 입력 상태
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false
};

// Canvas 크기 설정
function resizeCanvas() {
    if (!gameArea || !canvas) {
        console.error('gameArea 또는 canvas를 찾을 수 없습니다');
        return;
    }
    
    const width = gameArea.offsetWidth || 800;
    const height = gameArea.offsetHeight || 500;
    
    canvas.width = width;
    canvas.height = height;
    
    // 메인 플레이어 위치 업데이트
    if (gameState.players && gameState.players.length > 0) {
        // 기존 플레이어 위치 유지하면서 경계 체크
        for (let player of gameState.players) {
            player.x = Math.max(40, Math.min(player.x, canvas.width - 40));
            player.y = Math.max(50, Math.min(player.y, canvas.height - 50));
        }
        if (gameState.players[0]) {
            bowX = gameState.players[0].x;
            bowY = gameState.players[0].y;
        }
    } else {
        // 플레이어가 없으면 초기화
        if (bowX === 0) bowX = canvas.width / 2;
        if (bowY === 0) bowY = canvas.height - 100;
        bowX = Math.max(40, Math.min(bowX, canvas.width - 40));
        bowY = Math.max(50, Math.min(bowY, canvas.height - 50));
    }
}

// 초기 resizeCanvas 호출 (DOM 로드 후)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        resizeCanvas();
    });
} else {
    resizeCanvas();
}

window.addEventListener('resize', resizeCanvas);

// 키보드 이벤트
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') {
        keys.ArrowUp = true;
        e.preventDefault();
    }
    if (key === 'arrowdown' || key === 's') {
        keys.ArrowDown = true;
        e.preventDefault();
    }
    if (key === 'arrowleft' || key === 'a') {
        keys.ArrowLeft = true;
        e.preventDefault();
    }
    if (key === 'arrowright' || key === 'd') {
        keys.ArrowRight = true;
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') {
        keys.ArrowUp = false;
        e.preventDefault();
    }
    if (key === 'arrowdown' || key === 's') {
        keys.ArrowDown = false;
        e.preventDefault();
    }
    if (key === 'arrowleft' || key === 'a') {
        keys.ArrowLeft = false;
        e.preventDefault();
    }
    if (key === 'arrowright' || key === 'd') {
        keys.ArrowRight = false;
        e.preventDefault();
    }
});

// 플레이어 이동 업데이트 (모바일에서는 이동 비활성화, 위치 고정)
function updatePlayer() {
    if (gameState.gameOver) return;
    
    // 메인 플레이어 위치는 고정 (이동 없음)
    if (gameState.players.length > 0) {
        const mainPlayer = gameState.players[0];
        
        // 모바일 모드가 아닐 때만 키보드 이동 허용
        if (!isMobileDevice()) {
            if (keys.ArrowUp || keys.w) {
                mainPlayer.y -= playerSpeed;
            }
            if (keys.ArrowDown || keys.s) {
                mainPlayer.y += playerSpeed;
            }
            if (keys.ArrowLeft || keys.a) {
                mainPlayer.x -= playerSpeed;
            }
            if (keys.ArrowRight || keys.d) {
                mainPlayer.x += playerSpeed;
            }
            
            // 경계 체크
            mainPlayer.x = Math.max(40, Math.min(mainPlayer.x, canvas.width - 40));
            mainPlayer.y = Math.max(50, Math.min(mainPlayer.y, canvas.height - 50));
        }
        
        // bowX, bowY 업데이트 (화살 발사 위치)
        bowX = mainPlayer.x;
        bowY = mainPlayer.y;
    }
}

// 아이템 정의
const items = [
    {
        id: 'powerShot',
        name: '강력한 화살',
        description: '파워바 없이 멀리 나가는 화살',
        basePrice: 300, // 50 → 300 (6배 증가)
        owned: 0
    },
    {
        id: 'rapidFire',
        name: '빠른 발사',
        description: '더 빨리 쏠 수 있음',
        basePrice: 350, // 80 → 350 (약 4.4배 증가)
        owned: 0
    },
    {
        id: 'tripleShot',
        name: '삼중 발사',
        description: '한번에 3개 화살 발사',
        basePrice: 800, // 삼중 발사 가격 상향
        owned: 0
    },
    {
        id: 'instantShot',
        name: '즉시 발사',
        description: '클릭 한번당 바로 화살 발사',
        basePrice: 400, // 100 → 400 (4배 증가)
        owned: 0
    }
];

// 게임 상태
let gameState = {
    score: 0, // 금액 (레벨 전환 시 초기화되지 않고 계속 쌓임)
    level: 1,
    mouseX: 0,
    mouseY: 0,
    isCharging: false,
    power: 0,
    powerDirection: 1,
    arrows: [],
    enemyArrows: [], // 악당이 발사한 화살
    targets: [],
    players: [], // 플레이어 배열 (메인 플레이어만)
    allyPlayers: [], // 추가 플레이어들 (왼쪽에서 오른쪽으로 이동)
    particles: [],
    hits: 0,
    gameOver: false,
    // 아이템 효과
    items: {
        powerShot: false,
        rapidFire: false,
        tripleShot: false,
        instantShot: false
    },
    lastShotTime: 0, // 빠른 발사를 위한 시간 추적
    canShoot: true, // 즉시 발사용
    lastEnemySpawnTime: 0 // 마지막 악당 생성 시간
};
let hasStarted = false;

// 레벨 목표 점수 계산
function getTargetScore(level) {
    return 500 + (level - 1) * 500; // 레벨마다 500씩 증가 (레벨1: 500, 레벨2: 1000, 레벨3: 1500...)
}

// 레벨별 목표 플레이어 수 계산 (추가 플레이어만, 메인 플레이어 제외)
function getTargetAllyPlayerCount(level) {
    // 레벨이 올라갈수록 추가 플레이어 수 증가
    return Math.min(1 + level, 4); // 레벨 1: 2명, 레벨 2: 3명, 레벨 3: 4명, 레벨 4+: 4명
}

// 레벨별 목표 악당 수 계산
function getTargetEnemyCount(level) {
    // 레벨에 따라 악당 수 결정
    const allyCount = getTargetAllyPlayerCount(level);
    
    if (level === 1) {
        // 레벨 1: 플레이어가 악당보다 많음 (2:1)
        return Math.max(1, Math.floor(allyCount * 0.5));
    } else if (level === 2) {
        // 레벨 2: 플레이어가 약간 많음 (3:2)
        return Math.max(1, Math.floor(allyCount * 0.67));
    } else if (level === 3) {
        // 레벨 3: 비슷함 (4:3)
        return Math.max(1, Math.floor(allyCount * 0.75));
    } else if (level === 4) {
        // 레벨 4: 비슷함 (4:4)
        return allyCount;
    } else {
        // 레벨 5+: 악당이 플레이어보다 많아짐
        return allyCount + (level - 4);
    }
}

// 플레이어 생성
function createPlayers() {
    // 메인 플레이어만 생성
    gameState.players = [];
    const canvasWidth = canvas.width || 800;
    const canvasHeight = canvas.height || 500;
    
    let playerX, playerY;
    
    // 모바일: 왼쪽 고정 위치 / PC: 기존 위치 (가운데 하단)
    if (isMobileDevice()) {
        playerX = canvasWidth * 0.12; // 왼쪽에서 12% 위치에 고정
        playerY = canvasHeight * 0.7; // 화면 하단 70% 위치
    } else {
        playerX = canvasWidth / 2; // 가운데
        playerY = canvasHeight - 100; // 하단
    }
    
    const mainPlayer = {
        x: playerX,
        y: playerY,
        isMain: true,
        hp: 3, // 체력 (3발 맞으면 죽음)
        isDead: false
    };
    gameState.players.push(mainPlayer);
    
    // 메인 플레이어 위치 업데이트
    bowX = mainPlayer.x;
    bowY = mainPlayer.y;
    
    // 추가 플레이어 초기화 (나중에 계속 생성됨)
    gameState.allyPlayers = [];
}

// 새로운 추가 플레이어 생성
function createNewAllyPlayer() {
    const canvasHeight = canvas.height || 500;
    // 화면 하단 40% 영역에만 스폰
    const bottomAreaStart = canvasHeight * 0.6; // 화면 하단 40% 시작점
    const bottomAreaEnd = canvasHeight - 60; // 하단 여백
    
    const allyPlayer = {
        x: -60 - Math.random() * 100, // 왼쪽에서 시작
        y: bottomAreaStart + Math.random() * (bottomAreaEnd - bottomAreaStart),
        vx: 1.5 + Math.random() * 0.5, // 오른쪽으로 이동 속도
        lastShotTime: 0,
        shotInterval: 2000 + Math.random() * 1000, // 2-3초마다 발사
        hp: 3, // 체력 (3발 맞으면 죽음)
        isDead: false
    };
    
    gameState.allyPlayers.push(allyPlayer);
    return allyPlayer;
}

// 추가 플레이어 리셋 (왼쪽에서 다시 시작)
function resetAllyPlayer(allyPlayer) {
    allyPlayer.x = -60 - Math.random() * 100;
    // 화면 하단 40% 영역에만 스폰
    const bottomAreaStart = canvas.height * 0.6; // 화면 하단 40% 시작점
    const bottomAreaEnd = canvas.height - 60; // 하단 여백
    allyPlayer.y = bottomAreaStart + Math.random() * (bottomAreaEnd - bottomAreaStart);
    allyPlayer.vx = 1.5 + Math.random() * 0.5;
    allyPlayer.lastShotTime = 0;
    allyPlayer.hp = 3; // 체력 회복
    allyPlayer.isDead = false;
}

// 초기화
function init() {
    try {
        gameState.score = 0; // 게임 시작 시 금액 초기화
        gameState.level = 1;
        gameState.hits = 0;
        gameState.arrows = [];
        gameState.enemyArrows = []; // 악당 화살 초기화
        gameState.targets = [];
        gameState.players = []; // 플레이어 배열 초기화
        gameState.allyPlayers = []; // 추가 플레이어 배열 초기화
        gameState.particles = [];
        gameState.gameOver = false;
        gameState.items = {
            powerShot: false,
            rapidFire: false,
            tripleShot: false,
            instantShot: false
        };
        gameState.lastShotTime = 0;
        gameState.canShoot = true;
        gameState.lastEnemySpawnTime = Date.now(); // 악당 생성 시간 초기화
        
        // 아이템 초기화
        items.forEach(item => {
            item.owned = 0;
        });
        
        // 플레이어 위치 초기화
        resizeCanvas();
        
        // 플레이어 생성
        createPlayers();
        
        gameOverDiv.classList.remove('show');
        shopOverlay.classList.remove('show');
        
        // 초기 타겟 생성
        createTargets();
        
        // 초기 추가 플레이어 생성
        const initialAllyCount = getTargetAllyPlayerCount(gameState.level);
        
        for (let i = 0; i < initialAllyCount; i++) {
            createNewAllyPlayer();
        }
        
        // 초기 악당 몇 개 생성 (나중에 무한대로 계속 생성됨)
        for (let i = 0; i < 3; i++) {
            createNewEnemy();
        }
        
        updateUI();
        gameLoop();
    } catch (error) {
        console.error('게임 초기화 오류:', error);
    }
}

// 오른쪽에서 등장하는 타겟 리셋
function resetTarget(target) {
    target.x = canvas.width + 60 + Math.random() * 120;
    // 화면 하단 40% 영역에만 스폰
    const bottomAreaStart = canvas.height * 0.6; // 화면 하단 40% 시작점
    const minY = bottomAreaStart;
    const maxY = canvas.height - 60; // 하단 여백
    target.y = minY + Math.random() * (maxY - minY);
    target.radius = 32 + Math.random() * 16;
    target.color = `hsl(${Math.random() * 60 + 10}, 70%, 50%)`;
    target.points = Math.floor(40 + Math.random() * 25);
    target.hit = false;
    target.hp = 3; // 체력 (3발 맞으면 죽음)
    target.rotation = Math.random() * Math.PI * 2;
    target.rotationSpeed = (Math.random() - 0.5) * 0.02;
    // 레벨별 속도 조정 (1단계는 느리게, 레벨이 올라갈수록 점진적으로 증가)
    let baseSpeed;
    if (gameState.level === 1) {
        baseSpeed = 0.8; // 1단계는 매우 느리게
    } else if (gameState.level === 2) {
        baseSpeed = 1.2; // 2단계는 조금 빠르게
    } else if (gameState.level === 3) {
        baseSpeed = 1.6; // 3단계는 중간 속도
    } else {
        baseSpeed = 1.5 + (gameState.level - 1) * 0.3; // 4단계 이상은 점진적으로 증가
    }
    target.vx = -(baseSpeed + Math.random() * 0.8);
    
    // 악당 화살 발사 관련 초기화
    if (!target.lastShotTime) {
        target.lastShotTime = 0;
        target.shotInterval = 3000 + Math.random() * 2000;
    }
}

// 타겟 생성
function createTargets() {
    gameState.targets = [];
    // 초기에는 목표 수만큼 생성, 나중에 계속 생성됨
}

// 새로운 악당 생성
function createNewEnemy() {
    const target = {};
    resetTarget(target);
    target.lastShotTime = 0; // 악당 화살 발사 시간 추적
    target.shotInterval = 3000 + Math.random() * 2000; // 3-5초마다 발사
    gameState.targets.push(target);
    return target;
}

// 악당이 플레이어를 향해 화살 발사 (정확도 개선)
function shootEnemyArrow(target) {
    // 모든 플레이어 (메인 + 추가) 중 가장 가까운 플레이어 찾기
    let nearestPlayer = null;
    let minDistance = Infinity;
    let isMainPlayer = false;
    
    // 메인 플레이어 확인
    if (gameState.players.length > 0 && !gameState.players[0].isDead) {
        const dx = gameState.players[0].x - target.x;
        const dy = gameState.players[0].y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance && distance < 800) {
            minDistance = distance;
            nearestPlayer = gameState.players[0];
            isMainPlayer = true;
        }
    }
    
    // 추가 플레이어 확인
    for (let allyPlayer of gameState.allyPlayers) {
        if (allyPlayer.isDead) continue;
        
        const dx = allyPlayer.x - target.x;
        const dy = allyPlayer.y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance && distance < 800) {
            minDistance = distance;
            nearestPlayer = allyPlayer;
            isMainPlayer = false;
        }
    }
    
    if (nearestPlayer) {
        // 플레이어를 향해 화살 발사 (정확도 개선 - 추가 플레이어들이 쏘는 것처럼)
        const dx = nearestPlayer.x - target.x;
        const dy = nearestPlayer.y - target.y;
        const angle = Math.atan2(dy, dx);
        
        // 정확도 개선: 약간의 랜덤 오차 추가 (추가 플레이어들이 쏘는 것처럼)
        const accuracyOffset = (Math.random() - 0.5) * 0.1; // ±0.05 라디안 (±약 3도)
        const finalAngle = angle + accuracyOffset;
        
        // 악당 화살 속도는 플레이어 화살 속도의 2배
        // 플레이어 화살 속도가 8~12이므로, 악당은 16~24
        const speed = 16 + Math.random() * 8;
        
        const enemyArrow = {
            x: target.x,
            y: target.y,
            vx: Math.cos(finalAngle) * speed,
            vy: Math.sin(finalAngle) * speed,
            angle: finalAngle,
            length: 20,
            hit: false,
            targetIsMain: isMainPlayer // 타겟이 메인 플레이어인지 표시
        };
        
        gameState.enemyArrows.push(enemyArrow);
    }
}

// 마우스 이동 이벤트
gameArea.addEventListener('mousemove', (e) => {
    const rect = gameArea.getBoundingClientRect();
    gameState.mouseX = e.clientX - rect.left;
    gameState.mouseY = e.clientY - rect.top;
    
    // 십자선 표시
    crosshair.style.display = 'block';
    crosshair.style.left = gameState.mouseX + 'px';
    crosshair.style.top = gameState.mouseY + 'px';
});

gameArea.addEventListener('mouseleave', () => {
    crosshair.style.display = 'none';
});

// 화살 발사 함수
function shootArrow(targetX, targetY, isMainPlayer = true, fromX = null, fromY = null) {
    // 발사 위치 설정
    const shootX = fromX !== null ? fromX : bowX;
    const shootY = fromY !== null ? fromY : bowY;
    
    // 각도 계산
    const dx = targetX - shootX;
    const dy = targetY - shootY;
    const angle = Math.atan2(dy, dx);
    
    // 힘에 따른 속도
    let speed;
    if (isMainPlayer) {
        // 메인 플레이어는 아이템 효과 적용
        if (gameState.items.powerShot) {
            speed = 15; // 최대 속도
        } else if (gameState.items.instantShot) {
            speed = 12; // 중간 이상 속도
        } else {
            speed = 5 + gameState.power * 10;
        }
    } else {
        // 추가 플레이어는 기본 속도
        speed = 8 + Math.random() * 4;
    }
    
    // 화살 생성
    const arrow = {
        x: shootX,
        y: shootY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle: angle,
        length: 20,
        hit: false,
        isMainPlayer: isMainPlayer // 메인 플레이어가 발사한 화살만 점수 획득
    };
    
    gameState.arrows.push(arrow);
    
    // 메인 플레이어만 삼중 발사 아이템 효과 적용
    if (isMainPlayer && gameState.items.tripleShot) {
        const spread = 0.15; // 각도 차이
        for (let i = 0; i < 2; i++) {
            const offset = (i === 0 ? -spread : spread);
            const newAngle = angle + offset;
            const newArrow = {
                x: shootX,
                y: shootY,
                vx: Math.cos(newAngle) * speed,
                vy: Math.sin(newAngle) * speed,
                angle: newAngle,
                length: 20,
                hit: false,
                isMainPlayer: true
            };
            gameState.arrows.push(newArrow);
        }
    }
}

// 추가 플레이어가 화살 발사
function shootAllyArrow(allyPlayer) {
    // 가장 가까운 악당 찾기
    let nearestTarget = null;
    let minDistance = Infinity;
    
    for (let target of gameState.targets) {
        if (target.hit) continue;
        
        const dx = target.x - allyPlayer.x;
        const dy = target.y - allyPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance && distance < 400) { // 400픽셀 이내의 타겟만
            minDistance = distance;
            nearestTarget = target;
        }
    }
    
    if (nearestTarget) {
        // 악당을 향해 화살 발사 (점수는 안 올라감)
        shootArrow(nearestTarget.x, nearestTarget.y, false, allyPlayer.x, allyPlayer.y);
    }
}

// 악당이 있는지 확인 (죽지 않은 악당)
function hasActiveEnemies() {
    for (let target of gameState.targets) {
        if (!target.hit) {
            return true;
        }
    }
    return false;
}

// 추가 플레이어가 악당 범위 내에 있는지 확인 (x축 거리만 확인)
function isAllyPlayerNearEnemy(allyPlayer) {
    const detectionRange = 50; // 악당 감지 범위 (x축 거리)
    
    for (let target of gameState.targets) {
        if (target.hit) continue;
        
        // x축 거리만 확인 (위아래 위치는 무관)
        const dx = Math.abs(target.x - allyPlayer.x);
        
        // x축 거리가 감지 범위 내에 있으면 true
        if (dx < detectionRange) {
            return true;
        }
    }
    return false;
}

// 추가 플레이어가 전투 중인 악당이 있는지 확인 (상대방이 죽을 때까지 기다려야 함)
function hasAllyPlayerInCombat(allyPlayer) {
    const detectionRange = 50; // 악당 감지 범위 (x축 거리)
    const canvasWidth = canvas.width || 800;
    
    // 플레이어가 오른쪽 끝에 매우 가까이 있으면 (50픽셀 이내) 악당이 정말 가까이 있을 때만 멈춤
    if (allyPlayer.x > canvasWidth - 50) {
        // 오른쪽 끝 매우 근처에서는 악당이 플레이어보다 왼쪽에 있고 매우 가까이 있을 때만 전투
        for (let target of gameState.targets) {
            if (target.hit) continue;
            
            // 악당이 화면 안에 있어야 함
            if (target.x < -100 || target.x > canvasWidth + 100) continue;
            
            // 악당이 플레이어보다 왼쪽에 있어야 함 (오른쪽 끝 근처에서는)
            if (target.x > allyPlayer.x) continue;
            
            // x축 거리만 확인 (더 엄격하게 30픽셀 이내)
            const dx = Math.abs(target.x - allyPlayer.x);
            
            // x축 거리가 감지 범위 내에 있으면 전투 중
            if (dx < detectionRange) {
                return true;
            }
        }
        return false; // 오른쪽 끝 매우 근처에서는 악당이 없거나 멀리 있으면 계속 이동
    }
    
    // 일반적인 경우: 악당이 화면 안에 있고 가까이 있을 때만 전투
    for (let target of gameState.targets) {
        if (target.hit) continue;
        
        // 악당이 화면 안에 있어야 함
        if (target.x < -100 || target.x > canvasWidth + 100) continue;
        
        // x축 거리만 확인
        const dx = Math.abs(target.x - allyPlayer.x);
        
        // x축 거리가 감지 범위 내에 있으면 전투 중
        if (dx < detectionRange) {
            return true;
        }
    }
    return false;
}

// 추가 플레이어 업데이트
function updateAllyPlayers() {
    const now = Date.now();
    const hasEnemies = hasActiveEnemies();
    
    // 활성 추가 플레이어 수 확인 (죽지 않은 플레이어)
    const activeAllyPlayers = gameState.allyPlayers.filter(p => !p.isDead).length;
    const targetAllyCount = getTargetAllyPlayerCount(gameState.level);
    
    // 목표 수보다 적으면 새로운 추가 플레이어 생성
    if (activeAllyPlayers < targetAllyCount) {
        createNewAllyPlayer();
    }
    
    for (let i = gameState.allyPlayers.length - 1; i >= 0; i--) {
        const allyPlayer = gameState.allyPlayers[i];
        
        // 죽은 플레이어는 제거 (나중에 자동으로 재생성됨)
        if (allyPlayer.isDead) {
            gameState.allyPlayers.splice(i, 1);
            continue;
        }
        
        // 오른쪽 끝 근처인지 확인 (50픽셀 이내로 더 엄격하게)
        const canvasWidth = canvas.width || 800;
        const isNearRightEdge = allyPlayer.x > canvasWidth - 50;
        
        // 오른쪽 끝 근처에서는 화면 안의 악당만 체크
        let hasEnemiesNearby = false;
        if (isNearRightEdge) {
            // 오른쪽 끝 근처에서는 화면 안에 있고 플레이어보다 왼쪽에 있는 악당만 체크
            for (let target of gameState.targets) {
                if (target.hit) continue;
                // 악당이 화면 안에 있어야 함
                if (target.x >= -100 && target.x <= canvasWidth + 100) {
                    // 악당이 플레이어보다 왼쪽에 있고 가까이 있어야 함 (30픽셀 이내)
                    if (target.x < allyPlayer.x && Math.abs(target.x - allyPlayer.x) < 30) {
                        hasEnemiesNearby = true;
                        break;
                    }
                }
            }
        } else {
            hasEnemiesNearby = hasEnemies;
        }
        
        // 악당이 있고, 추가 플레이어가 악당 범위 내에 있으면 멈춤
        // 상대방이 죽을 때까지 기다림
        // 오른쪽 끝 근처에서는 더 엄격한 조건 적용
        if (hasEnemiesNearby && hasAllyPlayerInCombat(allyPlayer)) {
            // 이동 멈춤, 공격만 함
            // 일정 시간마다 화살 발사
            if (now - allyPlayer.lastShotTime > allyPlayer.shotInterval) {
                shootAllyArrow(allyPlayer);
                allyPlayer.lastShotTime = now;
                allyPlayer.shotInterval = 2000 + Math.random() * 1000; // 다음 발사 시간 랜덤
            }
        } else {
            // 악당이 없거나 범위 밖에 있으면 이동
            // 위치 업데이트 (오른쪽으로 이동)
            allyPlayer.x += allyPlayer.vx;
            
            // 화면 오른쪽을 지나치면 레벨 클리어
            if (allyPlayer.x > canvas.width + 50) {
                showLevelComplete();
                return;
            }
            
            // 이동 중에도 가까운 악당이 있으면 공격
            if (hasEnemies && now - allyPlayer.lastShotTime > allyPlayer.shotInterval) {
                shootAllyArrow(allyPlayer);
                allyPlayer.lastShotTime = now;
                allyPlayer.shotInterval = 2000 + Math.random() * 1000;
            }
        }
    }
}

// 마우스 클릭 (화살 발사)
gameArea.addEventListener('mousedown', (e) => {
    if (gameState.gameOver) return;
    
    // 즉시 발사 아이템이 있으면 바로 발사
    if (gameState.items.instantShot) {
        const rect = gameArea.getBoundingClientRect();
        const targetX = e.clientX - rect.left;
        const targetY = e.clientY - rect.top;
        shootArrow(targetX, targetY);
        return;
    }
    
    // 빠른 발사 아이템이 있으면 바로 발사
    if (gameState.items.rapidFire) {
        const now = Date.now();
        if (now - gameState.lastShotTime < 150) return; // 최소 간격 150ms
        gameState.lastShotTime = now;
        
        const rect = gameArea.getBoundingClientRect();
        const targetX = e.clientX - rect.left;
        const targetY = e.clientY - rect.top;
        shootArrow(targetX, targetY);
        updateUI();
        return;
    }
    
    gameState.isCharging = true;
    gameState.power = 0;
    gameState.powerDirection = 1;
});

gameArea.addEventListener('mouseup', (e) => {
    if (gameState.gameOver) return;
    
    // 즉시 발사 아이템이 있으면 이미 발사했으므로 리턴
    if (gameState.items.instantShot) {
        gameState.isCharging = false;
        return;
    }
    
    if (!gameState.isCharging) return;
    
    const rect = gameArea.getBoundingClientRect();
    const targetX = e.clientX - rect.left;
    const targetY = e.clientY - rect.top;
    
    shootArrow(targetX, targetY);
    
    gameState.isCharging = false;
    gameState.power = 0;
    updateUI();
});

// ===== 모바일 터치 이벤트 =====

// 터치 시작
gameArea.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState.gameOver) return;
    
    const touch = e.touches[0];
    const rect = gameArea.getBoundingClientRect();
    touchTargetX = touch.clientX - rect.left;
    touchTargetY = touch.clientY - rect.top;
    
    // 십자선 표시
    crosshair.style.display = 'block';
    crosshair.style.left = touchTargetX + 'px';
    crosshair.style.top = touchTargetY + 'px';
    
    // 즉시 발사 아이템이 있으면 바로 발사
    if (gameState.items.instantShot) {
        shootArrow(touchTargetX, touchTargetY);
        return;
    }
    
    // 빠른 발사 아이템이 있으면 바로 발사
    if (gameState.items.rapidFire) {
        const now = Date.now();
        if (now - gameState.lastShotTime >= 150) {
            gameState.lastShotTime = now;
            shootArrow(touchTargetX, touchTargetY);
            updateUI();
        }
        return;
    }
    
    // 충전 시작
    touchStartTime = Date.now();
    gameState.isCharging = true;
    gameState.power = 0;
}, { passive: false });

// 터치 이동 (조준 업데이트)
gameArea.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameState.gameOver) return;
    
    const touch = e.touches[0];
    const rect = gameArea.getBoundingClientRect();
    touchTargetX = touch.clientX - rect.left;
    touchTargetY = touch.clientY - rect.top;
    
    // 십자선 이동
    crosshair.style.display = 'block';
    crosshair.style.left = touchTargetX + 'px';
    crosshair.style.top = touchTargetY + 'px';
    
    // 마우스 좌표도 업데이트
    gameState.mouseX = touchTargetX;
    gameState.mouseY = touchTargetY;
}, { passive: false });

// 터치 종료 (발사)
gameArea.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (gameState.gameOver) return;
    
    // 십자선 숨기기
    crosshair.style.display = 'none';
    
    // 즉시 발사 또는 빠른 발사 아이템이 있으면 이미 발사했으므로 리턴
    if (gameState.items.instantShot || gameState.items.rapidFire) {
        gameState.isCharging = false;
        return;
    }
    
    if (!gameState.isCharging) return;
    
    // 충전 시간에 따른 파워 계산 (0~1)
    const chargeTime = Date.now() - touchStartTime;
    const power = Math.min(chargeTime / MAX_CHARGE_TIME, 1);
    gameState.power = power;
    
    // 화살 발사
    shootArrow(touchTargetX, touchTargetY);
    
    gameState.isCharging = false;
    gameState.power = 0;
    updateUI();
}, { passive: false });

// 터치 취소
gameArea.addEventListener('touchcancel', (e) => {
    gameState.isCharging = false;
    gameState.power = 0;
    crosshair.style.display = 'none';
});

// 힘 게이지 업데이트
function updatePower() {
    if (gameState.isCharging && !gameState.items.powerShot) {
        // 모바일에서는 터치 시간에 따라 파워 계산
        if (isMobileDevice() && touchStartTime > 0) {
            const chargeTime = Date.now() - touchStartTime;
            gameState.power = Math.min(chargeTime / MAX_CHARGE_TIME, 1);
        } else {
            // PC에서는 기존 방식 (좌우로 움직이는 게이지)
            gameState.power += gameState.powerDirection * 0.02;
            if (gameState.power >= 1) {
                gameState.power = 1;
                gameState.powerDirection = -1;
            } else if (gameState.power <= 0) {
                gameState.power = 0;
                gameState.powerDirection = 1;
            }
        }
        powerBar.style.width = (gameState.power * 100) + '%';
    } else if (gameState.items.powerShot && gameState.isCharging) {
        // 강력한 화살 아이템이 있으면 항상 최대
        powerBar.style.width = '100%';
    } else {
        powerBar.style.width = '0%';
    }
}

// 화살 업데이트
function updateArrows() {
    for (let i = gameState.arrows.length - 1; i >= 0; i--) {
        const arrow = gameState.arrows[i];
        
        if (arrow.hit) {
            gameState.arrows.splice(i, 1);
            continue;
        }
        
        // 위치 업데이트
        arrow.x += arrow.vx;
        arrow.y += arrow.vy;
        arrow.vy += 0.3; // 중력
        
        // 화면 밖으로 나갔는지 확인
        if (arrow.x < 0 || arrow.x > canvas.width || 
            arrow.y < 0 || arrow.y > canvas.height) {
            gameState.arrows.splice(i, 1);
            continue;
        }
        
        // 타겟과 충돌 확인
        for (let target of gameState.targets) {
            if (target.hit) continue;
            
            const dx = arrow.x - target.x;
            const dy = arrow.y - target.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < target.radius) {
                // 타겟 맞춤!
                arrow.hit = true;
                
                // 파티클 효과
                createParticles(target.x, target.y, target.color);
                
                // 메인 플레이어가 발사한 화살: 악당을 1발에 죽임
                if (arrow.isMainPlayer) {
                    target.hp = 0; // 즉시 죽음
                    target.hit = true;
                    const points = target.points;
                    gameState.score += points; // 금액 증가 (레벨 전환 시 초기화되지 않음)
                    gameState.hits += 1;
                    
                    updateUI();
                    
                    // 맞은 타겟 제거 (나중에 자동으로 재생성됨)
                    setTimeout(() => {
                        const index = gameState.targets.indexOf(target);
                        if (index > -1) {
                            gameState.targets.splice(index, 1);
                        }
                    }, 400);
                } else {
                    // 추가 플레이어가 발사한 화살: 악당을 3발 맞춰야 죽음
                    target.hp -= 1;
                    
                    // 체력이 0 이하가 되면 죽음 (점수는 안 올라감)
                    if (target.hp <= 0) {
                        target.hit = true;
                        // 맞은 타겟 제거 (나중에 자동으로 재생성됨)
                        setTimeout(() => {
                            const index = gameState.targets.indexOf(target);
                            if (index > -1) {
                                gameState.targets.splice(index, 1);
                            }
                        }, 400);
                    }
                }
                
                break;
            }
        }
    }
}

// 파티클 생성
function createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        gameState.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30,
            color: color
        });
    }
}

// 파티클 업데이트
function updateParticles() {
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const particle = gameState.particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.95;
        particle.vy *= 0.95;
        particle.life--;
        
        if (particle.life <= 0) {
            gameState.particles.splice(i, 1);
        }
    }
}

// 악당이 플레이어 범위 내에 있는지 확인 (x축 거리만 확인)
function isEnemyNearPlayer(target) {
    const detectionRange = 50; // 플레이어 감지 범위 (x축 거리)
    
    // 메인 플레이어 확인
    if (gameState.players.length > 0 && !gameState.players[0].isDead) {
        // x축 거리만 확인 (위아래 위치는 무관)
        const dx = Math.abs(gameState.players[0].x - target.x);
        
        if (dx < detectionRange) {
            return true;
        }
    }
    
    // 추가 플레이어 확인
    for (let allyPlayer of gameState.allyPlayers) {
        if (allyPlayer.isDead) continue;
        
        // x축 거리만 확인
        const dx = Math.abs(allyPlayer.x - target.x);
        
        if (dx < detectionRange) {
            return true;
        }
    }
    
    return false;
}

// 악당이 전투 중인 플레이어가 있는지 확인 (상대방이 죽을 때까지 기다려야 함)
function hasEnemyInCombat(target) {
    const detectionRange = 50; // 플레이어 감지 범위 (x축 거리)
    const canvasWidth = canvas.width || 800;
    
    // 악당이 화면 안에 있어야 전투 가능 (화면 밖에서는 전투하지 않음)
    if (target.x < -100 || target.x > canvasWidth + 100) {
        return false;
    }
    
    // 메인 플레이어 확인
    if (gameState.players.length > 0 && !gameState.players[0].isDead) {
        const dx = Math.abs(gameState.players[0].x - target.x);
        
        // 플레이어도 화면 안에 있어야 함
        if (gameState.players[0].x >= 0 && gameState.players[0].x <= canvasWidth) {
            if (dx < detectionRange) {
                return true;
            }
        }
    }
    
    // 추가 플레이어 확인
    for (let allyPlayer of gameState.allyPlayers) {
        if (allyPlayer.isDead) continue;
        
        const dx = Math.abs(allyPlayer.x - target.x);
        
        // 플레이어도 화면 안에 있어야 함
        if (allyPlayer.x >= 0 && allyPlayer.x <= canvasWidth) {
            if (dx < detectionRange) {
                return true;
            }
        }
    }
    
    return false;
}

// 타겟 업데이트
function updateTargets() {
    const now = Date.now();
    
    // 악당을 무한대로 계속 생성 (일정 간격으로)
    const spawnInterval = 2000 + Math.random() * 1000; // 2-3초마다 생성
    if (now - gameState.lastEnemySpawnTime > spawnInterval) {
        createNewEnemy();
        gameState.lastEnemySpawnTime = now;
    }
    
    for (let i = gameState.targets.length - 1; i >= 0; i--) {
        const target = gameState.targets[i];
        if (target.hit) continue; // 이미 맞은 타겟은 스킵
        
        target.rotation += target.rotationSpeed;
        
        // 플레이어가 범위 내에 있으면 멈춤, 없으면 이동
        // 상대방이 죽을 때까지 기다림
        // 단, 악당이 플레이어보다 왼쪽에 있으면 계속 이동 (오른쪽으로 가야 함)
        if (hasEnemyInCombat(target)) {
            // 플레이어가 있으면 멈춰서 공격만 함
            // 하지만 악당이 플레이어보다 왼쪽에 있으면 계속 이동
            let shouldMove = false;
            
            // 메인 플레이어 확인
            if (gameState.players.length > 0 && !gameState.players[0].isDead) {
                if (target.x < gameState.players[0].x - 50) {
                    shouldMove = true;
                }
            }
            
            // 추가 플레이어 확인
            if (!shouldMove) {
                for (let allyPlayer of gameState.allyPlayers) {
                    if (allyPlayer.isDead) continue;
                    if (target.x < allyPlayer.x - 50) {
                        shouldMove = true;
                        break;
                    }
                }
            }
            
            if (shouldMove) {
                target.x += target.vx;
            }
        } else {
            // 플레이어가 없으면 계속 이동
            target.x += target.vx;
        }
        
        // 악당이 플레이어를 향해 화살 발사
        if (now - target.lastShotTime > target.shotInterval) {
            shootEnemyArrow(target);
            target.lastShotTime = now;
            target.shotInterval = 3000 + Math.random() * 2000; // 다음 발사 시간 랜덤
        }
        
        // 화면 왼쪽을 지나치면 게임 오버 (악당 승리)
        if (target.x < -target.radius - 30) {
            // 악당이 왼쪽 끝을 통과하면 게임 오버
            gameState.gameOver = true;
            setTimeout(() => {
                endGame();
            }, 500);
            return;
        }
    }
}

// 악당 화살 업데이트
function updateEnemyArrows() {
    for (let i = gameState.enemyArrows.length - 1; i >= 0; i--) {
        const arrow = gameState.enemyArrows[i];
        
        if (arrow.hit) {
            gameState.enemyArrows.splice(i, 1);
            continue;
        }
        
        // 위치 업데이트
        arrow.x += arrow.vx;
        arrow.y += arrow.vy;
        arrow.vy += 0.3; // 중력
        
        // 화면 밖으로 나갔는지 확인
        if (arrow.x < 0 || arrow.x > canvas.width || 
            arrow.y < 0 || arrow.y > canvas.height) {
            gameState.enemyArrows.splice(i, 1);
            continue;
        }
        
        // 메인 플레이어와 충돌 확인 (메인 플레이어는 죽지 않음)
        if (gameState.players.length > 0 && !gameState.players[0].isDead) {
            const mainPlayer = gameState.players[0];
            const dx = arrow.x - mainPlayer.x;
            const dy = arrow.y - mainPlayer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 30) { // 충돌 범위
                // 메인 플레이어가 맞음 (하지만 죽지 않음)
                arrow.hit = true;
                
                // 파티클 효과만 표시 (HP 감소 없음)
                createParticles(mainPlayer.x, mainPlayer.y, '#FF0000');
                
                continue; // 다음 화살로
            }
        }
        
        // 추가 플레이어와 충돌 확인
        for (let allyPlayer of gameState.allyPlayers) {
            if (allyPlayer.isDead) continue;
            
            const dx = arrow.x - allyPlayer.x;
            const dy = arrow.y - allyPlayer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 30) { // 충돌 범위
                // 추가 플레이어가 맞음 (악당 화살은 1발만 맞아도 죽음)
                arrow.hit = true;
                allyPlayer.hp = 0; // 즉시 죽음
                allyPlayer.isDead = true;
                
                // 파티클 효과
                createParticles(allyPlayer.x, allyPlayer.y, '#FF0000');
                
                break;
            }
        }
    }
}

// 그리기 함수들
function drawPlayer() {
    // 메인 플레이어 그리기 (화면 하단 고정)
    for (let player of gameState.players) {
        // 죽은 플레이어는 그리지 않음
        if (player.isDead) continue;
        
        ctx.save();
        ctx.translate(player.x, player.y);
        
        // 체력에 따라 투명도 조절
        const alpha = player.hp / 3;
        ctx.globalAlpha = 0.5 + alpha * 0.5; // 체력이 낮을수록 투명
        
        // 플레이어 이미지 그리기 (회전 없이 고정)
        if (playerImage.complete && playerImage.naturalHeight !== 0) {
            const playerWidth = 60;
            const playerHeight = 80;
            ctx.drawImage(playerImage, -playerWidth / 2, -playerHeight / 2, playerWidth, playerHeight);
        } else {
            // 이미지가 로드되지 않았으면 빨간 네모로 표시
            const size = 40;
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(-size / 2, -size / 2, size, size);
        }
        
        ctx.globalAlpha = 1.0;
        ctx.restore();
    }
}

// 추가 플레이어 그리기 (왼쪽에서 오른쪽으로 이동)
function drawAllyPlayers() {
    for (let allyPlayer of gameState.allyPlayers) {
        // 죽은 플레이어는 그리지 않음
        if (allyPlayer.isDead) continue;
        
        ctx.save();
        ctx.translate(allyPlayer.x, allyPlayer.y);
        
        // 체력에 따라 투명도 조절
        const alpha = allyPlayer.hp / 3;
        ctx.globalAlpha = 0.5 + alpha * 0.5; // 체력이 낮을수록 투명
        
        // 추가 플레이어 이미지 그리기 (회전 없이 고정)
        if (playerImage.complete && playerImage.naturalHeight !== 0) {
            const playerWidth = 60;
            const playerHeight = 80;
            ctx.drawImage(playerImage, -playerWidth / 2, -playerHeight / 2, playerWidth, playerHeight);
        } else {
            // 이미지가 로드되지 않았으면 파란 네모로 표시
            const size = 40;
            ctx.fillStyle = '#0000FF';
            ctx.fillRect(-size / 2, -size / 2, size, size);
        }
        
        ctx.globalAlpha = 1.0;
        ctx.restore();
    }
}

function drawArrows() {
    // 플레이어 화살 그리기
    for (let arrow of gameState.arrows) {
        if (arrow.hit) continue;
        
        ctx.save();
        ctx.translate(arrow.x, arrow.y);
        ctx.rotate(arrow.angle);
        
        // 화살 그리기
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(arrow.length, 0);
        ctx.stroke();
        
        // 화살촉
        ctx.fillStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.moveTo(arrow.length, 0);
        ctx.lineTo(arrow.length - 5, -3);
        ctx.lineTo(arrow.length - 5, 3);
        ctx.closePath();
        ctx.fill();
        
        // 깃털
        ctx.fillStyle = '#FF6347';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-5, -3);
        ctx.lineTo(-5, 3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    // 악당 화살 그리기 (다른 색상으로 구분)
    for (let arrow of gameState.enemyArrows) {
        if (arrow.hit) continue;
        
        ctx.save();
        ctx.translate(arrow.x, arrow.y);
        ctx.rotate(arrow.angle);
        
        // 화살 그리기 (어두운 색상)
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(arrow.length, 0);
        ctx.stroke();
        
        // 화살촉
        ctx.fillStyle = '#808080';
        ctx.beginPath();
        ctx.moveTo(arrow.length, 0);
        ctx.lineTo(arrow.length - 5, -3);
        ctx.lineTo(arrow.length - 5, 3);
        ctx.closePath();
        ctx.fill();
        
        // 깃털 (어두운 색상)
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-5, -3);
        ctx.lineTo(-5, 3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
}

function drawTargets() {
    for (let target of gameState.targets) {
        if (target.hit) continue;
        
        ctx.save();
        ctx.translate(target.x, target.y);
        
        // 악당 이미지 그리기 (좌우 반전)
        if (enemyImage.complete && enemyImage.naturalHeight !== 0) {
            const enemySize = target.radius * 2;
            ctx.scale(-1, 1); // 좌우 반전
            ctx.drawImage(enemyImage, -enemySize / 2, -enemySize / 2, enemySize, enemySize);
        } else {
            // 이미지가 로드되지 않았으면 기존 방식으로 그리기
            const personHeight = target.radius * 1.2;
            const lineWidth = 3;
            
            // 머리
            ctx.fillStyle = target.color;
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -personHeight * 0.45, personHeight * 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // 몸통 (얇은 선)
            ctx.strokeStyle = target.color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(0, -personHeight * 0.35);
            ctx.lineTo(0, personHeight * 0.1);
            ctx.stroke();
            
            // 팔 (양쪽으로 뻗은 모양)
            ctx.strokeStyle = target.color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(0, -personHeight * 0.15);
            ctx.lineTo(-personHeight * 0.3, 0);
            ctx.moveTo(0, -personHeight * 0.15);
            ctx.lineTo(personHeight * 0.3, 0);
            ctx.stroke();
            
            // 다리 (얇은 선)
            ctx.strokeStyle = target.color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(0, personHeight * 0.1);
            ctx.lineTo(-personHeight * 0.15, personHeight * 0.4);
            ctx.moveTo(0, personHeight * 0.1);
            ctx.lineTo(personHeight * 0.15, personHeight * 0.4);
            ctx.stroke();
        }
        
        ctx.restore();
        
        // 점수 표시
        ctx.fillStyle = '#000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        const displayHeight = target.radius * 1.2;
        ctx.fillText(target.points, target.x, target.y - displayHeight * 0.6);
    }
}

function drawParticles() {
    for (let particle of gameState.particles) {
        const alpha = particle.life / 30;
        ctx.fillStyle = particle.color.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawBackground() {
    // 배경 이미지 그리기
    if (backgroundImage.complete && backgroundImage.naturalHeight !== 0) {
        // 이미지를 캔버스 크기에 맞게 스케일링
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
        // 이미지가 로드되지 않았으면 기존 그라데이션 배경 사용
        // 하늘
        const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.7);
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(1, '#B0E0E6');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height * 0.7);
        
        // 잔디밭 (하단 30%)
        const grassGradient = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
        grassGradient.addColorStop(0, '#7CB342');
        grassGradient.addColorStop(0.5, '#8BC34A');
        grassGradient.addColorStop(1, '#689F38');
        ctx.fillStyle = grassGradient;
        ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
        
        // 잔디 텍스처 (작은 잔디들)
        ctx.fillStyle = '#558B2F';
        for (let i = 0; i < 100; i++) {
            const x = (i * 37 + Date.now() * 0.02) % canvas.width;
            const y = canvas.height * 0.7 + Math.random() * canvas.height * 0.3;
            const height = 3 + Math.random() * 5;
            ctx.fillRect(x, y, 2, -height);
        }
        
        // 구름
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let i = 0; i < 3; i++) {
            const x = (i * 300 + Date.now() * 0.01) % (canvas.width + 150) - 75;
            const y = 40 + i * 40;
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
            ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// UI 업데이트
function updateUI() {
    scoreElement.textContent = gameState.score;
    levelElement.textContent = gameState.level;
    
    // 금액이 낮으면 빨간색으로 표시
    if (gameState.score <= 50) {
        scoreElement.parentElement.style.color = '#F44336';
    } else {
        scoreElement.parentElement.style.color = '#555';
    }
}

// 레벨 클리어 시 바로 상점 표시
function showLevelComplete() {
    gameState.gameOver = true; // 게임 일시정지
    showShop();
}

// 다음 레벨로 진행
function goToNextLevel() {
    shopOverlay.classList.remove('show');
    gameState.level++;
    // score는 초기화하지 않음 (계속 쌓임)
    gameState.gameOver = false;
    gameState.lastEnemySpawnTime = Date.now(); // 악당 생성 시간 초기화
    
    // 플레이어 재생성 (레벨에 따라 수가 변경됨)
    createPlayers();
    
    // 악당 배열은 유지 (무한대로 계속 생성되므로)
    // 기존 악당은 그대로 두고 계속 생성됨
    
    // 초기 추가 플레이어 생성
    const initialAllyCount = getTargetAllyPlayerCount(gameState.level);
    const currentAllyCount = gameState.allyPlayers.filter(p => !p.isDead).length;
    
    // 부족한 추가 플레이어 생성
    for (let i = currentAllyCount; i < initialAllyCount; i++) {
        createNewAllyPlayer();
    }
    
    updateUI();
    
    // 게임 루프 재시작
    if (!gameState.gameOver) {
        gameLoop();
    }
}

// 상점 표시
function showShop() {
    shopScoreElement.textContent = gameState.score;
    renderShopItems();
    shopOverlay.classList.add('show');
}

// 상점 아이템 렌더링
function renderShopItems() {
    shopItemsDiv.innerHTML = '';
    
    items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';
        
        const price = item.basePrice + (item.owned * item.basePrice * 0.8); // 구매할수록 더 비싸짐 (0.5 → 0.8)
        const canBuy = gameState.score >= price;
        const alreadyOwned = item.owned > 0; // 이미 구매한 아이템인지 확인
        
        // 빠른 발사는 강력한 화살을 먼저 구매해야 함
        let requiresPowerShot = false;
        let canBuyItem = canBuy;
        if (item.id === 'rapidFire' && !alreadyOwned) {
            const powerShotItem = items.find(i => i.id === 'powerShot');
            requiresPowerShot = !powerShotItem || powerShotItem.owned === 0;
            if (requiresPowerShot) {
                canBuyItem = false;
            }
        }
        
        itemDiv.innerHTML = `
            <div class="item-info">
                <h3>${item.name}</h3>
                <p>${item.description}</p>
                ${alreadyOwned ? `<p class="owned">✓ 구매 완료</p>` : ''}
                ${requiresPowerShot ? `<p class="requirement" style="color: #ff6b6b; font-size: 0.75em; margin-top: 5px;">⚠ 강력한 화살을 먼저 구매해야 합니다</p>` : ''}
            </div>
            <div class="item-price">
                ${alreadyOwned ? 
                    `<span class="price owned-price">구매 완료</span>
                     <button class="buy-btn" disabled>구매 완료</button>` :
                    `<span class="price">${Math.floor(price)}점</span>
                     <button class="buy-btn" ${!canBuyItem ? 'disabled' : ''} data-item-id="${item.id}" data-price="${price}">
                         구매
                     </button>`
                }
            </div>
        `;
        
        shopItemsDiv.appendChild(itemDiv);
    });
    
    // 구매 버튼 이벤트
    shopItemsDiv.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const itemId = btn.dataset.itemId;
            const price = parseFloat(btn.dataset.price);
            
            // 빠른 발사는 강력한 화살을 먼저 구매해야 함
            if (itemId === 'rapidFire') {
                const powerShotItem = items.find(i => i.id === 'powerShot');
                if (!powerShotItem || powerShotItem.owned === 0) {
                    alert('강력한 화살을 먼저 구매해야 합니다.');
                    return;
                }
            }
            
            if (gameState.score >= price) {
                gameState.score -= price;
                const item = items.find(i => i.id === itemId);
                item.owned++;
                gameState.items[itemId] = true;
                
                shopScoreElement.textContent = gameState.score;
                renderShopItems(); // 상점 새로고침
            }
        });
    });
}


// 게임 종료
function endGame() {
    gameState.gameOver = true;
    finalScoreElement.textContent = gameState.score;
    gameOverDiv.classList.add('show');
    hasStarted = false; // 다시 시작 가능하도록
    
    // 게임 오버 시 2초 후 1단계로 자동 초기화
    setTimeout(() => {
        gameOverDiv.classList.remove('show');
        init(); // 1단계로 리셋
    }, 2000);
}

// 게임 루프
function gameLoop() {
    if (gameState.gameOver) return;
    
    // 화면 지우기
    drawBackground();
    
    // 업데이트
    updatePlayer(); // 플레이어 이동
    updatePower();
    updateAllyPlayers(); // 추가 플레이어 업데이트
    updateTargets();
    updateEnemyArrows(); // 악당 화살 업데이트
    updateArrows();
    updateParticles();
    
    // 그리기
    drawTargets();
    drawAllyPlayers(); // 추가 플레이어 그리기
    drawArrows();
    drawPlayer();
    drawParticles();
    
    requestAnimationFrame(gameLoop);
}

// 다시 시작 버튼
restartBtn.addEventListener('click', () => {
    hasStarted = false;
    init();
});

// 스타트 로직
function startGame() {
    if (hasStarted) return;
    hasStarted = true;
    if (startOverlay) {
        startOverlay.classList.add('hide');
    }
    try {
        init();
    } catch (error) {
        console.error('게임 시작 오류:', error);
        hasStarted = false; // 에러 발생 시 다시 시작 가능하도록
    }
}

// 스타트 버튼 이벤트 리스너 (DOM 로드 후 실행)
function setupEventListeners() {
    if (startBtn) {
        startBtn.addEventListener('click', startGame);
        console.log('스타트 버튼 이벤트 리스너 등록됨');
    } else {
        console.error('스타트 버튼을 찾을 수 없습니다');
        // 버튼이 없을 경우 자동 시작
        setTimeout(() => {
            if (!hasStarted) {
                startGame();
            }
        }, 100);
    }
}

// DOM 로드 완료 후 이벤트 리스너 설정
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
    setupEventListeners();
}

// Enter 키로도 시작 가능
window.addEventListener('keydown', (e) => {
    if (!hasStarted && (e.key === 'Enter' || e.key === ' ')) {
        startGame();
    }
});

// 다음 레벨 버튼 이벤트
if (nextLevelBtn) {
    nextLevelBtn.addEventListener('click', goToNextLevel);
}

