function isMobile() {
  return /Mobi|Android|iPhone/i.test(navigator.userAgent);
}

function ensureFullscreen() {
  if (!isMobile()) return;
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }
}

window.addEventListener("click", ensureFullscreen);
window.addEventListener("touchstart", ensureFullscreen);

// Ngăn Space/Arrow keys cuộn trang
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
}, { capture: true });

const gameContainer = document.getElementById('game-container');
const walls         = document.getElementById('walls');
const resultImg     = document.getElementById('result-img');
const restartBtn    = document.getElementById('restart-btn');
const scoreDisplay  = document.getElementById('score');
const timerDisplay  = document.getElementById('time-left');

// Âm thanh
const sounds = {
  shoot: new Audio('audio/shoot.mp3'),
  explode: new Audio('audio/explode.mp3'),
  victory: new Audio('audio/victory.mp3'),
  defeat: new Audio('audio/defeat.mp3'),
  warning: new Audio('audio/warning.mp3'),
  levelup: new Audio('audio/levelup.mp3'),
  touchwall: new Audio('audio/touchwall.mp3')
};

let soundEnabled = true;
let animationFrameId = null;
let stage = 1,
    enemies = [], exps = [], playerBullets = [], bossBullets = [],
    intervals = [], gameEnded = false,
    gameTime = 90, spawnAllowed = true,
    score = 0, progress = 0, level = 1,
    wallHealth = 100, finalBossSpawned = false,
    player, enemySpawnInterval;

const keys = {}, PLAYER_SPEED = 3, FIRE_DELAY = 200;
let fireIntervalId = null;
let assetEnemy, assetBoss1, assetBoss2, assetFinalBoss, speedEnemy, speedBoss;

// Sự kiện chung
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup',   onKeyUp);

// Xóa auto-bắn chuột & cảm ứng
document.addEventListener('mouseup', stopFiring);
document.addEventListener('touchend', stopFiring);
restartBtn.addEventListener('click', () => {
  const congrats = document.getElementById('congrats-message');
  if (stage === 2 && congrats) stage = 1;
  init();
});
gameContainer.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('blur', () => { stopFiring(); Object.keys(keys).forEach(k => keys[k] = false); });
const soundBtn = document.getElementById('sound-btn');
soundBtn.onclick = () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
};

function init() {
  intervals.forEach(id => clearInterval(id));
  intervals = [];
  clearAll();
  document.querySelector('#congrats-message')?.remove();
  document.getElementById('stage-label')?.remove();
  document.getElementById('wall-health-container')?.remove();
  document.getElementById('nextchap')?.remove();
  resultImg.style.display = 'none';

  gameEnded = false; gameTime = 90; spawnAllowed = true;
  score = progress = 0; level = 1; wallHealth = 100; finalBossSpawned = false;
  scoreDisplay.textContent = '0'; timerDisplay.textContent = '90s';

  setupStage();
  setupWalls();
  setupWallHPBar();
  createPlayer();

  intervals.push(setInterval(updateTimer, 1000));
  enemySpawnInterval = setInterval(spawnEnemy, 2000);
  intervals.push(enemySpawnInterval);
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(updateGame);
}

