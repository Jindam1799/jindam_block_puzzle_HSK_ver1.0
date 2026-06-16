// ==========================================
// ★ 방향키 스크롤 방지 로직 ★
// ==========================================
window.addEventListener(
  'keydown',
  function (e) {
    if (
      ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(
        e.code,
      ) > -1
    ) {
      e.preventDefault();
    }
  },
  { passive: false },
);

// ==========================================
// ★ 오디오(BGM) 관리 시스템 ★
// ==========================================
const AUDIO_SOURCES = {
  intro: new Audio('intro.mp3'),
  leaderboard: new Audio('leaderboard.mp3'),
  normal: [
    'block_bgm.mp3',
    'block_bgm2.mp3',
    'block_bgm3.mp3',
    'block_bgm4.mp3',
  ].map((src) => new Audio(src)),
  hell: [
    'hell_bgm1.mp3',
    'hell_bgm2.mp3',
    'hell_bgm3.mp3',
    'hell_bgm4.mp3',
  ].map((src) => new Audio(src)),
};
let currentAudio = null;
let currentPlaylist = [];
let currentTrackIndex = 0;

function stopAllBGM() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
}

function playNextTrack() {
  currentAudio = currentPlaylist[currentTrackIndex];
  currentAudio.volume = 0.17;
  currentAudio.onended = () => {
    currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    playNextTrack();
  };
  currentAudio.play().catch((e) => console.log('Audio blocked.'));
}

function playBGM(type) {
  stopAllBGM();
  if (type === 'intro' || type === 'leaderboard') {
    currentAudio = AUDIO_SOURCES[type];
    currentAudio.volume = 0.17;
    currentAudio.loop = true;
    currentAudio.play().catch((e) => console.log('Audio blocked.'));
  } else {
    currentPlaylist = AUDIO_SOURCES[type];
    currentTrackIndex = Math.floor(Math.random() * currentPlaylist.length);
    playNextTrack();
  }
}

function initStartScreen() {
  const startScreen = document.getElementById('start-screen');
  if (startScreen.style.display !== 'none') {
    startScreen.style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'flex';
    playBGM('intro');
  }
}
document
  .getElementById('start-screen')
  .addEventListener('click', initStartScreen);
document.addEventListener('keydown', initStartScreen);

// ==========================================
// ★ 랭킹 (로컬스토리지) 6분할 시스템 ★
// ==========================================
let currentRankMode = 'normal';
let currentRankLevel = 'hsk4';

function saveRanking() {
  const nicknameInput = document.getElementById('nickname-input');
  const nickname = nicknameInput.value.trim();

  if (!nickname) {
    document.getElementById('alert-modal').classList.add('active');
    return;
  }

  const newRecord = {
    name: nickname,
    score: score,
    combo: maxComboThisRound,
    date: new Date().toLocaleDateString(),
    isPlayer: true,
  };

  const storageKey = `player_rankings_${gameMode}_${gameLevel}`;
  let playerRankings = JSON.parse(localStorage.getItem(storageKey)) || [];

  playerRankings.push(newRecord);
  playerRankings.sort((a, b) => b.score - a.score);
  playerRankings = playerRankings.slice(0, 50);

  localStorage.setItem(storageKey, JSON.stringify(playerRankings));

  document.getElementById('game-over-modal').classList.remove('active');
  showRankingScreen(gameMode, gameLevel);
}

function closeAlertModal() {
  document.getElementById('alert-modal').classList.remove('active');
  document.getElementById('nickname-input').focus();
}

