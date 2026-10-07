/* =====================================================================
   GAMBIT JACKPOT - deck.js
   Deck-Editor und Deck-Prüfung. Zwei Modi:
   - normal: deine 5 Decks, nur freigeschaltete Figuren, Budget 40
   - 1 gegen 1: alle 18 Figuren, Budget frei wählbar, keine Exemplar-Limits
   Bedienung: Karte antippen, dann Feld antippen. Mit Maus auch Ziehen.
   Figuren auf dem Brett lassen sich ziehen/tauschen, raus ziehen = entfernen.
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  const C = GJ.CONFIG;
  const PC = () => GJ.PIECES;
  const D = GJ.Deck = {};
  const ic = (n, c) => GJ.icon(n, c);
  const FILES = 'abcdefgh';

  // ---------------- Validierung ----------------
  // opts: { budget (0 = kein Limit), free (keine Exemplar-Limits) }
  D.validate = function (layout, checkOwned, opts) {
    opts = opts || {};
    const budget = opts.budget != null ? opts.budget : C.deck.budget;
    const errors = [], hints = [];
    let cost = 0, value = 0, count = 0;
    const counts = {}, royals = [];
    for (const n in layout) {
      const t = layout[n];
      const def = PC()[t];
      if (!def) { errors.push('Unbekannte Figur auf ' + n); continue; }
      if (checkOwned && !GJ.Save.owns(t)) errors.push(def.name + ' ist nicht freigeschaltet');
      cost += def.cost; value += def.value; count++;
      counts[t] = (counts[t] || 0) + 1;
      if (def.royal) royals.push(n);
    }
    if (!royals.length) errors.push('Kein König im Deck (König, Wächter oder Kaiser)');
    if (royals.length > 1) errors.push('Nur ein König erlaubt');
    if (budget && cost > budget) errors.push(`Budget um ${cost - budget} überschritten`);
    if (!opts.free) for (const t in counts) {
      const max = C.deck.maxCopies[PC()[t].rarity];
      if (counts[t] > max) errors.push(`${PC()[t].name} höchstens ${max}x`);
    }
    const isCls = (n, c) => layout[n] && PC()[layout[n]] && PC()[layout[n]].cls === c;
    if (!isCls('e1', 'koenig')) hints.push('Keine Rochade: auf e1 steht kein König');
    else {
      if (!isCls('h1', 'turm')) hints.push('Keine kurze Rochade: auf h1 fehlt die Turm-Klasse');
      if (!isCls('a1', 'turm')) hints.push('Keine lange Rochade: auf a1 fehlt die Turm-Klasse');
    }
    if (FILES.split('').some(f => isCls(f + '1', 'bauer'))) hints.push('Bauern auf Reihe 1 haben keinen Doppelschritt');
    const types = GJ.PIECE_ORDER.filter(t => counts[t]);
    return { valid: !errors.length, errors, hints, cost, value, count, counts, types, budget };
  };

  // ---------------- Editor-Zustand ----------------
  let ED = null;
  const isMP = () => ED && ED.mp;
  function layout() { return isMP() ? GJ.Save.d.mp.decks[ED.mp] : GJ.Save.d.decks[ED.idx].layout; }
  function setLayout(l) { if (isMP()) GJ.Save.d.mp.decks[ED.mp] = l; else GJ.Save.d.decks[ED.idx].layout = l; }
  function vopts() { return isMP() ? { budget: GJ.Save.d.mp.budget, free: true } : {}; }
  function owns(t) { return isMP() || GJ.Save.owns(t); }
  function lvl(t) { return isMP() ? GJ.Save.d.mp.level : GJ.Save.level(t); }
  function color() { return isMP() ? ED.mp : 'w'; }
  function snapshot() { ED.undo.push(JSON.stringify(layout())); if (ED.undo.length > 80) ED.undo.shift(); ED.redo = []; }
  function commit(sound) { GJ.Save.save(); D.renderBoard(); D.renderInfo(); D.renderCollection(); if (sound) GJ.Audio.play(sound); }

  D.place = function (type, name, fromName) {
    const L = layout();
    const def = PC()[type];
    if (!isMP()) {
      const v = D.validate(L);
      const already = (v.counts[type] || 0) - (L[name] === type ? 1 : 0);
      const max = C.deck.maxCopies[def.rarity];
      if (!fromName && already >= max) { GJ.Audio.play('deny'); GJ.UI.toast(`${def.name}: höchstens ${max}x pro Deck`); return false; }
    }
    snapshot();
    if (fromName) {
      const other = L[name];
      L[name] = type;
      if (other) L[fromName] = other; else delete L[fromName];
    } else {
      if (def.royal) for (const n in L) if (n !== name && PC()[L[n]].royal) { delete L[n]; GJ.UI.toast('Nur ein König erlaubt, der alte ist raus'); }
      L[name] = type;
    }
    ED.pop = name;
    GJ.UI.buzz(10);
    commit('move');
    return true;
  };
  D.clearSq = function (name) {
    const L = layout();
    if (!L[name]) return;
    snapshot();
    delete L[name];
    commit('pop');
  };

  // opts: { mp: 'w'|'b' } für 1 gegen 1
  D.open = function (opts) {
    opts = opts || {};
    const S = GJ.Save;
    GJ.UI.current = 'deck';
    ED = { mp: opts.mp || null, idx: S.d.activeDeck, undo: [], redo: [], hand: null, handFrom: null, fCls: 'all', fRar: 'all', sort: 'cost', pop: null };
    const title = isMP() ? 'Deck: ' + S.d.mp.names[ED.mp] : 'Deck';
    const body = `
      ${isMP() ? '' : '<div class="deck-tabs" id="tabs"></div>'}
      <div id="budget"></div>
      <div><div class="deck-ghost" id="ghost"></div><div class="deck-board" id="dboard"></div></div>
      <div id="dinfo" style="display:flex;flex-direction:column;gap:10px"></div>
      <div class="coll-bar">
        <select id="fcls" aria-label="Klasse"><option value="all">Alle Klassen</option>${Object.keys(GJ.CLASS_NAMES).map(k => `<option value="${k}">${GJ.CLASS_NAMES[k]}</option>`).join('')}</select>
        <select id="frar" aria-label="Seltenheit"><option value="all">Alle Seltenheiten</option>${Object.keys(C.rarity).map(k => `<option value="${k}">${C.rarity[k].name}</option>`).join('')}</select>
        <select id="fsort" aria-label="Sortierung"><option value="cost">Nach Kosten</option><option value="rarity">Nach Seltenheit</option><option value="cls">Nach Klasse</option></select>
      </div>
      <div class="collection" id="coll"></div>`;
    if (isMP()) {
      const app = document.getElementById('app');
      app.innerHTML = `<div class="screen">${GJ.UI.topbarHTML(title, true)}<div class="main"><div class="wrap">${body}<button class="btn btn-sun btn-lg" id="done">${ic('check')} Fertig</button></div></div></div>`;
      GJ.UI.bindTopbar(app, () => GJ.UI.go('mp'));
      GJ.UI.tap(document.getElementById('done'), () => GJ.UI.go('mp'));
    } else GJ.UI.shell('deck', title, body);
    let gh = '';
    for (let r = 5; r >= 3; r--) for (let f = 0; f < 8; f++) gh += `<div style="background:${(f + r) % 2 ? '#cf9452' : '#f6e3b4'}"></div>`;
    document.getElementById('ghost').innerHTML = gh;
    document.getElementById('fcls').onchange = e => { ED.fCls = e.target.value; D.renderCollection(); };
    document.getElementById('frar').onchange = e => { ED.fRar = e.target.value; D.renderCollection(); };
    document.getElementById('fsort').onchange = e => { ED.sort = e.target.value; D.renderCollection(); };
    document.onkeydown = e => {
      if (!(e.ctrlKey || e.metaKey)) { if (e.key === 'Escape') D.setHand(null); return; }
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); D.undo(); }
      if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); D.redo(); }
    };
    D.bindBoard();
    D.renderAll();
  };
  GJ.UI = GJ.UI || {}; GJ.UI.screens = GJ.UI.screens || {};
  GJ.UI.screens.deck = () => D.open();

  D.renderAll = function () { D.renderTabs(); D.renderBoard(); D.renderInfo(); D.renderCollection(); };
  D.undo = function () { if (!ED.undo.length) return; ED.redo.push(JSON.stringify(layout())); setLayout(JSON.parse(ED.undo.pop())); commit('click'); };
  D.redo = function () { if (!ED.redo.length) return; ED.undo.push(JSON.stringify(layout())); setLayout(JSON.parse(ED.redo.pop())); commit('click'); };

  D.renderTabs = function () {
    const t = document.getElementById('tabs');
    if (!t) return;
    const S = GJ.Save;
    t.innerHTML = '';
    S.d.decks.forEach((dk, i) => {
      const v = D.validate(dk.layout, true);
      const b = document.createElement('button');
      b.className = 'deck-tab' + (i === ED.idx ? ' cur' : '');
      b.innerHTML = `<span>${dk.name}</span>${i === S.d.activeDeck ? ic('check') : ''}${v.valid ? '' : ic('info')}`;
      GJ.UI.tap(b, () => { if (ED.idx === i) { D.rename(); return; } ED.idx = i; ED.undo = []; ED.redo = []; ED.hand = null; ED.handFrom = null; D.renderAll(); });
      t.appendChild(b);
    });
  };
  D.rename = function () {
    const dk = GJ.Save.d.decks[ED.idx];
    const md = GJ.UI.modal({
      title: 'Deck umbenennen', html: `<input type="text" id="dname" maxlength="20" value="${dk.name.replace(/"/g, '&quot;')}" aria-label="Name">`,
      buttons: [{ label: 'Abbrechen' }, { label: 'Speichern', cls: 'btn-leaf', onClick: () => { const v = md.querySelector('#dname').value.trim(); if (v) { dk.name = v; GJ.Save.save(); D.renderTabs(); } } }]
    });
    setTimeout(() => { const i = md.querySelector('#dname'); i.focus(); i.select(); }, 60);
  };

  D.renderBoard = function () {
    const L = layout(), b = document.getElementById('dboard');
    const coords = GJ.Save.d.settings.coords, col = color();
    let h = '';
    for (const r of [2, 1]) for (let f = 0; f < 8; f++) {
      const n = FILES[f] + r, t = L[n];
      h += `<div class="dsq ${(f + r) % 2 ? 'd' : 'l'} ${ED.hand ? 'hand-target' : ''} ${ED.handFrom === n ? 'from-sel' : ''}" data-n="${n}">${t ? `<div class="dpc ${ED.pop === n ? 'pop' : ''}" data-n="${n}">${PC()[t].svg(col, lvl(t) >= 3)}</div>` : ''}${coords && r === 1 ? `<span class="coord f">${FILES[f]}</span>` : ''}${coords && f === 0 ? `<span class="coord r">${r}</span>` : ''}</div>`;
    }
    b.innerHTML = h;
    b.querySelectorAll('.dpc').forEach(el => D.bindDrag(el, { type: L[el.dataset.n], from: el.dataset.n }));
    ED.pop = null;
  };

  D.renderInfo = function () {
    const S = GJ.Save, L = layout();
    const v = D.validate(L, !isMP(), vopts());
    const B = v.budget;
    const bud = document.getElementById('budget');
    if (B) {
      const pct = Math.min(100, v.cost / B * 100);
      bud.innerHTML = `<div class="budget-bar ${v.cost > B ? 'over' : v.cost >= B - 2 ? 'warn' : ''}"><div class="budget-fill" style="width:${pct}%"></div><div class="budget-txt">Kosten ${v.cost} / ${B}</div></div>`;
    } else bud.innerHTML = `<div class="budget-bar"><div class="budget-fill" style="width:100%;background:var(--blue)"></div><div class="budget-txt">Kein Limit · Kosten ${v.cost}</div></div>`;
    const chips = v.types.map(t => {
      const def = PC()[t], l = lvl(t);
      return `<span class="sp-chip ${l ? '' : 'off'}">${def.svg(color(), false)}${def.special.name}</span>`;
    }).join('');
    const active = !isMP() && S.d.activeDeck === ED.idx;
    document.getElementById('dinfo').innerHTML = `
      <div class="deck-status ${v.valid ? 'ok' : 'bad'}">${ic(v.valid ? 'check' : 'info')}<span>${v.valid ? `Deck bereit · ${v.count} Figuren · ${v.types.length} Specials` : v.errors.join('<br>')}</span></div>
      ${v.hints.length ? `<div class="deck-hints">${v.hints.join('<br>')}</div>` : ''}
      <div class="tool-row">
        <button class="btn btn-sm btn-icon" id="b-und" aria-label="Rückgängig" ${ED.undo.length ? '' : 'disabled'}>${ic('undo')}</button>
        <button class="btn btn-sm btn-icon" id="b-red" aria-label="Wiederholen" ${ED.redo.length ? '' : 'disabled'}>${ic('redo')}</button>
        <button class="btn btn-sm btn-icon" id="b-clr" aria-label="Leeren">${ic('trash')}</button>
        <button class="btn btn-sm grow" id="b-std">Klassisch</button>
        ${isMP() ? '' : `<button class="btn btn-sm btn-icon" id="b-dup" aria-label="Kopieren">${ic('copy')}</button>
        <button class="btn btn-sm btn-icon" id="b-ren" aria-label="Umbenennen">${ic('pencil')}</button>
        <button class="btn btn-sm btn-icon btn-blue" id="b-sbx" aria-label="Ausprobieren" ${v.valid ? '' : 'disabled'}>${ic('target')}</button>
        <button class="btn btn-sm grow ${active ? '' : 'btn-leaf'}" id="b-act" ${active ? 'disabled' : ''}>${active ? 'Aktiv' : 'Benutzen'}</button>`}
      </div>
      ${chips ? `<div class="sp-chips">${chips}</div>` : ''}`;
    const on = (id, fn) => { const e = document.getElementById(id); if (e) GJ.UI.tap(e, fn); };
    on('b-act', () => { S.d.activeDeck = ED.idx; S.save(); GJ.Audio.play('upgrade'); GJ.UI.toast('Dein Kampf-Deck: ' + S.d.decks[ED.idx].name); D.renderTabs(); D.renderInfo(); });
    on('b-std', () => { snapshot(); setLayout(Object.assign({}, C.CLASSIC_DECK)); commit('move'); });
    on('b-clr', () => { snapshot(); setLayout({}); commit('pop'); });
    on('b-dup', () => D.duplicate());
    on('b-ren', () => D.rename());
    on('b-und', () => D.undo());
    on('b-red', () => D.redo());
    on('b-sbx', () => GJ.Training.open({ white: Object.assign({}, L), black: Object.assign({}, C.CLASSIC_DECK) }));
    D.renderTabs();
  };

  D.duplicate = function () {
    const S = GJ.Save, cur = S.d.decks[ED.idx];
    const md = GJ.UI.modal({
      title: 'Deck kopieren', closeX: true,
      html: `<p>Wohin soll "${cur.name}" kopiert werden? Das Deck dort wird ersetzt.</p><div class="choice-list">${S.d.decks.map((dk, i) => i === ED.idx ? '' : `<button class="btn btn-sm" data-i="${i}">${dk.name}</button>`).join('')}</div>`
    });
    md.querySelectorAll('[data-i]').forEach(c => GJ.UI.tap(c, () => {
      const i = +c.dataset.i;
      S.d.decks[i] = { name: cur.name + ' 2', layout: Object.assign({}, cur.layout) };
      S.save(); GJ.UI.closeModal(md); ED.idx = i; ED.undo = []; ED.redo = []; GJ.UI.toast('Deck kopiert'); D.renderAll();
    }));
  };

  D.renderCollection = function () {
    const L = layout();
    const v = D.validate(L, false, vopts());
    let list = GJ.PIECE_ORDER.slice();
    if (ED.fCls !== 'all') list = list.filter(t => PC()[t].cls === ED.fCls);
    if (ED.fRar !== 'all') list = list.filter(t => PC()[t].rarity === ED.fRar);
    const rk = t => C.rarity[PC()[t].rarity].order;
    const ck = t => Object.keys(GJ.CLASS_NAMES).indexOf(PC()[t].cls);
    list.sort((a, b) => (owns(b) - owns(a)) || (ED.sort === 'cost' ? PC()[a].cost - PC()[b].cost : ED.sort === 'rarity' ? rk(a) - rk(b) : ck(a) - ck(b)) || PC()[a].index - PC()[b].index);
    const coll = document.getElementById('coll');
    coll.innerHTML = '';
    for (const t of list) {
      const def = PC()[t], own = owns(t), l = lvl(t);
      const max = isMP() ? 99 : C.deck.maxCopies[def.rarity], used = v.counts[t] || 0;
      const c = document.createElement('div');
      c.className = 'ccard' + (own ? '' : ' locked') + (own && used >= max ? ' limit' : '') + (ED.hand === t && !ED.handFrom ? ' in-hand' : '');
      c.style.setProperty('--rc', C.rarity[def.rarity].color);
      c.innerHTML = `<div class="cc-cost">${def.cost}</div>${def.svg(color(), own && l >= 3)}<div class="cc-name">${own ? def.name : '???'}</div>${used ? `<div class="cc-n">${used}x</div>` : ''}${own ? '' : `<div style="position:absolute;top:30%;left:50%;width:30px;margin-left:-15px">${ic('lock')}</div>`}`;
      if (own) D.bindDrag(c, { type: t });
      else c.onclick = () => { GJ.Audio.play('deny'); GJ.UI.toast('Gewinne diese Figur zuerst am Automaten'); };
      coll.appendChild(c);
    }
  };

  D.setHand = function (type, from) {
    if (!ED) return;
    ED.hand = type; ED.handFrom = from || null;
    D.renderBoard(); D.renderCollection();
    if (type && !from) GJ.UI.toast('Tippe auf ein Feld, um ' + PC()[type].name + ' zu setzen', 1600);
  };

  // ---------------- Ziehen & Tippen ----------------
  function sqAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const s = el && el.closest && el.closest('.dsq');
    return s ? s.dataset.n : null;
  }
  function overBoard(x, y) {
    const b = document.getElementById('dboard');
    if (!b) return false;
    const r = b.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  function tapped(src) {
    if (src.from) {
      if (ED.hand && !ED.handFrom) { D.place(ED.hand, src.from); return; }
      if (ED.handFrom === src.from) { D.setHand(null); return; }
      if (ED.handFrom) { D.place(ED.hand, src.from, ED.handFrom); ED.hand = null; ED.handFrom = null; D.renderBoard(); D.renderCollection(); return; }
      GJ.Audio.play('select');
      D.setHand(src.type, src.from);
    } else {
      GJ.Audio.play('select');
      D.setHand(ED.hand === src.type && !ED.handFrom ? null : src.type);
    }
  }
  // src: { type } aus der Sammlung oder { type, from } vom Brett
  D.bindDrag = function (el, src) {
    // Auf Touch-Geräten scrollt die Sammlung, Karten werden angetippt
    if (!src.from) {
      el.addEventListener('click', () => { GJ.Audio.init(); if (!el._dragged) tapped(src); el._dragged = false; });
    }
    el.addEventListener('pointerdown', e => {
      if (e.button === 2) return;
      if (!src.from && e.pointerType !== 'mouse') return;
      GJ.Audio.init();
      e.preventDefault();
      const start = { x: e.clientX, y: e.clientY };
      let ghost = null, hoverN = null;
      const mv = ev => {
        if (!ghost && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 8) {
          ghost = document.createElement('div');
          ghost.className = 'drag-ghost';
          ghost.innerHTML = PC()[src.type].svg(color(), lvl(src.type) >= 3);
          document.body.appendChild(ghost);
          if (src.from) { const p = document.querySelector(`.dpc[data-n="${src.from}"]`); if (p) p.style.opacity = 0.3; }
        }
        if (ghost) {
          ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
          const n = sqAt(ev.clientX, ev.clientY);
          if (n !== hoverN) {
            document.querySelectorAll('.dsq.hover').forEach(s => s.classList.remove('hover'));
            hoverN = n;
            if (n) { const s = document.querySelector(`.dsq[data-n="${n}"]`); if (s) s.classList.add('hover'); }
          }
        }
      };
      const up = ev => {
        window.removeEventListener('pointermove', mv);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        document.querySelectorAll('.dsq.hover').forEach(s => s.classList.remove('hover'));
        if (ghost) {
          ghost.remove();
          el._dragged = true;
          const n = sqAt(ev.clientX, ev.clientY);
          ED.hand = null; ED.handFrom = null;
          if (n) { if (n !== src.from) D.place(src.type, n, src.from); else D.renderBoard(); }
          else if (src.from && !overBoard(ev.clientX, ev.clientY)) D.clearSq(src.from);
          else { D.renderBoard(); D.renderCollection(); }
        } else if (src.from) tapped(src);
      };
      window.addEventListener('pointermove', mv);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  };

  D.bindBoard = function () {
    const b = document.getElementById('dboard');
    b.addEventListener('contextmenu', e => {
      e.preventDefault();
      const s = e.target.closest('.dsq');
      if (s) D.clearSq(s.dataset.n);
    });
    b.addEventListener('click', e => {
      const s = e.target.closest('.dsq');
      if (!s || e.target.closest('.dpc')) return;
      const n = s.dataset.n;
      if (ED.hand && ED.handFrom) { D.place(ED.hand, n, ED.handFrom); ED.hand = null; ED.handFrom = null; D.renderBoard(); D.renderCollection(); }
      else if (ED.hand) D.place(ED.hand, n);
    });
  };
})();
