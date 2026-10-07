/* =====================================================================
   GAMBIT JACKPOT - pieces.js
   Alle 18 Figuren: Bewegung, Werte, Seltenheit, Specials, SVG.
   Neue Figur = neuer Eintrag hier. Engine-Helfer kommen aus GJ.E.
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  const SC = GJ.CONFIG.specials;
  const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  const KING = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const CAMEL = [[3, 1], [1, 3], [-1, 3], [-3, 1], [-3, -1], [-1, -3], [1, -3], [3, -1]];
  const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ALL = ORTH.concat(DIAG);
  GJ.DIRS = { KNIGHT, KING, CAMEL, ORTH, DIAG, ALL };

  const lv = (arr, l) => arr[Math.max(0, Math.min(arr.length - 1, l - 1))];
  const inf = n => (n >= 7 ? 'unbegrenzt' : n);

  // ---------- Helfer für Specials ----------
  function E() { return GJ.E; }
  function sm(st, sq, p, extra) {
    return Object.assign({ kind: 'special', stype: p.type, from: sq, to: sq, picks: [sq], caps: [], affects: [] }, extra);
  }
  function eachInRadius(sq, r, fn) {
    const f0 = sq & 7, r0 = sq >> 3;
    for (let dr = -r; dr <= r; dr++) for (let df = -r; df <= r; df++) {
      if (!df && !dr) continue;
      const f = f0 + df, rr = r0 + dr;
      if (f < 0 || f > 7 || rr < 0 || rr > 7) continue;
      fn(rr * 8 + f);
    }
  }
  function step(sq, d, k) {
    const f = (sq & 7) + d[0] * k, r = (sq >> 3) + d[1] * k;
    if (f < 0 || f > 7 || r < 0 || r > 7) return -1;
    return r * 8 + f;
  }
  GJ.stepSq = step;
  GJ.eachInRadius = eachInRadius;

  // =====================================================================
  //  SVG-Kunst
  // =====================================================================
  const COLLAR = (y, w) => `<rect x="${50 - w / 2}" y="${y}" width="${w}" height="6" rx="3"/>`;
  function gem(r) {
    if (r === 'standard') return '';
    const col = GJ.CONFIG.rarity[r].color;
    return `<path d="M50 76.5 l6 6 -6 6 -6 -6z" fill="${col}" stroke="#14203d" stroke-width="3" stroke-linejoin="round"/>`;
  }
  // Detailfarbe (Augen, Schlitze): immer die dunkle Konturfarbe
  function dc() { return '#14203d'; }

  const ART = {
    bauer: c => `<circle cx="50" cy="27" r="12"/>${COLLAR(42, 26)}<path d="M41 48 Q40 64 31 77 H69 Q60 64 59 48 Z"/>`,
    springer: c => `<path d="M33 77 C33 62 38 55 45 49 C39 50 31 54 26 50 C22 46 26 40 32 36 C39 30 42 22 50 18 L52 9 L58 17 C71 21 77 36 75 52 C74 62 70 70 70 77 Z"/>
      <circle cx="47" cy="29" r="2.6" fill="${dc(c)}" stroke="none"/><path d="M58 22 C66 30 68 44 64 58" fill="none" stroke-width="2"/>`,
    laeufer: c => `<circle cx="50" cy="13" r="5"/><path d="M50 19 C37 29 33 42 39 52 H61 C67 42 63 29 50 19 Z"/>
      <path d="M55 29 L46 41" fill="none" stroke-width="3.5"/>${COLLAR(51, 26)}<path d="M42 57 Q41 68 33 77 H67 Q59 68 58 57 Z"/>`,
    turm: c => `<path d="M29 14 h9 v7 h7 v-7 h10 v7 h7 v-7 h9 v15 l-6 6 v28 l7 9 H28 l7-9 V35 l-6-6 Z"/>
      <path d="M38 40 H62 M38 54 H62" fill="none" stroke-width="2"/>`,
    dame: c => `<circle cx="25" cy="27" r="4"/><circle cx="41" cy="22" r="4"/><circle cx="59" cy="22" r="4"/><circle cx="75" cy="27" r="4"/><circle cx="50" cy="16" r="4.5"/>
      <path d="M25 31 L34 54 L41 26 L50 51 L59 26 L66 54 L75 31 L68 63 H32 Z"/><path d="M33 63 H67 L71 77 H29 Z"/>`,
    koenig: c => `<path d="M46.5 5 h7 v6 h6 v7 h-6 v8 h-7 v-8 h-6 v-7 h6 Z"/>
      <path d="M50 27 C37 27 29 36 33 48 L39 59 H61 L67 48 C71 36 63 27 50 27 Z"/><path d="M37 59 H63 L69 77 H31 Z"/>`,
    spaeher: c => `<path d="M58 32 L80 23 L83 30 L61 38 Z"/><path d="M78 22 L80 31" fill="none" stroke-width="2"/>
      <path d="M35 34 C35 16 65 16 65 34 C65 41 58 47 50 47 C42 47 35 41 35 34 Z"/>
      <ellipse cx="50" cy="35" rx="8" ry="7" fill="${dc(c)}" stroke="none" opacity="0.85"/>
      ${COLLAR(46, 28)}<path d="M41 52 Q40 66 31 77 H69 Q60 66 59 52 Z"/>`,
    lanzentraeger: c => `<path d="M71 86 L82 12" fill="none" stroke-width="5"/><path d="M82 3 L87 16 L77 14 Z"/>
      <path d="M81 15 L95 19 L80 25 Z" fill="${GJ.CONFIG.rarity.selten.color}"/>
      <circle cx="44" cy="27" r="12"/>${COLLAR(42, 26).replace('x="37"', 'x="31"')}<path d="M35 48 Q34 64 25 77 H63 Q54 64 53 48 Z"/>`,
    kamelreiter: c => `<path d="M52 56 C54 44 66 40 74 48 C78 54 76 62 70 64 Z"/>
      <path d="M30 77 C30 63 36 53 43 47 C47 41 46 31 41 25 C38 19 42 12 51 12 C60 12 70 16 75 22 C77 27 72 29 66 27 C60 27 57 31 59 37 C61 45 69 52 70 77 Z"/>
      <circle cx="54" cy="18" r="2.4" fill="${dc(c)}" stroke="none"/><path d="M62 26 C58 34 50 38 44 36" fill="none" stroke-width="2"/>`,
    greif: c => `<path d="M48 52 C34 42 20 42 9 28 C14 48 24 58 40 62 Z"/><path d="M52 52 C66 42 80 42 91 28 C86 48 76 58 60 62 Z"/>
      <path d="M50 17 C60 17 66 25 64 35 L74 39 L63 42 C61 50 56 56 50 60 C44 56 39 48 39 37 C39 25 43 17 50 17 Z"/>
      <circle cx="54" cy="29" r="2.4" fill="${dc(c)}" stroke="none"/><path d="M38 61 H62 L67 77 H33 Z"/>`,
    moench: c => `<path d="M50 13 C37 13 31 26 31 40 C31 54 27 66 25 77 H75 C73 66 69 54 69 40 C69 26 63 13 50 13 Z"/>
      <path d="M50 23 C43 23 40 30 40 37 C40 44 44 46 50 46 C56 46 60 44 60 37 C60 30 57 23 50 23 Z" fill="${dc(c)}" stroke="none" opacity="0.85"/>
      <path d="M70 46 V52" fill="none" stroke-width="2"/><rect x="64" y="52" width="12" height="14" rx="3" fill="#ffd36b"/>`,
    erzmagier: c => `<path d="M76 18 V77" fill="none" stroke-width="4"/><circle cx="76" cy="14" r="7" fill="#c89bff"/>
      <path d="M48 3 L66 40 H32 Z"/><ellipse cx="49" cy="41" rx="23" ry="5"/>
      <path d="M49 18 l2.2 4.6 5 .7 -3.6 3.5 .9 5 -4.5-2.4 -4.5 2.4 .9-5 -3.6-3.5 5-.7z" fill="#ffd36b" stroke="none"/>
      <path d="M37 46 H61 L68 77 H30 Z"/>`,
    golem: c => `<rect x="37" y="11" width="26" height="19" rx="4"/>
      <rect x="42" y="18" width="5" height="4" fill="#7ff7ff" stroke="none"/><rect x="53" y="18" width="5" height="4" fill="#7ff7ff" stroke="none"/>
      <path d="M26 33 H74 L69 62 H31 Z"/><rect x="16" y="35" width="10" height="24" rx="3"/><rect x="74" y="35" width="10" height="24" rx="3"/>
      <rect x="35" y="62" width="30" height="15" rx="2"/><path d="M44 40 L50 48 L56 40 M50 48 V56" fill="none" stroke="#7ff7ff" stroke-width="2"/>`,
    katapult: c => `<path d="M40 50 L76 15" fill="none" stroke-width="6"/><circle cx="79" cy="12" r="7" fill="${dc(c)}"/>
      <path d="M27 77 L31 47 H35 V40 H43 V47 H57 V40 H65 V47 H69 L73 77 Z"/><circle cx="40" cy="52" r="4"/>`,
    hexe: c => `<path d="M48 4 C56 10 61 22 70 32 H28 C38 26 44 14 48 4 Z"/><ellipse cx="49" cy="33" rx="28" ry="5"/>
      <path d="M53 15 a6 6 0 1 0 4 10 a5 5 0 1 1 -4 -10z" fill="#ffd36b" stroke="none"/>
      <circle cx="50" cy="44" r="8"/><path d="M38 52 C41 62 35 70 30 77 H70 C65 70 59 62 62 52 Z"/>`,
    amazone: c => `<path d="M18 22 L82 74 M82 22 L18 74" fill="none" stroke="#dfe6f2" stroke-width="5"/>
      <path d="M38 27 L40 14 L46 22 L50 11 L54 22 L60 14 L62 27 Z"/>
      <path d="M32 58 C30 38 38 27 50 27 C62 27 70 38 68 58 Z"/><path d="M40 42 H60" fill="none" stroke="${dc(c)}" stroke-width="3"/>
      <path d="M36 58 H64 L69 77 H31 Z"/>`,
    waechter: c => `<path d="M46.5 5 h7 v5 h5 v6 h-5 v6 h-7 v-6 h-5 v-6 h5 Z"/>
      <path d="M50 22 C38 22 31 30 35 42 L38 50 H62 L65 42 C69 30 62 22 50 22 Z"/>
      <path d="M28 45 H72 V60 C72 70 62 78 50 85 C38 78 28 70 28 60 Z"/><path d="M50 50 V78 M37 60 H63" fill="none" stroke-width="2.5"/>`,
    kaiser: c => `<path d="M31 30 L35 8 L43 21 L50 4 L57 21 L65 8 L69 30 Z"/><rect x="31" y="30" width="38" height="8" rx="2"/>
      <path d="M50 38 C39 38 33 44 36 52 L40 60 H60 L64 52 C67 44 61 38 50 38 Z"/><path d="M37 60 H63 L69 77 H31 Z"/>
      <g fill="#6fbf5a" stroke="none"><ellipse cx="27" cy="40" rx="3" ry="6" transform="rotate(-25 27 40)"/><ellipse cx="25" cy="52" rx="3" ry="6" transform="rotate(-10 25 52)"/>
      <ellipse cx="73" cy="40" rx="3" ry="6" transform="rotate(25 73 40)"/><ellipse cx="75" cy="52" rx="3" ry="6" transform="rotate(10 75 52)"/></g>`
  };

  // Spielfiguren im Cel-Shading-Stil: Teamfarbe (Blau = Weiß, Rot = Schwarz),
  // dicke dunkle Kontur, harte Schattenkante, Sockel. Meisterstufe = goldener Sockel + Stern.
  function svgFor(type, color, master) {
    const def = GJ.PIECES[type];
    const team = color === 'w' ? 'blue' : 'red';
    const baseFill = master ? '#ffc83d' : (color === 'w' ? '#1f4fa3' : '#9e2a22');
    return `<svg viewBox="0 0 100 100" class="pc-svg${master ? ' master' : ''}" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="50" cy="92" rx="31" ry="5.5" fill="#14203d" opacity=".28"/>` +
      `<g fill="url(#gj-${team})" stroke="#14203d" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">` + ART[type](color) + '</g>' +
      `<rect x="17" y="75" width="66" height="14" rx="6" fill="${baseFill}" stroke="#14203d" stroke-width="4.5"/>` +
      `<rect x="23" y="78.5" width="20" height="3.2" rx="1.6" fill="#fff" opacity=".5"/>` +
      gem(def.rarity) +
      (master ? `<path d="M82 6 l3.2 6.5 7.2 1 -5.2 5 1.2 7.1 -6.4-3.4 -6.4 3.4 1.2-7.1 -5.2-5 7.2-1z" fill="#ffc83d" stroke="#14203d" stroke-width="3" stroke-linejoin="round"/>` : '') +
      '</svg>';
  }

  // =====================================================================
  //  Figuren-Definitionen
  // =====================================================================
  const P = {};

  // ---------- 1. Bauer ----------
  P.bauer = {
    name: 'Bauer', abbr: '', cls: 'bauer', rarity: 'standard', value: 1, cost: 1, royal: false,
    move: { pawn: {} },
    moveText: 'Zieht 1 Feld vorwärts (von der 2. Reihe aus auch 2), schlägt diagonal vorwärts. En passant und Umwandlung.',
    special: {
      name: 'Traktor-Rammstoß', anim: 'tractor',
      desc: () => {
        const s = SC.bauer;
        return [
          `Fährt mit dem Traktor bis zu ${s.range[0]} Felder geradeaus und mäht die erste gegnerische Figur um.`,
          `Reichweite ${s.range[1]} Felder.`,
          `Reichweite ${s.range[2]} Felder, nach dem ersten Treffer fährt er weiter und kann eine zweite Figur umwemsen.`
        ];
      },
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color, f = e.fwd(c), R = lv(SC.bauer.range, l), second = lv(SC.bauer.secondHit, l);
        const caps = [];
        for (let k = 1; k <= R; k++) {
          const s = step(sq, [0, f], k);
          if (s < 0) break;
          const t = st.board[s];
          if (t) {
            if (!e.targetable(t, c)) break;
            caps.push(s);
          }
          e.pushPromoVariants(st, c, s, sm(st, sq, p, { to: s, picks: [s], caps: caps.slice(), affects: caps.slice() }), out);
          if (t && !(second && caps.length < 2)) break;
          if (caps.length >= 2) break;
        }
      },
      apply(st, m, fx) {
        const e = E();
        for (const s of m.caps) e.capture(st, s, fx, 'knock');
        e.movePiece(st, m.from, m.to, fx);
        if (m.promo) e.promote(st, m.to, m.promo, fx);
      },
      reach(l) { const o = []; for (let k = 1; k <= lv(SC.bauer.range, l); k++) o.push([0, k]); return o; }
    },
    svg: (c, m) => svgFor('bauer', c, m)
  };

  // ---------- 2. Springer ----------
  P.springer = {
    name: 'Springer', abbr: 'S', cls: 'springer', rarity: 'standard', value: 3, cost: 3, royal: false,
    move: { leaps: KNIGHT },
    moveText: 'Springt im L: 2 Felder in eine Richtung, 1 Feld zur Seite. Springt über Figuren.',
    special: {
      name: 'Doppelsprung', anim: 'doublejump',
      desc: () => [
        'Zwei Springersprünge in einem Zug. Der erste muss auf ein leeres Feld, der zweite darf schlagen.',
        'Beide Sprünge dürfen schlagen.',
        'Bis zu drei Sprünge, jeder darf schlagen (maximal 2 Schläge).'
      ],
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color, S = SC.springer;
        const maxJ = lv(S.jumps, l), firstCap = lv(S.firstCanCapture, l), maxCaps = lv(S.maxCaps, l);
        const rec = (pos, path, caps) => {
          for (const v of KNIGHT) {
            const to = step(pos, v, 1);
            if (to < 0) continue;
            const occ = (to === sq || caps.includes(to)) ? null : st.board[to];
            let ncaps = caps;
            if (occ) {
              if (!e.targetable(occ, c)) continue;
              if (path.length === 0 && !firstCap) continue;
              if (caps.length >= maxCaps) continue;
              ncaps = caps.concat(to);
            }
            const np = path.concat(to);
            if (np.length >= 2 && to !== sq) out.push(sm(st, sq, p, { to, picks: np, caps: ncaps, affects: ncaps.slice() }));
            if (np.length < maxJ) rec(to, np, ncaps);
          }
        };
        rec(sq, [], []);
      },
      apply(st, m, fx) {
        const e = E();
        for (const s of m.picks) if (m.caps.includes(s)) e.capture(st, s, fx);
        e.movePiece(st, m.from, m.to, fx);
      },
      reach() { return KNIGHT.slice(); }
    },
    svg: (c, m) => svgFor('springer', c, m)
  };

  // ---------- 3. Läufer ----------
  P.laeufer = {
    name: 'Läufer', abbr: 'L', cls: 'laeufer', rarity: 'standard', value: 3.25, cost: 3, royal: false,
    move: { rides: { dirs: DIAG, max: 7 } },
    moveText: 'Zieht beliebig weit diagonal.',
    special: {
      name: 'Heiliger Strahl', anim: 'beam',
      desc: () => {
        const s = SC.laeufer;
        return [
          `Bleibt stehen und feuert einen Lichtstrahl diagonal. Zerstört die erste gegnerische Figur innerhalb von ${s.range[0]} Feldern.`,
          `Reichweite ${inf(s.range[1])}.`,
          `Reichweite ${inf(s.range[2])}, der Strahl durchdringt und trifft bis zu ${s.hits[2]} Figuren.`
        ];
      },
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color, R = lv(SC.laeufer.range, l), H = lv(SC.laeufer.hits, l);
        for (const d of DIAG) {
          const hits = []; let end = sq;
          for (let k = 1; k <= R; k++) {
            const s = step(sq, d, k);
            if (s < 0) break;
            end = s;
            const t = st.board[s];
            if (!t) continue;
            if (!e.targetable(t, c)) break;
            hits.push(s);
            if (hits.length >= H) break;
          }
          if (hits.length) out.push(sm(st, sq, p, { picks: [hits[0]], caps: hits, affects: hits.slice(), data: { end, dir: d } }));
        }
      },
      apply(st, m, fx) { for (const s of m.caps) E().capture(st, s, fx, 'dissolve'); },
      reach(l) { const o = []; const R = Math.min(3, lv(SC.laeufer.range, l)); for (const d of DIAG) for (let k = 1; k <= R; k++) o.push([d[0] * k, d[1] * k]); return o; }
    },
    svg: (c, m) => svgFor('laeufer', c, m)
  };

  // ---------- 4. Turm ----------
  P.turm = {
    name: 'Turm', abbr: 'T', cls: 'turm', rarity: 'standard', value: 5, cost: 5, royal: false,
    move: { rides: { dirs: ORTH, max: 7 } },
    moveText: 'Zieht beliebig weit gerade (waagrecht oder senkrecht). Rochade.',
    special: {
      name: 'Rammbock', anim: 'ram',
      desc: () => {
        const s = SC.turm;
        return [
          `Fährt bis zu ${s.range[0]} Felder gerade und schlägt alle gegnerischen Figuren auf dem Weg (max. ${s.maxCaps[0]}).`,
          `Reichweite ${s.range[1]}, max. ${s.maxCaps[1]} Figuren.`,
          `Reichweite ${inf(s.range[2])}, max. ${s.maxCaps[2]} Figuren.`
        ];
      },
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color, R = lv(SC.turm.range, l), N = lv(SC.turm.maxCaps, l);
        for (const d of ORTH) {
          const caps = [];
          for (let k = 1; k <= R; k++) {
            const s = step(sq, d, k);
            if (s < 0) break;
            const t = st.board[s];
            if (t) {
              if (!e.targetable(t, c)) break;
              if (caps.length >= N) break;
              caps.push(s);
            }
            if (caps.length) out.push(sm(st, sq, p, { to: s, picks: [s], caps: caps.slice(), affects: caps.slice() }));
          }
        }
      },
      apply(st, m, fx) {
        const e = E();
        for (const s of m.caps) e.capture(st, s, fx, 'knock');
        e.movePiece(st, m.from, m.to, fx);
      },
      reach(l) { const o = []; const R = Math.min(3, lv(SC.turm.range, l)); for (const d of ORTH) for (let k = 1; k <= R; k++) o.push([d[0] * k, d[1] * k]); return o; }
    },
    svg: (c, m) => svgFor('turm', c, m)
  };

  // ---------- 5. Dame ----------
  P.dame = {
    name: 'Dame', abbr: 'D', cls: 'dame', rarity: 'standard', value: 9, cost: 9, royal: false,
    move: { rides: { dirs: ALL, max: 7 } },
    moveText: 'Zieht beliebig weit gerade oder diagonal.',
    special: {
      name: 'Frostnova', anim: 'frost',
      desc: () => {
        const s = SC.dame;
        return [
          `Bleibt stehen. Alle gegnerischen Figuren im Radius ${s.radius[0]} werden ${s.dur[0]} Zug eingefroren.`,
          `Radius ${s.radius[1]}, ${s.dur[1]} Zug.`,
          `Radius ${s.radius[2]}, ${s.dur[2]} Züge.`
        ];
      },
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color, R = lv(SC.dame.radius, l); const aff = [];
        eachInRadius(sq, R, s => { const t = st.board[s]; if (t && e.targetable(t, c)) aff.push(s); });
        if (aff.length) out.push(sm(st, sq, p, { affects: aff, data: { radius: R, dur: lv(SC.dame.dur, l) } }));
      },
      apply(st, m, fx) { for (const s of m.affects) E().freeze(st, s, m.data.dur, fx); },
      reach(l) { const o = []; const R = lv(SC.dame.radius, l); for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) if (x || y) o.push([x, y]); return o; }
    },
    svg: (c, m) => svgFor('dame', c, m)
  };

  // ---------- 6. König ----------
  P.koenig = {
    name: 'König', abbr: 'K', cls: 'koenig', rarity: 'standard', value: 0, cost: 0, royal: true,
    move: { leaps: KING },
    moveText: 'Zieht 1 Feld in jede Richtung. Rochade. Darf nie ins Schach ziehen.',
    special: {
      name: 'Königstausch', anim: 'swap',
      desc: () => {
        const s = SC.koenig;
        return [
          `Tauscht den Platz mit einer eigenen Figur im Radius ${s.radius[0]}.`,
          'Tausch mit jeder eigenen Figur auf dem Brett.',
          'Tausch mit jeder eigenen Figur, die getauschte Figur bekommt 1 Zug Schild.'
        ];
      },
      generate(st, sq, p, l, out) {
        const c = p.color, R = lv(SC.koenig.radius, l);
        eachInRadius(sq, R, s => { const t = st.board[s]; if (t && t.color === c && !GJ.PIECES[t.type].royal) out.push(sm(st, sq, p, { to: s, picks: [s], affects: [s], data: { shield: lv(SC.koenig.shieldSwapped, l) } })); });
      },
      apply(st, m, fx) { E().swapPieces(st, m.from, m.to, m.data.shield, fx); },
      reach(l) { const o = []; const R = Math.min(3, lv(SC.koenig.radius, l)); for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) if (x || y) o.push([x, y]); return o; }
    },
    svg: (c, m) => svgFor('koenig', c, m)
  };

  // ---------- 7. Späher ----------
  P.spaeher = {
    name: 'Späher', abbr: 'Sp', cls: 'bauer', rarity: 'gewoehnlich', value: 1.5, cost: 2, royal: false,
    move: { pawn: { sideStep: true } },
    moveText: 'Wie ein Bauer, darf zusätzlich 1 Feld seitwärts auf ein leeres Feld ziehen (ohne Schlagen).',
    special: {
      name: 'Rauchbombe', anim: 'smoke',
      desc: () => {
        const s = SC.spaeher;
        return [
          `Alle eigenen Figuren im Radius ${s.radius[0]} (inkl. Späher) erhalten ${s.dur[0]} Zug Schild.`,
          `Radius ${s.radius[1]}, ${s.dur[1]} Züge Schild.`,
          `Radius ${s.radius[2]}, ${s.dur[2]} Züge Schild.`
        ];
      },
      generate(st, sq, p, l, out) {
        const c = p.color, R = lv(SC.spaeher.radius, l); const aff = [sq];
        eachInRadius(sq, R, s => { const t = st.board[s]; if (t && t.color === c && !GJ.PIECES[t.type].royal) aff.push(s); });
        out.push(sm(st, sq, p, { affects: aff, data: { radius: R, dur: lv(SC.spaeher.dur, l) } }));
      },
      apply(st, m, fx) { for (const s of m.affects) E().shieldPiece(st, s, m.data.dur, fx); },
      reach(l) { const o = []; const R = lv(SC.spaeher.radius, l); for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) o.push([x, y]); return o; }
    },
    svg: (c, m) => svgFor('spaeher', c, m)
  };

  // ---------- 8. Lanzenträger ----------
  P.lanzentraeger = {
    name: 'Lanzenträger', abbr: 'La', cls: 'bauer', rarity: 'selten', value: 1.8, cost: 2, royal: false,
    move: { pawn: { straightCapture: true } },
    moveText: 'Wie ein Bauer, schlägt zusätzlich 1 Feld gerade vorwärts.',
    special: {
      name: 'Lanzenwurf', anim: 'lance',
      desc: () => {
        const s = SC.lanzentraeger;
        return [
          `Bleibt stehen und schlägt eine gegnerische Figur genau ${s.minDist} Felder geradeaus (überspringt alles dazwischen).`,
          `Entfernung ${s.minDist} bis ${s.maxDist[1]}, gerade oder diagonal vorwärts.`,
          `Entfernung ${s.minDist} bis ${s.maxDist[2]} in alle 3 Vorwärtsrichtungen.`
        ];
      },
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color, f = e.fwd(c), S = SC.lanzentraeger;
        const dirs = lv(S.diag, l) ? [[0, f], [-1, f], [1, f]] : [[0, f]];
        for (const d of dirs) for (let k = S.minDist; k <= lv(S.maxDist, l); k++) {
          const s = step(sq, d, k);
          if (s < 0) break;
          const t = st.board[s];
          if (t && e.targetable(t, c)) out.push(sm(st, sq, p, { picks: [s], caps: [s], affects: [s] }));
        }
      },
      apply(st, m, fx) { E().capture(st, m.caps[0], fx); },
      reach(l) { const S = SC.lanzentraeger, o = []; const dirs = lv(S.diag, l) ? [[0, 1], [-1, 1], [1, 1]] : [[0, 1]]; for (const d of dirs) for (let k = S.minDist; k <= Math.min(3, lv(S.maxDist, l)); k++) o.push([d[0] * k, d[1] * k]); return o; }
    },
    svg: (c, m) => svgFor('lanzentraeger', c, m)
  };

  // ---------- 9. Kamelreiter ----------
  P.kamelreiter = {
    name: 'Kamelreiter', abbr: 'Ka', cls: 'springer', rarity: 'gewoehnlich', value: 2.5, cost: 3, royal: false,
    move: { leaps: CAMEL },
    moveText: 'Springt 3 Felder in eine Richtung und 1 zur Seite. Springt über Figuren.',
    special: {
      name: 'Wüstensturm', anim: 'sandstorm',
      desc: () => {
        const s = SC.kamelreiter;
        return [
          `Schiebt alle angrenzenden gegnerischen Figuren ${s.dist[0]} Feld vom Kamel weg.`,
          `Schiebt bis zu ${s.dist[1]} Felder weit.`,
          `Schiebt ${s.dist[2]} Felder, wer gegen eine Figur oder den Rand prallt, wird zerstört.`
        ];
      },
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color; const aff = [];
        eachInRadius(sq, 1, s => { const t = st.board[s]; if (t && e.targetable(t, c)) aff.push(s); });
        if (aff.length) out.push(sm(st, sq, p, { affects: aff, data: { dist: lv(SC.kamelreiter.dist, l), crush: lv(SC.kamelreiter.crush, l) } }));
      },
      apply(st, m, fx) {
        const e = E(), c = st.board[m.from].color;
        for (const d of KING) {
          const s = step(m.from, d, 1);
          if (s < 0) continue;
          const t = st.board[s];
          if (!t || !e.targetable(t, c)) continue;
          let pos = s, blocked = false;
          for (let k = 1; k <= m.data.dist; k++) {
            const n = step(pos, d, 1);
            if (n < 0 || st.board[n]) { blocked = true; break; }
            pos = n;
          }
          if (pos !== s) e.movePiece(st, s, pos, fx, 'push');
          if (blocked && m.data.crush) e.capture(st, pos, fx, 'crush');
          else e.autoPromote(st, pos, fx);
        }
      },
      reach() { return KING.slice(); }
    },
    svg: (c, m) => svgFor('kamelreiter', c, m)
  };

  // ---------- 10. Greif ----------
  P.greif = {
    name: 'Greif', abbr: 'Gr', cls: 'springer', rarity: 'episch', value: 5, cost: 5, royal: false,
    move: { leaps: KNIGHT.concat(KING) },
    moveText: 'Springt wie ein Springer oder zieht 1 Feld in jede Richtung.',
    special: {
      name: 'Sturzflug', anim: 'dive',
      desc: () => {
        const s = SC.greif;
        return [
          `Fliegt auf ein beliebiges Feld im Radius ${s.radius[0]} (ignoriert Blockaden) und darf dort schlagen.`,
          `Radius ${s.radius[1]}.`,
          `Radius ${s.radius[2]}, gegnerische Bauern-Klasse neben dem Landefeld wird 1 Zug eingefroren.`
        ];
      },
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color, R = lv(SC.greif.radius, l), fz = lv(SC.greif.freezePawns, l);
        eachInRadius(sq, R, s => {
          const t = st.board[s];
          if (!t) out.push(sm(st, sq, p, { to: s, picks: [s], data: { freeze: fz } }));
          else if (e.targetable(t, c)) out.push(sm(st, sq, p, { to: s, picks: [s], caps: [s], affects: [s], data: { freeze: fz } }));
        });
      },
      apply(st, m, fx) {
        const e = E(), c = st.board[m.from].color;
        if (m.caps.length) e.capture(st, m.caps[0], fx);
        e.movePiece(st, m.from, m.to, fx, 'fly');
        if (m.data.freeze) eachInRadius(m.to, 1, s => { const t = st.board[s]; if (t && e.targetable(t, c) && GJ.PIECES[t.type].cls === 'bauer') e.freeze(st, s, 1, fx); });
      },
      reach(l) { const o = []; const R = Math.min(3, lv(SC.greif.radius, l)); for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) if (x || y) o.push([x, y]); return o; }
    },
    svg: (c, m) => svgFor('greif', c, m)
  };

  // ---------- 11. Mönch ----------
  P.moench = {
    name: 'Mönch', abbr: 'Mö', cls: 'laeufer', rarity: 'gewoehnlich', value: 2.8, cost: 3, royal: false,
    move: { rides: { dirs: DIAG, max: 3 }, leaps: ORTH },
    moveText: 'Zieht diagonal bis zu 3 Felder oder 1 Feld gerade.',
    special: {
      name: 'Bekehrung', anim: 'convert',
      desc: () => {
        const s = SC.moench;
        return [
          'Eine angrenzende gegnerische Figur der Bauern-Klasse wechselt auf deine Seite.',
          `Eine angrenzende gegnerische Figur mit Wert bis ${s.maxValue[1]} wechselt die Seite.`,
          `Wert bis ${s.maxValue[2]}, Radius ${s.radius[2]}.`
        ];
      },
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color, S = SC.moench, R = lv(S.radius, l), pawnOnly = lv(S.pawnOnly, l), maxV = lv(S.maxValue, l);
        eachInRadius(sq, R, s => {
          const t = st.board[s];
          if (!t || !e.targetable(t, c)) return;
          const d = GJ.PIECES[t.type];
          if (pawnOnly ? d.cls !== 'bauer' : d.value > maxV) return;
          out.push(sm(st, sq, p, { picks: [s], affects: [s] }));
        });
      },
      apply(st, m, fx) { E().convertPiece(st, m.affects[0], st.board[m.from].color, fx); },
      reach(l) { const o = []; const R = lv(SC.moench.radius, l); for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) if (x || y) o.push([x, y]); return o; }
    },
    svg: (c, m) => svgFor('moench', c, m)
  };

  // ---------- 12. Erzmagier ----------
  P.erzmagier = {
    name: 'Erzmagier', abbr: 'Em', cls: 'laeufer', rarity: 'episch', value: 7, cost: 7, royal: false,
    move: { rides: { dirs: DIAG, max: 7 }, leaps: KNIGHT },
    moveText: 'Zieht wie Läufer oder springt wie Springer.',
    special: {
      name: 'Kettenblitz', anim: 'bolt',
      desc: () => {
        const s = SC.erzmagier;
        return [
          `Zerstört eine gegnerische Figur im Radius ${s.radius[0]}.`,
          `Radius ${s.radius[1]}.`,
          `Radius ${s.radius[2]}, der Blitz springt zusätzlich auf die wertvollste angrenzende gegnerische Figur über.`
        ];
      },
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color, R = lv(SC.erzmagier.radius, l), chain = lv(SC.erzmagier.chain, l);
        eachInRadius(sq, R, s => {
          const t = st.board[s];
          if (!t || !e.targetable(t, c)) return;
          const caps = [s];
          if (chain) {
            let best = -1, bv = -1;
            eachInRadius(s, 1, s2 => { const t2 = st.board[s2]; if (t2 && e.targetable(t2, c)) { const v = GJ.PIECES[t2.type].value; if (v > bv) { bv = v; best = s2; } } });
            if (best >= 0) caps.push(best);
          }
          out.push(sm(st, sq, p, { picks: [s], caps, affects: caps.slice() }));
        });
      },
      apply(st, m, fx) { for (const s of m.caps) E().capture(st, s, fx, 'burn'); },
      reach(l) { const o = []; const R = lv(SC.erzmagier.radius, l); for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) if (x || y) o.push([x, y]); return o; }
    },
    svg: (c, m) => svgFor('erzmagier', c, m)
  };

  // ---------- 13. Golem ----------
  P.golem = {
    name: 'Golem', abbr: 'Go', cls: 'turm', rarity: 'gewoehnlich', value: 3.5, cost: 4, royal: false,
    move: { rides: { dirs: ORTH, max: 2 }, leaps: KING },
    moveText: 'Zieht gerade bis zu 2 Felder oder 1 Feld in jede Richtung. Kann rochieren.',
    special: {
      name: 'Erdstampfer', anim: 'stomp',
      desc: () => {
        const s = SC.golem;
        return [
          'Angrenzende gegnerische Figuren werden 1 Zug eingefroren, gegnerische Bauern-Klasse daneben wird zerstört.',
          `Einfrieren im Radius ${s.freezeRadius[1]} (Zerstören weiter nur direkt daneben).`,
          `Radius ${s.freezeRadius[2]}, Einfrieren ${s.dur[2]} Züge.`
        ];
      },
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color, S = SC.golem, R = lv(S.freezeRadius, l); const aff = [], caps = [];
        eachInRadius(sq, R, s => {
          const t = st.board[s];
          if (!t || !e.targetable(t, c)) return;
          aff.push(s);
          if (e.cheb(sq, s) <= S.crushRadius && GJ.PIECES[t.type].cls === 'bauer') caps.push(s);
        });
        if (aff.length) out.push(sm(st, sq, p, { caps, affects: aff, data: { dur: lv(S.dur, l), radius: R } }));
      },
      apply(st, m, fx) {
        const e = E();
        for (const s of m.affects) { if (m.caps.includes(s)) e.capture(st, s, fx, 'crush'); else e.freeze(st, s, m.data.dur, fx); }
      },
      reach(l) { const o = []; const R = lv(SC.golem.freezeRadius, l); for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) if (x || y) o.push([x, y]); return o; }
    },
    svg: (c, m) => svgFor('golem', c, m)
  };

  // ---------- 14. Katapult ----------
  P.katapult = {
    name: 'Katapult', abbr: 'Kt', cls: 'turm', rarity: 'selten', value: 4.5, cost: 5, royal: false,
    move: { cannon: true },
    moveText: 'Zieht gerade wie ein Turm, aber nur auf leere Felder. Schlägt nur, indem es genau eine Figur überspringt. Kann rochieren.',
    special: {
      name: 'Feuerball', anim: 'fireball',
      desc: () => {
        const s = SC.katapult;
        return [
          `Schießt im Bogen auf eine gegnerische Figur ${s.minDist} bis ${s.maxDist[0]} Felder entfernt (gerade oder diagonal, ignoriert Blockaden).`,
          `Entfernung ${s.minDist} bis ${s.maxDist[1]}.`,
          `Entfernung ${s.minDist} bis ${s.maxDist[2]}, gegnerische Bauern-Klasse neben dem Einschlag wird mitzerstört.`
        ];
      },
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color, S = SC.katapult, mx = lv(S.maxDist, l), splash = lv(S.splash, l);
        for (const d of ALL) for (let k = S.minDist; k <= mx; k++) {
          const s = step(sq, d, k);
          if (s < 0) break;
          const t = st.board[s];
          if (!t || !e.targetable(t, c)) continue;
          const caps = [s];
          if (splash) eachInRadius(s, 1, s2 => { const t2 = st.board[s2]; if (t2 && e.targetable(t2, c) && GJ.PIECES[t2.type].cls === 'bauer') caps.push(s2); });
          out.push(sm(st, sq, p, { picks: [s], caps, affects: caps.slice(), data: { main: s } }));
        }
      },
      apply(st, m, fx) { for (const s of m.caps) E().capture(st, s, fx, 'burn'); },
      reach(l) { const S = SC.katapult, o = []; for (const d of ALL) for (let k = S.minDist; k <= Math.min(3, lv(S.maxDist, l)); k++) o.push([d[0] * k, d[1] * k]); return o; }
    },
    svg: (c, m) => svgFor('katapult', c, m)
  };

  // ---------- 15. Hexe ----------
  P.hexe = {
    name: 'Hexe', abbr: 'He', cls: 'dame', rarity: 'episch', value: 6, cost: 6, royal: false,
    move: { rides: { dirs: ALL, max: 4 } },
    moveText: 'Zieht wie eine Dame, aber höchstens 4 Felder weit.',
    special: {
      name: 'Verwandlung', anim: 'polymorph',
      desc: () => {
        const s = SC.hexe;
        return [
          `Verwandelt eine gegnerische Figur in freier Damenlinie (bis ${s.range[0]} Felder) in einen Bauern. Nicht auf Reihe 1 oder 8.`,
          'Reichweite unbegrenzt.',
          'Reichweite unbegrenzt, der neue Bauer ist zusätzlich 1 Zug eingefroren.'
        ];
      },
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color, R = lv(SC.hexe.range, l), fz = lv(SC.hexe.freeze, l);
        for (const d of ALL) for (let k = 1; k <= R; k++) {
          const s = step(sq, d, k);
          if (s < 0) break;
          const t = st.board[s];
          if (!t) continue;
          const r = s >> 3;
          if (e.targetable(t, c) && t.type !== 'bauer' && r !== 0 && r !== 7) out.push(sm(st, sq, p, { picks: [s], affects: [s], data: { freeze: fz } }));
          break;
        }
      },
      apply(st, m, fx) { E().transformPiece(st, m.affects[0], 'bauer', m.data.freeze, fx); },
      reach(l) { const o = []; const R = Math.min(3, lv(SC.hexe.range, l)); for (const d of ALL) for (let k = 1; k <= R; k++) o.push([d[0] * k, d[1] * k]); return o; }
    },
    svg: (c, m) => svgFor('hexe', c, m)
  };

  // ---------- 16. Amazone ----------
  P.amazone = {
    name: 'Amazone', abbr: 'Am', cls: 'dame', rarity: 'legendaer', value: 12, cost: 12, royal: false,
    move: { rides: { dirs: ALL, max: 7 }, leaps: KNIGHT },
    moveText: 'Zieht wie eine Dame oder springt wie ein Springer.',
    special: {
      name: 'Klingenwirbel', anim: 'blades',
      desc: () => {
        const s = SC.amazone;
        return [
          `Bleibt stehen und schlägt die ${s.max[0]} wertvollsten angrenzenden gegnerischen Figuren.`,
          `Bis zu ${s.max[1]} Figuren.`,
          'Alle angrenzenden gegnerischen Figuren.'
        ];
      },
      generate(st, sq, p, l, out) {
        const e = E(), c = p.color, N = lv(SC.amazone.max, l); const cand = [];
        eachInRadius(sq, 1, s => { const t = st.board[s]; if (t && e.targetable(t, c)) cand.push(s); });
        if (!cand.length) return;
        cand.sort((a, b) => GJ.PIECES[st.board[b].type].value - GJ.PIECES[st.board[a].type].value || a - b);
        const caps = cand.slice(0, N);
        out.push(sm(st, sq, p, { caps, affects: caps.slice() }));
      },
      apply(st, m, fx) { for (const s of m.caps) E().capture(st, s, fx, 'slash'); },
      reach() { return KING.slice(); }
    },
    svg: (c, m) => svgFor('amazone', c, m)
  };

  // ---------- 17. Wächter ----------
  P.waechter = {
    name: 'Wächter', abbr: 'Wä', cls: 'koenig', rarity: 'selten', value: 0, cost: 0, royal: true,
    move: { leaps: KING, extra: 'waechter' },
    moveText: 'Wie ein König, darf zusätzlich 2 Felder gerade auf ein leeres Feld ziehen, wenn das Feld dazwischen leer und nicht angegriffen ist.',
    special: {
      name: 'Bollwerk', anim: 'bulwark',
      desc: () => {
        const s = SC.waechter;
        return [
          `Alle eigenen Figuren im Radius ${s.radius[0]} erhalten ${s.dur[0]} Züge Schild.`,
          `Radius ${s.radius[1]}, ${s.dur[1]} Züge.`,
          `Radius ${s.radius[2]}, ${s.dur[2]} Züge.`
        ];
      },
      generate(st, sq, p, l, out) {
        const c = p.color, R = lv(SC.waechter.radius, l); const aff = [];
        eachInRadius(sq, R, s => { const t = st.board[s]; if (t && t.color === c && !GJ.PIECES[t.type].royal) aff.push(s); });
        if (aff.length) out.push(sm(st, sq, p, { affects: aff, data: { radius: R, dur: lv(SC.waechter.dur, l) } }));
      },
      apply(st, m, fx) { for (const s of m.affects) E().shieldPiece(st, s, m.data.dur, fx); },
      reach(l) { const o = []; const R = lv(SC.waechter.radius, l); for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) if (x || y) o.push([x, y]); return o; }
    },
    svg: (c, m) => svgFor('waechter', c, m)
  };

  // ---------- 18. Kaiser ----------
  P.kaiser = {
    name: 'Kaiser', abbr: 'Ks', cls: 'koenig', rarity: 'legendaer', value: 0, cost: 0, royal: true,
    move: { leaps: KING.concat(KNIGHT) },
    moveText: 'Wie ein König, darf zusätzlich wie ein Springer springen.',
    special: {
      name: 'Ruf der Legion', anim: 'revive',
      desc: () => {
        const s = SC.kaiser;
        return [
          `Belebt eine eigene geschlagene Figur mit Wert bis ${s.maxValue[0]} wieder (Grundreihe, Bauern-Klasse auf Reihe 2).`,
          `Wert bis ${s.maxValue[1]}.`,
          'Jede geschlagene Figur.'
        ];
      },
      generate(st, sq, p, l, out) {
        const c = p.color, maxV = lv(SC.kaiser.maxValue, l);
        const types = [...new Set(st.captured[c])].filter(t => GJ.PIECES[t] && !GJ.PIECES[t].royal && GJ.PIECES[t].value <= maxV);
        for (const type of types) {
          const pawn = GJ.PIECES[type].cls === 'bauer';
          const row = pawn ? (c === 'w' ? 1 : 6) : (c === 'w' ? 0 : 7);
          for (let f = 0; f < 8; f++) {
            const s = row * 8 + f;
            if (!st.board[s]) out.push(sm(st, sq, p, { picks: [s], affects: [s], data: { type }, label: GJ.PIECES[type].name }));
          }
        }
      },
      apply(st, m, fx) { E().revivePiece(st, m.picks[0], st.board[m.from].color, m.data.type, fx); },
      reach() { return []; }
    },
    svg: (c, m) => svgFor('kaiser', c, m)
  };

  // ---------- Vorberechnung ----------
  const ORDER = ['bauer', 'springer', 'laeufer', 'turm', 'dame', 'koenig',
    'spaeher', 'lanzentraeger', 'kamelreiter', 'greif', 'moench', 'erzmagier',
    'golem', 'katapult', 'hexe', 'amazone', 'waechter', 'kaiser'];
  ORDER.forEach((k, i) => {
    const d = P[k];
    d.key = k; d.index = i;
    const set = new Set();
    (d.move.leaps || []).forEach(v => set.add((v[1] + 8) * 17 + (v[0] + 8)));
    d.move.leapSet = set;
    if (d.move.rides) {
      d.move.rideSet = new Set(d.move.rides.dirs.map(v => (v[1] + 1) * 3 + (v[0] + 1)));
    }
  });

  GJ.PIECES = P;
  GJ.PIECE_ORDER = ORDER;
  GJ.STANDARD_TYPES = ORDER.slice(0, 6);
  GJ.NEW_TYPES = ORDER.slice(6);
  GJ.CLASS_NAMES = { bauer: 'Bauer', springer: 'Springer', laeufer: 'Läufer', turm: 'Turm', dame: 'Dame', koenig: 'König' };
  GJ.svgFor = svgFor;
  GJ.lv = lv;
})();