function showRankingScreen(modeToOpen = 'normal', levelToOpen = 'hsk4') {
  document.getElementById('lobby-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('ranking-screen').style.display = 'flex';
  playBGM('leaderboard');

  currentRankMode = modeToOpen;
  currentRankLevel = levelToOpen;
  renderRankingList();
}

function changeRankMode(mode) {
  currentRankMode = mode;
  renderRankingList();
}
function changeRankLevel(level) {
  currentRankLevel = level;
  renderRankingList();
}

const AI_RIVALS = {
  normal: [
    { name: '제갈공명', baseScore: 85000, combo: 24, isPlayer: false },
    { name: '이소룡', baseScore: 72000, combo: 18, isPlayer: false },
  ],
  hell: [
    { name: '사마의', baseScore: 250000, combo: 35, isPlayer: false },
    { name: '진시황', baseScore: 210000, combo: 28, isPlayer: false },
  ],
};

function growAIRivals(mode, level) {
  const storageKey = `ai_rivals_${mode}_${level}`;
  let rivals = JSON.parse(localStorage.getItem(storageKey));

  if (!rivals) {
    rivals = AI_RIVALS[mode].map((r) => ({ ...r, currentScore: r.baseScore }));
  } else {
    let playerRankings =
      JSON.parse(localStorage.getItem(`player_rankings_${mode}_${level}`)) ||
      [];
    let playerBestScore =
      playerRankings.length > 0 ? playerRankings[0].score : 0;

    rivals.forEach((r, index) => {
      let playChance = 0;
      let scoreIncrease = 0;
      if (index === 0) {
        playChance = r.currentScore > playerBestScore ? 0.1 : 0.4;
        scoreIncrease = (Math.floor(Math.random() * 500) + 250) * 10;
      } else {
        playChance = r.currentScore > playerBestScore ? 0.15 : 0.3;
        scoreIncrease = (Math.floor(Math.random() * 300) + 150) * 10;
      }
      if (Math.random() < playChance) {
        r.currentScore += scoreIncrease;
        if (Math.random() < 0.05) r.combo += 1;
      }
    });
  }
  localStorage.setItem(storageKey, JSON.stringify(rivals));
}

function getAIRivals(mode, level) {
  const storageKey = `ai_rivals_${mode}_${level}`;
  let rivals = JSON.parse(localStorage.getItem(storageKey));
  if (!rivals) {
    rivals = AI_RIVALS[mode].map((r) => ({ ...r, currentScore: r.baseScore }));
    localStorage.setItem(storageKey, JSON.stringify(rivals));
  }
  return rivals.map((r) => ({
    name: r.name,
    score: r.currentScore,
    combo: r.combo,
    isPlayer: false,
  }));
}

function renderRankingList() {
  document
    .getElementById('tab-normal')
    .classList.toggle('active', currentRankMode === 'normal');
  document
    .getElementById('tab-hell')
    .classList.toggle('active', currentRankMode === 'hell');
  document
    .getElementById('tab-rank-hsk4')
    .classList.toggle('active', currentRankLevel === 'hsk4');
  document
    .getElementById('tab-rank-hsk5')
    .classList.toggle('active', currentRankLevel === 'hsk5');
  document
    .getElementById('tab-rank-hsk6')
    .classList.toggle('active', currentRankLevel === 'hsk6');

  const listEl = document.getElementById('ranking-list');
  listEl.innerHTML = '';

  const storageKey = `player_rankings_${currentRankMode}_${currentRankLevel}`;
  let playerRankings = JSON.parse(localStorage.getItem(storageKey)) || [];
  let aiRankings = getAIRivals(currentRankMode, currentRankLevel);

  let combinedRankings = [...playerRankings, ...aiRankings];
  combinedRankings.sort((a, b) => b.score - a.score);
  combinedRankings = combinedRankings.slice(0, 15);

  if (combinedRankings.length === 0) {
    listEl.innerHTML =
      "<li style='text-align:center; padding: 20px; color: #888;'>등록된 랭킹이 없습니다.</li>";
    return;
  }

  combinedRankings.forEach((record, index) => {
    const li = document.createElement('li');
    li.className = 'ranking-item';
    let rankColor =
      index === 0
        ? '#ffd700'
        : index === 1
          ? '#c0c0c0'
          : index === 2
            ? '#cd7f32'
            : '#fff';
    const nameColor = record.isPlayer ? '#00ffcc' : '#e0e0e0';
    const nameShadow = record.isPlayer
      ? 'text-shadow: 0 0 10px #00ffcc;'
      : 'text-shadow: 0 0 5px rgba(255,255,255,0.4);';
    li.innerHTML = `<div><span style="display:inline-block; width: 35px; color:${rankColor}; font-weight:900; font-size:15pt;">${index + 1}.</span> <span style="font-size: 13pt; font-weight: bold; color: ${nameColor}; ${nameShadow}">${record.name}</span></div><div class="rank-info"><span class="rank-score" style="color:${rankColor};">${record.score.toLocaleString()} 점</span><span class="rank-combo">MAX ${record.combo} COMBO</span></div>`;
    listEl.appendChild(li);
  });
}

function returnToLobby() {
  document.getElementById('ranking-screen').style.display = 'none';
  document.getElementById('lobby-screen').style.display = 'flex';
  playBGM('intro');
}

let pendingGameMode = '';
let gameLevel = 'hsk4';

function openHSKModal(mode) {
  pendingGameMode = mode;
  document.getElementById('hsk-modal').classList.add('active');
  if (mode === 'hell') {
    document.getElementById('hsk-modal-title').innerText =
      'HELL 🔥: 도전할 급수를 선택하라';
    document.getElementById('hsk-modal-title').style.color = '#ff3333';
  } else {
    document.getElementById('hsk-modal-title').innerText =
      'NORMAL: 도전할 급수를 선택하라';
    document.getElementById('hsk-modal-title').style.color = '#00ffcc';
  }
}

function closeHSKModal() {
  document.getElementById('hsk-modal').classList.remove('active');
}

function selectHSK(level) {
  gameLevel = level;
  closeHSKModal();
  startGame(pendingGameMode, gameLevel);
}

// ==========================================
// ★ 게임 코어 변수 및 블록 데이터 ★
// ==========================================
const BOARD_SIZE = 8;
let board = Array(BOARD_SIZE)
  .fill(null)
  .map(() => Array(BOARD_SIZE).fill(0));
let score = 0;
let currentDockBlocks = [null, null, null];
let activeDragIndex = null;
let isDragging = false;
let gameMode = 'normal';
let currentCombo = 0;
let maxComboThisRound = 0;
let linesClearedThisRound = 0;

// ★ 특수 기능 관련 변수 ★
let isSpecialBlockSpawned = false;
let nextQuizIsBonus = false;
let playerItems = { bomb: 0, reroll: 0, doubleScore: 0 };
let isBombActive = false;
let isDoubleScoreActive = false;
let isGameLocked = false; // ★ 화면 이펙트 중 블록 터치 방지용 잠금 변수 추가
let currentQuiz = null;
let availableQuizzes = [];

const GOOD_BLOCKS = [
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  [
    [1, 1],
    [1, 1],
  ],
  [[1, 1, 1]],
  [[1], [1], [1]],
  [
    [1, 1, 1],
    [1, 1, 1],
  ],
  [
    [1, 1],
    [1, 1],
    [1, 1],
  ],
];
const NORMAL_BLOCKS = [
  [
    [1, 1],
    [0, 1],
  ],
  [
    [1, 1],
    [1, 0],
  ],
  [
    [0, 1],
    [1, 1],
  ],
  [
    [1, 0],
    [1, 1],
  ],
  [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
  [
    [1, 1, 1],
    [0, 1, 0],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 0],
  ],
  [
    [0, 1],
    [1, 1],
    [0, 1],
  ],
  [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  [[1, 1, 1, 1, 1]],
  [[1], [1], [1], [1], [1]],
  [
    [1, 1, 1],
    [1, 0, 0],
  ],
  [
    [1, 1, 1],
    [0, 0, 1],
  ],
  [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 1],
    [1, 1],
    [1, 0],
  ],
  [
    [1, 0],
    [1, 1],
    [0, 1],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
];
const HARD_BLOCKS = [
  [
    [1, 1, 1],
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 0],
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 1, 1],
    [0, 1, 0],
    [0, 1, 0],
  ],
  [
    [1, 0, 0],
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [1, 1, 1],
    [1, 0, 0],
    [1, 0, 0],
  ],
  [
    [1, 1, 1],
    [0, 0, 1],
    [0, 0, 1],
  ],
  [
    [1, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 1],
  ],
  [
    [1, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1, 1],
    [0, 1, 1],
  ],
];
// ==========================================
// ★ 초기화 및 메인 게임 루프 (이펙트 리셋 보강) ★
// ==========================================
function startGame(mode, level) {
  gameMode = mode;
  gameLevel = level;

  const gameContainer = document.getElementById('game-container');

  document.getElementById('lobby-screen').style.display = 'none';
  if (gameContainer) gameContainer.style.display = 'flex';

  document.body.className = '';
  document.body.classList.add(`theme-${mode}`);
  document.body.classList.add(`theme-${level}`);

  const levelText = level.toUpperCase().replace('HSK', 'HSK ');
  if (mode === 'hell') {
    document.getElementById('mode-display').innerText =
      `HELL 🔥 [${levelText}]`;
    document.getElementById('mode-display').style.color = '#ff003c';
  } else {
    document.getElementById('mode-display').innerText = `NORMAL [${levelText}]`;
    document.getElementById('mode-display').style.color = '#00ffcc';
  }

  playBGM(mode);
  const boardWrapper = document.getElementById('board-wrapper');
  if (boardWrapper) boardWrapper.style.filter = 'none';

  board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(0));

  // 1. 내부 변수 완전 초기화
  isSpecialBlockSpawned = false;
  nextQuizIsBonus = false;
  playerItems = { bomb: 0, reroll: 0, doubleScore: 0 };
  isBombActive = false;
  isDoubleScoreActive = false;
  isGameLocked = false;

  // ★ 2. 이전 게임의 시각적 이펙트 잔재 완벽 청소 ★
  if (gameContainer) {
    gameContainer.classList.remove('double-score-persistent');
    gameContainer.classList.remove('double-score-flash');
    gameContainer.classList.remove('bomb-shake-active');
    gameContainer.classList.remove('shake-active');
  }

  updateInventoryUI();
  score = 0;
  currentCombo = 0;
  maxComboThisRound = 0;
  linesClearedThisRound = 0;

  availableQuizzes = [];

  initBoardHTML();
  generateDockBlocks();
  setupTouchEvents();
}

