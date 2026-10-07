/* =====================================================================
   GAMBIT JACKPOT - ai.js
   Bot: Negamax mit Alpha-Beta, Iterative Deepening, Quiescence, TT.
   Kein DOM. Arbeitet auf einer Kopie des Spielzustands.
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  const E = GJ.E;
  const PC = () => GJ.PIECES;
  const MATE = 100000;
  const INF = 1e9;
  const TIMEOUT = { timeout: true };

  // ---------------- Bewertung ----------------
  function evaluate(st) {
    const cfg = GJ.CONFIG.ai;
    const B = st.board;
    let score = 0, heavy = 0;
    for (let s = 0; s < 64; s++) { const p = B[s]; if (p && PC()[p.type].cls !== 'bauer' && !PC()[p.type].royal) heavy += PC()[p.type].value; }
    const endgame = heavy < 14;
    const present = { w: {}, b: {} };
    for (let s = 0; s < 64; s++) {
      const p = B[s];
      if (!p) continue;
      const def = PC()[p.type];
      const f = s & 7, r = s >> 3;
      const adv = p.color === 'w' ? r : 7 - r;
      let v = def.value * 100;
      const centr = 3.5 - Math.max(Math.abs(f - 3.5), Math.abs(r - 3.5));
      if (def.royal) {
        if (endgame) v += centr * 12;
        else v += (adv === 0 ? 18 : -adv * 14) + ((f <= 2 || f >= 5) && adv === 0 ? 10 : 0);
      } else if (def.cls === 'bauer') {
        v += adv * adv * 2.2 + ((f === 3 || f === 4) ? 8 : 0) + (endgame ? adv * 6 : 0);
      } else {
        v += centr * (def.move.leaps && def.move.leaps.length ? 9 : 5);
        if (!p.moved && adv === 0 && st.ply < 24) v -= 10;
      }
      if (p.frozen) v -= def.value * 100 * cfg.frozenPenalty;
      if (p.shield) v += 4;
      present[p.color][p.type] = true;
      score += p.color === 'w' ? v : -v;
    }
    // Reserve für unbenutzte Specials
    for (const c of ['w', 'b']) {
      const lv = st.levels[c] || {};
      let res = 0;
      for (const t in present[c]) {
        const l = lv[t] || 0;
        if (l > 0 && !st.specialsUsed[c].includes(t)) res += cfg.specialReserve * 100 * l;
      }
      score += c === 'w' ? res : -res;
    }
    return st.turn === 'w' ? score : -score;
  }

  function victimValue(st, m) {
    if (m.kind === 'normal' && m.capture != null) { const t = st.board[m.capture]; return t ? PC()[t.type].value : 0; }
    if (m.kind === 'special' && m.caps && m.caps.length) { let v = 0; for (const q of m.caps) { const t = st.board[q]; if (t) v += PC()[t.type].value; } return v; }
    if (m.kind === 'special' && (m.stype === 'moench' || m.stype === 'hexe') && m.affects.length) { const t = st.board[m.affects[0]]; return t ? PC()[t.type].value * (m.stype === 'moench' ? 2 : 0.6) : 0; }
    return 0;
  }

  function orderMoves(st, moves, ttKey, killers) {
    for (const m of moves) {
      let sc = 0;
      const k = E.moveKey(m);
      if (ttKey && k === ttKey) sc = 1e6;
      else {
        const vv = victimValue(st, m);
        if (m.kind === 'normal' && m.capture != null) sc = 10000 + vv * 100 - PC()[st.board[m.from].type].value * 10;
        else if (m.kind === 'special' && vv > 0) sc = 9000 + vv * 100;
        if (m.promo) sc += 8000 + PC()[m.promo].value * 10;
        if (!sc && killers && killers.includes(k)) sc = 5000;
        if (m.kind === 'special' && !vv) sc -= 50;
      }
      m._o = sc;
    }
    moves.sort((a, b) => b._o - a._o);
    return moves;
  }

  function materialSpecial(m) {
    return (m.caps && m.caps.length) || m.stype === 'moench' || m.stype === 'hexe' || m.stype === 'kaiser';
  }

  // ---------------- Suche ----------------
  function Search(cfg, deadline) {
    this.cfg = cfg; this.deadline = deadline; this.nodes = 0;
    this.tt = cfg.tt ? new Map() : null;
    this.killers = [];
  }
  Search.prototype.check = function () {
    if ((++this.nodes & 511) === 0 && Date.now() > this.deadline) throw TIMEOUT;
  };
  Search.prototype.genMoves = function (st, ply) {
    const ms = E.pseudoMoves(st, { specials: false });
    const sp = [];
    E.genSpecials(st, st.turn, sp);
    if (ply <= 1) { for (const m of sp) ms.push(m); }
    else { for (const m of sp) if (materialSpecial(m)) ms.push(m); }
    return ms;
  };
  Search.prototype.qsearch = function (st, alpha, beta, qd) {
    this.check();
    const stand = evaluate(st);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (qd >= 6) return stand;
    const c = st.turn;
    const moves = orderMoves(st, E.pseudoMoves(st, { specials: false, capturesOnly: true }), null, null);
    for (const m of moves) {
      E.makeMove(st, m, null);
      if (E.inCheck(st, c)) { E.unmakeMove(st); continue; }
      const sc = -this.qsearch(st, -beta, -alpha, qd + 1);
      E.unmakeMove(st);
      if (sc >= beta) return sc;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  };
  Search.prototype.negamax = function (st, depth, alpha, beta, ply) {
    this.check();
    if (st.halfmove >= 100) return 0;
    if (depth <= 0) return this.cfg.quiescence ? this.qsearch(st, alpha, beta, 0) : evaluate(st);
    const a0 = alpha;
    let ttKey = null, h = 0;
    if (this.tt) {
      h = E.hash(st);
      const e = this.tt.get(h);
      if (e) {
        ttKey = e.best;
        if (e.depth >= depth) {
          if (e.flag === 0) return e.score;
          if (e.flag === 1 && e.score >= beta) return e.score;
          if (e.flag === -1 && e.score <= alpha) return e.score;
        }
      }
    }
    const c = st.turn;
    const moves = orderMoves(st, this.genMoves(st, ply), ttKey, this.killers[ply]);
    let best = -INF, bestKey = null, legal = 0;
    for (const m of moves) {
      E.makeMove(st, m, null);
      if (E.inCheck(st, c)) { E.unmakeMove(st); continue; }
      legal++;
      const sc = -this.negamax(st, depth - 1, -beta, -alpha, ply + 1);
      E.unmakeMove(st);
      if (sc > best) { best = sc; bestKey = E.moveKey(m); }
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) {
        if (!(m.kind === 'normal' && m.capture != null)) {
          const k = this.killers[ply] || (this.killers[ply] = []);
          const key = E.moveKey(m);
          if (!k.includes(key)) { k.unshift(key); if (k.length > 2) k.pop(); }
        }
        break;
      }
    }
    if (!legal) {
      if (E.inCheck(st, c)) return -MATE + ply;
      if (E.hasFrozen(st, c)) {
        E.makeMove(st, { kind: 'pass' }, null);
        const sc = -this.negamax(st, depth - 1, -beta, -alpha, ply + 1);
        E.unmakeMove(st);
        return sc;
      }
      return 0;
    }
    if (this.tt) {
      const flag = best <= a0 ? -1 : (best >= beta ? 1 : 0);
      this.tt.set(h, { depth, score: best, flag, best: bestKey });
      if (this.tt.size > 400000) this.tt.clear();
    }
    return best;
  };

  // ---------------- Öffentliche API ----------------
  // bot: Eintrag aus CONFIG.bots (depth, timeMs, quiescence, tt, randomChance, randomTop, noise)
  function think(state, bot, opts) {
    opts = opts || {};
    const t0 = Date.now();
    const st = E.clone(state);
    const cfg = Object.assign({ depth: 2, timeMs: 800, quiescence: false, tt: false, randomChance: 0, randomTop: 1, noise: 0 }, bot);
    if (opts.fast) { cfg.timeMs = Math.min(cfg.timeMs, 300); }
    const maxMs = Math.min(cfg.timeMs, GJ.CONFIG.ai.maxMs);
    const legal = E.legalMoves(st);
    if (!legal.length) return null;
    if (legal.length === 1) return { move: legal[0], score: 0, depth: 0, nodes: 0, ms: Date.now() - t0 };
    const S = new Search(cfg, t0 + maxMs);
    let scored = legal.map(m => ({ m, s: 0 }));
    orderMoves(st, legal, null, null);
    scored = legal.map(m => ({ m, s: m._o / 1000 }));
    let doneDepth = 0;
    for (let d = 1; d <= cfg.depth; d++) {
      try {
        let alpha = -INF;
        const res = [];
        for (const it of scored) {
          E.makeMove(st, it.m, null);
          const sc = -S.negamax(st, d - 1, -INF, -alpha, 1);
          E.unmakeMove(st);
          res.push({ m: it.m, s: sc });
          if (sc > alpha) alpha = sc;
        }
        res.sort((a, b) => b.s - a.s);
        scored = res;
        doneDepth = d;
        if (scored[0].s > MATE - 100) break;
      } catch (e) {
        if (e !== TIMEOUT) throw e;
        // Stack wiederherstellen
        while (st._undo.length) E.unmakeMove(st);
        break;
      }
    }
    // Auswahl
    let pick = scored[0];
    if (cfg.randomChance && Math.random() < cfg.randomChance) {
      const top = scored.slice(0, Math.max(1, cfg.randomTop));
      pick = top[Math.floor(Math.random() * top.length)];
    } else if (cfg.noise && doneDepth > 0) {
      const noisy = scored.map(x => ({ m: x.m, s: x.s + (Math.random() * 2 - 1) * cfg.noise }));
      noisy.sort((a, b) => b.s - a.s);
      pick = scored.find(x => x.m === noisy[0].m);
    }
    return { move: pick.m, score: pick.s, depth: doneDepth, nodes: S.nodes, ms: Date.now() - t0 };
  }

  function evalFor(state, color) {
    const st = E.clone(state);
    st.turn = color;
    return evaluate(st) / 100;
  }

  GJ.AI = { think, evaluate, evalFor };
})();
