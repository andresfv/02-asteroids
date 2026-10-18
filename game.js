'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Power-ups ─────────────────────────────────────────────────────────────────
const POWERUP_DROP_CHANCE = 0.08;  // probabilidad de soltar un power-up al destruir un asteroide
const POWERUP_TTL         = 8;     // segundos que permanece en pantalla
const TRIPLE_DURATION     = 10;    // segundos de disparo triple
const TRIPLE_SPREAD       = 0.22;  // separación angular del abanico (rad)
const SHIELD_DURATION     = 5;     // segundos de escudo temporal (o hasta recibir un golpe)
const SHIELD_RADIUS       = 24;    // radio del círculo de energía alrededor de la nave
const SHIELD_GRACE        = 1;     // invencibilidad tras absorber un impacto (evita morir con los fragmentos)
const POWERUP_COLORS      = { triple: '#4df', shield: '#7f7' };

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;   // 'triple' | 'shield'
    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 35);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 11;
    this.ttl   = POWERUP_TTL;
    this.pulse = 0;
    this.dead  = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.pulse += dt;
    this.ttl   -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo cuando está por desaparecer
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;

    const r = this.radius + Math.sin(this.pulse * 5) * 1.5;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = POWERUP_COLORS[this.type];
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineCap = 'round';
    ctx.beginPath();
    if (this.type === 'triple') {
      // Icono: tres líneas en abanico
      for (const da of [-TRIPLE_SPREAD * 2, 0, TRIPLE_SPREAD * 2]) {
        const a = -Math.PI / 2 + da;
        ctx.moveTo(0, 4);
        ctx.lineTo(Math.cos(a) * 7, 4 + Math.sin(a) * 9);
      }
    } else {
      // Icono: mini nave dentro de un anillo
      ctx.moveTo(0, -4);
      ctx.lineTo(-3, 3);
      ctx.lineTo(3, 3);
      ctx.closePath();
      ctx.moveTo(6.5, 0);
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() {
    this.tripleShot = 0;   // tiempo restante de disparo triple (se pierde al morir o al pasar de nivel)
    this.shield     = 0;   // tiempo restante de escudo temporal (ídem; también se pierde al absorber un golpe)
    this.reset();
  }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;
    if (this.shield        > 0) this.shield        -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0)
      return [-TRIPLE_SPREAD, 0, TRIPLE_SPREAD].map(da => new Bullet(ox, oy, this.angle + da));
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;

    // Escudo temporal: círculo de energía pulsante, parpadea cuando está por terminar
    if (this.shield > 0 && !(this.shield < 1.5 && Math.floor(this.shield * 8) % 2 === 0)) {
      const pulse = Math.sin(performance.now() / 120);
      ctx.save();
      ctx.strokeStyle = POWERUP_COLORS.shield;
      ctx.globalAlpha = 0.6 + pulse * 0.25;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, SHIELD_RADIUS + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  ship.tripleShot = 0;   // cada nivel comienza sin power-ups
  ship.shield     = 0;
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

// Destruye un asteroide: suma puntos, lo parte y quizá suelta un power-up
function destroyAsteroid(a, newAsteroids) {
  a.dead = true;
  score += POINTS[a.size];
  explode(a.x, a.y, a.size * 5);
  newAsteroids.push(...a.split());
  if (Math.random() < POWERUP_DROP_CHANCE)
    powerUps.push(new PowerUp(a.x, a.y, Math.random() < 0.5 ? 'triple' : 'shield'));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.tripleShot = 0;
  ship.shield     = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerUps.forEach(p => p.update(dt));
    powerUps = powerUps.filter(p => !p.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        destroyAsteroid(a, newAsteroids);
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs power-up
  for (const p of powerUps) {
    if (dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'triple')
        ship.tripleShot = Math.max(ship.tripleShot, 0) + TRIPLE_DURATION;  // se acumula
      else
        ship.shield = SHIELD_DURATION;  // recarga, no se acumula
      explode(p.x, p.y, 6);
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nave vs asteroide (el escudo intercepta el asteroide en su borde, antes de que toque la nave;
  // actúa incluso durante la invencibilidad para que nada atraviese un escudo visible)
  if (ship.shield > 0) {
    const a = asteroids.find(a => dist(ship, a) < SHIELD_RADIUS + a.radius * 0.82);
    if (a) {
      const fragments = [];
      const d  = dist(ship, a) || 1;
      const ux = (a.x - ship.x) / d;
      const uy = (a.y - ship.y) / d;
      ship.shield     = 0;
      ship.invincible = SHIELD_GRACE;
      destroyAsteroid(a, fragments);
      explode(ship.x + ux * SHIELD_RADIUS, ship.y + uy * SHIELD_RADIUS, 10);  // chispas en el punto de impacto
      asteroids = asteroids.filter(o => !o.dead).concat(fragments);
    }
  } else if (ship.invincible <= 0) {
    const a = asteroids.find(a => dist(ship, a) < ship.radius + a.radius * 0.82);
    if (a) killShip();
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Indicadores de power-ups activos con barra de tiempo restante
  if (ship.dead) return;
  const indicators = [
    ['TRIPLE', ship.tripleShot, TRIPLE_DURATION, POWERUP_COLORS.triple],
    ['ESCUDO', ship.shield,     SHIELD_DURATION, POWERUP_COLORS.shield],
  ];
  let y = 48;
  ctx.textAlign = 'left';
  ctx.font = '13px monospace';
  for (const [label, t, max, color] of indicators) {
    if (t <= 0) continue;
    ctx.fillStyle = color;
    ctx.fillText(`${label} ${t.toFixed(1)}s`, 14, y);
    ctx.fillRect(14, y + 6, 110 * Math.min(t / max, 1), 3);
    y += 24;
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