function onKeyDown(e) {
  if (['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    keys[e.key] = true;
  }
  if (e.code === 'Space') startFiring();
}

function onKeyUp(e) {
  if (['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    keys[e.key] = false;
  }
  if (e.code === 'Space') stopFiring();
}

function startFiring() {
  if (gameEnded || fireIntervalId) return;
  shootPlayerBullet();
  fireIntervalId = setInterval(shootPlayerBullet, FIRE_DELAY);
}

function stopFiring() {
  clearInterval(fireIntervalId);
  fireIntervalId = null;
}

function setupStage() {
  if (stage === 1) {
    assetEnemy = 'enemy.png'; assetBoss1 = 'boss1.png';
    assetBoss2 = 'boss2.png'; assetFinalBoss = 'fboss.png';
    speedEnemy = 1.0; speedBoss = 0.4;
  } else {
    assetEnemy = 'enemy2.png'; assetBoss1 = 'boss3.png';
    assetBoss2 = 'boss4.png'; assetFinalBoss = 'fboss2.png';
    speedEnemy = 1.1; speedBoss = 0.5;
  }
  const lbl = document.createElement('div'); lbl.id = 'stage-label';
  Object.assign(lbl.style, {position:'absolute', top:'10px', left:'90px', fontFamily:"'Orbitron',sans-serif", fontSize:'25px', fontWeight:'900', color:'#00ffff', textShadow:'0 0 6px #0ff,0 0 12px #0ff', userSelect:'none', zIndex:20});
  lbl.innerText = `STAGE ${stage}`;
  gameContainer.appendChild(lbl);
}

function setupWalls() {
  walls.innerHTML = '';
  for (let i = 0; i < 13; i++) {
    const w = document.createElement('div'); w.className = 'wall-segment';
    w.style.top = `${i * 64}px`;
    walls.appendChild(w);
  }
}

function setupWallHPBar() {
  const bar = document.createElement('div'); bar.id = 'wall-health-container';
  Object.assign(bar.style, {position:'absolute', top:'10px', left:'52px', width:'12px', height:'160px', background:'#444', border:'1px solid #000', zIndex:10});
  bar.innerHTML = `<div id="wall-health-bar" style="width:100%;height:100%;background:green;transition:all .3s"><span id="wall-health-text" style="writing-mode:vertical-lr;text-align:center;color:#fff;font-size:12px;display:block;">100%</span></div>`;
  gameContainer.appendChild(bar);
}

function createPlayer() {
  player = document.createElement('div'); player.className = 'player-unit';
  Object.assign(player.style, {position:'absolute', left:'200px', top:'300px', backgroundImage:`url('img/soldier_lv${level}.png')`});
  const lt = document.createElement('div'); lt.className = 'level-tag'; lt.id = 'level-tag'; lt.innerText = `Lv${level}`; player.appendChild(lt);
  const cnt = document.createElement('div'); cnt.className = 'exp-bar-container';
  Object.assign(cnt.style, {position:'absolute', right:'100%', top:'0', width:'8px', height:'64px', background:'linear-gradient(to top,#222,#444)', border:'1px solid #666', borderRadius:'4px', marginRight:'4px', zIndex:5});
  const fill = document.createElement('div'); fill.className = 'exp-bar-fill';
  Object.assign(fill.style, {position:'absolute', bottom:'0', width:'100%', background:'linear-gradient(to top,#0f0,#6f6)', boxShadow:'0 0 6px #0f0', transition:'height 0.3s ease'});
  cnt.appendChild(fill); player.appendChild(cnt);
  gameContainer.appendChild(player);
}

function updateTimer() {
  if (gameEnded) return;
  if (gameTime === 5) {
    const warning = document.createElement('div');
    if (soundEnabled) { sounds.warning.currentTime = 0; sounds.warning.play(); }
    Object.assign(warning.style, {position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', color:'yellow', fontSize:'24px', fontFamily:"'Orbitron', sans-serif", textShadow:'0 0 6px #ff0', background:'rgba(0,0,0,0.6)', padding:'10px 20px', borderRadius:'8px', textAlign:'center', userSelect:'none', zIndex:100});
    warning.innerText = 'Commander, we are about to face a very strong enemy, be careful!';
    gameContainer.appendChild(warning);
    setTimeout(() => warning.remove(), 3000);
  }
  gameTime--;
  if (gameTime >= 0) timerDisplay.textContent = gameTime;
  if (gameTime === 0 && !finalBossSpawned) { spawnAllowed = false; finalBossSpawned = true; spawnFinalBoss(); }
  if (gameTime < 0) {
    timerDisplay.textContent = '';
    timerBlock.querySelector('span').textContent = 'Destroy all enemies';
  }
}

function updateGame() {
  if (gameEnded) return;
  movePlayer(); movePlayerBullets(); moveBossBullets(); moveEnemies();
  checkPlayerEnemyCollision(); checkExp(); checkVictory();
  animationFrameId = requestAnimationFrame(updateGame);
}

function spawnEnemy() {
  if (!spawnAllowed || gameEnded) return;
  const bossSmall = gameTime <= 30 && Math.random() < 0.5;
  const h = bossSmall ? 128 : 64;
  const ch = gameContainer.clientHeight;
  const y = 110 + Math.random() * (ch - h - 24 - 130);
  const e = document.createElement('div'); e.className = bossSmall ? 'boss' : 'enemy';
  Object.assign(e.style, {left:'1136px', top:`${y}px`, width:`${h}px`, height:`${h}px`, backgroundImage:`url('img/${ bossSmall ? (Math.random()<0.5 ? assetBoss1 : assetBoss2) : assetEnemy }')`});
  e.dataset.hp = e.dataset.maxHp = bossSmall ? 25 : 5;
  const hpContainer = document.createElement('div');
  hpContainer.className = 'enemy-hp-container';
  Object.assign(hpContainer.style, {
    position: 'absolute',
    top:    '-10px',
    width:  '100%',
    height: '8px'
  });
  const hpFill = document.createElement('div');
  hpFill.className = 'enemy-hp-bar';
  Object.assign(hpFill.style, {
    width:  '100%',
    height: '100%'
  });
  hpContainer.appendChild(hpFill);
  e.appendChild(hpContainer);
  const nameMap = {'enemy.png':'Gale RX','enemy2.png':'Angle BA-6','boss1.png':'AF Overlord','boss2.png':'Navy Overlord','boss3.png':'Gamma','boss4.png':'Delta','fboss.png':'Army Overlord','fboss2.png':'Super Mecha'};
  const src = e.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)[1].split('/').pop();
  const nm = nameMap[src] || '???';
  const nt = document.createElement('div'); nt.innerText = nm;
  Object.assign(nt.style, {position:'absolute', bottom:'-22px', left:'50%', transform:'translateX(-50%)', fontSize:'13px', fontFamily:"'Orbitron',sans-serif", background:'#300', color:'#ffaaaa', padding:'2px 6px', borderRadius:'6px', boxShadow:'0 0 5px red', fontWeight:'bold', whiteSpace:'nowrap', zIndex:5, userSelect:'none', pointerEvents:'none'});
  e.appendChild(nt);
  enemies.push(e);
  gameContainer.appendChild(e);
}

function spawnFinalBoss() {
  const bossH = 160;
  const yCenter = (gameContainer.clientHeight - bossH)/2;
  const b = document.createElement('div'); b.className = 'boss';
  Object.assign(b.style, {left:'1136px', top:`${yCenter}px`, width:`${bossH}px`, height:`${bossH}px`, backgroundImage:`url('img/${assetFinalBoss}')`});
  b.dataset.hp = b.dataset.maxHp = 150;

  const hpContainer = document.createElement('div');
  hpContainer.className = 'enemy-hp-container';
  Object.assign(hpContainer.style, {position: 'absolute', top: '-10px', width: '100%', height: '8px'});
  const hpFill = document.createElement('div');
  hpFill.className = 'enemy-hp-bar';
  Object.assign(hpFill.style, {
    width:  '100%',
    height: '100%'
  });

  hpContainer.appendChild(hpFill);
  b.appendChild(hpContainer);

  const nm = {'fboss.png':'Army Overlord','fboss2.png':'Super Mecha'}[assetFinalBoss] || '???';
  const nt = document.createElement('div'); nt.innerText = nm;
  Object.assign(nt.style, {position:'absolute', bottom:'-22px', left:'50%', transform:'translateX(-50%)', fontSize:'13px', fontFamily:"'Orbitron',sans-serif", background:'#300', color:'#ffaaaa', padding:'2px 6px', borderRadius:'6px', boxShadow:'0 0 5px red', fontWeight:'bold', whiteSpace:'nowrap', zIndex:5});
  b.appendChild(nt);
  enemies.push(b);
  gameContainer.appendChild(b);
  let phase = 0;
  intervals.push(setInterval(() => {
    if (!b.parentNode) return;
    b.style.left = `${parseFloat(b.style.left) - speedBoss}px`;
    phase += 0.1;
    b.style.top = `${yCenter + Math.sin(phase)*30}px`;
  }, 50));
  intervals.push(setInterval(() => shootBossBullet(b), 2000));
}

// Spawn Exp khi kẻ địch bị tiêu diệt
function spawnExpAt(x, y) {
  const big = Math.random() < 0.33;
  const size = big ? 48 : 36;
  const exp = document.createElement('div');
  exp.className = 'exp';
  Object.assign(exp.style, {
    position: 'absolute',
    left: `${x}px`, top: `${y}px`,
    width: `${size}px`, height: `${size}px`,
    backgroundImage: `url('img/${big ? 'exp2.png' : 'exp.png'}')`,
    backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center'
  });
  exp.dataset.value = big ? 2 : 1;
  exps.push(exp);
  gameContainer.appendChild(exp);
}

function shootPlayerBullet() {
  if (gameEnded) return;
  const b = document.createElement('div'); b.className = 'bullet'; b.dataset.owner = 'player'; b.dataset.power = level;
  Object.assign(b.style, {left:`${parseInt(player.style.left,10)+64}px`, top:`${parseInt(player.style.top,10)+26}px`, width:'32px', height:'24px', backgroundImage:`url('img/bullet_lv${level}.png')`, backgroundSize:'contain', backgroundRepeat:'no-repeat', backgroundPosition:'center'});
  playerBullets.push(b);
  if (soundEnabled) { sounds.shoot.currentTime = 0; sounds.shoot.play(); }
  gameContainer.appendChild(b);
}

function shootBossBullet(boss) {
  if (gameEnded || !boss.parentNode) return;
  const b = document.createElement('div'); b.className = 'bullet'; b.dataset.owner = 'boss';
  Object.assign(b.style, {left:`${parseFloat(boss.style.left)-32}px`, top:`${parseFloat(boss.style.top)+64}px`, width:'32px', height:'24px', backgroundImage:"url('img/bullet_boss.png')", backgroundSize:'contain', backgroundRepeat:'no-repeat', backgroundPosition:'center'});
  bossBullets.push(b);
  gameContainer.appendChild(b);
}

function movePlayer() {
  let x = parseInt(player.style.left,10);
  let y = parseInt(player.style.top,10);
  if (keys['w']||keys['ArrowUp']) y -= PLAYER_SPEED;
  if (keys['s']||keys['ArrowDown']) y += PLAYER_SPEED;
  if (keys['a']||keys['ArrowLeft']) x -= PLAYER_SPEED;
  if (keys['d']||keys['ArrowRight']) x += PLAYER_SPEED;
  const cw = gameContainer.clientWidth, ch = gameContainer.clientHeight;
  const pw = player.offsetWidth, ph = player.offsetHeight;
  player.style.left = `${Math.min(cw-pw, Math.max(0, x))}px`;
  player.style.top = `${Math.min(ch-ph, Math.max(0, y))}px`;
}

function movePlayerBullets() {
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const b = playerBullets[i];
    b.style.left = `${parseFloat(b.style.left) + 6}px`;
    if (parseFloat(b.style.left) > gameContainer.clientWidth) { b.remove(); playerBullets.splice(i,1); continue; }
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (isColliding(b, e)) {
        showHitEffectAtBullet(b);
        const nh = Math.max(0, parseInt(e.dataset.hp) - parseInt(b.dataset.power));
        const exLeft = parseFloat(e.style.left);
        const exTop = parseFloat(e.style.top);
        e.dataset.hp = nh;
        b.remove(); playerBullets.splice(i,1);
        if (nh <= 0) {
          showExplosion(e.style.left, e.style.top, false);
          e.remove(); enemies.splice(j,1);
          // rơi exp từ kẻ địch vừa chết
          spawnExpAt(exLeft, exTop);
          scoreDisplay.textContent = ++score;
        } else {
          const hb = e.querySelector('.enemy-hp-bar');
          if (hb) hb.style.width = `${(nh / parseInt(e.dataset.maxHp)) * 100}%`;
        }
        break;
      }
    }
  }
}

function moveBossBullets() {
  for (let i = bossBullets.length - 1; i >= 0; i--) {
    const b = bossBullets[i];
    b.style.left = `${parseFloat(b.style.left) - 8}px`;
    if (parseFloat(b.style.left) < 0) { b.remove(); bossBullets.splice(i,1); continue; }
    if (isColliding(b, player)) { b.remove(); bossBullets.splice(i,1); endGame('defeat'); return; }
  }
}

function moveEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const sp = e.classList.contains('boss') ? speedBoss : speedEnemy;
    e.style.left = `${parseFloat(e.style.left) - sp}px`;
    if (parseFloat(e.style.left) < 24) {
      updateWallHP(e.classList.contains('boss') ? 20 : 10);
      shakeScreen();
      if (soundEnabled) { sounds.touchwall.currentTime = 0; sounds.touchwall.play(); }
      e.remove(); enemies.splice(i,1);
    }
  }
}

