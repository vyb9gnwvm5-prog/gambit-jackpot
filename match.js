/* =====================================================================
   GAMBIT JACKPOT - match.js
   Match-Ablauf: Spielbildschirm, Eingabe, Specials-Auswahl, Bot-Züge,
   1 gegen 1 auf einem Gerät, Trainingsplatz, Ergebnis und EP.
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  const E = GJ.E, FX = GJ.FX, C = GJ.CONFIG;
  const PC = () => GJ.PIECES;
  const ic = (n, c) => GJ.icon(n, c);

  // ---------------- Avatare der Bots ----------------
  GJ.avatarSVG = function (id) {
    const O = 'stroke="#14203d" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';
    const face = (skin, extra) => `<path d="M14 100 Q14 70 50 70 Q86 70 86 100 Z" fill="#14203d" opacity=".25"/><circle cx="50" cy="58" r="25" fill="${skin}" ${O}/><circle cx="41" cy="57" r="3.6" fill="#14203d"/><circle cx="59" cy="57" r="3.6" fill="#14203d"/><circle cx="42.2" cy="55.8" r="1.2" fill="#fff"/><circle cx="60.2" cy="55.8" r="1.2" fill="#fff"/>${extra}`;
    const A = {
      bernd: face('#ffd2a6', `<path d="M41 68 Q50 75 59 68" fill="none" ${O}/><ellipse cx="50" cy="36" rx="36" ry="9" fill="#ffd23f" ${O}/><path d="M31 35 Q50 6 69 35 Z" fill="#ffd23f" ${O}/><rect x="32" y="27" width="36" height="6" fill="#ff5d4f" ${O}/><circle cx="36" cy="66" r="4" fill="#ff9f8f"/><circle cx="64" cy="66" r="4" fill="#ff9f8f"/>`),
      rosa: face('#ffe0d0', `<path d="M43 69 Q50 73 57 69" fill="none" ${O}/><path d="M23 56 Q22 24 50 22 Q78 24 77 56 L71 56 Q70 36 50 34 Q30 36 29 56 Z" fill="#c9d2e3" ${O}/><path d="M50 22 Q60 2 82 8 Q68 14 60 24 Z" fill="#ff6fa8" ${O}/><rect x="47" y="32" width="6" height="24" rx="2" fill="#9aa6c2" ${O}/>`),
      grimm: face('#f0c49a', `<path d="M40 70 H60" ${O}/><path d="M35 50 L46 52 M65 50 L54 52" ${O}/><path d="M37 66 Q50 61 63 66" fill="none" stroke="#14203d" stroke-width="6" stroke-linecap="round"/><path d="M21 42 Q50 14 79 42 Z" fill="#3d74e0" ${O}/><rect x="18" y="40" width="64" height="8" rx="3" fill="#1d3f8f" ${O}/><circle cx="50" cy="31" r="5" fill="#ffd23f" ${O}/>`),
      morgana: face('#c6f0a8', `<path d="M42 69 Q50 75 58 67" fill="none" ${O}/><path d="M50 2 C58 12 64 24 74 36 H26 C36 26 44 14 50 2 Z" fill="#7b4bd1" ${O}/><ellipse cx="50" cy="37" rx="36" ry="7" fill="#7b4bd1" ${O}/><path d="M56 16 a5 5 0 1 0 3 8 a4 4 0 1 1 -3 -8z" fill="#ffd23f"/>`),
      spiegel: `<ellipse cx="50" cy="54" rx="31" ry="38" fill="#bfe9ff" ${O}/><ellipse cx="50" cy="54" rx="23" ry="30" fill="#e6f7ff" stroke="#14203d" stroke-width="2.5"/><path d="M36 34 L46 28 M34 44 L52 32" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="42" cy="56" r="3.6" fill="#14203d"/><circle cx="58" cy="56" r="3.6" fill="#14203d"/><path d="M42 68 Q50 73 58 68" fill="none" ${O}/>`
    };
    return `<svg viewBox="0 0 100 100">${A[id] || A.bernd}</svg>`;
  };

  // ---------------- Hilfen ----------------
  function botDeck(bot) {
    if (bot.deck === 'CLASSIC') return Object.assign({}, C.CLASSIC_DECK);
    if (bot.deck === 'MIRROR') return Object.assign({}, GJ.Save.activeDeck().layout);
    return Object.assign({}, bot.deck);
  }
  function botLevels(bot) {
    if (bot.levels === 'MIRROR') return GJ.Save.playerLevels();
    return Object.assign({}, bot.levels);
  }
  function promoFrom(types) {
    const set = new Set(['dame', 'turm', 'laeufer', 'springer']);
    types.forEach(t => { if (PC()[t] && ['dame', 'turm', 'laeufer', 'springer'].includes(PC()[t].cls)) set.add(t); });
    return [...set].sort((a, b) => PC()[b].value - PC()[a].value);
  }
  GJ.botDeck = botDeck;
  GJ.hlColor = r => (r === 'standard' ? '#ffc83d' : C.rarity[r].color);
  const TEAM = { w: '#4f9cf5', b: '#ff5d4f' };

  const M = GJ.Match = {};
  M.REASONS = { matt: 'Schachmatt', patt: 'Patt', '50zuege': '50-Züge-Regel', wiederholung: 'Dreifache Wiederholung', material: 'Zu wenig Material', aufgabe: 'Aufgabe', remis: 'Remis vereinbart' };

  // opts: { botIdx, deckIdx } | { resume } | { mp } | { training: {white, black, levels} }
  M.start = function (opts) {
    const S = GJ.Save;
    M.gen = (M.gen || 0) + 1;
    M.over = false; M.busy = false; M.aborted = false; M.ui = { mode: 'idle' }; M.lastMove = null; M.snapshots = [];
    M.mode = opts.mp ? 'mp' : opts.training ? 'training' : 'bot';
    M.bot = null;
    if (opts.resume && S.d.match) {
      const sm = S.d.match;
      M.botIdx = C.bots.findIndex(b => b.id === sm.botId);
      M.bot = C.bots[M.botIdx];
      M.setup = sm.setup;
      M.st = E.deserialize(sm.state);
      M.mode = 'bot';
      const h = M.st.history[M.st.history.length - 1];
      if (h) M.lastMove = [h.from, h.to];
    } else if (opts.mp) {
      const mp = S.d.mp, lv = {};
      GJ.PIECE_ORDER.forEach(t => (lv[t] = mp.level));
      const promo = promoFrom(GJ.PIECE_ORDER);
      M.setup = { white: Object.assign({}, mp.decks.w), black: Object.assign({}, mp.decks.b), levels: { w: lv, b: Object.assign({}, lv) }, promo: { w: promo, b: promo }, names: Object.assign({}, mp.names), rotate: mp.rotate };
      M.st = E.newGame(M.setup);
    } else if (opts.training) {
      const tr = opts.training, promo = promoFrom(GJ.PIECE_ORDER);
      M.setup = { white: tr.white, black: tr.black, levels: tr.levels, promo: { w: promo, b: promo }, names: { w: 'Blau', b: 'Rot' } };
      M.st = E.newGame(Object.assign({}, M.setup, { unlimitedSpecials: true }));
    } else {
      M.botIdx = opts.botIdx;
      M.bot = C.bots[opts.botIdx];
      const deckIdx = opts.deckIdx != null ? opts.deckIdx : S.d.activeDeck;
      const white = Object.assign({}, S.d.decks[deckIdx].layout);
      const black = botDeck(M.bot);
      M.setup = { white, black, deckIdx, botId: M.bot.id, levels: { w: S.playerLevels(), b: botLevels(M.bot) }, promo: { w: S.promoOptions(), b: promoFrom(Object.values(black)) } };
      M.st = E.newGame(M.setup);
      S.d.stats.games++;
      S.save();
    }
    M.build();
    M.view.render(M.st, { mine: M.human() });
    M.saveMatch();
    M.next(true);
  };

  M.human = function () { return M.mode === 'bot' ? 'w' : M.st.turn; };
  M.isHumanTurn = function () { return !M.over && (M.mode !== 'bot' || M.st.turn === 'w'); };
  M.nameOf = function (c) {
    if (M.mode === 'bot') return c === 'w' ? 'Du' : M.bot.name;
    return (M.setup.names && M.setup.names[c]) || (c === 'w' ? 'Blau' : 'Rot');
  };
  M.flipFor = function () { return M.mode === 'mp' && M.setup.rotate && M.st.turn === 'b'; };

  // ---------------- Bildschirm ----------------
  M.build = function () {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="screen game" id="game">
      <div class="game-stage">
        <div class="board-area" id="board-area"><div id="board-host"></div></div>
        <div class="side">
          <div class="bar" id="bar-top"></div>
          <div class="panel movebox"><div class="label">Züge</div><div class="movelist" id="movelist"></div></div>
          <div class="bar" id="bar-me"></div>
          <div class="sp-act hidden" id="sp-act"></div>
          <div class="sp-bar" id="sp-bar"></div>
        </div>
      </div></div>`;
    M.view = GJ.Board.create(document.getElementById('board-host'), {
      canDrag: sq => M.canDrag(sq),
      onClick: sq => M.onClick(sq),
      onDrop: (a, b) => M.onDrop(a, b),
      onHover: sq => M.onHover(sq),
      onRightClick: () => M.cancelSpecial()
    });
    M.view.setFlipped(M.flipFor());
    M.fit();
    window.onresize = () => { if (GJ.UI.current === 'game') M.fit(); };
    document.onkeydown = e => { if (e.key === 'Escape') M.cancelSpecial(); };
  };
  M.fit = function () {
    const g = document.getElementById('game');
    if (!g) return;
    const W = window.innerWidth, H = window.innerHeight;
    g.classList.toggle('wide', W >= 760 && W / H > 1.15);
    const area = document.getElementById('board-area'), host = document.getElementById('board-host');
    host.style.width = '0px';
    const r = area.getBoundingClientRect();
    const size = Math.floor(Math.max(200, Math.min(r.width, r.height)));
    host.style.width = size + 'px';
  };

  M.leave = function () {
    if (M.mode !== 'bot' || M.over) { M.cleanup(); GJ.UI.go(M.mode === 'mp' ? 'mp' : 'home'); return; }
    M.cleanup();
    GJ.UI.go('home');
  };
  M.cleanup = function () { document.onkeydown = null; window.onresize = null; M.aborted = true; };

  // ---------------- Pause-Menü ----------------
  M.pause = function () {
    GJ.Audio.init();
    const s = GJ.Save.d.settings;
    const btns = [];
    if (!M.over) {
      if (M.mode === 'training') btns.push(['undo', 'Zug zurück', '', () => M.undo()], ['refresh', 'Specials auffüllen', '', () => { M.st.specialsUsed = { w: [], b: [] }; M.next(); }]);
      else btns.push(['draw', 'Remis anbieten', '', () => M.offerDraw()], ['flag', 'Aufgeben', 'btn-berry', () => M.resign()]);
    }
    btns.push(['codex', 'Zugliste', '', () => M.showMoves()]);
    btns.push([s.muted ? 'soundOff' : 'soundOn', s.muted ? 'Ton an' : 'Ton aus', '', () => { s.muted = !s.muted; GJ.Save.save(); GJ.Audio.applyVolume(); }]);
    btns.push(['home', M.mode === 'bot' && !M.over ? 'Pause: zum Menü' : 'Zum Menü', 'btn-blue', () => M.leave()]);
    const md = GJ.UI.modal({
      title: 'Pause',
      html: `<div style="display:flex;flex-direction:column;gap:10px">${btns.map((b, i) => `<button class="btn ${b[2]}" data-i="${i}">${ic(b[0])} ${b[1]}</button>`).join('')}</div>
        ${M.mode === 'bot' && !M.over ? '<p style="text-align:center;font-size:13px">Dein Match wird gespeichert und kann im Menü fortgesetzt werden.</p>' : ''}`,
      buttons: [{ label: `${ic('play')} Weiterspielen`, cls: 'btn-leaf' }]
    });
    md.querySelectorAll('[data-i]').forEach(b => GJ.UI.tap(b, () => { GJ.UI.closeModal(md); btns[+b.dataset.i][3](); }));
  };
  M.showMoves = function () {
    GJ.UI.modal({ title: 'Zugliste', closeX: true, html: `<div class="movelist" style="max-height:60vh">${M.movesHTML()}</div>`, buttons: [] });
  };

  // ---------------- Ablauf ----------------
  M.next = function (first) {
    if (M.aborted && !first) return;
    const { moves, result } = E.status(M.st);
    M.legal = moves;
    if (result) { M.refresh(); M.finish(result); return; }
    M.refresh();
    if (M.mode === 'bot' && M.st.turn === 'b') { M.botTurn(); return; }
    if (moves.length === 1 && moves[0].kind === 'pass') {
      M.busy = true;
      GJ.UI.banner({ title: 'Eingefroren!', sub: M.nameOf(M.st.turn) + ' muss aussetzen', color: '#9fd8ff', icon: 'snow' });
      const g = M.gen;
      setTimeout(() => { if (g === M.gen && !M.aborted) M.execute(moves[0]); }, 1300 * (FX.speed() || 0.3));
      return;
    }
    M.busy = false;
  };

  M.botTurn = async function () {
    const g = M.gen;
    M.busy = true;
    M.renderBars(true);
    await FX.rawSleep(60);
    if (M.aborted || g !== M.gen) return;
    const t0 = Date.now();
    const r = GJ.AI.think(M.st, M.bot);
    const wait = C.ai.minShowMs - (Date.now() - t0);
    if (wait > 0) await FX.rawSleep(wait);
    if (M.aborted || g !== M.gen || !r) return;
    await M.execute(r.move);
  };

  M.execute = async function (m) {
    const g = M.gen;
    M.busy = true;
    M.ui = { mode: 'idle' };
    M.showAct(false);
    M.view.marks({ last: M.lastMove });
    const st = M.st, color = st.turn;
    if (M.mode === 'training') M.snapshots.push(E.serialize(st));
    const san = E.san(st, m);
    if (m.kind === 'special') {
      const def = PC()[m.stype];
      GJ.UI.banner({ title: def.special.name, sub: M.nameOf(color) + ' · ' + def.name + ' · Stufe ' + (m.level || 1), color: GJ.hlColor(def.rarity), iconSVG: def.svg(color, (m.level || 1) >= 3) });
      GJ.UI.buzz(30);
      await FX.sleep(color === 'b' && M.mode === 'bot' ? 900 : 450);
      if (g !== M.gen) return;
    }
    const fx = [];
    E.makeMove(st, m, fx);
    st._undo = [];
    const check = E.inCheck(st, st.turn);
    st.history.push({ san: san + (check ? '+' : ''), color, sp: m.kind === 'special', key: E.moveKey(m), from: m.from, to: m.kind === 'special' ? (m.to !== m.from ? m.to : m.picks[0]) : (m.to != null ? m.to : m.from) });
    E.recordPosition(st);
    M.lastMove = m.kind === 'pass' ? null : [m.from, st.history[st.history.length - 1].to];
    await M.view.playMove(st, m, fx);
    if (M.aborted || g !== M.gen) return;
    if (check) { GJ.Audio.play('check'); GJ.UI.buzz(60); }
    // 1 gegen 1: Brett zum nächsten Spieler drehen
    if (M.mode === 'mp' && M.setup.rotate) {
      const want = M.flipFor();
      if (want !== M.view.flipped) {
        await FX.anim(M.view.wrap, [{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(.86) rotate(90deg)', opacity: .6 }], { duration: 220, easing: 'ease-in' });
        M.view.setFlipped(want);
        M.view.render(st, { mine: M.human() });
        await FX.anim(M.view.wrap, [{ transform: 'scale(.86) rotate(-90deg)', opacity: .6 }, { transform: 'scale(1) rotate(0)' }], { duration: 260, easing: 'cubic-bezier(.2,1.5,.4,1)' });
      }
    }
    M.view.render(st, { mine: M.human() });
    if (M.mode === 'mp' && !M.over) GJ.UI.banner({ title: M.nameOf(st.turn) + ' ist dran', sub: 'Gerät weitergeben', color: TEAM[st.turn], iconSVG: PC().koenig.svg(st.turn, false), ms: 1000 });
    M.saveMatch();
    M.next();
  };

  M.saveMatch = function () {
    if (M.mode !== 'bot') return;
    GJ.Save.d.match = M.over ? null : { botId: M.bot.id, setup: M.setup, state: E.serialize(M.st) };
    GJ.Save.save();
  };

  // ---------------- Anzeige ----------------
  M.refresh = function () {
    const st = M.st;
    const chk = E.inCheck(st, st.turn) ? E.royalSq(st, st.turn) : -1;
    M.baseMarks = { last: M.lastMove, check: chk };
    if (M.ui.mode === 'special') M.updateSpecialMarks();
    else if (M.ui.mode === 'piece') M.selectPiece(M.ui.sel);
    else M.view.marks(M.baseMarks);
    M.renderSpecialBar();
    M.renderBars(false);
    const ml = document.getElementById('movelist');
    if (ml) { ml.innerHTML = M.movesHTML(); ml.scrollTop = ml.scrollHeight; }
  };
  M.movesHTML = function () {
    const H = M.st.history;
    let h = '', n = 1;
    H.forEach((x, i) => {
      if (x.color === 'w') h += `<div class="no">${n}.</div>`;
      else if (i === 0) h += `<div class="no">${n}.</div><div class="mv">...</div>`;
      h += `<div class="mv ${x.sp ? 'sp' : ''}">${x.san}</div>`;
      if (x.color === 'b') n++;
    });
    return h || '<div class="no" style="grid-column:1/-1">Noch keine Züge</div>';
  };
  // Spieler unten = wer gerade zieht (1 gegen 1) bzw. du (Bot)
  M.bottomColor = function () { return M.mode === 'bot' ? 'w' : M.st.turn; };
  M.renderBars = function (thinking) {
    const st = M.st, me = M.bottomColor(), op = E.opp(me);
    const capsHTML = c => {
      const list = st.captured[E.opp(c)].slice().sort((a, b) => PC()[b].value - PC()[a].value);
      const diff = E.material(st, c) - E.material(st, E.opp(c));
      return `<span class="caps">${list.map(t => PC()[t].svg(E.opp(c), false)).join('')}${diff > 0 ? `<span class="diff">+${+diff.toFixed(1)}</span>` : ''}</span>`;
    };
    const top = document.getElementById('bar-top'), bot = document.getElementById('bar-me');
    if (!top || !bot) return;
    const avatar = M.mode === 'bot' ? `<div class="avatar sm" style="--bc:${M.bot.color}">${GJ.avatarSVG(M.bot.id)}</div>` : `<div class="team-dot" style="--tc:${TEAM[op]}">${PC().koenig.svg(op, false)}</div>`;
    const think = thinking ? `<span class="think-dots"><span></span><span></span><span></span></span> denkt nach` : capsHTML(op);
    top.className = 'bar' + (st.turn === op && !M.over ? ' active' : '');
    top.style.setProperty('--tc', TEAM[op]);
    top.innerHTML = `<button class="btn btn-sm btn-icon btn-blue" id="btn-pause" aria-label="Pause">${ic('pause')}</button>${avatar}<div class="who"><div class="nm">${M.nameOf(op)}</div><div class="sub">${think}</div></div><div class="sp-mini-row" id="sp-mini"></div>`;
    GJ.UI.tap(document.getElementById('btn-pause'), () => M.pause());
    M.renderOppSpecials(op);
    bot.className = 'bar' + (st.turn === me && !M.over ? ' active' : '') + (M.ui.mode === 'special' ? ' hidden' : '');
    bot.style.setProperty('--tc', TEAM[me]);
    const turnTxt = M.over ? '' : st.turn === me ? (E.inCheck(st, me) ? 'Schach!' : 'Du bist dran') : '';
    bot.innerHTML = `<div class="team-dot" style="--tc:${TEAM[me]}">${PC().koenig.svg(me, false)}</div><div class="who"><div class="nm">${M.nameOf(me)}</div><div class="sub">${capsHTML(me)}</div></div>
      ${turnTxt ? `<div class="toon-sm" style="font-size:14px;flex:none;padding-right:6px">${turnTxt}</div>` : ''}
      ${M.mode === 'training' ? `<button class="btn btn-sm btn-icon" id="btn-undo" aria-label="Zug zurück">${ic('undo')}</button>` : ''}`;
    const ub = document.getElementById('btn-undo'); if (ub) GJ.UI.tap(ub, () => M.undo());
  };

  M.deckTypes = function (color) {
    const set = new Set();
    if (M.mode !== 'training') Object.values(color === 'w' ? M.setup.white : M.setup.black).forEach(t => set.add(t));
    for (let s = 0; s < 64; s++) { const p = M.st.board[s]; if (p && p.color === color) set.add(p.type); }
    return GJ.PIECE_ORDER.filter(t => set.has(t));
  };
  M.renderSpecialBar = function () {
    const bar = document.getElementById('sp-bar');
    if (!bar) return;
    const color = M.bottomColor();
    const mine = M.isHumanTurn() && M.st.turn === color;
    const info = E.specialInfo(M.st, color, mine ? M.legal : []);
    bar.innerHTML = '';
    for (const t of M.deckTypes(color)) {
      const def = PC()[t];
      if (!def.special) continue;
      const i = info(t);
      const card = document.createElement('button');
      const aiming = M.ui.mode === 'special' && M.ui.spType === t;
      card.className = 'sp-card ' + (aiming ? 'aiming' : i.state) + (!mine || M.busy ? ' waiting' : '');
      card.style.setProperty('--rc', GJ.hlColor(def.rarity));
      const corner = i.state === 'used' ? ic('check', 'corner') : i.state === 'locked' ? ic('lock', 'corner') : '';
      card.innerHTML = `${def.svg(color, i.lvl >= 3)}<div class="sp-name">${def.special.name}</div><div class="sp-st">${[1, 2, 3].map(k => ic(k <= i.lvl ? 'star' : 'starOff')).join('')}</div>${corner}`;
      card.setAttribute('aria-label', def.special.name);
      card.onclick = () => M.activateSpecial(t, i);
      bar.appendChild(card);
    }
  };
  M.renderOppSpecials = function (op) {
    const row = document.getElementById('sp-mini');
    if (!row) return;
    const info = E.specialInfo(M.st, op, []);
    row.innerHTML = '';
    for (const t of M.deckTypes(op)) {
      const def = PC()[t], i = info(t);
      if (i.state === 'locked') continue;
      const d = document.createElement('div');
      d.className = 'sp-mini ' + (i.state === 'used' ? 'used' : '');
      d.style.setProperty('--rc', GJ.hlColor(def.rarity));
      d.innerHTML = def.svg(op, i.lvl >= 3);
      row.appendChild(d);
    }
  };

  // ---------------- Eingabe: normale Züge ----------------
  M.legalFrom = sq => (M.legal || []).filter(m => (m.kind === 'normal' || m.kind === 'castle') && m.from === sq);
  M.canDrag = function (sq) {
    if (!M.isHumanTurn() || M.busy || M.ui.mode === 'special') return false;
    const p = M.st.board[sq];
    return !!p && p.color === M.human() && M.legalFrom(sq).length > 0;
  };
  M.selectPiece = function (sq) {
    const ms = M.legalFrom(sq);
    M.ui = { mode: 'piece', sel: sq };
    const hints = GJ.Save.d.settings.hints;
    const moves = [], caps = [];
    for (const m of ms) { if (m.kind === 'normal' && m.capture != null) caps.push(m.to); else moves.push(m.to); }
    M.view.marks(Object.assign({}, M.baseMarks, { sel: sq, moves: hints ? moves : [], caps: hints ? caps : [] }));
  };
  M.deselect = function () { M.ui = { mode: 'idle' }; M.view.marks(M.baseMarks); };
  M.onClick = function (sq) {
    GJ.Audio.init();
    if (!M.isHumanTurn() || M.busy) return;
    if (M.ui.mode === 'special') { M.specialClick(sq); return; }
    const p = M.st.board[sq];
    if (M.ui.mode === 'piece') {
      const ms = M.legalFrom(M.ui.sel).filter(m => m.to === sq);
      if (ms.length) { M.playNormal(ms); return; }
    }
    if (p && p.color === M.human()) {
      if (M.legalFrom(sq).length) { GJ.Audio.play('select'); GJ.UI.buzz(8); M.selectPiece(sq); }
      else { M.deselect(); if (p.frozen) GJ.UI.toast('Diese Figur ist eingefroren'); else GJ.Audio.play('deny'); }
      return;
    }
    M.deselect();
  };
  M.onDrop = function (from, to) {
    if (!M.isHumanTurn() || M.busy) return;
    const ms = M.legalFrom(from).filter(m => m.to === to);
    if (ms.length) M.playNormal(ms);
    else { if (to !== from && to >= 0) GJ.Audio.play('deny'); M.view.render(M.st, { mine: M.human() }); M.selectPiece(from); }
  };
  M.playNormal = function (ms) {
    if (ms.length === 1) { M.execute(ms[0]); return; }
    M.chooseMove(ms, 'Umwandlung', 'Wähle die neue Figur');
  };
  M.chooseMove = function (ms, title, text) {
    const color = M.human();
    const html = `<p style="text-align:center">${text}</p><div class="choice-list">${ms.map((m, i) => {
      const t = m.promo || (m.data && m.data.type) || m.stype;
      const def = PC()[t];
      return `<button class="choice" data-i="${i}" style="--rc:${GJ.hlColor(def.rarity)}">${def.svg(color, false)}${def.name}</button>`;
    }).join('')}</div>`;
    const md = GJ.UI.modal({ title, html, persistent: true, buttons: [{ label: 'Abbrechen', onClick: () => M.cancelSpecial() }] });
    md.querySelectorAll('.choice').forEach(c => GJ.UI.tap(c, () => { GJ.UI.closeModal(md); M.execute(ms[+c.dataset.i]); }));
  };

  // ---------------- Eingabe: Specials ----------------
  M.activateSpecial = function (type, info) {
    GJ.Audio.init();
    if (M.over) return;
    if (M.ui.mode === 'special' && M.ui.spType === type) { M.cancelSpecial(); return; }
    if (!M.isHumanTurn() || M.busy || M.st.turn !== M.bottomColor()) { GJ.UI.toast('Warte, bis du dran bist'); return; }
    if (info.state !== 'ready') { GJ.Audio.play('deny'); GJ.UI.toast(info.reason); return; }
    const cand = M.legal.filter(m => m.kind === 'special' && m.stype === type);
    const froms = [...new Set(cand.map(m => m.from))];
    M.ui = { mode: 'special', spType: type, cand, froms, from: froms.length === 1 ? froms[0] : null, picks: [], hover: -1 };
    GJ.Audio.play('select'); GJ.UI.buzz(10);
    M.showAct(true);
    M.updateSpecialMarks();
    M.renderSpecialBar();
  };
  M.showAct = function (on) {
    const act = document.getElementById('sp-act'), me = document.getElementById('bar-me');
    if (!act || !me) return;
    act.classList.toggle('hidden', !on);
    me.classList.toggle('hidden', on);
  };
  M.cancelSpecial = function () {
    if (M.ui.mode !== 'special' && M.ui.mode !== 'piece') return;
    M.ui = { mode: 'idle' };
    M.showAct(false);
    M.view.marks(M.baseMarks);
    M.renderSpecialBar();
  };
  function prefixOk(m, from, picks) {
    if (m.from !== from) return false;
    for (let i = 0; i < picks.length; i++) if (m.picks[i] !== picks[i]) return false;
    return true;
  }
  M.spMatching = function () { const u = M.ui; return u.cand.filter(m => prefixOk(m, u.from, u.picks)); };
  M.isSelfCentric = ms => ms.length > 0 && ms.every(m => m.picks.length === 1 && m.picks[0] === m.from);

  M.updateSpecialMarks = function () {
    const u = M.ui, def = PC()[u.spType], col = GJ.hlColor(def.rarity);
    const act = document.getElementById('sp-act');
    const btn = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn btn-sm ' + (cls || ''); b.innerHTML = label; GJ.UI.tap(b, fn); act.appendChild(b); };
    act.innerHTML = '';
    const tx = document.createElement('div');
    tx.className = 'tx';
    act.appendChild(tx);
    if (u.from == null) {
      tx.innerHTML = `<b>${def.special.name}</b><br>Tippe die Figur an, die es auslösen soll.`;
      M.view.marks(Object.assign({}, M.baseMarks, { spFrom: u.froms, sp: u.froms, hc: col }));
      btn(ic('close'), 'btn-berry btn-icon', () => M.cancelSpecial());
      return;
    }
    const ms = M.spMatching();
    const self = M.isSelfCentric(ms);
    const next = [...new Set(ms.filter(m => m.picks.length > u.picks.length).map(m => m.picks[u.picks.length]))];
    const complete = ms.filter(m => m.picks.length === u.picks.length);
    const aff = [], good = [];
    const prev = self ? ms : (u.hover >= 0 ? ms.filter(m => m.picks[u.picks.length] === u.hover) : (complete.length && u.picks.length ? complete : []));
    for (const m of prev) {
      for (const q of new Set([...(m.caps || []), ...(m.affects || [])])) {
        const p = M.st.board[q];
        if (p && p.color === M.st.turn) good.push(q); else aff.push(q);
      }
      if (m.to !== m.from && !m.caps.includes(m.to)) good.push(m.to);
    }
    M.view.marks(Object.assign({}, M.baseMarks, { spFrom: [u.from], sp: self ? [] : next, aff, affGood: good, hc: col }));
    const desc = def.special.desc()[(ms[0] && ms[0].level ? ms[0].level : 1) - 1];
    if (self) {
      tx.innerHTML = `<b>${def.special.name}</b><br>${desc}`;
      btn(ic('close'), 'btn-berry btn-icon', () => M.cancelSpecial());
      btn(`${ic('bolt')} Los!`, 'btn-sun', () => M.resolveSpecial(true));
    } else {
      tx.innerHTML = `<b>${def.special.name}</b><br>${u.picks.length ? 'Nächstes Ziel antippen' : 'Ziel antippen'}`;
      tx.title = desc;
      btn(ic('close'), 'btn-berry btn-icon', () => M.cancelSpecial());
      if (complete.length && next.length) btn('Fertig', 'btn-sun', () => M.finishPicks());
    }
  };
  M.onHover = function (sq) {
    if (M.ui.mode !== 'special' || M.ui.from == null || M.ui.hover === sq) return;
    M.ui.hover = sq;
    M.updateSpecialMarks();
  };
  M.specialClick = function (sq) {
    const u = M.ui;
    if (u.from == null) {
      if (u.froms.includes(sq)) { u.from = sq; GJ.Audio.play('select'); M.updateSpecialMarks(); }
      else M.cancelSpecial();
      return;
    }
    const ms = M.spMatching();
    if (M.isSelfCentric(ms)) {
      if (sq === u.from) M.resolveSpecial(true);
      else if (u.froms.length > 1 && u.froms.includes(sq)) { u.from = sq; M.updateSpecialMarks(); }
      else M.cancelSpecial();
      return;
    }
    const next = new Set(ms.filter(m => m.picks.length > u.picks.length).map(m => m.picks[u.picks.length]));
    if (next.has(sq)) {
      // Auf Touch: erstes Antippen zeigt die Vorschau, zweites bestätigt
      if (u.hover !== sq && matchMedia('(hover: none)').matches && u.picks.length === 0 && ms.some(m => m.picks[0] === sq && ((m.caps && m.caps.length > 1) || (m.affects && m.affects.length > 1)))) {
        u.hover = sq; M.updateSpecialMarks(); return;
      }
      u.picks.push(sq); u.hover = -1; GJ.Audio.play('select'); M.resolveSpecial(false); return;
    }
    if (!u.picks.length && u.froms.length > 1 && u.froms.includes(sq)) { u.from = sq; M.updateSpecialMarks(); return; }
    M.cancelSpecial();
  };
  M.finishPicks = function () {
    const u = M.ui;
    const complete = M.spMatching().filter(m => m.picks.length === u.picks.length);
    if (complete.length === 1) M.execute(complete[0]);
    else if (complete.length > 1) M.chooseMove(complete, PC()[u.spType].special.name, 'Wähle eine Variante');
  };
  M.resolveSpecial = function (self) {
    const u = M.ui;
    const ms = M.spMatching();
    if (self) { if (ms.length === 1) M.execute(ms[0]); return; }
    const complete = ms.filter(m => m.picks.length === u.picks.length);
    const ext = ms.filter(m => m.picks.length > u.picks.length);
    if (!ext.length) {
      if (complete.length === 1) M.execute(complete[0]);
      else if (complete.length > 1) M.chooseMove(complete, PC()[u.spType].special.name, complete[0].promo ? 'Wähle die neue Figur' : 'Wer soll zurückkehren?');
      return;
    }
    M.updateSpecialMarks();
  };

  // ---------------- Aufgeben / Remis ----------------
  M.resign = function () {
    if (M.over) return;
    const who = M.mode === 'bot' ? 'w' : M.st.turn;
    GJ.UI.confirm('Aufgeben?', M.mode === 'bot' ? 'Bei Aufgabe gibt es keine EP.' : `${M.nameOf(who)} gibt auf und verliert.`, 'Aufgeben', () => M.finish({ winner: E.opp(who), reason: 'aufgabe' }), true);
  };
  M.offerDraw = function () {
    if (M.over) return;
    if (M.mode === 'mp') {
      const other = E.opp(M.st.turn);
      GJ.UI.modal({ title: 'Remis?', html: `<p style="text-align:center">${M.nameOf(M.st.turn)} bietet Remis an. ${M.nameOf(other)}, nimmst du an?</p>`, persistent: true,
        buttons: [{ label: 'Ablehnen', cls: 'btn-berry' }, { label: 'Annehmen', cls: 'btn-leaf', onClick: () => M.finish({ winner: null, reason: 'remis' }) }] });
      return;
    }
    const ev = GJ.AI.evalFor(M.st, 'b');
    if (ev <= C.ai.acceptDrawBelow) { GJ.UI.toast(M.bot.name + ' nimmt das Remis an'); M.finish({ winner: null, reason: 'remis' }); }
    else { GJ.Audio.play('deny'); GJ.UI.toast(M.bot.name + ' lehnt ab. Die Stellung ist gut für den Bot.'); }
  };

  // ---------------- Spielende ----------------
  M.computeRewards = function (result) {
    const S = GJ.Save, eco = C.economy, bot = M.bot, base = bot.ep;
    const won = result.winner === 'w', lost = result.winner === 'b';
    const lines = [];
    if (won) {
      lines.push(['Sieg gegen ' + bot.name, base]);
      const pm = M.st.history.filter(h => h.color === 'w').length;
      if (result.reason === 'matt' && pm <= eco.fastMateMoves) lines.push([`Schnelles Matt (${pm} Züge)`, Math.round(base * eco.fastMateBonus)]);
      const streak = S.d.stats.streak;
      if (streak > 0) { const b = Math.min(streak * eco.streakBonusPerWin, eco.streakBonusMax); lines.push([`Siegesserie ${streak + 1}`, Math.round(base * b)]); }
      if (!S.d.firstWins.includes(bot.id)) lines.push(['Erster Sieg gegen ' + bot.name, eco.firstWinBonus]);
    } else if (!lost) lines.push(['Remis', Math.round(base * eco.drawFactor)]);
    else if (result.reason === 'aufgabe') lines.push(['Aufgegeben', eco.resignEP]);
    else lines.push(['Trostpreis', eco.lossEP]);
    return { lines, total: lines.reduce((a, l) => a + l[1], 0) };
  };

  M.finish = function (result) {
    if (M.over) return;
    M.over = true;
    M.busy = true;
    M.st.result = result;
    M.cancelSpecial();
    M.renderBars(false);
    const S = GJ.Save;
    if (M.mode !== 'bot') {
      const t = result.winner ? `${M.nameOf(result.winner)} gewinnt!` : 'Remis!';
      if (result.winner) { GJ.Audio.play('win'); FX.confetti(140); } else GJ.Audio.play('draw');
      const btns = M.mode === 'mp'
        ? [{ label: `${ic('refresh')} Revanche`, cls: 'btn-sun', onClick: () => M.start({ mp: true }) }, { label: `${ic('deck')} Decks`, cls: 'btn-blue', onClick: () => GJ.UI.go('mp') }, { label: `${ic('home')} Menü`, onClick: () => GJ.UI.go('home') }]
        : [{ label: `${ic('undo')} Zurück`, onClick: () => { M.over = false; M.busy = false; M.undo(); } }, { label: 'OK', cls: 'btn-leaf', onClick: () => { M.busy = false; } }];
      setTimeout(() => GJ.UI.modal({ cls: 'result', persistent: true, html: `<div class="result-title toon ${result.winner ? 'win' : 'draw'}">${t}</div><p>${M.REASONS[result.reason]}</p>`, buttons: btns }), 600 * (FX.speed() || 0.3));
      return;
    }
    const won = result.winner === 'w', lost = result.winner === 'b';
    const rw = M.computeRewards(result);
    const st = S.d.stats;
    let unlocked = null;
    if (won) {
      st.wins++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak);
      if (!S.d.botsBeaten.includes(M.bot.id)) {
        S.d.botsBeaten.push(M.bot.id);
        if (M.botIdx + 1 < C.bots.length) { unlocked = C.bots[M.botIdx + 1]; S.d.selectedBot = M.botIdx + 1; }
      }
      if (!S.d.firstWins.includes(M.bot.id)) S.d.firstWins.push(M.bot.id);
    } else if (lost) { st.losses++; st.streak = 0; } else { st.draws++; st.streak = 0; }
    S.d.match = null;
    S.save();
    setTimeout(() => M.showResult(result, rw, unlocked), result.reason === 'aufgabe' ? 100 : 700 * (FX.speed() || 0.3));
  };

  M.showResult = function (result, rw, unlocked) {
    const won = result.winner === 'w', lost = result.winner === 'b';
    const cls = won ? 'win' : lost ? 'lose' : 'draw';
    const title = won ? 'SIEG!' : lost ? 'VERLOREN' : 'REMIS';
    const sub = won ? 'Du hast ' + M.bot.name + ' besiegt' : lost ? M.REASONS[result.reason] + ' · ' + M.bot.name + ' gewinnt' : M.REASONS[result.reason];
    let lines = rw.lines.map((l, i) => `<div class="ep-line" style="animation-delay:${0.4 + i * 0.3}s"><span>${l[0]}</span><b>+${l[1]}</b></div>`).join('');
    lines += `<div class="ep-line total" style="animation-delay:${0.4 + rw.lines.length * 0.3}s"><span>Gesamt</span><span>${ic('coin')} <span id="ep-total">0</span></span></div>`;
    if (unlocked) lines += `<div class="ep-line" style="animation-delay:${0.7 + rw.lines.length * 0.3}s;background:var(--leaf)"><span>Neuer Gegner frei: ${unlocked.name}</span>${ic('crown')}</div>`;
    const md = GJ.UI.modal({
      cls: 'result', persistent: true,
      html: `<div class="result-title toon ${cls}">${title}</div><div style="font-size:14px">${sub}</div><div class="ep-lines">${lines}</div>`,
      buttons: [
        { label: `${ic('refresh')} Nochmal`, onClick: () => M.start({ botIdx: M.botIdx, deckIdx: M.setup.deckIdx }) },
        { label: `${ic('slot')} Automat`, cls: 'spin-go', onClick: () => GJ.UI.go('slot') },
        { label: `${ic('home')} Menü`, cls: 'btn-leaf', onClick: () => GJ.UI.go('home') }
      ]
    });
    if (won) { GJ.Audio.play('win'); FX.confetti(180); GJ.UI.buzz(80); } else GJ.Audio.play(lost ? 'lose' : 'draw');
    const totalEl = md.querySelector('#ep-total');
    setTimeout(async () => {
      if (rw.total > 0) {
        await FX.countUp(totalEl, 0, rw.total, 700);
        GJ.Save.addEP(rw.total);
      } else totalEl.textContent = '0';
      const sb = md.querySelector('.spin-go');
      if (sb && GJ.Save.d.ep >= GJ.Save.spinCost()) sb.classList.add('btn-sun', 'wiggle');
    }, (400 + rw.lines.length * 300) * (FX.speed() || 0.2));
  };

  // ---------------- Trainingsplatz ----------------
  M.undo = function () {
    if (M.mode !== 'training' || !M.snapshots.length) return;
    M.st = E.deserialize(M.snapshots.pop());
    M.over = false; M.busy = false;
    const h = M.st.history[M.st.history.length - 1];
    M.lastMove = h ? [h.from, h.to] : null;
    M.ui = { mode: 'idle' };
    M.view.render(M.st, { mine: M.human() });
    M.next();
  };
})();
