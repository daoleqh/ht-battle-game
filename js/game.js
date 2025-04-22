// game.js

// DOM elements
const gameContainer = document.getElementById("game-container");
const walls = document.getElementById("walls");
const resultImg = document.getElementById("result-img");
const restartBtn = document.getElementById("restart-btn");
const scoreDisplay = document.getElementById("score");
const timerBlock = document.querySelector("#timer");
const timerDisplay = document.getElementById("time-left");

// Game state
let stage = 1;
let enemies = [];
let exps = [];
let playerBullets = [];
let bossBullets = [];
let intervals = [];
let gameEnded = false;
let gameTime = 90;
let spawnAllowed = true;
let score = 0;
let progress = 0;
let level = 1;
let wallHealth = 100;
let finalBossSpawned = false;
let player;
const keys = {};

// Assets and speeds
let assetEnemy, assetBoss1, assetBoss2, assetFinalBoss;
let speedEnemy, speedBoss;

// Initialize game
init();
    setTimeout(() => {
      overlay.style.opacity = 0;
      setTimeout(() => overlay.remove(), 500);
    }, 700);

function init() {
  setupStage();
  setupWalls();
  setupWallHPBar();
  createPlayer();

  intervals.push(setInterval(updateTimer, 1000));
  intervals.push(setInterval(() => spawnAllowed && spawnEnemy(), 2000));
  intervals.push(setInterval(() => spawnAllowed && spawnExp(), 4000));

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("click", shootPlayerBullet);
  restartBtn.onclick = () => window.location.reload();

    // style restart button: make it stand out with gradient and hover effect
  Object.assign(restartBtn.style, {
    position: 'fixed',
    top: '60px',
    right: '20px',
    padding: '12px 24px',
    background: 'linear-gradient(45deg, #0f0, #0a0)',
    color: '#fff',
    border: '2px solid #fff',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 0 12px rgba(0,255,0,0.7)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    zIndex: 30
  });

  // hover effect
  restartBtn.addEventListener('mouseover', () => {
    restartBtn.style.transform = 'scale(1.1)';
    restartBtn.style.boxShadow = '0 0 16px rgba(0,255,0,1)';
  });
  restartBtn.addEventListener('mouseout', () => {
    restartBtn.style.transform = 'scale(1)';
    restartBtn.style.boxShadow = '0 0 12px rgba(0,255,0,0.7)';
  });

  requestAnimationFrame(updateGame);
}

function setupStage() {
  if (stage === 1) {
    assetEnemy = 'enemy.png';
    assetBoss1 = 'boss1.png';
    assetBoss2 = 'boss2.png';
    assetFinalBoss = 'fboss.png';
    speedEnemy = 1.0;
    speedBoss = 0.6;
  } else {
    assetEnemy = 'enemy2.png';
    assetBoss1 = 'boss3.png';
    assetBoss2 = 'boss4.png';
    assetFinalBoss = 'fboss2.png';
    speedEnemy = 1.1;
    speedBoss = 0.3;
  }

  // display stage label
  let lbl = document.getElementById('stage-label');
  if (!lbl) {
    lbl = document.createElement('div');
    lbl.id = 'stage-label';
    Object.assign(lbl.style, {
      position: 'absolute',
      top: '10px',
      left: '90px',
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '25px',
      fontWeight: '900',
      letterSpacing: '2px',
      color: '#00ffff',
      textShadow: '0 0 6px #0ff, 0 0 12px #0ff, 0 0 20px #0ff',
      userSelect: 'none',
      zIndex: 25
    });
    gameContainer.appendChild(lbl);
  }
  lbl.innerText = `STAGE ${stage}`;
}


function onKeyDown(e) {
  keys[e.key] = true;
  if (e.code === 'Space') shootPlayerBullet();
}

function onKeyUp(e) {
  keys[e.key] = false;
}

function setupWalls() {
  walls.innerHTML = '';

  for (let i = 0; i < 13; i++) {
    const w = document.createElement('div');
    w.className = 'wall-segment';
    w.style.top = `${i * 64}px`;
    walls.appendChild(w);
  }
}

function setupWallHPBar() {
  const bar = document.createElement('div');
  bar.id = 'wall-health-container';
  Object.assign(bar.style, {
    position: 'absolute',
    top: '10px',
    left: '52px',
    width: '12px',
    height: '160px',
    background: '#444',
    border: '1px solid #000',
    zIndex: 10
  });
  bar.innerHTML =
    '<div id="wall-health-bar" style="width:100%;height:100%;background:green;transition:all .3s;">' +
    '<span id="wall-health-text" style="writing-mode:vertical-lr;text-align:center;color:#fff;font-size:12px;display:block;">100%</span>' +
    '</div>';
  gameContainer.appendChild(bar);
}

