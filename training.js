/* =====================================================================
   GAMBIT JACKPOT - training.js
   Trainingsplatz: Figuren und Decks ausprobieren. Beide Seiten sind
   spielbar, Specials unbegrenzt, Züge lassen sich zurücknehmen.
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  const C = GJ.CONFIG;
  const T = GJ.Training = {};
  // Jede Figur hat hier mindestens Stufe 1, damit jedes Special testbar ist
  T.levels = function () {
    const lv = {};
    GJ.PIECE_ORDER.forEach(t => (lv[t] = Math.max(1, GJ.Save.level(t))));
    return { w: Object.assign({}, lv), b: Object.assign({}, lv) };
  };
  // opts: { piece } | { white, black }
  T.open = function (opts) {
    opts = opts || {};
    let white = Object.assign({}, C.CLASSIC_DECK), black = Object.assign({}, C.CLASSIC_DECK);
    if (opts.piece) {
      const royal = GJ.PIECES[opts.piece].royal;
      white = { e1: royal ? opts.piece : 'koenig', d3: royal ? 'turm' : opts.piece, c2: 'bauer', d2: 'bauer', e2: 'bauer', f2: 'bauer' };
    }
    if (opts.white) white = opts.white;
    if (opts.black) black = opts.black;
    GJ.UI.go('game', { training: { white, black, levels: T.levels() } });
    GJ.UI.toast('Trainingsplatz: du spielst beide Seiten, Specials sind unbegrenzt', 2600);
  };
})();
