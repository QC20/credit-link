/**
 * <credit-link> — Jonas Kjeldmand Jensen
 *
 * Self-contained Web Component. Other projects only need:
 *
 *   <script type="module" src="https://jonaskjeldmand.vercel.app/credit-link.js"></script>
 *   <credit-link></credit-link>
 *
 * All defaults live in DEFAULTS below — change them here and every
 * project that imports the component picks up the update automatically.
 *
 * Per-project overrides (optional) via HTML attributes:
 *   <credit-link text="..." href="..." easter-egg="..."></credit-link>
 */

// =============================================================
// DEFAULTS — the single source of truth across all projects
// =============================================================
const DEFAULTS = {
  text:         'Jonas Kjeldmand Jensen',
  href:         'https://jonaskjeldmand.vercel.app/',
  easterEgg:    'jokje@dtu.dk',
};

// =============================================================
// SHARED BEHAVIOUR CONFIG
// =============================================================
const CONFIG = {
  mouseRadius:       55,
  returnForce:       0.05,
  damping:           0.9,
  particleSize:      1.25,
  sampleStep:        3,
  explosionDuration: 1500,
  fadeOutDuration:   500,
  gravity:           0.12,
  breathAmplitude:   0.8,
  breathSpeed:       0.001,
  shimmerSpeed:      0.0004,
  easterEggDelay:    7500,
  easterEggDuration: 2500,
  longPressDuration: 600,
};

// =============================================================
// PARTICLE
// =============================================================
class Particle {
  constructor(x, y) {
    this.origX  = x;
    this.origY  = y;
    this.baseX  = x;
    this.baseY  = y;
    this.eggX   = x;
    this.eggY   = y;
    this.x      = x;
    this.y      = y;
    this.size   = CONFIG.particleSize;
    this.vx     = 0;
    this.vy     = 0;
    this.alpha  = 1;
    this.nx     = Math.random() * 0.5 - 0.25;
    this.ny     = Math.random() * 0.5 - 0.25;
    this.nOff   = Math.random() * 1000;
    this.bOff   = Math.random() * Math.PI * 2;
    this.hOff   = Math.random() * 60 - 30;
  }

  draw(ctx, t) {
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

  update(t, mouse, eggPhase, exploding, explStart, explX, explY) {
    // Slide base toward origin or easter egg target
    const destX = eggPhase === 'active' ? this.eggX : this.origX;
    const destY = eggPhase === 'active' ? this.eggY : this.origY;
    this.baseX += (destX - this.baseX) * 0.04;
    this.baseY += (destY - this.baseY) * 0.04;

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
      const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius;
      const angle = Math.atan2(dy, dx);
      this.vx += Math.cos(angle) * force * 0.1 + Math.sin(t * 0.002 + this.nOff) * this.nx;
      this.vy += Math.sin(angle) * force * 0.1 + Math.cos(t * 0.002 + this.nOff) * this.ny;
    } else {
      const bx = Math.sin(t * CONFIG.breathSpeed       + this.bOff) * CONFIG.breathAmplitude;
      const by = Math.cos(t * CONFIG.breathSpeed * 0.7 + this.bOff) * CONFIG.breathAmplitude;
      this.vx += (this.baseX + bx - this.x) * CONFIG.returnForce;
      this.vy += (this.baseY + by - this.y) * CONFIG.returnForce;
    }

    this.x  += this.vx;
    this.y  += this.vy;
    this.vx *= CONFIG.damping;
    this.vy *= CONFIG.damping;
  }

  launch(explX, explY) {
    const dx   = this.x - explX;
    const dy   = this.y - explY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd  = Math.random() * 6 + 2;
    this.vx = (dx / dist) * spd * (0.5 + Math.random() * 0.5);
    this.vy = (dy / dist) * spd * (0.5 + Math.random() * 0.5) - Math.random() * 3;
  }
}

// =============================================================
// WEB COMPONENT
// =============================================================
class CreditLink extends HTMLElement {
  constructor() {
    super();
    // Bind all handlers so we can cleanly add and remove them
    this._onMouseMove   = this._onMouseMove.bind(this);
    this._onMouseOut    = this._onMouseOut.bind(this);
    this._onWindowClick = this._onWindowClick.bind(this);
    this._onTouchMove   = this._onTouchMove.bind(this);
    this._onTouchEnd    = this._onTouchEnd.bind(this);
    this._onTouchStart  = this._onTouchStart.bind(this);
    this._onTouchMoveLP = this._onTouchMoveLP.bind(this);
    this._onResize      = this._onResize.bind(this);
    this._animate       = this._animate.bind(this);
  }

