import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Heart, Star, Feather, ArrowLeft, ArrowRight, ArrowUp, Zap, Pause, Play, Volume2, VolumeX, Lock } from 'lucide-react';

// ================================================================
// SECTION 1: IMPORTS & CONSTANTS
// ================================================================

const TRANSLATIONS = {
  en: {
    back: 'Back to Book',
    mapTitle: "Snowy's World Explorer",
    totalStars: 'Total Stars',
    level: 'Level',
    play: 'Play',
    resume: 'Resume',
    pause: 'Pause',
    nextLevel: 'Next Level',
    worldMap: 'World Map',
    tryAgain: 'Try Again',
    gameOver: 'Game Over!',
    gameOverMsg: 'Try again, Snowy believes in you!',
    levelComplete: 'Level Complete!',
    score: 'Score',
    stars: 'Stars',
    feathers: 'Feathers',
    health: 'Health',
    worlds: [
      'Emerald Jungle',
      'Crystal River',
      'Mystic Cave',
      'Volcano Ridge',
      'Starlit Sky'
    ],
    bossGateUnlocked: 'Boss Gate Unlocked!',
    bossGateLocked: 'Need 3+ Feathers'
  },
  de: {
    back: 'Zurück zum Buch',
    mapTitle: 'Snowys Weltentdecker',
    totalStars: 'Sterne gesamt',
    level: 'Level',
    play: 'Spielen',
    resume: 'Fortsetzen',
    pause: 'Pause',
    nextLevel: 'Nächstes Level',
    worldMap: 'Weltkarte',
    tryAgain: 'Nochmal versuchen',
    gameOver: 'Spiel Vorbei!',
    gameOverMsg: 'Versuch es nochmal, Snowy glaubt an dich!',
    levelComplete: 'Level Abgeschlossen!',
    score: 'Punktzahl',
    stars: 'Sterne',
    feathers: 'Federn',
    health: 'Leben',
    worlds: [
      'Smaragddschungel',
      'Kristallfluss',
      'Mystische Höhle',
      'Vulkanrücken',
      'Sternenhimmel'
    ],
    bossGateUnlocked: 'Boss-Tor entriegelt!',
    bossGateLocked: 'Brauche 3+ Federn'
  }
};

const CONSTANTS = {
  VIRTUAL_WIDTH: 1000,
  VIRTUAL_HEIGHT: 450,
  GROUND_Y: 380,
  GRAVITY: 1200,
  PLAYER_SPEED: 250,
  PLAYER_JUMP_VELOCITY: -550,
  PLAYER_DASH_SPEED: 600,
  PLAYER_DASH_DURATION: 0.3, 
  PLAYER_DASH_COOLDOWN: 1.0,
  INVINCIBILITY_DURATION: 1.5,
  MAX_HEALTH: 3,
  LEVEL_LENGTH: 5000,
  BOSS_AREA_START: 4500
};

// ================================================================
// SECTION 2: SOUND EFFECTS (Web Audio API)
// ================================================================