function createPlayer() {
  player = document.createElement('div');
  player.className = 'player-unit';
  Object.assign(player.style, {
    position: 'absolute',
    left: '200px',
    top: '300px',
    backgroundImage: `url('img/soldier_lv${level}.png')`
  });

  const tag = document.createElement('div');
  tag.className = 'level-tag';
  tag.id = 'level-tag';
  tag.innerText = `Lv${level}`;
  player.appendChild(tag);

  const container = document.createElement('div');
  container.className = 'exp-bar-container';
  Object.assign(container.style, {
    position: 'absolute',
    right: '100%',
    top: '0',
    width: '8px',
    height: '64px',
    background: 'linear-gradient(to top, #222, #444)',
    border: '1px solid #666',
    borderRadius: '4px',
    marginRight: '4px',
    whiteSpace: 'nowrap',
    zIndex: 5
  });

  const fill = document.createElement('div');
  fill.className = 'exp-bar-fill';
  Object.assign(fill.style, {
    position: 'absolute',
    bottom: '0',
    width: '100%',
    background: 'linear-gradient(to top, #0f0, #6f6)',
    boxShadow: '0 0 6px #0f0',
    transition: 'height 0.3s ease'
  });

  container.appendChild(fill);
  player.appendChild(container);
  gameContainer.appendChild(player);
}

function updateTimer() {
  if (gameEnded) return;

  gameTime--;
  if (gameTime >= 0) {
    timerDisplay.textContent = gameTime;
  }

  if (gameTime === 0 && !finalBossSpawned) {
    spawnAllowed = false;
    finalBossSpawned = true;
    spawnFinalBoss();
  }

  if (gameTime < 0) {
    timerDisplay.textContent = '';
    timerBlock.querySelector('span').textContent = 'Destroy all enemies';
  }
}

function spawnEnemy() {
  const e = document.createElement('div');
  const bossSmall = gameTime <= 30 && Math.random() < 0.5;

  const height = bossSmall ? 128 : 64;
  const maxY = 800 - height - 24;
  const y = 160 + Math.random() * (maxY - 160);

  e.className = 'enemy';
  Object.assign(e.style, {
    left: '1136px',
    top: `${y}px`
  });

  if (bossSmall) {
    const type = Math.random() < 0.5 ? assetBoss1 : assetBoss2;
    e.classList.add('boss');
    Object.assign(e.style, {
      width: '128px',
      height: '128px',
      backgroundImage: `url('img/${type}')`
    });
    e.dataset.hp = 25;
    e.dataset.maxHp = 25;
  } else {
    Object.assign(e.style, {
      width: '64px',
      height: '64px',
      backgroundImage: `url('img/${assetEnemy}')`
    });
    e.dataset.hp = 5;
    e.dataset.maxHp = 5;
  }

  const bar = document.createElement('div');
  bar.className = 'enemy-hp-bar';
  Object.assign(bar.style, {
    position: 'absolute',
    top: bossSmall ? '-6px' : '-5px',
    height: bossSmall ? '6px' : '5px',
    width: '100%',
    backgroundColor: 'red'
  });
  e.appendChild(bar);

  const nameMap = {
    'enemy.png': 'Gale RX',
    'enemy2.png': 'Angle BA-6',
    'boss1.png': 'AF Overlord',
    'boss2.png': 'Navy Overlord',
    'boss3.png': 'Gamma',
    'boss4.png': 'Delta',
    'fboss.png': 'Army Overlord',
    'fboss2.png': 'Super Mecha'
  };
  const bgMatch = e.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
  const bg = bgMatch ? bgMatch[1].split('/').pop() : '';
  const name = nameMap[bg] || "???";
  const nameTag = document.createElement('div');
  nameTag.innerText = name;
  Object.assign(nameTag.style, {
    position: 'absolute',
    bottom: '-22px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '13px',
    fontFamily: 'Orbitron, sans-serif',
    background: '#300',
    color: '#ffaaaa',
    padding: '2px 6px',
    borderRadius: '6px',
    boxShadow: '0 0 5px red',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    zIndex: 5
  });
  e.appendChild(nameTag);
  nameTag.style.userSelect = 'none';
  nameTag.style.pointerEvents = 'none';

  enemies.push(e);
  gameContainer.appendChild(e);
}

