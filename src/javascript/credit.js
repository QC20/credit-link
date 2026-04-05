// =============================================================
// CONFIG — tweak everything from here
// =============================================================
const CONFIG = {
  text:              'Jonas Kjeldmand Jensen',
  easterEggText:     'jokje@dtu.dk',
  redirectURL:       'https://jonaskjeldmand.vercel.app/',

  // Interaction
  mouseRadius:       55,      // [8] larger than original 35
  returnForce:       0.05,
  damping:           0.9,

  // Particles
  particleSize:      1.25,
  sampleStep:        3,       // CSS-pixel gap between sampled points

  // Explosion  [3] radial burst from click origin + [2] motion blur
  explosionDuration: 1500,
  fadeOutDuration:   500,
  gravity:           0.12,    // downward pull during explosion

  // Aesthetics
  breathAmplitude:   0.8,     // [4] idle breath size in px
  breathSpeed:       0.001,
  shimmerSpeed:      0.0004,  // [1] colour shimmer rate

  // Easter egg [7] — long hover over text
  easterEggDelay:    7500,    // ms hovering before easter egg triggers
  easterEggDuration: 2500,    // ms easter egg stays visible

  // Mobile [10]
  longPressDuration: 600,
};

// =============================================================
// GLOBALS
// =============================================================
const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

let particles  = [];
let exploding  = false;
let explStart  = 0;
let explX      = 0;
let explY      = 0;
let rafId      = null;          // [6] stored so we can cancel before reinit
let textBounds = null;          // [9] cached after every init/resize
let dpr        = window.devicePixelRatio || 1;  // [5] HiDPI
let mouse      = { x: null, y: null };

// Easter egg state [7]
let eggBases   = [];
let eggPhase   = 'idle';        // 'idle' | 'active' | 'reverting'
let hoverStart = null;

// Mobile long press [10]
let lpTimer    = null;

// =============================================================
// PARTICLE
// =============================================================
class Particle {
  constructor(x, y) {
    this.origX  = x;
    this.origY  = y;
    this.baseX  = x;      // current lerp target — slides between orig and egg
    this.baseY  = y;
    this.eggX   = x;      // populated during easter egg setup
    this.eggY   = y;
    this.x      = x;
    this.y      = y;
    this.size   = CONFIG.particleSize;
    this.vx     = 0;
    this.vy     = 0;
    this.alpha  = 1;
    this.nx     = Math.random() * 0.5 - 0.25;  // noise amplitude x
    this.ny     = Math.random() * 0.5 - 0.25;
    this.nOff   = Math.random() * 1000;
    this.bOff   = Math.random() * Math.PI * 2; // breath phase
    this.hOff   = Math.random() * 60 - 30;     // per-particle hue nudge
  }

