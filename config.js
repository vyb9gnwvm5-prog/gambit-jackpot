/* =====================================================================
   GAMBIT JACKPOT - config.js
   Alle Balancing-Zahlen an einem Ort. Hier darfst du frei drehen.
   ===================================================================== */

var GJ = globalThis.GJ = globalThis.GJ || {};

GJ.CONFIG = {
  version: 1,
  saveKey: 'gambitjackpot_v1',

  // ---------------- Seltenheiten ----------------
  rarity: {
    standard:    { name: 'Standard',    color: '#c9d2e3', factor: 1.0, order: 0 },
    gewoehnlich: { name: 'Gewöhnlich',  color: '#5fd068', factor: 1.0, order: 1 },
    selten:      { name: 'Selten',      color: '#4f9cf5', factor: 1.3, order: 2 },
    episch:      { name: 'Episch',      color: '#b66cff', factor: 1.6, order: 3 },
    legendaer:   { name: 'Legendär',    color: '#ffb02e', factor: 2.0, order: 4 }
  },

  // ---------------- Wirtschaft ----------------
  economy: {
    startEP: 0,
    drawFactor: 0.4,          // Remis = 40 % der Grund-EP
    lossEP: 15,               // Trostpreis bei Niederlage
    resignEP: 0,
    fastMateMoves: 25,        // Matt in höchstens so vielen eigenen Zügen
    fastMateBonus: 0.25,      // +25 %
    streakBonusPerWin: 0.10,  // +10 % pro Sieg in Folge
    streakBonusMax: 0.50,     // maximal +50 %
    firstWinBonus: 100,       // einmalig pro Bot
    upgradeCost: [150, 350, 700],
    duplicateEP: { gewoehnlich: 60, selten: 120, episch: 250, legendaer: 500 }
  },

  // ---------------- Deck ----------------
  deck: {
    budget: 40,
    slots: 5,
    maxCopies: { standard: 99, gewoehnlich: 99, selten: 99, episch: 2, legendaer: 1 }
  },

  // ---------------- Spielautomat ----------------
  slot: {
    spinCost: 120,
    coinPayout: 80,
    // Wahrscheinlichkeiten pro Dreh (Rest = Niete)
    odds: { gewoehnlich: 0.20, selten: 0.085, episch: 0.03, legendaer: 0.005, coins: 0.18 },
    nearMissChance: 0.40,     // Anteil der Nieten mit 2 gleichen Figuren
    pityNew: 6,               // nach so vielen Drehs ohne neue Figur: garantiert neue
    pityLegendary: 40,        // nach so vielen Drehs ohne Legendär: garantiert Legendär
    // Wie oft Symbole optisch auf den Walzen vorkommen
    stripWeights: { gewoehnlich: 4, selten: 3, episch: 2, legendaer: 1, coin: 4, coal: 5 },
    reelStops: [900, 1500, 2300], // ms
    suspenseExtra: 1500           // ms extra für Walze 3 bei 2 gleichen
  },

  // ---------------- KI ----------------
  ai: {
    acceptDrawBelow: -1.0,    // Bot nimmt Remis an, wenn seine Bewertung <= diesem Wert (in Bauern)
    specialReserve: 0.25,     // Bonus pro Stufe für unbenutztes Special (in Bauern)
    frozenPenalty: 0.30,      // Malus-Anteil des Figurenwerts für eingefrorene Figuren
    maxMs: 2000,              // harte Zeitgrenze
    minShowMs: 400            // Bot-Zug mindestens so lange "denken" lassen
  },

  // ---------------- Specials (Werte pro Stufe 1/2/3) ----------------
  specials: {
    bauer:         { range: [3, 4, 5], secondHit: [false, false, true] },
    springer:      { jumps: [2, 2, 3], firstCanCapture: [false, true, true], maxCaps: [1, 2, 2] },
    laeufer:       { range: [4, 7, 7], hits: [1, 1, 2] },
    turm:          { range: [3, 5, 7], maxCaps: [2, 2, 3] },
    dame:          { radius: [1, 2, 2], dur: [1, 1, 2] },
    koenig:        { radius: [3, 7, 7], shieldSwapped: [0, 0, 1] },
    spaeher:       { radius: [1, 1, 2], dur: [1, 2, 2] },
    lanzentraeger: { minDist: 2, maxDist: [2, 3, 4], diag: [false, true, true] },
    kamelreiter:   { dist: [1, 2, 2], crush: [false, false, true] },
    greif:         { radius: [3, 4, 4], freezePawns: [false, false, true] },
    moench:        { radius: [1, 1, 2], pawnOnly: [true, false, false], maxValue: [1.8, 3, 3] },
    erzmagier:     { radius: [2, 3, 3], chain: [false, false, true] },
    golem:         { freezeRadius: [1, 2, 2], crushRadius: 1, dur: [1, 1, 2] },
    katapult:      { minDist: 2, maxDist: [4, 6, 6], splash: [false, false, true] },
    hexe:          { range: [4, 7, 7], freeze: [0, 0, 1] },
    amazone:       { max: [2, 3, 8] },
    waechter:      { radius: [1, 2, 2], dur: [2, 2, 3] },
    kaiser:        { maxValue: [3, 5, 99] }
  },

  // ---------------- Bots ----------------
  // Decks: Felder aus Sicht des Bots als wäre er Weiß (Reihe 1 und 2). Wird gespiegelt.
  bots: [
    {
      id: 'bernd', name: 'Bauer Bernd', title: 'Der Rekrut', stars: 1, ep: 60,
      depth: 1, timeMs: 300, randomChance: 0.25, randomTop: 5, quiescence: false, tt: false, noise: 30,
      deck: 'CLASSIC', levels: {},
      color: '#7cc36b'
    },
    {
      id: 'rosa', name: 'Ritterin Rosa', title: 'Die Klingenschwingerin', stars: 2, ep: 100,
      depth: 2, timeMs: 700, randomChance: 0, randomTop: 1, quiescence: false, tt: false, noise: 12,
      deck: {
        a1: 'turm', b1: 'laeufer', c1: 'springer', d1: 'dame', e1: 'koenig', f1: 'springer', g1: 'laeufer', h1: 'turm',
        a2: 'bauer', b2: 'bauer', c2: 'bauer', d2: 'bauer', e2: 'bauer', f2: 'bauer', g2: 'bauer', h2: 'bauer'
      },
      levels: { bauer: 1, springer: 1 },
      color: '#ff7aa8'
    },
    {
      id: 'grimm', name: 'General Grimm', title: 'Der Stratege', stars: 3, ep: 150,
      depth: 3, timeMs: 1200, randomChance: 0, randomTop: 1, quiescence: true, tt: false, noise: 6,
      deck: {
        a1: 'golem', b1: 'kamelreiter', c1: 'laeufer', d1: 'dame', e1: 'koenig', f1: 'laeufer', g1: 'springer', h1: 'golem',
        a2: 'bauer', b2: 'bauer', c2: 'bauer', d2: 'spaeher', e2: 'spaeher', f2: 'bauer', g2: 'bauer', h2: 'bauer'
      },
      levels: { bauer: 1, golem: 2, kamelreiter: 1, spaeher: 2 },
      color: '#7aa2ff'
    },
    {
      id: 'morgana', name: 'Morgana die Hexe', title: 'Meisterin der Flüche', stars: 4, ep: 220,
      depth: 4, timeMs: 1500, randomChance: 0, randomTop: 1, quiescence: true, tt: true, noise: 0,
      deck: {
        a1: 'turm', b1: 'springer', c1: 'moench', d1: 'hexe', e1: 'koenig', f1: 'moench', g1: 'greif', h1: 'katapult',
        a2: 'bauer', b2: 'bauer', c2: 'spaeher', e2: 'spaeher', f2: 'bauer', g2: 'bauer', h2: 'bauer'
      },
      levels: { turm: 2, springer: 2, moench: 2, hexe: 3, koenig: 2, greif: 2, katapult: 3, bauer: 2, spaeher: 2 },
      color: '#b56cff'
    },
    {
      id: 'spiegel', name: 'Spiegel-Duell', title: 'Du gegen dich selbst', stars: 5, ep: 250,
      depth: 4, timeMs: 1500, randomChance: 0, randomTop: 1, quiescence: true, tt: true, noise: 0,
      deck: 'MIRROR', levels: 'MIRROR',
      color: '#ffd36b'
    }
  ]
};

GJ.CONFIG.CLASSIC_DECK = {
  a1: 'turm', b1: 'springer', c1: 'laeufer', d1: 'dame', e1: 'koenig', f1: 'laeufer', g1: 'springer', h1: 'turm',
  a2: 'bauer', b2: 'bauer', c2: 'bauer', d2: 'bauer', e2: 'bauer', f2: 'bauer', g2: 'bauer', h2: 'bauer'
};

// ---------------- Lokaler Multiplayer (1 gegen 1 auf einem Gerät) ----------------
GJ.CONFIG.mp = {
  defaultLevel: 3,          // Special-Stufe aller Figuren
  budgets: [0, 40, 60, 80], // 0 = kein Limit
  defaultBudget: 0
};
