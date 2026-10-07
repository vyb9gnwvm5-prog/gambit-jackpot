/* =====================================================================
   GAMBIT JACKPOT - ui-screens.js
   UI-Helfer (Modals, Toasts, Banner, Router, Navigation) und die Screens:
   Kampf (Start), Codex, Optionen, 1 gegen 1, Tutorial.
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  const C = GJ.CONFIG, FX = GJ.FX;
  const PC = () => GJ.PIECES;
  const UI = GJ.UI = GJ.UI || {};
  UI.screens = UI.screens || {};
  const $ = (sel, root) => (root || document).querySelector(sel);
  const ic = (n, c) => GJ.icon(n, c);

  // ---------------- Router ----------------
  UI.current = null;
  UI.go = function (name, params) {
    UI.closeAll();
    if (UI.current === 'game' && GJ.Match) GJ.Match.cleanup();
    document.onkeydown = null;
    window.onresize = null;
    UI.current = name;
    if (name === 'game') GJ.Match.start(params || {});
    else UI.screens[name](params || {});
  };
  UI.buzz = function (ms) {
    try { if (GJ.Save.d.settings.vibrate && navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) { /* nicht unterstützt */ }
  };
  UI.tap = function (el, fn, sound) {
    el.addEventListener('click', e => { GJ.Audio.init(); GJ.Audio.play(sound || 'click'); UI.buzz(); fn(e); });
  };

  // ---------------- Kopf, EP, Navigation ----------------
  UI.epChipHTML = () => `<div class="ep-chip" title="EP">${ic('coin')}<span class="ep-val">${GJ.Save.d.ep}</span></div>`;
  UI.topbarHTML = function (title, back) {
    return `<div class="topbar">${back ? `<button class="btn btn-blue btn-icon btn-back" aria-label="Zurück">${ic('back')}</button>` : ''}<div class="title toon">${title}</div>${UI.epChipHTML()}</div>`;
  };
  UI.bindTopbar = function (root, onBack) {
    const b = $('.btn-back', root);
    if (b) UI.tap(b, () => (onBack || (() => UI.go('home')))());
  };
  UI.initEP = function () {
    GJ.Save.onEP((now, old) => {
      document.querySelectorAll('.ep-chip').forEach(ch => {
        const v = ch.querySelector('.ep-val');
        FX.countUp(v, old, now, 500);
        ch.classList.remove('bump'); void ch.offsetWidth; ch.classList.add('bump');
      });
    });
  };
  const TABS = [['slot', 'slot', 'Automat'], ['deck', 'deck', 'Deck'], ['home', 'battle', 'Kampf'], ['codex', 'codex', 'Codex'], ['settings', 'gear', 'Optionen']];
  UI.navHTML = function (cur) {
    const S = GJ.Save, d = S.d;
    const badge = {
      slot: d.ep >= S.spinCost() ? '!' : '',
      codex: (() => { const n = d.owned.filter(t => { const c = S.upgradeCost(t); return c != null && c <= d.ep; }).length; return n ? String(n) : ''; })()
    };
    return `<nav class="bottomnav">${TABS.map(t => `<button class="nav-btn ${t[0] === cur ? 'on' : ''}" data-tab="${t[0]}">${ic(t[1])}<span class="nl">${t[2]}</span>${badge[t[0]] ? `<span class="badge">${badge[t[0]]}</span>` : ''}</button>`).join('')}</nav>`;
  };
  UI.bindNav = function (root) {
    root.querySelectorAll('.nav-btn').forEach(b => UI.tap(b, () => { if (UI.current !== b.dataset.tab) UI.go(b.dataset.tab); }));
  };
  // Standard-Screen mit Kopf, scrollbarem Inhalt und Navigation
  UI.shell = function (tab, title, body, opts) {
    opts = opts || {};
    const app = document.getElementById('app');
    app.innerHTML = `<div class="screen has-nav">${UI.topbarHTML(title, opts.back)}${opts.raw ? body : `<div class="main"><div class="wrap">${body}</div></div>`}${UI.navHTML(tab)}</div>`;
    UI.bindTopbar(app, opts.onBack);
    UI.bindNav(app);
    return app;
  };

  // ---------------- Modals ----------------
  // o: { title, html, buttons:[{label, cls, onClick, keep}], cls, wide, persistent, onClose, closeX }
  UI.modal = function (o) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    const md = document.createElement('div');
    md.className = 'modal ' + (o.wide ? 'wide ' : '') + (o.cls || '');
    md.innerHTML = (o.title ? `<div class="modal-head toon">${o.title}</div>` : '') + (o.closeX ? `<button class="btn btn-berry btn-sm btn-icon modal-close" aria-label="Schließen">${ic('close')}</button>` : '') + (o.html || '');
    if (o.buttons && o.buttons.length) {
      const act = document.createElement('div');
      act.className = 'modal-actions';
      o.buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'btn ' + (b.cls || '');
        btn.innerHTML = b.label;
        UI.tap(btn, () => { if (!b.keep) UI.closeModal(md); if (b.onClick) b.onClick(btn); });
        act.appendChild(btn);
      });
      md.appendChild(act);
    }
    bg.appendChild(md);
    md._onClose = o.onClose;
    const cx = md.querySelector('.modal-close');
    if (cx) UI.tap(cx, () => UI.closeModal(md));
    if (!o.persistent) bg.addEventListener('pointerdown', e => { if (e.target === bg) UI.closeModal(md); });
    document.getElementById('modal-root').appendChild(bg);
    return md;
  };
  UI.closeModal = function (md) {
    if (!md || !md.parentNode) return;
    md.parentNode.remove();
    if (md._onClose) md._onClose();
  };
  UI.closeAll = function () { document.getElementById('modal-root').innerHTML = ''; };
  UI.confirm = function (title, text, okLabel, onOk, danger) {
    return UI.modal({ title, html: `<p>${text}</p>`, buttons: [{ label: 'Abbrechen' }, { label: okLabel, cls: danger ? 'btn-berry' : 'btn-leaf', onClick: onOk }] });
  };

  // ---------------- Toast & Banner ----------------
  UI.toast = function (msg, ms) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = msg;
    document.getElementById('toast-root').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms || 2200);
  };
  UI.banner = function (o) {
    const root = document.getElementById('banner-root');
    root.innerHTML = '';
    const b = document.createElement('div');
    b.className = 'banner';
    b.style.setProperty('--rc', o.color || 'var(--sun)');
    b.innerHTML = `<div class="b-icon">${o.iconSVG || ic(o.icon || 'bolt')}</div><div><div class="b-title toon">${o.title}</div><div class="b-sub">${o.sub || ''}</div></div>`;
    root.appendChild(b);
    setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 260); }, (o.ms || 1500) * Math.max(0.5, FX.speed()));
  };
  UI.starsHTML = (l, max) => `<span class="stars-row">${[1, 2, 3].slice(0, max || 3).map(i => ic(i <= l ? 'star' : 'starOff')).join('')}</span>`;

  // =====================================================================
  //  KAMPF (Startscreen)
  // =====================================================================
  UI.miniDeckHTML = function (layout, color) {
    let h = '<div class="mini-deck">';
    for (const r of [2, 1]) for (let f = 0; f < 8; f++) {
      const name = 'abcdefgh'[f] + r, t = layout[name];
      h += `<div class="md ${(f + r) % 2 ? 'd' : 'l'}">${t && PC()[t] ? PC()[t].svg(color, false) : ''}</div>`;
    }
    return h + '</div>';
  };
  UI.defaultBot = function () {
    const S = GJ.Save;
    let i = C.bots.findIndex((b, k) => S.botUnlocked(k) && !S.d.botsBeaten.includes(b.id));
    if (i < 0) i = C.bots.length - 1;
    return i;
  };
  UI.screens.home = function () {
    const S = GJ.Save, d = S.d;
    if (d.selectedBot == null || d.selectedBot >= C.bots.length) d.selectedBot = UI.defaultBot();
    const logoPcs = ['springer', 'dame', 'koenig', 'turm'].map((t, i) => PC()[t].svg(i % 2 ? 'b' : 'w', false)).join('');
    const app = UI.shell('home', '', `<div class="home">
        <div class="logo"><div class="logo-pcs">${logoPcs}</div><span class="l1 toon">GAMBIT</span><span class="l2 toon">JACKPOT</span></div>
        <div class="panel arena" id="arena"></div>
        <div class="home-btns">
          ${d.match ? `<button class="btn btn-leaf btn-lg" id="resume">${ic('play')} Fortsetzen</button>` : ''}
          <button class="btn btn-sun btn-lg ${d.match ? '' : 'wiggle'}" id="fight">${ic('battle')} Kampf!</button>
          <button class="btn btn-blue" id="duel">${ic('duel')} 1 gegen 1 auf einem Gerät</button>
        </div>
        <div class="home-stats">
          <div class="stat">${ic('trophy')}<b>${d.stats.wins}</b><span>Siege</span></div>
          <div class="stat">${ic('fire')}<b>${d.stats.streak}</b><span>Serie</span></div>
        </div></div>`, { raw: true });
    app.querySelector('.topbar .title').remove();
    app.querySelector('.topbar').style.justifyContent = 'flex-end';
    UI.renderArena();
    UI.tap($('#fight'), () => UI.startBot(), 'click');
    UI.tap($('#duel'), () => UI.go('mp'));
    const rs = $('#resume'); if (rs) UI.tap(rs, () => UI.go('game', { resume: true }));
  };
  UI.renderArena = function () {
    const S = GJ.Save, d = S.d, i = d.selectedBot, bot = C.bots[i];
    const unlocked = S.botUnlocked(i), beaten = d.botsBeaten.includes(bot.id);
    const dk = S.activeDeck(), v = GJ.Deck.validate(dk.layout, true);
    const a = $('#arena');
    a.classList.toggle('locked', !unlocked);
    a.innerHTML = `<div class="arena-row">
        <button class="btn btn-sm btn-icon btn-blue" id="bprev" aria-label="Vorheriger Gegner" ${i === 0 ? 'disabled' : ''}>${ic('back')}</button>
        <div class="arena-mid"><div class="avatar" style="--bc:${bot.color}">${GJ.avatarSVG(bot.id)}</div>
          <div style="min-width:0"><div class="bname toon">${bot.name}</div><div class="btitle">${bot.title}</div>${UI.starsHTML(Math.min(3, Math.ceil(bot.stars * 3 / 5)))}
          <div class="reward">${ic('coin')} ${bot.ep}${beaten ? ` ${ic('crown')}` : ''}</div></div></div>
        <button class="btn btn-sm btn-icon btn-blue" id="bnext" aria-label="Nächster Gegner" ${i === C.bots.length - 1 ? 'disabled' : ''}>${ic('next')}</button>
      </div>
      <div class="dots">${C.bots.map((b, k) => `<span class="${k === i ? 'on' : ''} ${S.botUnlocked(k) ? '' : 'lk'}"></span>`).join('')}</div>
      ${unlocked ? '' : `<div class="lockline">${ic('lock')} Besiege zuerst ${C.bots[i - 1].name}</div>`}
      <div class="deck-chip" id="deckchip">${ic('deck')}<span class="dn">Deck: ${dk.name}</span>${v.valid ? '' : `<span style="color:var(--berry-dk)">ungültig</span>`}${ic('next')}</div>`;
    const step = k => { d.selectedBot = Math.max(0, Math.min(C.bots.length - 1, d.selectedBot + k)); S.save(); UI.renderArena(); };
    UI.tap($('#bprev'), () => step(-1));
    UI.tap($('#bnext'), () => step(1));
    UI.tap($('#deckchip'), () => UI.pickDeck());
    // Wischen
    let x0 = null;
    a.onpointerdown = e => { x0 = e.clientX; };
    a.onpointerup = e => { if (x0 != null && Math.abs(e.clientX - x0) > 50) step(e.clientX < x0 ? 1 : -1); x0 = null; };
  };
  UI.pickDeck = function () {
    const S = GJ.Save, d = S.d;
    const md = UI.modal({
      title: 'Deck wählen', closeX: true,
      html: `<div class="deck-pick">${d.decks.map((dk, i) => { const v = GJ.Deck.validate(dk.layout, true); return `<div class="dp ${i === d.activeDeck ? 'on' : ''} ${v.valid ? '' : 'bad'}" data-i="${i}">${UI.miniDeckHTML(dk.layout, 'w')}<div style="min-width:0"><div>${dk.name}</div><div style="font-size:12px;font-weight:400">${v.valid ? 'Kosten ' + v.cost + ' / ' + C.deck.budget : v.errors[0]}</div></div></div>`; }).join('')}</div>`,
      buttons: [{ label: `${ic('pencil')} Decks bearbeiten`, cls: 'btn-blue', onClick: () => UI.go('deck') }]
    });
    md.querySelectorAll('.dp').forEach(el => UI.tap(el, () => {
      const i = +el.dataset.i, v = GJ.Deck.validate(d.decks[i].layout, true);
      if (!v.valid) { UI.toast('Dieses Deck ist ungültig: ' + v.errors[0]); return; }
      d.activeDeck = i; S.save(); UI.closeModal(md); UI.renderArena();
    }));
  };
  UI.startBot = function () {
    const S = GJ.Save, d = S.d, i = d.selectedBot;
    if (!S.botUnlocked(i)) { GJ.Audio.play('deny'); UI.toast('Gesperrt. Besiege zuerst ' + C.bots[i - 1].name); return; }
    const v = GJ.Deck.validate(S.activeDeck().layout, true);
    if (!v.valid) { UI.toast('Dein Deck ist ungültig: ' + v.errors[0]); return; }
    if (d.match) {
      UI.confirm('Neues Match?', 'Dein laufendes Match wird dann beendet und zählt nicht.', 'Neues Match', () => { d.match = null; S.save(); UI.go('game', { botIdx: i, deckIdx: d.activeDeck }); });
      return;
    }
    UI.go('game', { botIdx: i, deckIdx: d.activeDeck });
  };

  // =====================================================================
  //  1 GEGEN 1 (lokal)
  // =====================================================================
  UI.screens.mp = function () {
    const S = GJ.Save, mp = S.d.mp;
    const opt = (key, list, fmt) => `<div class="seg" data-k="${key}">${list.map(v => `<button data-v="${v}" class="${mp[key] === v ? 'on' : ''}">${fmt(v)}</button>`).join('')}</div>`;
    const player = c => {
      const v = GJ.Deck.validate(mp.decks[c], false, { budget: mp.budget, free: true });
      return `<div class="panel mp-player" style="--tc:var(--team-${c})">
        <div class="hdr"><div class="team-dot">${PC().koenig.svg(c, false)}</div><input type="text" id="nm-${c}" maxlength="14" value="${mp.names[c].replace(/"/g, '&quot;')}" aria-label="Name"></div>
        <div class="row">${UI.miniDeckHTML(mp.decks[c], c)}<button class="btn btn-blue btn-sm" data-deck="${c}">${ic('pencil')} Deck</button></div>
        <div class="deck-status ${v.valid ? 'ok' : 'bad'}">${ic(v.valid ? 'check' : 'info')}<span>${v.valid ? `Bereit · ${v.count} Figuren · Kosten ${v.cost}` : v.errors[0]}</span></div></div>`;
    };
    const app = UI.shell('home', '1 gegen 1', `
      <div class="mp-grid">${player('w')}${player('b')}</div>
      <div class="panel set-list" style="padding:6px 0">
        <div class="set-row"><div>Special-Stufe<div class="desc">Gilt für alle Figuren beider Spieler</div></div>${opt('level', [1, 2, 3], v => 'Stufe ' + v)}</div>
        <div class="set-row"><div>Deck-Budget<div class="desc">Frei = baue was du willst</div></div>${opt('budget', C.mp.budgets, v => v ? v : 'Frei')}</div>
        <div class="set-row"><div>Brett drehen<div class="desc">Dreht das Brett zum Spieler am Zug</div></div><button class="switch ${mp.rotate ? 'on' : ''}" id="rot" aria-label="Brett drehen"></button></div>
      </div>
      <button class="btn btn-sun btn-lg" id="go">${ic('battle')} Los geht's!</button>`, { back: true });
    ['w', 'b'].forEach(c => {
      const inp = $('#nm-' + c);
      inp.onchange = () => { mp.names[c] = inp.value.trim() || (c === 'w' ? 'Blau' : 'Rot'); S.save(); };
    });
    app.querySelectorAll('[data-deck]').forEach(b => UI.tap(b, () => GJ.Deck.open({ mp: b.dataset.deck })));
    app.querySelectorAll('.seg').forEach(g => g.querySelectorAll('button').forEach(b => UI.tap(b, () => { mp[g.dataset.k] = +b.dataset.v; S.save(); UI.screens.mp(); })));
    UI.tap($('#rot'), () => { mp.rotate = !mp.rotate; S.save(); $('#rot').classList.toggle('on', mp.rotate); });
    UI.tap($('#go'), () => {
      for (const c of ['w', 'b']) {
        const v = GJ.Deck.validate(mp.decks[c], false, { budget: mp.budget, free: true });
        if (!v.valid) { UI.toast(`Deck von ${mp.names[c]}: ${v.errors[0]}`); return; }
      }
      UI.go('game', { mp: true });
    }, 'click');
  };

  // =====================================================================
  //  CODEX
  // =====================================================================
  UI.screens.codex = function () {
    const S = GJ.Save, d = S.d;
    const owned = GJ.NEW_TYPES.filter(t => S.owns(t)).length;
    const ups = GJ.PIECE_ORDER.reduce((a, t) => a + S.level(t), 0);
    const order = GJ.PIECE_ORDER.slice().sort((a, b) => C.rarity[PC()[a].rarity].order - C.rarity[PC()[b].rarity].order || PC()[a].index - PC()[b].index);
    const cards = order.map(t => {
      const def = PC()[t], own = S.owns(t), lvl = S.level(t), cost = S.upgradeCost(t);
      return `<div class="pcard ${own ? '' : 'unowned'}" data-t="${t}" style="--rc:${C.rarity[def.rarity].color}">${def.svg('w', own && lvl >= 3)}${own ? '' : `<span class="lk">${ic('lock')}</span>`}
        <div class="pn">${own ? def.name : '???'}</div><div class="st">${own ? UI.starsHTML(lvl) : `<span style="font-size:11px">${C.rarity[def.rarity].name}</span>`}</div>
        ${own && cost != null && cost <= d.ep ? `<span class="can-up">${ic('up')}</span>` : ''}</div>`;
    }).join('');
    const app = UI.shell('codex', 'Codex', `
      <div class="slot-pills"><span class="pill">${ic('cards')} Sammlung <b>${owned} / ${GJ.NEW_TYPES.length}</b></span><span class="pill">${ic('star')} Upgrades <b>${ups} / ${GJ.PIECE_ORDER.length * 3}</b></span></div>
      <div class="codex-grid">${cards}</div>`);
    app.querySelectorAll('.pcard').forEach(c => UI.tap(c, () => UI.pieceDetail(c.dataset.t)));
  };

  UI.diagramHTML = function (type, lvl, noLegend) {
    const def = PC()[type], mv = def.move;
    const reach = new Set((def.special && def.special.reach ? def.special.reach(Math.max(1, lvl)) : []).map(v => v[0] + ',' + v[1]));
    let h = `<div class="diagram">`;
    for (let dy = 3; dy >= -3; dy--) for (let dx = -3; dx <= 3; dx++) {
      let cls = (dx + dy) % 2 === 0 ? 'd' : 'l';
      let move = false, cap = false;
      if (!dx && !dy) { h += `<div class="dg ${cls} center">${def.svg('w', false)}</div>`; continue; }
      if (mv.pawn) {
        if (dx === 0 && (dy === 1 || dy === 2)) move = true;
        if (Math.abs(dx) === 1 && dy === 1) cap = true;
        if (mv.pawn.sideStep && Math.abs(dx) === 1 && dy === 0) move = true;
        if (mv.pawn.straightCapture && dx === 0 && dy === 1) cap = true;
      }
      if (mv.leaps && mv.leaps.some(v => v[0] === dx && v[1] === dy)) { move = true; cap = true; }
      if (mv.rides) {
        const adx = Math.abs(dx), ady = Math.abs(dy);
        if (dx === 0 || dy === 0 || adx === ady) {
          const k = Math.max(adx, ady), sx = Math.sign(dx), sy = Math.sign(dy);
          if (k <= mv.rides.max && mv.rides.dirs.some(v => v[0] === sx && v[1] === sy)) { move = true; cap = true; }
        }
      }
      if (mv.cannon && (dx === 0 || dy === 0)) { move = true; if (Math.abs(dx) + Math.abs(dy) >= 2) cap = true; }
      if (mv.extra === 'waechter' && ((Math.abs(dx) === 2 && dy === 0) || (dx === 0 && Math.abs(dy) === 2))) move = true;
      if (move && cap) cls += ' mc'; else if (move) cls += ' mv'; else if (cap) cls += ' cp';
      if (reach.has(dx + ',' + dy)) cls += ' sp';
      h += `<div class="dg ${cls}"></div>`;
    }
    h += '</div>';
    if (!noLegend) h += `<div class="legend"><span><i style="border-radius:50%;background:var(--leaf)"></i>Zug</span><span><i style="background:var(--berry);transform:rotate(45deg)"></i>nur Schlag</span><span><i style="border-radius:50%;background:var(--leaf);border-color:var(--berry)"></i>Zug + Schlag</span><span><i style="border-radius:50%;border-style:dashed;background:transparent"></i>Special</span></div>`;
    return h;
  };

  UI.pieceDetail = function (type, justUpgraded) {
    const S = GJ.Save, def = PC()[type], own = S.owns(type), lvl = S.level(type), rc = C.rarity[def.rarity];
    const cost = S.upgradeCost(type);
    const lvls = def.special.desc().map((t, i) => `<div class="lvl ${i + 1 === lvl ? 'cur' : i + 1 < lvl ? 'done' : ''} ${i + 1 > lvl ? 'off' : ''}"><span class="ln">${i + 1}</span><span>${t}</span></div>`).join('');
    let foot = '';
    if (!own) foot = `<p style="text-align:center">Gewinne diese Figur am Spielautomaten.</p>`;
    else if (cost == null) foot = `<p style="text-align:center"><b>Meisterstufe erreicht</b></p>`;
    const md = UI.modal({
      wide: true, closeX: true,
      html: `<div class="detail-top" style="--rc:${rc.color}"><div class="big">${def.svg('w', own && lvl >= 3)}${own ? UI.starsHTML(lvl) : ''}</div>
          <div style="min-width:0"><div class="toon" style="font-size:28px">${own ? def.name : '???'}</div><span class="rar-tag">${rc.name}</span>
          <div class="facts" style="margin-top:6px">Klasse ${GJ.CLASS_NAMES[def.cls]} · Wert ${def.value} · Deck-Kosten ${def.cost}</div></div></div>
        <p style="font-size:14px">${def.moveText}</p>${UI.diagramHTML(type, lvl)}
        <div class="label" style="margin-top:10px">Special: ${def.special.name}</div><div class="lvl-list">${lvls}</div>${foot}`,
      buttons: [
        ...(own ? [{ label: `${ic('target')} Ausprobieren`, cls: 'btn-blue', onClick: () => GJ.Training.open({ piece: type }) }] : []),
        ...(own && cost != null ? [{
          label: `${ic('up')} Stufe ${lvl + 1} ${ic('coin')}<span class="n">${cost}</span>`, cls: S.d.ep >= cost ? 'btn-leaf' : '', keep: true,
          onClick: btn => {
            if (S.d.ep < cost) { GJ.Audio.play('deny'); UI.toast(`Dir fehlen ${cost - S.d.ep} EP. Gewinne ein Match!`); return; }
            if (S.upgrade(type)) {
              GJ.Audio.play('upgrade'); UI.buzz(40);
              const c = FX.center(btn.closest('.modal').querySelector('.big svg'));
              FX.burst(c.x, c.y, { n: 36, colors: [rc.color, '#ffc83d', '#fff'], speed: 6, shape: 'star', size: 9, gravity: 0.15 });
              FX.pow(c.x, c.y, { color: '#ffc83d', size: 110 });
              UI.closeModal(btn.closest('.modal'));
              if (UI.current === 'codex') UI.screens.codex();
              UI.pieceDetail(type, true);
            }
          }
        }] : [])
      ]
    });
    if (justUpgraded) { const big = md.querySelector('.big svg'); FX.anim(big, [{ transform: 'scale(.6)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'cubic-bezier(.2,1.8,.4,1)' }); }
    return md;
  };

  // =====================================================================
  //  OPTIONEN
  // =====================================================================
  UI.applySettings = function () {
    const s = GJ.Save.d.settings;
    const sp = s.animSpeed === 'schnell' ? 0.45 : s.animSpeed === 'aus' ? 0.01 : 1;
    document.documentElement.style.setProperty('--speed', sp);
    document.body.classList.toggle('no-anim', s.animSpeed === 'aus');
    GJ.Audio.applyVolume();
  };
  UI.screens.settings = function () {
    const S = GJ.Save, s = S.d.settings;
    const seg = (key, opts) => `<div class="seg" data-key="${key}">${opts.map(o => `<button data-v="${o[0]}" class="${s[key] === o[0] ? 'on' : ''}">${o[1]}</button>`).join('')}</div>`;
    const sw = key => `<button class="switch ${s[key] ? 'on' : ''}" data-sw="${key}" aria-label="${key}"></button>`;
    const app = UI.shell('settings', 'Optionen', `
      <div class="panel set-list" style="padding:6px 0">
        <div class="set-row"><div>Lautstärke</div><input type="range" id="vol" min="0" max="1" step="0.05" value="${s.volume}" aria-label="Lautstärke"></div>
        <div class="set-row"><div>Ton aus</div>${sw('muted')}</div>
        <div class="set-row"><div>Vibration<div class="desc">Nur auf Android-Geräten</div></div>${sw('vibrate')}</div>
        <div class="set-row"><div>Animationen</div>${seg('animSpeed', [['normal', 'Normal'], ['schnell', 'Schnell'], ['aus', 'Aus']])}</div>
        <div class="set-row"><div>Wackeln bei Treffern</div>${sw('shake')}</div>
        <div class="set-row"><div>Brett</div>${seg('theme', [['sand', 'Sand'], ['wiese', 'Wiese'], ['eis', 'Eis']])}</div>
        <div class="set-row"><div>Koordinaten</div>${sw('coords')}</div>
        <div class="set-row"><div>Zughinweise</div>${sw('hints')}</div>
      </div>
      <div class="panel set-list" style="padding:6px 0">
        <div class="set-row"><div>Spielstand<div class="desc">Sichern oder auf ein anderes Gerät übertragen</div></div>
          <div class="tool-row"><button class="btn btn-sm" id="exp">Exportieren</button><button class="btn btn-sm" id="imp">Importieren</button></div></div>
        <div class="set-row"><div>Neu anfangen<div class="desc">Löscht EP, Figuren, Upgrades und Decks</div></div><button class="btn btn-sm btn-berry" id="rst">Zurücksetzen</button></div>
        <div class="set-row"><div>Spielanleitung</div><button class="btn btn-sm btn-blue" id="tut">Anzeigen</button></div>
        <div class="set-row"><div>Als App installieren</div><button class="btn btn-sm btn-blue" id="inst">So geht's</button></div>
      </div>
      <p style="text-align:center;color:#e6eeff;font-size:12px;font-weight:400">Schriften: Erica One, National Park (SIL Open Font License)</p>
      <input type="file" id="impf" accept=".json,application/json,text/plain" class="hidden">`);
    $('#vol').oninput = e => { s.volume = +e.target.value; S.save(); GJ.Audio.applyVolume(); };
    $('#vol').onchange = () => { GJ.Audio.init(); GJ.Audio.play('coin'); };
    app.querySelectorAll('.seg').forEach(g => g.querySelectorAll('button').forEach(b => UI.tap(b, () => {
      s[g.dataset.key] = b.dataset.v; S.save(); UI.applySettings();
      g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    })));
    app.querySelectorAll('[data-sw]').forEach(b => UI.tap(b, () => { const k = b.dataset.sw; s[k] = !s[k]; S.save(); b.classList.toggle('on', s[k]); UI.applySettings(); }));
    UI.tap($('#exp'), () => UI.exportSave());
    UI.tap($('#imp'), () => $('#impf').click());
    $('#impf').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { S.importJSON(r.result); UI.applySettings(); UI.toast('Spielstand geladen'); UI.go('home'); } catch (err) { UI.toast('Import fehlgeschlagen: ' + err.message); } };
      r.readAsText(f);
    };
    UI.tap($('#rst'), () => UI.confirm('Alles zurücksetzen?', 'Alle EP, Figuren, Upgrades und Decks gehen verloren.', 'Weiter', () => {
      UI.confirm('Wirklich alles löschen?', 'Das kann nicht rückgängig gemacht werden.', 'Endgültig löschen', () => { S.reset(); UI.applySettings(); UI.go('home'); UI.tutorial(); }, true);
    }, true));
    UI.tap($('#tut'), () => UI.tutorial());
    UI.tap($('#inst'), () => UI.installHelp());
  };
  UI.exportSave = function () {
    const txt = GJ.Save.exportJSON();
    const name = 'gambit-jackpot-spielstand.json';
    try {
      const file = new File([txt], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Gambit Jackpot Spielstand' }).catch(() => {}); return; }
    } catch (e) { /* weiter mit Download */ }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    UI.toast('Spielstand gespeichert');
  };
  UI.installHelp = function () {
    UI.modal({
      title: 'Als App installieren', closeX: true,
      html: `<p><b>iPhone und iPad:</b> In Safari öffnen, unten auf Teilen tippen, dann "Zum Home-Bildschirm".</p>
        <p><b>Android:</b> In Chrome öffnen, oben rechts auf das Menü tippen, dann "App installieren".</p>
        <p>Danach startet Gambit Jackpot vom Homescreen im Vollbild und läuft auch ohne Internet.</p>`,
      buttons: [{ label: 'Alles klar', cls: 'btn-leaf' }]
    });
  };

  // =====================================================================
  //  TUTORIAL
  // =====================================================================
  UI.tutorial = function () {
    const cards = [
      ['battle', 'Besiege die Bots', 'Spiele Schach gegen 5 Bots. Jeder Sieg bringt dir EP. Den nächsten Bot schaltest du frei, indem du den vorherigen besiegst.'],
      ['slot', 'Dreh am Automaten', 'Mit EP drehst du am Spielautomaten. Zeigen alle 3 Walzen dieselbe Figur, gehört sie dir. 12 neue Figuren warten.'],
      ['deck', 'Bau dein Deck', 'Stell deine Figuren frei auf deinen zwei Startreihen auf. Ein Punktebudget sorgt für Balance, ein König ist Pflicht.'],
      ['bolt', 'Specials', 'Im Codex upgradest du jede Figur. Ab Stufe 1 hat sie eine Spezialattacke. Jeder Figurentyp darf sie einmal pro Match einsetzen.'],
      ['duel', '1 gegen 1', 'Spiel auf einem Gerät gegen Freunde. Dort sind alle Figuren frei, baut euch die verrücktesten Decks.']
    ];
    let i = 0;
    const md = UI.modal({ cls: 'tut', persistent: true, html: '<div id="tut-body"></div>', buttons: [] });
    const render = () => {
      const c = cards[i];
      md.querySelector('#tut-body').innerHTML = `<div class="tut-ic">${ic(c[0])}</div><div class="toon" style="font-size:26px">${c[1]}</div><p>${c[2]}</p>
        <div class="dots" style="margin:10px 0">${cards.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div>
        <div class="modal-actions">${i ? '<button class="btn" id="tb">Zurück</button>' : ''}<button class="btn btn-sun" id="tn">${i === cards.length - 1 ? "Los geht's" : 'Weiter'}</button></div>`;
      const tb = md.querySelector('#tb'); if (tb) UI.tap(tb, () => { i--; render(); });
      UI.tap(md.querySelector('#tn'), () => {
        if (i < cards.length - 1) { i++; render(); }
        else { GJ.Save.d.tutorialDone = true; GJ.Save.save(); UI.closeModal(md); }
      });
    };
    render();
  };
})();