  // [1] subtle shimmer: near-white with tiny blue/warm drift
  draw(t) {
    const wave = Math.sin(t * CONFIG.shimmerSpeed + this.nOff);
    const hue  = 215 + this.hOff * 0.2 + wave * 15;
    const sat  = 8   + wave * 6;
    const lit  = 90  + wave * 7;
    ctx.fillStyle = `hsla(${hue},${sat}%,${lit}%,${this.alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }

  update(t) {
    // [7] slide base smoothly toward origin or easter-egg target
    const destX = eggPhase === 'active' ? this.eggX : this.origX;
    const destY = eggPhase === 'active' ? this.eggY : this.origY;
    this.baseX += (destX - this.baseX) * 0.04;
    this.baseY += (destY - this.baseY) * 0.04;

    // [3] explosion: radial burst + gravity
    if (exploding) {
      this.vy += CONFIG.gravity;
      this.x  += this.vx;
      this.y  += this.vy;
      const elapsed   = t - explStart;
      const fadeStart = CONFIG.explosionDuration - CONFIG.fadeOutDuration;
      if (elapsed > fadeStart) {
        this.alpha = Math.max(0, 1 - (elapsed - fadeStart) / CONFIG.fadeOutDuration);
      }
      return;
    }

    const hasMouse = mouse.x !== null;
    const dx   = hasMouse ? mouse.x - this.x : Infinity;
    const dy   = hasMouse ? mouse.y - this.y : Infinity;
    const dist = hasMouse ? Math.sqrt(dx * dx + dy * dy) : Infinity;

    if (dist < CONFIG.mouseRadius) {
      // push/pull near cursor with organic noise
      const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius;
      const angle = Math.atan2(dy, dx);
      this.vx += Math.cos(angle) * force * 0.1 + Math.sin(t * 0.002 + this.nOff) * this.nx;
      this.vy += Math.sin(angle) * force * 0.1 + Math.cos(t * 0.002 + this.nOff) * this.ny;
    } else {
      // [4] return-to-base with idle breathing
      const bx = Math.sin(t * CONFIG.breathSpeed        + this.bOff) * CONFIG.breathAmplitude;
      const by = Math.cos(t * CONFIG.breathSpeed * 0.7  + this.bOff) * CONFIG.breathAmplitude;
      this.vx += (this.baseX + bx - this.x) * CONFIG.returnForce;
      this.vy += (this.baseY + by - this.y) * CONFIG.returnForce;
    }

    this.x  += this.vx;
    this.y  += this.vy;
    this.vx *= CONFIG.damping;
    this.vy *= CONFIG.damping;
  }

  // [3] radial launch from explosion origin
  launch() {
    const dx   = this.x - explX;
    const dy   = this.y - explY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd  = Math.random() * 6 + 2;
    this.vx = (dx / dist) * spd * (0.5 + Math.random() * 0.5);
    this.vy = (dy / dist) * spd * (0.5 + Math.random() * 0.5) - Math.random() * 3;
  }
}

// =============================================================
// TEXT SAMPLING  [5] works in CSS-pixel space; handles HiDPI
// =============================================================
function sampleText(text, x, y, fontSize) {
  const offscreen   = document.createElement('canvas');
  offscreen.width   = canvas.width;   // physical pixels
  offscreen.height  = canvas.height;
  const octx        = offscreen.getContext('2d');
  octx.scale(dpr, dpr);               // draw in CSS pixels
  octx.font         = `550 ${fontSize}px "Poppins", Arial, sans-serif`;
  octx.fillStyle    = 'white';
  octx.fillText(text, x, y);

  const data  = octx.getImageData(0, 0, offscreen.width, offscreen.height);
  const step  = Math.max(1, Math.round(CONFIG.sampleStep * dpr));
  const out   = [];

  for (let py = 0; py < offscreen.height; py += step) {
    for (let px = 0; px < offscreen.width; px += step) {
      if (data.data[(py * offscreen.width + px) * 4 + 3] > 200) {
        out.push({ x: px / dpr, y: py / dpr }); // convert back to CSS px
      }
    }
  }
  return out;
}

// =============================================================
// INIT  [5][6][9]
// =============================================================
function init() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }  // [6]

  exploding  = false;
  eggPhase   = 'idle';
  hoverStart = null;
  particles  = [];

  dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  // [5] proper HiDPI setup
  canvas.width        = w * dpr;
  canvas.height       = h * dpr;
  canvas.style.width  = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(1, 0, 0, 1, 0, 0);  // reset before re-scaling
  ctx.scale(dpr, dpr);

  const fontSize  = Math.min(w / 20, 28);
  ctx.font        = `550 ${fontSize}px "Poppins", Arial, sans-serif`;
  const metrics   = ctx.measureText(CONFIG.text);
  const textW     = metrics.width;
  const textX     = w - textW - 20;
  const textY     = h - 20;

  // [9] cache bounds
  textBounds = {
    x:      textX,
    y:      textY - fontSize * 1.2,
    width:  textW,
    height: fontSize * 1.2,
  };

  const mainPos = sampleText(CONFIG.text, textX, textY, fontSize);
  particles = mainPos.map(p => new Particle(p.x, p.y));

  // [7] pre-sample easter egg text at same position
  eggBases = sampleText(CONFIG.easterEggText, textX, textY, fontSize);

  rafId = requestAnimationFrame(animate);
}

// =============================================================
// EASTER EGG  [7]
// =============================================================
function activateEasterEgg() {
  if (eggPhase !== 'idle' || eggBases.length === 0) return;
  eggPhase = 'active';

  particles.forEach((p, i) => {
    const t  = eggBases[i % eggBases.length];
    p.eggX   = t.x;
    p.eggY   = t.y;
  });

  setTimeout(() => {
    eggPhase   = 'reverting';
    setTimeout(() => { eggPhase = 'idle'; hoverStart = null; }, 1500);
  }, CONFIG.easterEggDuration);
}

function checkEasterEggHover(t) {
  if (eggPhase !== 'idle' || mouse.x === null) { hoverStart = null; return; }
  if (inBounds(mouse.x, mouse.y)) {
    if (hoverStart === null) hoverStart = t;
    if (t - hoverStart >= CONFIG.easterEggDelay) activateEasterEgg();
  } else {
    hoverStart = null;
  }
}

// =============================================================
// INTERACTION HELPERS
// =============================================================
function inBounds(x, y) {
  if (!textBounds) return false;
  return (
    x >= textBounds.x && x <= textBounds.x + textBounds.width &&
    y >= textBounds.y && y <= textBounds.y + textBounds.height
  );
}

function startExplosion(x, y) {
  if (exploding) return;
  explX      = x;
  explY      = y;
  exploding  = true;
  explStart  = Date.now();
  particles.forEach(p => p.launch());
  setTimeout(() => { window.location.href = CONFIG.redirectURL; }, CONFIG.explosionDuration);
}

// =============================================================
// EVENTS
// =============================================================

// Mouse move — update position + [8] cursor change
window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  canvas.style.cursor = inBounds(mouse.x, mouse.y) ? 'pointer' : 'default';
});

window.addEventListener('mouseout', () => {
  mouse.x = null;
  mouse.y = null;
  canvas.style.cursor = 'default';
});

// Click
canvas.addEventListener('click', e => {
  const x = e.clientX;
  const y = e.clientY;
  if (inBounds(x, y)) startExplosion(x, y);
});

// Touch move
window.addEventListener('touchmove', e => {
  mouse.x = e.touches[0].clientX;
  mouse.y = e.touches[0].clientY;
  e.preventDefault();
}, { passive: false });

window.addEventListener('touchend', () => {
  mouse.x = null;
  mouse.y = null;
  clearTimeout(lpTimer);
});

// [10] long press on mobile
canvas.addEventListener('touchstart', e => {
  const x = e.touches[0].clientX;
  const y = e.touches[0].clientY;
  lpTimer = setTimeout(() => {
    if (inBounds(x, y)) startExplosion(x, y);
  }, CONFIG.longPressDuration);
}, { passive: true });

canvas.addEventListener('touchmove', () => clearTimeout(lpTimer), { passive: true });

// Resize — [6] cancels existing loop before reinit
window.addEventListener('resize', () => init());

// =============================================================
// ANIMATE
// =============================================================
function animate() {
  const t = Date.now();

  // [2] motion blur during explosion; clean clear otherwise
  if (exploding) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  } else {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  // [7] track hover for easter egg
  checkEasterEggHover(t);

  for (let i = 0; i < particles.length; i++) {
    particles[i].update(t);
    particles[i].draw(t);
  }

  rafId = requestAnimationFrame(animate);
}

// =============================================================
// BOOT — wait for font before sampling pixels
// =============================================================
document.fonts.ready.then(() => init());