function spawnExp() {
  const a = document.createElement('div');
  const isBigExp = Math.random() < 0.33;

  a.className = 'exp';
  const size = isBigExp ? 48 : 36;
  Object.assign(a.style, {
    position: 'absolute',
    width: `${size}px`,
    height: `${size}px`,
    left: `${60 + Math.random() * 340}px`,
    top: `${130 + Math.random() * 606}px`,
    backgroundImage: `url('img/${isBigExp ? 'exp2.png' : 'exp.png'}')`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center'
  });

  a.dataset.value = isBigExp ? 2 : 1;
  exps.push(a);
  gameContainer.appendChild(a);
}


function spawnFinalBoss() {
  const b = document.createElement('div');
  b.className = 'boss';
  Object.assign(b.style, {
    left: '1136px',
    top: '400px',
    width: '160px',
    height: '160px',
    backgroundImage: `url('img/${assetFinalBoss}')`
  });

  b.dataset.hp = 150;
  b.dataset.maxHp = 150;

  const bar = document.createElement('div');
  bar.className = 'enemy-hp-bar';
  Object.assign(bar.style, {
    position: 'absolute',
    top: '-8px',
    height: '6px',
    width: '100%',
    backgroundColor: 'red'
  });
  b.appendChild(bar);

  
  const nameMap = {
    'fboss.png': 'Army Overlord',
    'fboss2.png': 'Super Mecha'
  };
  const name = nameMap[assetFinalBoss] || "???";
  const nameTag = document.createElement('div');
  nameTag.innerText = name;
  Object.assign(nameTag.style, {
    position: 'absolute',
    bottom: '-22px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '13px',
    fontFamily: 'Orbitron, sans-serif',
    background: '#300',
    color: '#ffaaaa',
    padding: '2px 6px',
    borderRadius: '6px',
    boxShadow: '0 0 5px red',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    zIndex: 5
  });
  b.appendChild(nameTag);

  enemies.push(b);
  gameContainer.appendChild(b);

  let phase = 0;
  intervals.push(
    setInterval(() => {
      if (!b.parentNode) return;
      b.style.left = `${parseFloat(b.style.left) - speedBoss}px`;
      phase += 0.1;
      b.style.top = `${400 + Math.sin(phase) * 30}px`;
    }, 50)
  );

  intervals.push(setInterval(() => shootBossBullet(b), 2000));
}

function shootPlayerBullet() {
  if (gameEnded) return;

  const b = document.createElement('div');
  b.className = 'bullet';
  b.dataset.owner = 'player';
  b.dataset.power = level;
  Object.assign(b.style, {
    left: `${parseInt(player.style.left) + 64}px`,
    top: `${parseInt(player.style.top) + 26}px`,
    width: '32px',
    height: '24px',
    backgroundImage: `url('img/bullet_lv${level}.png')`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center'
  });

  playerBullets.push(b);
  gameContainer.appendChild(b);
}

function shootBossBullet(boss) {
  if (gameEnded) return;

  const b = document.createElement('div');
  b.className = 'bullet';
  b.dataset.owner = 'boss';
  Object.assign(b.style, {
    left: `${parseFloat(boss.style.left) - 32}px`,
    top: `${parseFloat(boss.style.top) + 64}px`,
    width: '32px',
    height: '24px',
    backgroundImage: "url('img/bullet_boss.png')",
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center'
  });

  bossBullets.push(b);
  gameContainer.appendChild(b);
}

function moveBossBullets() {
  for (let i = bossBullets.length - 1; i >= 0; i--) {
    const b = bossBullets[i];
    b.style.left = `${parseFloat(b.style.left) - 8}px`;

    if (parseFloat(b.style.left) < 0) {
      b.remove(); bossBullets.splice(i, 1); continue;
    }

    if (isColliding(b, player)) {
      b.remove(); bossBullets.splice(i, 1);
      endGame('defeat');
      return;
    }
  }
}

function updateGame() {
  if (gameEnded) return;

  movePlayer();
  movePlayerBullets();
  moveBossBullets();
  moveEnemies();
  checkExp();
  checkVictory();

  requestAnimationFrame(updateGame);
}

function movePlayer() {
  const speed = 4;
  let x = parseInt(player.style.left);
  let y = parseInt(player.style.top);

  if (keys['w'] || keys['ArrowUp']) y -= speed;
  if (keys['s'] || keys['ArrowDown']) y += speed;
  if (keys['a'] || keys['ArrowLeft']) x -= speed;
  if (keys['d'] || keys['ArrowRight']) x += speed;

  player.style.left = `${Math.min(1136, Math.max(30, x))}px`;
  player.style.top  = `${Math.min(736, Math.max(22, y))}px`;
}

