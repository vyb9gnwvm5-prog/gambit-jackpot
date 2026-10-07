/* =====================================================================
   GAMBIT JACKPOT - fx.js
   Cartoon-Effekte auf Canvas: Partikel mit dunkler Kontur, POW-Sterne,
   Staubwölkchen, Ringe. Dazu Screenshake, Flash, Konfetti, Zähler.
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  const F = GJ.FX = {};
  const INK = '#14203d';
  let cv, cx, W = 0, H = 0, dpr = 1, running = false;
  const parts = [], rings = [], pows = [];

  F.speed = function () {
    const s = GJ.Save.d && GJ.Save.d.settings.animSpeed;
    return s === 'aus' ? 0 : s === 'schnell' ? 0.45 : 1;
  };
  F.sleep = function (ms) {
    const f = F.speed();
    if (!f || ms <= 0) return Promise.resolve();
    return new Promise(r => setTimeout(r, ms * f));
  };
  F.rawSleep = ms => new Promise(r => setTimeout(r, ms));
  F.anim = function (el, frames, opts) {
    const f = F.speed();
    if (!el || !el.animate || !f) return Promise.resolve();
    const o = Object.assign({ duration: 300, easing: 'ease-out', fill: 'none' }, opts);
    o.duration = o.duration * f;
    try { const a = el.animate(frames, o); return a.finished.catch(() => {}); } catch (e) { return Promise.resolve(); }
  };

  F.init = function () {
    cv = document.getElementById('fx-canvas');
    cx = cv.getContext('2d');
    const rs = () => { dpr = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; };
    rs();
    window.addEventListener('resize', rs);
  };

  function starPath(r, inner, points) {
    cx.beginPath();
    for (let k = 0; k < points * 2; k++) {
      const a = k * Math.PI / points - Math.PI / 2, rr = k % 2 ? r * inner : r;
      cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    cx.closePath();
  }

  function loop() {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    cx.lineJoin = 'round'; cx.lineCap = 'round';
    // Ringe
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.t += 1;
      const k = r.t / r.dur;
      if (k >= 1) { rings.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - k, 3), rad = Math.max(1, r.maxR * e), w = r.width * (1 - k * 0.7);
      cx.globalAlpha = 1 - k * k;
      cx.strokeStyle = INK; cx.lineWidth = w + 5;
      cx.beginPath(); cx.arc(r.x, r.y, rad, 0, Math.PI * 2); cx.stroke();
      cx.strokeStyle = r.color; cx.lineWidth = w;
      cx.beginPath(); cx.arc(r.x, r.y, rad, 0, Math.PI * 2); cx.stroke();
    }
    // POW-Sterne
    for (let i = pows.length - 1; i >= 0; i--) {
      const p = pows[i];
      p.t += 1;
      const k = p.t / p.dur;
      if (k >= 1) { pows.splice(i, 1); continue; }
      const sc = k < 0.25 ? 0.3 + (k / 0.25) * 0.8 : 1.1 - (k - 0.25) * 0.2;
      cx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.scale(sc, sc);
      starPath(p.size / 2, 0.55, 9);
      cx.fillStyle = p.color; cx.fill(); cx.strokeStyle = INK; cx.lineWidth = 4 / sc; cx.stroke();
      starPath(p.size / 4, 0.5, 9);
      cx.fillStyle = '#ffffff'; cx.fill();
      cx.restore();
    }
    // Partikel
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= 1;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g;
      if (p.sway) p.vx += Math.sin((p.max - p.life) * 0.15 + p.seed) * p.sway;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      const t = p.life / p.max;
      cx.globalAlpha = p.shape === 'smoke' ? Math.min(1, t * 2.5) : (t < 0.25 ? t / 0.25 : 1);
      cx.fillStyle = p.color; cx.strokeStyle = INK; cx.lineWidth = 2.2;
      if (p.shape === 'circle' || p.shape === 'smoke') {
        const r = p.shape === 'smoke' ? p.size * (0.5 + (1 - t) * 0.9) : p.size * (0.45 + 0.55 * t);
        cx.beginPath(); cx.arc(p.x, p.y, Math.max(0.5, r), 0, Math.PI * 2); cx.fill(); cx.stroke();
      } else if (p.shape === 'spark') {
        cx.lineWidth = p.size + 3; cx.strokeStyle = INK;
        cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); cx.stroke();
        cx.lineWidth = p.size; cx.strokeStyle = p.color; cx.stroke();
      } else if (p.shape === 'star') {
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot);
        starPath(p.size * (0.5 + 0.5 * t), 0.45, 5); cx.fill(); cx.stroke(); cx.restore();
      } else {
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot);
        const w = p.size, h = p.shape === 'confetti' ? p.size * 0.55 : p.size * 0.75;
        cx.fillRect(-w / 2, -h / 2, w, h); cx.lineWidth = 1.6; cx.strokeRect(-w / 2, -h / 2, w, h); cx.restore();
      }
    }
    cx.globalAlpha = 1;
    if (parts.length || rings.length || pows.length) requestAnimationFrame(loop);
    else { running = false; cx.clearRect(0, 0, W, H); }
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }

  // opts: n, colors[], speed, size, life, gravity, shape(circle|star|square|spark|smoke|confetti), spread, angle, drag, sway, jitter, up
  F.burst = function (x, y, o) {
    if (!cx || !F.speed()) return;
    o = o || {};
    const n = o.n || 16, colors = o.colors || ['#ffc83d'];
    for (let i = 0; i < n; i++) {
      const ang = (o.angle != null ? o.angle : 0) + (o.spread != null ? (Math.random() - 0.5) * o.spread : Math.random() * Math.PI * 2);
      const sp = (o.speed || 4) * (0.4 + Math.random() * 0.8);
      const life = Math.round((o.life || 38) * (0.7 + Math.random() * 0.5));
      parts.push({
        x: x + (o.jitter ? (Math.random() - 0.5) * o.jitter : 0), y: y + (o.jitter ? (Math.random() - 0.5) * o.jitter : 0),
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - (o.up || 0),
        g: o.gravity == null ? 0.15 : o.gravity, drag: o.drag || 0.96, life, max: life,
        size: Math.max(2.5, (o.size || 6) * (0.7 + Math.random() * 0.6)), color: colors[Math.floor(Math.random() * colors.length)],
        shape: o.shape || 'circle', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, sway: o.sway || 0, seed: Math.random() * 10
      });
    }
    if (parts.length > 1500) parts.splice(0, parts.length - 1500);
    kick();
  };
  // Staubwölkchen (weiße Kreise mit Kontur, die aufquellen)
  F.puff = function (x, y, o) {
    o = o || {};
    F.burst(x, y, { n: o.n || 4, colors: [o.color || '#ffffff'], speed: 1.6, size: o.size || 14, shape: 'smoke', gravity: -0.03, drag: 0.9, life: o.life || 26, jitter: o.spread || (o.size || 14) * 1.2 });
  };
  // Comic-Treffer-Stern
  F.pow = function (x, y, o) {
    if (!cx || !F.speed()) return;
    o = o || {};
    pows.push({ x, y, size: o.size || 80, color: o.color || '#ffc83d', rot: (Math.random() - 0.5) * 0.6, t: 0, dur: Math.max(8, Math.round(22 * F.speed())) });
    kick();
  };
  F.ring = function (x, y, o) {
    if (!cx || !F.speed()) return;
    o = o || {};
    rings.push({ x, y, maxR: o.maxR || 80, color: o.color || '#ffc83d', width: o.width || 8, dur: Math.max(8, Math.round((o.dur || 28) * F.speed())), t: 0 });
    kick();
  };
  F.confetti = function (n) {
    const cols = ['#ffc83d', '#5fd068', '#4f9cf5', '#ff5d4f', '#b66cff', '#ffffff'];
    for (let i = 0; i < (n || 140); i++) {
      F.burst(Math.random() * W, -20 - Math.random() * 100, { n: 1, colors: cols, speed: 1.5, angle: Math.PI / 2, spread: 1.2, gravity: 0.07, drag: 0.995, life: 190, size: 11, shape: 'confetti', sway: 0.06 });
    }
  };
  F.shake = function (level) {
    const s = GJ.Save.d && GJ.Save.d.settings;
    if (!s || !s.shake || !F.speed()) return;
    const app = document.getElementById('app');
    const cls = level === 'l' ? 'shake-l' : 'shake-s';
    app.classList.remove('shake-s', 'shake-l');
    void app.offsetWidth;
    app.classList.add(cls);
    setTimeout(() => app.classList.remove(cls), 600);
    if (GJ.UI && GJ.UI.buzz) GJ.UI.buzz(level === 'l' ? 80 : 30);
  };
  F.flash = function (color, op, dur) {
    if (!F.speed()) return;
    const el = document.getElementById('flash');
    el.style.background = color || '#fff';
    F.anim(el, [{ opacity: op || 0.5 }, { opacity: 0 }], { duration: dur || 220, easing: 'steps(3)' });
  };
  F.center = function (el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  };
  // Münzen fliegen zum EP-Zähler
  F.coinsFly = function (from, toEl, n, onEach) {
    return new Promise(res => {
      if (!toEl || !F.speed()) { if (onEach) for (let i = 0; i < n; i++) onEach(i); res(); return; }
      const to = F.center(toEl);
      let done = 0;
      for (let i = 0; i < n; i++) {
        const c = document.createElement('div');
        c.innerHTML = GJ.icon('coin');
        c.style.cssText = `position:fixed;z-index:960;width:30px;height:30px;left:${from.x - 15}px;top:${from.y - 15}px;pointer-events:none;`;
        c.firstChild.style.cssText = 'width:100%;height:100%';
        document.body.appendChild(c);
        const mx = (from.x + to.x) / 2 + (Math.random() - 0.5) * 160, my = Math.min(from.y, to.y) - 60 - Math.random() * 60;
        const a = c.animate([
          { transform: 'translate(0,0) scale(.5)' },
          { transform: `translate(${mx - from.x}px,${my - from.y}px) scale(1.2) rotate(180deg)`, offset: 0.45 },
          { transform: `translate(${to.x - from.x}px,${to.y - from.y}px) scale(.6) rotate(360deg)` }
        ], { duration: 650 * F.speed() + i * 40, easing: 'ease-in-out', delay: i * 45 });
        a.finished.then(() => {
          c.remove(); done++;
          GJ.Audio.play('coin');
          if (onEach) onEach(i);
          if (done === n) res();
        }).catch(() => { c.remove(); });
      }
    });
  };
  F.countUp = function (el, from, to, ms) {
    return new Promise(res => {
      if (!el) { res(); return; }
      if (!F.speed() || from === to) { el.textContent = to; res(); return; }
      const t0 = performance.now(), d = (ms || 800) * F.speed();
      const step = now => {
        const k = Math.min(1, (now - t0) / d);
        el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  };
})();
