/* =====================================================================
   GAMBIT JACKPOT - audio.js
   Alle Sounds werden per Web Audio API synthetisiert (keine Dateien).
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  const A = GJ.Audio = {};
  let ctx = null, master = null, noiseBuf = null;

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    A.applyVolume();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  };
  A.applyVolume = function () {
    if (!master) return;
    const s = GJ.Save.d ? GJ.Save.d.settings : { volume: 0.5, muted: false };
    master.gain.value = s.muted ? 0 : s.volume * 0.9;
  };

  function tone(o) {
    if (!ctx) return;
    const t = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + (o.slide || o.dur));
    if (o.detune) osc.detune.value = o.detune;
    const v = o.vol == null ? 0.2 : o.vol, at = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + at);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node = osc;
    if (o.lfo) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = o.lfo; lg.gain.value = o.lfoDepth || 20;
      l.connect(lg); lg.connect(o.lfoAmp ? g.gain : osc.frequency);
      l.start(t); l.stop(t + o.dur + 0.05);
    }
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter; f.frequency.value = o.ff || 1200; f.Q.value = o.q || 1;
      node.connect(f); node = f;
    }
    node.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  function noise(o) {
    if (!ctx) return;
    const t = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    const v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    if (o.lfo) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = o.lfo; lg.gain.value = o.lfoDepth || 600;
      l.connect(lg); lg.connect(f.frequency); l.start(t); l.stop(t + o.dur + 0.05);
    }
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random()); src.stop(t + o.dur + 0.05);
  }

  const S = {
    hover: () => tone({ f: 1400, f2: 1100, dur: 0.04, vol: 0.03 }),
    click: () => tone({ f: 800, f2: 520, dur: 0.07, vol: 0.08, type: 'triangle' }),
    move: () => { noise({ f: 1800, dur: 0.05, vol: 0.18, filter: 'bandpass', q: 2 }); tone({ f: 220, f2: 150, dur: 0.07, vol: 0.12, type: 'triangle' }); },
    capture: () => { tone({ f: 140, f2: 45, dur: 0.18, vol: 0.35 }); noise({ f: 2500, dur: 0.12, vol: 0.15, filter: 'highpass' }); noise({ f: 600, dur: 0.08, vol: 0.2, delay: 0.02 }); },
    check: () => { tone({ f: 660, dur: 0.12, vol: 0.12, type: 'square', filter: 'lowpass', ff: 2200 }); tone({ f: 880, dur: 0.16, vol: 0.12, type: 'square', filter: 'lowpass', ff: 2200, delay: 0.13 }); },
    castle: () => { S.move(); setTimeout(S.move, 120); },
    select: () => tone({ f: 520, f2: 700, dur: 0.06, vol: 0.06, type: 'triangle' }),
    deny: () => tone({ f: 140, dur: 0.18, vol: 0.12, type: 'sawtooth', filter: 'lowpass', ff: 600 }),
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, dur: 0.35, vol: 0.14, type: 'triangle', delay: i * 0.11 })),
    lose: () => [440, 392, 330, 262].forEach((f, i) => tone({ f, dur: 0.4, vol: 0.12, type: 'triangle', delay: i * 0.18 })),
    draw: () => [523, 523, 659].forEach((f, i) => tone({ f, dur: 0.3, vol: 0.12, type: 'triangle', delay: i * 0.15 })),
    coin: () => { tone({ f: 1568, dur: 0.08, vol: 0.09, type: 'square', filter: 'lowpass', ff: 4000 }); tone({ f: 2093, dur: 0.18, vol: 0.09, type: 'square', filter: 'lowpass', ff: 4000, delay: 0.06 }); },
    tick: () => noise({ f: 3500, dur: 0.018, vol: 0.12, filter: 'highpass' }),
    reelStop: () => { tone({ f: 110, f2: 60, dur: 0.12, vol: 0.3 }); noise({ f: 1500, dur: 0.05, vol: 0.2, filter: 'bandpass' }); },
    drumroll: () => { for (let i = 0; i < 26; i++) noise({ f: 900, dur: 0.05, vol: 0.06 + i * 0.006, filter: 'bandpass', q: 1.5, delay: i * 0.055 }); },
    jingle: () => [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => tone({ f, dur: 0.18, vol: 0.12, type: 'square', filter: 'lowpass', ff: 3000, delay: i * 0.08 })),
    fanfare: () => {
      const ch = [[392, 494, 587], [440, 554, 659], [523, 659, 784, 1047]];
      ch.forEach((c, i) => c.forEach(f => tone({ f, dur: i === 2 ? 1.4 : 0.35, vol: 0.07, type: 'sawtooth', filter: 'lowpass', ff: 2400, delay: i * 0.3, attack: 0.03 })));
    },
    upgrade: () => { tone({ f: 400, f2: 1600, dur: 0.45, vol: 0.12, type: 'triangle' }); [1568, 2093, 2637].forEach((f, i) => tone({ f, dur: 0.25, vol: 0.06, delay: 0.3 + i * 0.07 })); },
    whoosh: () => noise({ f: 400, f2: 2500, dur: 0.35, vol: 0.18, filter: 'bandpass', q: 1.2, attack: 0.08 }),
    pop: () => tone({ f: 300, f2: 900, dur: 0.1, vol: 0.12, type: 'triangle' }),
    // Specials
    sp_tractor: () => { tone({ f: 55, dur: 1.0, vol: 0.18, type: 'sawtooth', filter: 'lowpass', ff: 500, lfo: 14, lfoDepth: 0.12, lfoAmp: true, attack: 0.05 }); tone({ f: 110, dur: 1.0, vol: 0.06, type: 'square', filter: 'lowpass', ff: 400, lfo: 14, lfoDepth: 0.05, lfoAmp: true }); tone({ f: 600, f2: 400, dur: 0.25, vol: 0.06, type: 'square', delay: 0.02 }); },
    sp_doublejump: () => { [0, 0.09, 0.42, 0.51].forEach(d => noise({ f: 1200, dur: 0.05, vol: 0.2, filter: 'bandpass', q: 3, delay: d })); },
    sp_beam: () => { tone({ f: 400, f2: 2200, dur: 0.45, vol: 0.12, slide: 0.3 }); tone({ f: 1320, dur: 0.6, vol: 0.05, lfo: 12, lfoDepth: 40, delay: 0.1 }); },
    sp_ram: () => [0, 0.16, 0.32].forEach(d => { tone({ f: 90, f2: 40, dur: 0.18, vol: 0.35, delay: d }); noise({ f: 900, dur: 0.1, vol: 0.15, delay: d }); }),
    sp_frost: () => { for (let i = 0; i < 9; i++) tone({ f: 2000 + Math.random() * 2500, dur: 0.3, vol: 0.05, delay: i * 0.05 }); noise({ f: 6000, dur: 0.5, vol: 0.06, filter: 'highpass' }); },
    sp_swap: () => { tone({ f: 880, f2: 1760, dur: 0.25, vol: 0.1 }); tone({ f: 1760, f2: 880, dur: 0.25, vol: 0.1, delay: 0.2 }); },
    sp_smoke: () => noise({ f: 300, f2: 1200, dur: 0.9, vol: 0.2, attack: 0.2 }),
    sp_lance: () => { noise({ f: 800, f2: 3000, dur: 0.25, vol: 0.15, filter: 'bandpass' }); tone({ f: 200, f2: 80, dur: 0.15, vol: 0.3, delay: 0.3 }); },
    sp_sandstorm: () => noise({ f: 700, dur: 1.0, vol: 0.22, filter: 'bandpass', q: 2, lfo: 6, lfoDepth: 500, attack: 0.15 }),
    sp_dive: () => { noise({ f: 3000, f2: 300, dur: 0.6, vol: 0.18, filter: 'bandpass', attack: 0.1 }); tone({ f: 120, f2: 50, dur: 0.25, vol: 0.3, delay: 0.55 }); },
    sp_convert: () => [880, 1320, 1760].forEach((f, i) => tone({ f, dur: 0.8, vol: 0.07, delay: i * 0.12, attack: 0.05 })),
    sp_bolt: () => { noise({ f: 5000, dur: 0.25, vol: 0.3, filter: 'highpass' }); tone({ f: 1400, f2: 120, dur: 0.3, vol: 0.14, type: 'square' }); tone({ f: 60, dur: 0.4, vol: 0.25, delay: 0.05 }); },
    sp_stomp: () => { tone({ f: 70, f2: 30, dur: 0.6, vol: 0.5 }); noise({ f: 300, dur: 0.4, vol: 0.3 }); },
    sp_fireball: () => { noise({ f: 300, f2: 1500, dur: 0.5, vol: 0.15, filter: 'bandpass' }); noise({ f: 900, f2: 120, dur: 0.6, vol: 0.4, delay: 0.5 }); tone({ f: 80, f2: 35, dur: 0.5, vol: 0.4, delay: 0.5 }); },
    sp_polymorph: () => { tone({ f: 600, dur: 0.7, vol: 0.12, lfo: 9, lfoDepth: 220, type: 'triangle' }); tone({ f: 300, f2: 900, dur: 0.12, vol: 0.14, delay: 0.7 }); },
    sp_blades: () => { for (let i = 0; i < 6; i++) { tone({ f: 2400 + i * 180, dur: 0.12, vol: 0.06, type: 'square', filter: 'highpass', ff: 1800, delay: i * 0.08 }); tone({ f: 3170 + i * 90, dur: 0.1, vol: 0.04, delay: i * 0.08 + 0.02 }); } },
    sp_bulwark: () => { tone({ f: 110, dur: 2.0, vol: 0.3, attack: 0.01 }); tone({ f: 165, dur: 1.6, vol: 0.12 }); tone({ f: 277, dur: 1.2, vol: 0.06 }); },
    sp_revive: () => { [440, 554, 659, 880].forEach((f, i) => tone({ f, dur: 1.6, vol: 0.06, type: 'triangle', attack: 0.3, delay: i * 0.05 })); }
  };

  A.play = function (name) {
    if (!ctx) return;
    const s = GJ.Save.d && GJ.Save.d.settings;
    if (s && s.muted) return;
    const fn = S[name];
    if (fn) { try { fn(); } catch (e) { /* Audio darf nie das Spiel stoppen */ } }
  };
  A.names = Object.keys(S);
})();
