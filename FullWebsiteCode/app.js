const STORAGE_KEYS = {
  activeUser: 'reimuru_v2_active_user',
  accounts: 'reimuru_v2_accounts',
  histories: 'reimuru_v2_histories',
  settings: 'reimuru_v2_settings',
  sessionResult: 'reimuru_v2_session_result',
  pendingGuestResult: 'reimuru_v2_pending_guest_result',
};

const PLAN_CATALOG = {
  free: {
    id: 'free',
    label: 'Free guest',
    shortLabel: 'Free',
    providerLabel: 'DeepSeek',
    modelLabel: 'deepseek-chat',
    credits: 'No credits — no history',
    starterCredits: 0,
    note: 'Try the product without signing in. Nothing is saved after the session unless you create an account.',
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
    note: 'Lowest paid GPT tier. Ideal for students who want saved history without jumping straight to the bigger plans.',
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    shortLabel: 'Standard',
    providerLabel: 'GPT',
    modelLabel: 'gpt-5',
    credits: '120 credits / month',
    starterCredits: 120,
    note: 'Best balance between cost and output quality. The plan most users should actually choose.',
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    shortLabel: 'Pro',
    providerLabel: 'GPT',
    modelLabel: 'gpt-5.2',
    credits: '400 credits / month',
    starterCredits: 400,
    note: 'Premium GPT tier for heavier usage, deeper reasoning, and more serious exam prep.',
  },
};

const AUTH_PAGES = new Set(['login', 'signup']);
const ACCOUNT_ONLY_PAGES = new Set(['dashboard', 'history', 'settings']);

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

const getSettingsForCurrentUser = () => {
  const user = getActiveUser();
  if (!user) return {};
  const map = getSettingsMap();
  return map[user.email.toLowerCase()] || {};
};

