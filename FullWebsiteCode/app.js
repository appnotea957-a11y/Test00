const STORAGE_KEYS = {
  activeUser: 'reimuru_v3_active_user',
  accounts: 'reimuru_v3_accounts',
  histories: 'reimuru_v3_histories',
  settings: 'reimuru_v3_settings',
  sessionResult: 'reimuru_v3_session_result',
  pendingGuestResult: 'reimuru_v3_pending_guest_result',
  guestTheme: 'reimuru_v3_guest_theme',
};

const PLAN_CATALOG = {
  free: {
    id: 'free',
    label: 'Free guest',
    shortLabel: 'Guest',
    providerLabel: 'DeepSeek',
    modelLabel: 'deepseek-chat',
    credits: 'No credits — no history',
    starterCredits: 0,
    note: 'Free entry path. Guest mode stays temporary and exported documents keep a subtle watermark.',
    guestOnly: true,
  },
  starter: {
    id: 'starter',
    label: 'Starter',
    shortLabel: 'Starter',
    providerLabel: 'GPT',
    modelLabel: 'gpt-5-mini',
    credits: '25 credits / month',
    starterCredits: 25,
    note: 'Lower-cost GPT plan with saved history and watermark-free exports.',
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    shortLabel: 'Standard',
    providerLabel: 'GPT',
    modelLabel: 'gpt-5',
    credits: '120 credits / month',
    starterCredits: 120,
    note: 'Best balance between quality, saved work, and long-term study value.',
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    shortLabel: 'Pro',
    providerLabel: 'GPT',
    modelLabel: 'gpt-5.2',
    credits: '400 credits / month',
    starterCredits: 400,
    note: 'Highest GPT tier in this build for deeper reasoning and bigger revision sessions.',
  },
};

const EXAM_STYLE_GROUPS = {
  main: ['GCSE', 'A-Level', 'IGCSE', 'IB', 'SAT', 'AP', 'University', 'OCR', 'Edexcel', 'Custom'],
  extra: ['Korean CSAT', 'Japanese Entrance', 'Chinese Gaokao', 'Singapore A-Level', 'Hong Kong DSE'],
};

const MOTIVATION_QUOTES = [
  { text: 'The beginning is the most important part of the work.', author: 'Plato' },
  { text: 'Education is the kindling of a flame, not the filling of a vessel.', author: 'Socrates' },
  { text: 'Rest satisfied with doing well, and leave others to talk of you as they please.', author: 'Pythagoras' },
  { text: 'Luck is what happens when preparation meets opportunity.', author: 'Seneca' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act but a habit.', author: 'Aristotle' },
  { text: 'Study the past if you would define the future.', author: 'Confucius' },
];

const AUTH_PAGES = new Set(['login', 'signup']);
const ACCOUNT_ONLY_PAGES = new Set(['dashboard', 'history']);

const DEFAULT_THEME = {
  accent: '#4f8cff',
  text: '#0f172a',
  bg: '#f6f8fc',
  card: '#ffffff',
};

const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

const session = {
  get(key, fallback = null) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    sessionStorage.removeItem(key);
  },
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const getPage = () => document.body.dataset.page || 'landing';
const params = new URLSearchParams(window.location.search);

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Just now'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const makeId = () => `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const initials = (name = 'Guest') =>
  name
    .split(' ')
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'GU';

const hashString = (value = '') => Array.from(String(value)).reduce((sum, char) => sum + char.charCodeAt(0), 0);

const getMotivationQuote = (seedSource = '') => {
  const daySeed = new Date().toISOString().slice(0, 10);
  const index = Math.abs(hashString(`${seedSource}-${daySeed}`)) % MOTIVATION_QUOTES.length;
  return MOTIVATION_QUOTES[index];
};

const estimateAnalysisRuns = (credits = 0) => Math.max(0, Math.floor(Number(credits || 0) / 10));

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex) => {
  const cleaned = String(hex).replace('#', '').trim();
  if (cleaned.length !== 6) return { r: 79, g: 140, b: 255 };
  const bigint = parseInt(cleaned, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const rgba = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const shiftHex = (hex, amount = 0) => {
  const { r, g, b } = hexToRgb(hex);
  const adj = (value) => clamp(value + amount, 0, 255);
  const toHex = (value) => value.toString(16).padStart(2, '0');
  return `#${toHex(adj(r))}${toHex(adj(g))}${toHex(adj(b))}`;
};

const sanitizeTheme = (theme = {}) => ({
  accent: /^#[0-9a-f]{6}$/i.test(theme.accent || '') ? theme.accent : DEFAULT_THEME.accent,
  text: /^#[0-9a-f]{6}$/i.test(theme.text || '') ? theme.text : DEFAULT_THEME.text,
  bg: /^#[0-9a-f]{6}$/i.test(theme.bg || '') ? theme.bg : DEFAULT_THEME.bg,
  card: /^#[0-9a-f]{6}$/i.test(theme.card || '') ? theme.card : DEFAULT_THEME.card,
});

const getAccounts = () => storage.get(STORAGE_KEYS.accounts, {});
const saveAccounts = (accounts) => storage.set(STORAGE_KEYS.accounts, accounts);
const getActiveUser = () => storage.get(STORAGE_KEYS.activeUser, null);
const setActiveUser = (user) => storage.set(STORAGE_KEYS.activeUser, user);
const clearActiveUser = () => storage.remove(STORAGE_KEYS.activeUser);

const getHistoryMap = () => storage.get(STORAGE_KEYS.histories, {});
const saveHistoryMap = (map) => storage.set(STORAGE_KEYS.histories, map);
const getSettingsMap = () => storage.get(STORAGE_KEYS.settings, {});
const saveSettingsMap = (map) => storage.set(STORAGE_KEYS.settings, map);

const getPlanMeta = (planId) => PLAN_CATALOG[planId] || PLAN_CATALOG.starter;

const normalizeUser = (user) => {
  if (!user) return null;
  const planMeta = getPlanMeta(user.plan || 'starter');
  return {
    name: user.name || 'Your name',
    email: user.email || 'you@reimuru.app',
    password: user.password || '',
    plan: planMeta.id,
    credits: Number.isFinite(Number(user.credits)) ? Number(user.credits) : planMeta.starterCredits,
    createdAt: user.createdAt || new Date().toISOString(),
    lastLoginAt: user.lastLoginAt || new Date().toISOString(),
  };
};

const saveUserToAccounts = (user) => {
  const normalized = normalizeUser(user);
  const accounts = getAccounts();
  accounts[normalized.email.toLowerCase()] = normalized;
  saveAccounts(accounts);
  setActiveUser(normalized);
  return normalized;
};

const getScopedSettings = () => {
  const user = getActiveUser();
  if (!user) return storage.get(STORAGE_KEYS.guestTheme, {});
  const map = getSettingsMap();
  return map[user.email.toLowerCase()] || {};
};

const saveScopedSettings = (settings) => {
  const user = getActiveUser();
  if (!user) {
    storage.set(STORAGE_KEYS.guestTheme, settings);
    return;
  }
  const map = getSettingsMap();
  map[user.email.toLowerCase()] = settings;
  saveSettingsMap(map);
};

const getHistoryForCurrentUser = () => {
  const user = getActiveUser();
  if (!user) return [];
  const map = getHistoryMap();
  const items = map[user.email.toLowerCase()] || [];
  return Array.isArray(items) ? items : [];
};

const saveHistoryForCurrentUser = (items) => {
  const user = getActiveUser();
  if (!user) return;
  const map = getHistoryMap();
  map[user.email.toLowerCase()] = items;
  saveHistoryMap(map);
};

const setCurrentResult = (result) => session.set(STORAGE_KEYS.sessionResult, result);
const getCurrentResult = () => session.get(STORAGE_KEYS.sessionResult, null);
const getPendingGuestResult = () => session.get(STORAGE_KEYS.pendingGuestResult, null);
const setPendingGuestResult = (result) => session.set(STORAGE_KEYS.pendingGuestResult, result);
const clearPendingGuestResult = () => session.remove(STORAGE_KEYS.pendingGuestResult);

const getAccessMode = () => (getActiveUser() ? 'account' : 'guest');
const getEffectivePlan = () => {
  const user = getActiveUser();
  return user ? getPlanMeta(user.plan).id : 'free';
};

const isGuestView = () => getAccessMode() === 'guest';

const sortNewestFirst = (items) =>
  [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

const getAvailableResults = () => {
  if (getActiveUser()) return sortNewestFirst(getHistoryForCurrentUser());
  const current = getCurrentResult();
  return current ? [current] : [];
};

const mergePendingGuestResultIntoAccount = () => {
  const pending = getPendingGuestResult();
  const user = getActiveUser();
  if (!pending || !user) return null;
  const currentHistory = getHistoryForCurrentUser();
  const exists = currentHistory.some((item) => item.id === pending.id);
  if (!exists) {
    const nextHistory = [pending, ...currentHistory];
    saveHistoryForCurrentUser(nextHistory);
  }
  clearPendingGuestResult();
  setCurrentResult(pending);
  return pending;
};

const normalizeResult = (payload = {}) => {
  const planMeta = getPlanMeta(payload.plan || getEffectivePlan());
  const notes = Array.isArray(payload.notes) ? payload.notes : [];
  const notesDocument = payload.notesDocument || notes.join('\n\n');
  const sourceMode = payload.sourceMode === 'expanded' ? 'expanded' : 'strict';
  const sourceCoverage =
    Number.isFinite(Number(payload.sourceCoverage)) ? clamp(Number(payload.sourceCoverage), 0, 100) : sourceMode === 'expanded' ? 68 : 96;
  const watermark = typeof payload.watermark === 'boolean' ? payload.watermark : !getActiveUser();

  return {
    id: payload.id || makeId(),
    title: payload.title || 'Untitled upload',
    subject: payload.subject || 'General Study',
    topic: payload.topic || 'Core Concepts',
    summary: payload.summary || 'Your study pack is ready.',
    notes,
    notesDocument,
    notesHtml: payload.notesHtml || textToEditorHtml(notesDocument),
    flashcards: Array.isArray(payload.flashcards) ? payload.flashcards : [],
    quizzes: Array.isArray(payload.quizzes) ? payload.quizzes : [],
    examQuestions: Array.isArray(payload.examQuestions) ? payload.examQuestions : [],
    examPack: payload.examPack || null,
    source: payload.source || (payload.provider === 'deepseek' ? 'deepseek' : payload.provider === 'openai' ? 'gpt' : 'fallback'),
    provider: payload.provider || 'fallback',
    model: payload.model || planMeta.modelLabel || '',
    plan: payload.plan || getEffectivePlan(),
    accessMode: payload.accessMode || getAccessMode(),
    warning: payload.warning || '',
    sourceMode,
    sourceCoverage,
    watermark,
    createdAt: payload.createdAt || new Date().toISOString(),
  };
};

const saveResultForAccess = (result) => {
  setCurrentResult(result);
  if (getActiveUser()) {
    const nextHistory = [result, ...getHistoryForCurrentUser().filter((item) => item.id !== result.id)];
    saveHistoryForCurrentUser(nextHistory);
    return { persisted: true };
  }
  setPendingGuestResult(result);
  return { persisted: false };
};

const updateStoredResult = (updated) => {
  const normalized = normalizeResult(updated);
  setCurrentResult(normalized);

  if (getActiveUser()) {
    const nextHistory = getHistoryForCurrentUser().map((item) => (item.id === normalized.id ? normalized : item));
    if (!nextHistory.some((item) => item.id === normalized.id)) nextHistory.unshift(normalized);
    saveHistoryForCurrentUser(nextHistory);
  } else {
    const pending = getPendingGuestResult();
    if (pending && pending.id === normalized.id) setPendingGuestResult(normalized);
  }
  return normalized;
};

const decrementCredit = () => {
  const user = getActiveUser();
  if (!user) return;
  const next = { ...user, credits: Math.max(0, Number(user.credits || 0) - 1), lastLoginAt: new Date().toISOString() };
  saveUserToAccounts(next);
};

const setFormStatus = (target, type, message) => {
  if (!target) return;
  target.className = `status-box show ${type}`;
  target.textContent = message;
};

const clearFormStatus = (target) => {
  if (!target) return;
  target.className = 'status-box';
  target.textContent = '';
};

const mountEmptyState = (target, title, copy, actions = '') => {
  if (!target) return;
  target.innerHTML = `
    <div class="empty-state">
      <div class="drop-icon">✦</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(copy)}</p>
      ${actions}
    </div>
  `;
};

const mountGuestGate = (target, title, copy) => {
  mountEmptyState(
    target,
    title,
    copy,
    `
      <div class="stack-actions center-actions">
        <a class="button" href="signup.html?plan=starter">Create account</a>
        <a class="button-secondary" href="upload.html?guest=1">Keep using free mode</a>
      </div>
    `
  );
};

const getThemeFromScope = () => {
  const settings = getScopedSettings() || {};
  return sanitizeTheme(settings.theme || DEFAULT_THEME);
};

const getWorkspaceSkin = () => {
  const settings = getScopedSettings() || {};
  return settings.workspaceSkin === 'paper' ? 'paper' : 'default';
};

const buildBackground = (theme, skin = 'default') => {
  if (skin === 'paper') {
    return `radial-gradient(circle at top left, ${rgba(theme.accent, 0.08)}, transparent 28%), linear-gradient(180deg, ${theme.bg} 0%, ${shiftHex(theme.bg, -4)} 100%), repeating-linear-gradient(0deg, rgba(118, 88, 42, 0.03) 0 1px, transparent 1px 32px)`;
  }
  return `radial-gradient(circle at top left, ${rgba(theme.accent, 0.12)}, transparent 32%), radial-gradient(circle at top right, ${rgba(theme.accent, 0.09)}, transparent 26%), linear-gradient(180deg, ${theme.bg} 0%, ${shiftHex(theme.bg, -6)} 100%)`;
};

const applyWorkspaceSkin = (skin = 'default') => {
  document.body.classList.toggle('skin-paper', skin === 'paper');
};

const applyTheme = (themeInput = DEFAULT_THEME) => {
  const theme = sanitizeTheme(themeInput);
  const root = document.documentElement;
  root.style.setProperty('--primary', theme.accent);
  root.style.setProperty('--primary-dark', shiftHex(theme.accent, -20));
  root.style.setProperty('--primary-fade', rgba(theme.accent, 0.14));
  root.style.setProperty('--accent', rgba(theme.accent, 0.10));
  root.style.setProperty('--text', theme.text);
  root.style.setProperty('--navy', theme.text);
  root.style.setProperty('--text-soft', rgba(theme.text, 0.72));
  root.style.setProperty('--text-muted', rgba(theme.text, 0.58));
  root.style.setProperty('--bg', theme.bg);
  root.style.setProperty('--bg-elevated', rgba(theme.card, 0.9));
  root.style.setProperty('--card', rgba(theme.card, 0.88));
  root.style.setProperty('--card-solid', theme.card);
  document.body.style.background = buildBackground(theme, getWorkspaceSkin());
};

const saveTheme = (themeInput) => {
  const currentSettings = getScopedSettings() || {};
  saveScopedSettings({ ...currentSettings, theme: sanitizeTheme(themeInput) });
  applyTheme(themeInput);
};

const textToEditorHtml = (text = '') => {
  const blocks = String(text)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) return '<p>Start writing here.</p>';

  return blocks
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return '';
      const [first, ...rest] = lines;
      if (rest.length === 0) return `<p>${escapeHtml(first)}</p>`;
      return `<section class="doc-section"><h3>${escapeHtml(first)}</h3>${rest
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join('')}</section>`;
    })
    .join('');
};

