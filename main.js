/* =====================================================================
   GAMBIT JACKPOT - main.js
   Start: Spielstand laden, Einstellungen anwenden, App-Modus (offline).
   ===================================================================== */
var GJ = globalThis.GJ = globalThis.GJ || {};
(function () {
  function start() {
    GJ.Save.load();
    GJ.FX.init();
    GJ.UI.applySettings();
    GJ.UI.initEP();
    // Ton erst nach der ersten Berührung (Vorgabe von iOS und Android)
    window.addEventListener('pointerdown', () => GJ.Audio.init(), { once: true });
    // iOS: kein Zoomen per Doppeltipp oder Zwei-Finger-Geste
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches && !GJ.Save.d.rmApplied) {
      GJ.Save.d.settings.animSpeed = 'schnell';
      GJ.Save.d.settings.shake = false;
      GJ.Save.d.rmApplied = true;
      GJ.Save.save();
      GJ.UI.applySettings();
    }
    GJ.UI.go('home');
    if (!GJ.Save.d.tutorialDone) setTimeout(() => GJ.UI.tutorial(), 400);
    // App-Modus: Offline-Speicher (funktioniert nur über https, nicht per Doppelklick)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* ohne Offline-Modus weiterspielen */ });
    }
    // Speicher als dauerhaft markieren (verhindert Löschen durch den Browser, wo möglich)
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* egal */ }
    // Beim Wechsel in den Hintergrund sicher speichern
    document.addEventListener('visibilitychange', () => { if (document.hidden) GJ.Save.save(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
