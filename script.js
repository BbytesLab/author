'use strict';

const { AUTHORS, COUNTRIES, GENRES, ROLES } = window.AuthorData;
const Logic = window.GameLogic;
const { store, recordResult } = window.Common;
const { MAX_ATTEMPTS, HINT_ORDER } = Logic;
const t = (k) => I18N.t(k);
const $ = (id) => document.getElementById(id);

const BY_ID = new Map(AUTHORS.map((a) => [a.id, a]));
const STATE_KEY = 'wxa_state';

let state = null;        // { day, secret, guesses: Author[] }
let suggestions = [];
let activeIdx = -1;
let lastFocus = null;

/* ---------- state ---------- */

function loadState() {
  const day = Logic.dayNumber();
  const secret = Logic.authorOfDay(day, AUTHORS);
  let guesses = [];
  try {
    const saved = JSON.parse(store.get(STATE_KEY));
    if (saved && saved.day === day && Array.isArray(saved.guesses)) {
      const seen = new Set();
      guesses = saved.guesses
        .filter((id) => BY_ID.has(id) && !seen.has(id) && seen.add(id))
        .map((id) => BY_ID.get(id))
        .slice(0, MAX_ATTEMPTS);
      // never keep guesses made after the secret was found
      const hit = guesses.findIndex((g) => g.id === secret.id);
      if (hit !== -1) guesses = guesses.slice(0, hit + 1);
    }
  } catch (_) { /* corrupted -> new game */ }
  return { day, secret, guesses };
}

function saveState() {
  store.set(STATE_KEY, JSON.stringify({ day: state.day, guesses: state.guesses.map((g) => g.id) }));
}

const won = () => state.guesses.some((g) => g.id === state.secret.id);
const lost = () => !won() && state.guesses.length >= MAX_ATTEMPTS;
const finished = () => won() || lost();
const wrongCount = () => state.guesses.filter((g) => g.id !== state.secret.id).length;

/* ---------- names & labels ---------- */

const name = (a) => Logic.displayName(a, I18N.getLang());
const idx = () => (I18N.getLang() === 'en' ? 1 : 0);
const countryName = (code) => (COUNTRIES[code] || [code, code])[idx()];
const genreName = (g) => (GENRES[g] || [g, g])[idx()];
const roleName = (r) => (ROLES[r] || [r, r])[idx()];
const yesNo = (v) => (v ? t('yes') : t('no'));

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function makeCell(label, value, matched, extraClass) {
  const c = el('div', `cell ${matched ? 'cell--match' : 'cell--miss'}${extraClass ? ' ' + extraClass : ''}`);
  c.append(el('span', 'cell__label', label), el('span', 'cell__value', value));
  return c;
}

/* ---------- render ---------- */

function renderHints() {
  const box = $('hints');
  box.replaceChildren();
  const open = new Set(finished() ? HINT_ORDER : Logic.revealedHints(wrongCount()));
  const s = state.secret;
  const defs = {
    works: [t('hint_works'), t('works_' + Logic.worksBucket(s.works)), true],
    pseudonym: [t('hint_pseudonym'), yesNo(s.pseudonym), s.pseudonym],
    award: [t('hint_award'), yesNo(s.award), s.award],
    classic: [t('hint_classic'), yesNo(s.classic), s.classic],
  };
  HINT_ORDER.forEach((key) => {
    const [label, value, on] = defs[key];
    if (open.has(key)) {
      box.appendChild(makeCell(label, value, on));
    } else {
      const c = el('div', 'cell cell--locked');
      c.title = t('hint_locked');
      c.append(el('span', 'cell__label', label), el('span', 'cell__value', '?'));
      box.appendChild(c);
    }
  });
}