const htmlToPlainText = (html = '') => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.innerText.trim();
};

const downloadFile = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const openPrintWindow = ({ title, bodyClass = '', content = '', watermark = false }) => {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.7; }
          h1, h2, h3 { letter-spacing: -0.03em; }
          .print-sheet { position: relative; }
          .print-sheet::after {
            content: "";
            position: fixed;
            inset: 0;
            pointer-events: none;
            opacity: ${watermark ? '0.06' : '0'};
            background: url('${new URL('assets/logo-transparent.png', window.location.href).href}') center 40% / min(56vw, 460px) auto no-repeat;
          }
          .exam-line { margin-bottom: 18px; }
          .muted { color: #475569; }
        </style>
      </head>
      <body class="${bodyClass}">
        <div class="print-sheet">${content}</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
};

const simulateProgress = (config) => {
  const {
    shell,
    fill,
    valueNode,
    labelNode,
    copyNode,
    stages = [],
    finishLabel = 'Done',
  } = config;

  if (!shell || !fill || !valueNode) {
    return {
      setFinal() {},
      stop() {},
    };
  }

  shell.hidden = false;
  let percent = 0;
  let stageIndex = 0;
  const tick = () => {
    percent = Math.min(92, percent + Math.max(3, Math.floor(Math.random() * 9)));
    if (percent > (stageIndex + 1) * (92 / Math.max(1, stages.length))) {
      stageIndex = Math.min(stages.length - 1, stageIndex + 1);
    }
    fill.style.width = `${percent}%`;
    valueNode.textContent = `${percent}%`;
    if (labelNode) labelNode.textContent = stages[stageIndex]?.label || 'Working…';
    if (copyNode) copyNode.textContent = stages[stageIndex]?.copy || '';
  };
  tick();
  const interval = setInterval(tick, 480);

  return {
    setFinal(text) {
      clearInterval(interval);
      fill.style.width = '100%';
      valueNode.textContent = '100%';
      if (labelNode) labelNode.textContent = finishLabel;
      if (copyNode) copyNode.textContent = text || '';
      setTimeout(() => {
        shell.hidden = false;
      }, 200);
    },
    stop() {
      clearInterval(interval);
    },
    hideSoon() {
      clearInterval(interval);
      setTimeout(() => {
        shell.hidden = true;
      }, 500);
    },
  };
};

const injectBrand = () => {
  $$('[data-brand-lockup]').forEach((slot) => {
    const compact = slot.dataset.compact === 'true';
    slot.innerHTML = `
      <a href="index.html" class="logo-lockup sidebar-logo ${compact ? 'compact' : ''}" aria-label="Reimuru home">
        <img src="assets/logo-wordmark.png" alt="Reimuru" class="brand-wordmark-img">
      </a>
    `;
  });

  $$('[data-quote-surface]').forEach((slot, index) => {
    const quote = getMotivationQuote(`${getActiveUser()?.email || getPage()}-${index}`);
    const textNode = $('[data-quote-text]', slot);
    const authorNode = $('[data-quote-author]', slot);
    if (textNode) textNode.textContent = `"${quote.text}"`;
    if (authorNode) authorNode.textContent = `— ${quote.author}`;
  });
};