function initBoardHTML() {
  const boardEl = document.getElementById('grid-board');
  boardEl.innerHTML = '';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cellEl = document.createElement('div');
      cellEl.className = 'grid-cell';
      cellEl.id = `cell-${r}-${c}`;

      // ★ 폭탄 이벤트 바인딩 ★
      cellEl.onmouseover = () => handleBombHover(r, c, true);
      cellEl.onmouseout = () => handleBombHover(r, c, false);
      cellEl.onclick = () => handleCellClickForBomb(r, c);

      boardEl.appendChild(cellEl);
    }
  }
  renderBoard();
}

function renderBoard() {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cellEl = document.getElementById(`cell-${r}-${c}`);
      cellEl.className = 'grid-cell';
      cellEl.innerText = '';
      cellEl.style.fontSize = '';
      cellEl.style.display = '';
      cellEl.style.justifyContent = '';
      cellEl.style.alignItems = '';

      const val = board[r][c];

      if (val >= 1 && val <= 4) {
        cellEl.classList.add(`color-${val}`);

        if (val === 4) {
          // 보너스 블록
          cellEl.innerText = '🎁';
          cellEl.style.fontSize = '24px';
          cellEl.style.display = 'flex';
          cellEl.style.justifyContent = 'center';
          cellEl.style.alignItems = 'center';
        }
      } else if (val >= 11) {
        cellEl.classList.add('cell-obstacle');
        cellEl.innerText = val - 10;
      }
    }
  }
  document.getElementById('score').innerText = score;
}

// ==========================================
// ★ 특수 및 방해 블록 등장 시스템 ★
// ==========================================
function spawnObstacleStone(mode) {
  let totalToSpawn = mode === 'hell' ? Math.floor(Math.random() * 6) + 1 : 1;
  let spawned = 0;
  let newlySpawnedCells = [];

  while (spawned < totalToSpawn) {
    let emptyCells = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++)
        if (board[r][c] === 0) emptyCells.push({ r, c });
    }
    if (emptyCells.length === 0) break;

    let clusterSize = Math.floor(Math.random() * (totalToSpawn - spawned)) + 1;
    let startCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    let cluster = [startCell];
    let visited = new Set();
    visited.add(`${startCell.r},${startCell.c}`);
    let queue = [startCell];

    while (cluster.length < clusterSize && queue.length > 0) {
      let curr = queue.shift();
      let neighbors = [
        { r: curr.r - 1, c: curr.c },
        { r: curr.r + 1, c: curr.c },
        { r: curr.r, c: curr.c - 1 },
        { r: curr.r, c: curr.c + 1 },
      ].filter(
        (n) =>
          n.r >= 0 &&
          n.r < BOARD_SIZE &&
          n.c >= 0 &&
          n.c < BOARD_SIZE &&
          board[n.r][n.c] === 0 &&
          !visited.has(`${n.r},${n.c}`),
      );
      neighbors.sort(() => Math.random() - 0.5);
      for (let n of neighbors) {
        visited.add(`${n.r},${n.c}`);
        cluster.push(n);
        queue.push(n);
        if (cluster.length >= clusterSize) break;
      }
    }
    for (let cell of cluster) {
      let durability = Math.floor(Math.random() * 2) + 2;
      board[cell.r][cell.c] = 10 + durability;
      newlySpawnedCells.push(cell);
      spawned++;
    }
  }

  renderBoard();

  if (newlySpawnedCells.length > 0) {
    playObstacleSpawnSound();
    const gameContainer = document.getElementById('game-container');
    gameContainer.classList.add('shake-active');
    setTimeout(() => gameContainer.classList.remove('shake-active'), 400);

    newlySpawnedCells.forEach((pos) => {
      const cellEl = document.getElementById(`cell-${pos.r}-${pos.c}`);
      if (cellEl) {
        cellEl.classList.add('obstacle-spawn-anim');
        setTimeout(() => cellEl.classList.remove('obstacle-spawn-anim'), 600);
      }
    });
  }
}

function generateDockBlocks() {
  let colorPool = [1, 2, 3].sort(() => Math.random() - 0.5);
  let normalChance = 0;
  let hardChance = 0;

  if (gameMode === 'normal') {
    normalChance = 0.05;
    hardChance = 0.0;
    if (currentCombo >= 11) {
      let increase = (currentCombo - 10) * 0.01;
      normalChance += increase;
      hardChance += increase;
    }
  } else if (gameMode === 'hell') {
    normalChance = 0.15;
    hardChance = 0.0;
    if (currentCombo >= 11) {
      let increase = (currentCombo - 10) * 0.01;
      normalChance += increase;
      hardChance += increase;
    }
  }

  if (normalChance + hardChance > 1.0) {
    let over = normalChance + hardChance - 1.0;
    normalChance -= over / 2;
    hardChance -= over / 2;
  }

  for (let i = 0; i < 3; i++) {
    const rand = Math.random();
    let poolToUse =
      rand < hardChance
        ? HARD_BLOCKS
        : rand < hardChance + normalChance
          ? NORMAL_BLOCKS
          : GOOD_BLOCKS;
    const blockMatrix = JSON.parse(
      JSON.stringify(poolToUse[Math.floor(Math.random() * poolToUse.length)]),
    );
    currentDockBlocks[i] = { matrix: blockMatrix, colorVal: colorPool[i] };
    renderDockSlot(i);
  }

  spawnBonusBlockOnBoard();
  checkGameOverCondition();
}

function spawnBonusBlockOnBoard() {
  let hasBonus = false;
  let emptyCells = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 4) hasBonus = true;
      if (board[r][c] === 0) emptyCells.push({ r, c });
    }
  }

  if (hasBonus || emptyCells.length === 0 || Math.random() >= 0.25) return;

  let randCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  board[randCell.r][randCell.c] = 4;

  renderBoard();

  playBonusSpawnSound();
  const bonusCellEl = document.getElementById(
    `cell-${randCell.r}-${randCell.c}`,
  );
  if (bonusCellEl) {
    bonusCellEl.classList.add('bonus-spawn-anim');
    setTimeout(() => bonusCellEl.classList.remove('bonus-spawn-anim'), 800);
  }
}

