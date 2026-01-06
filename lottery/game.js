// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const ballCountInput = document.getElementById('ball-count');
const pickCountInput = document.getElementById('pick-count');
const textInput = document.getElementById('text-input');
const startBtn = document.getElementById('start-btn');
const pickBtn = document.getElementById('pick-btn');
const resetBtn = document.getElementById('reset-btn');
const ballBox = document.getElementById('ball-box');
const resultArea = document.getElementById('result-area');
const resultTitle = document.getElementById('result-title');
const remainingPicksSpan = document.getElementById('remaining-picks');
const numberModeSettings = document.getElementById('number-mode-settings');
const textModeSettings = document.getElementById('text-mode-settings');
const normalModeSettings = document.getElementById('normal-mode-settings');
const prizeModeSettings = document.getElementById('prize-mode-settings');
const participantNumberSettings = document.getElementById('participant-number-settings');
const participantTextSettings = document.getElementById('participant-text-settings');
const prizePopup = document.getElementById('prize-popup');
const prizeNameSpan = document.getElementById('prize-name');
const popupConfirmBtn = document.getElementById('popup-confirm-btn');

// Radio button groups
const gameModeRadios = document.querySelectorAll('input[name="game-mode"]');
const ballModeRadios = document.querySelectorAll('input[name="ball-mode"]');
const participantModeRadios = document.querySelectorAll('input[name="participant-mode"]');

// Game State
let balls = [];
let pickedBalls = [];
let totalPicks = 0;
let remainingPicks = 0;
let animationFrameId = null;
let currentGameMode = 'normal'; // 'normal' or 'prize'
let currentBallMode = 'number';
let currentParticipantMode = 'number';
let ballLabels = [];
let ballVelocities = [];

// Prize mode specific
let prizes = [];
let remainingPrizes = [];
let currentPrize = null;
let prizeResults = [];

// Game mode switching
gameModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentGameMode = e.target.value;
        if (currentGameMode === 'normal') {
            normalModeSettings.classList.remove('hidden');
            prizeModeSettings.classList.add('hidden');
        } else {
            normalModeSettings.classList.add('hidden');
            prizeModeSettings.classList.remove('hidden');
        }
    });
});

// Ball mode switching (for normal mode)
ballModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentBallMode = e.target.value;
        if (currentBallMode === 'number') {
            numberModeSettings.classList.remove('hidden');
            textModeSettings.classList.add('hidden');
        } else {
            numberModeSettings.classList.add('hidden');
            textModeSettings.classList.remove('hidden');
        }
    });
});

// Participant mode switching (for prize mode)
participantModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentParticipantMode = e.target.value;
        if (currentParticipantMode === 'number') {
            participantNumberSettings.classList.remove('hidden');
            participantTextSettings.classList.add('hidden');
        } else {
            participantNumberSettings.classList.add('hidden');
            participantTextSettings.classList.remove('hidden');
        }
    });
});

// Start Game
startBtn.addEventListener('click', () => {
    if (currentGameMode === 'normal') {
        startNormalGame();
    } else {
        startPrizeGame();
    }
});

// Start Normal Game
function startNormalGame() {
    let ballCount;
    
    if (currentBallMode === 'number') {
        ballCount = parseInt(ballCountInput.value);
        
        if (ballCount < 2 || ballCount > 100) {
            alert('공 개수는 2~100 사이로 입력해주세요.');
            return;
        }
        
        ballLabels = [];
        for (let i = 1; i <= ballCount; i++) {
            ballLabels.push(String(i));
        }
    } else {
        const textValue = textInput.value.trim();
        if (!textValue) {
            alert('텍스트를 입력해주세요.');
            return;
        }
        
        ballLabels = textValue.split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        
        if (ballLabels.length < 2) {
            alert('최소 2개 이상의 항목을 입력해주세요.');
            return;
        }
        
        ballCount = ballLabels.length;
    }
    
    const pickCount = parseInt(pickCountInput.value);
    
    if (pickCount < 1 || pickCount > ballCount) {
        alert('뽑을 개수는 1~' + ballCount + ' 사이로 입력해주세요.');
        return;
    }
    
    totalPicks = pickCount;
    remainingPicks = pickCount;
    resultTitle.textContent = '뽑힌 공';
    
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    initGame();
}

