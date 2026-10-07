/* =====================================================================
   GAMBIT JACKPOT - slot.js
   Spielautomat: Ergebnis wird vorab bestimmt, dann animiert.
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  const C = GJ.CONFIG, FX = GJ.FX;
  const PC = () => GJ.PIECES;
  const SL = GJ.Slot = {};
  const RARS = ['gewoehnlich', 'selten', 'episch', 'legendaer'];
  let spinning = false, bulbTimer = null, bulbMode = 'idle', sym = 110;

  const byRarity = r => GJ.NEW_TYPES.filter(t => PC()[t].rarity === r);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ---------------- Ergebnis bestimmen ----------------
  SL.decide = function () {
    const S = GJ.Save, sd = S.d.slot, O = C.slot.odds;
    const unowned = GJ.NEW_TYPES.filter(t => !S.owns(t));
    const forced = SL.forceNext; // nur für automatische Tests
    if (forced) {
      SL.forceNext = null;
      if (forced === 'niete') return { kind: 'niete' };
      if (forced === 'coins') return { kind: 'coins' };
      if (forced === 'neu' && unowned.length) return { kind: 'piece', type: pick(unowned), forced: true };
      if (RARS.includes(forced)) return { kind: 'piece', type: pick(byRarity(forced)), forced: true };
      if (PC()[forced]) return { kind: 'piece', type: forced, forced: true };
    }
    const unL = unowned.filter(t => PC()[t].rarity === 'legendaer');
    if (unL.length && sd.spinsSinceLegendary >= C.slot.pityLegendary) return { kind: 'piece', type: pick(unL), pity: 'legendaer' };
    if (unowned.length && sd.spinsSinceNew >= C.slot.pityNew) {
      // gewichtet nach Seltenheit unter den noch fehlenden
      const tot = unowned.reduce((a, t) => a + O[PC()[t].rarity] / byRarity(PC()[t].rarity).length, 0);
      let r = Math.random() * tot;
      for (const t of unowned) { r -= O[PC()[t].rarity] / byRarity(PC()[t].rarity).length; if (r <= 0) return { kind: 'piece', type: t, pity: 'neu' }; }
      return { kind: 'piece', type: unowned[0], pity: 'neu' };
    }
    const r = Math.random();
    let acc = 0;
    for (const rar of RARS) { acc += O[rar]; if (r < acc) return { kind: 'piece', type: pick(byRarity(rar)) }; }
    acc += O.coins;
    if (r < acc) return { kind: 'coins' };
    return { kind: 'niete' };
  };
  SL.symbolsFor = function (out) {
    const pool = GJ.NEW_TYPES.concat(['coin', 'coal']);
    if (out.kind === 'piece') return [out.type, out.type, out.type];
    if (out.kind === 'coins') return ['coin', 'coin', 'coin'];
    if (Math.random() < C.slot.nearMissChance) {
      const a = pick(GJ.NEW_TYPES);
      let b; do { b = pick(pool); } while (b === a);
      return [a, a, b];
    }
    let s;
    do { s = [pick(pool), pick(pool), pick(pool)]; } while (s[0] === s[1] && s[1] === s[2]);
    return s;
  };

  // ---------------- Darstellung ----------------
  function symHTML(s) {
    if (s === 'coin') return `<div class="sym"><div class="sym-in" style="--rc:#ffe58a">${GJ.icon('coin')}</div></div>`;
    if (s === 'coal') return `<div class="sym"><div class="sym-in" style="--rc:#5a5a66"><div class="coal"></div></div></div>`;
    const def = PC()[s];
    return `<div class="sym"><div class="sym-in" style="--rc:${C.rarity[def.rarity].color}">${def.svg('w', false)}</div></div>`;
  }
  function stripSymbol() {
    const w = C.slot.stripWeights;
    const pool = [];
    GJ.NEW_TYPES.forEach(t => { for (let i = 0; i < w[PC()[t].rarity]; i++) pool.push(t); });
    for (let i = 0; i < w.coin; i++) pool.push('coin');
    for (let i = 0; i < w.coal; i++) pool.push('coal');
    return pick(pool);
  }

  SL.open = function () {
    const S = GJ.Save;
    spinning = false;
    const cost = S.spinCost();
    GJ.UI.shell('slot', 'Automat', `
      <div class="slot-wrap">
        <div class="machine" id="machine">
          <div class="machine-head"><div class="toon">JACKPOT</div></div>
          <div class="bulbs" id="bulbs">${'<div class="bulb"></div>'.repeat(12)}</div>
          <div class="reels-frame" id="reels">${[0, 1, 2].map(i => `<div class="reel" id="reel${i}"><div class="reel-strip"></div></div>`).join('')}<div class="payline"></div></div>
          <div class="machine-bottom">
            <button class="btn btn-blue btn-icon" id="odds" aria-label="Gewinnchancen">${GJ.icon('info')}</button>
            <button class="btn btn-sun btn-lg spin-btn" id="spin">Drehen ${GJ.icon('coin')}<span class="n">${cost}</span></button>
          </div>
        </div>
        <div class="slot-pills" id="sinfo"></div>
      </div>`, { raw: true });
    SL.sizeReels();
    window.onresize = () => { if (GJ.UI.current === 'slot') SL.sizeReels(); };
    const start = [pick(GJ.NEW_TYPES), pick(GJ.NEW_TYPES), pick(GJ.NEW_TYPES)];
    SL.cur = start;
    [0, 1, 2].forEach(i => SL.setStrip(i, [stripSymbol(), start[i], stripSymbol()], 1));
    document.getElementById('spin').onclick = () => SL.pull();
    GJ.UI.tap(document.getElementById('odds'), () => SL.showOdds());
    SL.renderInfo();
    SL.bulbs('idle');
  };
  GJ.UI = GJ.UI || {}; GJ.UI.screens = GJ.UI.screens || {};
  GJ.UI.screens.slot = SL.open;

  SL.sizeReels = function () {
    const r = document.getElementById('reel0');
    if (!r) return;
    sym = Math.min(130, r.clientWidth * 0.95, Math.max(60, (window.innerHeight - 430) / 1.55));
    sym = Math.max(56, sym);
    document.getElementById('reels').style.setProperty('--sym', sym + 'px');
    [0, 1, 2].forEach(i => { const st = document.querySelector(`#reel${i} .reel-strip`); if (st && st._idx != null) st.style.transform = `translateY(${SL.ty(st._idx)}px)`; });
  };
  SL.ty = k => -(k * sym) + 0.275 * sym;
  SL.setStrip = function (i, list, idx) {
    const st = document.querySelector(`#reel${i} .reel-strip`);
    st.innerHTML = list.map(symHTML).join('');
    st._idx = idx;
    st.style.transform = `translateY(${SL.ty(idx)}px)`;
    return st;
  };

  SL.renderInfo = function () {
    const S = GJ.Save, sd = S.d.slot;
    const unowned = GJ.NEW_TYPES.filter(t => !S.owns(t));
    const unL = unowned.filter(t => PC()[t].rarity === 'legendaer');
    const el = document.getElementById('sinfo');
    if (!el) return;
    const I = GJ.icon;
    el.innerHTML = `<span class="pill">${I('cards')} Sammlung <b>${GJ.NEW_TYPES.length - unowned.length} / ${GJ.NEW_TYPES.length}</b></span>` +
      (unowned.length ? `<span class="pill">${I('star')} Neue Figur sicher in <b>${Math.max(1, C.slot.pityNew - sd.spinsSinceNew + 1)}</b></span>` : `<span class="pill">${I('trophy')} Alles gesammelt</span>`) +
      (unL.length ? `<span class="pill">${I('crown')} Legendär sicher in <b>${Math.max(1, C.slot.pityLegendary - sd.spinsSinceLegendary + 1)}</b></span>` : '');
    const b = document.getElementById('spin');
    if (b) { const ok = S.d.ep >= S.spinCost(); b.disabled = spinning; b.classList.toggle('disabled', !ok); b.title = ok ? '' : `Noch ${S.spinCost() - S.d.ep} EP: gewinne ein Match!`; }
  };

  SL.bulbs = function (mode) {
    bulbMode = mode;
    if (bulbTimer) clearInterval(bulbTimer);
    let k = 0;
    const tick = () => {
      const bs = document.querySelectorAll('#bulbs .bulb');
      if (!bs.length) { clearInterval(bulbTimer); return; }
      bs.forEach((b, i) => {
        let on;
        if (bulbMode === 'idle') on = (i + k) % 4 === 0;
        else if (bulbMode === 'spin') on = (i + k) % 3 === 0;
        else on = k % 2 === 0;
        b.classList.toggle('on', on);
      });
      k++;
    };
    bulbTimer = setInterval(tick, mode === 'idle' ? 380 : mode === 'spin' ? 90 : 120);
    tick();
  };

  SL.pull = async function () {
    GJ.Audio.init();
    if (spinning) return;
    const S = GJ.Save, cost = S.spinCost();
    if (S.d.ep < cost) { GJ.Audio.play('deny'); GJ.UI.toast(`Dir fehlen ${cost - S.d.ep} EP. Gewinne ein Match gegen einen Bot!`); return; }
    GJ.UI.buzz(25);
    const mach = document.getElementById('machine');
    FX.anim(mach, [{ transform: 'scale(1)' }, { transform: 'scale(.97, 1.03)' }, { transform: 'scale(1)' }], { duration: 220 });
    GJ.Audio.play('click');
    S.spendEP(cost);
    S.d.stats.spins++;
    const out = SL.decide();
    const syms = SL.symbolsFor(out);
    spinning = true;
    SL.renderInfo();
    await SL.animate(syms);
    await SL.resolve(out, syms);
    spinning = false;
    SL.renderInfo();
    SL.bulbs('idle');
  };

  SL.animate = async function (syms) {
    SL.bulbs('spin');
    const f = FX.speed() || 0.15;
    const stops = C.slot.reelStops.map(x => x * f);
    const suspense = syms[0] === syms[1];
    if (suspense) stops[2] += C.slot.suspenseExtra * f;
    const proms = [0, 1, 2].map(i => new Promise(res => {
      const L = Math.round(stops[i] / 1000 * 16 / Math.max(f, 0.4)) + 6 + (i === 2 && suspense ? 6 : 0);
      const list = [stripSymbol(), SL.cur[i]];
      for (let k = 0; k < L; k++) list.push(stripSymbol());
      list.push(syms[i], stripSymbol());
      const st = SL.setStrip(i, list, 1);
      const reel = document.getElementById('reel' + i);
      reel.classList.add('blur');
      reel.classList.remove('win-glow');
      const target = list.length - 2;
      const y0 = SL.ty(1), y1 = SL.ty(target), over = sym * 0.12;
      const t0 = performance.now(), d = stops[i];
      let lastIdx = 1, lastTick = 0;
      const step = now => {
        const t = Math.min(1, (now - t0) / d);
        const e = 1 - Math.pow(1 - t, i === 2 && suspense ? 4 : 3);
        const y = y0 + (y1 - over - y0) * e;
        st.style.transform = `translateY(${y}px)`;
        const idx = Math.floor((SL.ty(0) - y) / sym);
        if (idx !== lastIdx && now - lastTick > 45) { GJ.Audio.play('tick'); lastTick = now; }
        lastIdx = idx;
        if (t > 0.72) reel.classList.remove('blur');
        if (t < 1) requestAnimationFrame(step);
        else {
          FX.anim(st, [{ transform: `translateY(${y1 - over}px)` }, { transform: `translateY(${y1}px)` }], { duration: 160, easing: 'cubic-bezier(.3,1.8,.5,1)' }).then(() => {
            st.style.transform = `translateY(${y1}px)`; st._idx = target;
          });
          st.style.transform = `translateY(${y1}px)`;
          GJ.Audio.play('reelStop');
          if (i === 1 && suspense) { document.getElementById('reels').classList.add('suspense'); GJ.Audio.play('drumroll'); }
          res();
        }
      };
      requestAnimationFrame(step);
    }));
    await Promise.all(proms);
    document.getElementById('reels').classList.remove('suspense');
    SL.cur = syms.slice();
    await FX.sleep(180);
  };

  SL.resolve = async function (out, syms) {
    const S = GJ.Save, sd = S.d.slot;
    if (out.kind === 'niete') {
      sd.spinsSinceNew++; sd.spinsSinceLegendary++;
      S.save();
      GJ.Audio.play(syms[0] === syms[1] ? 'deny' : 'reelStop');
      if (syms[0] === syms[1]) GJ.UI.toast('So knapp! Zwei gleiche ...');
      return;
    }
    const color = out.kind === 'coins' ? '#ffd060' : C.rarity[PC()[out.type].rarity].color;
    document.querySelectorAll('.reel').forEach(r => { r.style.setProperty('--rc', color); r.classList.add('win-glow'); });
    SL.bulbs('win');
    GJ.Audio.play('jingle');
    const mc = FX.center(document.getElementById('reels'));
    FX.burst(mc.x, mc.y, { n: 60, colors: [color, '#fff', '#ffe08a'], speed: 7, shape: 'star', size: 6, gravity: 0.08 });
    await FX.sleep(700);
    if (out.kind === 'coins') {
      sd.spinsSinceNew++; sd.spinsSinceLegendary++;
      const pay = C.slot.coinPayout;
      FX.burst(mc.x, mc.y - 40, { n: 40, colors: ['#ffe08a', '#f5c451', '#b8862b'], speed: 6, shape: 'circle', size: 7, gravity: 0.25, life: 70, up: 4 });
      await FX.coinsFly(mc, document.querySelector('.ep-chip'), 8);
      S.addEP(pay);
      GJ.UI.toast(`3 Münzen! +${pay} EP`);
      S.save();
      return;
    }
    const type = out.type, def = PC()[type], isNew = !S.owns(type);
    if (isNew) { S.unlock(type); sd.spinsSinceNew = 0; } else sd.spinsSinceNew++;
    if (def.rarity === 'legendaer') sd.spinsSinceLegendary = 0; else sd.spinsSinceLegendary++;
    S.save();
    await SL.reveal(type, isNew);
  };

  SL.reveal = function (type, isNew) {
    return new Promise(res => {
      const S = GJ.Save, def = PC()[type], rc = C.rarity[def.rarity];
      const leg = def.rarity === 'legendaer';
      const bg = document.createElement('div');
      bg.className = 'reveal-bg';
      bg.style.setProperty('--rc', rc.color);
      const label = isNew ? (leg ? 'LEGENDÄR!' : 'NEUE FIGUR!') : 'DUPLIKAT';
      bg.innerHTML = `<div class="burst"></div><div class="reveal-label toon">${label}</div>
        <div class="rv-card" style="--rc:${rc.color}"><span class="rar">${rc.name}</span><div class="nm toon">${def.name}</div>
          ${def.svg('w', false)}
          ${GJ.UI.diagramHTML(type, 1, true)}
          <div class="sp"><b>${def.special.name}:</b> ${def.special.desc()[0]}</div></div>
        <div class="reveal-actions"></div>`;
      document.getElementById('modal-root').appendChild(bg);
      const act = bg.querySelector('.reveal-actions');
      const close = () => { bg.remove(); res(); };
      if (isNew) {
        GJ.Audio.play(leg ? 'fanfare' : 'upgrade');
        if (leg) { FX.confetti(220); setTimeout(() => FX.flash(rc.color, 0.5, 600), 200); }
        setTimeout(() => { const c = FX.center(bg.querySelector('.rv-card')); FX.pow(c.x, c.y, { color: rc.color, size: 260 }); FX.burst(c.x, c.y, { n: 40, colors: [rc.color, '#ffc83d', '#fff'], speed: 9, shape: 'star', size: 12, gravity: 0.2 }); }, 650 * (FX.speed() || 0.2));
        const b1 = document.createElement('button'); b1.className = 'btn btn-sun'; b1.innerHTML = GJ.icon('deck') + ' Ins Deck';
        b1.onclick = () => { close(); GJ.UI.go('deck'); GJ.Deck.setHand(type); };
        const b2 = document.createElement('button'); b2.className = 'btn'; b2.textContent = 'Weiter';
        b2.onclick = close;
        act.append(b1, b2);
      } else {
        const refund = C.economy.duplicateEP[def.rarity];
        GJ.Audio.play('reelStop');
        setTimeout(async () => {
          const card = bg.querySelector('.rv-card');
          const c = FX.center(card);
          await FX.anim(card, [{ transform: 'scale(1)', opacity: 1, filter: 'brightness(1)' }, { transform: 'scale(.6) rotate(8deg)', opacity: 0, filter: 'brightness(3)' }], { duration: 450, fill: 'forwards' });
          FX.burst(c.x, c.y, { n: 40, colors: ['#ffe08a', '#f5c451', rc.color], speed: 6, shape: 'circle', size: 6, gravity: 0.15 });
          bg.querySelector('.reveal-label').innerHTML = `+${refund} EP`;
          await FX.coinsFly(c, document.querySelector('.ep-chip'), 6);
          S.addEP(refund);
          const b2 = document.createElement('button'); b2.className = 'btn btn-leaf'; b2.textContent = 'Weiter';
          b2.onclick = close;
          act.append(b2);
        }, 1300 * (FX.speed() || 0.3));
      }
    });
  };

  SL.showOdds = function () {
    const O = C.slot.odds, pct = x => (x * 100).toFixed(1).replace('.0', '') + ' %';
    const niete = 1 - RARS.reduce((a, r) => a + O[r], 0) - O.coins;
    const dup = RARS.map(r => C.economy.duplicateEP[r]);
    const rows = RARS.map((r, i) => `<tr><td><span class="rar-tag" style="--rc:${C.rarity[r].color}">${C.rarity[r].name}</span> <span style="font-size:12px;font-weight:400">${byRarity(r).length} Figuren</span></td><td>${pct(O[r])}</td><td>Figur · Duplikat: ${dup[i]} EP</td></tr>`).join('');
    GJ.UI.modal({
      title: 'Gewinnchancen', wide: true, closeX: true,
      html: `<table class="odds-table"><tr><th>Ergebnis</th><th>Chance</th><th>Gewinn</th></tr>${rows}
        <tr><td>3x Münze</td><td>${pct(O.coins)}</td><td>${C.slot.coinPayout} EP</td></tr>
        <tr><td>Niete</td><td>${pct(niete)}</td><td>nichts</td></tr></table>
        <p style="margin-top:12px;font-size:13px">Glückszähler: Nach ${C.slot.pityNew} Drehs ohne neue Figur ist der nächste Dreh garantiert eine Figur, die du noch nicht hast. Nach ${C.slot.pityLegendary} Drehs ohne Legendär ist der nächste garantiert legendär (solange dir noch eine fehlt).</p>
        <p style="font-size:13px">Kosten pro Dreh: ${GJ.Save.spinCost()} EP.</p>`,
      buttons: [{ label: 'OK', cls: 'btn-leaf' }]
    });
  };
})();