function renderDockSlot(slotIndex) {
  const slotEl = document.getElementById(`slot-${slotIndex}`);
  slotEl.innerHTML = '';
  const blockData = currentDockBlocks[slotIndex];
  if (!blockData) return;
  const table = document.createElement('div');
  table.className = 'preview-matrix';
  blockData.matrix.forEach((row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'preview-row';
    row.forEach((cell) => {
      const cellEl = document.createElement('div');
      cellEl.className = 'preview-cell';
      if (cell === 1) cellEl.classList.add(`color-${blockData.colorVal}`);
      rowEl.appendChild(cellEl);
    });
    table.appendChild(rowEl);
  });
  slotEl.appendChild(table);
}

// ==========================================
// ★ 드래그 앤 드롭 시스템 (잠금 로직 포함) ★
// ==========================================
function setupTouchEvents() {
  const dockSlots = document.querySelectorAll('.dock-slot');
  const overlay = document.getElementById('drag-overlay');
  // ★ 드래그 최적화용 변수 2개
  let dragRAF = null;
  let lastShadowKey = null;

  function updateDragPosition(clientX, clientY) {
    if (!isDragging) return { topLeftX: 0, topLeftY: 0 };
    const overlayRect = overlay.getBoundingClientRect();
    const centerX = clientX;
    const centerY = clientY - 40;

    // ★ 모바일 렉의 주범(top/left)을 지우고 GPU 가속(transform)으로 교체
    const x = centerX - overlayRect.width / 2;
    const y = centerY - overlayRect.height / 2;
    overlay.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    const topLeftX = x + 20;
    const topLeftY = y + 20;

    // ★ 블록이 가리키는 '칸'이 바뀌었을 때만 그림자를 다시 그림 (연산량 90% 감소)
    const targetCell = findBoardCellAtPos(topLeftX, topLeftY);
    const targetKey = targetCell ? `${targetCell.r}-${targetCell.c}` : 'none';

    if (lastShadowKey !== targetKey) {
      lastShadowKey = targetKey;
      drawShadow(topLeftX, topLeftY);
    }

    return { topLeftX, topLeftY };
  }

  function handleStart(clientX, clientY, slot) {
    if (isGameLocked || isBombActive) return;

    const slotIndex = parseInt(slot.getAttribute('data-slot'));
    if (!currentDockBlocks[slotIndex]) return;

    activeDragIndex = slotIndex;
    isDragging = true;
    lastShadowKey = null; // 초기화

    createDragOverlayStyle(currentDockBlocks[slotIndex]);

    // transform 기준점 0으로 고정
    overlay.style.top = '0px';
    overlay.style.left = '0px';
    overlay.style.display = 'block';

    requestAnimationFrame(() => updateDragPosition(clientX, clientY));
  }

  function handleMove(clientX, clientY) {
    // 60프레임 동기화 (스로틀링)
    if (dragRAF) cancelAnimationFrame(dragRAF);
    dragRAF = requestAnimationFrame(() => {
      updateDragPosition(clientX, clientY);
    });
  }

  function handleEnd(clientX, clientY) {
    if (!isDragging) return;
    const { topLeftX, topLeftY } = updateDragPosition(clientX, clientY);

    isDragging = false;
    lastShadowKey = null; // 초기화
    overlay.style.display = 'none';
    clearShadow();

    const targetCell = findBoardCellAtPos(topLeftX, topLeftY);
    if (targetCell) {
      const { r, c } = targetCell;
      const blockData = currentDockBlocks[activeDragIndex];
      if (canPlaceBlock(r, c, blockData.matrix)) {
        placeBlock(r, c, blockData.matrix, blockData.colorVal);
        currentDockBlocks[activeDragIndex] = null;
        renderDockSlot(activeDragIndex);

        clearFullLines(() => {
          if (currentDockBlocks.every((b) => b === null)) {
            if (linesClearedThisRound === 0) {
              currentCombo = 0;
              isDoubleScoreActive = false;
              document
                .getElementById('game-container')
                .classList.remove('double-score-persistent');
            }
            linesClearedThisRound = 0;
            isGameLocked = true;
            setTimeout(() => triggerNewQuiz(), 300);
          } else {
            checkGameOverCondition();
          }
        });
      }
    }
    activeDragIndex = null;
  }

  dockSlots.forEach((slot) => {
    slot.addEventListener(
      'touchstart',
      (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY, slot),
      { passive: false },
    );
    slot.addEventListener('mousedown', (e) =>
      handleStart(e.clientX, e.clientY, slot),
    );
  });
  window.addEventListener(
    'touchmove',
    (e) => {
      if (isDragging) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    { passive: false },
  );
  window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
  window.addEventListener('touchend', (e) =>
    handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY),
  );
  window.addEventListener('mouseup', (e) => handleEnd(e.clientX, e.clientY));
}

function clearShadow() {
  document
    .querySelectorAll('.cell-shadow')
    .forEach((el) => el.classList.remove('cell-shadow'));
}

function drawShadow(topLeftX, topLeftY) {
  clearShadow();
  if (activeDragIndex === null) return;
  const targetCell = findBoardCellAtPos(topLeftX, topLeftY);
  if (!targetCell) return;
  const { r, c } = targetCell;
  const blockData = currentDockBlocks[activeDragIndex];
  if (canPlaceBlock(r, c, blockData.matrix)) {
    for (let row = 0; row < blockData.matrix.length; row++) {
      for (let col = 0; col < blockData.matrix[row].length; col++) {
        if (blockData.matrix[row][col] === 1) {
          const cellEl = document.getElementById(`cell-${r + row}-${c + col}`);
          if (cellEl) cellEl.classList.add('cell-shadow');
        }
      }
    }
  }
}

function createDragOverlayStyle(blockData) {
  const overlay = document.getElementById('drag-overlay');
  overlay.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'drag-block-table';
  blockData.matrix.forEach((row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'drag-row';
    row.forEach((cell) => {
      const cellEl = document.createElement('div');
      cellEl.className = 'drag-cell';
      cellEl.style.width = '40px';
      cellEl.style.height = '40px';
      if (cell === 1) cellEl.classList.add(`color-${blockData.colorVal}`);
      cellEl.style.opacity = cell === 1 ? '1' : '0';
      rowEl.appendChild(cellEl);
    });
    container.appendChild(rowEl);
  });
  overlay.appendChild(container);
}

