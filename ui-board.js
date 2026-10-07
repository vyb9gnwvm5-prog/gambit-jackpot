/* =====================================================================
   GAMBIT JACKPOT - ui-board.js
   Brett-Darstellung, Eingabe (Klick + Drag&Drop), Markierungen und
   alle Zug- und Special-Animationen.
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  const E = GJ.E, FX = GJ.FX;
  const PC = () => GJ.PIECES;
  const COLS = { w: ['#a9d6ff', '#4f9cf5', '#2c6bd1', '#14203d'], b: ['#ffb8ae', '#ff5d4f', '#c93a30', '#14203d'] };
  const ns = 'http://www.w3.org/2000/svg';
  const f8 = sq => sq & 7, r8 = sq => sq >> 3;

  function Board(container, opts) {
    this.opts = opts || {};
    this.ids = new Map();      // id -> element
    this.sqId = new Array(64).fill(null);
    this.wrap = document.createElement('div');
    this.wrap.className = 'board-wrap theme-' + ((GJ.Save.d && GJ.Save.d.settings.theme) || 'sand');
    this.el = document.createElement('div');
    this.el.className = 'board';
    this.sqWrap = document.createElement('div');
    this.sqWrap.className = 'squares';
    this.squares = [];
    this.flipped = false;
    for (let sq = 0; sq < 64; sq++) {
      const d = document.createElement('div');
      d.className = 'sq ' + ((f8(sq) + r8(sq)) % 2 ? 'l' : 'd');
      d.dataset.sq = sq;
      this.sqWrap.appendChild(d);
      this.squares.push(d);
    }
    this.pcWrap = document.createElement('div');
    this.fxLayer = document.createElement('div');
    this.fxLayer.className = 'board-fx';
    this.el.appendChild(this.sqWrap);
    this.el.appendChild(this.pcWrap);
    this.el.appendChild(this.fxLayer);
    this.wrap.appendChild(this.el);
    container.appendChild(this.wrap);
    this.layout();
    this.bindInput();
  }
  GJ.Board = { create: (c, o) => new Board(c, o) };
  const B = Board.prototype;

  // ---------------- Geometrie (Brett kann gedreht sein) ----------------
  // vf/vr: sichtbare Spalte/Reihe (0 = links bzw. unten)
  B.vf = function (sq) { return this.flipped ? 7 - f8(sq) : f8(sq); };
  B.vr = function (sq) { return this.flipped ? 7 - r8(sq) : r8(sq); };
  B.layout = function () {
    const coords = !GJ.Save.d || GJ.Save.d.settings.coords;
    this.squares.forEach((d, sq) => {
      d.style.left = this.vf(sq) * 12.5 + '%';
      d.style.top = (7 - this.vr(sq)) * 12.5 + '%';
      d.querySelectorAll('.coord').forEach(c => c.remove());
      if (!coords) return;
      if (this.vr(sq) === 0) d.insertAdjacentHTML('beforeend', `<span class="coord f">${'abcdefgh'[f8(sq)]}</span>`);
      if (this.vf(sq) === 0) d.insertAdjacentHTML('beforeend', `<span class="coord r">${r8(sq) + 1}</span>`);
    });
  };
  B.setFlipped = function (on) {
    if (this.flipped === !!on) return;
    this.flipped = !!on;
    this.layout();
    for (const [, el] of this.ids) { el.style.transition = 'none'; }
    if (this.st) this.render(this.st, this.lastOpts);
    requestAnimationFrame(() => { for (const [, el] of this.ids) el.style.transition = ''; });
  };
  B.rect = function () { return this.el.getBoundingClientRect(); };
  B.sqSize = function () { return this.rect().width / 8; };
  B.center = function (sq) {
    const r = this.rect(), s = r.width / 8;
    return { x: r.left + (this.vf(sq) + 0.5) * s, y: r.top + (7 - this.vr(sq) + 0.5) * s, s };
  };
  B.local = function (sq) { return { x: (this.vf(sq) + 0.5) * 100, y: (7 - this.vr(sq) + 0.5) * 100 }; }; // in SVG-Einheiten 0..800
  B.sqFromPoint = function (x, y) {
    const r = this.rect();
    let f = Math.floor((x - r.left) / (r.width / 8)), rr = 7 - Math.floor((y - r.top) / (r.height / 8));
    if (f < 0 || f > 7 || rr < 0 || rr > 7) return -1;
    if (this.flipped) { f = 7 - f; rr = 7 - rr; }
    return rr * 8 + f;
  };
  B.setPos = function (el, sq) { el.style.left = this.vf(sq) * 12.5 + '%'; el.style.top = (7 - this.vr(sq)) * 12.5 + '%'; };

  // ---------------- Rendering ----------------
  B.makePieceEl = function (p) {
    const el = document.createElement('div');
    el.className = 'pc';
    el.innerHTML = '<div class="pc-inner"></div>';
    this.pcWrap.appendChild(el);
    this.ids.set(p.id, el);
    return el;
  };
  B.render = function (st, o) {
    o = o || {};
    this.st = st;
    this.lastOpts = o;
    const seen = new Set();
    this.sqId.fill(null);
    for (let sq = 0; sq < 64; sq++) {
      const p = st.board[sq];
      if (!p) continue;
      seen.add(p.id);
      this.sqId[sq] = p.id;
      let el = this.ids.get(p.id) || this.makePieceEl(p);
      const master = ((st.levels[p.color] || {})[p.type] || 0) >= 3;
      const key = p.type + p.color + (master ? 'M' : '');
      if (el.dataset.key !== key) {
        el.querySelector('.pc-inner').innerHTML = PC()[p.type].svg(p.color, master);
        el.dataset.key = key;
      }
      el.dataset.sq = sq;
      el.classList.toggle('mine', !!(o.mine && o.mine === p.color));
      el.classList.toggle('frozen', p.frozen > 0);
      el.classList.remove('lift', 'dragging');
      el.style.transform = '';
      el.style.opacity = '';
      this.setPos(el, sq);
      // Status-Overlays
      let ice = el.querySelector('.st-ice'), shield = el.querySelector('.st-shield');
      let ni = el.querySelector('.st-num.ice'), nsd = el.querySelector('.st-num.shield');
      if (p.frozen > 0) {
        if (!ice) el.insertAdjacentHTML('beforeend', '<div class="st-ice"></div><div class="st-num ice"></div>');
        el.querySelector('.st-num.ice').textContent = p.frozen;
      } else { if (ice) ice.remove(); if (ni) ni.remove(); }
      if (p.shield > 0) {
        if (!shield) el.insertAdjacentHTML('beforeend', '<div class="st-shield"></div><div class="st-num shield"></div>');
        el.querySelector('.st-num.shield').textContent = p.shield;
      } else { if (shield) shield.remove(); if (nsd) nsd.remove(); }
    }
    for (const [id, el] of this.ids) if (!seen.has(id)) { el.remove(); this.ids.delete(id); }
  };
  B.setTheme = function (t) { this.wrap.className = 'board-wrap theme-' + t; };

  // spec: { last:[a,b], check, sel, moves:[], caps:[], sp:[], spFrom:[], aff:[], affGood:[], hc }
  B.marks = function (spec) {
    spec = spec || {};
    const cls = ['last', 'check', 'sel', 'hint-move', 'hint-cap', 'hint-sp', 'sp-from', 'aff', 'aff-good'];
    this.squares.forEach(s => { s.classList.remove(...cls); s.style.removeProperty('--hc'); });
    const add = (arr, c) => (arr || []).forEach(q => { if (q >= 0 && q < 64) { this.squares[q].classList.add(c); if (spec.hc) this.squares[q].style.setProperty('--hc', spec.hc); } });
    add(spec.last, 'last');
    if (spec.check != null && spec.check >= 0) this.squares[spec.check].classList.add('check');
    if (spec.sel != null) this.squares[spec.sel].classList.add('sel');
    add(spec.moves, 'hint-move');
    add(spec.caps, 'hint-cap');
    add(spec.sp, 'hint-sp');
    add(spec.spFrom, 'sp-from');
    add(spec.aff, 'aff');
    add(spec.affGood, 'aff-good');
    this.pcWrap.querySelectorAll('.pc.lift').forEach(e => e.classList.remove('lift'));
    if (spec.sel != null && this.sqId[spec.sel] != null) { const el = this.ids.get(this.sqId[spec.sel]); if (el) el.classList.add('lift'); }
  };

  // ---------------- Eingabe ----------------
  B.bindInput = function () {
    let down = null, dragging = false, dragEl = null;
    const o = this.opts;
    this.el.addEventListener('contextmenu', e => { e.preventDefault(); if (o.onRightClick) o.onRightClick(); });
    this.el.addEventListener('pointerdown', e => {
      if (e.button === 2) return;
      GJ.Audio.init();
      const sq = this.sqFromPoint(e.clientX, e.clientY);
      if (sq < 0) return;
      down = { sq, x: e.clientX, y: e.clientY, id: e.pointerId, can: o.canDrag ? o.canDrag(sq) : false };
      dragging = false;
    });
    window.addEventListener('pointermove', e => {
      if (down && down.id === e.pointerId) {
        if (!dragging && down.can && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
          dragging = true;
          dragEl = this.ids.get(this.sqId[down.sq]);
          if (dragEl) dragEl.classList.add('dragging');
          if (o.onDragStart) o.onDragStart(down.sq);
        }
        if (dragging && dragEl) {
          const r = this.rect(), s = r.width / 8;
          dragEl.style.left = (e.clientX - r.left - s / 2) + 'px';
          dragEl.style.top = (e.clientY - r.top - s / 2) + 'px';
          const over = this.sqFromPoint(e.clientX, e.clientY);
          if (o.onHover) o.onHover(over);
        }
        return;
      }
      // Vorschau für Specials (Maus)
      if (e.pointerType !== 'mouse' || !this.st || !document.body.contains(this.el)) return;
      if (o.onHover) o.onHover(this.sqFromPoint(e.clientX, e.clientY));
    });
    this.el.addEventListener('pointerleave', () => { if (o.onHover && !down) o.onHover(-1); });
    window.addEventListener('pointerup', e => {
      if (!down || down.id !== e.pointerId) return;
      const d = down; down = null;
      if (dragging) {
        dragging = false;
        if (dragEl) { dragEl.classList.remove('dragging'); this.setPos(dragEl, d.sq); }
        dragEl = null;
        const to = this.sqFromPoint(e.clientX, e.clientY);
        if (o.onDrop) o.onDrop(d.sq, to);
      } else if (o.onClick) {
        const sq = this.sqFromPoint(e.clientX, e.clientY);
        if (sq === d.sq) o.onClick(sq);
      }
    });
  };

  // =====================================================================
  //  Animationen
  // =====================================================================
  B.byId = function (id) { return this.ids.get(id); };
  B.elAt = function (sq) { const id = this.sqId[sq]; return id != null ? this.ids.get(id) : null; };
  B.svg = function () {
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 800 800');
    this.fxLayer.appendChild(s);
    return s;
  };
  B.fxDiv = function (sq, html, cls) {
    const d = document.createElement('div');
    d.className = 'fx-el ' + (cls || '');
    d.style.width = '12.5%'; d.style.height = '12.5%';
    this.setPos(d, sq);
    d.innerHTML = html || '';
    this.fxLayer.appendChild(d);
    return d;
  };
  function pieceColors(p) { return p ? COLS[p.color] : COLS.w; }

  // Schlag-Animation (Cartoon-Stil: Treffer-Blitz, POW-Stern, Figur fliegt raus)
  B.captureFx = async function (e, quick) {
    const el = this.byId(e.piece.id);
    const c = this.center(e.sq);
    const cols = pieceColors(e.piece);
    const style = e.style || 'shatter';
    if (el) { this.ids.delete(e.piece.id); el.style.zIndex = 70; }
    GJ.Audio.play('capture');
    GJ.UI && GJ.UI.buzz && GJ.UI.buzz(20);
    const inner = el && el.querySelector('.pc-inner');
    if (inner) await FX.anim(inner, [{ filter: 'brightness(1)', transform: 'scale(1)' }, { filter: 'brightness(4) saturate(0)', transform: 'scale(1.15, .85)' }, { filter: 'brightness(1)', transform: 'scale(1)' }], { duration: 120 });
    const dir = Math.random() < 0.5 ? -1 : 1;
    if (style === 'knock' || style === 'shatter' || style === 'slash') {
      FX.pow(c.x, c.y, { color: style === 'slash' ? '#ffffff' : '#ffc83d', size: c.s * (quick ? 1.1 : 1.5) });
      FX.burst(c.x, c.y, { n: quick ? 8 : 14, colors: cols.slice(0, 3), speed: 5, size: c.s * 0.12, shape: 'circle', gravity: 0.25, life: 34, up: 3 });
      if (style === 'slash') FX.burst(c.x, c.y, { n: 10, colors: ['#ffffff'], speed: 7, size: c.s * 0.06, shape: 'spark', gravity: 0, life: 16 });
      if (el) await FX.anim(el, [{ transform: 'none', opacity: 1 }, { transform: `translate(${dir * 40}%, -120%) rotate(${dir * 160}deg) scale(1.1)`, opacity: 1, offset: 0.35 }, { transform: `translate(${dir * 180}%, 220%) rotate(${dir * 520}deg) scale(.7)`, opacity: 0 }], { duration: 620, easing: 'cubic-bezier(.25,.1,.6,1)', fill: 'forwards' });
    } else if (style === 'dissolve') {
      FX.pow(c.x, c.y, { color: '#fff6a8', size: c.s * 1.3 });
      FX.burst(c.x, c.y, { n: 18, colors: ['#fff6a8', '#ffc83d', '#ffffff'], speed: 3, size: c.s * 0.1, gravity: -0.12, life: 45, shape: 'star' });
      if (el) await FX.anim(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-60%) scale(.4) rotate(30deg)' }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
    } else if (style === 'burn') {
      if (inner) await FX.anim(inner, [{ filter: 'brightness(1)' }, { filter: 'brightness(.25) saturate(0)' }], { duration: 180, fill: 'forwards' });
      FX.pow(c.x, c.y, { color: '#ff7a2f', size: c.s * 1.5 });
      FX.burst(c.x, c.y, { n: 18, colors: ['#ff7a2f', '#ffc83d', '#ff5d4f'], speed: 4, size: c.s * 0.11, gravity: -0.06, life: 40, shape: 'circle' });
      FX.puff(c.x, c.y - c.s * 0.2, { n: 5, size: c.s * 0.35, color: '#5c6380' });
      if (el) await FX.anim(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.3) translateY(30%)' }], { duration: 300, fill: 'forwards' });
    } else if (style === 'crush') {
      FX.puff(c.x, c.y + c.s * 0.3, { n: 6, size: c.s * 0.3, color: '#fff6dc' });
      if (el) await FX.anim(el, [{ transform: 'none' }, { transform: 'scale(1.3, .2) translateY(180%)', opacity: 0 }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
    }
    if (el) el.remove();
  };

  // Hüpfer: Figuren springen statt zu gleiten (Squash & Stretch)
  B.hop = function (el, height) {
    const inner = el && el.querySelector('.pc-inner');
    if (!inner) return Promise.resolve();
    return FX.anim(inner, [
      { transform: 'translateY(0) scale(1, 1)' },
      { transform: 'translateY(0) scale(1.12, .86)', offset: 0.12 },
      { transform: `translateY(-${height || 34}%) scale(.92, 1.1)`, offset: 0.5 },
      { transform: 'translateY(0) scale(1.14, .84)', offset: 0.85 },
      { transform: 'translateY(0) scale(1, 1)' }
    ], { duration: 300, easing: 'ease-in-out' });
  };

  // Generische Ereignis-Abarbeitung
  B.runEvents = async function (evts, st) {
    for (const e of evts) {
      if (e.done) continue;
      e.done = true;
      if (e.t === 'move' || e.t === 'push' || e.t === 'fly') {
        const el = this.byId(e.id);
        if (el) { this.setPos(el, e.to); if (e.t !== 'push') this.hop(el); }
        if (e.t === 'push') { const c = this.center(e.to); FX.puff(c.x, c.y + c.s * 0.25, { n: 3, size: c.s * 0.22, color: '#f3e2b6' }); }
        else GJ.Audio.play('move');
        await FX.sleep(e.t === 'push' ? 200 : 260);
        if (e.t !== 'push') { const c = this.center(e.to); FX.puff(c.x, c.y + c.s * 0.38, { n: 2, size: c.s * 0.16, color: '#ffffff', spread: c.s * 0.5 }); }
      } else if (e.t === 'capture') {
        await this.captureFx(e);
      } else if (e.t === 'promote') {
        const el = this.byId(e.id), c = this.center(e.sq);
        if (el) {
          const col = st.board[e.sq] ? st.board[e.sq].color : 'w';
          const master = ((st.levels[col] || {})[e.type] || 0) >= 3;
          el.querySelector('.pc-inner').innerHTML = PC()[e.type].svg(col, master);
          el.dataset.key = '';
          FX.anim(el.querySelector('.pc-inner'), [{ transform: 'scale(.3) rotate(-30deg)' }, { transform: 'scale(1.35) rotate(8deg)' }, { transform: 'scale(1)' }], { duration: 480, easing: 'cubic-bezier(.2,1.6,.4,1)' });
        }
        FX.pow(c.x, c.y, { color: '#ffc83d', size: c.s * 1.8 });
        FX.burst(c.x, c.y, { n: 16, colors: ['#ffc83d', '#ffffff'], speed: 5, shape: 'star', size: c.s * 0.14, gravity: 0.15, up: 3 });
        GJ.Audio.play('upgrade');
        await FX.sleep(450);
      } else if (e.t === 'freeze') {
        const c = this.center(e.sq);
        FX.burst(c.x, c.y, { n: 6, colors: ['#ffffff', '#9fd8ff'], speed: 2.5, size: c.s * 0.1, shape: 'star', gravity: 0, life: 30 });
      } else if (e.t === 'shield') {
        const c = this.center(e.sq);
        FX.ring(c.x, c.y, { color: '#ffd23f', maxR: c.s * 0.55, dur: 22, width: 5 });
      } else if (e.t === 'castle') {
        GJ.Audio.play('castle');
      }
    }
  };

  // Hauptfunktion: Zug animieren (DOM zeigt noch die Stellung VOR dem Zug)
  B.playMove = async function (st, m, fx) {
    if (!FX.speed()) { this.render(st); return; }
    if (m.kind === 'special') {
      const anim = PC()[m.stype].special.anim;
      const fn = this['sp_' + anim];
      GJ.Audio.play('sp_' + anim);
      try { if (fn) await fn.call(this, st, m, fx); } catch (err) { console.warn('[GJ] Animationsfehler', err); }
    }
    await this.runEvents(fx, st);
  };

  // ---------- 1 Traktor ----------
  B.sp_tractor = async function (st, m, fx) {
    const mv = fx.find(e => e.t === 'move');
    const pawn = mv && this.byId(mv.id);
    const color = st.board[m.to] ? st.board[m.to].color : 'w';
    const rot = (color === 'w') !== this.flipped ? -90 : 90;
    const tractor = this.fxDiv(m.from, `<svg viewBox="0 0 100 100" style="width:100%;height:100%;transform:rotate(${rot}deg)">
      <rect x="18" y="38" width="44" height="26" rx="5" fill="#e03131" stroke="#7a0f0f" stroke-width="3"/>
      <rect x="44" y="20" width="22" height="24" rx="3" fill="#ffd43b" stroke="#7a5a0f" stroke-width="3"/><rect x="48" y="24" width="14" height="10" fill="#a5d8ff"/>
      <rect x="62" y="44" width="22" height="16" rx="3" fill="#e03131" stroke="#7a0f0f" stroke-width="3"/><rect x="26" y="26" width="5" height="14" fill="#555"/>
      <circle cx="34" cy="68" r="17" fill="#222" stroke="#000" stroke-width="3"/><circle cx="34" cy="68" r="7" fill="#ffd43b"/>
      <circle cx="76" cy="70" r="10" fill="#222" stroke="#000" stroke-width="3"/><circle cx="76" cy="70" r="4" fill="#ffd43b"/>
      <path d="M86 48 L96 40 M86 56 L98 56 M86 64 L96 72" stroke="#9aa3b5" stroke-width="4" stroke-linecap="round"/></svg>`);
    tractor.style.zIndex = 50;
    tractor.style.transition = `left ${0.17 * FX.speed()}s linear, top ${0.17 * FX.speed()}s linear`;
    await FX.anim(tractor, [{ transform: 'scale(0)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 280 });
    if (pawn) { pawn.style.transition = tractor.style.transition; pawn.style.zIndex = 49; }
    const dir = color === 'w' ? 8 : -8;
    for (let s = m.from + dir; ; s += dir) {
      this.setPos(tractor, s); if (pawn) this.setPos(pawn, s);
      const c = this.center(s);
      FX.burst(c.x, c.y + c.s * 0.35, { n: 8, colors: ['#c9b08a', '#a08a6a'], speed: 1.5, size: 10, shape: 'smoke', gravity: -0.02, life: 35 });
      await FX.sleep(170);
      const cap = fx.find(e => e.t === 'capture' && e.sq === s && !e.done);
      if (cap) { cap.done = true; this.captureFx(cap); FX.shake('s'); }
      if (s === m.to) break;
    }
    if (mv) mv.done = true;
    await FX.anim(tractor, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.6)' }], { duration: 260, fill: 'forwards' });
    tractor.remove();
    if (pawn) { pawn.style.transition = ''; pawn.style.zIndex = ''; }
  };

  // ---------- 2 Doppelsprung ----------
  B.sp_doublejump = async function (st, m, fx) {
    const pid = st.board[m.to] && st.board[m.to].id;
    const el = this.byId(pid);
    for (const sq of m.picks) {
      const cap = fx.find(e => e.t === 'capture' && e.sq === sq && !e.done);
      if (el) {
        el.style.zIndex = 30;
        this.setPos(el, sq);
        FX.anim(el.querySelector('.pc-inner'), [{ transform: 'none' }, { transform: 'translateY(-45%) scale(1.35)' }, { transform: 'none' }], { duration: 330, easing: 'ease-in-out' });
      }
      await FX.sleep(300);
      const c = this.center(sq);
      FX.ring(c.x, c.y + c.s * 0.3, { color: '#c9b08a', maxR: c.s * 0.5, dur: 18, width: 4 });
      if (cap) { cap.done = true; await this.captureFx(cap, true); }
      await FX.sleep(80);
    }
    if (el) el.style.zIndex = '';
    fx.forEach(e => { if (e.t === 'move') e.done = true; });
  };

  // ---------- 3 Heiliger Strahl ----------
  B.sp_beam = async function (st, m, fx) {
    const s = this.svg();
    const a = this.local(m.from), b = this.local(m.data && m.data.end != null ? m.data.end : m.caps[m.caps.length - 1]);
    s.innerHTML = `<defs><linearGradient id="beamg" gradientUnits="userSpaceOnUse" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#ffe08a"/></linearGradient></defs>
      <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#14203d" stroke-width="34" stroke-linecap="round"/>
      <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#ffc83d" stroke-width="24" stroke-linecap="round"/>
      <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="url(#beamg)" stroke-width="9" stroke-linecap="round"/>`;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    s.querySelectorAll('line').forEach(l => { l.style.strokeDasharray = len; l.style.strokeDashoffset = len; });
    s.querySelectorAll('line').forEach(l => FX.anim(l, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 220, fill: 'forwards' }));
    FX.flash('#fff6c8', 0.25, 300);
    await FX.sleep(220);
    for (const e of fx.filter(e => e.t === 'capture')) { e.done = true; this.captureFx(e); }
    await FX.anim(s, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' });
    s.remove();
  };

  // ---------- 4 Rammbock ----------
  B.sp_ram = async function (st, m, fx) {
    const pid = st.board[m.to] && st.board[m.to].id;
    const el = this.byId(pid);
    const dist = Math.max(Math.abs(f8(m.to) - f8(m.from)), Math.abs(r8(m.to) - r8(m.from)));
    const vdx = Math.sign(this.vf(m.to) - this.vf(m.from)), vdy = Math.sign(this.vr(m.to) - this.vr(m.from));
    const step = (m.to - m.from) / dist;
    if (el) { el.style.transition = `left ${0.09 * FX.speed()}s linear, top ${0.09 * FX.speed()}s linear`; el.style.zIndex = 30; }
    await FX.anim(el, [{ transform: 'none' }, { transform: `translate(${-vdx * 12}%, ${vdy * 12}%)` }, { transform: 'none' }], { duration: 220 });
    for (let k = 1; k <= dist; k++) {
      const sq = m.from + step * k;
      if (el) this.setPos(el, sq);
      await FX.sleep(90);
      const cap = fx.find(e => e.t === 'capture' && e.sq === sq && !e.done);
      if (cap) {
        cap.done = true; this.captureFx(cap);
        const c = this.center(sq);
        FX.burst(c.x, c.y, { n: 22, colors: ['#8a5a2b', '#c08a4a', '#5a3a1a'], speed: 5, size: 5, shape: 'square', life: 35 });
        FX.shake('s');
      }
    }
    if (el) { el.style.transition = ''; el.style.zIndex = ''; }
    fx.forEach(e => { if (e.t === 'move') e.done = true; });
  };

  // ---------- 5 Frostnova ----------
  B.sp_frost = async function (st, m, fx) {
    const c = this.center(m.from);
    FX.ring(c.x, c.y, { color: '#8fd8ff', maxR: c.s * ((m.data.radius || 1) + 0.6), dur: 34, width: 10 });
    FX.ring(c.x, c.y, { color: '#ffffff', maxR: c.s * ((m.data.radius || 1) + 0.3), dur: 26, width: 4 });
    FX.burst(c.x, c.y, { n: 50, colors: ['#ffffff', '#8fd8ff', '#c8f0ff'], speed: 6, size: 4, shape: 'star', gravity: 0, life: 40, drag: 0.93 });
    FX.flash('#c8f0ff', 0.3, 350);
    await FX.sleep(380);
  };

  // ---------- 6 Königstausch ----------
  B.sp_swap = async function (st, m, fx) {
    const ev = fx.find(e => e.t === 'swap');
    const a = this.byId(ev.ida), b = this.byId(ev.idb);
    const ca = this.center(m.from), cb = this.center(m.to);
    [ca, cb].forEach(c => FX.burst(c.x, c.y, { n: 26, colors: ['#ffe08a', '#fff'], speed: 3, shape: 'star', size: 5, gravity: -0.03 }));
    await Promise.all([a, b].map(el => FX.anim(el, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0) rotate(180deg)', opacity: 0 }], { duration: 300, fill: 'forwards' })));
    [a, b].forEach(el => { if (el) el.style.transition = 'none'; });
    if (a) this.setPos(a, m.to); if (b) this.setPos(b, m.from);
    await FX.sleep(60);
    [ca, cb].forEach(c => FX.ring(c.x, c.y, { color: '#ffe08a', maxR: c.s * 0.7, dur: 24 }));
    await Promise.all([a, b].map(el => FX.anim(el, [{ transform: 'scale(0) rotate(-180deg)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 320 })));
    [a, b].forEach(el => { if (el) el.style.transition = ''; });
    ev.done = true;
  };

  // ---------- 7 Rauchbombe ----------
  B.sp_smoke = async function (st, m, fx) {
    const c = this.center(m.from);
    FX.burst(c.x, c.y, { n: 40, colors: ['#9aa3b5', '#c9ced8', '#6f7789'], speed: 2.4, size: 22, shape: 'smoke', gravity: -0.02, life: 70, drag: 0.95, jitter: c.s * (m.data.radius || 1) * 1.5 });
    await FX.sleep(500);
  };

  // ---------- 8 Lanzenwurf ----------
  B.sp_lance = async function (st, m, fx) {
    const a = this.center(m.from), b = this.center(m.caps[0]);
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;left:${a.x}px;top:${a.y}px;width:${a.s * 0.9}px;height:${a.s * 0.12}px;margin:${-a.s * 0.06}px 0 0 ${-a.s * 0.45}px;z-index:880;pointer-events:none;`;
    d.innerHTML = `<svg viewBox="0 0 100 12" preserveAspectRatio="none" style="width:100%;height:100%"><rect x="0" y="4" width="78" height="4" fill="#8a5a2b"/><path d="M76 0 L100 6 L76 12 Z" fill="#dfe6f2" stroke="#666"/></svg>`;
    document.body.appendChild(d);
    const frames = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, x = (b.x - a.x) * t, y = (b.y - a.y) * t - Math.sin(Math.PI * t) * a.s * 1.1;
      const tilt = ang - Math.cos(Math.PI * t) * 35;
      frames.push({ transform: `translate(${x}px,${y}px) rotate(${tilt}deg)` });
    }
    await FX.anim(d, frames, { duration: 420, easing: 'linear', fill: 'forwards' });
    FX.shake('s');
    const cap = fx.find(e => e.t === 'capture');
    if (cap) { cap.done = true; this.captureFx(cap); }
    await FX.anim(d, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    d.remove();
  };

  // ---------- 9 Wüstensturm ----------
  B.sp_sandstorm = async function (st, m, fx) {
    const c = this.center(m.from);
    for (let i = 0; i < 4; i++) {
      FX.burst(c.x, c.y, { n: 30, colors: ['#e3c48f', '#c9a46a', '#f2dcae'], speed: 4, size: 4, shape: 'circle', gravity: 0, life: 40, drag: 0.96, jitter: c.s * 0.6 });
      FX.ring(c.x, c.y, { color: '#e3c48f', maxR: c.s * 1.6, dur: 24, width: 6 });
      await FX.sleep(120);
    }
    FX.shake('s');
    for (const e of fx) if (e.t === 'push' || e.t === 'move') { const el = this.byId(e.id); if (el) this.setPos(el, e.to); e.done = true; }
    await FX.sleep(260);
  };

  // ---------- 10 Sturzflug ----------
  B.sp_dive = async function (st, m, fx) {
    const ev = fx.find(e => e.t === 'fly');
    const el = ev && this.byId(ev.id);
    if (!el) return;
    el.style.zIndex = 45;
    await FX.anim(el.querySelector('.pc-inner'), [{ transform: 'none' }, { transform: 'translateY(-40%) scale(1.6) rotate(-8deg)' }], { duration: 300, fill: 'forwards' });
    el.style.transition = `left ${0.5 * FX.speed()}s ease-in-out, top ${0.5 * FX.speed()}s ease-in-out`;
    this.setPos(el, ev.to);
    await FX.sleep(420);
    const cap = fx.find(e => e.t === 'capture');
    if (cap) { cap.done = true; this.captureFx(cap); }
    await FX.sleep(100);
    await FX.anim(el.querySelector('.pc-inner'), [{ transform: 'translateY(-40%) scale(1.6)' }, { transform: 'none' }], { duration: 200, easing: 'ease-in' });
    const c = this.center(ev.to);
    FX.ring(c.x, c.y, { color: '#c9b08a', maxR: c.s * 0.9, dur: 24, width: 6 });
    FX.burst(c.x, c.y + c.s * 0.3, { n: 16, colors: ['#c9b08a', '#a08a6a'], speed: 3, size: 10, shape: 'smoke', gravity: -0.01 });
    el.style.transition = ''; el.style.zIndex = '';
    ev.done = true;
  };

  // ---------- 11 Bekehrung ----------
  B.sp_convert = async function (st, m, fx) {
    const sq = m.affects[0], el = this.elAt(sq), c = this.center(sq);
    const cone = this.fxDiv(sq, '', '');
    cone.style.background = 'linear-gradient(180deg, rgba(255,240,180,0) 0%, rgba(255,240,180,.75) 70%, rgba(255,255,255,.9) 100%)';
    cone.style.height = '40%'; cone.style.top = Math.max(0, (7 - this.vr(sq)) * 12.5 - 27.5) + '%';
    cone.style.clipPath = 'polygon(35% 0, 65% 0, 100% 100%, 0 100%)';
    await FX.anim(cone, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' });
    FX.burst(c.x, c.y, { n: 24, colors: ['#fff6c8', '#ffe08a'], speed: 2, shape: 'star', size: 4, gravity: -0.05 });
    if (el) {
      const inner = el.querySelector('.pc-inner');
      FX.anim(inner, [{ transform: 'rotateY(0)' }, { transform: 'rotateY(360deg)' }], { duration: 700 });
      await FX.sleep(350);
      const p = st.board[sq];
      if (p) { inner.innerHTML = PC()[p.type].svg(p.color, false); el.dataset.key = ''; }
      await FX.sleep(350);
    }
    await FX.anim(cone, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    cone.remove();
  };

  // ---------- 12 Kettenblitz ----------
  function zig(a, b, n) {
    const pts = [[a.x, a.y]];
    for (let i = 1; i < n; i++) {
      const t = i / n, nx = -(b.y - a.y), ny = b.x - a.x, l = Math.hypot(nx, ny) || 1;
      const off = (Math.random() - 0.5) * 70;
      pts.push([a.x + (b.x - a.x) * t + nx / l * off, a.y + (b.y - a.y) * t + ny / l * off]);
    }
    pts.push([b.x, b.y]);
    return pts.map(p => p.join(',')).join(' ');
  }
  B.sp_bolt = async function (st, m, fx) {
    const s = this.svg();
    const chain = [m.from].concat(m.caps);
    const draw = () => {
      let h = '';
      for (let i = 0; i < chain.length - 1; i++) {
        const pts = zig(this.local(chain[i]), this.local(chain[i + 1]), 7);
        h += `<polyline points="${pts}" fill="none" stroke="#14203d" stroke-width="20" stroke-linejoin="bevel"/><polyline points="${pts}" fill="none" stroke="#ffd23f" stroke-width="12" stroke-linejoin="bevel"/><polyline points="${pts}" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="bevel"/>`;
      }
      s.innerHTML = h;
    };
    for (let i = 0; i < 3; i++) {
      draw(); s.style.opacity = 1;
      FX.flash(i === 0 ? '#ffffff' : '#c89bff', i === 0 ? 0.55 : 0.2, 160);
      await FX.sleep(90);
      s.style.opacity = 0.15;
      await FX.sleep(50);
    }
    s.style.opacity = 1;
    for (const e of fx.filter(e => e.t === 'capture')) { e.done = true; this.captureFx(e); }
    FX.shake('s');
    await FX.anim(s, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    s.remove();
  };

  // ---------- 13 Erdstampfer ----------
  B.sp_stomp = async function (st, m, fx) {
    const el = this.elAt(m.from), c = this.center(m.from);
    if (el) await FX.anim(el.querySelector('.pc-inner'), [{ transform: 'none' }, { transform: 'translateY(-50%) scale(1.1)', offset: 0.6 }, { transform: 'translateY(4%) scaleY(.85)' }], { duration: 380, easing: 'ease-in' });
    FX.shake('l');
    FX.ring(c.x, c.y, { color: '#b8a88f', maxR: c.s * ((m.data.radius || 1) + 0.6), dur: 30, width: 12 });
    FX.burst(c.x, c.y + c.s * 0.3, { n: 30, colors: ['#8a7a66', '#b8a88f', '#5e5040'], speed: 5, size: 6, shape: 'square', life: 40 });
    const s = this.svg();
    const a = this.local(m.from);
    let h = '';
    for (let i = 0; i < 7; i++) {
      const ang = Math.random() * Math.PI * 2; let x = a.x, y = a.y, pts = `${x},${y}`;
      for (let k = 0; k < 4; k++) { x += Math.cos(ang + (Math.random() - 0.5)) * 40; y += Math.sin(ang + (Math.random() - 0.5)) * 40; pts += ` ${x},${y}`; }
      h += `<polyline points="${pts}" fill="none" stroke="#2a1f14" stroke-width="5" stroke-linecap="round" opacity=".8"/>`;
    }
    s.innerHTML = h;
    if (el) FX.anim(el.querySelector('.pc-inner'), [{ transform: 'translateY(4%) scaleY(.85)' }, { transform: 'none' }], { duration: 200 });
    for (const e of fx.filter(e => e.t === 'capture')) { e.done = true; this.captureFx(e); }
    await FX.sleep(350);
    FX.anim(s, [{ opacity: 1 }, { opacity: 0 }], { duration: 900, fill: 'forwards' }).then(() => s.remove());
  };

  // ---------- 14 Feuerball ----------
  B.sp_fireball = async function (st, m, fx) {
    const el = this.elAt(m.from);
    const a = this.center(m.from), b = this.center(m.data.main);
    if (el) FX.anim(el.querySelector('.pc-inner'), [{ transform: 'rotate(0)' }, { transform: 'rotate(-18deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(0)' }], { duration: 380 });
    await FX.sleep(160);
    const ball = document.createElement('div');
    const sz = a.s * 0.42;
    ball.style.cssText = `position:fixed;left:${a.x - sz / 2}px;top:${a.y - sz / 2}px;width:${sz}px;height:${sz}px;border-radius:50%;z-index:880;pointer-events:none;
      background:radial-gradient(circle at 40% 35%, #fff6c8, #ffb627 35%, #ff3d00 70%, #7a1a00);box-shadow:0 0 20px #ff7a00, 0 0 40px #ff3d00;`;
    document.body.appendChild(ball);
    const dur = 520 * (FX.speed() || 1), t0 = performance.now();
    const peak = Math.max(a.s * 1.5, Math.hypot(b.x - a.x, b.y - a.y) * 0.35);
    await new Promise(res => {
      const stp = now => {
        const t = Math.min(1, (now - t0) / dur);
        const x = (b.x - a.x) * t, y = (b.y - a.y) * t - Math.sin(Math.PI * t) * peak;
        ball.style.transform = `translate(${x}px,${y}px) scale(${1 + Math.sin(Math.PI * t) * 0.4})`;
        FX.burst(a.x + x, a.y + y, { n: 2, colors: ['#ff7a00', '#ffb627', '#666'], speed: 0.6, size: 7, shape: 'smoke', gravity: -0.03, life: 26 });
        if (t < 1) requestAnimationFrame(stp); else res();
      };
      requestAnimationFrame(stp);
    });
    ball.remove();
    FX.burst(b.x, b.y, { n: 60, colors: ['#fff6c8', '#ffb627', '#ff7a00', '#ff3d00'], speed: 7, size: 5, shape: 'square', life: 40 });
    FX.burst(b.x, b.y, { n: 12, colors: ['#555', '#333', '#777'], speed: 2, size: 20, shape: 'smoke', gravity: -0.04, life: 70 });
    FX.ring(b.x, b.y, { color: '#ff7a00', maxR: b.s * 1.3, dur: 26, width: 10 });
    FX.flash('#ffb627', 0.3, 260);
    FX.shake('s');
    for (const e of fx.filter(e => e.t === 'capture')) { e.done = true; this.captureFx(e); }
    await FX.sleep(320);
  };

  // ---------- 15 Verwandlung ----------
  B.sp_polymorph = async function (st, m, fx) {
    const sq = m.affects[0], el = this.elAt(sq), c = this.center(sq);
    for (let i = 0; i < 3; i++) FX.ring(c.x, c.y, { color: '#b56cff', maxR: c.s * (0.9 - i * 0.2), dur: 30 + i * 6, width: 5 });
    FX.burst(c.x, c.y, { n: 40, colors: ['#b56cff', '#e7b3ff', '#ffffff'], speed: 3, size: 5, shape: 'star', gravity: 0, life: 45, drag: 0.94 });
    if (el) await FX.anim(el.querySelector('.pc-inner'), [{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(0) rotate(540deg)' }], { duration: 520, easing: 'ease-in', fill: 'forwards' });
    FX.burst(c.x, c.y, { n: 14, colors: ['#c9ced8', '#9aa3b5'], speed: 2, size: 18, shape: 'smoke', gravity: -0.03, life: 50 });
    const p = st.board[sq];
    if (el && p) {
      const inner = el.querySelector('.pc-inner');
      inner.innerHTML = PC()[p.type].svg(p.color, false); el.dataset.key = '';
      await FX.anim(inner, [{ transform: 'scale(0)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.2,1.6,.4,1)' });
      inner.getAnimations && inner.getAnimations().forEach(a => a.cancel());
    }
  };

  // ---------- 16 Klingenwirbel ----------
  B.sp_blades = async function (st, m, fx) {
    const d = this.fxDiv(m.from, `<svg viewBox="-150 -150 300 300" style="width:100%;height:100%;overflow:visible">${[0, 60, 120, 180, 240, 300].map(a =>
      `<g transform="rotate(${a})"><path d="M0 -60 L14 -128 L0 -150 L-6 -128 Z" fill="#eef3fb" stroke="#7a8599" stroke-width="3"/></g>`).join('')}<circle r="60" fill="none" stroke="#ffe08a" stroke-width="3" opacity=".6"/></svg>`);
    d.style.transform = 'scale(1.6)';
    d.style.zIndex = 45;
    const spin = FX.anim(d.firstChild, [{ transform: 'rotate(0) scale(.3)' }, { transform: 'rotate(360deg) scale(1)', offset: 0.3 }, { transform: 'rotate(900deg) scale(1)' }], { duration: 900, easing: 'ease-out' });
    await FX.sleep(260);
    for (const e of fx.filter(e => e.t === 'capture')) { e.done = true; this.captureFx(e); await FX.sleep(110); }
    await spin;
    d.remove();
  };

  // ---------- 17 Bollwerk ----------
  B.sp_bulwark = async function (st, m, fx) {
    const R = (m.data.radius || 1) * 2 + 1;
    const d = document.createElement('div');
    d.className = 'fx-el';
    d.style.width = (12.5 * R) + '%'; d.style.height = (12.5 * R) + '%';
    d.style.left = (this.vf(m.from) - (R - 1) / 2) * 12.5 + '%';
    d.style.top = (7 - this.vr(m.from) - (R - 1) / 2) * 12.5 + '%';
    d.style.borderRadius = '50%';
    d.style.border = '3px solid #ffe08a';
    d.style.background = 'radial-gradient(circle at 40% 30%, rgba(255,255,255,.35), rgba(255,224,138,.18) 50%, rgba(255,224,138,.35) 70%, transparent 71%), repeating-conic-gradient(from 0deg, rgba(255,224,138,.15) 0 30deg, transparent 30deg 60deg)';
    d.style.boxShadow = '0 0 40px #ffe08a, inset 0 0 30px rgba(255,224,138,.6)';
    this.fxLayer.appendChild(d);
    await FX.anim(d, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1 }, { transform: 'scale(1)', opacity: 1 }], { duration: 500, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'forwards' });
    await FX.sleep(350);
    await FX.anim(d, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
    d.remove();
  };

  // ---------- 18 Ruf der Legion ----------
  B.sp_revive = async function (st, m, fx) {
    const sq = m.picks[0], c = this.center(sq);
    const pillar = this.fxDiv(sq, '');
    pillar.style.height = (12.5 * 3) + '%';
    pillar.style.top = ((7 - this.vr(sq)) * 12.5 - 25) + '%';
    pillar.style.background = 'linear-gradient(180deg, rgba(255,224,138,0), rgba(255,224,138,.8) 60%, rgba(255,255,255,.95))';
    pillar.style.clipPath = 'polygon(25% 0, 75% 0, 85% 100%, 15% 100%)';
    pillar.style.border = '3px solid #14203d';
    await FX.anim(pillar, [{ opacity: 0, transform: 'scaleX(.2)' }, { opacity: 1, transform: 'scaleX(1)' }], { duration: 380, fill: 'forwards' });
    for (let i = 0; i < 3; i++) { FX.burst(c.x, c.y + c.s * 0.4, { n: 16, colors: ['#ffe08a', '#fff6c8'], speed: 1.5, size: 4, shape: 'star', gravity: -0.12, life: 45, jitter: c.s * 0.6 }); await FX.sleep(120); }
    const ev = fx.find(e => e.t === 'revive');
    if (ev) {
      ev.done = true;
      const el = this.makePieceEl(ev.piece);
      this.setPos(el, sq);
      el.querySelector('.pc-inner').innerHTML = PC()[ev.piece.type].svg(ev.piece.color, false);
      await FX.anim(el, [{ opacity: 0, transform: 'scale(.3) translateY(-40%)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 450, easing: 'cubic-bezier(.2,1.5,.4,1)' });
    }
    await FX.anim(pillar, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
    pillar.remove();
  };
})();
