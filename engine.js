/* =====================================================================
   GAMBIT JACKPOT - engine.js
   Reine Spiellogik ohne DOM. Zustand ist serialisierbar.
   Brett: Array(64), Index = rank*8 + file, a1 = 0, h8 = 63.
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  const E = GJ.E = {};
  const PC = () => GJ.PIECES;

  // ---------------- Grundhelfer ----------------
  E.sqName = sq => 'abcdefgh'[sq & 7] + ((sq >> 3) + 1);
  E.sqFromName = n => (n.charCodeAt(0) - 97) + (parseInt(n.slice(1), 10) - 1) * 8;
  E.opp = c => (c === 'w' ? 'b' : 'w');
  E.fwd = c => (c === 'w' ? 1 : -1);
  E.cheb = (a, b) => Math.max(Math.abs((a & 7) - (b & 7)), Math.abs((a >> 3) - (b >> 3)));
  E.lastRank = c => (c === 'w' ? 7 : 0);
  E.isRoyal = p => !!PC()[p.type].royal;
  E.cls = p => PC()[p.type].cls;
  E.value = t => PC()[t].value;
  // gegnerische Figur, die von Specials/Schlagen betroffen sein darf
  E.targetable = (t, c) => !!t && t.color !== c && !PC()[t.type].royal && !(t.shield > 0);

  // ---------------- Neues Spiel ----------------
  // opts: { white: layout, black: layout, levels:{w,b}, promo:{w,b} }
  E.newGame = function (opts) {
    const st = {
      board: new Array(64).fill(null), turn: 'w', ply: 0, ep: null, halfmove: 0,
      specialsUsed: { w: [], b: [] },
      levels: { w: Object.assign({}, opts.levels && opts.levels.w), b: Object.assign({}, opts.levels && opts.levels.b) },
      promo: { w: (opts.promo && opts.promo.w) || ['dame', 'turm', 'laeufer', 'springer'], b: (opts.promo && opts.promo.b) || ['dame', 'turm', 'laeufer', 'springer'] },
      captured: { w: [], b: [] }, history: [], repetition: {}, result: null, nextId: 1,
      unlimitedSpecials: !!opts.unlimitedSpecials,
      _undo: []
    };
    const place = (layout, color) => {
      for (const name in layout) {
        const type = layout[name];
        if (!type || !PC()[type]) continue;
        let sq = E.sqFromName(name);
        if (color === 'b') sq = (7 - (sq >> 3)) * 8 + (sq & 7);
        st.board[sq] = E.newPiece(st, type, color, false);
      }
    };
    place(opts.white || {}, 'w');
    place(opts.black || {}, 'b');
    E.recordPosition(st);
    return st;
  };
  E.newPiece = (st, type, color, moved) => ({ id: st.nextId++, type, color, moved: !!moved, frozen: 0, shield: 0 });

  E.serialize = st => JSON.stringify(st, (k, v) => (k === '_undo' || k === '_u' ? undefined : v));
  E.deserialize = s => { const st = JSON.parse(s); st._undo = []; return st; };
  E.clone = st => E.deserialize(E.serialize(st));

  // ---------------- Undo-geloggte Mutationen ----------------
  function setSq(st, sq, p) { st._u.sq.push(sq, st.board[sq]); st.board[sq] = p; }
  function upd(st, sq, ch) { const p = Object.assign({}, st.board[sq], ch); setSq(st, sq, p); return p; }
  E._setSq = setSq; E._upd = upd;

  E.capture = function (st, sq, fx, style) {
    const p = st.board[sq];
    if (!p) return;
    st.captured[p.color].push(p.type);
    setSq(st, sq, null);
    if (fx) fx.push({ t: 'capture', sq, piece: p, style: style || 'shatter' });
  };
  E.movePiece = function (st, from, to, fx, style) {
    const p = st.board[from];
    setSq(st, from, null);
    const np = Object.assign({}, p, { moved: true });
    setSq(st, to, np);
    if (fx) fx.push({ t: style || 'move', from, to, id: p.id });
    return np;
  };
  E.promote = function (st, sq, type, fx) {
    const p = st.board[sq];
    upd(st, sq, { type });
    if (fx) fx.push({ t: 'promote', sq, from: p.type, type, id: p.id });
  };
  E.autoPromote = function (st, sq, fx) {
    const p = st.board[sq];
    if (!p || E.cls(p) !== 'bauer' || (sq >> 3) !== E.lastRank(p.color)) return;
    const opts = st.promo[p.color];
    E.promote(st, sq, opts && opts.length ? opts[0] : 'dame', fx);
  };
  E.freeze = function (st, sq, n, fx) {
    const p = st.board[sq];
    if (!p) return;
    upd(st, sq, { frozen: Math.max(p.frozen || 0, n) });
    if (fx) fx.push({ t: 'freeze', sq, n });
  };
  E.shieldPiece = function (st, sq, n, fx) {
    const p = st.board[sq];
    if (!p || PC()[p.type].royal) return;
    upd(st, sq, { shield: Math.max(p.shield || 0, n) });
    if (fx) fx.push({ t: 'shield', sq, n });
  };
  E.swapPieces = function (st, a, b, shieldB, fx) {
    const pa = st.board[a], pb = st.board[b];
    setSq(st, a, Object.assign({}, pb, { moved: true, shield: shieldB ? Math.max(pb.shield || 0, shieldB) : pb.shield }));
    setSq(st, b, Object.assign({}, pa, { moved: true }));
    if (fx) fx.push({ t: 'swap', a, b, ida: pa.id, idb: pb.id });
    E.autoPromote(st, a, fx);
  };
  E.convertPiece = function (st, sq, color, fx) {
    upd(st, sq, { color, moved: true, frozen: 0, shield: 0 });
    if (fx) fx.push({ t: 'convert', sq });
    E.autoPromote(st, sq, fx);
  };
  E.transformPiece = function (st, sq, type, freeze, fx) {
    const p = st.board[sq];
    upd(st, sq, { type, moved: true, shield: 0, frozen: Math.max(p.frozen || 0, freeze || 0) });
    if (fx) fx.push({ t: 'transform', sq, from: p.type, type });
    if (freeze && fx) fx.push({ t: 'freeze', sq, n: freeze });
  };
  E.revivePiece = function (st, sq, color, type, fx) {
    const arr = st.captured[color].slice();
    const i = arr.indexOf(type);
    if (i >= 0) arr.splice(i, 1);
    st.captured[color] = arr;
    const p = E.newPiece(st, type, color, true);
    setSq(st, sq, p);
    if (fx) fx.push({ t: 'revive', sq, piece: p });
  };
  E.pushPromoVariants = function (st, c, to, move, out) {
    if ((to >> 3) === E.lastRank(c)) {
      for (const t of st.promo[c]) out.push(Object.assign({}, move, { promo: t }));
    } else out.push(move);
  };

  // ---------------- Angriffe ----------------
  function attacksSq(st, from, p, to) {
    const d = PC()[p.type].move;
    const df = (to & 7) - (from & 7), dr = (to >> 3) - (from >> 3);
    if (!df && !dr) return false;
    if (d.pawn) {
      const f = E.fwd(p.color);
      if (dr === f && (df === 1 || df === -1)) return true;
      if (d.pawn.straightCapture && dr === f && df === 0) return true;
    }
    if (d.leapSet.size && Math.abs(df) <= 8 && Math.abs(dr) <= 8 && d.leapSet.has((dr + 8) * 17 + (df + 8))) return true;
    if (d.rides || d.cannon) {
      const adf = Math.abs(df), adr = Math.abs(dr);
      if (!(df === 0 || dr === 0 || adf === adr)) return false;
      const sx = Math.sign(df), sy = Math.sign(dr), k = Math.max(adf, adr);
      if (d.rides && d.rides.max >= k && d.rideSet.has((sy + 1) * 3 + (sx + 1))) {
        let clear = true;
        for (let i = 1; i < k; i++) if (st.board[from + sy * 8 * i + sx * i]) { clear = false; break; }
        if (clear) return true;
      }
      if (d.cannon && (df === 0 || dr === 0)) {
        let cnt = 0;
        for (let i = 1; i < k; i++) if (st.board[from + sy * 8 * i + sx * i]) cnt++;
        if (cnt === 1) return true;
      }
    }
    return false;
  }
  E.attacksSq = attacksSq;
  E.attacked = function (st, sq, by) {
    const b = st.board;
    for (let s = 0; s < 64; s++) {
      const p = b[s];
      if (p && p.color === by && attacksSq(st, s, p, sq)) return true;
    }
    return false;
  };
  E.royalSq = function (st, c) {
    for (let s = 0; s < 64; s++) { const p = st.board[s]; if (p && p.color === c && PC()[p.type].royal) return s; }
    return -1;
  };
  E.inCheck = function (st, c) {
    const k = E.royalSq(st, c);
    return k >= 0 && E.attacked(st, k, E.opp(c));
  };
  E.hasFrozen = function (st, c) {
    for (let s = 0; s < 64; s++) { const p = st.board[s]; if (p && p.color === c && p.frozen > 0) return true; }
    return false;
  };

  // ---------------- Zuggenerierung ----------------
  const capOk = (t, c) => t.color !== c && !PC()[t.type].royal && !(t.shield > 0);

  function addNormal(st, c, from, to, capture, out, flags) {
    const p = st.board[from];
    const m = { kind: 'normal', from, to, capture: capture == null ? null : capture };
    if (flags) Object.assign(m, flags);
    if (PC()[p.type].cls === 'bauer' && (to >> 3) === E.lastRank(c)) {
      for (const t of st.promo[c]) out.push(Object.assign({}, m, { promo: t }));
    } else out.push(m);
  }

  function genPiece(st, sq, p, out, capturesOnly) {
    const def = PC()[p.type], d = def.move, c = p.color, b = st.board;
    const f0 = sq & 7, r0 = sq >> 3;
    if (d.pawn) {
      const f = E.fwd(c);
      const r1 = r0 + f;
      if (r1 >= 0 && r1 <= 7) {
        const one = r1 * 8 + f0;
        if (!b[one]) {
          if (!capturesOnly || (r1 === E.lastRank(c))) addNormal(st, c, sq, one, null, out);
          const startRank = c === 'w' ? 1 : 6;
          if (!capturesOnly && !p.moved && r0 === startRank) {
            const two = (r0 + 2 * f) * 8 + f0;
            if (!b[two]) addNormal(st, c, sq, two, null, out, { dbl: one });
          }
        } else if (d.pawn.straightCapture && capOk(b[one], c)) addNormal(st, c, sq, one, one, out);
        for (const df of [-1, 1]) {
          const ff = f0 + df;
          if (ff < 0 || ff > 7) continue;
          const t = r1 * 8 + ff, tp = b[t];
          if (tp) { if (capOk(tp, c)) addNormal(st, c, sq, t, t, out); }
          else if (st.ep && st.ep.sq === t) {
            const v = b[st.ep.victim];
            if (v && capOk(v, c) && PC()[v.type].cls === 'bauer') addNormal(st, c, sq, t, st.ep.victim, out, { ep: true });
          }
        }
      }
      if (d.pawn.sideStep && !capturesOnly) {
        for (const df of [-1, 1]) {
          const ff = f0 + df;
          if (ff < 0 || ff > 7) continue;
          const t = r0 * 8 + ff;
          if (!b[t]) addNormal(st, c, sq, t, null, out);
        }
      }
    }
    if (d.leaps) {
      for (const v of d.leaps) {
        const ff = f0 + v[0], rr = r0 + v[1];
        if (ff < 0 || ff > 7 || rr < 0 || rr > 7) continue;
        const t = rr * 8 + ff, tp = b[t];
        if (!tp) { if (!capturesOnly) addNormal(st, c, sq, t, null, out); }
        else if (capOk(tp, c)) addNormal(st, c, sq, t, t, out);
      }
    }
    if (d.rides) {
      for (const v of d.rides.dirs) {
        for (let k = 1; k <= d.rides.max; k++) {
          const ff = f0 + v[0] * k, rr = r0 + v[1] * k;
          if (ff < 0 || ff > 7 || rr < 0 || rr > 7) break;
          const t = rr * 8 + ff, tp = b[t];
          if (!tp) { if (!capturesOnly) addNormal(st, c, sq, t, null, out); continue; }
          if (capOk(tp, c)) addNormal(st, c, sq, t, t, out);
          break;
        }
      }
    }
    if (d.cannon) {
      for (const v of GJ.DIRS.ORTH) {
        let screen = false;
        for (let k = 1; k <= 7; k++) {
          const ff = f0 + v[0] * k, rr = r0 + v[1] * k;
          if (ff < 0 || ff > 7 || rr < 0 || rr > 7) break;
          const t = rr * 8 + ff, tp = b[t];
          if (!screen) {
            if (!tp) { if (!capturesOnly) addNormal(st, c, sq, t, null, out); }
            else screen = true;
          } else if (tp) {
            if (capOk(tp, c)) addNormal(st, c, sq, t, t, out);
            break;
          }
        }
      }
    }
    if (d.extra === 'waechter' && !capturesOnly) {
      const opp = E.opp(c);
      for (const v of GJ.DIRS.ORTH) {
        const mid = GJ.stepSq(sq, v, 1), to = GJ.stepSq(sq, v, 2);
        if (mid < 0 || to < 0 || b[mid] || b[to]) continue;
        if (E.attacked(st, mid, opp)) continue;
        addNormal(st, c, sq, to, null, out);
      }
    }
  }

  function genCastles(st, c, out) {
    const ks = c === 'w' ? 4 : 60;
    const k = st.board[ks];
    if (!k || k.color !== c || PC()[k.type].cls !== 'koenig' || k.moved || k.frozen) return;
    const opp = E.opp(c);
    if (E.attacked(st, ks, opp)) return;
    const sides = [{ rook: ks + 3, kTo: ks + 2, rTo: ks + 1, between: [ks + 1, ks + 2], pass: [ks + 1, ks + 2] },
      { rook: ks - 4, kTo: ks - 2, rTo: ks - 1, between: [ks - 1, ks - 2, ks - 3], pass: [ks - 1, ks - 2] }];
    for (const s of sides) {
      const r = st.board[s.rook];
      if (!r || r.color !== c || PC()[r.type].cls !== 'turm' || r.moved || r.frozen) continue;
      if (s.between.some(q => st.board[q])) continue;
      if (s.pass.some(q => E.attacked(st, q, opp))) continue;
      out.push({ kind: 'castle', from: ks, to: s.kTo, rookFrom: s.rook, rookTo: s.rTo });
    }
  }

  E.specialAllowed = function (st, c, type) {
    const lvl = (st.levels[c] && st.levels[c][type]) || 0;
    if (lvl < 1) return 0;
    if (!st.unlimitedSpecials && st.specialsUsed[c].includes(type)) return 0;
    return lvl;
  };

  E.genSpecials = function (st, c, out, onlyType) {
    for (let s = 0; s < 64; s++) {
      const p = st.board[s];
      if (!p || p.color !== c || p.frozen > 0) continue;
      if (onlyType && p.type !== onlyType) continue;
      const def = PC()[p.type];
      if (!def.special) continue;
      const lvl = E.specialAllowed(st, c, p.type);
      if (!lvl) continue;
      const before = out.length;
      def.special.generate(st, s, p, lvl, out);
      for (let i = before; i < out.length; i++) out[i].level = lvl;
    }
  };

  // opts: { specials: true|false, capturesOnly }
  E.pseudoMoves = function (st, opts) {
    opts = opts || {};
    const c = st.turn, out = [];
    for (let s = 0; s < 64; s++) {
      const p = st.board[s];
      if (!p || p.color !== c || p.frozen > 0) continue;
      genPiece(st, s, p, out, opts.capturesOnly);
    }
    if (!opts.capturesOnly) genCastles(st, c, out);
    if (opts.specials !== false) E.genSpecials(st, c, out);
    return out;
  };

  E.legalMoves = function (st, opts) {
    const c = st.turn, ps = E.pseudoMoves(st, opts), res = [];
    for (const m of ps) {
      E.makeMove(st, m, null);
      if (!E.inCheck(st, c)) res.push(m);
      E.unmakeMove(st);
    }
    if (!res.length && !(opts && opts.capturesOnly) && !E.inCheck(st, c) && E.hasFrozen(st, c)) {
      // Prüfen, ob es ohne Einfrieren Züge gäbe -> dann aussetzen
      res.push({ kind: 'pass' });
    }
    return res;
  };

  // ---------------- Zug ausführen / zurücknehmen ----------------
  E.makeMove = function (st, m, fx) {
    const u = {
      sq: [], turn: st.turn, ply: st.ply, ep: st.ep, halfmove: st.halfmove,
      capW: st.captured.w, capWl: st.captured.w.length, capB: st.captured.b, capBl: st.captured.b.length,
      su: st.specialsUsed, nextId: st.nextId, result: st.result
    };
    st._undo.push(u);
    st._u = u;
    const c = st.turn;
    let resetHalf = false;
    st.ep = null;
    if (m.kind === 'normal') {
      const p = st.board[m.from];
      if (m.capture != null) { E.capture(st, m.capture, fx); resetHalf = true; }
      E.movePiece(st, m.from, m.to, fx);
      if (PC()[p.type].cls === 'bauer') resetHalf = true;
      if (m.dbl != null) st.ep = { sq: m.dbl, victim: m.to };
      if (m.promo) E.promote(st, m.to, m.promo, fx);
    } else if (m.kind === 'castle') {
      E.movePiece(st, m.from, m.to, fx);
      E.movePiece(st, m.rookFrom, m.rookTo, fx);
      if (fx) fx.push({ t: 'castle' });
    } else if (m.kind === 'special') {
      if (fx) fx.push({ t: 'special', stype: m.stype, from: m.from, color: c });
      PC()[m.stype].special.apply(st, m, fx);
      if (!st.unlimitedSpecials || !st.specialsUsed[c].includes(m.stype)) {
        st.specialsUsed = Object.assign({}, st.specialsUsed, { [c]: st.specialsUsed[c].concat(m.stype) });
      }
      if (m.caps && m.caps.length) resetHalf = true;
    }
    // Statuseffekte herunterzählen
    for (let s = 0; s < 64; s++) {
      const p = st.board[s];
      if (!p) continue;
      if (p.color === c && p.frozen > 0) upd(st, s, { frozen: p.frozen - 1 });
      else if (p.color !== c && p.shield > 0) upd(st, s, { shield: p.shield - 1 });
    }
    st.halfmove = resetHalf ? 0 : st.halfmove + 1;
    st.ply++;
    st.turn = E.opp(c);
    return u;
  };

  E.unmakeMove = function (st) {
    const u = st._undo.pop();
    if (!u) return;
    for (let i = u.sq.length - 2; i >= 0; i -= 2) st.board[u.sq[i]] = u.sq[i + 1];
    st.turn = u.turn; st.ply = u.ply; st.ep = u.ep; st.halfmove = u.halfmove;
    st.captured.w = u.capW; st.captured.w.length = u.capWl;
    st.captured.b = u.capB; st.captured.b.length = u.capBl;
    st.specialsUsed = u.su; st.nextId = u.nextId; st.result = u.result;
    st._u = st._undo[st._undo.length - 1];
  };

  // ---------------- Hash (Zobrist) ----------------
  let seed = 0x9E3779B9;
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0); }
  const N = 18 * 2 * 64;
  const ZA = new Uint32Array(N), ZB = new Uint32Array(N);
  for (let i = 0; i < N; i++) { ZA[i] = rnd(); ZB[i] = rnd(); }
  const ZS = new Uint32Array(64 * 8), ZS2 = new Uint32Array(64 * 8);
  for (let i = 0; i < ZS.length; i++) { ZS[i] = rnd(); ZS2[i] = rnd(); }
  const ZEP = new Uint32Array(64); for (let i = 0; i < 64; i++) ZEP[i] = rnd();
  const ZSU = new Uint32Array(36); for (let i = 0; i < 36; i++) ZSU[i] = rnd();
  const ZTURN = rnd(), ZTURN2 = rnd();
  E.hash = function (st) {
    let a = 0, b = 0;
    const B = st.board;
    for (let s = 0; s < 64; s++) {
      const p = B[s];
      if (!p) continue;
      const i = (PC()[p.type].index * 2 + (p.color === 'w' ? 0 : 1)) * 64 + s;
      a ^= ZA[i]; b ^= ZB[i];
      if (p.moved) { a ^= ZS[s * 8]; b ^= ZS2[s * 8]; }
      if (p.frozen) { const k = s * 8 + Math.min(3, p.frozen); a ^= ZS[k]; b ^= ZS2[k]; }
      if (p.shield) { const k = s * 8 + 4 + Math.min(3, p.shield); a ^= ZS[k]; b ^= ZS2[k]; }
    }
    if (st.turn === 'b') { a ^= ZTURN; b ^= ZTURN2; }
    if (st.ep) a ^= ZEP[st.ep.sq];
    for (const t of st.specialsUsed.w) a ^= ZSU[PC()[t].index];
    for (const t of st.specialsUsed.b) b ^= ZSU[18 + PC()[t].index];
    return (a >>> 0) * 2097152 + ((b >>> 0) & 0x1fffff);
  };
  E.recordPosition = function (st) {
    const h = E.hash(st);
    st.repetition[h] = (st.repetition[h] || 0) + 1;
    return st.repetition[h];
  };

  // ---------------- Spielstatus ----------------
  E.insufficient = function (st) {
    const rest = [];
    for (let s = 0; s < 64; s++) { const p = st.board[s]; if (p && !PC()[p.type].royal) rest.push(p); }
    if (!rest.length) return true;
    if (rest.some(p => PC()[p.type].rarity !== 'standard')) return false;
    return rest.length === 1 && (rest[0].type === 'springer' || rest[0].type === 'laeufer');
  };
  // gibt { moves, result } zurück, result null wenn Spiel weiterläuft
  E.status = function (st) {
    const moves = E.legalMoves(st);
    let result = null;
    if (!moves.length) {
      if (E.inCheck(st, st.turn)) result = { winner: E.opp(st.turn), reason: 'matt' };
      else result = { winner: null, reason: 'patt' };
    } else if (st.halfmove >= 100) result = { winner: null, reason: '50zuege' };
    else if ((st.repetition[E.hash(st)] || 0) >= 3) result = { winner: null, reason: 'wiederholung' };
    else if (E.insufficient(st)) result = { winner: null, reason: 'material' };
    return { moves, result };
  };

  // ---------------- Notation ----------------
  E.moveKey = m => m.kind === 'pass' ? 'pass' : `${m.kind[0]}${m.stype || ''}${m.from}-${m.to}-${m.picks ? m.picks.join('.') : ''}-${m.promo || ''}-${m.data && m.data.type ? m.data.type : ''}`;
  E.san = function (st, m) {
    if (m.kind === 'pass') return '(aussetzen)';
    const n = E.sqName;
    if (m.kind === 'castle') return m.to > m.from ? 'O-O' : 'O-O-O';
    const p = st.board[m.from];
    const def = PC()[p.type];
    if (m.kind === 'special') {
      const sp = def.special;
      let s = `${sp.name} ${def.abbr || ''}${n(m.from)}`;
      if (m.to !== m.from) s += '→' + n(m.to);
      else if (m.picks && m.picks[0] !== m.from) s += '→' + n(m.picks[0]);
      if (m.caps && m.caps.length) s += ' ×' + m.caps.map(q => { const t = st.board[q]; return (t ? (PC()[t.type].abbr || '') : '') + n(q); }).join(',');
      if (m.data && m.data.type) s += ' (' + PC()[m.data.type].name + ')';
      if (m.promo) s += '=' + (PC()[m.promo].abbr || 'B');
      return s;
    }
    let s = (def.abbr || '') + n(m.from) + (m.capture != null ? 'x' : '-') + n(m.to);
    if (m.ep) s += ' e.p.';
    if (m.promo) s += '=' + PC()[m.promo].abbr;
    return s;
  };

  // ---------------- Special-Info für die UI ----------------
  E.specialInfo = function (st, c, legal) {
    const types = new Set();
    for (let s = 0; s < 64; s++) { const p = st.board[s]; if (p && p.color === c) types.add(p.type); }
    return function (type) {
      const lvl = (st.levels[c] && st.levels[c][type]) || 0;
      if (lvl < 1) return { state: 'locked', lvl, reason: 'Im Codex upgraden, um das Special freizuschalten' };
      if (!st.unlimitedSpecials && st.specialsUsed[c].includes(type)) return { state: 'used', lvl, reason: 'In diesem Match schon benutzt' };
      if (!types.has(type)) return { state: 'blocked', lvl, reason: 'Keine Figur dieses Typs mehr auf dem Brett' };
      let anyUnfrozen = false;
      for (let s = 0; s < 64; s++) { const p = st.board[s]; if (p && p.color === c && p.type === type && !p.frozen) anyUnfrozen = true; }
      if (!anyUnfrozen) return { state: 'blocked', lvl, reason: 'Alle Figuren dieses Typs sind eingefroren' };
      if (st.turn !== c) return { state: 'ready', lvl, reason: 'Bereit', waiting: true };
      const lm = (legal || []).filter(m => m.kind === 'special' && m.stype === type);
      if (lm.length) return { state: 'ready', lvl, reason: 'Bereit', moves: lm };
      const ps = [];
      E.genSpecials(st, c, ps, type);
      if (ps.length) return { state: 'blocked', lvl, reason: 'Würde deinen König im Schach lassen' };
      return { state: 'blocked', lvl, reason: 'Gerade kein gültiges Ziel' };
    };
  };

  // ---------------- FEN (nur Standardfiguren) ----------------
  const FEN_MAP = { k: 'koenig', q: 'dame', r: 'turm', b: 'laeufer', n: 'springer', p: 'bauer' };
  E.fromFEN = function (fen, opts) {
    const parts = fen.trim().split(/\s+/);
    const st = E.newGame(Object.assign({ white: {}, black: {} }, opts || {}));
    st.repetition = {};
    const rows = parts[0].split('/');
    for (let i = 0; i < 8; i++) {
      let f = 0;
      for (const ch of rows[i]) {
        if (/\d/.test(ch)) { f += +ch; continue; }
        const r = 7 - i, sq = r * 8 + f;
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        const type = FEN_MAP[ch.toLowerCase()];
        const moved = type === 'bauer' ? r !== (color === 'w' ? 1 : 6) : true;
        st.board[sq] = E.newPiece(st, type, color, moved);
        f++;
      }
    }
    st.turn = parts[1] === 'b' ? 'b' : 'w';
    const cr = parts[2] || '-';
    const unmove = sq => { if (st.board[sq]) st.board[sq].moved = false; };
    if (cr.includes('K')) { unmove(4); unmove(7); }
    if (cr.includes('Q')) { unmove(4); unmove(0); }
    if (cr.includes('k')) { unmove(60); unmove(63); }
    if (cr.includes('q')) { unmove(60); unmove(56); }
    if (parts[3] && parts[3] !== '-') {
      const sq = E.sqFromName(parts[3]);
      st.ep = { sq, victim: sq + (st.turn === 'w' ? -8 : 8) };
    }
    st.halfmove = parseInt(parts[4] || '0', 10);
    E.recordPosition(st);
    return st;
  };

  E.perft = function (st, depth) {
    if (depth === 0) return 1;
    const moves = E.legalMoves(st, { specials: false });
    if (depth === 1) return moves.filter(m => m.kind !== 'pass').length;
    let n = 0;
    for (const m of moves) { E.makeMove(st, m, null); n += E.perft(st, depth - 1); E.unmakeMove(st); }
    return n;
  };

  // ---------------- Material ----------------
  E.material = function (st, c) {
    let v = 0;
    for (let s = 0; s < 64; s++) { const p = st.board[s]; if (p && p.color === c) v += PC()[p.type].value; }
    return v;
  };
})();