function findBoardCellAtPos(x, y) {
  const boardEl = document.getElementById('grid-board');
  const rect = boardEl.getBoundingClientRect();
  if (
    x < rect.left - 20 ||
    x > rect.right + 20 ||
    y < rect.top - 20 ||
    y > rect.bottom + 20
  )
    return null;
  const cellW = rect.width / BOARD_SIZE;
  const cellH = rect.height / BOARD_SIZE;
  let c = Math.floor((x - rect.left) / cellW);
  let r = Math.floor((y - rect.top) / cellH);
  c = Math.max(0, Math.min(c, BOARD_SIZE - 1));
  r = Math.max(0, Math.min(r, BOARD_SIZE - 1));
  return { r, c };
}

function canPlaceBlock(startR, startC, matrix) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === 1) {
        const tr = startR + r;
        const tc = startC + c;
        if (
          tr < 0 ||
          tr >= BOARD_SIZE ||
          tc < 0 ||
          tc >= BOARD_SIZE ||
          board[tr][tc] !== 0
        )
          return false;
      }
    }
  }
  return true;
}

function placeBlock(startR, startC, matrix, colorVal) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === 1) {
        board[startR + r][startC + c] = colorVal;
        score += 10;
      }
    }
  }
  renderBoard();
}

// ==========================================
// ★ 줄 제거 및 이펙트 최적화 로직 ★
// ==========================================
function clearFullLines(onComplete) {
  let rowsToClear = [];
  let colsToClear = [];
  for (let r = 0; r < BOARD_SIZE; r++)
    if (board[r].every((cell) => cell !== 0)) rowsToClear.push(r);
  for (let c = 0; c < BOARD_SIZE; c++) {
    let isFull = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r][c] === 0) {
        isFull = false;
        break;
      }
    }
    if (isFull) colsToClear.push(c);
  }
  const totalCleared = rowsToClear.length + colsToClear.length;

  if (totalCleared > 0) {
    playClearSound();

    let previousCombo = currentCombo;
    currentCombo += totalCleared;
    maxComboThisRound = Math.max(maxComboThisRound, currentCombo);
    linesClearedThisRound += totalCleared;

    let shakeIntensity = 1 + currentCombo * 0.5;
    document.documentElement.style.setProperty(
      '--shake-int',
      Math.min(shakeIntensity, 6),
    );

    // ★ 최적화 1: 화면 흔들림 강제 리플로우 제거
    const gameContainer = document.getElementById('game-container');
    gameContainer.classList.remove('shake-active');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        gameContainer.classList.add('shake-active');
        setTimeout(() => gameContainer.classList.remove('shake-active'), 400);
      });
    });

    if (currentCombo >= 10) {
      // ★ 최적화 2: 번쩍임 이펙트 강제 리플로우 제거
      const flash = document.getElementById('light-flash-overlay');
      flash.classList.remove('flash-active');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          flash.classList.add('flash-active');
          setTimeout(() => flash.classList.remove('flash-active'), 600);
        });
      });
    }

    let normalCells = [];
    let damagedObstacles = [];
    let hitCells = new Set();
    rowsToClear.forEach((r) => {
      for (let c = 0; c < BOARD_SIZE; c++) hitCells.add(`${r},${c}`);
    });
    colsToClear.forEach((c) => {
      for (let r = 0; r < BOARD_SIZE; r++) hitCells.add(`${r},${c}`);
    });
    hitCells.forEach((pos) => {
      let [r, c] = pos.split(',').map(Number);
      if (board[r][c] >= 11) damagedObstacles.push({ r, c });
      else if (board[r][c] > 0) normalCells.push({ r, c });
    });

    normalCells.forEach((pos) =>
      document
        .getElementById(`cell-${pos.r}-${pos.c}`)
        .classList.add('cell-explode'),
    );
    damagedObstacles.forEach((pos) =>
      document
        .getElementById(`cell-${pos.r}-${pos.c}`)
        .classList.add('cell-damage'),
    );

    setTimeout(() => {
      normalCells.forEach((pos) => {
        if (board[pos.r][pos.c] === 4) nextQuizIsBonus = true;
        board[pos.r][pos.c] = 0;
      });
      damagedObstacles.forEach((pos) => {
        board[pos.r][pos.c] -= 1;
        if (board[pos.r][pos.c] <= 10) board[pos.r][pos.c] = 0;
      });

      const baseScore = gameMode === 'hell' ? 300 : 150;
      let earnedScore = totalCleared * baseScore * currentCombo;

      if (isDoubleScoreActive) {
        earnedScore *= 2;
        document.getElementById('combo-display').innerHTML +=
          '<br><span style="color:#ff00ff; font-size:14pt;">x2 버프 유지 중!</span>';
      }

      score += earnedScore;

      showComboEffect(totalCleared, currentCombo);
      playSequentialComboSounds(previousCombo + 1, totalCleared);

      let isAllClear = true;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (board[r][c] > 0) {
            isAllClear = false;
            break;
          }
        }
        if (!isAllClear) break;
      }
      if (isAllClear) {
        score += 1000;
        showAllClearEffect();
      }

      renderBoard();
      if (onComplete) onComplete();
    }, 300);
  } else {
    if (onComplete) onComplete();
  }
}

function showComboEffect(linesCleared, finalCombo) {
  const comboEl = document.getElementById('combo-display');
  let bonusText =
    linesCleared > 1
      ? `<span class="bonus-lines">+${linesCleared} LINES!</span>`
      : '';
  comboEl.innerHTML = `${bonusText}${finalCombo} COMBO!`;

  // ★ 최적화 3: 콤보 텍스트 팝업 강제 리플로우 제거
  comboEl.classList.remove('show');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      comboEl.classList.add('show');
      setTimeout(() => comboEl.classList.remove('show'), 1200);
    });
  });
}

