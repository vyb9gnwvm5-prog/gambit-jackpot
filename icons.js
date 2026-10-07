/* =====================================================================
   GAMBIT JACKPOT - icons.js
   Eigene Icons im Spielstil (dicke Kontur, flache Farben). Keine Emojis.
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  const O = '#14203d'; // Konturfarbe
  const g = (inner, sw) => `<g stroke="${O}" stroke-width="${sw || 3.5}" stroke-linejoin="round" stroke-linecap="round">${inner}</g>`;
  const I = {
    battle: g(`<path d="M8 6 L30 28 L26 32 L4 10 Z" fill="#e8eef8"/><path d="M40 6 L18 28 L22 32 L44 10 Z" fill="#e8eef8"/>
      <path d="M14 30 L22 38 M26 38 L34 30" fill="none"/><rect x="9" y="33" width="9" height="6" rx="2" transform="rotate(45 13.5 36)" fill="#ffc83d"/>
      <rect x="30" y="33" width="9" height="6" rx="2" transform="rotate(-45 34.5 36)" fill="#ffc83d"/>`),
    slot: g(`<rect x="6" y="10" width="30" height="32" rx="5" fill="#e8463c"/><rect x="10" y="17" width="22" height="13" rx="2" fill="#fff6dc"/>
      <path d="M17 17 V30 M25 17 V30" fill="none" stroke-width="2.5"/><circle cx="13.5" cy="23.5" r="2" fill="#e8463c" stroke-width="1.5"/><circle cx="21" cy="23.5" r="2" fill="#e8463c" stroke-width="1.5"/><circle cx="28.5" cy="23.5" r="2" fill="#e8463c" stroke-width="1.5"/>
      <path d="M36 20 H40 V8" fill="none"/><circle cx="40" cy="7" r="4" fill="#ffc83d"/><rect x="12" y="34" width="18" height="4" rx="2" fill="#14203d"/>`),
    deck: g(`<rect x="6" y="10" width="20" height="28" rx="4" transform="rotate(-12 16 24)" fill="#5aa7ff"/><rect x="20" y="8" width="20" height="28" rx="4" transform="rotate(10 30 22)" fill="#ffc83d"/>
      <path d="M30 15 l3 6 -3 6 -3 -6z" fill="#e8463c" stroke-width="2.5"/>`),
    codex: g(`<path d="M8 10 Q16 6 24 10 V40 Q16 36 8 40 Z" fill="#fff6dc"/><path d="M40 10 Q32 6 24 10 V40 Q32 36 40 40 Z" fill="#fff6dc"/>
      <path d="M8 10 V40 M40 10 V40" fill="none"/><path d="M12 16 H20 M12 22 H20 M28 16 H36 M28 22 H36" fill="none" stroke-width="2.5"/><path d="M30 28 l2 4 4 .5 -3 3 .8 4 -3.8-2 -3.8 2 .8-4 -3-3 4-.5z" fill="#ffc83d" stroke-width="2"/>`),
    gear: g(`<path d="M24 4 l4 0 1.5 5.5 4.5 2 5-3 3 3 -3 5 2 4.5 5.5 1.5 0 4 -5.5 1.5 -2 4.5 3 5 -3 3 -5 -3 -4.5 2 -1.5 5.5 -4 0 -1.5-5.5 -4.5-2 -5 3 -3-3 3-5 -2-4.5 -5.5-1.5 0-4 5.5-1.5 2-4.5 -3-5 3-3 5 3 4.5-2z" fill="#9fb3d6"/><circle cx="26" cy="24" r="6" fill="#fff6dc"/>`),
    duel: g(`<circle cx="15" cy="15" r="7" fill="#5aa7ff"/><path d="M4 40 Q4 26 15 26 Q26 26 26 40 Z" fill="#5aa7ff"/><circle cx="33" cy="15" r="7" fill="#ff6b5e"/><path d="M22 40 Q22 26 33 26 Q44 26 44 40 Z" fill="#ff6b5e"/>`),
    coin: g(`<circle cx="24" cy="24" r="19" fill="#ffc83d"/><circle cx="24" cy="24" r="13" fill="#ffdd6e" stroke-width="2.5"/><path d="M24 15 l2.8 5.7 6.2 .9 -4.5 4.4 1 6.2 -5.5-2.9 -5.5 2.9 1-6.2 -4.5-4.4 6.2-.9z" fill="#ff9f1c" stroke-width="2"/>`, 3),
    lock: g(`<path d="M15 22 V15 Q15 7 24 7 Q33 7 33 15 V22" fill="none" stroke-width="5"/><rect x="10" y="21" width="28" height="21" rx="5" fill="#ffc83d"/><path d="M24 29 V34" fill="none" stroke-width="4"/>`),
    check: g(`<path d="M8 25 L19 36 L40 12" fill="none" stroke="#14203d" stroke-width="10"/><path d="M8 25 L19 36 L40 12" fill="none" stroke="#5fd068" stroke-width="5"/>`, 0),
    star: g(`<path d="M24 4 l5.9 12 13.1 1.9 -9.5 9.3 2.2 13.1 -11.7-6.2 -11.7 6.2 2.2-13.1 -9.5-9.3 13.1-1.9z" fill="#ffc83d"/>`),
    starOff: g(`<path d="M24 4 l5.9 12 13.1 1.9 -9.5 9.3 2.2 13.1 -11.7-6.2 -11.7 6.2 2.2-13.1 -9.5-9.3 13.1-1.9z" fill="#4a5a7a"/>`),
    back: g(`<path d="M30 8 L12 24 L30 40" fill="none" stroke-width="9"/><path d="M30 8 L12 24 L30 40" fill="none" stroke="#fff" stroke-width="4"/>`, 0),
    next: g(`<path d="M18 8 L36 24 L18 40" fill="none" stroke-width="9"/><path d="M18 8 L36 24 L18 40" fill="none" stroke="#fff" stroke-width="4"/>`, 0),
    pause: g(`<rect x="11" y="8" width="9" height="32" rx="3" fill="#fff"/><rect x="28" y="8" width="9" height="32" rx="3" fill="#fff"/>`),
    flag: g(`<path d="M12 6 V44" fill="none" stroke-width="5"/><path d="M14 8 Q22 4 28 9 Q34 13 40 9 V27 Q34 31 28 27 Q22 22 14 26 Z" fill="#fff"/>`),
    draw: g(`<circle cx="24" cy="24" r="19" fill="#9fd8ff"/><path d="M14 20 H34 M14 28 H34" fill="none" stroke-width="5"/>`),
    info: g(`<circle cx="24" cy="24" r="19" fill="#5aa7ff"/><circle cx="24" cy="15" r="2.5" fill="#fff" stroke-width="2"/><path d="M24 22 V34" fill="none" stroke="#fff" stroke-width="5"/>`),
    undo: g(`<path d="M14 18 H30 Q40 18 40 28 Q40 38 30 38 H18" fill="none" stroke-width="5"/><path d="M18 9 L9 18 L18 27 Z" fill="#fff"/>`),
    redo: g(`<path d="M34 18 H18 Q8 18 8 28 Q8 38 18 38 H30" fill="none" stroke-width="5"/><path d="M30 9 L39 18 L30 27 Z" fill="#fff"/>`),
    trash: g(`<path d="M10 14 H38" fill="none" stroke-width="5"/><path d="M19 14 V9 H29 V14" fill="none"/><path d="M13 14 L15 41 H33 L35 14 Z" fill="#ff6b5e"/><path d="M21 20 V35 M27 20 V35" fill="none" stroke-width="2.5"/>`),
    copy: g(`<rect x="8" y="12" width="22" height="28" rx="4" fill="#9fb3d6"/><rect x="18" y="6" width="22" height="28" rx="4" fill="#fff6dc"/>`),
    pencil: g(`<path d="M10 38 L12 28 L32 8 L40 16 L20 36 Z" fill="#ffc83d"/><path d="M10 38 L12 28 L20 36 Z" fill="#fff6dc"/><path d="M28 12 L36 20" fill="none"/>`),
    target: g(`<circle cx="24" cy="24" r="19" fill="#ff6b5e"/><circle cx="24" cy="24" r="12" fill="#fff"/><circle cx="24" cy="24" r="5" fill="#ff6b5e"/>`),
    play: g(`<path d="M14 7 L40 24 L14 41 Z" fill="#fff"/>`),
    swap: g(`<path d="M8 16 H36 M30 9 L37 16 L30 23" fill="none" stroke-width="5"/><path d="M40 32 H12 M18 25 L11 32 L18 39" fill="none" stroke-width="5"/>`),
    eraser: g(`<path d="M8 32 L26 12 L40 24 L24 40 H14 Z" fill="#ff9fb3"/><path d="M17 23 L31 35" fill="none"/>`),
    soundOn: g(`<path d="M8 18 H16 L26 9 V39 L16 30 H8 Z" fill="#fff"/><path d="M32 17 Q36 24 32 31 M36 12 Q43 24 36 36" fill="none" stroke-width="4"/>`),
    soundOff: g(`<path d="M8 18 H16 L26 9 V39 L16 30 H8 Z" fill="#fff"/><path d="M32 18 L42 30 M42 18 L32 30" fill="none" stroke-width="4"/>`),
    close: g(`<path d="M12 12 L36 36 M36 12 L12 36" fill="none" stroke-width="9"/><path d="M12 12 L36 36 M36 12 L12 36" fill="none" stroke="#fff" stroke-width="4"/>`, 0),
    crown: g(`<path d="M6 36 L9 14 L18 24 L24 8 L30 24 L39 14 L42 36 Z" fill="#ffc83d"/><rect x="6" y="35" width="36" height="7" rx="2" fill="#ff9f1c"/>`),
    refresh: g(`<path d="M38 22 Q36 9 24 9 Q12 9 10 21" fill="none" stroke-width="5"/><path d="M10 26 Q12 39 24 39 Q36 39 38 27" fill="none" stroke-width="5"/><path d="M33 22 H42 V13 Z" fill="#fff"/><path d="M15 26 H6 V35 Z" fill="#fff"/>`),
    home: g(`<path d="M6 24 L24 7 L42 24" fill="none" stroke-width="5"/><path d="M11 21 V41 H37 V21 L24 10 Z" fill="#fff6dc"/><rect x="20" y="28" width="8" height="13" fill="#5aa7ff"/>`),
    trophy: g(`<path d="M14 7 H34 V18 Q34 30 24 30 Q14 30 14 18 Z" fill="#ffc83d"/><path d="M14 11 H7 Q7 22 15 22 M34 11 H41 Q41 22 33 22" fill="none"/><rect x="20" y="30" width="8" height="6" fill="#ff9f1c"/><rect x="13" y="36" width="22" height="6" rx="2" fill="#ff9f1c"/>`),
    fire: g(`<path d="M24 4 Q34 14 34 24 Q38 20 38 16 Q44 26 40 34 Q36 44 24 44 Q12 44 8 34 Q5 26 12 18 Q12 26 16 28 Q14 14 24 4 Z" fill="#ff7a2f"/><path d="M24 24 Q30 30 29 36 Q28 41 24 41 Q19 41 19 36 Q19 31 24 24 Z" fill="#ffc83d"/>`),
    shield: g(`<path d="M24 5 L40 11 V24 Q40 36 24 43 Q8 36 8 24 V11 Z" fill="#ffd23f"/><path d="M24 12 V36 M14 21 H34" fill="none" stroke-width="3"/>`),
    snow: g(`<path d="M24 5 V43 M7.5 14.5 L40.5 33.5 M40.5 14.5 L7.5 33.5" fill="none" stroke="#14203d" stroke-width="7"/><path d="M24 5 V43 M7.5 14.5 L40.5 33.5 M40.5 14.5 L7.5 33.5" fill="none" stroke="#bfe9ff" stroke-width="3"/>`, 0),
    up: g(`<path d="M24 6 L40 24 H30 V42 H18 V24 H8 Z" fill="#5fd068"/>`),
    plus: g(`<path d="M24 8 V40 M8 24 H40" fill="none" stroke-width="10"/><path d="M24 8 V40 M8 24 H40" fill="none" stroke="#fff" stroke-width="5"/>`, 0),
    bolt: g(`<path d="M28 4 L10 27 H22 L18 44 L38 19 H26 Z" fill="#ffc83d"/>`),
    cards: g(`<rect x="10" y="8" width="28" height="34" rx="5" fill="#fff6dc"/><path d="M24 15 l4 9 -4 9 -4 -9z" fill="#5aa7ff"/>`),
    phone: g(`<rect x="13" y="4" width="22" height="40" rx="5" fill="#9fb3d6"/><rect x="17" y="10" width="14" height="24" rx="2" fill="#fff6dc"/><circle cx="24" cy="38.5" r="2" fill="#14203d"/>`),
    dice: g(`<rect x="7" y="7" width="34" height="34" rx="8" fill="#fff6dc"/><circle cx="16" cy="16" r="3" fill="#14203d"/><circle cx="32" cy="32" r="3" fill="#14203d"/><circle cx="24" cy="24" r="3" fill="#14203d"/>`),
    menu: g(`<path d="M8 12 H40 M8 24 H40 M8 36 H40" fill="none" stroke-width="9"/><path d="M8 12 H40 M8 24 H40 M8 36 H40" fill="none" stroke="#fff" stroke-width="4"/>`, 0)
  };
  GJ.icon = function (name, cls) {
    return `<svg class="ic ${cls || ''}" viewBox="0 0 48 48" aria-hidden="true">${I[name] || ''}</svg>`;
  };
  GJ.ICON_NAMES = Object.keys(I);
})();
