'use strict';
(function () {
  const memory = new Map();

  const store = {
    get(key) {
      try { return localStorage.getItem(key); }
      catch (_) { return memory.has(key) ? memory.get(key) : null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, String(value)); }
      catch (_) { memory.set(key, String(value)); }
    },
  };

  const dayNumber = () => window.GameLogic.dayNumber();
  const MAX = () => window.GameLogic.MAX_ATTEMPTS;

  function emptyStats() {
    return { games: 0, wins: 0, streak: 0, bestStreak: 0, dist: Array(MAX()).fill(0), lastWinEpoch: null, lastPlayEpoch: null };
  }

  function loadStats() {
    let raw = {};
    try { raw = JSON.parse(store.get('wxa_stats')) || {}; } catch (_) {  }
    const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
    const st = emptyStats();
    st.games = num(raw.games);
    st.wins = num(raw.wins);
    st.streak = num(raw.streak);
    st.bestStreak = num(raw.bestStreak);
    st.lastWinEpoch = Number.isFinite(raw.lastWinEpoch) ? raw.lastWinEpoch : null;
    st.lastPlayEpoch = Number.isFinite(raw.lastPlayEpoch) ? raw.lastPlayEpoch : null;
    if (Array.isArray(raw.dist)) st.dist = st.dist.map((_, i) => num(raw.dist[i]));
    if (st.lastWinEpoch === null || st.lastWinEpoch < dayNumber() - 1) st.streak = 0;
    return st;
  }

  function saveStats(st) {
    store.set('wxa_stats', JSON.stringify(st));
  }

  function recordResult(won, attempts) {
    const today = dayNumber();
    const st = loadStats();
    if (st.lastPlayEpoch === today) return st;
    st.games += 1;
    st.lastPlayEpoch = today;
    if (won) {
      st.wins += 1;
      st.streak += 1;
      st.bestStreak = Math.max(st.bestStreak, st.streak);
      st.dist[Math.min(attempts, MAX()) - 1] += 1;
      st.lastWinEpoch = today;
    } else {
      st.streak = 0;
    }
    saveStats(st);
    return st;
  }

  window.Common = { store, loadStats, saveStats, recordResult };
})();