function showAllClearEffect() {
  const acEl = document.getElementById('all-clear-display');
  // ★ 최적화 4: 올클리어 팝업 강제 리플로우 제거
  acEl.classList.remove('show');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      acEl.classList.add('show');
      setTimeout(() => acEl.classList.remove('show'), 2000);
    });
  });

  const flash = document.getElementById('light-flash-overlay');
  flash.classList.remove('flash-active');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flash.classList.add('flash-active');
      setTimeout(() => flash.classList.remove('flash-active'), 600);
    });
  });
}
// ==========================================
// ★ 게임 오버 조건 체크 (버튼 강제 생성 로직 포함) ★
// ==========================================
function checkGameOverCondition() {
  let activeBlocksCount = 0;
  let placeableBlocksCount = 0;
  for (let i = 0; i < 3; i++) {
    const blockData = currentDockBlocks[i];
    if (blockData) {
      activeBlocksCount++;
      let canBePlacedAnywhere = false;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (canPlaceBlock(r, c, blockData.matrix)) {
            canBePlacedAnywhere = true;
            break;
          }
        }
        if (canBePlacedAnywhere) break;
      }
      if (canBePlacedAnywhere) placeableBlocksCount++;
    }
  }

  // 블록은 남아있는데 더 이상 둘 곳이 없는 경우
  if (activeBlocksCount > 0 && placeableBlocksCount === 0) {
    growAIRivals(gameMode, gameLevel);

    const boardWrapper = document.getElementById('board-wrapper');
    if (boardWrapper) {
      boardWrapper.style.transition = 'all 1s ease';
      boardWrapper.style.filter = 'grayscale(0.6) brightness(0.5)';
    }

    const comboEl = document.getElementById('combo-display');
    comboEl.innerHTML = `<span style="color: #ff003c; text-shadow: 0 0 15px #ff003c; font-size: 26pt; font-weight: 900;">배치 불가!<br><span style="font-size: 16pt; color: #fff;">NO SPACE</span></span>`;
    comboEl.classList.add('show');

    setTimeout(() => {
      playBGM('leaderboard');
      comboEl.classList.remove('show');

      const gameOverModal = document.getElementById('game-over-modal');
      // ★ JS에서 게임 오버 모달의 전체 내용을 강제로 덮어씌웁니다 (로비로 나가기 버튼 포함) ★
      gameOverModal.innerHTML = `
        <div class="modal-content">
            <h2 style="color: #ff3333; font-size: 30pt; margin-bottom: 10px;">GAME OVER</h2>
            <p id="game-over-stats" style="font-size: 16pt; margin-bottom: 20px;">
                모드: <strong style="color:#ff00ff;">${gameMode.toUpperCase()}</strong><br>
                최종 점수: <strong style="color:#00ffcc;">${score}</strong> 점<br>
                최대 콤보: <strong style="color:#ffaf7b;">${maxComboThisRound}</strong> Combo
            </p>
            <div style="margin-bottom: 20px;">
                <input type="text" id="nickname-input" placeholder="닉네임을 입력하세요" maxlength="10" 
                       style="padding: 10px; font-size: 16pt; width: 80%; text-align: center; border-radius: 8px; border: 2px solid #00ffcc; background: #222; color: #fff;">
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="option-btn" onclick="saveRanking()" style="flex: 1;">기록 저장</button>
                <button class="option-btn" onclick="skipRanking()" style="flex: 1; background: #555; border-color: #888; color: #ccc;">로비로 나가기</button>
            </div>
        </div>
      `;
      gameOverModal.classList.add('active');
    }, 1200);
  }
}

// ==========================================
// ★ Web Audio API 사운드 효과 ★
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const scaleFrequencies = [
  261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25,
];

function playQuizPopupSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(1.0, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

function playClearSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(1.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

function playSequentialComboSounds(startCombo, linesCleared) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  for (let i = 0; i < linesCleared; i++) {
    const currentComboCount = startCombo + i;
    const scaleIndex = (currentComboCount - 1) % 8;
    const octaveMultiplier = Math.pow(
      2,
      Math.floor((currentComboCount - 1) / 8),
    );
    const freq = scaleFrequencies[scaleIndex] * octaveMultiplier;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sawtooth';

    const startTime = audioCtx.currentTime + i * 0.15;
    const stopTime = startTime + 0.4;

    oscillator.frequency.setValueAtTime(freq, startTime);
    gainNode.gain.setValueAtTime(0.0, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(1.0, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start(startTime);
    oscillator.stop(stopTime);
  }
}

function playCorrectSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, audioCtx.currentTime);
  osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.1);
  osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.2);
  gain.gain.setValueAtTime(1.0, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

function playWrongSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.4);
  gain.gain.setValueAtTime(1.0, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

function playBombSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(2.0, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}

function playBonusSpawnSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

function playObstacleSpawnSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(100, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.4);
  gain.gain.setValueAtTime(1.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

// [추가] 리롤 아이템 전용 사운드 (휘릭! 하는 경쾌한 소리)
function playRerollSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

// [추가] 2배 버프 아이템 전용 사운드 (오락실 파워업 뾰로롱 소리)
function playBuffSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';

  // 도-미-솔-도 빠르게 상승
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.setValueAtTime(400, audioCtx.currentTime + 0.1);
  osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.2);
  osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.3);

  gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.6);
}
// ==========================================
// ★ 통합된 퀴즈 시스템 (순서 변경 및 터치 잠금) ★
// ==========================================
function triggerNewQuiz() {
  if (nextQuizIsBonus) {
    nextQuizIsBonus = false;
    triggerBonusQuiz();
    return;
  }

  isGameLocked = true; // ★ 퀴즈가 시작되면 무조건 화면 터치 잠금

  const modal = document.getElementById('quiz-modal');
  const feedback = document.getElementById('quiz-feedback');
  const hintBtn = document.getElementById('hint-btn');
  const pinyinDisplay = document.getElementById('quiz-pinyin');

  feedback.innerText = '';
  hintBtn.style.display = 'inline-block';
  pinyinDisplay.style.display = 'none';

  if (!window.QUIZ_DATA) window.QUIZ_DATA = { hsk4: [], hsk5: [], hsk6: [] };
  const currentLevelData = window.QUIZ_DATA[gameLevel] || [];

  if (availableQuizzes.length === 0 && currentLevelData.length > 0) {
    availableQuizzes = [...currentLevelData];
    for (let i = availableQuizzes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableQuizzes[i], availableQuizzes[j]] = [
        availableQuizzes[j],
        availableQuizzes[i],
      ];
    }
  }

  if (availableQuizzes.length === 0) {
    currentQuiz = {
      q: '데이터 없음',
      pinyin: '-',
      a: '확인',
      options: ['확인', '준비중', '테스트'],
    };
  } else {
    currentQuiz = availableQuizzes.pop();
  }

  document.getElementById('quiz-question').innerHTML = currentQuiz.q;
  pinyinDisplay.innerText = currentQuiz.pinyin;

  const optionsContainer = document.getElementById('quiz-options');
  optionsContainer.innerHTML = '';

  currentQuiz.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = opt;

    btn.onclick = () => {
      const allBtns = optionsContainer.querySelectorAll('button');
      allBtns.forEach((b) => (b.disabled = true));

      modal.classList.remove('active');

      if (opt === currentQuiz.a) {
        playCorrectSound();

        setTimeout(() => {
          showGiantHanzi(currentQuiz.q, currentQuiz.pinyin, true);
        }, 300);

        setTimeout(() => {
          generateDockBlocks();
          isGameLocked = false; // ★ 이펙트가 다 끝나고 새 블록이 나오면 터치 잠금 해제!
        }, 1800);
      } else {
        playWrongSound();

        score -= 500;
        if (score < 0) score = 0;
        document.getElementById('score').innerText = score;

        currentCombo = 0;
        linesClearedThisRound = 0;

        // ★ 오답으로 콤보가 끊기면 보라색 빛과 버프 강제 해제 ★
        isDoubleScoreActive = false;
        document
          .getElementById('game-container')
          .classList.remove('double-score-persistent');

        setTimeout(() => {
          const penaltyPopup = document.createElement('div');
          penaltyPopup.className = 'penalty-popup-text';
          penaltyPopup.innerText = '-500';
          document.body.appendChild(penaltyPopup);
          setTimeout(() => penaltyPopup.remove(), 2000);

          showGiantHanzi(currentQuiz.q, currentQuiz.pinyin, false);
        }, 300);

        setTimeout(() => {
          spawnObstacleStone(gameMode);
          generateDockBlocks();
          isGameLocked = false; // ★ 방해물이 떨어지고 나서야 터치 잠금 해제!
        }, 1800);
      }
    };
    optionsContainer.appendChild(btn);
  });

  modal.classList.add('active');
  playQuizPopupSound();
}

