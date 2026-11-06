'use strict';
(function (root) {
  const MAX_ATTEMPTS = 5;
  const HINT_ORDER = ['works', 'classic', 'pseudonym', 'award'];

  function dayNumber(date) {
    const d = date || new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(items, rnd) {
    const p = items.slice();
    for (let i = p.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    return p;
  }

  const isUkrainian = (a) => a.country === 'UA';

  const SEED = 12346;

  function cycleOrder(authors, cycle) {
    const n = authors.length;
    const rnd = mulberry32(cycle * 2654435761 + SEED);
    const ua = shuffle(authors.map((a, i) => i).filter((i) => isUkrainian(authors[i])), rnd);
    const world = shuffle(authors.map((a, i) => i).filter((i) => !isUkrainian(authors[i])), rnd);
    const slots = new Set();
    for (let k = 0; k < ua.length; k++) {
      const from = Math.floor((k * n) / ua.length), to = Math.floor(((k + 1) * n) / ua.length);
      slots.add(from + Math.floor(rnd() * Math.max(1, to - from)));
    }
    let u = 0, w = 0;
    const order = [];
    for (let day = 0; day < n; day++) order.push(slots.has(day) ? ua[u++] : world[w++]);
    return order;
  }

  function authorIndexForDay(day, authors) {
    const n = authors.length;
    const cycle = Math.floor(day / n);
    const pos = day - cycle * n;
    const order = cycleOrder(authors, cycle);
    if (cycle > 0 && n > 1) {
      const prevLast = cycleOrder(authors, cycle - 1)[n - 1];
      if (order[0] === prevLast) { const t = order[0]; order[0] = order[1]; order[1] = t; }
    }
    return order[pos];
  }

  function authorOfDay(day, authors) {
    return authors[authorIndexForDay(day, authors)];
  }

  function normalize(s) {
    return String(s)
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ё/g, 'е').replace(/ґ/g, 'г')
      .replace(/[’ʼ`'‘.]/g, '')
      .replace(/ł/g, 'l').replace(/ø/g, 'o').replace(/ß/g, 'ss')
      .replace(/[^a-zа-яіє0-9]+/g, ' ')
      .trim();
  }

  function searchKeys(a) {
    if (!a._keys) {
      Object.defineProperty(a, '_keys', {
        enumerable: false,
        value: [normalize(a.uk), normalize(a.en), normalize(a.sens)],
      });
    }
    return a._keys;
  }

  function searchAuthors(query, authors, lang, excludeIds, limit) {
    const q = normalize(query);
    if (q.replace(/ /g, '').length < 2) return [];
    const words = q.split(' ');
    const exclude = new Set(excludeIds || []);
    const scored = [];
    authors.forEach((a) => {
      if (exclude.has(a.id)) return;
      const keys = searchKeys(a);
      let best = null;
      keys.forEach((key, ki) => {
        const tokens = key.split(' ');
        const ok = words.every((w) => tokens.some((t) => t.startsWith(w)));
        if (!ok) return;
        let score = key.startsWith(q) ? 0 : 2;
        if ((lang === 'uk' && ki === 0) || (lang === 'en' && ki === 1)) score -= 1;
        if (best === null || score < best) best = score;
      });
      if (best !== null) scored.push({ a, best });
    });
    scored.sort((x, y) => x.best - y.best || displayName(x.a, lang).localeCompare(displayName(y.a, lang), lang));
    return scored.slice(0, limit || 8).map((x) => x.a);
  }

  function displayName(a, lang) {
    return lang === 'en' ? a.en : a.uk;
  }

  function findExact(text, authors) {
    const q = normalize(text);
    if (!q) return null;
    return authors.find((a) => searchKeys(a).includes(q)) || null;
  }

  function compare(guess, secret) {
    const sharedGenres = new Set(secret.genres);
    const sharedRoles = new Set(secret.roles);
    return {
      country: guess.country === secret.country,
      year: {
        match: guess.year === secret.year,
        dir: guess.year === secret.year ? null : (secret.year > guess.year ? 'up' : 'down'),
      },
      genres: guess.genres.map((g) => ({ genre: g, match: sharedGenres.has(g) })),
      roles: guess.roles.map((r) => ({ role: r, match: sharedRoles.has(r) })),
      rolesSame: guess.roles.length === secret.roles.length && guess.roles.every((r) => sharedRoles.has(r)),
      correct: guess.id === secret.id,
    };
  }

  const WORK_BUCKETS = [
    { max: 9, key: 'lt10' },
    { max: 29, key: '10_30' },
    { max: 69, key: '30_70' },
    { max: 149, key: '70_150' },
    { max: Infinity, key: '150' },
  ];
  function worksBucket(n) {
    return WORK_BUCKETS.find((b) => n <= b.max).key;
  }

  function revealedHints(wrongAttempts) {
    return HINT_ORDER.slice(0, Math.max(0, Math.min(HINT_ORDER.length, wrongAttempts)));
  }

  function shareGrid(guesses, secret) {
    return guesses.map((g) => {
      const c = compare(g, secret);
      const cells = [c.year.match, c.country, c.genres.some((x) => x.match), c.rolesSame];
      return cells.map((m) => (m ? '⬜' : '⬛')).join('');
    }).join('\n');
  }

  const api = {
    MAX_ATTEMPTS, HINT_ORDER, dayNumber, mulberry32, cycleOrder, authorIndexForDay, authorOfDay, isUkrainian,
    normalize, searchAuthors, displayName, findExact, compare, worksBucket, revealedHints, shareGrid,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof window !== 'undefined' ? window : this);