// Start Prize Game
function startPrizeGame() {
    // Parse prizes
    const prizeValue = document.getElementById('prize-input').value.trim();
    if (!prizeValue) {
        alert('경품을 입력해주세요.');
        return;
    }
    
    prizes = prizeValue.split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    
    if (prizes.length < 1) {
        alert('최소 1개 이상의 경품을 입력해주세요.');
        return;
    }
    
    // Parse participants
    if (currentParticipantMode === 'number') {
        const participantCount = parseInt(document.getElementById('participant-count').value);
        
        if (participantCount < 2 || participantCount > 100) {
            alert('참여자 수는 2~100 사이로 입력해주세요.');
            return;
        }
        
        if (participantCount < prizes.length) {
            alert('참여자 수가 경품 수보다 적습니다.');
            return;
        }
        
        ballLabels = [];
        for (let i = 1; i <= participantCount; i++) {
            ballLabels.push(String(i));
        }
    } else {
        const participantValue = document.getElementById('participant-input').value.trim();
        if (!participantValue) {
            alert('참여자를 입력해주세요.');
            return;
        }
        
        ballLabels = participantValue.split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        
        if (ballLabels.length < prizes.length) {
            alert('참여자 수가 경품 수보다 적습니다.');
            return;
        }
    }
    
    // Initialize prize game
    remainingPrizes = [...prizes];
    prizeResults = [];
    totalPicks = prizes.length;
    remainingPicks = prizes.length;
    resultTitle.textContent = '당첨 결과';
    
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    initGame();
}

// Initialize Game
function initGame() {
    balls = [];
    pickedBalls = [];
    ballVelocities = [];
    ballBox.innerHTML = '';
    resultArea.innerHTML = '';
    updateRemainingPicks();
    pickBtn.disabled = false;
    
    const boxWidth = ballBox.clientWidth;
    const boxHeight = ballBox.clientHeight;
    const ballSize = window.innerWidth <= 600 ? 40 : 50;
    
    // Create balls
    ballLabels.forEach((label, index) => {
        const ball = document.createElement('div');
        ball.className = `ball ball-color-${index % 10}`;
        ball.textContent = label.length > 4 ? label.substring(0, 4) : label;
        ball.title = label;
        ball.dataset.label = label;
        ball.dataset.index = index;
        
        if (label.length > 2) {
            ball.style.fontSize = '0.7rem';
        }
        if (label.length > 3) {
            ball.style.fontSize = '0.6rem';
        }
        
        const x = Math.random() * (boxWidth - ballSize);
        const y = Math.random() * (boxHeight - ballSize);
        ball.style.left = x + 'px';
        ball.style.top = y + 'px';
        
        ballBox.appendChild(ball);
        balls.push({
            element: ball,
            label: label,
            index: index,
            x: x,
            y: y
        });
        
        ballVelocities.push({
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3
        });
    });
    
    startAnimation();
}

// Animation Loop
function startAnimation() {
    const boxWidth = ballBox.clientWidth;
    const boxHeight = ballBox.clientHeight;
    const ballSize = window.innerWidth <= 600 ? 40 : 50;
    
    function animate() {
        balls.forEach((ball, index) => {
            if (ball.element.classList.contains('picked')) return;
            
            let vel = ballVelocities[index];
            
            ball.x += vel.vx;
            ball.y += vel.vy;
            
            if (ball.x <= 0 || ball.x >= boxWidth - ballSize) {
                vel.vx *= -1;
                ball.x = Math.max(0, Math.min(ball.x, boxWidth - ballSize));
            }
            if (ball.y <= 0 || ball.y >= boxHeight - ballSize) {
                vel.vy *= -1;
                ball.y = Math.max(0, Math.min(ball.y, boxHeight - ballSize));
            }
            
            ball.element.style.left = ball.x + 'px';
            ball.element.style.top = ball.y + 'px';
        });
        
        animationFrameId = requestAnimationFrame(animate);
    }
    
    animate();
}

// Stop Animation
function stopAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// Pick button click handler
pickBtn.addEventListener('click', () => {
    if (remainingPicks <= 0) return;
    
    if (currentGameMode === 'prize') {
        // Prize mode: show prize popup first
        showPrizePopup();
    } else {
        // Normal mode: pick directly
        pickRandomBall();
    }
});

// Show prize popup
function showPrizePopup() {
    if (remainingPrizes.length === 0) return;
    
    // Pick random prize
    const prizeIndex = Math.floor(Math.random() * remainingPrizes.length);
    currentPrize = remainingPrizes[prizeIndex];
    remainingPrizes.splice(prizeIndex, 1);
    
    // Show popup
    prizeNameSpan.textContent = currentPrize;
    prizePopup.classList.remove('hidden');
}

// Popup confirm button
popupConfirmBtn.addEventListener('click', () => {
    prizePopup.classList.add('hidden');
    startDramaticSpin();
});