function showHint() {
  document.getElementById('hint-btn').style.display = 'none';
  document.getElementById('quiz-pinyin').style.display = 'block';
}
function triggerBonusQuiz() {
  const modal = document.getElementById('quiz-modal');
  const feedback = document.getElementById('quiz-feedback');
  const title = document.getElementById('quiz-question');
  const pinyinDisplay = document.getElementById('quiz-pinyin');

  document.getElementById('hint-btn').style.display = 'none';
  pinyinDisplay.style.display = 'none';
  feedback.innerText = '';

  if (!window.BONUS_QUIZ_DATA || window.BONUS_QUIZ_DATA.length === 0) {
    triggerNewQuiz();
    return;
  }

  let bonusQuiz =
    window.BONUS_QUIZ_DATA[
      Math.floor(Math.random() * window.BONUS_QUIZ_DATA.length)
    ];
  title.innerHTML = `<span style="color: #ffd700; font-size: 20pt; text-shadow: 0 0 10px #ffd700;">[보너스 찬스!]</span><br>${bonusQuiz.q}`;

  const optionsContainer = document.getElementById('quiz-options');
  optionsContainer.innerHTML = '';

  let shuffledOptions = [...bonusQuiz.options].sort(() => Math.random() - 0.5);

  shuffledOptions.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.style.borderColor = '#ffd700';
    btn.innerText = opt;

    btn.onclick = () => {
      optionsContainer
        .querySelectorAll('button')
        .forEach((b) => (b.disabled = true));

      if (opt === bonusQuiz.a) {
        playCorrectSound();
        feedback.innerText = '정답입니다! 아이템을 고르세요!';
        feedback.style.color = '#ffd700';
        setTimeout(() => {
          modal.classList.remove('active');
          document.getElementById('item-selection-modal').style.display =
            'flex';
        }, 1000);
      } else {
        playWrongSound();
        feedback.innerText = '아쉽게도 틀렸습니다. (페널티 없음)';
        feedback.style.color = '#ff3333';
        setTimeout(() => {
          modal.classList.remove('active');
          generateDockBlocks();
          isGameLocked = false; // ★ 보너스 문제 오답 시에도 터치 잠금 해제!
        }, 1000);
      }
    };
    optionsContainer.appendChild(btn);
  });

  modal.classList.add('active');
  playQuizPopupSound();
}

function updateInventoryUI() {
  document.getElementById('item-bomb-cnt').innerText = playerItems.bomb;
  document.getElementById('item-reroll-cnt').innerText = playerItems.reroll;
  document.getElementById('item-double-cnt').innerText =
    playerItems.doubleScore;
}

function selectItem(itemType) {
  playerItems[itemType]++;
  updateInventoryUI();
  document.getElementById('item-selection-modal').style.display = 'none';
  generateDockBlocks();
  isGameLocked = false; // ★ 아이템을 선택하고 게임판으로 돌아오면 터치 잠금 완벽 해제!
}

// ==========================================
// ★ 아이템 기능 구현부 ★
// ==========================================

function useBomb() {
  if (playerItems.bomb <= 0 || isBombActive) return;
  isBombActive = true;
  document.getElementById('grid-board').style.cursor = 'crosshair';
}

function handleBombHover(r, c, isHover) {
  if (!isBombActive) return;
  for (let i = r - 1; i <= r + 1; i++) {
    for (let j = c - 1; j <= c + 1; j++) {
      if (i >= 0 && i < BOARD_SIZE && j >= 0 && j < BOARD_SIZE) {
        let cell = document.getElementById(`cell-${i}-${j}`);
        if (isHover) cell.classList.add('bomb-target');
        else cell.classList.remove('bomb-target');
      }
    }
  }
}
function handleCellClickForBomb(r, c) {
  if (!isBombActive) return;
  isBombActive = false;
  playerItems.bomb--;
  updateInventoryUI();
  document.getElementById('grid-board').style.cursor = 'default';

  document
    .querySelectorAll('.bomb-target')
    .forEach((el) => el.classList.remove('bomb-target'));

  playBombSound();

  const gameContainer = document.getElementById('game-container');
  gameContainer.classList.add('bomb-shake-active');
  setTimeout(() => gameContainer.classList.remove('bomb-shake-active'), 500);

  const flash = document.getElementById('light-flash-overlay');
  flash.style.background = 'rgba(255, 69, 0, 0.7)';
  flash.classList.add('flash-active');
  setTimeout(() => {
    flash.classList.remove('flash-active');
    flash.style.background = 'rgba(255, 255, 255, 0.4)';
  }, 600);

  let destroyedCount = 0;
  for (let i = r - 1; i <= r + 1; i++) {
    for (let j = c - 1; j <= c + 1; j++) {
      if (i >= 0 && i < BOARD_SIZE && j >= 0 && j < BOARD_SIZE) {
        if (board[i][j] === 4) nextQuizIsBonus = true;

        if (board[i][j] > 0) {
          // ★ 방해 블록(11 이상)이 아닐 때만 파괴 점수 카운트 ★
          if (board[i][j] < 11) {
            destroyedCount++;
          }
          board[i][j] = 0;
          document
            .getElementById(`cell-${i}-${j}`)
            .classList.add('bomb-explode');
        }
      }
    }
  }

  score += destroyedCount * 20; // 순수하게 파괴된 '일반/보너스 블록' 수만큼만 점수 증가

  setTimeout(() => {
    document
      .querySelectorAll('.bomb-explode')
      .forEach((el) => el.classList.remove('bomb-explode'));

    let isAllClear = true;
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (board[i][j] > 0) {
          isAllClear = false;
          break;
        }
      }
      if (!isAllClear) break;
    }

    if (isAllClear) {
      score += 1000;
      showAllClearEffect();
    }

    renderBoard();
    checkGameOverCondition();
  }, 400);
}
// [아이템 2: 리롤] - 화려한 교체 이펙트
function useReroll() {
  if (playerItems.reroll <= 0) return;
  playerItems.reroll--;
  updateInventoryUI();

  playRerollSound(); // ★ 사운드 재생

  // 1. 대기열(dock-slot) 3D 회전 애니메이션 적용
  const dockSlots = document.querySelectorAll('.dock-slot');
  dockSlots.forEach((slot) => {
    slot.classList.remove('reroll-anim');
    void slot.offsetWidth; // 애니메이션 리셋
    slot.classList.add('reroll-anim');
  });

  // 2. 블록 교체 로직 (애니메이션이 절반쯤 돌아서 안 보일 때 블록 변경)
  setTimeout(() => {
    const colorPool = [1, 2, 3].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      if (currentDockBlocks[i] !== null) {
        let poolToUse = gameMode === 'hell' ? HARD_BLOCKS : NORMAL_BLOCKS;
        const blockMatrix = JSON.parse(
          JSON.stringify(
            poolToUse[Math.floor(Math.random() * poolToUse.length)],
          ),
        );
        currentDockBlocks[i] = { matrix: blockMatrix, colorVal: colorPool[i] };
        renderDockSlot(i);
      }
    }
    checkGameOverCondition();
  }, 250); // 0.5초짜리 애니메이션의 중간인 0.25초에 바뀜
}