let audioCtx = null;
const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playTone = (freq, type, duration, vol = 0.1, slideFreq = null) => {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (slideFreq) {
    osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
  }
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

const SoundFX = {
  playJump: () => playTone(300, 'sine', 0.3, 0.1, 600),
  playDoubleJump: () => playTone(500, 'sine', 0.3, 0.1, 800),
  playDash: () => playTone(150, 'square', 0.2, 0.05, 50),
  playStompEnemy: () => playTone(200, 'triangle', 0.2, 0.15, 600),
  playCollectStar: () => {
    playTone(600, 'sine', 0.1, 0.1, 800);
    setTimeout(() => playTone(800, 'sine', 0.2, 0.1, 1200), 50);
  },
  playCollectHeart: () => playTone(400, 'sine', 0.3, 0.1, 450),
  playCollectFeather: () => playTone(300, 'triangle', 0.2, 0.1, 500),
  playDamage: () => playTone(150, 'sawtooth', 0.3, 0.2, 50),
  playBossHit: () => {
    playTone(100, 'square', 0.3, 0.2, 50);
    setTimeout(() => playTone(300, 'triangle', 0.2, 0.2, 400), 100);
  },
  playBossDefeat: () => {
    playTone(300, 'square', 0.2, 0.2, 400);
    setTimeout(() => playTone(400, 'square', 0.2, 0.2, 500), 200);
    setTimeout(() => playTone(500, 'square', 0.4, 0.2, 600), 400);
  },
  playLevelComplete: () => {
    playTone(440, 'sine', 0.2, 0.2);
    setTimeout(() => playTone(554, 'sine', 0.2, 0.2), 200);
    setTimeout(() => playTone(659, 'sine', 0.2, 0.2), 400);
    setTimeout(() => playTone(880, 'sine', 0.6, 0.2), 600);
  }
};

// ================================================================
// SECTION 3: LEVEL DATA (Procedural Generation)
// ================================================================

const THEMES = [
  { id: 'jungle', colorBgTop: '#4ade80', colorBgBot: '#bbf7d0', platColor: '#65a30d', platTop: '#4d7c0f', enemyType: 'caterpillar', bossType: 'flytrap' },
  { id: 'river', colorBgTop: '#38bdf8', colorBgBot: '#bae6fd', platColor: '#94a3b8', platTop: '#0ea5e9', enemyType: 'frog', bossType: 'croc' },
  { id: 'cave', colorBgTop: '#2e1065', colorBgBot: '#581c87', platColor: '#4c1d95', platTop: '#a855f7', enemyType: 'bat', bossType: 'golem' },
  { id: 'volcano', colorBgTop: '#7f1d1d', colorBgBot: '#b91c1c', platColor: '#450a0a', platTop: '#f59e0b', enemyType: 'slime', bossType: 'dragon' },
  { id: 'sky', colorBgTop: '#1e1b4b', colorBgBot: '#312e81', platColor: '#e0e7ff', platTop: '#ffffff', enemyType: 'spirit', bossType: 'storm' },
];

const generateLevel = (worldIndex) => {
  const theme = THEMES[worldIndex];
  const level = {
    theme,
    platforms: [],
    enemies: [],
    collectibles: [],
    boss: null,
    goal: null
  };

  let x = 0;
  while (x < CONSTANTS.LEVEL_LENGTH - 600) {
    const width = 300 + Math.random() * 400;
    level.platforms.push({ x, y: CONSTANTS.GROUND_Y, w: width, h: 100 });
    x += width + (100 + Math.random() * 150);
  }

  for (let px = 400; px < CONSTANTS.BOSS_AREA_START - 200; px += 300) {
    const yOffsets = [280, 200, 150];
    const y = yOffsets[Math.floor(Math.random() * yOffsets.length)];
    const w = 100 + Math.random() * 100;
    level.platforms.push({ x: px, y, w, h: 20 });

    const rand = Math.random();
    if (rand < 0.1) {
      level.collectibles.push({ type: 'heart', x: px + w/2 - 10, y: y - 30, w: 20, h: 20, collected: false });
    } else if (rand < 0.3) {
      level.collectibles.push({ type: 'feather', x: px + w/2 - 10, y: y - 30, w: 20, h: 20, collected: false });
    } else {
      level.collectibles.push({ type: 'star', x: px + w/2 - 10, y: y - 30, w: 20, h: 20, collected: false });
    }

    if (Math.random() < 0.5) {
      level.enemies.push({
        type: theme.enemyType,
        x: px + w/2,
        y: y - 24,
        w: 24, h: 24,
        vx: theme.enemyType === 'bat' || theme.enemyType === 'spirit' ? -50 : (Math.random() > 0.5 ? 50 : -50),
        vy: 0,
        startX: px,
        range: w,
        dead: false,
        flashTimer: 0
      });
    }
  }
  
  for(let i=0; i<5; i++){
      level.collectibles.push({ type: 'feather', x: 500 + i*700, y: CONSTANTS.GROUND_Y - 40, w: 20, h: 20, collected: false });
  }

  level.platforms.push({ x: CONSTANTS.BOSS_AREA_START - 100, y: CONSTANTS.GROUND_Y, w: 1000, h: 100 });
  
  level.boss = {
    type: theme.bossType,
    x: CONSTANTS.BOSS_AREA_START + 300,
    y: CONSTANTS.GROUND_Y - 80,
    w: 80, h: 80,
    hp: 3,
    maxHp: 3,
    vx: -100,
    vy: 0,
    state: 'patrol',
    timer: 0,
    flashTimer: 0,
    startX: CONSTANTS.BOSS_AREA_START + 100,
    range: 400
  };

  level.goal = {
    x: CONSTANTS.BOSS_AREA_START + 600,
    y: CONSTANTS.GROUND_Y - 60,
    w: 40, h: 60,
    unlocked: false
  };

  return level;
};

// ================================================================
// SECTION 4: DRAWING HELPERS
// ================================================================

// Helper for rounded rectangles (with polyfill for older Canvas 2D engines)
const drawRoundRect = (ctx, x, y, w, h, r = 5) => {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
};

const drawSnowy = (ctx, player) => {
  ctx.save();
  ctx.translate(player.x, player.y);
  
  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }
  
  if (player.dashTimer > 0) {
    ctx.shadowColor = '#2dd4bf';
    ctx.shadowBlur = 15;
  }

  if (player.dir === -1) {
    ctx.scale(-1, 1);
  }

  const walkBob = player.vx !== 0 && player.isGrounded ? Math.sin(Date.now() / 50) * 2 : 0;
  ctx.translate(0, walkBob);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, -15, 16, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.ellipse(8, -28, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fb7185';
  [[-12, -22], [-16, -12], [-14, -2]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - 8, sy - 4);
    ctx.lineTo(sx - 2, sy + 6);
    ctx.fill();
  });

  ctx.fillStyle = '#2dd4bf';
  ctx.shadowColor = '#2dd4bf';
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(6, -12, 3, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(12, -30, 2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(251, 113, 133, 0.5)';
  ctx.beginPath();
  ctx.arc(14, -26, 3, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  const legSwing = player.vx !== 0 && player.isGrounded ? Math.sin(Date.now() / 50) * 5 : 0;
  
  ctx.beginPath();
  drawRoundRect(ctx, -8 + legSwing, -2, 6, 8, 3);
  ctx.fill();
  
  ctx.beginPath();
  drawRoundRect(ctx, 4 - legSwing, -2, 6, 8, 3);
  ctx.fill();

  ctx.restore();
};

const drawEnemy = (ctx, enemy) => {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  
  if (enemy.flashTimer > 0) {
    ctx.fillStyle = '#ff0000';
  } else {
    switch (enemy.type) {
      case 'caterpillar': ctx.fillStyle = '#65a30d'; break;
      case 'frog': ctx.fillStyle = '#10b981'; break;
      case 'bat': ctx.fillStyle = '#4c1d95'; break;
      case 'slime': ctx.fillStyle = '#ef4444'; break;
      case 'spirit': ctx.fillStyle = '#e0e7ff'; break;
      default: ctx.fillStyle = '#000000';
    }
  }

  const bob = Math.sin(Date.now() / 150) * 3;
  ctx.beginPath();
  drawRoundRect(ctx, -enemy.w/2, -enemy.h/2 + bob, enemy.w, enemy.h, 5);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-4, -enemy.h/4 + bob, 2, 0, Math.PI*2);
  ctx.arc(4, -enemy.h/4 + bob, 2, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
};

const drawBoss = (ctx, boss) => {
  ctx.save();
  ctx.translate(boss.x, boss.y);

  if (boss.flashTimer > 0) {
    ctx.fillStyle = '#ffffff';
  } else {
    switch (boss.type) {
      case 'flytrap': ctx.fillStyle = '#15803d'; break;
      case 'croc': ctx.fillStyle = '#0369a1'; break;
      case 'golem': ctx.fillStyle = '#581c87'; break;
      case 'dragon': ctx.fillStyle = '#991b1b'; break;
      case 'storm': ctx.fillStyle = '#312e81'; break;
      default: ctx.fillStyle = '#000';
    }
  }

  const shake = boss.state === 'vulnerable' ? Math.sin(Date.now()/20)*2 : Math.sin(Date.now()/200)*5;
  
  ctx.beginPath();
  drawRoundRect(ctx, -boss.w/2 + shake, -boss.h/2, boss.w, boss.h, 10);
  ctx.fill();
  
  ctx.fillStyle = '#000';
  ctx.fillRect(-boss.w/2, -boss.h/2 - 15, boss.w, 6);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-boss.w/2, -boss.h/2 - 15, boss.w * (boss.hp / boss.maxHp), 6);

  ctx.restore();
};

// ================================================================
// SECTION 5: MAIN COMPONENT
// ================================================================

export default function SnowyGame({ onBackToBook, language = 'en', onLanguageChange }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  
  const [screen, setScreen] = useState('worldMap');
  const [currentWorld, setCurrentWorld] = useState(0);
  const [progress, setProgress] = useState({ levels: [], totalStars: 0 });
  
  const [uiState, setUiState] = useState({
    score: 0,
    health: 3,
    stars: 0,
    feathers: 0,
    isPaused: false,
    soundEnabled: true
  });

  const canvasRef = useRef(null);
  const reqRef = useRef(null);
  const lastTimeRef = useRef(0);
  const keysRef = useRef({});
  const touchRef = useRef({ left: false, right: false, jump: false, dash: false });
  
  const engineRef = useRef({
    player: null,
    level: null,
    particles: [],
    cameraX: 0
  });

  useEffect(() => {
    const saved = localStorage.getItem('snowy_world_explorer');
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch { console.error('Save parse error'); }
    } else {
      setProgress({
        levels: [ { completed: false, stars: 0, bestScore: 0 } ],
        totalStars: 0
      });
    }
  }, []);

  const saveProgress = (lvlIndex, stars, score) => {
    setProgress(prev => {
      const newLevels = [...prev.levels];
      if (!newLevels[lvlIndex]) newLevels[lvlIndex] = { completed: false, stars: 0, bestScore: 0 };
      
      const prevStars = newLevels[lvlIndex].stars;
      newLevels[lvlIndex].completed = true;
      newLevels[lvlIndex].stars = Math.max(prevStars, stars);
      newLevels[lvlIndex].bestScore = Math.max(newLevels[lvlIndex].bestScore || 0, score);
      
      if (lvlIndex + 1 < THEMES.length && !newLevels[lvlIndex + 1]) {
        newLevels[lvlIndex + 1] = { completed: false, stars: 0, bestScore: 0 };
      }
      
      const totalStars = newLevels.reduce((sum, l) => sum + (l?.stars || 0), 0);
      const newState = { levels: newLevels, totalStars };
      localStorage.setItem('snowy_world_explorer', JSON.stringify(newState));
      return newState;
    });
  };

  const initGame = (worldIndex) => {
    initAudio();
    setCurrentWorld(worldIndex);
    
    engineRef.current.level = generateLevel(worldIndex);
    engineRef.current.player = {
      x: 100, y: 200, w: 20, h: 30,
      vx: 0, vy: 0, dir: 1,
      isGrounded: false,
      canDoubleJump: true,
      dashTimer: 0,
      dashCooldown: 0,
      invincibleTimer: 0,
    };
    engineRef.current.cameraX = 0;
    engineRef.current.particles = [];
    
    setUiState({ score: 0, health: CONSTANTS.MAX_HEALTH, stars: 0, feathers: 0, isPaused: false, soundEnabled: uiState.soundEnabled });
    setScreen('playing');
  };

  const update = useCallback((dt) => {
    if (uiState.isPaused || screen !== 'playing') return;
    
    const engine = engineRef.current;
    const { player, level, particles } = engine;
    
    const k = keysRef.current;
    const tch = touchRef.current;
    
    const intentLeft = k['ArrowLeft'] || k['a'] || tch.left;
    const intentRight = k['ArrowRight'] || k['d'] || tch.right;
    const intentJump = k['ArrowUp'] || k['w'] || k[' '] || tch.jump;
    const intentDash = k['Shift'] || k['z'] || tch.dash;

    if (player.dashTimer > 0) player.dashTimer -= dt;
    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (player.invincibleTimer > 0) player.invincibleTimer -= dt;

    if (player.dashTimer <= 0) {
      if (intentLeft) { player.vx = -CONSTANTS.PLAYER_SPEED; player.dir = -1; }
      else if (intentRight) { player.vx = CONSTANTS.PLAYER_SPEED; player.dir = 1; }
      else { player.vx = 0; }
      
      if (intentDash && player.dashCooldown <= 0) {
        player.dashTimer = CONSTANTS.PLAYER_DASH_DURATION;
        player.dashCooldown = CONSTANTS.PLAYER_DASH_COOLDOWN;
        if(uiState.soundEnabled) SoundFX.playDash();
        for(let i=0; i<5; i++){
          particles.push({ x: player.x, y: player.y-10, vx: -player.dir*100, vy: (Math.random()-0.5)*50, life: 0.5, color: '#2dd4bf' });
        }
      }
    } else {
      player.vx = player.dir * CONSTANTS.PLAYER_DASH_SPEED;
    }

    player.vy += CONSTANTS.GRAVITY * dt;

    player.x += player.vx * dt;
    let groundedThisFrame = false;
    
    const boundsX = { left: player.x - 10, right: player.x + 10, top: player.y - 30, bottom: player.y };
    for (const p of level.platforms) {
      if (boundsX.right > p.x && boundsX.left < p.x + p.w && boundsX.bottom > p.y && boundsX.top < p.y + p.h) {
        if (player.vx > 0) player.x = p.x - 10;
        else if (player.vx < 0) player.x = p.x + p.w + 10;
        player.vx = 0;
      }
    }
    
    if (player.x < 10) player.x = 10;

    player.y += player.vy * dt;
    const boundsY = { left: player.x - 10, right: player.x + 10, top: player.y - 30, bottom: player.y };
    for (const p of level.platforms) {
      if (boundsY.right > p.x && boundsY.left < p.x + p.w && boundsY.bottom > p.y && boundsY.top < p.y + p.h) {
        if (player.vy > 0) {
          player.y = p.y;
          player.vy = 0;
          groundedThisFrame = true;
        } else if (player.vy < 0) {
          player.y = p.y + p.h + 30;
          player.vy = 0;
        }
      }
    }
    
    if (player.y > CONSTANTS.VIRTUAL_HEIGHT + 100) {
      setUiState(prev => {
        if (prev.soundEnabled) SoundFX.playDamage();
        const newHealth = prev.health - 1;
        if (newHealth <= 0) setScreen('gameOver');
        return { ...prev, health: newHealth };
      });
      player.x = Math.max(100, player.x - 300);
      player.y = 100;
      player.vy = 0;
    }

    if (groundedThisFrame) {
      player.isGrounded = true;
      player.canDoubleJump = true;
    } else {
      player.isGrounded = false;
    }

    if (intentJump) {
      if (player.isGrounded && !player.jumpPressed) {
        player.vy = CONSTANTS.PLAYER_JUMP_VELOCITY;
        if(uiState.soundEnabled) SoundFX.playJump();
        for(let i=0;i<5;i++) particles.push({x: player.x + (Math.random()-0.5)*20, y: player.y, vx: (Math.random()-0.5)*20, vy: -Math.random()*30, life: 0.3, color: '#fff'});
      } else if (!player.isGrounded && player.canDoubleJump && !player.jumpPressed) {
        player.vy = CONSTANTS.PLAYER_JUMP_VELOCITY * 0.8;
        player.canDoubleJump = false;
        if(uiState.soundEnabled) SoundFX.playDoubleJump();
        for(let i=0;i<8;i++) particles.push({x: player.x, y: player.y-10, vx: (Math.random()-0.5)*50, vy: (Math.random()-0.5)*50, life: 0.4, color: '#2dd4bf'});
      }
      player.jumpPressed = true;
    } else {
      player.jumpPressed = false;
    }

    const targetCamX = player.x - CONSTANTS.VIRTUAL_WIDTH * 0.35;
    engine.cameraX += (targetCamX - engine.cameraX) * 5 * dt;
    engine.cameraX = Math.max(0, engine.cameraX);

    for (const enemy of level.enemies) {
      if (enemy.dead) continue;
      
      enemy.x += enemy.vx * dt;
      if (enemy.x > enemy.startX + enemy.range || enemy.x < enemy.startX) {
        enemy.vx *= -1;
      }
      if (enemy.flashTimer > 0) enemy.flashTimer -= dt;

      if (player.invincibleTimer <= 0 && player.dashTimer <= 0 && !enemy.dead) {
        const dx = player.x - enemy.x;
        const dy = (player.y - 15) - enemy.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 25) {
          if (player.vy > 0 && player.y < enemy.y + 10) {
            enemy.dead = true;
            player.vy = CONSTANTS.PLAYER_JUMP_VELOCITY * 0.8;
            if(uiState.soundEnabled) SoundFX.playStompEnemy();
            setUiState(prev => ({ ...prev, score: prev.score + 100 }));
            for(let i=0;i<10;i++) particles.push({x: enemy.x, y: enemy.y, vx: (Math.random()-0.5)*100, vy: (Math.random()-0.5)*100, life: 0.5, color: '#fff'});
          } else {
            if(uiState.soundEnabled) SoundFX.playDamage();
            player.invincibleTimer = CONSTANTS.INVINCIBILITY_DURATION;
            setUiState(prev => {
              const h = prev.health - 1;
              if (h <= 0) setScreen('gameOver');
              return { ...prev, health: h };
            });
          }
        }
      }
    }

    if (level.boss && level.boss.hp > 0 && player.x > CONSTANTS.BOSS_AREA_START - 200) {
      const boss = level.boss;
      boss.timer -= dt;
      if (boss.flashTimer > 0) boss.flashTimer -= dt;

      if (boss.state === 'patrol') {
        boss.x += boss.vx * dt;
        if (boss.x > boss.startX + boss.range || boss.x < boss.startX) boss.vx *= -1;
        if (boss.timer <= 0) {
          boss.state = 'vulnerable';
          boss.timer = 2.0;
        }
      } else if (boss.state === 'vulnerable') {
        if (boss.timer <= 0) {
          boss.state = 'patrol';
          boss.timer = 3.0;
          boss.vx = boss.vx > 0 ? 150 : -150;
        }
      }

      if (player.invincibleTimer <= 0 && player.dashTimer <= 0) {
        const dx = player.x - boss.x;
        const dy = (player.y - 15) - boss.y;
        if (Math.abs(dx) < boss.w/2 + 10 && Math.abs(dy) < boss.h/2 + 15) {
          if (player.vy > 0 && player.y < boss.y && boss.state === 'vulnerable') {
            boss.hp -= 1;
            boss.flashTimer = 0.5;
            player.vy = CONSTANTS.PLAYER_JUMP_VELOCITY;
            if(uiState.soundEnabled) SoundFX.playBossHit();
            
            if (boss.hp <= 0) {
               if(uiState.soundEnabled) SoundFX.playBossDefeat();
               setUiState(prev => ({ ...prev, score: prev.score + 1000 }));
               for(let i=0;i<30;i++) particles.push({x: boss.x, y: boss.y, vx: (Math.random()-0.5)*200, vy: (Math.random()-0.5)*200, life: 1.0, color: '#f59e0b'});
               level.goal.unlocked = true;
            } else {
               boss.state = 'patrol';
               boss.timer = 2.0;
               boss.vx *= 1.2;
            }
          } else {
            if(uiState.soundEnabled) SoundFX.playDamage();
            player.invincibleTimer = CONSTANTS.INVINCIBILITY_DURATION;
            setUiState(prev => {
              const h = prev.health - 1;
              if (h <= 0) setScreen('gameOver');
              return { ...prev, health: h };
            });
          }
        }
      }
    }

    for (const c of level.collectibles) {
      if (c.collected) continue;
      if (Math.abs(player.x - c.x) < 20 && Math.abs((player.y - 15) - c.y) < 25) {
        c.collected = true;
        setUiState(prev => {
          let newScore = prev.score;
          let newHealth = prev.health;
          let newStars = prev.stars;
          let newFeathers = prev.feathers;

          if (c.type === 'star') {
            if(prev.soundEnabled) SoundFX.playCollectStar();
            newScore += 50;
            newStars += 1;
          } else if (c.type === 'heart') {
            if(prev.soundEnabled) SoundFX.playCollectHeart();
            newHealth = Math.min(CONSTANTS.MAX_HEALTH, newHealth + 1);
          } else if (c.type === 'feather') {
            if(prev.soundEnabled) SoundFX.playCollectFeather();
            newScore += 100;
            newFeathers += 1;
          }
          return { ...prev, score: newScore, health: newHealth, stars: newStars, feathers: newFeathers };
        });
        for(let i=0;i<5;i++) particles.push({x: c.x, y: c.y, vx: (Math.random()-0.5)*50, vy: (Math.random()-0.5)*50, life: 0.5, color: '#fbbf24'});
      }
    }

    if (uiState.feathers >= 3) {
        level.goal.unlocked = true;
    }
    if (level.goal && level.goal.unlocked && Math.abs(player.x - level.goal.x) < 30) {
       if(uiState.soundEnabled) SoundFX.playLevelComplete();
       let finalStars = 1;
       if (uiState.feathers >= 5) finalStars++;
       if (uiState.health === CONSTANTS.MAX_HEALTH) finalStars++;
       
       saveProgress(currentWorld, finalStars, uiState.score);
       setScreen('levelComplete');
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

  }, [uiState, screen, currentWorld]);

  const draw = useCallback((ctx) => {
    if (!ctx) return;
    const { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } = CONSTANTS;
    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    
    if (screen !== 'playing') return;

    const { player, level, particles, cameraX } = engineRef.current;
    
    ctx.fillStyle = level.theme.colorBgTop;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    
    const gradient = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
    gradient.addColorStop(0, level.theme.colorBgTop);
    gradient.addColorStop(1, level.theme.colorBgBot);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    ctx.save();
    ctx.translate(-cameraX, 0);

    for (const p of level.platforms) {
      ctx.fillStyle = level.theme.platColor;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = level.theme.platTop;
      ctx.fillRect(p.x, p.y, p.w, 10);
    }

    for (const c of level.collectibles) {
      if (c.collected) continue;
      const bob = Math.sin(Date.now() / 200 + c.x) * 4;
      if (c.type === 'star') {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(c.x, c.y + bob, 8, 0, Math.PI*2);
        ctx.fill();
      } else if (c.type === 'heart') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(c.x - 4, c.y + bob, 4, 0, Math.PI*2);
        ctx.arc(c.x + 4, c.y + bob, 4, 0, Math.PI*2);
        ctx.fill();
      } else if (c.type === 'feather') {
        ctx.fillStyle = '#fcd34d';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y + bob, 4, 10, Math.PI/4, 0, Math.PI*2);
        ctx.fill();
      }
    }

    if (level.goal) {
      ctx.fillStyle = level.goal.unlocked ? '#2dd4bf' : '#64748b';
      ctx.beginPath();
      ctx.ellipse(level.goal.x, level.goal.y, level.goal.w/2, level.goal.h/2, 0, 0, Math.PI*2);
      ctx.fill();
      if (level.goal.unlocked) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(level.goal.x, level.goal.y, level.goal.w/2 + Math.sin(Date.now()/100)*5, level.goal.h/2 + Math.sin(Date.now()/100)*5, 0, 0, Math.PI*2);
        ctx.stroke();
      }
    }

    for (const enemy of level.enemies) {
      if (!enemy.dead) drawEnemy(ctx, enemy);
    }

    if (level.boss && level.boss.hp > 0) {
      drawBoss(ctx, level.boss);
    }

    drawSnowy(ctx, player);

    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }, [screen]);

  const tick = useCallback((time) => {
    if (lastTimeRef.current) {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      update(dt);
      
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        draw(ctx);
      }
    }
    lastTimeRef.current = time;
    reqRef.current = requestAnimationFrame(tick);
  }, [update, draw]);

  useEffect(() => {
    reqRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(reqRef.current);
  }, [tick]);

  useEffect(() => {
    const handleKeyDown = (e) => { keysRef.current[e.key] = true; };
    const handleKeyUp = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const renderWorldMap = () => (
    <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 to-purple-900 text-white flex flex-col items-center justify-center overflow-hidden font-['Comic_Neue']">
      
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
        <button onClick={onBackToBook} className="flex items-center gap-2 hover:text-pink-300 transition-colors">
          <ArrowLeft size={24} /> {t.back}
        </button>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1 text-yellow-300">
            <Star fill="currentColor" size={24} /> 
            <span className="text-xl font-bold">{progress.totalStars}</span>
          </div>
          <button 
            onClick={() => onLanguageChange && onLanguageChange(language === 'en' ? 'de' : 'en')} 
            className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-full transition text-sm font-semibold border border-white/30 text-white backdrop-blur-md active:scale-95"
            aria-label="Toggle language"
          >
            {language === 'en' ? '🇺🇸 EN' : '🇩🇪 DE'}
          </button>
        </div>
      </div>
      
      <h1 className="text-5xl font-bold font-['Updock'] text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-teal-300 mb-8 z-10 text-center drop-shadow-lg">
        {t.mapTitle}
      </h1>

      <div className="relative w-full max-w-4xl h-64 flex items-center justify-center z-10">
        <div className="absolute top-1/2 left-10 right-10 h-2 bg-white/20 border-y border-white/10 border-dashed rounded-full -translate-y-1/2"></div>
        
        {THEMES.map((theme, i) => {
          const lvlData = progress.levels[i];
          const isUnlocked = !!lvlData || i === 0;
          const isCompleted = lvlData?.completed;
          const stars = lvlData?.stars || 0;
          
          return (
            <div key={theme.id} className="absolute flex flex-col items-center" style={{ left: `${(i/4)*80 + 10}%`, transform: 'translateX(-50%)' }}>
              <div className="mb-2 text-sm font-bold text-center whitespace-nowrap text-pink-100 drop-shadow-md">
                {t.worlds[i]}
              </div>
              <button 
                disabled={!isUnlocked}
                onClick={() => initGame(i)}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isUnlocked ? 'bg-gradient-to-br from-pink-400 to-teal-400 hover:scale-110 shadow-lg shadow-teal-500/50 cursor-pointer' 
                           : 'bg-gray-700 cursor-not-allowed opacity-70'
                }`}
                style={{ border: `4px solid ${theme.platTop}` }}
              >
                {isUnlocked ? <Play size={32} fill="white" /> : <Lock size={32} className="text-gray-400" />}
                
                {isUnlocked && !isCompleted && (
                  <div className="absolute inset-0 rounded-full border-4 border-white animate-ping opacity-50"></div>
                )}
              </button>
              
              <div className="mt-3 flex gap-1">
                {[1, 2, 3].map(s => (
                  <Star key={s} size={16} 
                    className={s <= stars ? 'text-yellow-300' : 'text-gray-500/50'} 
                    fill={s <= stars ? 'currentColor' : 'none'} 
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderHUD = () => (
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between pointer-events-none font-['Comic_Neue'] text-white drop-shadow-md z-10">
      <div className="flex gap-4 pointer-events-auto">
        <button onClick={() => setUiState(p => ({ ...p, isPaused: !p.isPaused }))} className="p-2 bg-black/30 rounded-full hover:bg-black/50">
          {uiState.isPaused ? <Play size={24} /> : <Pause size={24} />}
        </button>
        <button onClick={() => setUiState(p => ({ ...p, soundEnabled: !p.soundEnabled }))} className="p-2 bg-black/30 rounded-full hover:bg-black/50">
          {uiState.soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
        <div className="py-2 px-4 bg-black/30 rounded-full font-bold">
          {t.worlds[currentWorld]}
        </div>
      </div>
      
      <div className="flex gap-6 items-center bg-black/30 px-6 py-2 rounded-full">
        <div className="flex gap-1">
          {[...Array(CONSTANTS.MAX_HEALTH)].map((_, i) => (
            <Heart key={i} size={24} className={i < uiState.health ? 'text-red-500' : 'text-gray-600'} fill={i < uiState.health ? 'currentColor' : 'none'} />
          ))}
        </div>
        <div className="flex items-center gap-2 text-yellow-300 font-bold text-xl">
          <Star fill="currentColor" size={24} /> {uiState.score}
        </div>
        <div className={`flex items-center gap-2 font-bold text-xl ${uiState.feathers >= 3 ? 'text-teal-300' : 'text-gray-300'}`}>
          <Feather fill="currentColor" size={24} /> {uiState.feathers}/5
        </div>
      </div>
      
      {uiState.isPaused && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center pointer-events-auto">
          <div className="bg-white text-slate-800 p-8 rounded-3xl flex flex-col gap-4 text-center max-w-sm w-full">
            <h2 className="text-3xl font-bold font-['Updock']">{t.pause}</h2>
            <button onClick={() => setUiState(p => ({ ...p, isPaused: false }))} className="py-3 px-6 bg-teal-500 text-white font-bold rounded-xl hover:bg-teal-600">
              {t.resume}
            </button>
            <button onClick={() => setScreen('worldMap')} className="py-3 px-6 bg-gray-200 text-slate-700 font-bold rounded-xl hover:bg-gray-300">
              {t.worldMap}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderTouchControls = () => (
    <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between sm:hidden pointer-events-none z-10">
      <div className="flex gap-4">
        <button 
          className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center pointer-events-auto active:bg-white/40 touch-none"
          onTouchStart={(e) => { e.preventDefault(); touchRef.current.left = true; }}
          onTouchEnd={(e) => { e.preventDefault(); touchRef.current.left = false; }}
        ><ArrowLeft size={32} color="white" /></button>
        <button 
          className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center pointer-events-auto active:bg-white/40 touch-none"
          onTouchStart={(e) => { e.preventDefault(); touchRef.current.right = true; }}
          onTouchEnd={(e) => { e.preventDefault(); touchRef.current.right = false; }}
        ><ArrowRight size={32} color="white" /></button>
      </div>
      <div className="flex gap-4 items-end">
        <button 
          className="w-12 h-12 bg-teal-500/50 backdrop-blur-sm rounded-full flex items-center justify-center pointer-events-auto active:bg-teal-500/80 touch-none mb-2"
          onTouchStart={(e) => { e.preventDefault(); touchRef.current.dash = true; }}
          onTouchEnd={(e) => { e.preventDefault(); touchRef.current.dash = false; }}
        ><Zap size={24} color="white" /></button>
        <button 
          className="w-20 h-20 bg-pink-500/50 backdrop-blur-sm rounded-full flex items-center justify-center pointer-events-auto active:bg-pink-500/80 touch-none"
          onTouchStart={(e) => { e.preventDefault(); touchRef.current.jump = true; }}
          onTouchEnd={(e) => { e.preventDefault(); touchRef.current.jump = false; }}
        ><ArrowUp size={40} color="white" /></button>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden select-none bg-slate-900 flex flex-col items-center justify-between">
      
      {screen === 'worldMap' && renderWorldMap()}
      
      {(screen === 'playing' || screen === 'levelComplete' || screen === 'gameOver') && (
        <>
          <canvas
            ref={canvasRef}
            width={CONSTANTS.VIRTUAL_WIDTH}
            height={CONSTANTS.VIRTUAL_HEIGHT}
            className="w-full h-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
          {renderHUD()}
          {renderTouchControls()}
        </>
      )}

      {screen === 'levelComplete' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 font-['Comic_Neue']">
          <div className="bg-gradient-to-b from-indigo-900 to-purple-900 border-4 border-teal-400 p-8 rounded-3xl flex flex-col items-center gap-6 text-white max-w-md w-full shadow-2xl shadow-teal-500/20">
            <h2 className="text-4xl font-bold font-['Updock'] text-teal-300">{t.levelComplete}</h2>
            
            <div className="flex gap-2">
              {[1, 2, 3].map(s => {
                const starsEarned = (progress.levels[currentWorld]?.stars || 1);
                return (
                  <Star key={s} size={48} 
                    className={s <= starsEarned ? 'text-yellow-400' : 'text-gray-600'} 
                    fill={s <= starsEarned ? 'currentColor' : 'none'} 
                  />
                );
              })}
            </div>
            
            <div className="text-2xl text-center bg-black/30 w-full py-4 rounded-xl border border-white/10">
              <div className="text-sm text-gray-400 uppercase tracking-widest">{t.score}</div>
              <div className="font-bold text-yellow-300">{uiState.score}</div>
            </div>
            
            <div className="flex w-full gap-4 mt-2">
              <button onClick={() => setScreen('worldMap')} className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-colors">
                {t.worldMap}
              </button>
              {currentWorld + 1 < THEMES.length && (
                <button onClick={() => initGame(currentWorld + 1)} className="flex-1 py-4 bg-gradient-to-r from-teal-400 to-teal-600 hover:from-teal-300 hover:to-teal-500 rounded-xl font-bold shadow-lg text-slate-900 transition-all transform hover:scale-105">
                  {t.nextLevel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {screen === 'gameOver' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 font-['Comic_Neue']">
          <div className="bg-slate-900 border-4 border-pink-500 p-8 rounded-3xl flex flex-col items-center gap-6 text-white max-w-md w-full">
            <h2 className="text-4xl font-bold text-pink-500">{t.gameOver}</h2>
            <p className="text-xl text-center text-gray-300">{t.gameOverMsg}</p>
            
            <div className="flex w-full gap-4 mt-4">
              <button onClick={() => setScreen('worldMap')} className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-colors">
                {t.worldMap}
              </button>
              <button onClick={() => initGame(currentWorld)} className="flex-1 py-4 bg-pink-600 hover:bg-pink-500 rounded-xl font-bold shadow-lg shadow-pink-500/20 transition-all transform hover:scale-105">
                {t.tryAgain}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

SnowyGame.propTypes = {
  onBackToBook: PropTypes.func.isRequired,
  language: PropTypes.oneOf(['en', 'de']),
  onLanguageChange: PropTypes.func.isRequired
};
