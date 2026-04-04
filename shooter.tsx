import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════
// COCONUT DOGGY: SWARM × SNAKE ARCADE
// ═══════════════════════════════════════════════

const W = 400;
const H = 700;
const CAPY_SIZE = 32;
const ORANGE_SIZE = 16;
const ENEMY_SIZE = 24;
const BULLET_SIZE = 8;
const FIREBALL_SIZE = 10;
const POWERUP_SIZE = 20;

const MEME_LEVELS = [
  { name: "Lurker", threshold: 0, color: "#888" },
  { name: "Coconut Pup", threshold: 3, color: "#CD853F" },
  { name: "Ok I Pull Up", threshold: 7, color: "#FF8C00" },
  { name: "Moisturized", threshold: 12, color: "#4CAF50" },
  { name: "Unbothered", threshold: 18, color: "#2196F3" },
  { name: "Flourishing", threshold: 25, color: "#9C27B0" },
  { name: "Capybara of Indifference", threshold: 35, color: "#FFD700" },
  { name: "COCONUT GOD", threshold: 50, color: "#FF1744" },
];

const ENEMY_TYPES = [
  { emoji: "📧", name: "Urgent Email", hp: 1, pts: 10, speed: 0.4, fireRate: 0.003 },
  { emoji: "⏰", name: "Alarm Clock", hp: 1, pts: 15, speed: 0.5, fireRate: 0.004 },
  { emoji: "📊", name: "Spreadsheet", hp: 2, pts: 20, speed: 0.35, fireRate: 0.005 },
  { emoji: "💼", name: "Corporate Meeting", hp: 2, pts: 25, speed: 0.3, fireRate: 0.006 },
  { emoji: "📉", name: "Q4 Deadline", hp: 3, pts: 40, speed: 0.25, fireRate: 0.008 },
  { emoji: "🤖", name: "AI Replacement", hp: 3, pts: 50, speed: 0.45, fireRate: 0.007 },
];

const BOSS_TYPES = [
  { emoji: "🧑‍💼", name: "THE MANAGER", hp: 15, pts: 200, speed: 0.8, fireRate: 0.02 },
  { emoji: "📱", name: "DOOMSCROLLER", hp: 20, pts: 300, speed: 1.0, fireRate: 0.025 },
  { emoji: "🏢", name: "CORPORATE HQ", hp: 30, pts: 500, speed: 0.6, fireRate: 0.03 },
];

const POWERUP_TYPES = [
  { emoji: "🎵", name: "Ok I Pull Up", effect: "speed", duration: 300, desc: "+SPEED" },
  { emoji: "🥥", name: "Coconut Shield", effect: "shield", duration: 250, desc: "SHIELD" },
  { emoji: "🧘", name: "Zen Mode", effect: "slow", duration: 200, desc: "SLOW-MO" },
  { emoji: "🍉", name: "Watermelon Burst", effect: "spread", duration: 200, desc: "TRI-SHOT" },
  { emoji: "🐦", name: "Bird Friend", effect: "auto", duration: 350, desc: "AUTO-AIM" },
  { emoji: "🇮🇹", name: "Italian Brainrot", effect: "nuke", duration: 1, desc: "NUKE!" },
];