// [아이템 3: 점수 두배] - 화면 번쩍임 + 콤보 지속 보라색 빛
function useDoubleScore() {
  if (playerItems.doubleScore <= 0 || isDoubleScoreActive) return;
  playerItems.doubleScore--;
  isDoubleScoreActive = true;
  updateInventoryUI();

  playBuffSound();

  // ★ 1회성 번쩍임 대신 무한 유지되는 보라색 테두리 클래스 부여 ★
  const gameContainer = document.getElementById('game-container');
  gameContainer.classList.add('double-score-persistent');

  const popup = document.createElement('div');
  popup.className = 'buff-popup-text';
  popup.innerHTML = '⭐ SCORE x2 BUFF! ⭐';
  document.body.appendChild(popup);

  const comboEl = document.getElementById('combo-display');
  comboEl.innerHTML = `<span style="color: #ff00ff; text-shadow: 0 0 15px #ff00ff;">점수 x2 장전 완료!</span>`;
  comboEl.classList.add('show');

  setTimeout(() => {
    popup.remove();
    comboEl.classList.remove('show');
  }, 1500);
}

// ==========================================
// ★ 키보드(1, 2, 3) 퀴즈 정답 선택 로직 ★
// ==========================================
window.addEventListener('keydown', function (e) {
  const quizModal = document.getElementById('quiz-modal');

  // 퀴즈 모달이 활성화된 상태일 때만 작동
  if (quizModal && quizModal.classList.contains('active')) {
    const optionsContainer = document.getElementById('quiz-options');

    // 이미 정답을 골라서 버튼이 비활성화(disabled)된 상태가 아닐 때만
    const buttons = optionsContainer.querySelectorAll('button:not([disabled])');

    if (buttons.length > 0) {
      if (e.key === '1' || e.code === 'Numpad1') {
        if (buttons[0]) buttons[0].click(); // 첫 번째 버튼 클릭
      } else if (e.key === '2' || e.code === 'Numpad2') {
        if (buttons[1]) buttons[1].click(); // 두 번째 버튼 클릭
      } else if (e.key === '3' || e.code === 'Numpad3') {
        if (buttons[2]) buttons[2].click(); // 세 번째 버튼 클릭
      }
    }
  }
});

// ==========================================
// ★ 고음질 & 큰 성량의 중국어 목소리 찾기 ★
// ==========================================
let bestChineseVoice = null;

function setBestChineseVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return;

  // 1순위: 크롬 내장 Google 중국어 (성량이 크고 발음이 매우 또렷함)
  // 2순위: 윈도우 프리미엄 음성 (Yaoyao, Kangkang, Huihui)
  // 3순위: 애플 맥/iOS 고음질 음성 (Ting-Ting 등)
  // 4순위: 기기에 깔려있는 일반 중국어(zh-CN) 아무거나
  bestChineseVoice =
    voices.find((v) => v.name.includes('Google 普通话')) ||
    voices.find((v) => v.name.includes('Google') && v.lang.includes('zh-CN')) ||
    voices.find(
      (v) => v.name.includes('Yaoyao') || v.name.includes('Huihui'),
    ) ||
    voices.find((v) => v.name.includes('Ting-Ting')) ||
    voices.find((v) => v.lang === 'zh-CN' || v.lang === 'zh_CN');
}

// 브라우저가 목소리 목록을 다 불러왔을 때 세팅 실행 (특히 크롬에서 필수)
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = setBestChineseVoice;
}

// 브라우저 내장 TTS를 이용해 중국어 읽어주기 (비동기 최적화)
function speakChinese(text) {
  // ★ 브라우저 화면 그리기(렌더링)가 멈추지 않도록 음성 재생을 0.05초 뒤로 미룸
  setTimeout(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (!bestChineseVoice) setBestChineseVoice();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.85;
      utterance.volume = 1.0;

      if (bestChineseVoice) {
        utterance.voice = bestChineseVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  }, 50);
}
// [추가] 화면 중앙에 거대한 한자+병음을 띄우는 함수
function showGiantHanzi(hanzi, pinyin, isCorrect) {
  const overlay = document.createElement('div');
  overlay.className = 'giant-hanzi-overlay';

  // 정답이면 금색+녹색빛, 오답이면 붉은빛으로 테마 변경
  const color = isCorrect ? '#ffd700' : '#ff3333';
  const shadow = isCorrect ? 'rgba(0, 255, 204, 0.8)' : 'rgba(255, 0, 0, 0.8)';

  overlay.innerHTML = `
        <div class="giant-hanzi-text" style="color: ${color}; text-shadow: 0 0 30px ${shadow}, 0 0 60px ${shadow};">${hanzi}</div>
        <div class="giant-pinyin-text" style="color: #fff; text-shadow: 0 0 10px #000;">${pinyin}</div>
    `;

  document.body.appendChild(overlay);

  // 약간의 딜레이를 주어 CSS 애니메이션(튀어오름) 발동
  requestAnimationFrame(() => overlay.classList.add('show'));

  // ★ TTS 음성 재생! ★
  speakChinese(hanzi);

  // 1.5초 동안 멋있게 보여준 뒤 화면에서 삭제
  setTimeout(() => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  }, 1500);
}
// ==========================================
// ★ 랭킹 기록 스킵 후 로비로 돌아가기 ★
// ==========================================
function skipRanking() {
  // 1. 게임 오버 모달 닫기
  document.getElementById('game-over-modal').classList.remove('active');

  // 2. 게임 보드 화면 숨기고 로비 화면 띄우기
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('lobby-screen').style.display = 'flex';

  // 3. 로비(인트로) BGM 재생
  playBGM('intro');
}
