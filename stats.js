'use strict';
(function () {
  const st = Common.loadStats();
  const winPct = st.games ? Math.round((st.wins / st.games) * 100) : 0;
  const cells = [
    [st.games, 'stats_games'],
    [winPct + '%', 'stats_wins'],
    [st.streak, 'stats_streak'],
    [st.bestStreak, 'stats_best'],
  ];
  const grid = document.getElementById('stGrid');
  cells.forEach(([value, key]) => {
    const cell = document.createElement('div');
    const num = document.createElement('strong');
    num.textContent = value;
    const label = document.createElement('span');
    label.dataset.i18n = key;
    cell.append(num, document.createElement('br'), label);
    grid.appendChild(cell);
  });

  const max = Math.max(1, ...st.dist);
  const dist = document.getElementById('stDist');
  st.dist.forEach((n, i) => {
    const row = document.createElement('div');
    row.className = 'dist__row';
    const idx = document.createElement('span');
    idx.textContent = i + 1;
    const bar = document.createElement('div');
    bar.className = 'dist__bar';
    bar.style.width = Math.max(8, Math.round((n / max) * 100)) + '%';
    bar.textContent = n;
    row.append(idx, bar);
    dist.appendChild(row);
  });
  I18N.applyI18n();
})();