function createEnemyWave(wave) {
  const enemies = [];
  const rows = Math.min(3 + Math.floor(wave / 2), 6);
  const cols = Math.min(5 + Math.floor(wave / 3), 9);
  const typePool = ENEMY_TYPES.slice(0, Math.min(2 + Math.floor(wave / 2), ENEMY_TYPES.length));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const type = typePool[Math.floor(Math.random() * typePool.length)];
      enemies.push({
        x: 30 + c * ((W - 60) / (cols - 1 || 1)),
        y: 40 + r * 32,
        type,
        hp: type.hp + Math.floor(wave / 4),
        maxHp: type.hp + Math.floor(wave / 4),
        alive: true,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // Boss every 5 waves
  if (wave > 0 && wave % 5 === 0) {
    const bossType = BOSS_TYPES[Math.min(Math.floor(wave / 5) - 1, BOSS_TYPES.length - 1)];
    enemies.push({
      x: W / 2,
      y: 30,
      type: bossType,
      hp: bossType.hp + wave * 2,
      maxHp: bossType.hp + wave * 2,
      alive: true,
      isBoss: true,
      phase: 0,
    });
  }

  return enemies;
}

export default function CapybaraSwarm() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const frameRef = useRef(null);
  const [screen, setScreen] = useState("menu");
  const [finalScore, setFinalScore] = useState(0);
  const [finalWave, setFinalWave] = useState(0);
  const [finalChain, setFinalChain] = useState(0);
  const [finalLevel, setFinalLevel] = useState("");

  const startGame = useCallback(() => {
    const initialEnemies = createEnemyWave(1);
    stateRef.current = {
      // Capybara
      cx: W / 2,
      cy: H - 60,
      cvx: 0,
      speed: 3.5,
      // Orange chain (snake)
      chain: [],
      chainMax: 0,
      // Shooting
      bullets: [],
      shootCooldown: 0,
      autoShoot: true,
      // Enemies
      enemies: initialEnemies,
      enemyDir: 1,
      enemySpeed: 0.3,
      enemyDrop: 0,
      fireballs: [],
      // Game state
      score: 0,
      wave: 1,
      lives: 3,
      combo: 0,
      maxCombo: 0,
      // Powerups
      powerups: [],
      activeEffects: {},
      // Particles
      particles: [],
      floatingTexts: [],
      // Input
      keys: {},
      mouseX: W / 2,
      useMouse: false,
      // Timing
      tick: 0,
      shakeFrames: 0,
      waveTransition: 0,
      waveText: "WAVE 1",
      gameOver: false,
      // Meme level
      memeLevel: 0,
    };
    setScreen("playing");
  }, []);

  // Input handlers
  useEffect(() => {
    if (screen !== "playing") return;
    const s = stateRef.current;
    if (!s) return;

    const onKeyDown = (e) => {
      s.keys[e.key] = true;
      s.useMouse = false;
      if (e.key === " " || e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
      }
    };
    const onKeyUp = (e) => { s.keys[e.key] = false; };
    const onMouseMove = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      s.mouseX = ((e.clientX - rect.left) / rect.width) * W;
      s.useMouse = true;
    };
    const onTouchMove = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      s.mouseX = ((touch.clientX - rect.left) / rect.width) * W;
      s.useMouse = true;
      e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    const canvas = canvasRef.current;
    canvas?.addEventListener("mousemove", onMouseMove);
    canvas?.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas?.removeEventListener("mousemove", onMouseMove);
      canvas?.removeEventListener("touchmove", onTouchMove);
    };
  }, [screen]);

  // Game loop
  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const spawnParticles = (x, y, color, count = 6) => {
      const s = stateRef.current;
      for (let i = 0; i < count; i++) {
        s.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 30 + Math.random() * 20,
          maxLife: 50,
          color,
          size: 2 + Math.random() * 3,
        });
      }
    };

    const spawnFloatingText = (x, y, text, color = "#FFD700") => {
      const s = stateRef.current;
      s.floatingTexts.push({ x, y, text, color, life: 50, maxLife: 50 });
    };

    const getMemeLevel = (chainLen) => {
      let lvl = 0;
      for (let i = MEME_LEVELS.length - 1; i >= 0; i--) {
        if (chainLen >= MEME_LEVELS[i].threshold) { lvl = i; break; }
      }
      return lvl;
    };

    const loop = () => {
      const s = stateRef.current;
      if (!s || s.gameOver) return;

      s.tick++;

      // ── INPUT ──
      const eff = s.activeEffects;
      const speedMult = eff.speed ? 1.6 : 1;
      const slowMult = eff.slow ? 0.5 : 1;

      if (s.useMouse) {
        const diff = s.mouseX - s.cx;
        s.cvx = diff * 0.12 * speedMult;
      } else {
        let acc = 0;
        if (s.keys["ArrowLeft"] || s.keys["a"]) acc -= 0.6;
        if (s.keys["ArrowRight"] || s.keys["d"]) acc += 0.6;
        s.cvx += acc * speedMult;
        s.cvx *= 0.88;
      }
      s.cx += s.cvx;
      s.cx = Math.max(CAPY_SIZE / 2, Math.min(W - CAPY_SIZE / 2, s.cx));

      // ── SNAKE CHAIN PHYSICS ──
      if (s.chain.length > 0) {
        // Head follows capybara
        const head = s.chain[0];
        const dx = s.cx - head.x;
        const dy = s.cy + 20 - head.y;
        head.x += dx * 0.25;
        head.y += dy * 0.25;
        // Rest follow leader
        for (let i = 1; i < s.chain.length; i++) {
          const prev = s.chain[i - 1];
          const cur = s.chain[i];
          const ddx = prev.x - cur.x;
          const ddy = prev.y - cur.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          const targetDist = ORANGE_SIZE * 0.9;
          if (dist > targetDist) {
            const ratio = targetDist / dist;
            cur.x = prev.x - ddx * ratio;
            cur.y = prev.y - ddy * ratio;
          }
        }
      }

      // ── AUTO SHOOT ──
      s.shootCooldown--;
      const shootInterval = eff.spread ? 8 : 12;
      if (s.shootCooldown <= 0 && (s.autoShoot || s.keys[" "] || s.keys["ArrowUp"])) {
        s.shootCooldown = shootInterval;
        if (eff.spread) {
          s.bullets.push({ x: s.cx, y: s.cy - 16, vy: -7, vx: -1.5 });
          s.bullets.push({ x: s.cx, y: s.cy - 16, vy: -7, vx: 0 });
          s.bullets.push({ x: s.cx, y: s.cy - 16, vy: -7, vx: 1.5 });
        } else {
          s.bullets.push({ x: s.cx, y: s.cy - 16, vy: -7, vx: 0 });
        }
      }

      // Bird friend auto-aim
      if (eff.auto && s.tick % 15 === 0) {
        const target = s.enemies.find(e => e.alive);
        if (target) {
          const ang = Math.atan2(target.y - s.cy, target.x - s.cx);
          s.bullets.push({
            x: s.cx, y: s.cy - 16,
            vx: Math.cos(ang) * 6,
            vy: Math.sin(ang) * 6,
          });
        }
      }

      // ── UPDATE BULLETS ──
      s.bullets = s.bullets.filter(b => {
        b.x += b.vx || 0;
        b.y += b.vy;
        return b.y > -10 && b.y < H + 10 && b.x > -10 && b.x < W + 10;
      });

      // ── ENEMY MOVEMENT (SWARM) ──
      let edgeHit = false;
      const aliveEnemies = s.enemies.filter(e => e.alive && !e.isBoss);

      aliveEnemies.forEach(e => {
        e.x += s.enemyDir * s.enemySpeed * slowMult;
        e.y += s.enemyDrop;
        e.phase += 0.02;
        if (e.x < 20 || e.x > W - 20) edgeHit = true;
      });

      if (edgeHit) {
        s.enemyDir *= -1;
        s.enemyDrop = 0.6;
      } else {
        s.enemyDrop = Math.max(0, s.enemyDrop - 0.02);
      }

      // Boss movement
      s.enemies.filter(e => e.alive && e.isBoss).forEach(e => {
        e.phase += 0.025;
        e.x = W / 2 + Math.sin(e.phase) * (W / 3);
        e.y = 40 + Math.sin(e.phase * 0.7) * 20;
      });

      // ── ENEMY FIRE ──
      s.enemies.filter(e => e.alive).forEach(e => {
        const rate = e.type.fireRate * slowMult;
        if (Math.random() < rate) {
          const ang = Math.atan2(s.cy - e.y, s.cx - e.x);
          const spd = 2 + Math.random() * 1.5;
          s.fireballs.push({
            x: e.x, y: e.y + ENEMY_SIZE / 2,
            vx: Math.cos(ang) * spd * 0.4 + (Math.random() - 0.5),
            vy: Math.abs(Math.sin(ang)) * spd + 1,
            isBoss: !!e.isBoss,
          });
        }
      });

      // ── UPDATE FIREBALLS ──
      s.fireballs = s.fireballs.filter(f => {
        f.x += f.vx;
        f.y += f.vy;
        return f.y < H + 20 && f.x > -20 && f.x < W + 20;
      });

      // ── COLLISION: bullets vs enemies ──
      s.bullets.forEach((b, bi) => {
        s.enemies.forEach(e => {
          if (!e.alive) return;
          const sz = e.isBoss ? ENEMY_SIZE * 1.8 : ENEMY_SIZE;
          if (Math.abs(b.x - e.x) < sz && Math.abs(b.y - e.y) < sz) {
            s.bullets[bi] = null;
            e.hp--;
            spawnParticles(b.x, b.y, "#FFA500", 3);
            if (e.hp <= 0) {
              e.alive = false;
              s.combo++;
              s.maxCombo = Math.max(s.maxCombo, s.combo);
              const pts = e.type.pts * (1 + Math.floor(s.combo / 5));
              s.score += pts;
              spawnParticles(e.x, e.y, "#FFD700", 10);
              spawnFloatingText(e.x, e.y, `+${pts}`, e.isBoss ? "#FF1744" : "#FFD700");
              if (e.isBoss) {
                s.shakeFrames = 15;
                spawnFloatingText(e.x, e.y - 20, "BOSS DOWN!", "#FF1744");
                // Boss drops multiple oranges
                for (let o = 0; o < 5; o++) {
                  s.powerups.push({
                    x: e.x + (Math.random() - 0.5) * 60,
                    y: e.y,
                    vy: 1 + Math.random(),
                    type: "orange",
                  });
                }
              }
              // Drop orange or powerup
              if (Math.random() < 0.6 && !e.isBoss) {
                s.powerups.push({ x: e.x, y: e.y, vy: 1.5, type: "orange" });
              } else if (Math.random() < 0.15) {
                const pType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
                s.powerups.push({ x: e.x, y: e.y, vy: 1.2, type: "powerup", data: pType });
              }
            }
          }
        });
      });
      s.bullets = s.bullets.filter(b => b !== null);

      // ── COLLISION: fireballs vs capybara ──
      if (!eff.shield) {
        s.fireballs.forEach((f, fi) => {
          // Check chain too
          let chainHit = false;
          s.chain.forEach((c, ci) => {
            if (Math.abs(f.x - c.x) < ORANGE_SIZE && Math.abs(f.y - c.y) < ORANGE_SIZE) {
              chainHit = true;
              s.chain.splice(ci, 1);
              spawnParticles(c.x, c.y, "#FF6600", 5);
              spawnFloatingText(c.x, c.y, "-🍊", "#FF6600");
            }
          });
          if (chainHit) {
            s.fireballs[fi] = null;
            s.combo = 0;
            return;
          }
          // Check capybara
          if (Math.abs(f.x - s.cx) < CAPY_SIZE * 0.7 && Math.abs(f.y - s.cy) < CAPY_SIZE * 0.7) {
            s.fireballs[fi] = null;
            s.lives--;
            s.combo = 0;
            s.shakeFrames = 10;
            spawnParticles(s.cx, s.cy, "#FF0000", 12);
            spawnFloatingText(s.cx, s.cy, "OUCH!", "#FF0000");
            // Lose half the chain
            const lose = Math.ceil(s.chain.length / 2);
            for (let i = 0; i < lose; i++) {
              const removed = s.chain.pop();
              if (removed) spawnParticles(removed.x, removed.y, "#FF6600", 2);
            }
            if (s.lives <= 0) {
              s.gameOver = true;
              const lvl = getMemeLevel(s.chainMax);
              setFinalScore(s.score);
              setFinalWave(s.wave);
              setFinalChain(s.chainMax);
              setFinalLevel(MEME_LEVELS[lvl].name);
              setScreen("gameover");
              return;
            }
          }
        });
        s.fireballs = s.fireballs.filter(f => f !== null);
      } else {
        // Shield absorbs fireballs near capybara
        s.fireballs = s.fireballs.filter(f => {
          if (Math.abs(f.x - s.cx) < CAPY_SIZE * 1.5 && Math.abs(f.y - s.cy) < CAPY_SIZE * 1.5) {
            spawnParticles(f.x, f.y, "#64FFDA", 3);
            return false;
          }
          return true;
        });
      }

      // ── COLLECT POWERUPS / ORANGES ──
      s.powerups = s.powerups.filter(p => {
        p.y += p.vy;
        if (p.y > H + 20) return false;
        const hitDist = CAPY_SIZE;
        if (Math.abs(p.x - s.cx) < hitDist && Math.abs(p.y - s.cy) < hitDist) {
          if (p.type === "orange") {
            // Snake chain grow
            const tail = s.chain.length > 0 ? s.chain[s.chain.length - 1] : { x: s.cx, y: s.cy + 20 };
            s.chain.push({ x: tail.x, y: tail.y + ORANGE_SIZE });
            s.chainMax = Math.max(s.chainMax, s.chain.length);
            s.score += 5 * s.chain.length;
            const newLevel = getMemeLevel(s.chain.length);
            if (newLevel > s.memeLevel) {
              s.memeLevel = newLevel;
              spawnFloatingText(s.cx, s.cy - 40, `🔥 ${MEME_LEVELS[newLevel].name}!`, MEME_LEVELS[newLevel].color);
              s.shakeFrames = 5;
            }
            spawnParticles(p.x, p.y, "#FFA500", 4);
          } else if (p.type === "powerup") {
            if (p.data.effect === "nuke") {
              // Nuke all enemies
              s.enemies.forEach(e => {
                if (e.alive) {
                  e.alive = false;
                  s.score += e.type.pts;
                  spawnParticles(e.x, e.y, "#FF1744", 8);
                }
              });
              s.fireballs = [];
              s.shakeFrames = 20;
              spawnFloatingText(W / 2, H / 3, "🇮🇹 ITALIAN BRAINROT! 🇮🇹", "#FF1744");
            } else {
              s.activeEffects[p.data.effect] = p.data.duration;
              spawnFloatingText(s.cx, s.cy - 30, p.data.desc, "#64FFDA");
            }
            spawnParticles(p.x, p.y, "#64FFDA", 6);
          }
          return false;
        }
        // Also check if chain tail can collect
        for (const c of s.chain) {
          if (p.type === "orange" && Math.abs(p.x - c.x) < ORANGE_SIZE && Math.abs(p.y - c.y) < ORANGE_SIZE) {
            const tail = s.chain[s.chain.length - 1];
            s.chain.push({ x: tail.x, y: tail.y + ORANGE_SIZE });
            s.chainMax = Math.max(s.chainMax, s.chain.length);
            s.score += 5 * s.chain.length;
            spawnParticles(p.x, p.y, "#FFA500", 3);
            const newLevel = getMemeLevel(s.chain.length);
            if (newLevel > s.memeLevel) {
              s.memeLevel = newLevel;
              spawnFloatingText(s.cx, s.cy - 40, `🔥 ${MEME_LEVELS[newLevel].name}!`, MEME_LEVELS[newLevel].color);
            }
            return false;
          }
        }
        return true;
      });

      // ── EFFECT TIMERS ──
      Object.keys(s.activeEffects).forEach(k => {
        s.activeEffects[k]--;
        if (s.activeEffects[k] <= 0) delete s.activeEffects[k];
      });

      // ── WAVE TRANSITION ──
      if (s.waveTransition > 0) {
        s.waveTransition--;
      }
      if (s.enemies.every(e => !e.alive)) {
        s.wave++;
        s.enemies = createEnemyWave(s.wave);
        s.enemySpeed = 0.3 + s.wave * 0.06;
        s.waveText = s.wave % 5 === 0 ? `⚠️ BOSS WAVE ${s.wave} ⚠️` : `WAVE ${s.wave}`;
        s.waveTransition = 90;
        s.fireballs = [];
      }

      // Enemy reaching bottom = damage
      s.enemies.forEach(e => {
        if (e.alive && !e.isBoss && e.y > H - 80) {
          e.alive = false;
          s.lives--;
          s.shakeFrames = 8;
          spawnParticles(e.x, e.y, "#FF0000", 6);
          if (s.lives <= 0) {
            s.gameOver = true;
            const lvl = getMemeLevel(s.chainMax);
            setFinalScore(s.score);
            setFinalWave(s.wave);
            setFinalChain(s.chainMax);
            setFinalLevel(MEME_LEVELS[lvl].name);
            setScreen("gameover");
          }
        }
      });

      // ── PARTICLES ──
      s.particles = s.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life--;
        return p.life > 0;
      });
      s.floatingTexts = s.floatingTexts.filter(ft => {
        ft.y -= 0.8;
        ft.life--;
        return ft.life > 0;
      });

      // ═══════════════════════════
      // ── RENDER ──
      // ═══════════════════════════
      const shake = s.shakeFrames > 0 ? (Math.random() - 0.5) * s.shakeFrames : 0;
      const shakeY = s.shakeFrames > 0 ? (Math.random() - 0.5) * s.shakeFrames : 0;
      if (s.shakeFrames > 0) s.shakeFrames--;

      ctx.save();
      ctx.translate(shake, shakeY);

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#1a0a2e");
      bgGrad.addColorStop(0.5, "#2d1854");
      bgGrad.addColorStop(1, "#0d0d2b");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(-10, -10, W + 20, H + 20);

      // Stars
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97 + s.tick * 0.1) % W;
        const sy = (i * 61 + s.tick * 0.05 * (i % 3 + 1)) % H;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Wave transition text
      if (s.waveTransition > 0) {
        ctx.save();
        const alpha = s.waveTransition > 60 ? (90 - s.waveTransition) / 30 : s.waveTransition / 60;
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.fillStyle = s.wave % 5 === 0 ? "#FF1744" : "#FFD700";
        ctx.font = `bold ${s.wave % 5 === 0 ? 28 : 24}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(s.waveText, W / 2, H / 2 - 20);
        ctx.font = "14px monospace";
        ctx.fillStyle = "#aaa";
        ctx.fillText(`${s.enemies.filter(e => e.alive).length} enemies incoming`, W / 2, H / 2 + 10);
        ctx.restore();
      }

      // ── Draw enemies ──
      s.enemies.filter(e => e.alive).forEach(e => {
        const sz = e.isBoss ? 36 : 22;
        ctx.font = `${sz}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(e.type.emoji, e.x, e.y);
        // HP bar for damaged / bosses
        if (e.hp < e.maxHp || e.isBoss) {
          const bw = e.isBoss ? 50 : 24;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(e.x - bw / 2, e.y - sz / 2 - 6, bw, 4);
          ctx.fillStyle = e.hp / e.maxHp > 0.5 ? "#4CAF50" : e.hp / e.maxHp > 0.25 ? "#FF9800" : "#FF1744";
          ctx.fillRect(e.x - bw / 2, e.y - sz / 2 - 6, bw * (e.hp / e.maxHp), 4);
        }
      });

      // ── Draw fireballs ──
      s.fireballs.forEach(f => {
        const sz = f.isBoss ? 14 : 8;
        ctx.beginPath();
        ctx.arc(f.x, f.y, sz / 2, 0, Math.PI * 2);
        const fbGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, sz);
        fbGrad.addColorStop(0, f.isBoss ? "#FF1744" : "#FF6600");
        fbGrad.addColorStop(1, "rgba(255,0,0,0)");
        ctx.fillStyle = fbGrad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(f.x, f.y, sz / 4, 0, Math.PI * 2);
        ctx.fillStyle = "#FFF";
        ctx.fill();
      });

      // ── Draw powerups / falling oranges ──
      s.powerups.forEach(p => {
        ctx.font = `${POWERUP_SIZE}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (p.type === "orange") {
          ctx.fillText("🍊", p.x, p.y);
        } else {
          // Glow
          ctx.beginPath();
          ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(100,255,218,0.2)";
          ctx.fill();
          ctx.fillText(p.data.emoji, p.x, p.y);
        }
      });

      // ── Draw bullets (watermelon seeds) ──
      s.bullets.forEach(b => {
        ctx.fillStyle = "#88FF88";
        ctx.shadowColor = "#88FF88";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // ── Draw orange chain (snake tail) ──
      // Draw chain connectors
      if (s.chain.length > 1) {
        ctx.strokeStyle = "rgba(255,165,0,0.3)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(s.chain[0].x, s.chain[0].y);
        for (let i = 1; i < s.chain.length; i++) {
          ctx.lineTo(s.chain[i].x, s.chain[i].y);
        }
        ctx.stroke();
      }
      s.chain.forEach((c, i) => {
        const pulse = 1 + Math.sin(s.tick * 0.1 + i * 0.3) * 0.08;
        ctx.font = `${Math.round(ORANGE_SIZE * pulse)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.95 - i * 0.008;
        ctx.fillText("🍊", c.x, c.y);
        ctx.globalAlpha = 1;
      });

      // ── Draw capybara ──
      // Shield effect
      if (eff.shield) {
        ctx.beginPath();
        ctx.arc(s.cx, s.cy, CAPY_SIZE * 1.2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100,255,218,${0.4 + Math.sin(s.tick * 0.15) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // Speed trail
      if (eff.speed) {
        ctx.globalAlpha = 0.3;
        ctx.font = "28px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🦫", s.cx - s.cvx * 2, s.cy + 3);
        ctx.globalAlpha = 0.15;
        ctx.fillText("🦫", s.cx - s.cvx * 4, s.cy + 6);
        ctx.globalAlpha = 1;
      }
      // Main capybara
      ctx.font = "32px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🦫", s.cx, s.cy);

      // Bird friend
      if (eff.auto) {
        const bx = s.cx + Math.cos(s.tick * 0.08) * 20;
        const by = s.cy - 20 + Math.sin(s.tick * 0.12) * 8;
        ctx.font = "14px serif";
        ctx.fillText("🐦", bx, by);
      }

      // ── Particles ──
      s.particles.forEach(p => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Floating texts
      s.floatingTexts.forEach(ft => {
        ctx.globalAlpha = ft.life / ft.maxLife;
        ctx.fillStyle = ft.color;
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x, ft.y);
      });
      ctx.globalAlpha = 1;

      // ═══════════════════════════
      // ── HUD ──
      // ═══════════════════════════

      // Top bar background
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, W, 36);

      ctx.font = "bold 11px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      // Lives
      ctx.fillStyle = "#FF6B6B";
      ctx.fillText("❤️".repeat(Math.max(0, s.lives)), 6, 13);

      // Score
      ctx.fillStyle = "#FFD700";
      ctx.textAlign = "center";
      ctx.fillText(`SCORE: ${s.score}`, W / 2, 13);

      // Wave
      ctx.textAlign = "right";
      ctx.fillStyle = "#aaa";
      ctx.fillText(`W${s.wave}`, W - 8, 13);

      // Chain / Meme level bar
      const ml = MEME_LEVELS[s.memeLevel];
      const nextMl = s.memeLevel < MEME_LEVELS.length - 1 ? MEME_LEVELS[s.memeLevel + 1] : null;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 26, W, 10);
      // Progress
      if (nextMl) {
        const prog = (s.chain.length - ml.threshold) / (nextMl.threshold - ml.threshold);
        ctx.fillStyle = ml.color;
        ctx.fillRect(0, 26, W * Math.min(1, prog), 10);
      } else {
        ctx.fillStyle = ml.color;
        ctx.fillRect(0, 26, W, 10);
      }
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`🍊×${s.chain.length} ${ml.name.toUpperCase()}${nextMl ? ` → ${nextMl.name}` : " [MAX]"}`, W / 2, 31);

      // Active effects
      const effs = Object.keys(s.activeEffects);
      if (effs.length > 0) {
        ctx.font = "9px monospace";
        ctx.textAlign = "left";
        effs.forEach((k, i) => {
          const remaining = Math.ceil(s.activeEffects[k] / 60);
          ctx.fillStyle = "rgba(100,255,218,0.8)";
          ctx.fillText(`${k.toUpperCase()} ${remaining}s`, 6, 48 + i * 12);
        });
      }

      // Combo
      if (s.combo > 2) {
        ctx.textAlign = "right";
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = `hsl(${(s.combo * 20) % 360}, 80%, 60%)`;
        ctx.fillText(`${s.combo}× COMBO`, W - 8, 50);
      }

      // Bottom controls hint
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("← → or MOUSE to move • auto-fire on • collect 🍊 to grow chain", W / 2, H - 8);

      ctx.restore();

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [screen]);

  // ════════════════════════════════
  // MENU SCREEN
  // ════════════════════════════════
  if (screen === "menu") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(170deg, #1a0a2e, #2d1854, #0d0d2b)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "monospace", padding: 20, color: "#FFE4B5",
      }}>
        <style>{`
          @keyframes drift { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(5deg); } }
          @keyframes pulseBorder { 0%,100% { border-color: #FF8C0080; } 50% { border-color: #FFD70080; } }
          @keyframes scanline { 0% { background-position: 0 0; } 100% { background-position: 0 4px; } }
        `}</style>
        <div style={{ fontSize: 64, animation: "drift 3s ease-in-out infinite", marginBottom: 8 }}>🦫</div>
        <div style={{ display: "flex", gap: 4, fontSize: 24, marginBottom: 16 }}>
          {"🍊🍊🍊🍊🍊".split("").map((o, i) => (
            <span key={i} style={{ animation: `drift ${2 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }}>{o}</span>
          ))}
        </div>
        <h1 style={{
          fontSize: "clamp(22px, 5vw, 36px)", fontWeight: 900, color: "#FFD700",
          textShadow: "0 0 20px #FFD70040, 0 2px 0 #B8860B", letterSpacing: 3,
          textAlign: "center", margin: "0 0 4px",
        }}>COCONUT DOGGY</h1>
        <h2 style={{
          fontSize: "clamp(12px, 3vw, 18px)", color: "#FF8C00", letterSpacing: 6,
          margin: "0 0 20px", fontWeight: 400,
        }}>S W A R M</h2>

        <div style={{
          background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 20px",
          maxWidth: 340, marginBottom: 20, border: "1px solid rgba(255,200,100,0.15)",
          fontSize: 12, lineHeight: 1.8, color: "#ccc",
        }}>
          <div style={{ color: "#FFD700", fontWeight: 700, marginBottom: 6 }}>⌨️ HOW TO PLAY</div>
          <div>◂ ▸ <span style={{ color: "#888" }}>or</span> MOUSE — move your capybara</div>
          <div>🍊 Collect oranges → <span style={{ color: "#FFA500" }}>snake chain grows</span></div>
          <div>📧 Destroy corporate enemies → <span style={{ color: "#FF6B6B" }}>they fire back</span></div>
          <div>🐦 Grab powerups for meme abilities</div>
          <div>🔥 Longer chain = higher <span style={{ color: "#FFD700" }}>meme level</span></div>
          <div style={{ color: "#888", marginTop: 4 }}>fireballs destroy your orange chain!</div>
        </div>

        <div style={{
          display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center",
          marginBottom: 20, fontSize: 10, color: "#888",
        }}>
          {MEME_LEVELS.map((ml, i) => (
            <span key={i} style={{
              background: `${ml.color}20`, border: `1px solid ${ml.color}40`,
              borderRadius: 6, padding: "2px 8px", color: ml.color,
            }}>{ml.threshold}🍊 {ml.name}</span>
          ))}
        </div>

        <button onClick={startGame} style={{
          background: "linear-gradient(135deg, #FF8C00, #FFD700)",
          border: "none", borderRadius: 12, padding: "14px 52px",
          fontSize: 20, fontWeight: 900, color: "#1a0a2e", cursor: "pointer",
          letterSpacing: 2, fontFamily: "monospace",
          boxShadow: "0 0 30px rgba(255,165,0,0.3), 0 4px 0 #CD853F",
          transition: "transform 0.1s",
        }}
          onMouseDown={e => e.target.style.transform = "scale(0.96)"}
          onMouseUp={e => e.target.style.transform = "scale(1)"}
        >
          OK I PULL UP
        </button>
      </div>
    );
  }

  // ════════════════════════════════
  // GAME OVER SCREEN
  // ════════════════════════════════
  if (screen === "gameover") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(170deg, #1a0a2e, #2d1854, #0d0d2b)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "monospace", padding: 20, color: "#FFE4B5",
      }}>
        <style>{`@keyframes drift { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }`}</style>
        <div style={{ fontSize: 56, marginBottom: 8, animation: "drift 2s ease-in-out infinite" }}>🦫💫</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#FF6B6B", margin: "0 0 4px", letterSpacing: 2 }}>VIBES DEPLETED</h1>
        <p style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>the corporate emails won this round...</p>

        <div style={{
          background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "20px 30px",
          marginBottom: 24, border: "1px solid rgba(255,200,100,0.15)", textAlign: "center",
          minWidth: 260,
        }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#FFD700" }}>{finalScore}</div>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>FINAL SCORE</div>
          <div style={{ fontSize: 13, lineHeight: 2.2, color: "#ccc" }}>
            <div>📡 Wave reached: <span style={{ color: "#FF8C00" }}>{finalWave}</span></div>
            <div>🍊 Max chain: <span style={{ color: "#FFA500" }}>{finalChain}</span></div>
            <div>🏆 Meme rank: <span style={{ color: "#FFD700" }}>{finalLevel}</span></div>
          </div>
        </div>

        <button onClick={startGame} style={{
          background: "linear-gradient(135deg, #FF8C00, #FFD700)",
          border: "none", borderRadius: 12, padding: "12px 44px",
          fontSize: 18, fontWeight: 900, color: "#1a0a2e", cursor: "pointer",
          letterSpacing: 2, fontFamily: "monospace",
          boxShadow: "0 0 30px rgba(255,165,0,0.3), 0 4px 0 #CD853F",
        }}>
          PULL UP AGAIN
        </button>
      </div>
    );
  }

  // ════════════════════════════════
  // PLAYING — CANVAS
  // ════════════════════════════════
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d2b",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 0, margin: 0,
    }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          width: "min(100vw, 400px)",
          height: "min(100vh, 700px)",
          imageRendering: "pixelated",
          cursor: "none",
          touchAction: "none",
          display: "block",
        }}
      />
    </div>
  );
}