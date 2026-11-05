'use strict';
/* Pure game logic (no DOM) — shared by the browser and by tests/logic.test.js. */
(function (root) {
  const MAX_ATTEMPTS = 5;
  const HINT_ORDER = ['works', 'pseudonym', 'award', 'classic']; // revealed one per wrong attempt

  /* ---- day & author of the day ---- */

  // Day number of the player's LOCAL calendar date -> the author changes at local 00:00.
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

  // Deterministic shuffle of [0..n) for a given cycle number (Fisher–Yates).
  function permutation(n, cycle) {
    const rnd = mulberry32(cycle * 2654435761 + 12345);
    const p = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    return p;
  }

  // Every author appears exactly once per cycle of N days (no repeats), same for all players.
  function authorIndexForDay(day, n) {
    const cycle = Math.floor(day / n);
    const pos = day - cycle * n;
    const perm = permutation(n, cycle);
    if (cycle > 0 && n > 1) {
      // avoid the same author two days in a row across the cycle boundary
      const prevLast = permutation(n, cycle - 1)[n - 1];
      if (perm[0] === prevLast) { const t = perm[0]; perm[0] = perm[1]; perm[1] = t; }
    }
    return perm[pos];
  }

  function authorOfDay(day, authors) {
    return authors[authorIndexForDay(day, authors.length)];
  }

  /* ---- search ---- */

  function normalize(s) {
    return String(s)
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // é -> e, ë -> e
      .replace(/ё/g, 'е').replace(/ґ/g, 'г') // NFD above already folds й->и and ї->і
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

  /**
   * Suggestions for the dropdown. Starts at 2 characters.
   * Every query word must be the beginning of a word in one of the author's names (uk, en or list order),
   * so "кінг", "стів кі" and "king" all find Stephen King.
   */
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
        // prefer: whole name starts with the query, then the display language
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

  // Exact match on any form of the name (used when the player presses Enter without picking from the list).
  function findExact(text, authors) {
    const q = normalize(text);
    if (!q) return null;
    return authors.find((a) => searchKeys(a).includes(q)) || null;
  }

  /* ---- comparison ---- */

  function compare(guess, secret) {
    const sharedGenres = new Set(secret.genres);
    const sharedRoles = new Set(secret.roles);
    return {
      country: guess.country === secret.country,
      year: {
        match: guess.year === secret.year,
        // direction toward the secret author: 'up' = secret was born later
        dir: guess.year === secret.year ? null : (secret.year > guess.year ? 'up' : 'down'),
      },
      genres: guess.genres.map((g) => ({ genre: g, match: sharedGenres.has(g) })),
      // "Background": notable activities besides writing. Two authors with none at all also match.
      roles: guess.roles.map((r) => ({ role: r, match: sharedRoles.has(r) })),
      rolesSame: guess.roles.length === secret.roles.length && guess.roles.every((r) => sharedRoles.has(r)),
      correct: guess.id === secret.id,
    };
  }

  // Approximate count of works -> a range, so nobody has to guess an exact number.
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

  // Emoji-free share grid: white/black squares.
  function shareGrid(guesses, secret) {
    return guesses.map((g) => {
      const c = compare(g, secret);
      const cells = [c.year.match, c.country, c.genres.some((x) => x.match), c.rolesSame];
      return cells.map((m) => (m ? '⬜' : '⬛')).join('');
    }).join('\n');
  }

  const api = {
    MAX_ATTEMPTS, HINT_ORDER, dayNumber, mulberry32, permutation, authorIndexForDay, authorOfDay,
    normalize, searchAuthors, displayName, findExact, compare, worksBucket, revealedHints, shareGrid,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof window !== 'undefined' ? window : this);