function movePlayerBullets() {
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const b = playerBullets[i];
    b.style.left = `${parseFloat(b.style.left) + 6}px`;

    if (parseFloat(b.style.left) > 1200) {
      b.remove(); playerBullets.splice(i, 1); continue;
    }

    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (isColliding(b, e)) {
        showHitEffectAtBullet(b);

        const nh = Math.max(0, parseInt(e.dataset.hp) - parseInt(b.dataset.power));
        e.dataset.hp = nh;

        b.remove(); playerBullets.splice(i, 1);

        if (nh <= 0) {
          showExplosion(e.style.left, e.style.top, false);
          e.remove(); enemies.splice(j, 1);
          scoreDisplay.textContent = ++score;
        } else {
          const bar = e.querySelector('.enemy-hp-bar');
          if (bar) {
            const ratio = nh / parseInt(e.dataset.maxHp);
            bar.style.width = `${ratio * 100}%`;
          }
        }
        break;
      }
    }
  }
}

function moveEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (stage === 1 && e.dataset.maxHp == 150 && e.classList.contains('boss') && e.style.backgroundImage.includes('fboss')) continue;
    const speed = e.classList.contains('boss') ? speedBoss : speedEnemy;
    e.style.left = `${parseFloat(e.style.left) - speed}px`;

    if (parseFloat(e.style.left) < 24) {
      const dmg = e.classList.contains('boss') ? 20 : 10;
      updateWallHP(dmg);
      shakeScreen();
      e.remove();
      enemies.splice(i, 1);
    }
  }
}

function checkExp() {
  for (let i = exps.length - 1; i >= 0; i--) {
    const a = exps[i];
    if (isColliding(a, player)) {
      a.remove(); exps.splice(i, 1);
      progress += parseInt(a.dataset.value || '1');

      // update exp bar fill
      const fill = player.querySelector('.exp-bar-fill');

      if (progress >= 10 && level < 5) {
        level++;
        progress = 0;
        fill.style.height = '0%';
    } else {
        fill.style.height = (progress * 10) + '%';
    }
        player.style.backgroundImage = `url('img/soldier_lv${level}.png')`;
        document.getElementById('level-tag').innerText = `Lv${level}`;
      }
    }
  }

function checkVictory() {
  if (!spawnAllowed && !finalBossSpawned && enemies.length === 0) {
    finalBossSpawned = true;
    spawnFinalBoss();
  } else if (finalBossSpawned && enemies.length === 0) {
    if (stage === 1) {
      endGame('victory');
      showNextButton();
    } else {
      endGame('victory');
    }
  }
}

function showNextButton() {
  const btn = document.createElement('img');
  btn.id = 'nextchap';
  btn.src = 'img/next.png';
  btn.style.cssText = 'position:absolute;left:50%;top:70%;transform:translate(-50%,-50%);cursor:pointer;z-index:20;';
  gameContainer.appendChild(btn);
  const stage2Label = document.createElement('div');
  stage2Label.style.userSelect = 'none';
  stage2Label.style.pointerEvents = 'none';
  stage2Label.id = 'stage2-label';
  stage2Label.innerText = 'STAGE 2';
  Object.assign(stage2Label.style, {
    position: 'absolute',
    top: '78%',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '24px',
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: '900',
    color: '#00ffff',
    textShadow: '0 0 6px #0ff',
    zIndex: 21
  });
  gameContainer.appendChild(stage2Label);

  
btn.onclick = () => {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: '#000',
      opacity: 0,
      zIndex: 99,
      transition: 'opacity 0.5s ease'
    });
    gameContainer.appendChild(overlay);
    setTimeout(() => {
      overlay.style.opacity = 1;
    }, 0);

    btn.remove();
    resultImg.style.display = 'none';
    clearAll();

    stage = 2;
    level = 1;
    score = 0;
    progress = 0;
    scoreDisplay.textContent = '0';
    wallHealth = 100;
    const bar = document.getElementById('wall-health-bar');
    const text = document.getElementById('wall-health-text');
    if (bar && text) {
      bar.style.height = '100%';
      text.textContent = '100%';
      bar.style.background = 'green';
    }

    player = null;

    gameEnded = false;
    gameTime = 90;
    spawnAllowed = true;
    finalBossSpawned = false;

    init();
    const lbl = document.getElementById('stage2-label');
    if (lbl) lbl.remove();
    setTimeout(() => {
      overlay.style.opacity = 0;
      setTimeout(() => overlay.remove(), 500);
    }, 700);
  };
}