function checkExp() {
  for (let i = exps.length - 1; i >= 0; i--) {
    const a = exps[i];
    if (isColliding(a, player)) {
      a.remove(); exps.splice(i,1);
      progress += parseInt(a.dataset.value || 1);
      const fill = player.querySelector('.exp-bar-fill');
      if (progress >= 15 && level < 5) {
        level++;
        if (soundEnabled) {
          sounds.levelup.currentTime = 0;
          sounds.levelup.play();
        }
        progress = 0;
        fill.style.height = '0%';
      } else {
        const percent = Math.min(100, (progress / 15) * 100);
        fill.style.height = `${percent}%`;
      }      
      player.style.backgroundImage = `url('img/soldier_lv${level}.png')`;
      document.getElementById('level-tag').innerText = `Lv${level}`;
    }
  }
}

function checkVictory() {
  if (!spawnAllowed && !finalBossSpawned && enemies.length === 0) {
    finalBossSpawned = true; spawnFinalBoss();
  } else if (finalBossSpawned && enemies.length === 0) {
    endGame('victory'); if (stage === 1) showNextButton();
  }
}

function checkPlayerEnemyCollision() {
  if (!player || !player.getBoundingClientRect) return;
  const playerRect = player.getBoundingClientRect();
  if (!playerRect.width || !playerRect.height) return;
  for (const e of enemies) {
    if (isColliding(player, e)) { endGame('defeat'); return; }
  }
}