const saveSettingsForCurrentUser = (settings) => {
  const user = getActiveUser();
  if (!user) return;
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

const saveResultForAccess = (result) => {
  setCurrentResult(result);
  if (getActiveUser()) {
    const nextHistory = [result, ...getHistoryForCurrentUser()];
    saveHistoryForCurrentUser(nextHistory);
    return { persisted: true };
  }
  setPendingGuestResult(result);
  return { persisted: false };
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

const injectBrand = () => {
  $$('[data-brand-lockup]').forEach((slot) => {
    const compact = slot.dataset.compact === 'true';
    slot.innerHTML = `
      <a href="index.html" class="brand-lockup ${compact ? 'compact' : ''}">
        <span class="brand-mark"><img src="assets/brand-icon.png" alt="Reimuru logo icon"></span>
        <span class="brand-copy">
          <strong>ReimuruABT</strong>
          <span>${compact ? 'Premium student AI' : 'AI study operating system'}</span>
        </span>
      </a>
    `;
  });
};

const updateShell = () => {
  const user = getActiveUser();
  const plan = getPlanMeta(getEffectivePlan());
  const accessCopy = user
    ? `${plan.label} · ${plan.providerLabel}`
    : 'Guest mode · DeepSeek · no history';

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
    el.textContent = user ? `${user.credits} credits left` : 'No credits in guest mode';
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
};

const renderSidebarNav = () => {
  const currentPage = getPage();
  $$('[data-sidebar-nav]').forEach((nav) => {
    const items = [
      { href: 'dashboard.html', key: 'dashboard', label: 'Dashboard' },
      { href: 'upload.html', key: 'upload', label: 'Upload' },
      { href: 'results.html', key: 'results', label: 'Results' },
      { href: 'history.html', key: 'history', label: 'History' },
      { href: 'flashcards.html', key: 'flashcards', label: 'Flashcards' },
      { href: 'quiz.html', key: 'quiz', label: 'Quiz' },
      { href: 'pricing.html', key: 'pricing', label: 'Pricing' },
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

const normalizeResult = (payload) => ({
  id: payload.id || makeId(),
  title: payload.title || 'Untitled upload',
  subject: payload.subject || 'General Study',
  topic: payload.topic || 'Core Concepts',
  summary: payload.summary || 'Your study pack is ready.',
  notes: Array.isArray(payload.notes) ? payload.notes : [],
  flashcards: Array.isArray(payload.flashcards) ? payload.flashcards : [],
  quizzes: Array.isArray(payload.quizzes) ? payload.quizzes : [],
  examQuestions: Array.isArray(payload.examQuestions) ? payload.examQuestions : [],
  source: payload.source || (payload.provider === 'deepseek' ? 'deepseek' : payload.provider === 'openai' ? 'gpt' : 'fallback'),
  provider: payload.provider || 'fallback',
  model: payload.model || '',
  plan: payload.plan || getEffectivePlan(),
  accessMode: payload.accessMode || getAccessMode(),
  warning: payload.warning || '',
  createdAt: payload.createdAt || new Date().toISOString(),
});

const renderCurrentResult = (result) => {
  const title = $('[data-result-title]');
  const summary = $('[data-result-summary]');
  const subject = $('[data-result-subject]');
  const topic = $('[data-result-topic]');
  const provider = $('[data-result-provider]');
  const model = $('[data-result-model]');
  const plan = $('[data-result-plan]');
  const date = $('[data-result-date]');
  const warning = $('[data-result-warning]');
  const notes = $('[data-result-notes]');
  const flashcards = $('[data-result-flashcards]');
  const quizzes = $('[data-result-quizzes]');
  const exams = $('[data-result-exam]');

  if (title) title.textContent = result.title;
  if (summary) summary.textContent = result.summary;
  if (subject) subject.textContent = result.subject;
  if (topic) topic.textContent = result.topic;
  if (provider) provider.textContent = result.provider === 'deepseek' ? 'DeepSeek' : result.provider === 'openai' ? 'GPT' : 'Fallback';
  if (model) model.textContent = result.model || '—';
  if (plan) plan.textContent = getPlanMeta(result.plan).label;
  if (date) date.textContent = formatDate(result.createdAt);
  if (warning) {
    warning.hidden = !result.warning;
    warning.textContent = result.warning || '';
  }
  if (notes) {
    notes.innerHTML = (result.notes.length ? result.notes : ['No notes generated yet.'])
      .map((note) => `<li>${escapeHtml(note)}</li>`)
      .join('');
  }
  if (flashcards) {
    if (!result.flashcards.length) {
      flashcards.innerHTML = '<div class="inline-card">No flashcards generated yet.</div>';
    } else {
      flashcards.innerHTML = result.flashcards
        .map(
          (card, index) => `
            <article class="flash-card" data-flash-card>
              <span class="side-label">Card ${index + 1}</span>
              <div class="question"><strong>${escapeHtml(card.question)}</strong></div>
              <div class="answer">
                <strong>Answer</strong>
                <p>${escapeHtml(card.answer)}</p>
              </div>
            </article>
          `
        )
        .join('');
      $$('[data-flash-card]', flashcards).forEach((card) => {
        card.addEventListener('click', () => card.classList.toggle('flipped'));
      });
    }
  }
  if (quizzes) {
    if (!result.quizzes.length) {
      quizzes.innerHTML = '<div class="inline-card">No quiz prompts generated yet.</div>';
    } else {
      quizzes.innerHTML = result.quizzes
        .slice(0, 4)
        .map(
          (quiz, index) => `
            <article class="result-quiz-card">
              <strong>${index + 1}. ${escapeHtml(quiz.question)}</strong>
              <p>${escapeHtml((quiz.options || [])[quiz.answerIndex] || 'Answer hidden')}</p>
            </article>
          `
        )
        .join('');
    }
  }
  if (exams) {
    exams.innerHTML = (result.examQuestions.length ? result.examQuestions : [{ question: 'No exam prompts yet.', answerGuide: '' }])
      .map(
        (item) => `
          <article class="exam-card">
            <strong>${escapeHtml(item.question)}</strong>
            <p>${escapeHtml(item.answerGuide || '')}</p>
          </article>
        `
      )
      .join('');
  }

  const guestBanner = $('[data-result-guest-banner]');
  if (guestBanner) {
    guestBanner.hidden = !isGuestView();
  }
};

const renderDashboard = () => {
  const target = $('[data-dashboard-root]');
  if (!target) return;
  if (!getActiveUser()) {
    mountGuestGate(
      target,
      'Guest mode is working — it just does not save.',
      'Create an account to unlock saved history, GPT plans, and a proper dashboard.'
    );
    return;
  }

  const user = getActiveUser();
  const history = getHistoryForCurrentUser();
  const latest = history[0];
  const totalFlashcards = history.reduce((sum, item) => sum + (item.flashcards?.length || 0), 0);
  const totalQuizzes = history.reduce((sum, item) => sum + (item.quizzes?.length || 0), 0);
  const recentHtml = history.length
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
    : '<div class="inline-card">Analyze your first file and your saved history starts here.</div>';

  target.innerHTML = `
    <section class="hero-shell">
      <span class="section-label">Workspace</span>
      <h2>${escapeHtml(user.name)}, your study system is finally behaving.</h2>
      <p>You are on <strong>${escapeHtml(getPlanMeta(user.plan).label)}</strong>. ${escapeHtml(getPlanMeta(user.plan).note)}</p>
      <div class="stack-actions">
        <a class="button" href="upload.html">Analyze something new</a>
        <a class="button-secondary" href="pricing.html">Manage plan</a>
      </div>
    </section>

    <div class="metric-grid">
      <article class="metric-card card">
        <h3>Saved analyses</h3>
        <div class="metric-value">${history.length}</div>
        <p class="metric-caption">Everything saved to your account history.</p>
      </article>
      <article class="metric-card card">
        <h3>Flashcards generated</h3>
        <div class="metric-value">${totalFlashcards}</div>
        <p class="metric-caption">Ready for active recall any time.</p>
      </article>
      <article class="metric-card card">
        <h3>Quiz prompts</h3>
        <div class="metric-value">${totalQuizzes}</div>
        <p class="metric-caption">Built from your own uploads, not generic worksheets.</p>
      </article>
    </div>

    <div class="dashboard-grid">
      <section class="list-card card">
        <span class="section-label">Recent history</span>
        <h3>Latest study packs</h3>
        <div class="timeline">${recentHtml}</div>
      </section>
      <div class="stack">
        <section class="list-card card">
          <span class="section-label">Account</span>
          <h3>Current plan</h3>
          <div class="detail-list">
            <div><span>Plan</span><strong>${escapeHtml(getPlanMeta(user.plan).label)}</strong></div>
            <div><span>Model path</span><strong>${escapeHtml(getPlanMeta(user.plan).modelLabel)}</strong></div>
            <div><span>Credits left</span><strong>${user.credits}</strong></div>
          </div>
        </section>
        <section class="list-card card">
          <span class="section-label">Latest result</span>
          <h3>${escapeHtml(latest ? latest.title : 'Nothing saved yet')}</h3>
          <p>${escapeHtml(latest ? latest.summary : 'Your next upload will appear here.')}</p>
          <div class="stack-actions" style="margin-top:18px;">
            <a class="button-secondary" href="${latest ? `results.html?id=${encodeURIComponent(latest.id)}` : 'upload.html'}">${latest ? 'Open result' : 'Upload first file'}</a>
          </div>
        </section>
      </div>
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

const loadResultForPage = () => {
  const id = params.get('id');
  if (id) {
    const fromHistory = getAvailableResults().find((item) => item.id === id);
    if (fromHistory) return fromHistory;
  }
  return getCurrentResult() || getAvailableResults()[0] || null;
};

const renderResultsPage = () => {
  const result = loadResultForPage();
  if (!result) {
    const root = $('[data-results-root]');
    mountEmptyState(
      root,
      'No result loaded yet',
      'Run an analysis first and your study pack will appear here.',
      `<div class="stack-actions center-actions"><a class="button" href="${isGuestView() ? 'upload.html?guest=1' : 'upload.html'}">Analyze something</a></div>`
    );
    return;
  }
  renderCurrentResult(result);
};

const initGuestSaveCTA = () => {
  $$('[data-save-guest-result]').forEach((button) => {
    button.addEventListener('click', () => {
      window.location.href = 'signup.html?plan=starter&savePending=1';
    });
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
        <p>Start a session and Reimuru will keep feeding you the next question.</p>
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
      'You have cleared the current quiz bank.',
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

  const accessCopy = () => {
    const plan = getPlanMeta(getEffectivePlan());
    return isGuestView()
      ? `You are in free guest mode. Reimuru will use DeepSeek and keep this session temporary.`
      : `You are on ${plan.label}. Reimuru will route this upload through ${plan.modelLabel} and save it to your history.`;
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
      setFormStatus(status, 'error', 'You are out of credits on this prototype account. Switch plan in pricing or top up later with real billing.');
      return;
    }

    setFormStatus(status, 'info', 'Building your study pack…');
    const formData = new FormData(form);
    formData.set('file', file);
    formData.set('plan', getEffectivePlan());
    formData.set('guestMode', String(isGuestView()));

    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Upload failed.');
      const result = normalizeResult(payload);
      saveResultForAccess(result);
      if (getActiveUser()) decrementCredit();
      updateShell();
      setFormStatus(status, 'success', isGuestView() ? 'Done. Opening your temporary result…' : 'Done. Saved to your history. Opening result…');
      setTimeout(() => {
        window.location.href = isGuestView() ? 'results.html' : `results.html?id=${encodeURIComponent(result.id)}`;
      }, 500);
    } catch (error) {
      setFormStatus(status, 'error', error.message || 'Something went wrong while analyzing your file.');
    }
  });
};

const initSettingsPage = () => {
  const root = $('[data-settings-root]');
  const form = $('[data-settings-form]');
  if (!root || !form) return;
  if (!getActiveUser()) {
    mountGuestGate(
      root,
      'Guest mode skips saved settings too.',
      'Create an account and your profile, history, and future credits all get somewhere real to live.'
    );
    return;
  }

  const user = getActiveUser();
  const settings = getSettingsForCurrentUser();
  form.elements.name.value = user.name || '';
  form.elements.email.value = user.email || '';
  form.elements.studyLevel.value = settings.studyLevel || 'University';
  form.elements.focusMode.value = settings.focusMode || 'Exam mode';
  form.elements.goal.value = settings.goal || '';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nextEmail = form.elements.email.value.trim() || user.email;
    const previousEmail = user.email.toLowerCase();
    const updated = saveUserToAccounts({
      ...user,
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

    saveSettingsForCurrentUser({
      studyLevel: form.elements.studyLevel.value,
      focusMode: form.elements.focusMode.value,
      goal: form.elements.goal.value.trim(),
    });
    updateShell();
    const status = $('[data-settings-status]');
    if (status) status.textContent = `Saved locally for ${updated.name}.`;
  });
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
        status.textContent = `${meta.label} activated locally for ${updated.name}.`;
      }
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
      setFormStatus(status, 'info', 'Google sign-in is the next auth step. For V2 this is a polished placeholder.');
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
      }, 500);
      return;
    }

    const account = normalizeUser(accounts[email]);
    if (!account) {
      setFormStatus(status, 'error', 'No local account found for this email yet.');
      return;
    }
    if (account.password !== password) {
      setFormStatus(status, 'error', 'Password does not match this local prototype account.');
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
      window.location.href = 'index.html';
    });
  });
};

const protectAccountOnlyPages = () => {
  const page = getPage();
  if (!ACCOUNT_ONLY_PAGES.has(page)) return;
  updateShell();
};

const renderPricingPills = () => {
  $$('[data-current-plan-pill]').forEach((pill) => {
    const meta = getPlanMeta(getEffectivePlan());
    pill.textContent = isGuestView() ? 'Guest mode' : `${meta.label} active`;
  });
};

document.addEventListener('DOMContentLoaded', () => {
  injectBrand();
  renderSidebarNav();
  updateShell();
  renderPricingPills();
  protectAccountOnlyPages();
  initLogout();
  initAuthForms();
  initUploadPage();
  initSettingsPage();
  initPricingPage();
  initGuestSaveCTA();

  const page = getPage();
  if (page === 'dashboard') renderDashboard();
  if (page === 'history') renderHistoryPage();
  if (page === 'flashcards') renderFlashcardsPage();
  if (page === 'results') renderResultsPage();
  if (page === 'quiz') renderQuizPage();
});