function renderGuess(g, n) {
  const cmp = Logic.compare(g, state.secret);
  const card = el('article', 'guess');
  const head = el('h2', 'guess__name', name(g));
  head.append(el('span', 'guess__n', `${n}/${MAX_ATTEMPTS}`));
  card.appendChild(head);

  const cells = el('div', 'guess__cells');
  const yearCell = makeCell(t('col_born'), String(g.year), cmp.year.match);
  if (cmp.year.dir) {
    const arrow = el('span', 'arrow', cmp.year.dir === 'up' ? '↑' : '↓');
    arrow.setAttribute('aria-label', cmp.year.dir === 'up' ? t('later') : t('earlier'));
    yearCell.querySelector('.cell__value').appendChild(arrow);
  }
  cells.appendChild(yearCell);

  cells.appendChild(makeCell(t('col_country'), countryName(g.country), cmp.country));

  const gc = el('div', 'cell cell--genres');
  const chips = el('div', 'chips');
  cmp.genres.forEach((x) => chips.appendChild(el('span', `chip${x.match ? ' chip--match' : ''}`, genreName(x.genre))));
  gc.append(el('span', 'cell__label', t('col_genres')), chips);
  cells.appendChild(gc);
  // Background: a chip per activity ("—" = known only as a writer); white chip = shared with the author of the day.
  const rc = el('div', 'cell cell--genres');
  const rchips = el('div', 'chips');
  if (cmp.roles.length) cmp.roles.forEach((x) => rchips.appendChild(el('span', `chip${x.match ? ' chip--match' : ''}`, roleName(x.role))));
  else rchips.appendChild(el('span', `chip${cmp.rolesSame ? ' chip--match' : ''}`, '—'));
  rc.append(el('span', 'cell__label', t('col_roles')), rchips);
  cells.appendChild(rc);

  card.appendChild(cells);
  return card;
}

function renderGuesses() {
  const box = $('guesses');
  box.replaceChildren();
  for (let i = state.guesses.length - 1; i >= 0; i--) box.appendChild(renderGuess(state.guesses[i], i + 1));
  $('empty').hidden = state.guesses.length > 0;
}

function renderAttempts() {
  const box = $('attempts');
  const row = el('div', 'attempts__row');
  box.replaceChildren(row);
  row.appendChild(document.createTextNode(`${t('attempts')} ${state.guesses.length}/${MAX_ATTEMPTS}`));
  const dots = el('span', 'attempts__dots');
  for (let i = 0; i < MAX_ATTEMPTS; i++) dots.appendChild(el('span', 'attempts__dot' + (i < state.guesses.length ? ' attempts__dot--used' : '')));
  dots.setAttribute('aria-hidden', 'true');
  row.appendChild(dots);
  if (finished()) {
    const b = el('button', 'modal__btn', t('show_result'));
    b.type = 'button';
    b.id = 'showResult';
    b.addEventListener('click', openResult);
    box.appendChild(b);
  }
}

function renderInput() {
  const input = $('guess-input');
  input.disabled = finished();
  if (finished()) closeSuggestions();
}

function renderAll() {
  renderHints();
  renderGuesses();
  renderAttempts();
  renderInput();
  if (!$('resultModal').hidden) renderResult();
}

/* ---------- screen-reader announcements ---------- */

// Announce only the latest guess, not the whole re-rendered list.
function announce(guess) {
  const c = Logic.compare(guess, state.secret);
  const m = (ok) => t(ok ? 'sr_match' : 'sr_miss');
  const parts = [
    `${name(guess)}.`,
    `${t('col_born')} ${guess.year}: ${c.year.match ? t('sr_match') : t(c.year.dir === 'up' ? 'sr_later' : 'sr_earlier')}.`,
    `${t('col_country')} ${countryName(guess.country)}: ${m(c.country)}.`,
    `${t('col_genres')}: ${c.genres.map((x) => `${genreName(x.genre)} ${m(x.match)}`).join(', ')}.`,
    `${t('col_roles')}: ${guess.roles.length ? c.roles.map((x) => `${roleName(x.role)} ${m(x.match)}`).join(', ') : '—'} ${m(c.rolesSame)}.`,
  ];
  if (won()) parts.push(t('sr_won'));
  else if (lost()) parts.push(t('sr_lost'));
  $('sr').textContent = parts.join(' ');
}

/* ---------- toasts ---------- */