const renderSidebarNav = () => {
  const currentPage = getPage();
  const user = getActiveUser();
  const showPricing = !user;
  $$('[data-sidebar-nav]').forEach((nav) => {
    const items = [
      { href: 'dashboard.html', key: 'dashboard', label: 'Dashboard' },
      { href: 'upload.html', key: 'upload', label: 'Upload' },
      { href: 'results.html', key: 'results', label: 'Results' },
      { href: 'notes.html', key: 'notes', label: 'Notes' },
      { href: 'flashcards.html', key: 'flashcards', label: 'Flashcards' },
      { href: 'quiz.html', key: 'quiz', label: 'Quiz' },
      { href: 'exam.html', key: 'exam', label: 'Exam mode' },
      { href: 'history.html', key: 'history', label: 'History' },
      ...(showPricing ? [{ href: 'pricing.html', key: 'pricing', label: 'Pricing' }] : []),
      { href: 'settings.html', key: 'settings', label: 'Settings' },
    ];
    nav.innerHTML = items
      .map(
        (item) => `
          <a href="${item.href}" class="${currentPage === item.key ? 'active' : ''}">
            <span class="dot"></span>${item.label}
          </a>
        `
      )
      .join('');
  });
};

const updateShell = () => {
  const user = getActiveUser();
  const plan = getPlanMeta(getEffectivePlan());
  const accessCopy = user
    ? `${plan.label} · ${plan.modelLabel} · watermark-free`
    : 'Guest mode · DeepSeek · subtle watermark';

  $$('[data-user-name]').forEach((el) => {
    el.textContent = user ? user.name : 'Guest mode';
  });
  $$('[data-user-email]').forEach((el) => {
    el.textContent = user ? user.email : 'Nothing saves until you create an account';
  });
  $$('[data-user-initials]').forEach((el) => {
    el.textContent = initials(user ? user.name : 'Guest');
  });
  $$('[data-user-plan]').forEach((el) => {
    el.textContent = accessCopy;
  });
  $$('[data-user-credits]').forEach((el) => {
    el.textContent = user ? String(user.credits) : '—';
  });
  $$('[data-user-credits-copy]').forEach((el) => {
    el.textContent = user ? `${user.credits} credits left · about ${estimateAnalysisRuns(user.credits)} full analyses` : 'No credits in guest mode';
  });
  $$('[data-auth-only]').forEach((el) => {
    el.hidden = !user;
  });
  $$('[data-guest-only]').forEach((el) => {
    el.hidden = Boolean(user);
  });
  $$('[data-auth-link]').forEach((el) => {
    el.setAttribute('href', user ? 'dashboard.html' : 'signup.html?plan=starter');
  });
  $$('[data-upload-link]').forEach((el) => {
    el.setAttribute('href', user ? 'upload.html' : 'upload.html?guest=1');
  });
  $$('[data-current-plan-pill]').forEach((pill) => {
    pill.textContent = isGuestView() ? 'Guest mode' : `${plan.label} active`;
  });

  document.body.classList.toggle('is-guest', isGuestView());
  document.body.classList.toggle('is-paid', !isGuestView());
  $$('[data-watermark-surface]').forEach((el) => {
    el.classList.toggle('with-watermark', isGuestView());
  });
};

const sortResultActions = (items) => sortNewestFirst(items);

const loadResultForPage = () => {
  const id = params.get('id');
  const available = getAvailableResults();
  if (id) {
    const found = available.find((item) => item.id === id);
    if (found) return found;
  }
  return getCurrentResult() || available[0] || null;
};

const renderCurrentResult = (result) => {
  $('[data-result-title]') && ($('[data-result-title]').textContent = result.title);
  $('[data-result-summary]') && ($('[data-result-summary]').textContent = result.summary);
  $('[data-result-subject]') && ($('[data-result-subject]').textContent = result.subject);
  $('[data-result-topic]') && ($('[data-result-topic]').textContent = result.topic);
  $('[data-result-provider]') && ($('[data-result-provider]').textContent = result.provider === 'deepseek' ? 'DeepSeek' : result.provider === 'openai' ? 'GPT' : 'Fallback');
  $('[data-result-model]') && ($('[data-result-model]').textContent = result.model || '—');
  $('[data-result-date]') && ($('[data-result-date]').textContent = formatDate(result.createdAt));
  $('[data-result-source-mode]') && ($('[data-result-source-mode]').textContent = result.sourceMode === 'expanded' ? 'Wider AI context' : 'Source only');
  $('[data-result-coverage]') && ($('[data-result-coverage]').textContent = `${result.sourceCoverage}% from uploaded notes`);

  const warning = $('[data-result-warning]');
  if (warning) {
    warning.hidden = !result.warning;
    warning.textContent = result.warning || '';
  }

  const notesPreview = $('[data-result-notes-preview]');
  if (notesPreview) {
    const sections = String(result.notesDocument || '')
      .split(/\n{2,}/)
      .slice(0, 3)
      .map((part) => `<p>${escapeHtml(part.replace(/\n/g, ' '))}</p>`)
      .join('');
    notesPreview.innerHTML = sections || '<p>No notes generated yet.</p>';
  }

  const flashcards = $('[data-result-flashcards]');
  if (flashcards) {
    flashcards.innerHTML = (result.flashcards || [])
      .slice(0, 3)
      .map(
        (card, index) => `
          <article class="inline-card">
            <span class="side-label">Card ${index + 1}</span>
            <strong>${escapeHtml(card.question)}</strong>
            <p>${escapeHtml(card.answer)}</p>
          </article>
        `
      )
      .join('') || '<div class="inline-card">No flashcards generated yet.</div>';
  }

  const quizzes = $('[data-result-quizzes]');
  if (quizzes) {
    quizzes.innerHTML = (result.quizzes || [])
      .slice(0, 3)
      .map(
        (quiz, index) => `
          <article class="inline-card">
            <span class="side-label">Question ${index + 1}</span>
            <strong>${escapeHtml(quiz.question)}</strong>
            <p>${escapeHtml((quiz.options || [])[quiz.answerIndex] || 'Answer hidden')}</p>
          </article>
        `
      )
      .join('') || '<div class="inline-card">No quiz prompts generated yet.</div>';
  }

  const exams = $('[data-result-exam]');
  if (exams) {
    const examItems = result.examPack?.sections?.flatMap((section) => section.questions || []) || result.examQuestions || [];
    exams.innerHTML = examItems
      .slice(0, 3)
      .map(
        (item, index) => `
          <article class="inline-card">
            <span class="side-label">Exam ${index + 1}</span>
            <strong>${escapeHtml(item.prompt || item.question)}</strong>
            <p>${escapeHtml(item.answerGuide || 'Structured answer guidance ready.')}</p>
          </article>
        `
      )
      .join('') || '<div class="inline-card">No exam prompts generated yet.</div>';
  }

  const guestButtons = $$('[data-save-guest-result]');
  guestButtons.forEach((button) => {
    button.hidden = !isGuestView();
  });
};