  // Attributes that trigger a re-init when changed
  static get observedAttributes() { return ['text', 'href', 'easter-egg']; }

  // Attribute getters fall back to DEFAULTS — change DEFAULTS to update all projects
  get _text()      { return this.getAttribute('text')       || DEFAULTS.text; }
  get _href()      { return this.getAttribute('href')       || DEFAULTS.href; }
  get _easterEgg() { return this.getAttribute('easter-egg') || DEFAULTS.easterEgg; }

  // ----- Lifecycle -----

  connectedCallback() {
    this._buildCanvas();
    this._initState();
    this._attachEvents();
    document.fonts.ready.then(() => this._init());
  }

  disconnectedCallback() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
    this._detachEvents();
  }

  attributeChangedCallback() {
    // Re-init only after first connection
    if (this._canvas) this._init();
  }

  // ----- Canvas setup -----

  _buildCanvas() {
    this._canvas = document.createElement('canvas');
    // pointer-events: none so the canvas does not block page interactions
    // cursor is changed on document.body instead
    this._canvas.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      'pointer-events:none',
      'z-index:2147483647',
      'display:block',
    ].join(';');
    document.body.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');
  }

  _initState() {
    this._particles  = [];
    this._exploding  = false;
    this._explStart  = 0;
    this._explX      = 0;
    this._explY      = 0;
    this._rafId      = null;
    this._textBounds = null;
    this._dpr        = window.devicePixelRatio || 1;
    this._mouse      = { x: null, y: null };
    this._eggBases   = [];
    this._eggPhase   = 'idle';
    this._hoverStart = null;
    this._lpTimer    = null;
  }

  // ----- Events -----

  _attachEvents() {
    window.addEventListener('mousemove',  this._onMouseMove);
    window.addEventListener('mouseout',   this._onMouseOut);
    window.addEventListener('click',      this._onWindowClick);
    window.addEventListener('touchmove',  this._onTouchMove,  { passive: false });
    window.addEventListener('touchend',   this._onTouchEnd);
    window.addEventListener('touchstart', this._onTouchStart,  { passive: true });
    window.addEventListener('touchmove',  this._onTouchMoveLP, { passive: true });
    window.addEventListener('resize',     this._onResize);
  }

  _detachEvents() {
    window.removeEventListener('mousemove',  this._onMouseMove);
    window.removeEventListener('mouseout',   this._onMouseOut);
    window.removeEventListener('click',      this._onWindowClick);
    window.removeEventListener('touchmove',  this._onTouchMove);
    window.removeEventListener('touchend',   this._onTouchEnd);
    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchmove',  this._onTouchMoveLP);
    window.removeEventListener('resize',     this._onResize);
  }

  _onMouseMove(e) {
    this._mouse.x = e.clientX;
    this._mouse.y = e.clientY;
    document.body.style.cursor = this._inBounds(e.clientX, e.clientY) ? 'pointer' : '';
  }

  _onMouseOut() {
    this._mouse.x = null;
    this._mouse.y = null;
    document.body.style.cursor = '';
  }

  _onWindowClick(e) {
    if (this._inBounds(e.clientX, e.clientY)) this._startExplosion(e.clientX, e.clientY);
  }

  _onTouchMove(e) {
    this._mouse.x = e.touches[0].clientX;
    this._mouse.y = e.touches[0].clientY;
    e.preventDefault();
  }

  _onTouchEnd() {
    this._mouse.x = null;
    this._mouse.y = null;
    clearTimeout(this._lpTimer);
  }

  _onTouchStart(e) {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    this._lpTimer = setTimeout(() => {
      if (this._inBounds(x, y)) this._startExplosion(x, y);
    }, CONFIG.longPressDuration);
  }

  _onTouchMoveLP() { clearTimeout(this._lpTimer); }

  _onResize() { this._init(); }

  // ----- Init -----

  _init() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }

    this._exploding  = false;
    this._eggPhase   = 'idle';
    this._hoverStart = null;
    this._particles  = [];

    this._dpr = window.devicePixelRatio || 1;
    const w   = window.innerWidth;
    const h   = window.innerHeight;

    this._canvas.width        = w * this._dpr;
    this._canvas.height       = h * this._dpr;
    this._canvas.style.width  = `${w}px`;
    this._canvas.style.height = `${h}px`;
    this._ctx.setTransform(1, 0, 0, 1, 0, 0);
    this._ctx.scale(this._dpr, this._dpr);

    const fontSize = Math.min(w / 20, 28);
    this._ctx.font = `550 ${fontSize}px "Poppins", Arial, sans-serif`;
    const metrics  = this._ctx.measureText(this._text);
    const textW    = metrics.width;
    const textX    = w - textW - 20;
    const textY    = h - 20;

    this._textBounds = { x: textX, y: textY - fontSize * 1.2, width: textW, height: fontSize * 1.2 };

    const mainPos    = this._sampleText(this._text, textX, textY, fontSize);
    this._particles  = mainPos.map(p => new Particle(p.x, p.y));
    this._eggBases   = this._sampleText(this._easterEgg, textX, textY, fontSize);

    this._rafId = requestAnimationFrame(this._animate);
  }

  // ----- Pixel sampling -----

  _sampleText(text, x, y, fontSize) {
    const off    = document.createElement('canvas');
    off.width    = this._canvas.width;
    off.height   = this._canvas.height;
    const octx   = off.getContext('2d');
    octx.scale(this._dpr, this._dpr);
    octx.font      = `550 ${fontSize}px "Poppins", Arial, sans-serif`;
    octx.fillStyle = 'white';
    octx.fillText(text, x, y);

    const data  = octx.getImageData(0, 0, off.width, off.height);
    const step  = Math.max(1, Math.round(CONFIG.sampleStep * this._dpr));
    const out   = [];

    for (let py = 0; py < off.height; py += step) {
      for (let px = 0; px < off.width; px += step) {
        if (data.data[(py * off.width + px) * 4 + 3] > 200) {
          out.push({ x: px / this._dpr, y: py / this._dpr });
        }
      }
    }
    return out;
  }

  // ----- Easter egg -----

  _checkEasterEgg(t) {
    if (this._eggPhase !== 'idle' || this._mouse.x === null) { this._hoverStart = null; return; }
    if (this._inBounds(this._mouse.x, this._mouse.y)) {
      if (this._hoverStart === null) this._hoverStart = t;
      if (t - this._hoverStart >= CONFIG.easterEggDelay) this._activateEasterEgg();
    } else {
      this._hoverStart = null;
    }
  }

  _activateEasterEgg() {
    if (this._eggPhase !== 'idle' || !this._eggBases.length) return;
    this._eggPhase = 'active';
    this._particles.forEach((p, i) => {
      const t = this._eggBases[i % this._eggBases.length];
      p.eggX = t.x;
      p.eggY = t.y;
    });
    setTimeout(() => {
      this._eggPhase   = 'reverting';
      setTimeout(() => { this._eggPhase = 'idle'; this._hoverStart = null; }, 1500);
    }, CONFIG.easterEggDuration);
  }

  // ----- Explosion -----

  _startExplosion(x, y) {
    if (this._exploding) return;
    this._explX     = x;
    this._explY     = y;
    this._exploding = true;
    this._explStart = Date.now();
    this._particles.forEach(p => p.launch(x, y));
    setTimeout(() => { window.location.href = this._href; }, CONFIG.explosionDuration);
  }

  // ----- Helpers -----

  _inBounds(x, y) {
    const b = this._textBounds;
    return b && x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
  }

  // ----- Animation loop -----

  _animate() {
    const t   = Date.now();
    const ctx = this._ctx;
    const w   = window.innerWidth;
    const h   = window.innerHeight;

    if (this._exploding) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    this._checkEasterEgg(t);

    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      p.update(t, this._mouse, this._eggPhase, this._exploding, this._explStart, this._explX, this._explY);
      p.draw(ctx, t);
    }

    this._rafId = requestAnimationFrame(this._animate);
  }
}

// Register the custom element
if (!customElements.get('credit-link')) {
  customElements.define('credit-link', CreditLink);
}