function showToast(message, ms = 2800) {
  let host = $('toast-host');
  if (!host) {
    host = el('div');
    host.id = 'toast-host';
    host.setAttribute('role', 'status');
    document.body.appendChild(host);
  }
  const box = el('div', 'toast');
  const close = el('button', 'toast__close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', t('close'));
  const remove = () => { clearTimeout(box._timer); box.classList.remove('visible'); setTimeout(() => box.remove(), 250); };
  close.addEventListener('click', remove);
  box.append(el('div', 'toast__icon', '!'), el('div', 'toast__msg', message), close);
  host.appendChild(box);
  requestAnimationFrame(() => box.classList.add('visible'));
  box._timer = setTimeout(remove, ms);
}

/* ---------- autocomplete (ARIA combobox) ---------- */

function closeSuggestions() {
  const ul = $('suggestions');
  ul.hidden = true;
  ul.replaceChildren();
  suggestions = [];
  activeIdx = -1;
  const input = $('guess-input');
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
}

function setActive(i) {
  activeIdx = i;
  const items = $('suggestions').querySelectorAll('[role="option"]');
  items.forEach((li, k) => li.setAttribute('aria-selected', String(k === i)));
  const input = $('guess-input');
  if (i >= 0 && items[i]) {
    input.setAttribute('aria-activedescendant', items[i].id);
    items[i].scrollIntoView({ block: 'nearest' });
  } else {
    input.removeAttribute('aria-activedescendant');
  }
}