const renderDashboard = () => {
  const target = $('[data-dashboard-root]');
  if (!target) return;
  if (!getActiveUser()) {
    mountGuestGate(
      target,
      'Guest mode works. It just does not save.',
      'Create an account to unlock saved history, cleaner exports, and the fuller study workspace.'
    );
    return;
  }

  const user = getActiveUser();
  const history = getHistoryForCurrentUser();
  const latest = history[0];
  const totalFlashcards = history.reduce((sum, item) => sum + (item.flashcards?.length || 0), 0);
  const totalQuizzes = history.reduce((sum, item) => sum + (item.quizzes?.length || 0), 0);
  const quote = getMotivationQuote(user.email || user.name);
  const bySubject = history.reduce((acc, item) => {
    const key = item.subject || 'General Study';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const strongestSubject = Object.entries(bySubject).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General Study';
  const planMeta = getPlanMeta(user.plan);
  const runsLeft = estimateAnalysisRuns(user.credits);

  target.innerHTML = `
    <section class="dashboard-hero-v4 card">
      <div class="dashboard-hero-main">
        <span class="section-label">Workspace</span>
        <h2>Welcome back, ${escapeHtml(user.name)}.</h2>
        <p>Your study system is ready. You are on <strong>${escapeHtml(planMeta.label)}</strong>, which means ${escapeHtml(planMeta.note.toLowerCase())}</p>
        <div class="dashboard-hero-actions">
          <a class="button" href="upload.html">Analyze something new</a>
          <a class="button-secondary" href="${latest ? `results.html?id=${encodeURIComponent(latest.id)}` : 'upload.html'}">${latest ? 'Continue last session' : 'Start first session'}</a>
          <a class="button-ghost" href="exam.html">Open exam mode</a>
        </div>
      </div>
      <div class="dashboard-hero-side">
        <article class="quote-card dashboard-quote-card">
          <span class="section-label">Daily push</span>
          <blockquote>“${escapeHtml(quote.text)}”</blockquote>
          <p>— ${escapeHtml(quote.author)}</p>
        </article>
        <article class="insight-card-v4">
          <span class="section-label">Confidence insight</span>
          <h3>${escapeHtml(strongestSubject)}</h3>
          <p>${history.length ? 'This is your strongest lane right now based on saved work. Keep pressure-testing it in quiz and exam mode.' : 'Your first saved pack will unlock confidence insight here.'}</p>
        </article>
      </div>
    </section>

    <div class="metric-grid metric-grid-4">
      <article class="metric-card card">
        <h3>Saved analyses</h3>
        <div class="metric-value">${history.length}</div>
        <p class="metric-caption">Every result that mattered enough to keep.</p>
      </article>
      <article class="metric-card card">
        <h3>Flashcards</h3>
        <div class="metric-value">${totalFlashcards}</div>
        <p class="metric-caption">Ready whenever you want active recall.</p>
      </article>
      <article class="metric-card card">
        <h3>Quiz prompts</h3>
        <div class="metric-value">${totalQuizzes}</div>
        <p class="metric-caption">Built from your own uploads, not generic worksheets.</p>
      </article>
      <article class="metric-card card">
        <h3>Credit clarity</h3>
        <div class="metric-value">≈ ${runsLeft}</div>
        <p class="metric-caption">Estimated full analyses left before you need a top-up.</p>
      </article>
    </div>

    <div class="dashboard-v4-grid">
      <section class="list-card card dashboard-flow-card">
        <span class="section-label">Study flow</span>
        <h3>Move through the whole revision loop</h3>
        <div class="mini-flow dashboard-flow">
          <span>Upload</span>
          <span>Notes</span>
          <span>Quiz</span>
          <span>Exam</span>
        </div>
        <p class="metric-caption">This is one of the strongest selling points in the app: fewer resets, cleaner momentum, less friction.</p>
        <div class="stack-actions" style="margin-top:18px;">
          <a class="button-secondary" href="upload.html">Start study flow</a>
        </div>
      </section>

      <section class="list-card card">
        <span class="section-label">Latest study packs</span>
        <h3>Continue where you left off</h3>
        <div class="timeline">
          ${
            history.length
              ? history
                  .slice(0, 4)
                  .map(
                    (item) => `
                      <article class="timeline-item">
                        <strong>${escapeHtml(item.title)}</strong>
                        <p>${escapeHtml(item.summary)}</p>
                        <div class="meta">
                          <span class="pill">${escapeHtml(item.subject)}</span>
                          <span class="pill">${escapeHtml(item.topic)}</span>
                          <span class="pill">${escapeHtml(formatDate(item.createdAt))}</span>
                        </div>
                      </article>
                    `
                  )
                  .join('')
              : '<div class="inline-card">Analyze your first file and your saved history starts here.</div>'
          }
        </div>
      </section>

      <section class="list-card card dashboard-side-card">
        <span class="section-label">What sells</span>
        <h3>Keep the strongest ideas visible</h3>
        <div class="idea-list">
          <article>
            <strong>Guided study flow</strong>
            <p>Notes, flashcards, quiz, then exam mode in one proper sequence.</p>
          </article>
          <article>
            <strong>Confidence insight</strong>
            <p>Spot which subject lane is getting stronger from your own work.</p>
          </article>
          <article>
            <strong>Credit intelligence</strong>
            <p>See roughly how many serious runs you still have left.</p>
          </article>
        </div>
      </section>

      <section class="list-card card dashboard-side-card">
        <span class="section-label">Current plan</span>
        <h3>${escapeHtml(planMeta.label)} active</h3>
        <div class="detail-list">
          <div><span>Model path</span><strong>${escapeHtml(planMeta.modelLabel)}</strong></div>
          <div><span>Credits left</span><strong>${user.credits}</strong></div>
          <div><span>Approx. full analyses</span><strong>${runsLeft}</strong></div>
        </div>
        <div class="stack-actions" style="margin-top:18px;">
          <a class="button-secondary" href="settings.html">Manage plan & theme</a>
        </div>
      </section>
    </div>
  `;
};

const renderHistoryPage = () => {
  const target = $('[data-history-root]');
  if (!target) return;
  if (!getActiveUser()) {
    mountGuestGate(
      target,
      'History is locked until you sign in.',
      'Guest mode is deliberately temporary. Create an account and every study pack starts saving automatically.'
    );
    return;
  }

  const items = sortNewestFirst(getHistoryForCurrentUser());
  if (!items.length) {
    mountEmptyState(
      target,
      'No saved study packs yet',
      'Analyze your first file and it will start building your history automatically.',
      '<div class="stack-actions center-actions"><a class="button" href="upload.html">Analyze first file</a></div>'
    );
    return;
  }

  target.innerHTML = items
    .map(
      (item) => `
        <article class="history-item">
          <div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.summary)}</p>
          </div>
          <div class="history-meta">
            <span class="pill">${escapeHtml(item.subject)}</span>
            <span class="pill">${escapeHtml(item.topic)}</span>
            <span class="pill">${escapeHtml(formatDate(item.createdAt))}</span>
          </div>
          <div class="history-actions">
            <a class="button-secondary" href="results.html?id=${encodeURIComponent(item.id)}">Open</a>
            <button class="button-ghost" type="button" data-delete-history="${escapeHtml(item.id)}">Delete</button>
          </div>
        </article>
      `
    )
    .join('');

  $$('[data-delete-history]', target).forEach((button) => {
    button.addEventListener('click', () => {
      const next = getHistoryForCurrentUser().filter((item) => item.id !== button.dataset.deleteHistory);
      saveHistoryForCurrentUser(next);
      renderHistoryPage();
    });
  });
};

const renderFlashcardsPage = () => {
  const target = $('[data-flashcards-root]');
  if (!target) return;
  const cards = getAvailableResults().flatMap((item) =>
    (item.flashcards || []).map((card, index) => ({ ...card, source: item.title, subject: item.subject, index }))
  );

  if (!cards.length) {
    mountEmptyState(
      target,
      'No flashcards yet',
      'Analyze a file and Reimuru will build flashcards from the important ideas.',
      `<div class="stack-actions center-actions"><a class="button" href="${isGuestView() ? 'upload.html?guest=1' : 'upload.html'}">Create flashcards</a></div>`
    );
    return;
  }

  target.innerHTML = `<div class="flash-grid">${cards
    .map(
      (card) => `
        <article class="flash-card" data-flash-card>
          <span class="side-label">${escapeHtml(card.subject)} · ${escapeHtml(card.source)}</span>
          <div class="question"><strong>${escapeHtml(card.question)}</strong></div>
          <div class="answer">
            <strong>Answer</strong>
            <p>${escapeHtml(card.answer)}</p>
          </div>
        </article>
      `
    )
    .join('')}</div>`;

  $$('[data-flash-card]', target).forEach((card) => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
  });
};

const buildQuizSeedBank = (results) => {
  const direct = results.flatMap((item) =>
    (item.quizzes || []).map((quiz) => ({
      ...quiz,
      source: item.title,
      subject: item.subject,
      topic: item.topic,
    }))
  );

  if (direct.length) return direct;

  return results.flatMap((item) =>
    (item.flashcards || []).map((card) => ({
      question: card.question,
      options: [
        card.answer,
        'A distractor that sounds close but misses the core point',
        'An answer from a different topic entirely',
        'A confident-sounding but incorrect statement',
      ],
      answerIndex: 0,
      explanation: card.answer,
      source: item.title,
      subject: item.subject,
      topic: item.topic,
    }))
  );
};

const buildQuizMaterial = () => {
  const results = getAvailableResults();
  if (!results.length) return null;
  const latest = results[0];
  return {
    title: latest.title,
    subject: latest.subject,
    topic: latest.topic,
    summary: latest.summary,
    notes: latest.notes || [],
    flashcards: latest.flashcards || [],
    notesDocument: latest.notesDocument || '',
  };
};

const quizState = {
  mode: 'practice',
  bank: [],
  material: null,
  current: null,
  asked: [],
  responses: [],
  loading: false,
};

const renderQuizSummary = () => {
  const progress = $('[data-quiz-progress]');
  if (!progress) return;
  const correctCount = quizState.responses.filter((item) => item.correct).length;
  progress.innerHTML = `
    <span class="pill">Mode: ${escapeHtml(quizState.mode === 'practice' ? 'Practice' : 'Test')}</span>
    <span class="pill">Questions answered: ${quizState.responses.length}</span>
    <span class="pill">Correct: ${correctCount}</span>
    <span class="pill">Unlimited queue: on</span>
  `;
};

const renderQuizReview = () => {
  const review = $('[data-quiz-review]');
  if (!review) return;
  if (!quizState.responses.length) {
    review.innerHTML = '';
    return;
  }

  review.innerHTML = `
    <section class="quiz-review card">
      <div class="section-head compact">
        <div>
          <span class="section-label">Reveal</span>
          <h3>All answers from this session</h3>
        </div>
      </div>
      <div class="quiz-review-list">
        ${quizState.responses
          .map(
            (item, index) => `
              <article class="review-item ${item.correct ? 'correct' : 'incorrect'}">
                <strong>${index + 1}. ${escapeHtml(item.question.question)}</strong>
                <p><span class="muted">Your answer:</span> ${escapeHtml(item.question.options[item.selectedIndex] || 'No answer')}</p>
                <p><span class="muted">Correct answer:</span> ${escapeHtml(item.question.options[item.question.answerIndex] || 'Unknown')}</p>
                <p>${escapeHtml(item.question.explanation || '')}</p>
              </article>
            `
          )
          .join('')}
      </div>
    </section>
  `;
};

const revealCurrentAnswer = () => {
  const answerPanel = $('[data-quiz-feedback]');
  if (!answerPanel || !quizState.current) return;
  answerPanel.hidden = false;
  answerPanel.innerHTML = `
    <strong>Answer</strong>
    <p>${escapeHtml(quizState.current.options[quizState.current.answerIndex] || '—')}</p>
    <p class="muted">${escapeHtml(quizState.current.explanation || '')}</p>
  `;
  $$('[data-quiz-option]').forEach((button) => {
    const idx = Number(button.dataset.optionIndex);
    button.disabled = true;
    button.classList.toggle('correct', idx === quizState.current.answerIndex);
  });
  $('[data-next-question]')?.removeAttribute('hidden');
};

const renderQuizQuestion = () => {
  const shell = $('[data-quiz-root]');
  if (!shell) return;

  if (!quizState.current) {
    shell.innerHTML = `
      <div class="quiz-card card">
        <span class="section-label">Quiz</span>
        <h3>Ready when you are.</h3>
        <p>Start a session and Reimuru will keep feeding you the next question until you stop.</p>
        <div class="stack-actions">
          <button class="button" type="button" data-start-quiz>Start ${quizState.mode === 'practice' ? 'practice' : 'test'} mode</button>
        </div>
      </div>
    `;
    $('[data-start-quiz]')?.addEventListener('click', () => nextQuizQuestion());
    return;
  }

  shell.innerHTML = `
    <article class="quiz-card card">
      <div class="quiz-topline">
        <span class="section-label">${escapeHtml(quizState.current.subject || quizState.material.subject || 'Study pack')}</span>
        <span class="pill">${escapeHtml(quizState.current.source || quizState.material.title || 'Current result')}</span>
      </div>
      <h3>${escapeHtml(quizState.current.question)}</h3>
      <div class="quiz-options">
        ${(quizState.current.options || [])
          .map(
            (option, index) => `
              <button class="quiz-option" type="button" data-quiz-option data-option-index="${index}">
                ${escapeHtml(option)}
              </button>
            `
          )
          .join('')}
      </div>
      <div class="quiz-inline-actions">
        <button class="button-ghost" type="button" data-show-answer ${quizState.mode === 'test' ? 'hidden' : ''}>Show answer now</button>
        <button class="button-ghost" type="button" data-skip-question>Skip</button>
        <button class="button-secondary" type="button" data-next-question hidden>Next question</button>
        <button class="button-secondary" type="button" data-reveal-all ${quizState.responses.length ? '' : 'hidden'}>Reveal all answers</button>
      </div>
      <div class="quiz-explanation" data-quiz-feedback hidden></div>
    </article>
  `;

  $$('[data-quiz-option]').forEach((button) => {
    button.addEventListener('click', () => handleQuizAnswer(Number(button.dataset.optionIndex)));
  });
  $('[data-show-answer]')?.addEventListener('click', revealCurrentAnswer);
  $('[data-skip-question]')?.addEventListener('click', () => nextQuizQuestion());
  $('[data-next-question]')?.addEventListener('click', () => nextQuizQuestion());
  $('[data-reveal-all]')?.addEventListener('click', renderQuizReview);
  renderQuizSummary();
};

const handleQuizAnswer = (selectedIndex) => {
  if (!quizState.current) return;
  const correct = selectedIndex === quizState.current.answerIndex;
  quizState.responses.push({ question: quizState.current, selectedIndex, correct });
  renderQuizSummary();

  if (quizState.mode === 'practice') {
    const feedback = $('[data-quiz-feedback]');
    if (feedback) {
      feedback.hidden = false;
      feedback.innerHTML = `
        <strong>${correct ? 'Correct.' : 'Not quite.'}</strong>
        <p>${escapeHtml(quizState.current.options[quizState.current.answerIndex] || '—')}</p>
        <p class="muted">${escapeHtml(quizState.current.explanation || '')}</p>
      `;
    }
    $$('[data-quiz-option]').forEach((button) => {
      const idx = Number(button.dataset.optionIndex);
      button.disabled = true;
      button.classList.toggle('correct', idx === quizState.current.answerIndex);
      button.classList.toggle('incorrect', idx === selectedIndex && idx !== quizState.current.answerIndex);
    });
    $('[data-next-question]')?.removeAttribute('hidden');
    $('[data-reveal-all]')?.removeAttribute('hidden');
    return;
  }

  renderQuizReview();
  setTimeout(() => nextQuizQuestion(), 180);
};

const requestMoreQuizQuestions = async () => {
  if (!quizState.material || quizState.loading) return null;
  quizState.loading = true;
  try {
    const response = await fetch('/api/quiz/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        material: quizState.material,
        plan: getEffectivePlan(),
        guestMode: isGuestView(),
        recentQuestions: quizState.asked,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not generate another quiz question.');
    return payload;
  } catch {
    return null;
  } finally {
    quizState.loading = false;
  }
};

const nextQuizQuestion = async () => {
  if (!quizState.material) return;
  let next = quizState.bank.find((item) => !quizState.asked.includes(item.question));
  if (!next) {
    const fresh = await requestMoreQuizQuestions();
    if (fresh) {
      quizState.bank.push(fresh);
      next = fresh;
    }
  }
  if (!next) {
    next = buildQuizSeedBank([{ ...quizState.material, quizzes: [], flashcards: quizState.material.flashcards }]).find(
      (item) => !quizState.asked.includes(item.question)
    );
  }

  if (!next) {
    const shell = $('[data-quiz-root]');
    mountEmptyState(
      shell,
      'You cleared the current quiz bank.',
      'Reveal all answers or run another analysis to feed the quiz engine more source material.',
      '<div class="stack-actions center-actions"><button class="button-secondary" type="button" data-reveal-final>Reveal all answers</button></div>'
    );
    $('[data-reveal-final]')?.addEventListener('click', renderQuizReview);
    return;
  }

  quizState.current = next;
  quizState.asked.push(next.question);
  renderQuizQuestion();
};

const renderQuizPage = () => {
  const root = $('[data-quiz-root]');
  if (!root) return;
  const results = getAvailableResults();
  if (!results.length) {
    mountEmptyState(
      root,
      'No quiz source yet',
      'Analyze a file first and your practice mode will have something real to work from.',
      `<div class="stack-actions center-actions"><a class="button" href="${isGuestView() ? 'upload.html?guest=1' : 'upload.html'}">Generate source material</a></div>`
    );
    return;
  }

  quizState.mode = 'practice';
  quizState.material = buildQuizMaterial();
  quizState.bank = buildQuizSeedBank(results);
  quizState.current = null;
  quizState.asked = [];
  quizState.responses = [];

  $$('[data-quiz-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      $$('[data-quiz-mode]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      quizState.mode = button.dataset.quizMode;
      quizState.current = null;
      quizState.asked = [];
      quizState.responses = [];
      renderQuizReview();
      renderQuizQuestion();
      renderQuizSummary();
    });
  });

  renderQuizSummary();
  renderQuizQuestion();
};