function showNextButton() {
  const btn = document.createElement('img'); btn.id = 'nextchap'; btn.src = 'img/next.png';
  Object.assign(btn.style, {position:'absolute', left:'50%', top:'65%', transform:'translate(-50%,-50%)', cursor:'pointer', zIndex:35});
  gameContainer.appendChild(btn);
  const lbl2 = document.createElement('div'); lbl2.id = 'stage2-label'; lbl2.innerText = 'STAGE 2';
  Object.assign(lbl2.style, {position:'absolute', top:'81%', left:'50%', transform:'translateX(-50%)', fontSize:'24px', fontFamily:"'Orbitron',sans-serif", fontWeight:'900', color:'#00ffff', textShadow:'0 0 6px #0ff', userSelect:'none', pointerEvents:'none', zIndex:21});
  gameContainer.appendChild(lbl2);
  btn.onclick = () => {
    const ov = document.createElement('div');
    Object.assign(ov.style, {position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'#000', opacity:0, zIndex:99, transition:'opacity 0.5s'});
    gameContainer.appendChild(ov);
    setTimeout(() => ov.style.opacity = 1, 0);
    intervals.forEach(id => clearInterval(id)); intervals = []; stage = 2; score = progress = 0; level = 1; wallHealth = 100; gameEnded = false; gameTime = 90; spawnAllowed = true; finalBossSpawned = false;
    setTimeout(() => { ov.remove(); lbl2.remove(); init(); }, 700);
  };
}