function updateSuggestions() {
  const q = $('guess-input').value;
  const guessed = state.guesses.map((g) => g.id);
  suggestions = Logic.searchAuthors(q, AUTHORS, I18N.getLang(), guessed, 8);
  const ul = $('suggestions');
  ul.replaceChildren();
  activeIdx = -1;
  if (Logic.normalize(q).replace(/ /g, '').length < 2) { closeSuggestions(); return; }

  if (!suggestions.length) {
    const li = el('li', 'suggestions__none', t('suggest_none'));
    li.setAttribute('role', 'presentation');
    ul.appendChild(li);
  }
  suggestions.forEach((a, i) => {
    const li = el('li', '', name(a));
    li.id = `sg-${i}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.addEventListener('pointerdown', (e) => e.preventDefault()); // keep input focus
    li.addEventListener('click', () => submitGuess(a));
    ul.appendChild(li);
  });
  ul.hidden = false;
  $('guess-input').setAttribute('aria-expanded', 'true');
}

/* ---------- game ---------- */

function submitGuess(author) {
  if (finished()) return;
  if (state.guesses.some((g) => g.id === author.id)) { showToast(t('toast_duplicate')); return; }
  state.guesses.push(author);
  saveState();
  announce(author);
  const input = $('guess-input');
  input.value = '';
  closeSuggestions();

  if (finished()) {
    recordResult(won(), state.guesses.length);
    renderAll();
    openResult();
    return;
  }
  renderAll();
}

function onSubmit() {
  if (finished()) return;
  const input = $('guess-input');
  let pick = null;
  if (activeIdx >= 0) pick = suggestions[activeIdx];
  else if (suggestions.length === 1) pick = suggestions[0];
  else pick = Logic.findExact(input.value, AUTHORS);
  if (!pick) { showToast(t('toast_not_found')); return; }
  submitGuess(pick);
}

/* ---------- result modal ---------- */

function formatDate(iso) {
  if (/^\d{4}$/.test(iso)) return iso; // exact day is not public
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(I18N.getLang() === 'en' ? 'en-GB' : 'uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderResult() {
  const s = state.secret;
  const isWin = won();
  $('resTitle').textContent = t(isWin ? 'win_title' : 'lose_title');
  $('resSub').textContent = t(isWin ? 'win_sub' : 'lose_sub');
  $('resName').textContent = name(s);

  const info = $('resInfo');
  info.replaceChildren();
  const row = (k, v) => { info.append(el('dt', '', t(k)), el('dd', '', v)); };
  row('info_born', formatDate(s.born));
  if (s.died) row('info_died', String(s.died));
  row('info_country', countryName(s.country));
  row('info_genres', s.genres.map(genreName).join(', '));
  if (s.roles.length) row('info_roles', s.roles.map(roleName).join(', '));
  row('info_known', s.known[I18N.getLang()].join(', '));

  $('learnMore').href = 'https://www.google.com/search?q=' + encodeURIComponent(name(s));
}

// Keep keyboard focus and screen readers inside the dialog while it is open.
function setBackgroundInert(on) {
  document.querySelectorAll('header.topbar, main').forEach((n) => { n.inert = on; });
}

function openResult() {
  const m = $('resultModal');
  renderResult();
  lastFocus = document.activeElement;
  document.body.style.overflow = 'hidden';
  setBackgroundInert(true);
  m.hidden = false;
  m.setAttribute('aria-hidden', 'false');
  $('learnMore').focus();
  tickCountdown();
}

function closeResult() {
  const m = $('resultModal');
  if (m.hidden) return;
  m.hidden = true;
  m.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  setBackgroundInert(false);
  if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus();
}

function tickCountdown() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  let sec = Math.max(0, Math.floor((next - now) / 1000));
  const pad = (n) => String(n).padStart(2, '0');
  const text = `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
  const c = $('countdown');
  if (c) c.textContent = text;
}

async function shareResult() {
  const date = formatDate(new Date(state.day * 86400000).toISOString().slice(0, 10));
  const score = `${won() ? state.guesses.length : 'X'}/${MAX_ATTEMPTS}`;
  const url = location.protocol === 'file:' ? '' : location.href.replace(/[#?].*$/, '');
  // The author's name is deliberately not included.
  const text = `${t('share_title')} · ${date} · ${score}\n${Logic.shareGrid(state.guesses, state.secret)}`;
  if (navigator.share && url) {
    try { await navigator.share({ title: t('share_title'), text, url }); return; }
    catch (err) { if (err && err.name === 'AbortError') return; }
  }
  const full = (text + (url ? '\n' + url : '')).trim();
  try { await navigator.clipboard.writeText(full); showToast(t('toast_copied')); }
  catch (_) { window.prompt('', full); }
}

/* ---------- language & day rollover ---------- */

function switchLang() {
  const next = I18N.getLang() === 'uk' ? 'en' : 'uk';
  I18N.setLang(next);
  try { history.replaceState(null, '', '?lang=' + next); } catch (_) { /* ignore */ }
  renderAll();
  if (!$('suggestions').hidden) updateSuggestions();
}

function checkDayRollover() {
  if (state && state.day !== Logic.dayNumber()) {
    closeResult();
    state = loadState();
    renderAll();
  }
}

/* ---------- init ---------- */

function init() {
  try {
    state = loadState();
  } catch (_) {
    document.body.textContent = t('toast_error');
    return;
  }
  I18N.applyI18n();

  const input = $('guess-input');
  input.addEventListener('input', updateSuggestions);
  input.addEventListener('blur', () => setTimeout(closeSuggestions, 120));
  input.addEventListener('focus', () => { if (input.value) updateSuggestions(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); setActive((activeIdx + 1) % suggestions.length); }
    else if (e.key === 'ArrowUp' && suggestions.length) { e.preventDefault(); setActive((activeIdx - 1 + suggestions.length) % suggestions.length); }
    else if (e.key === 'Escape') closeSuggestions();
  });
  $('guess-form').addEventListener('submit', (e) => { e.preventDefault(); checkDayRollover(); onSubmit(); });

  $('langToggle').addEventListener('click', (e) => { e.preventDefault(); switchLang(); });
  document.querySelectorAll('#resultModal [data-close]').forEach((e) => e.addEventListener('click', closeResult));
  $('shareBtn').addEventListener('click', shareResult);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeResult(); });

  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDayRollover(); });
  window.addEventListener('focus', checkDayRollover);
  setInterval(() => { checkDayRollover(); if (!$('resultModal').hidden) tickCountdown(); }, 1000);

  renderAll();
  if (finished()) openResult();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
