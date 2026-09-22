import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  BookOpen, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Trophy, 
  Heart, 
  Play, 
  ArrowUp
} from 'lucide-react';

// Sound effect synthesizer via Web Audio API (zero external sound downloads needed)
class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playJump() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.16);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playHeartPickup() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.12, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.15);
    });
  }

  playBuzzBonus() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [440, 554.37, 659.25, 880, 1108.73].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.15, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.32);
    });
  }

  playBump() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.22);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }
}

const sfx = new SoundFX();

const SnowyGame = ({ onBackToBook, language = 'en', onLanguageChange }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Game UI States
  const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'paused' | 'gameover'
  const [score, setScore] = useState(0);
  const [heartsCollected, setHeartsCollected] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('snowy_highscore') || '0', 10);
  });
  const [isSuperMode, setIsSuperMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Game loop engine refs
  const engineRef = useRef({
    animId: null,
    width: 800,
    height: 450,
    groundY: 370,
    speed: 4.8,
    score: 0,
    hearts: 0,
    superModeTimer: 0,
    frameCount: 0,
    snowy: {
      x: 90,
      y: 310,
      width: 58,
      height: 60,
      vy: 0,
      gravity: 0.65,
      jumpForce: -13.5,
      isGrounded: true,
      rotation: 0
    },
    obstacles: [],
    collectibles: [],
    particles: [],
    bgOffset: 0
  });

  // Multilingual text
  const t = {
    en: {
      title: "Snowy's Jungle Adventure",
      subtitle: "Help Snowy jump over ancient roots and collect glowing turquoise hearts!",
      play: "Start Running!",
      jump: "TAP TO JUMP",
      score: "Score",
      best: "Best",
      hearts: "Heart Glow",
      superMode: "Heart Power Activated! (Invincible)",
      gameOver: "Great Adventure!",
      gameOverDesc: "Snowy had lots of fun exploring the jungle!",
      playAgain: "Run Again",
      backToBook: "Back to Story",
      instructions: "Spacebar, Click, or Tap to Jump"
    },
    de: {
      title: "Snowys Dschungel-Abenteuer",
      subtitle: "Hilf Snowy, über Wurzeln zu hüpfen und leuchtende Herzen zu sammeln!",
      play: "Jetzt Loslaufen!",
      jump: "TIPPEN ZUM SPRINGEN",
      score: "Punkte",
      best: "Rekord",
      hearts: "Herz-Kraft",
      superMode: "Herz-Superkraft Aktiv! (Unbesiegbar)",
      gameOver: "Tolles Abenteuer!",
      gameOverDesc: "Snowy hatte riesigen Spaß beim Erkunden des Dschungels!",
      playAgain: "Nochmal Laufen",
      backToBook: "Zurück zum Buch",
      instructions: "Leertaste, Klick oder Tippen zum Springen"
    }
  }[language] || t.en;

  // Toggle Mute
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sfx.muted = next;
  };

  // Jump trigger
  const triggerJump = useCallback(() => {
    const eng = engineRef.current;
    if (gameState !== 'playing') return;

    if (eng.snowy.isGrounded) {
      eng.snowy.vy = eng.snowy.jumpForce;
      eng.snowy.isGrounded = false;
      sfx.playJump();

      // Emit jump dust sparkles
      for (let i = 0; i < 8; i++) {
        eng.particles.push({
          x: eng.snowy.x + 20,
          y: eng.groundY - 5,
          vx: (Math.random() - 0.5) * 4 - 2,
          vy: -Math.random() * 3,
          size: Math.random() * 4 + 2,
          color: '#ffd1dc',
          alpha: 1,
          life: 25
        });
      }
    }
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (gameState === 'menu' || gameState === 'gameover') {
          startGame();
        } else if (gameState === 'playing') {
          triggerJump();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Start / Restart game
  const startGame = () => {
    sfx.init();
    const eng = engineRef.current;
    eng.speed = 4.8;
    eng.score = 0;
    eng.hearts = 0;
    eng.superModeTimer = 0;
    eng.frameCount = 0;
    eng.obstacles = [];
    eng.collectibles = [];
    eng.particles = [];
    eng.snowy.y = eng.groundY - eng.snowy.height;
    eng.snowy.vy = 0;
    eng.snowy.isGrounded = true;

    setScore(0);
    setHeartsCollected(0);
    setIsSuperMode(false);
    setGameState('playing');
  };

  // Main canvas animation loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const eng = engineRef.current;

    let isRunning = true;

    const loop = () => {
      if (!isRunning) return;
      eng.frameCount++;

      // Resize canvas buffer to match display if changed
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
          canvas.width = clientWidth;
          canvas.height = clientHeight;
          eng.width = clientWidth;
          eng.height = clientHeight;
          eng.groundY = Math.min(clientHeight - 70, clientHeight * 0.82);
          if (eng.snowy.isGrounded) {
            eng.snowy.y = eng.groundY - eng.snowy.height;
          }
        }
      }

      // Update background scroll
      eng.bgOffset = (eng.bgOffset + eng.speed * 0.5) % eng.width;

      // Update score
      if (eng.frameCount % 5 === 0) {
        eng.score += 1;
        setScore(eng.score);
        if (eng.score > highScore) {
          setHighScore(eng.score);
          localStorage.setItem('snowy_highscore', eng.score.toString());
        }
      }

      // Handle Super Mode Timer
      if (eng.superModeTimer > 0) {
        eng.superModeTimer--;
        if (eng.superModeTimer === 0) {
          setIsSuperMode(false);
        }
      }

      // Update Snowy Physics
      eng.snowy.vy += eng.snowy.gravity;
      eng.snowy.y += eng.snowy.vy;

      if (eng.snowy.y >= eng.groundY - eng.snowy.height) {
        eng.snowy.y = eng.groundY - eng.snowy.height;
        eng.snowy.vy = 0;
        eng.snowy.isGrounded = true;
        eng.snowy.rotation = 0;
      } else {
        eng.snowy.isGrounded = false;
        eng.snowy.rotation = Math.min(0.25, Math.max(-0.25, eng.snowy.vy * 0.02));
      }

      // Spawn Obstacles (Ancient Mossy Rocks & Roots)
      if (eng.frameCount % 120 === 0 && Math.random() > 0.15) {
        const type = Math.random() > 0.5 ? 'root' : 'rock';
        eng.obstacles.push({
          x: eng.width + 40,
          y: eng.groundY - (type === 'root' ? 42 : 36),
          width: type === 'root' ? 38 : 34,
          height: type === 'root' ? 42 : 36,
          type
        });
      }

      // Spawn Collectibles (Turquoise Hearts, Golden Flowers, Baby Buzz)
      if (eng.frameCount % 85 === 0) {
        const rand = Math.random();
        const type = rand < 0.65 ? 'heart' : rand < 0.9 ? 'flower' : 'buzz';
        const floatY = eng.groundY - 60 - Math.random() * 80;
        eng.collectibles.push({
          x: eng.width + 30,
          y: floatY,
          baseY: floatY,
          size: type === 'buzz' ? 26 : 22,
          type,
          bobOffset: Math.random() * Math.PI * 2
        });
      }

      // Update & Filter Obstacles
      for (let i = eng.obstacles.length - 1; i >= 0; i--) {
        const obs = eng.obstacles[i];
        obs.x -= eng.speed;

        // Collision Check with Snowy
        const snowyHitBox = {
          x: eng.snowy.x + 10,
          y: eng.snowy.y + 8,
          w: eng.snowy.width - 20,
          h: eng.snowy.height - 12
        };

        if (
          snowyHitBox.x < obs.x + obs.width &&
          snowyHitBox.x + snowyHitBox.w > obs.x &&
          snowyHitBox.y < obs.y + obs.height &&
          snowyHitBox.y + snowyHitBox.h > obs.y
        ) {
          if (eng.superModeTimer > 0) {
            // Super mode smashes obstacles!
            sfx.playHeartPickup();
            eng.obstacles.splice(i, 1);
            eng.score += 20;
            // Particles
            for (let p = 0; p < 8; p++) {
              eng.particles.push({
                x: obs.x + 15,
                y: obs.y + 15,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                size: 3,
                color: '#40E0D0',
                alpha: 1,
                life: 20
              });
            }
            continue;
          } else {
            // Game Over
            sfx.playBump();
            setGameState('gameover');
            isRunning = false;
            return;
          }
        }

        if (obs.x < -60) {
          eng.obstacles.splice(i, 1);
        }
      }

      // Update & Filter Collectibles
      for (let i = eng.collectibles.length - 1; i >= 0; i--) {
        const col = eng.collectibles[i];
        col.x -= eng.speed;
        col.y = col.baseY + Math.sin(eng.frameCount * 0.08 + col.bobOffset) * 6;

        // Collect check
        const dist = Math.hypot(
          (eng.snowy.x + eng.snowy.width / 2) - col.x,
          (eng.snowy.y + eng.snowy.height / 2) - col.y
        );

        if (dist < 45) {
          if (col.type === 'heart') {
            sfx.playHeartPickup();
            eng.score += 15;
            eng.hearts += 1;
            setHeartsCollected(eng.hearts);

            // Trigger Super Mode every 5 hearts
            if (eng.hearts % 5 === 0) {
              sfx.playBuzzBonus();
              eng.superModeTimer = 360; // ~6 seconds
              setIsSuperMode(true);
            }
          } else if (col.type === 'flower') {
            sfx.playHeartPickup();
            eng.score += 25;
          } else if (col.type === 'buzz') {
            sfx.playBuzzBonus();
            eng.score += 50;
            eng.superModeTimer = 420;
            setIsSuperMode(true);
          }

          // Sparkle burst
          const sparkColor = col.type === 'heart' ? '#40E0D0' : col.type === 'flower' ? '#fbbf24' : '#f472b6';
          for (let p = 0; p < 10; p++) {
            eng.particles.push({
              x: col.x,
              y: col.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              size: Math.random() * 4 + 2,
              color: sparkColor,
              alpha: 1,
              life: 25
            });
          }

          eng.collectibles.splice(i, 1);
          continue;
        }

        if (col.x < -50) {
          eng.collectibles.splice(i, 1);
        }
      }

      // Update Particles
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 1 / p.life;
        if (p.alpha <= 0) {
          eng.particles.splice(i, 1);
        }
      }

      // Gradually increase speed smoothly
      if (eng.frameCount % 400 === 0 && eng.speed < 8.5) {
        eng.speed += 0.25;
      }

      // ==============================================================
      // RENDERING SECTION
      // ==============================================================
      ctx.clearRect(0, 0, eng.width, eng.height);

      // 1. Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, eng.groundY);
      skyGrad.addColorStop(0, '#bae6fd');
      skyGrad.addColorStop(0.5, '#fbcfe8');
      skyGrad.addColorStop(1, '#fef08a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, eng.width, eng.height);

      // 2. Parallax Distant Mountains / Ancient Jungle Trees
      ctx.fillStyle = 'rgba(153, 246, 228, 0.4)';
      for (let m = 0; m < 5; m++) {
        const mx = ((m * 260) - (eng.bgOffset * 0.3) % 260);
        ctx.beginPath();
        ctx.arc(mx, eng.groundY - 40, 100, Math.PI, 0, false);
        ctx.fill();
      }

      // 3. Ground / Prehistoric Jungle Path
      const groundGrad = ctx.createLinearGradient(0, eng.groundY, 0, eng.height);
      groundGrad.addColorStop(0, '#86efac');
      groundGrad.addColorStop(0.15, '#22c55e');
      groundGrad.addColorStop(1, '#15803d');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, eng.groundY, eng.width, eng.height - eng.groundY);

      // Ground Top Line / Moss
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(0, eng.groundY - 2, eng.width, 5);

      // 4. Draw Obstacles
      eng.obstacles.forEach(obs => {
        if (obs.type === 'root') {
          // Ancient twisted root
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.quadraticCurveTo(obs.x + 10, obs.y, obs.x + obs.width / 2, obs.y + 4);
          ctx.quadraticCurveTo(obs.x + obs.width, obs.y, obs.x + obs.width, obs.y + obs.height);
          ctx.fill();

          // Green moss patch on top of root
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.arc(obs.x + obs.width / 2, obs.y + 6, 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Prehistoric round rock
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          // Rock highlight
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.ellipse(obs.x + obs.width / 2 - 4, obs.y + obs.height / 2 - 5, obs.width / 4, obs.height / 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 5. Draw Collectibles
      eng.collectibles.forEach(col => {
        ctx.save();
        ctx.translate(col.x, col.y);

        if (col.type === 'heart') {
          // Turquoise glowing heart
          ctx.shadowColor = '#40E0D0';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#2dd4bf';

          ctx.beginPath();
          const s = 1.1;
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-8 * s, -10 * s, -14 * s, 0, 0, 12 * s);
          ctx.bezierCurveTo(14 * s, 0, 8 * s, -10 * s, 0, 0);
          ctx.fill();

          // Sparkle dot
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-3, -3, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (col.type === 'flower') {
          // Golden ancient jungle flower
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#fbbf24';

          for (let p = 0; p < 5; p++) {
            ctx.rotate((Math.PI * 2) / 5);
            ctx.beginPath();
            ctx.ellipse(0, 8, 4, 7, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          // Center pink bud
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (col.type === 'buzz') {
          // Baby Buzz the Bee
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 10;

          // Wings fluttering
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.beginPath();
          ctx.ellipse(-4, -8 + Math.sin(eng.frameCount * 0.5) * 3, 5, 8, -0.4, 0, Math.PI * 2);
          ctx.ellipse(4, -8 + Math.sin(eng.frameCount * 0.5) * 3, 5, 8, 0.4, 0, Math.PI * 2);
          ctx.fill();

          // Yellow body with stripes
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Black stripe
          ctx.fillStyle = '#451a03';
          ctx.fillRect(-2, -7, 4, 14);

          // Bee eye
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(6, -2, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // 6. Draw Particles
      eng.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 7. Draw Snowy (The Hero!)
      ctx.save();
      ctx.translate(eng.snowy.x + eng.snowy.width / 2, eng.snowy.y + eng.snowy.height / 2);
      ctx.rotate(eng.snowy.rotation);

      // Super Mode Rainbow Aura
      if (eng.superModeTimer > 0) {
        ctx.save();
        ctx.shadowColor = '#40E0D0';
        ctx.shadowBlur = 24;
        ctx.strokeStyle = `hsl(${(eng.frameCount * 8) % 360}, 90%, 65%)`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Baby Buzz companion if in Super Mode
      if (eng.superModeTimer > 0) {
        ctx.save();
        const buzzFloatX = -26 + Math.sin(eng.frameCount * 0.15) * 4;
        const buzzFloatY = -34 + Math.cos(eng.frameCount * 0.15) * 4;
        ctx.translate(buzzFloatX, buzzFloatY);
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(-2, -5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Coral-pink spikes on back
      ctx.fillStyle = '#fb7185';
      const spikes = [
        { x: -16, y: -16 },
        { x: -8, y: -22 },
        { x: 0, y: -24 },
        { x: 8, y: -20 }
      ];
      spikes.forEach(sp => {
        ctx.beginPath();
        ctx.moveTo(sp.x - 5, sp.y + 4);
        ctx.lineTo(sp.x, sp.y - 7);
        ctx.lineTo(sp.x + 5, sp.y + 4);
        ctx.fill();
      });

      // Tail
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-18, 5);
      ctx.quadraticCurveTo(-34, -4, -30, -12);
      ctx.quadraticCurveTo(-24, -8, -12, 12);
      ctx.fill();
      ctx.stroke();

      // Plump White Body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-2, 4, 20, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rounded Head
      ctx.beginPath();
      ctx.arc(14, -10, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Snout
      ctx.beginPath();
      ctx.arc(22, -8, 8, 0, Math.PI * 2);
      ctx.fill();

      // Smiling Mouth
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(22, -6, 4, 0.2, Math.PI * 0.7);
      ctx.stroke();

      // Cute Friendly Eye with sparkle
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(16, -12, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(15, -13.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Cheerful Pink Cheek Blush
      ctx.fillStyle = 'rgba(251, 113, 133, 0.4)';
      ctx.beginPath();
      ctx.arc(18, -4, 4, 0, Math.PI * 2);
      ctx.fill();

      // GLOWING TURQUOISE HEART ON CHEST (Snowy's signature feature!)
      ctx.save();
      const heartPulse = 1 + Math.sin(eng.frameCount * 0.12) * 0.18;
      ctx.shadowColor = '#40E0D0';
      ctx.shadowBlur = eng.superModeTimer > 0 ? 25 : 12;
      ctx.fillStyle = '#2dd4bf';
      ctx.translate(6, 4);
      ctx.scale(heartPulse, heartPulse);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-5, -6, -9, 0, 0, 8);
      ctx.bezierCurveTo(9, 0, 5, -6, 0, 0);
      ctx.fill();
      ctx.restore();

      // Running Legs Animation
      const legWalk = eng.snowy.isGrounded ? Math.sin(eng.frameCount * 0.25) * 8 : 4;
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';

      // Back leg
      ctx.fillRect(-10 - legWalk * 0.5, 16, 8, 12);
      // Front leg
      ctx.fillRect(4 + legWalk * 0.5, 16, 8, 12);

      ctx.restore();

      eng.animId = requestAnimationFrame(loop);
    };

    eng.animId = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (eng.animId) cancelAnimationFrame(eng.animId);
    };
  }, [gameState, highScore]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden select-none bg-slate-900 flex flex-col items-center justify-between"
    >
      {/* Canvas Game Arena */}
      <canvas
        ref={canvasRef}
        onClick={triggerJump}
        className="absolute inset-0 w-full h-full cursor-pointer touch-none"
      />

      {/* Top Header / HUD */}
      <header className="relative z-20 w-full px-4 py-3 flex justify-between items-center bg-gradient-to-b from-black/50 via-black/20 to-transparent">
        {/* Navigation & Language Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToBook}
            aria-label={t.backToBook}
            className="flex items-center gap-2 bg-white/90 hover:bg-white text-gray-800 px-3 sm:px-4 py-2 rounded-full shadow-lg font-semibold active:scale-95 transition-all border border-white/50 text-sm sm:text-base"
          >
            <BookOpen size={18} className="text-teal-600" />
            <span>{t.backToBook}</span>
          </button>

          {onLanguageChange && (
            <button
              onClick={() => onLanguageChange(language === 'en' ? 'de' : 'en')}
              aria-label="Toggle game language"
              className="bg-white/85 hover:bg-white text-xs sm:text-sm font-semibold text-gray-800 px-2.5 sm:px-3 py-2 rounded-full shadow border border-white/40 active:scale-95 transition-all"
            >
              {language === 'en' ? '🇺🇸 EN' : '🇩🇪 DE'}
            </button>
          )}
        </div>

        {/* Score & Glow Meter */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 bg-white/85 backdrop-blur-md px-3 py-1.5 rounded-full shadow border border-white/40 text-xs sm:text-sm font-bold text-gray-800">
            <Trophy size={16} className="text-amber-500" />
            <span>{score}</span>
            <span className="text-gray-400 font-normal">| {t.best}: {highScore}</span>
          </div>

          <div className="flex items-center gap-1 bg-white/85 backdrop-blur-md px-3 py-1.5 rounded-full shadow border border-white/40 text-xs sm:text-sm font-bold text-teal-600">
            <Heart size={16} className="text-teal-400 fill-teal-400 animate-pulse" />
            <span>{heartsCollected}</span>
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={toggleMute}
            aria-label="Toggle sound"
            className="p-2 bg-white/85 hover:bg-white text-gray-700 rounded-full shadow active:scale-95 transition-all"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} className="text-teal-600" />}
          </button>
        </div>
      </header>

      {/* Super Mode Banner Notification */}
      {isSuperMode && (
        <div className="relative z-20 mt-2 px-4 py-1.5 bg-gradient-to-r from-teal-400 via-pink-400 to-amber-300 text-white font-bold text-xs sm:text-sm rounded-full shadow-lg animate-bounce flex items-center gap-1.5">
          <Sparkles size={16} />
          <span>{t.superMode}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: START / MENU SCREEN                                   */}
      {/* ============================================================== */}
      {gameState === 'menu' && (
        <div className="relative z-30 m-auto max-w-sm sm:max-w-md w-[92%] bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-teal-200/80 text-center flex flex-col items-center animate-book-open">
          {/* Glowing heart icon */}
          <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center shadow-inner mb-2 animate-heartbeat">
            <Heart size={36} className="text-teal-400 fill-teal-400" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-updock text-teal-800 leading-tight">
            {t.title}
          </h1>

          <p className="font-patrick-hand text-lg sm:text-xl text-gray-600 mt-2 mb-6">
            {t.subtitle}
          </p>

          <button
            onClick={startGame}
            className="w-full py-4 px-6 rounded-full text-xl sm:text-2xl font-bold text-white shadow-xl bg-gradient-to-r from-teal-400 via-pink-400 to-amber-300 animate-gradient-slow active:scale-95 hover:scale-105 transition-all flex items-center justify-center gap-2"
          >
            <Play size={24} className="fill-white" />
            <span>{t.play}</span>
          </button>

          <p className="text-xs text-gray-400 mt-4 italic font-sans">
            {t.instructions}
          </p>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: GAME OVER SCREEN                                      */}
      {/* ============================================================== */}
      {gameState === 'gameover' && (
        <div className="relative z-30 m-auto max-w-sm sm:max-w-md w-[92%] bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-pink-200/80 text-center flex flex-col items-center animate-book-open">
          <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center shadow-inner mb-2">
            <Sparkles size={34} className="text-pink-500 animate-spin" style={{ animationDuration: '6s' }} />
          </div>

          <h2 className="text-4xl sm:text-5xl font-updock text-pink-600 leading-tight">
            {t.gameOver}
          </h2>

          <p className="font-patrick-hand text-lg text-gray-600 mt-1 mb-4">
            {t.gameOverDesc}
          </p>

          {/* Score Summary Box */}
          <div className="w-full bg-amber-50/70 border border-amber-200/70 rounded-2xl p-4 mb-5 flex justify-around items-center">
            <div>
              <div className="text-xs text-gray-500 font-semibold">{t.score}</div>
              <div className="text-2xl font-extrabold text-teal-600">{score}</div>
            </div>
            <div className="h-8 w-px bg-amber-200" />
            <div>
              <div className="text-xs text-gray-500 font-semibold">{t.best}</div>
              <div className="text-2xl font-extrabold text-amber-500">{highScore}</div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={startGame}
              className="w-full py-3.5 px-6 rounded-full text-lg sm:text-xl font-bold text-white shadow-lg bg-gradient-to-r from-teal-400 via-pink-400 to-amber-300 animate-gradient-slow active:scale-95 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={20} />
              <span>{t.playAgain}</span>
            </button>

            <button
              onClick={onBackToBook}
              className="w-full py-3 px-6 rounded-full text-base font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <BookOpen size={18} className="text-teal-600" />
              <span>{t.backToBook}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Floating Jump Button on Mobile */}
      {gameState === 'playing' && (
        <div className="relative z-20 pb-4 sm:hidden w-full px-6 flex justify-center pointer-events-none">
          <button
            onClick={triggerJump}
            className="pointer-events-auto py-3.5 px-10 rounded-full font-bold text-lg text-white shadow-2xl bg-gradient-to-r from-teal-400 to-pink-500 active:scale-90 transition-transform flex items-center gap-2 border-2 border-white/60"
          >
            <ArrowUp size={22} />
            <span>{t.jump}</span>
          </button>
        </div>
      )}
    </div>
  );
};

SnowyGame.propTypes = {
  onBackToBook: PropTypes.func.isRequired,
  language: PropTypes.string,
  onLanguageChange: PropTypes.func
};

export default SnowyGame;