function updateWallHP(dmg) {
  wallHealth = Math.max(0, wallHealth - dmg);
  const bar = document.getElementById('wall-health-bar');
  const txt = document.getElementById('wall-health-text');
  if (bar && txt) {
    bar.style.height = wallHealth + '%';
    txt.textContent = wallHealth + '%';
    bar.style.background = wallHealth <= 20 ? 'red' : wallHealth <= 50 ? 'yellow' : 'green';
  }
  shakeScreen(); if (wallHealth <= 0) endGame('defeat');
}

function shakeScreen() {
  gameContainer.style.transform = 'translateX(-5px)';
  setTimeout(() => { gameContainer.style.transform = 'translateX(5px)'; setTimeout(() => gameContainer.style.transform = 'translateX(0)', 50); }, 50);
}

function isColliding(a, b) {
  const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
  return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
}

function showExplosion(l, t, big = false) {
  const fx = document.createElement('div');
  Object.assign(fx.style, {position:'absolute', left:l, top:t, width: big ? '96px' : '32px', height: big ? '96px' : '32px', borderRadius:'50%', background: big ? 'rgba(255,0,0,0.9)' : 'rgba(255,200,0,0.6)', boxShadow: big ? '0 0 40px 20px red' : '0 0 10px 5px orange', animation:'explode 0.4s ease-out', zIndex:99});
  if (!big && soundEnabled) { sounds.explode.currentTime = 0; sounds.explode.play(); }
  gameContainer.appendChild(fx); setTimeout(() => fx.remove(), 500);
}

function showHitEffectAtBullet(b) {
  const r1 = b.getBoundingClientRect(), r2 = gameContainer.getBoundingClientRect();
  const x = r1.left - r2.left + r1.width/2;
  const y = r1.top - r2.top + r1.height/2 + 2;
  const fx = document.createElement('div');
  Object.assign(fx.style, {position:'absolute', left:`${x}px`, top:`${y}px`, width:'28px', height:'28px', borderRadius:'50%', background:'radial-gradient(white 0%,rgba(255,255,255,0.1) 80%)', opacity:'0.9', pointerEvents:'none', transform:'translate(-50%,-50%) scale(1)', transition:'opacity 0.25s ease-out,transform 0.25s ease-out', zIndex:80});
  gameContainer.appendChild(fx); setTimeout(() => { fx.style.opacity = '0'; fx.style.transform = 'translate(-50%,-50%) scale(1.6)'; }, 10); setTimeout(() => fx.remove(), 300);
}