const initUploadPage = () => {
  const form = $('[data-upload-form]');
  if (!form) return;
  const input = $('[data-file-input]');
  const fileList = $('[data-file-list]');
  const browse = $('[data-browse-files]');
  const dropzone = $('[data-dropzone]');
  const status = $('[data-upload-status]');
  const modeMeta = $('[data-upload-access]');
  let sourceMode = 'strict';

  const accessCopy = () => {
    const plan = getPlanMeta(getEffectivePlan());
    return isGuestView()
      ? `You are in free guest mode. Reimuru will use DeepSeek, keep this session temporary, and watermark exported documents.`
      : `You are on ${plan.label}. Reimuru will route this upload through ${plan.modelLabel}, save it to your history, and export watermark-free.`;
  };
  if (modeMeta) modeMeta.textContent = accessCopy();

  const renderFiles = () => {
    const files = input?.files ? Array.from(input.files) : [];
    if (!fileList) return;
    fileList.innerHTML = files
      .map(
        (file) => `
          <span class="file-chip">
            <strong>${escapeHtml(file.name)}</strong>
            <span class="muted small">${Math.max(1, Math.round(file.size / 1024))} KB</span>
          </span>
        `
      )
      .join('');
  };

  $$('[data-source-mode]', form.closest('.main-panel')).forEach((button) => {
    button.addEventListener('click', () => {
      sourceMode = button.dataset.sourceMode;
      $$('[data-source-mode]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
    });
  });

  browse?.addEventListener('click', () => input?.click());
  input?.addEventListener('change', renderFiles);

  ['dragenter', 'dragover'].forEach((name) => {
    dropzone?.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach((name) => {
    dropzone?.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone?.addEventListener('drop', (event) => {
    const files = event.dataTransfer?.files;
    if (!files?.length || !input) return;
    input.files = files;
    renderFiles();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormStatus(status);
    const file = input?.files?.[0];
    if (!file) {
      setFormStatus(status, 'error', 'Upload one file first.');
      return;
    }

    const user = getActiveUser();
    if (user && Number(user.credits || 0) <= 0) {
      setFormStatus(status, 'error', 'You are out of credits on this local build. Move plans in Settings when you want more.');
      return;
    }

    const progress = simulateProgress({
      shell: $('[data-progress-shell]'),
      fill: $('[data-progress-fill]'),
      valueNode: $('[data-progress-value]'),
      labelNode: $('[data-progress-label]'),
      copyNode: $('[data-progress-copy]'),
      stages: [
        { label: 'Uploading…', copy: 'Sending the file into the study pipeline.' },
        { label: 'Reading source…', copy: 'Pulling out the usable material and structure.' },
        { label: 'Building notes…', copy: 'Turning the source into long-form revision notes.' },
        { label: 'Generating flashcards…', copy: 'Creating recall-friendly prompts.' },
        { label: 'Preparing quiz & exam mode…', copy: 'Structuring practice and exam-ready output.' },
      ],
      finishLabel: 'Study pack ready',
    });

    setFormStatus(status, 'info', 'Building your study pack…');
    const formData = new FormData(form);
    formData.set('file', file);
    formData.set('plan', getEffectivePlan());
    formData.set('guestMode', String(isGuestView()));
    formData.set('sourceMode', sourceMode);

    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Upload failed.');
      const result = normalizeResult(payload);
      saveResultForAccess(result);
      if (getActiveUser()) decrementCredit();
      updateShell();
      progress.setFinal('Finished. Opening the result now.');
      setFormStatus(status, 'success', isGuestView() ? 'Done. Opening your temporary result…' : 'Done. Saved to your history. Opening result…');
      setTimeout(() => {
        window.location.href = isGuestView() ? 'results.html' : `results.html?id=${encodeURIComponent(result.id)}`;
      }, 550);
    } catch (error) {
      progress.stop();
      setFormStatus(status, 'error', error.message || 'Something went wrong while analyzing your file.');
    }
  });
};

const initGuestSaveCTA = () => {
  $$('[data-save-guest-result]').forEach((button) => {
    button.addEventListener('click', () => {
      window.location.href = 'signup.html?plan=starter&savePending=1';
    });
  });
};

const renderNotesPage = () => {
  const root = $('[data-notes-root]');
  if (!root) return;
  const result = loadResultForPage();
  if (!result) {
    mountEmptyState(
      root,
      'No notes loaded yet',
      'Analyze a file first and the detailed notes document will appear here.',
      `<div class="stack-actions center-actions"><a class="button" href="${isGuestView() ? 'upload.html?guest=1' : 'upload.html'}">Analyze something</a></div>`
    );
    return;
  }

  $('[data-notes-title]') && ($('[data-notes-title]').textContent = `${result.title} · detailed notes`);
  const editor = $('[data-notes-editor]');
  if (editor) editor.innerHTML = result.notesHtml || textToEditorHtml(result.notesDocument || '');
  setNotesCoverageUI(result.sourceCoverage, result.sourceMode);
  $$('[data-notes-source]').forEach((button) => {
    button.classList.toggle('active', button.dataset.notesSource === result.sourceMode);
  });
};

const setNotesCoverageUI = (coverage = 96, mode = 'strict') => {
  $('[data-notes-coverage-label]') && ($('[data-notes-coverage-label]').textContent = `${coverage}%`);
  $('[data-notes-coverage-fill]') && ($('[data-notes-coverage-fill]').style.width = `${coverage}%`);
  $('[data-notes-coverage-copy]') &&
    ($('[data-notes-coverage-copy]').textContent =
      mode === 'expanded'
        ? 'Broader AI context allowed. The uploaded material still stays central.'
        : 'Mostly anchored to the uploaded material.');
};

const initNotesPage = () => {
  const editor = $('[data-notes-editor]');
  if (!editor) return;

  renderNotesPage();

  let selectedMode = loadResultForPage()?.sourceMode || 'strict';

  $$('[data-notes-source]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedMode = button.dataset.notesSource;
      $$('[data-notes-source]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      setNotesCoverageUI(selectedMode === 'expanded' ? 68 : 96, selectedMode);
    });
  });

  $$('[data-editor-command]').forEach((button) => {
    button.addEventListener('click', () => {
      const command = button.dataset.editorCommand;
      const value = button.dataset.editorValue || null;
      document.execCommand(command, false, value);
      editor.focus();
    });
  });

  $('[data-notes-save]')?.addEventListener('click', () => {
    const result = loadResultForPage();
    if (!result) return;
    const updated = updateStoredResult({
      ...result,
      notesHtml: editor.innerHTML,
      notesDocument: htmlToPlainText(editor.innerHTML),
      sourceMode: selectedMode,
      sourceCoverage: selectedMode === 'expanded' ? 68 : 96,
    });
    setFormStatus($('[data-notes-status]'), 'success', isGuestView() ? 'Saved in this session only.' : 'Notes saved.');
    setNotesCoverageUI(updated.sourceCoverage, updated.sourceMode);
  });

  $('[data-notes-regenerate]')?.addEventListener('click', async () => {
    const result = loadResultForPage();
    if (!result) return;
    const progress = simulateProgress({
      shell: $('[data-notes-progress]'),
      fill: $('[data-notes-progress-fill]'),
      valueNode: $('[data-notes-progress-value]'),
      labelNode: $('[data-notes-progress-label]'),
      copyNode: $('[data-notes-progress-copy]'),
      stages: [
        { label: 'Reading current result…', copy: 'Using your latest notes, summary, and study pack context.' },
        { label: 'Restructuring notes…', copy: 'Expanding the document into a cleaner long-form set of notes.' },
        { label: 'Finishing…', copy: 'Applying the selected source mode and final structure.' },
      ],
      finishLabel: 'Notes ready',
    });

    try {
      const response = await fetch('/api/notes/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: result,
          plan: getEffectivePlan(),
          guestMode: isGuestView(),
          sourceMode: selectedMode,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not refresh notes.');
      const updated = updateStoredResult({
        ...result,
        notesDocument: payload.notesDocument,
        notesHtml: textToEditorHtml(payload.notesDocument),
        summary: payload.summary || result.summary,
        sourceMode: payload.sourceMode || selectedMode,
        sourceCoverage: payload.sourceCoverage ?? (selectedMode === 'expanded' ? 68 : 96),
      });
      editor.innerHTML = updated.notesHtml;
      setNotesCoverageUI(updated.sourceCoverage, updated.sourceMode);
      progress.setFinal('Done. The notes document has been refreshed.');
      setFormStatus($('[data-notes-status]'), 'success', 'Notes refreshed.');
    } catch (error) {
      progress.stop();
      setFormStatus($('[data-notes-status]'), 'error', error.message || 'Could not refresh notes.');
    }
  });

  $$('[data-notes-download]').forEach((button) => {
    button.addEventListener('click', () => {
      const result = loadResultForPage();
      if (!result) return;
      const html = editor.innerHTML;
      const text = htmlToPlainText(html);
      const type = button.dataset.notesDownload;
      const safeName = String(result.title || 'notes').replace(/\.[^/.]+$/, '').replace(/\s+/g, '-').toLowerCase();

      if (type === 'txt') {
        downloadFile(`${safeName}-notes.txt`, text, 'text/plain;charset=utf-8');
        return;
      }
      if (type === 'html') {
        downloadFile(`${safeName}-notes.doc`, `<html><body>${html}</body></html>`, 'application/msword');
        return;
      }
      openPrintWindow({
        title: `${result.title} notes`,
        bodyClass: 'notes-print',
        watermark: isGuestView(),
        content: `<h1>${escapeHtml(result.title)}</h1><p class="muted">${escapeHtml(result.subject)} · detailed notes</p>${html}`,
      });
    });
  });
};

const examTimerState = {
  running: false,
  paused: false,
  direction: 'down',
  display: 'digital',
  startedAt: null,
  pausedAt: null,
  elapsedMs: 0,
  durationSeconds: 0,
  interval: null,
};

const setExamOverlay = (visible) => {
  const overlay = $('[data-exam-overlay]');
  if (!overlay) return;
  overlay.hidden = !visible;
};

const updateAnalogClock = (seconds) => {
  const hourHand = $('.hand.hour', $('[data-timer-analog]'));
  const minuteHand = $('.hand.minute', $('[data-timer-analog]'));
  const secondHand = $('.hand.second', $('[data-timer-analog]'));
  if (!hourHand || !minuteHand || !secondHand) return;

  const secs = seconds % 60;
  const mins = Math.floor(seconds / 60) % 60;
  const hours = Math.floor(seconds / 3600) % 12;
  hourHand.style.transform = `translateX(-50%) rotate(${hours * 30 + mins * 0.5}deg)`;
  minuteHand.style.transform = `translateX(-50%) rotate(${mins * 6}deg)`;
  secondHand.style.transform = `translateX(-50%) rotate(${secs * 6}deg)`;
};

const renderTimerDisplay = () => {
  const elapsed = examTimerState.elapsedMs + (examTimerState.running && !examTimerState.paused && examTimerState.startedAt ? Date.now() - examTimerState.startedAt : 0);
  const elapsedSeconds = Math.floor(elapsed / 1000);
  const displaySeconds =
    examTimerState.direction === 'down'
      ? Math.max(0, examTimerState.durationSeconds - elapsedSeconds)
      : elapsedSeconds;
  const mins = String(Math.floor(displaySeconds / 60)).padStart(2, '0');
  const secs = String(displaySeconds % 60).padStart(2, '0');

  $('[data-timer-digital]') && ($('[data-timer-digital]').textContent = `${mins}:${secs}`);
  $('[data-timer-direction]') && ($('[data-timer-direction]').textContent = examTimerState.direction === 'down' ? 'Count down' : 'Count up');
  $('[data-timer-display]') && ($('[data-timer-display]').textContent = examTimerState.display === 'digital' ? 'Digital' : 'Analog');

  const analog = $('[data-timer-analog]');
  const digital = $('[data-timer-digital]');
  if (analog && digital) {
    analog.hidden = examTimerState.display !== 'analog';
    digital.hidden = examTimerState.display !== 'digital';
  }
  updateAnalogClock(displaySeconds);

  if (examTimerState.direction === 'down' && displaySeconds <= 0 && examTimerState.running) {
    pauseExamTimer();
    setFormStatus($('[data-exam-status]'), 'info', 'Time is up.');
  }
};

const clearExamTimerInterval = () => {
  if (examTimerState.interval) clearInterval(examTimerState.interval);
  examTimerState.interval = null;
};

const startExamTimer = () => {
  if (!examTimerState.durationSeconds) return;
  if (!examTimerState.running) {
    examTimerState.running = true;
    examTimerState.startedAt = Date.now();
    examTimerState.paused = false;
    clearExamTimerInterval();
    examTimerState.interval = setInterval(renderTimerDisplay, 250);
    renderTimerDisplay();
    return;
  }
  if (examTimerState.paused) {
    examTimerState.paused = false;
    examTimerState.startedAt = Date.now();
    clearExamTimerInterval();
    examTimerState.interval = setInterval(renderTimerDisplay, 250);
    renderTimerDisplay();
  }
};

const pauseExamTimer = (showOverlay = true) => {
  if (!examTimerState.running || examTimerState.paused) {
    if (showOverlay) setExamOverlay(true);
    return;
  }
  examTimerState.elapsedMs += Date.now() - examTimerState.startedAt;
  examTimerState.startedAt = null;
  examTimerState.paused = true;
  clearExamTimerInterval();
  renderTimerDisplay();
  if (showOverlay) setExamOverlay(true);
};

const initTimerInteractions = () => {
  const timerCard = $('[data-exam-timer-card]');
  if (!timerCard) return;

  let clickTimeout = null;
  timerCard.addEventListener('click', () => {
    if (clickTimeout) clearTimeout(clickTimeout);
    clickTimeout = setTimeout(() => {
      examTimerState.direction = examTimerState.direction === 'down' ? 'up' : 'down';
      renderTimerDisplay();
    }, 220);
  });

  timerCard.addEventListener('dblclick', (event) => {
    event.preventDefault();
    if (clickTimeout) clearTimeout(clickTimeout);
    examTimerState.display = examTimerState.display === 'digital' ? 'analog' : 'digital';
    renderTimerDisplay();
  });

  $('[data-exam-start]')?.addEventListener('click', () => {
    startExamTimer();
    setExamOverlay(false);
  });
  $('[data-exam-pause]')?.addEventListener('click', () => {
    pauseExamTimer(false);
    setFormStatus($('[data-exam-status]'), 'info', 'Timer paused. Resume whenever you are ready.');
  });
  $('[data-exam-resume]')?.addEventListener('click', () => {
    setExamOverlay(false);
    startExamTimer();
  });
};

const renderExamStyles = () => {
  const renderGroup = (targetSelector, styles) => {
    const target = $(targetSelector);
    if (!target) return;
    target.innerHTML = styles
      .map(
        (style, index) => `
          <button class="style-chip ${index === 0 ? 'active' : ''}" type="button" data-exam-style="${escapeHtml(style)}">${escapeHtml(style)}</button>
        `
      )
      .join('');
  };
  renderGroup('[data-exam-styles-main]', EXAM_STYLE_GROUPS.main);
  renderGroup('[data-exam-styles-extra]', EXAM_STYLE_GROUPS.extra);
};

const setExamEstimate = (minutes = 0) => {
  $('[data-exam-estimate]') && ($('[data-exam-estimate]').textContent = minutes ? `${minutes} min` : '—');
  $('[data-exam-estimate-fill]') && ($('[data-exam-estimate-fill]').style.width = `${clamp(minutes * 3, 8, 100)}%`);
};

const renderExamPaper = (examPack, result) => {
  const paper = $('[data-exam-paper]');
  if (!paper) return;
  if (!examPack) {
    paper.innerHTML = `
      <div class="empty-state light">
        <div class="drop-icon">✦</div>
        <h3>No exam paper yet</h3>
        <p>Choose an exam style and build a paper from your current result.</p>
      </div>
    `;
    setExamEstimate(0);
    return;
  }

  examTimerState.durationSeconds = Number(examPack.durationMinutes || 0) * 60;
  renderTimerDisplay();
  setExamEstimate(Number(examPack.durationMinutes || 0));

  paper.innerHTML = `
    <div class="exam-paper-sheet">
      <div class="exam-paper-head">
        <div>
          <span class="section-label">Exam mode</span>
          <h2>${escapeHtml(examPack.title || `${examPack.style} practice paper`)}</h2>
          <p class="muted">${escapeHtml(result.title)} · ${escapeHtml(examPack.style)}</p>
        </div>
        <div class="exam-badges">
          <span class="pill">${escapeHtml(examPack.style)}</span>
          <span class="pill">${escapeHtml(`${examPack.durationMinutes} min`)}</span>
          <span class="pill">${escapeHtml(isGuestView() ? 'Watermarked export' : 'Watermark-free')}</span>
        </div>
      </div>
      <div class="exam-instructions">
        ${(examPack.instructions || []).map((item) => `<p>${escapeHtml(item)}</p>`).join('')}
      </div>
      ${(examPack.sections || [])
        .map(
          (section, sectionIndex) => `
            <section class="exam-section">
              <div class="exam-section-head">
                <h3>Section ${sectionIndex + 1} · ${escapeHtml(section.title)}</h3>
                <span>${escapeHtml(`${section.marks} marks`)}</span>
              </div>
              <div class="exam-question-list">
                ${(section.questions || [])
                  .map(
                    (question, questionIndex) => `
                      <article class="exam-question">
                        <div class="exam-question-top">
                          <strong>${sectionIndex + 1}.${questionIndex + 1} ${escapeHtml(question.prompt)}</strong>
                          <span>${escapeHtml(`${question.marks} marks`)}</span>
                        </div>
                        <details>
                          <summary>Answer guide</summary>
                          <p>${escapeHtml(question.answerGuide || 'Use the uploaded notes to structure a full answer.')}</p>
                        </details>
                      </article>
                    `
                  )
                  .join('')}
              </div>
            </section>
          `
        )
        .join('')}
    </div>
  `;
};

const initExamPage = () => {
  if (!$('[data-exam-root]')) return;
  renderExamStyles();
  initTimerInteractions();
  const result = loadResultForPage();
  if (!result) {
    mountEmptyState(
      $('[data-exam-root]'),
      'No exam source yet',
      'Analyze a file first and then build an exam paper from the result.',
      `<div class="stack-actions center-actions"><a class="button" href="${isGuestView() ? 'upload.html?guest=1' : 'upload.html'}">Analyze something</a></div>`
    );
    return;
  }

  let selectedStyle = EXAM_STYLE_GROUPS.main[0];
  $$('[data-exam-style]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedStyle = button.dataset.examStyle;
      $$('[data-exam-style]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
    });
  });

  renderExamPaper(result.examPack, result);

  $('[data-build-exam]')?.addEventListener('click', async () => {
    const progress = simulateProgress({
      shell: $('[data-exam-progress]'),
      fill: $('[data-exam-progress-fill]'),
      valueNode: $('[data-exam-progress-value]'),
      labelNode: $('[data-exam-progress-label]'),
      copyNode: $('[data-exam-progress-copy]'),
      stages: [
        { label: 'Selecting exam flavour…', copy: `Shaping the paper in ${selectedStyle} style.` },
        { label: 'Building sections…', copy: 'Turning your result into a realistic exam structure.' },
        { label: 'Estimating timing…', copy: 'Setting up the question flow and answer guides.' },
      ],
      finishLabel: 'Exam paper ready',
    });

    try {
      const response = await fetch('/api/exam-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: result,
          plan: getEffectivePlan(),
          guestMode: isGuestView(),
          examStyle: selectedStyle,
          sourceMode: result.sourceMode || 'strict',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not build exam mode.');
      const updated = updateStoredResult({
        ...result,
        examPack: payload,
      });
      renderExamPaper(updated.examPack, updated);
      progress.setFinal('Done. The exam paper is ready.');
      setFormStatus($('[data-exam-status]'), 'success', `${selectedStyle} paper ready.`);
    } catch (error) {
      progress.stop();
      setFormStatus($('[data-exam-status]'), 'error', error.message || 'Could not build exam paper.');
    }
  });

  $$('[data-exam-download]').forEach((button) => {
    button.addEventListener('click', () => {
      const current = loadResultForPage();
      const examPack = current?.examPack;
      if (!examPack) {
        setFormStatus($('[data-exam-status]'), 'error', 'Build an exam paper first.');
        return;
      }
      const text = [
        `${examPack.title}`,
        `${examPack.style} · ${examPack.durationMinutes} minutes`,
        '',
        ...(examPack.instructions || []),
        '',
        ...(examPack.sections || []).flatMap((section, sectionIndex) => [
          `Section ${sectionIndex + 1}: ${section.title} (${section.marks} marks)`,
          ...(section.questions || []).flatMap((question, questionIndex) => [
            `${sectionIndex + 1}.${questionIndex + 1} ${question.prompt} [${question.marks} marks]`,
            `Answer guide: ${question.answerGuide}`,
            '',
          ]),
        ]),
      ].join('\n');

      if (button.dataset.examDownload === 'txt') {
        downloadFile(`${current.title.replace(/\.[^/.]+$/, '').replace(/\s+/g, '-').toLowerCase()}-${examPack.style.toLowerCase().replace(/\s+/g, '-')}.txt`, text, 'text/plain;charset=utf-8');
        return;
      }

      openPrintWindow({
        title: `${examPack.title}`,
        watermark: isGuestView(),
        bodyClass: 'exam-print',
        content: $('[data-exam-paper]')?.innerHTML || `<pre>${escapeHtml(text)}</pre>`,
      });
    });
  });
};

const initSettingsPage = () => {
  const form = $('[data-settings-form]');
  const themeForm = $('[data-theme-form]');
  if (!form && !themeForm) return;

  const user = getActiveUser();
  const settings = getScopedSettings() || {};

  if (form) {
    form.elements.name.value = user?.name || '';
    form.elements.email.value = user?.email || '';
    form.elements.studyLevel.value = settings.studyLevel || 'University';
    form.elements.focusMode.value = settings.focusMode || 'Exam mode';
    form.elements.goal.value = settings.goal || '';

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!getActiveUser()) {
        setFormStatus($('[data-settings-status]'), 'info', 'Create an account first if you want profile details to save.');
        return;
      }

      const currentUser = getActiveUser();
      const nextEmail = form.elements.email.value.trim() || currentUser.email;
      const previousEmail = currentUser.email.toLowerCase();
      const accounts = getAccounts();
      if (nextEmail.toLowerCase() !== previousEmail && accounts[nextEmail.toLowerCase()]) {
        setFormStatus($('[data-settings-status]'), 'error', 'That email is already being used in this browser.');
        return;
      }
      const updated = saveUserToAccounts({
        ...currentUser,
        name: form.elements.name.value.trim() || 'Your name',
        email: nextEmail,
      });

      if (nextEmail.toLowerCase() !== previousEmail) {
        const historyMap = getHistoryMap();
        const settingsMap = getSettingsMap();
        historyMap[nextEmail.toLowerCase()] = historyMap[previousEmail] || [];
        settingsMap[nextEmail.toLowerCase()] = settingsMap[previousEmail] || {};
        delete historyMap[previousEmail];
        delete settingsMap[previousEmail];
        saveHistoryMap(historyMap);
        saveSettingsMap(settingsMap);
      }

      saveScopedSettings({
        ...getScopedSettings(),
        studyLevel: form.elements.studyLevel.value,
        focusMode: form.elements.focusMode.value,
        goal: form.elements.goal.value.trim(),
      });
      updateShell();
      setFormStatus($('[data-settings-status]'), 'success', `Saved for ${updated.name}.`);
    });
  }

  if (themeForm) {
    const theme = getThemeFromScope();
    themeForm.elements.accent.value = theme.accent;
    themeForm.elements.text.value = theme.text;
    themeForm.elements.bg.value = theme.bg;
    themeForm.elements.card.value = theme.card;
    if (themeForm.elements.workspaceSkin) themeForm.elements.workspaceSkin.value = getWorkspaceSkin();

    themeForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const nextTheme = sanitizeTheme({
        accent: themeForm.elements.accent.value,
        text: themeForm.elements.text.value,
        bg: themeForm.elements.bg.value,
        card: themeForm.elements.card.value,
      });
      const current = getScopedSettings();
      const nextSkin = themeForm.elements.workspaceSkin?.value || 'default';
      saveScopedSettings({ ...current, theme: nextTheme, workspaceSkin: nextSkin });
      applyWorkspaceSkin(nextSkin);
      applyTheme(nextTheme);
      setFormStatus($('[data-theme-status]'), 'success', 'Theme applied.');
    });

    $$('[data-theme-preset]').forEach((button) => {
      button.addEventListener('click', () => {
        const preset = button.dataset.themePreset;
        const presets = {
          default: DEFAULT_THEME,
          lavender: { accent: '#8b7cff', text: '#17122b', bg: '#f6f3ff', card: '#ffffff' },
          slate: { accent: '#4f8cff', text: '#0b1325', bg: '#eef3fb', card: '#ffffff' },
          cream: { accent: '#c8873e', text: '#20160c', bg: '#fbf6ee', card: '#fffdf9' },
          paper: { accent: '#b67a3a', text: '#24150b', bg: '#f8f3e8', card: '#fffaf0' },
        };
        const nextTheme = sanitizeTheme(presets[preset] || DEFAULT_THEME);
        themeForm.elements.accent.value = nextTheme.accent;
        themeForm.elements.text.value = nextTheme.text;
        themeForm.elements.bg.value = nextTheme.bg;
        themeForm.elements.card.value = nextTheme.card;
        if (themeForm.elements.workspaceSkin) themeForm.elements.workspaceSkin.value = preset === 'paper' ? 'paper' : 'default';
      });
    });

    $('[data-theme-reset]')?.addEventListener('click', () => {
      const current = getScopedSettings();
      saveScopedSettings({ ...current, theme: DEFAULT_THEME, workspaceSkin: 'default' });
      themeForm.elements.accent.value = DEFAULT_THEME.accent;
      themeForm.elements.text.value = DEFAULT_THEME.text;
      themeForm.elements.bg.value = DEFAULT_THEME.bg;
      themeForm.elements.card.value = DEFAULT_THEME.card;
      if (themeForm.elements.workspaceSkin) themeForm.elements.workspaceSkin.value = 'default';
      applyWorkspaceSkin('default');
      applyTheme(DEFAULT_THEME);
      setFormStatus($('[data-theme-status]'), 'success', 'Original Reimuru theme restored.');
    });
  }

  renderBillingPanel($('[data-billing-root]'));
};

