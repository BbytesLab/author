'use strict';
(function () {
  const SUPPORTED = ['uk', 'en'];
  const { store } = window.Common;

  function detect() {
    try {
      const fromUrl = new URLSearchParams(location.search).get('lang');
      if (fromUrl && SUPPORTED.includes(fromUrl)) { store.set('lang', fromUrl); return fromUrl; }
    } catch (_) {  }
    const saved = store.get('lang');
    if (saved && SUPPORTED.includes(saved)) return saved;
    const n = (navigator.language || 'uk').toLowerCase();
    return n.startsWith('uk') ? 'uk' : 'en';
  }

  const DICTS = {
    uk: {
      title: 'АВТОР ДНЯ',
      page_title: 'Автор дня',
      page_title_about: 'Правила — Автор дня',
      page_title_stats: 'Статистика — Автор дня',
      meta_description: 'Вгадай автора дня за 5 спроб — щоденна гра для любителів книжок.',
      search_placeholder: 'Введіть ім’я автора',
      attempts: 'Спроби',
      empty_state: 'Введіть автора, щоб побачити, чим він схожий на автора дня',
      suggest_none: 'Такого автора немає в списку',
      aria_rules: 'Правила',
      aria_stats: 'Статистика',
      aria_lang: 'Змінити мову',
      aria_suggestions: 'Варіанти авторів',
      hints_label: 'Підказки',
      close: 'Закрити',

      col_roles: 'Діяльність',
      col_born: 'Рік народження',
      col_country: 'Країна',
      col_genres: 'Жанри',
      yes: 'Так',
      no: 'Ні',
      later: 'пізніше',
      earlier: 'раніше',

      hint_works: 'Творів',
      hint_pseudonym: 'Псевдонім',
      hint_award: 'Нагорода',
      hint_classic: 'Класик',
      hint_locked: 'Підказка відкриється після помилки',
      works_lt10: 'до 10',
      works_10_30: '10–30',
      works_30_70: '30–70',
      works_70_150: '70–150',
      works_150: '150+',

      sr_match: 'збіг',
      sr_miss: 'не збігається',
      sr_later: 'автор дня народився пізніше',
      sr_earlier: 'автор дня народився раніше',
      sr_won: 'Вірно! Ви вгадали автора дня.',
      sr_lost: 'Спроби закінчилися.',
      toast_not_found: 'Оберіть автора зі списку',
      toast_duplicate: 'Цього автора вже було',
      toast_copied: 'Скопійовано в буфер обміну',
      toast_error: 'Не вдалося завантажити гру',

      win_title: 'Вітаю!',
      lose_title: 'Не цього разу',
      win_sub: 'Ви вгадали автора дня',
      lose_sub: 'Автором дня був',
      info_born: 'Народження',
      info_died: 'Рік смерті',
      info_country: 'Країна',
      info_genres: 'Жанри',
      info_roles: 'Діяльність',
      info_known: 'Відомі твори',
      learn_more: 'Дізнатися більше',
      share: 'Поділитися',
      show_result: 'Показати результат',
      next_in: 'Наступний автор через',
      share_title: 'Автор дня',

      about_title: 'Вгадай автора дня!',
      about_p1: 'У вас 5 спроб, щоб вгадати автора дня. Введіть перші дві літери імені — і з’явиться список авторів, з якого потрібно обрати одного.',
      about_p2: 'Після кожної спроби гра показує, чим обраний автор схожий на автора дня:',
      about_li1: 'Рік народження — стрілка вказує, чи автор дня народився раніше (↓), чи пізніше (↑);',
      about_li2: 'Країна походження автора;',
      about_li3: 'Жанри його творів — збіг кожного жанру позначається окремо;',
      about_li4: 'Діяльність — чим автор відомий, окрім письменства: музика, журналістика, політика, активізм, наука, кіно, мистецтво, військова служба, медицина, право, бізнес, медіа, духовенство або «інша діяльність» (викладання, подорожі, винаходи тощо). Збіг кожної діяльності позначається окремо, а «—» означає, що автор відомий лише як письменник.',
      about_p3: 'Світле поле — збіг, чорне — ні.',
      about_p4: 'Підказки вгорі відкриваються поступово — по одній після кожної помилки:',
      about_h1: 'Орієнтовна кількість творів (діапазон);',
      about_h2: 'Чи вважається автор класиком;',
      about_h3: 'Чи користується автор псевдонімом;',
      about_h4: 'Чи отримував автор нагороду.',
      about_p5: 'Нового автора обирають щодня о 00:00 за вашим місцевим часом — однаково для всіх гравців. Після гри ви побачите довідку про автора та кнопку «Дізнатися більше».',
      legend_match: 'Україна',
      legend_miss: 'Франція',
      about_back: '← Назад до гри',

      stats_title: 'Статистика',
      stats_games: 'Ігор',
      stats_wins: '% перемог',
      stats_streak: 'Поточна серія',
      stats_best: 'Найкраща серія',
      stats_dist: 'Розподіл перемог за спробами',
      stats_back: '← Назад до гри',
    },

    en: {
      title: 'AUTHOR OF THE DAY',
      page_title: 'Author of the Day',
      page_title_about: 'Rules — Author of the Day',
      page_title_stats: 'Stats — Author of the Day',
      meta_description: 'Guess the author of the day in 5 attempts — a daily game for book lovers.',
      search_placeholder: 'Type an author’s name',
      attempts: 'Attempts',
      empty_state: 'Enter an author to see how they compare to the author of the day',
      suggest_none: 'No such author in the list',
      aria_rules: 'Rules',
      aria_stats: 'Stats',
      aria_lang: 'Change language',
      aria_suggestions: 'Author suggestions',
      hints_label: 'Hints',
      close: 'Close',

      col_roles: 'Background',
      col_born: 'Birth year',
      col_country: 'Country',
      col_genres: 'Genres',
      yes: 'Yes',
      no: 'No',
      later: 'later',
      earlier: 'earlier',

      hint_works: 'Works',
      hint_pseudonym: 'Pseudonym',
      hint_award: 'Award',
      hint_classic: 'Classic',
      hint_locked: 'Unlocks after a wrong guess',
      works_lt10: 'under 10',
      works_10_30: '10–30',
      works_30_70: '30–70',
      works_70_150: '70–150',
      works_150: '150+',

      sr_match: 'match',
      sr_miss: 'no match',
      sr_later: 'the author of the day was born later',
      sr_earlier: 'the author of the day was born earlier',
      sr_won: 'Correct! You guessed the author of the day.',
      sr_lost: 'No attempts left.',
      toast_not_found: 'Pick an author from the list',
      toast_duplicate: 'You already guessed this author',
      toast_copied: 'Copied to clipboard',
      toast_error: 'Could not load the game',

      win_title: 'Congrats!',
      lose_title: 'Not this time',
      win_sub: 'You guessed the author of the day',
      lose_sub: 'The author of the day was',
      info_born: 'Born',
      info_died: 'Year of death',
      info_country: 'Country',
      info_genres: 'Genres',
      info_roles: 'Background',
      info_known: 'Best known for',
      learn_more: 'Learn more',
      share: 'Share',
      show_result: 'Show result',
      next_in: 'Next author in',
      share_title: 'Author of the Day',

      about_title: 'Guess the author of the day!',
      about_p1: 'You have 5 attempts to guess the author of the day. Type the first two letters of a name and a list of matching authors appears — pick one.',
      about_p2: 'After every attempt the game shows how your author compares to the author of the day:',
      about_li1: 'Birth year — the arrow shows whether the author of the day was born earlier (↓) or later (↑);',
      about_li2: 'The author’s country of origin;',
      about_li3: 'The genres of their works — each genre is matched separately;',
      about_li4: 'Background — what the author is known for besides writing: music, journalism, politics, activism, science, film, art, military service, medicine, law, business, media, clergy or “other activity” (teaching, travel, inventing and the like). Each activity is matched separately, and “—” means the author is known only as a writer.',
      about_p3: 'A light cell is a match, a black cell is not.',
      about_p4: 'Hints at the top are revealed gradually, one after each wrong attempt:',
      about_h1: 'Approximate number of works (as a range);',
      about_h2: 'Whether the author is considered a classic;',
      about_h3: 'Whether the author uses a pseudonym;',
      about_h4: 'Whether the author has won an award.',
      about_p5: 'A new author is chosen every day at 00:00 in your local time — the same for all players. After the game you will see background information and a “Learn more” button.',
      legend_match: 'Ukraine',
      legend_miss: 'France',
      about_back: '← Back to the game',

      stats_title: 'Stats',
      stats_games: 'Played',
      stats_wins: 'Win %',
      stats_streak: 'Current streak',
      stats_best: 'Best streak',
      stats_dist: 'Guess distribution',
      stats_back: '← Back to game',
    },
  };

  let current = detect();

  const t = (key) => (DICTS[current] && DICTS[current][key]) || key;
  const getLang = () => current;

  function applyI18n() {
    document.documentElement.lang = current;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder)));
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('meta_description'));
    const btn = document.getElementById('langToggle');
    if (btn) {
      btn.textContent = current === 'uk' ? 'ENG' : 'УКР';
      if (btn.tagName === 'A') btn.setAttribute('href', '?lang=' + (current === 'uk' ? 'en' : 'uk'));
    }
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    current = lang;
    store.set('lang', lang);
    applyI18n();
    try {
      if (/[?&]lang=/.test(location.search)) history.replaceState(null, '', '?lang=' + lang);
    } catch (_) {  }
  }

  window.I18N = { t, getLang, setLang, applyI18n, SUPPORTED, DICTS };
})();