function endGame(type) {
  gameEnded = true; intervals.forEach(id => clearInterval(id));
  if (type === 'victory') triggerVictoryUI('victory'); else triggerVictoryUI('defeat');
}

function triggerVictoryUI(type) {
  if (type === 'victory' && stage === 2) {
    const msg = document.createElement('div'); msg.id = 'congrats-message';
    Object.assign(msg.style, {position:'absolute', left:'50%', top:'60%', transform:'translate(-50%,-50%)', color:'#fff', fontSize:'24px', textAlign:'center', zIndex:30});
    msg.innerHTML = `<div style="font-family:'Orbitron',sans-serif;font-weight:900;font-size:28px;color:#00ffcc;text-shadow:0 0 6px #0ff;">🎉 Congratulations!<br>You have completed the game!<br>Thank you for playing.</div>`;
    gameContainer.appendChild(msg);
  } else {
    resultImg.src = type === 'victory' ? 'img/victory.png' : 'img/defeat.png';
    Object.assign(resultImg.style, {display:'block', position:'absolute', left:'50%', top:'40%', transform:'translate(-50%, -50%)', maxWidth:'60%', maxHeight:'30%', objectFit:'contain'});
  }
  if (soundEnabled) {
    if (type === 'victory') sounds.victory.play(); else sounds.defeat.play();
  }
}

function clearAll() {
  enemies.forEach(e => e.remove()); enemies = [];
  exps.forEach(a => a.remove()); exps = [];
  playerBullets.forEach(b => b.remove()); playerBullets = [];
  bossBullets.forEach(b => b.remove()); bossBullets = [];
  if (player) { player.remove(); player = null; }
}

//Chỉ bắn khi nhấn/giữ nút #btn-fire
let firing = false;
let fireInterval;
const fireButton = document.getElementById('btn-fire');

if (fireButton) {
  fireButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    firing = true;
    shootPlayerBullet();
    fireInterval = setInterval(shoot, 200);
  });

  fireButton.addEventListener('touchend', () => {
    firing = false;
    clearInterval(fireInterval);
  });

  fireButton.addEventListener('mousedown', () => {
    firing = true;
    shootPlayerBullet();
    fireInterval = setInterval(shoot, 200);
  });

  fireButton.addEventListener('mouseup', () => {
    firing = false;
    clearInterval(fireInterval);
  });
}

window.addEventListener('load', init);

window.addEventListener('DOMContentLoaded', () => {
  if (isMobile()) {
    const joystickZone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');

    if (joystickZone && base && knob) {
      joystickZone.style.display = 'block';

      let knobActive = false;

      base.addEventListener('touchstart', () => {
        knobActive = true;
      }, { passive: false });

      base.addEventListener('touchmove', (e) => {
        if (!knobActive) return;
        const touch = e.touches[0];
        const rect = base.getBoundingClientRect();
        const dx = (touch.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const dy = (touch.clientY - rect.top - rect.height / 2) / (rect.height / 2);

        const clampedX = Math.max(-1, Math.min(1, dx));
        const clampedY = Math.max(-1, Math.min(1, dy));

        knob.style.left = `${35 + clampedX * 30}px`;
        knob.style.top = `${35 + clampedY * 30}px`;

        keys['w'] = clampedY < -0.4;
        keys['s'] = clampedY > 0.4;
        keys['a'] = clampedX < -0.4;
        keys['d'] = clampedX > 0.4;
      }, { passive: false });

      base.addEventListener('touchend', () => {
        knobActive = false;
        knob.style.left = '35px';
        knob.style.top = '35px';
        keys['w'] = keys['a'] = keys['s'] = keys['d'] = false;
      });
    }
  }
});

function startFiring() {
  if (!firing && !fireInterval) {
    firing = true;
    shootPlayerBullet();
    fireInterval = setInterval(shootPlayerBullet, FIRE_DELAY);
  }
}

function stopFiring() {
  firing = false;
  clearInterval(fireInterval);
  fireInterval = null;
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') startFiring();
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space') stopFiring();
});

document.addEventListener('mousedown', (e) => {
  if (!isMobile() && e.button === 0) startFiring();
});
document.addEventListener('mouseup', (e) => {
  if (!isMobile() && e.button === 0) stopFiring();
});