const renderBillingPanel = (target) => {
  if (!target) return;
  const user = getActiveUser();
  if (!user) {
    target.innerHTML += `
      <div class="inline-card">
        <strong>Still free?</strong>
        <p>Use guest mode from the main nav, or open Pricing when you want to move into saved history and GPT plans.</p>
        <div class="stack-actions"><a class="button-secondary" href="pricing.html">Open pricing</a></div>
      </div>
    `;
    return;
  }

  const currentPlan = getPlanMeta(user.plan);
  const paidCards = ['starter', 'standard', 'pro']
    .map((planId) => {
      const plan = getPlanMeta(planId);
      return `
        <article class="pricing-card mini card ${currentPlan.id === plan.id ? 'featured' : ''}">
          <h3>${escapeHtml(plan.label)}</h3>
          <p>${escapeHtml(plan.note)}</p>
          <div class="detail-list compact">
            <div><span>Model</span><strong>${escapeHtml(plan.modelLabel)}</strong></div>
            <div><span>Credits</span><strong>${plan.starterCredits}</strong></div>
          </div>
          <div class="stack-actions" style="margin-top:12px;">
            <button class="${currentPlan.id === plan.id ? 'button-secondary' : 'button'} full-width" type="button" data-plan-select="${plan.id}">
              ${currentPlan.id === plan.id ? 'Current plan' : `Switch to ${plan.label}`}
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  target.innerHTML += `
    <div class="inline-card">
      <strong>${escapeHtml(currentPlan.label)} active</strong>
      <p>${escapeHtml(currentPlan.note)}</p>
      <p class="muted small">${escapeHtml(user.credits)} credits left</p>
    </div>
    <div class="mini-plan-grid">${paidCards}</div>
    <p class="muted small" data-pricing-status></p>
  `;
};

const initPricingPage = () => {
  $$('[data-plan-select]').forEach((button) => {
    button.addEventListener('click', () => {
      const plan = button.dataset.planSelect;
      if (plan === 'free') {
        window.location.href = 'upload.html?guest=1';
        return;
      }
      const user = getActiveUser();
      if (!user) {
        window.location.href = `signup.html?plan=${encodeURIComponent(plan)}`;
        return;
      }
      const meta = getPlanMeta(plan);
      const updated = saveUserToAccounts({
        ...user,
        plan: meta.id,
        credits: Math.max(Number(user.credits || 0), meta.starterCredits),
      });
      updateShell();
      const status = $('[data-pricing-status]');
      if (status) {
        status.textContent = `${meta.label} activated for ${updated.name}.`;
      }
      renderSidebarNav();
    });
  });
};

const initAuthForms = () => {
  const form = $('[data-auth-form]');
  if (!form) return;
  const status = $('[data-auth-status]');

  $$('[data-google-soon]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      setFormStatus(status, 'info', 'Google sign-in still needs OAuth setup before it can go live in this build.');
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearFormStatus(status);
    const page = getPage();
    const email = String(form.elements.email.value || '').trim().toLowerCase();
    const password = String(form.elements.password.value || '').trim();
    const selectedPlan = params.get('plan') || 'starter';

    if (!email || !password) {
      setFormStatus(status, 'error', 'Add both email and password first.');
      return;
    }

    if (page === 'signup' && password.length < 8) {
      setFormStatus(status, 'error', 'Use at least 8 characters for the password.');
      return;
    }

    const accounts = getAccounts();

    if (page === 'signup') {
      if (accounts[email]) {
        setFormStatus(status, 'error', 'An account for this email already exists in this browser. Try logging in instead.');
        return;
      }
      const name = String(form.elements.name.value || '').trim() || 'Your name';
      const meta = getPlanMeta(selectedPlan === 'free' ? 'starter' : selectedPlan);
      const user = saveUserToAccounts({
        name,
        email,
        password,
        plan: meta.id,
        credits: meta.starterCredits,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
      const imported = mergePendingGuestResultIntoAccount();
      setFormStatus(status, 'success', imported ? 'Account created and your guest study pack was saved.' : 'Account created. Opening your dashboard…');
      setTimeout(() => {
        window.location.href = imported ? `results.html?id=${encodeURIComponent(imported.id)}` : 'dashboard.html';
      }, 520);
      return;
    }

    const account = normalizeUser(accounts[email]);
    if (!account) {
      setFormStatus(status, 'error', 'No local account found for this email yet.');
      return;
    }
    if (account.password !== password) {
      setFormStatus(status, 'error', 'Password does not match this local account.');
      return;
    }
    const loggedIn = saveUserToAccounts({ ...account, lastLoginAt: new Date().toISOString() });
    const imported = mergePendingGuestResultIntoAccount();
    setFormStatus(status, 'success', imported ? 'Welcome back. Your guest result is now saved.' : `Welcome back, ${loggedIn.name}.`);
    setTimeout(() => {
      window.location.href = imported ? `results.html?id=${encodeURIComponent(imported.id)}` : 'dashboard.html';
    }, 450);
  });
};

const initLogout = () => {
  $$('[data-logout]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      clearActiveUser();
      updateShell();
      renderSidebarNav();
      window.location.href = 'index.html';
    });
  });
};

const protectAccountOnlyPages = () => {
  const page = getPage();
  if (!ACCOUNT_ONLY_PAGES.has(page)) return;
  updateShell();
};

document.addEventListener('DOMContentLoaded', () => {
  applyWorkspaceSkin(getWorkspaceSkin());
  applyTheme(getThemeFromScope());
  injectBrand();
  renderSidebarNav();
  updateShell();
  protectAccountOnlyPages();
  initLogout();
  initAuthForms();
  initUploadPage();
  initSettingsPage();
  initPricingPage();
  initGuestSaveCTA();
  initNotesPage();
  initExamPage();

  const page = getPage();
  if (page === 'dashboard') renderDashboard();
  if (page === 'history') renderHistoryPage();
  if (page === 'flashcards') renderFlashcardsPage();
  if (page === 'results') {
    const result = loadResultForPage();
    const root = $('[data-results-root]');
    if (!result) {
      mountEmptyState(
        root,
        'No result loaded yet',
        'Run an analysis first and your study pack will appear here.',
        `<div class="stack-actions center-actions"><a class="button" href="${isGuestView() ? 'upload.html?guest=1' : 'upload.html'}">Analyze something</a></div>`
      );
    } else {
      renderCurrentResult(result);
    }
  }
  if (page === 'quiz') renderQuizPage();
});
