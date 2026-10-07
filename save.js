/* =====================================================================
   GAMBIT JACKPOT - save.js
   Spielstand, Profil, Export/Import, Migration.
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  const C = GJ.CONFIG;
  const S = GJ.Save = {};

  S.key = () => C.saveKey;

  S.defaults = function () {
    const levels = {};
    GJ.PIECE_ORDER.forEach(t => (levels[t] = 0));
    const decks = [];
    for (let i = 0; i < C.deck.slots; i++) decks.push({ name: i === 0 ? 'Klassisch' : 'Deck ' + (i + 1), layout: Object.assign({}, C.CLASSIC_DECK) });
    return {
      version: C.version,
      ep: C.economy.startEP,
      owned: GJ.STANDARD_TYPES.slice(),
      levels,
      decks,
      activeDeck: 0,
      botsBeaten: [],
      firstWins: [],
      stats: { wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0, spins: 0, games: 0 },
      slot: { spinsSinceNew: 0, spinsSinceLegendary: 0 },
      settings: { volume: 0.6, muted: false, animSpeed: 'normal', shake: true, theme: 'sand', coords: true, hints: true, vibrate: true },
      tutorialDone: false,
      match: null,
      selectedBot: 0,
      mp: { names: { w: 'Blau', b: 'Rot' }, decks: { w: Object.assign({}, C.CLASSIC_DECK), b: Object.assign({}, C.CLASSIC_DECK) }, level: C.mp.defaultLevel, budget: C.mp.defaultBudget, rotate: true }
    };
  };

  S.migrate = function (d) {
    const def = S.defaults();
    const out = Object.assign({}, def, d);
    out.levels = Object.assign({}, def.levels, d.levels || {});
    out.stats = Object.assign({}, def.stats, d.stats || {});
    out.slot = Object.assign({}, def.slot, d.slot || {});
    out.settings = Object.assign({}, def.settings, d.settings || {});
    if (!['sand', 'wiese', 'eis'].includes(out.settings.theme)) out.settings.theme = 'sand';
    out.mp = Object.assign({}, def.mp, d.mp || {});
    out.mp.names = Object.assign({}, def.mp.names, (d.mp && d.mp.names) || {});
    out.mp.decks = Object.assign({}, def.mp.decks, (d.mp && d.mp.decks) || {});
    if (!Array.isArray(out.owned)) out.owned = def.owned;
    GJ.STANDARD_TYPES.forEach(t => { if (!out.owned.includes(t)) out.owned.push(t); });
    out.owned = out.owned.filter(t => GJ.PIECES[t]);
    if (!Array.isArray(out.decks)) out.decks = def.decks;
    while (out.decks.length < C.deck.slots) out.decks.push({ name: 'Deck ' + (out.decks.length + 1), layout: Object.assign({}, C.CLASSIC_DECK) });
    out.decks.forEach(dk => { for (const k in dk.layout) if (!out.owned.includes(dk.layout[k])) delete dk.layout[k]; });
    if (out.activeDeck >= out.decks.length) out.activeDeck = 0;
    out.version = C.version;
    return out;
  };

  S.load = function () {
    let d = null;
    try { const raw = localStorage.getItem(S.key()); if (raw) d = JSON.parse(raw); } catch (e) { console.warn('[GJ] Laden fehlgeschlagen', e); }
    S.d = d ? S.migrate(d) : S.defaults();
    return S.d;
  };
  S.save = function () {
    try { localStorage.setItem(S.key(), JSON.stringify(S.d)); } catch (e) { console.warn('[GJ] Speichern fehlgeschlagen', e); }
  };
  S.reset = function () {
    try { localStorage.removeItem(S.key()); } catch (e) { /* egal */ }
    S.d = S.defaults();
    S.save();
  };
  S.exportJSON = () => JSON.stringify(S.d, null, 2);
  S.importJSON = function (txt) {
    const d = JSON.parse(txt);
    if (!d || typeof d !== 'object' || !('ep' in d)) throw new Error('Kein gültiger Spielstand');
    S.d = S.migrate(d);
    S.save();
  };

  // ---------------- EP ----------------
  S.listeners = [];
  S.onEP = fn => S.listeners.push(fn);
  S.addEP = function (n) {
    const old = S.d.ep;
    S.d.ep = Math.max(0, S.d.ep + n);
    S.save();
    S.listeners.forEach(f => f(S.d.ep, old));
  };
  S.spendEP = function (n) {
    if (S.d.ep < n) return false;
    S.addEP(-n);
    return true;
  };

  // ---------------- Figuren & Upgrades ----------------
  S.owns = t => S.d.owned.includes(t);
  S.level = t => S.d.levels[t] || 0;
  S.upgradeCost = function (type) {
    const lvl = S.level(type);
    if (lvl >= 3) return null;
    const base = C.economy.upgradeCost[lvl];
    const f = C.rarity[GJ.PIECES[type].rarity].factor;
    return Math.round(base * f / 10) * 10;
  };
  S.realUpgradeCost = function (type, lvl) {
    const f = C.rarity[GJ.PIECES[type].rarity].factor;
    return Math.round(C.economy.upgradeCost[lvl] * f / 10) * 10;
  };
  S.upgrade = function (type) {
    const cost = S.upgradeCost(type);
    if (cost == null || !S.owns(type)) return false;
    if (!S.spendEP(cost)) return false;
    S.d.levels[type] = S.level(type) + 1;
    S.save();
    return true;
  };
  S.unlock = function (type) {
    if (S.owns(type)) return false;
    S.d.owned.push(type);
    S.save();
    return true;
  };
  S.spinCost = () => C.slot.spinCost;

  // ---------------- Decks ----------------
  S.activeDeck = () => S.d.decks[S.d.activeDeck] || S.d.decks[0];
  S.promoOptions = function () {
    return S.d.owned.filter(t => ['dame', 'turm', 'laeufer', 'springer'].includes(GJ.PIECES[t].cls))
      .sort((a, b) => GJ.PIECES[b].value - GJ.PIECES[a].value);
  };
  S.playerLevels = function () {
    const o = {};
    S.d.owned.forEach(t => (o[t] = S.level(t)));
    return o;
  };

  // ---------------- Bots ----------------
  S.botUnlocked = function (idx) {
    if (idx === 0) return true;
    return S.d.botsBeaten.includes(C.bots[idx - 1].id);
  };
})();