// Dramatic spin effect for prize mode
function startDramaticSpin() {
    pickBtn.disabled = true;
    
    // Speed up all balls dramatically
    ballVelocities.forEach(vel => {
        vel.vx = (Math.random() - 0.5) * 20;
        vel.vy = (Math.random() - 0.5) * 20;
    });
    
    // Add visual effect to ball box
    ballBox.classList.add('spinning');
    
    // Gradually slow down over time - faster for quick picks
    let spinDuration = 1200; // 1.2 seconds of spinning
    let slowDownStart = 600; // Start slowing down after 0.6 seconds
    let startTime = Date.now();
    
    function slowDown() {
        const elapsed = Date.now() - startTime;
        
        if (elapsed < slowDownStart) {
            // Keep spinning fast with random direction changes
            if (Math.random() < 0.15) {
                ballVelocities.forEach(vel => {
                    vel.vx += (Math.random() - 0.5) * 8;
                    vel.vy += (Math.random() - 0.5) * 8;
                });
            }
            requestAnimationFrame(slowDown);
        } else if (elapsed < spinDuration) {
            // Rapidly slow down
            ballVelocities.forEach(vel => {
                vel.vx *= 0.92;
                vel.vy *= 0.92;
            });
            
            requestAnimationFrame(slowDown);
        } else {
            // Spinning complete - pick the winner
            ballBox.classList.remove('spinning');
            
            // Reset to normal speed
            ballVelocities.forEach(vel => {
                vel.vx = (Math.random() - 0.5) * 3;
                vel.vy = (Math.random() - 0.5) * 3;
            });
            
            // Pick the winner
            pickRandomBallForPrize();
        }
    }
    
    slowDown();
}

// Pick random ball (normal mode)
function pickRandomBall() {
    const availableBalls = balls.filter(b => !b.element.classList.contains('picked'));
    if (availableBalls.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * availableBalls.length);
    const pickedBall = availableBalls[randomIndex];
    
    pickedBall.element.classList.add('picked');
    pickedBalls.push(pickedBall.label);
    
    setTimeout(() => {
        const resultBall = document.createElement('div');
        resultBall.className = `result-ball ball-color-${pickedBall.index % 10}`;
        resultBall.textContent = pickedBall.label;
        resultBall.title = pickedBall.label;
        
        if (pickedBall.label.length > 2) {
            resultBall.style.fontSize = '0.9rem';
        }
        if (pickedBall.label.length > 4) {
            resultBall.style.fontSize = '0.7rem';
        }
        
        resultArea.appendChild(resultBall);
    }, 300);
    
    remainingPicks--;
    updateRemainingPicks();
    
    if (remainingPicks <= 0) {
        pickBtn.disabled = true;
    }
}

// Pick random ball for prize
function pickRandomBallForPrize() {
    const availableBalls = balls.filter(b => !b.element.classList.contains('picked'));
    if (availableBalls.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * availableBalls.length);
    const pickedBall = availableBalls[randomIndex];
    
    pickedBall.element.classList.add('picked');
    pickedBalls.push(pickedBall.label);
    
    // Store prize result
    prizeResults.push({
        prize: currentPrize,
        winner: pickedBall.label
    });
    
    setTimeout(() => {
        // Create prize result item
        const resultItem = document.createElement('div');
        resultItem.className = 'prize-result-item';
        resultItem.innerHTML = `
            <span class="prize-name">${currentPrize}</span>
            <span class="arrow">→</span>
            <span class="winner-name">${pickedBall.label}</span>
        `;
        resultArea.appendChild(resultItem);
    }, 300);
    
    remainingPicks--;
    updateRemainingPicks();
    
    if (remainingPicks <= 0) {
        pickBtn.disabled = true;
    } else {
        pickBtn.disabled = false;  // 남은 경품 있으면 버튼 활성화
    }
}

// Update remaining picks display
function updateRemainingPicks() {
    if (currentGameMode === 'prize') {
        remainingPicksSpan.textContent = `남은 경품: ${remainingPicks}`;
    } else {
        remainingPicksSpan.textContent = `남은 뽑기: ${remainingPicks}`;
    }
}

// Reset Game
resetBtn.addEventListener('click', () => {
    stopAnimation();
    gameScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');
    prizePopup.classList.add('hidden');
    balls = [];
    pickedBalls = [];
    ballVelocities = [];
    ballLabels = [];
    prizes = [];
    remainingPrizes = [];
    prizeResults = [];
    currentPrize = null;
});

// Handle resize
window.addEventListener('resize', () => {
    if (!gameScreen.classList.contains('hidden') && balls.length > 0) {
        const boxWidth = ballBox.clientWidth;
        const boxHeight = ballBox.clientHeight;
        const ballSize = window.innerWidth <= 600 ? 40 : 50;
        
        balls.forEach(ball => {
            ball.x = Math.min(ball.x, boxWidth - ballSize);
            ball.y = Math.min(ball.y, boxHeight - ballSize);
            ball.element.style.left = ball.x + 'px';
            ball.element.style.top = ball.y + 'px';
        });
    }
});