function clearAll() {
  intervals.forEach(id => clearInterval(id));
  intervals = [];

  enemies.forEach(e => e.remove());
  enemies = [];

  exps.forEach(a => a.remove());
  exps = [];

  playerBullets.forEach(b => b.remove());
  playerBullets = [];

  bossBullets.forEach(b => b.remove());
  bossBullets = [];

  const hpContainer = document.getElementById('wall-health-container');
  if (hpContainer) hpContainer.remove();

  if (player) {
    player.remove();
    player = null;
  }
}

function updateWallHP(damage) {
  wallHealth = Math.max(0, wallHealth - damage);
  console.log('[updateWallHP]', 'damage:', damage, 'new wallHealth:', wallHealth);

  const bar = document.getElementById('wall-health-bar');
  const text = document.getElementById('wall-health-text');

  if (!bar || !text) {
    console.warn('[updateWallHP] Wall HP bar elements not found');
    return;
  }

  bar.style.height = wallHealth + '%';
  text.textContent = wallHealth + '%';

  bar.style.background =
    wallHealth <= 20 ? 'red' :
    wallHealth <= 50 ? 'yellow' :
    'green';

  shakeScreen();
  if (wallHealth <= 0) endGame('defeat');
}

function shakeScreen() {
  gameContainer.style.transform = 'translateX(-5px)';
  setTimeout(() => {
    gameContainer.style.transform = 'translateX(5px)';
    setTimeout(() => gameContainer.style.transform = 'translateX(0)', 50);
  }, 50);
}

function isColliding(a, b) {
  const r1 = a.getBoundingClientRect();
  const r2 = b.getBoundingClientRect();
  return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
}

function showExplosion(left, top, big = false) {
  const fx = document.createElement('div');
  Object.assign(fx.style, {
    position: 'absolute',
    left,
    top,
    width: big ? '96px' : '32px',
    height: big ? '96px' : '32px',
    borderRadius: '50%',
    background: big ? 'rgba(255,0,0,0.9)' : 'rgba(255,200,0,0.6)',
    boxShadow: big ? '0 0 40px 20px red' : '0 0 10px 5px orange',
    animation: 'explode 0.4s ease-out',
    zIndex: 99
  });
  gameContainer.appendChild(fx);
  setTimeout(() => fx.remove(), 500);
}

function endGame(type) {
  gameEnded = true;
  intervals.forEach(id => clearInterval(id));

  if (type === 'victory') {
    triggerVictoryUI('victory');
  } else {
    triggerVictoryUI('defeat');
  }
}

function triggerVictoryUI(type) {
  if (type === 'victory' && stage === 2) {
    const msg = document.createElement('div');
    Object.assign(msg.style, {
      position: 'absolute',
      left: '50%',
      top: '60%',
      transform: 'translate(-50%, -50%)',
      color: '#fff',
      fontSize: '24px',
      textAlign: 'center',
      zIndex: 20
    });
    msg.innerHTML = `
      <div style="
        font-family: 'Orbitron', sans-serif;
        font-weight: 900;
        font-size: 28px;
        color: #00ffcc;
        text-align: center;
        text-shadow: 0 0 6px #0ff;
      ">
        🎉 Congratulations!<br>
        You have completed the game!<br>
        Thank you for playing.
      </div>`;
    gameContainer.appendChild(msg);
  } else {
    resultImg.src = type === 'victory' ? 'img/victory.png' : 'img/defeat.png';
    resultImg.style.display = 'block';
    restartBtn.style.display = 'block';
  }
}

function showHitEffectAtBullet(bullet) {
  const rect = bullet.getBoundingClientRect();
  const gameRect = gameContainer.getBoundingClientRect();
  const x = rect.left - gameRect.left + rect.width / 2;
  const y = rect.top - gameRect.top + rect.height / 2 + 2;

  const fx = document.createElement('div');
  Object.assign(fx.style, {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    width: '28px',
    height: '28px',
    background: 'radial-gradient(white 0%, rgba(255,255,255,0.1) 80%)',
    opacity: '0.9',
    borderRadius: '50%',
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%) scale(1)',
    transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
    zIndex: 80
  });

  gameContainer.appendChild(fx);

  setTimeout(() => {
    fx.style.opacity = '0';
    fx.style.transform = 'translate(-50%, -50%) scale(1.6)';
  }, 10);

  setTimeout(() => fx.remove(), 300);
}
