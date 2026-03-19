
const STORAGE_KEYS = {
  user: 'reimuru_user',
  history: 'reimuru_history',
  settings: 'reimuru_settings'
};

const getUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setUser = (user) => localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
const clearUser = () => localStorage.removeItem(STORAGE_KEYS.user);

const getHistoryItems = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveHistoryItems = (items) => localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(items));

const getSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveSettings = (settings) => localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Just now'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const makeId = () => `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const slugify = (value = '') =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'general';

const initials = (name = 'Student') =>
  name
    .split(' ')
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2) || 'ST';

const ensureDefaultUser = () => {
  const existing = getUser();
  if (existing) return existing;
  const defaultUser = { name: 'Student', email: 'student@reimuru.app', credits: 12, createdAt: new Date().toISOString() };
  setUser(defaultUser);
  return defaultUser;
};

const updateUserShell = () => {
  const user = ensureDefaultUser();
  document.querySelectorAll('[data-user-name]').forEach((el) => {
    el.textContent = user.name;
  });
  document.querySelectorAll('[data-user-email]').forEach((el) => {
    el.textContent = user.email;
  });
  document.querySelectorAll('[data-user-credits]').forEach((el) => {
    el.textContent = user.credits ?? 0;
  });
  document.querySelectorAll('[data-user-initials]').forEach((el) => {
    el.textContent = initials(user.name);
  });
};

const topHistory = (limit = 3) =>
  getHistoryItems()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);

const mountEmptyState = (target, title, copy, actionHtml = '') => {
  target.innerHTML = `
    <div class="empty-state">
      <div class="drop-icon">✦</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(copy)}</p>
      ${actionHtml}
    </div>
  `;
};

const saveResult = (result) => {
  const history = getHistoryItems();
  history.unshift(result);
  saveHistoryItems(history);
};

const getResultById = (id) => getHistoryItems().find((item) => item.id === id);

const renderRecentItems = (targetSelector, emptyText = 'No uploads yet.') => {
  const target = document.querySelector(targetSelector);
  if (!target) return;
  const recent = topHistory(4);
  if (!recent.length) {
    target.innerHTML = `<div class="inline-card">${escapeHtml(emptyText)}</div>`;
    return;
  }
  target.innerHTML = recent.map((item) => `
    <article class="timeline-item">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.summary || 'AI-ready study output stored for review.')}</p>
      <div class="meta">
        <span class="pill">${escapeHtml(item.subject)}</span>
        <span class="pill">${escapeHtml(item.topic)}</span>
        <span class="pill">${escapeHtml(formatDate(item.createdAt))}</span>
      </div>
    </article>
  `).join('');
};

const renderDashboard = () => {
  const history = getHistoryItems();
  const stats = {
    documents: history.length,
    flashcards: history.reduce((total, item) => total + (item.flashcards?.length || 0), 0),
    quizzes: history.reduce((total, item) => total + (item.quizzes?.length || 0), 0)
  };
  const docEl = document.querySelector('[data-metric="documents"]');
  const cardEl = document.querySelector('[data-metric="flashcards"]');
  const quizEl = document.querySelector('[data-metric="quizzes"]');
  if (docEl) docEl.textContent = stats.documents;
  if (cardEl) cardEl.textContent = stats.flashcards;
  if (quizEl) quizEl.textContent = stats.quizzes;
  renderRecentItems('[data-dashboard-history]', 'Upload your first file and your study history will live here.');
};

const setStatus = (type, message) => {
  const box = document.querySelector('[data-status-box]');
  if (!box) return;
  box.className = `status-box show ${type}`;
  box.textContent = message;
};

const clearStatus = () => {
  const box = document.querySelector('[data-status-box]');
  if (!box) return;
  box.className = 'status-box';
  box.textContent = '';
};

const renderSelectedFiles = (files) => {
  const target = document.querySelector('[data-file-list]');
  if (!target) return;
  if (!files.length) {
    target.innerHTML = '';
    return;
  }
  target.innerHTML = Array.from(files).map((file) => `
    <span class="file-chip">
      <strong>${escapeHtml(file.name)}</strong>
      <span class="muted small">${Math.max(1, Math.round(file.size / 1024))} KB</span>
    </span>
  `).join('');
};

const normalizeServerResult = (payload) => ({
  id: makeId(),
  title: payload.title || 'Untitled upload',
  subject: payload.subject || 'General',
  topic: payload.topic || 'Unsorted',
  summary: payload.summary || 'AI organized your material into study outputs.',
  notes: Array.isArray(payload.notes) ? payload.notes : [],
  flashcards: Array.isArray(payload.flashcards) ? payload.flashcards : [],
  quizzes: Array.isArray(payload.quizzes) ? payload.quizzes : [],
  examQuestions: Array.isArray(payload.examQuestions) ? payload.examQuestions : [],
  source: payload.source || 'fallback',
  warning: payload.warning || '',
  createdAt: new Date().toISOString()
});

const renderResultSurface = (result) => {
  const summaryEl = document.querySelector('[data-result-summary]');
  const notesEl = document.querySelector('[data-result-notes]');
  const flashEl = document.querySelector('[data-result-flashcards]');
  const quizEl = document.querySelector('[data-result-quizzes]');
  const examEl = document.querySelector('[data-result-exam]');
  const titleEl = document.querySelector('[data-result-title]');
  const subjectEl = document.querySelector('[data-result-subject]');
  const topicEl = document.querySelector('[data-result-topic]');
  const sourceEl = document.querySelector('[data-result-source]');
  const warningEl = document.querySelector('[data-result-warning]');
  const dateEl = document.querySelector('[data-result-date]');

  if (titleEl) titleEl.textContent = result.title;
  if (subjectEl) subjectEl.textContent = result.subject;
  if (topicEl) topicEl.textContent = result.topic;
  if (sourceEl) sourceEl.textContent = result.source === 'openai' ? 'OpenAI' : 'Fallback';
  if (dateEl) dateEl.textContent = formatDate(result.createdAt);
  if (summaryEl) summaryEl.innerHTML = `<p>${escapeHtml(result.summary)}</p>`;

  if (warningEl) {
    if (result.warning) {
      warningEl.style.display = 'block';
      warningEl.textContent = result.warning;
    } else {
      warningEl.style.display = 'none';
      warningEl.textContent = '';
    }
  }

  if (notesEl) {
    const notes = result.notes?.length ? result.notes : ['Your upload was processed and saved.'];
    notesEl.innerHTML = notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('');
  }

  if (flashEl) {
    const cards = result.flashcards?.length ? result.flashcards : [];
    if (!cards.length) {
      flashEl.innerHTML = '<div class="inline-card">No flashcards were generated for this upload.</div>';
    } else {
      flashEl.innerHTML = cards.map((card, index) => `
        <article class="flash-card" data-flash-card>
          <span class="side-label">Card ${index + 1}</span>
          <div class="question"><strong>${escapeHtml(card.question)}</strong></div>
          <div class="answer">
            <strong>Answer</strong>
            <p>${escapeHtml(card.answer)}</p>
          </div>
        </article>
      `).join('');
      flashEl.querySelectorAll('[data-flash-card]').forEach((card) => {
        card.addEventListener('click', () => card.classList.toggle('flipped'));
      });
    }
  }

  if (quizEl) {
    const quizzes = result.quizzes?.length ? result.quizzes : [];
    if (!quizzes.length) {
      quizEl.innerHTML = '<div class="inline-card">No quizzes yet for this upload.</div>';
    } else {
      quizEl.innerHTML = quizzes.map((quiz, index) => `
        <article class="quiz-item">
          <h4>${index + 1}. ${escapeHtml(quiz.question)}</h4>
          <div class="quiz-options">
            ${quiz.options.map((option, optionIndex) => `
              <button type="button" class="quiz-option" data-answer-index="${optionIndex}" data-correct-index="${Number.isInteger(quiz.answerIndex) ? quiz.answerIndex : 0}">
                ${escapeHtml(option)}
              </button>
            `).join('')}
          </div>
          <div class="quiz-explanation" hidden>${escapeHtml(quiz.explanation || 'Nice. Keep going.')}</div>
        </article>
      `).join('');

      quizEl.querySelectorAll('.quiz-item').forEach((item) => {
        const explanation = item.querySelector('.quiz-explanation');
        item.querySelectorAll('.quiz-option').forEach((button) => {
          button.addEventListener('click', () => {
            const selected = Number(button.dataset.answerIndex);
            const correct = Number(button.dataset.correctIndex);
            item.querySelectorAll('.quiz-option').forEach((optionButton) => {
              optionButton.disabled = true;
              const answerIndex = Number(optionButton.dataset.answerIndex);
              optionButton.classList.toggle('correct', answerIndex === correct);
              optionButton.classList.toggle('incorrect', answerIndex === selected && answerIndex !== correct);
            });
            if (explanation) explanation.hidden = false;
          });
        });
      });
    }
  }

  if (examEl) {
    const examQuestions = result.examQuestions?.length ? result.examQuestions : [];
    if (!examQuestions.length) {
      examEl.innerHTML = '<div class="inline-card">No exam-style prompts were created.</div>';
    } else {
      examEl.innerHTML = examQuestions.map((item, index) => `
        <article class="exam-item">
          <h4>Exam prompt ${index + 1}</h4>
          <p>${escapeHtml(item.question)}</p>
          <div class="inline-card" style="margin-top: 14px;">${escapeHtml(item.answerGuide || 'Use your notes and generated flashcards to answer this.')}</div>
        </article>
      `).join('');
    }
  }
};

const renderResultsPage = () => {
  const id = new URLSearchParams(window.location.search).get('id');
  const history = getHistoryItems();
  const result = id ? history.find((item) => item.id === id) : history[0];
  if (!result) {
    const shell = document.querySelector('[data-results-shell]');
    if (shell) {
      mountEmptyState(shell, 'No result yet', 'Upload a file first and the full AI output will appear here.', '<div style="margin-top:18px;"><a class="button" href="upload.html">Go to upload</a></div>');
    }
    return;
  }
  renderResultSurface(result);
};

const renderHistoryPage = () => {
  const target = document.querySelector('[data-history-list]');
  const metaTarget = document.querySelector('[data-history-summary]');
  if (!target || !metaTarget) return;
  const items = getHistoryItems().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  metaTarget.innerHTML = `
    <div class="metric-grid">
      <article class="metric-card card">
        <h3>Total uploads</h3>
        <div class="metric-value">${items.length}</div>
        <p class="metric-caption">Everything you’ve processed with ReimuruABT.</p>
      </article>
      <article class="metric-card card">
        <h3>Total flashcards</h3>
        <div class="metric-value">${items.reduce((sum, item) => sum + (item.flashcards?.length || 0), 0)}</div>
        <p class="metric-caption">Ready for quick active recall.</p>
      </article>
      <article class="metric-card card">
        <h3>Study subjects</h3>
        <div class="metric-value">${new Set(items.map((item) => item.subject)).size}</div>
        <p class="metric-caption">Distinct subject buckets across your uploads.</p>
      </article>
    </div>
  `;

  if (!items.length) {
    mountEmptyState(target, 'No history yet', 'When you analyze your first file, it will be saved here for quick review.', '<div style="margin-top:18px;"><a class="button" href="upload.html">Analyze a file</a></div>');
    return;
  }

  target.innerHTML = items.map((item) => `
    <article class="history-item">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary || 'AI output saved for later.')}</p>
      </div>
      <div class="history-meta">
        <span class="pill">${escapeHtml(item.subject)}</span>
        <span class="pill">${escapeHtml(item.topic)}</span>
        <span class="pill">${escapeHtml(formatDate(item.createdAt))}</span>
      </div>
      <div class="history-actions">
        <a class="button-secondary" href="results.html?id=${encodeURIComponent(item.id)}">View results</a>
        <button class="button-ghost" type="button" data-delete-history="${escapeHtml(item.id)}">Delete</button>
      </div>
    </article>
  `).join('');

  target.querySelectorAll('[data-delete-history]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextItems = getHistoryItems().filter((item) => item.id !== button.dataset.deleteHistory);
      saveHistoryItems(nextItems);
      renderHistoryPage();
    });
  });
};

const renderFlashcardsPage = () => {
  const target = document.querySelector('[data-flashcards-page]');
  if (!target) return;
  const items = getHistoryItems();
  const cards = items.flatMap((item) => (item.flashcards || []).map((card) => ({
    ...card,
    subject: item.subject,
    topic: item.topic,
    source: item.title
  })));
  if (!cards.length) {
    mountEmptyState(target, 'No flashcards yet', 'Analyze a file and ReimuruABT will generate flashcards here.', '<div style="margin-top:18px;"><a class="button" href="upload.html">Create flashcards</a></div>');
    return;
  }
  target.innerHTML = `<div class="flash-grid">${cards.map((card, index) => `
    <article class="flash-card" data-flash-card>
      <span class="side-label">${escapeHtml(card.subject)} · Card ${index + 1}</span>
      <div class="question">
        <strong>${escapeHtml(card.question)}</strong>
        <p class="muted small">${escapeHtml(card.source)}</p>
      </div>
      <div class="answer">
        <strong>Answer</strong>
        <p>${escapeHtml(card.answer)}</p>
        <p class="muted small">${escapeHtml(card.topic)}</p>
      </div>
    </article>
  `).join('')}</div>`;
  target.querySelectorAll('[data-flash-card]').forEach((card) => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
  });
};

const renderQuizPage = () => {
  const target = document.querySelector('[data-quiz-page]');
  if (!target) return;
  const items = getHistoryItems();
  const quizzes = items.flatMap((item) => (item.quizzes || []).map((quiz) => ({
    ...quiz,
    subject: item.subject,
    topic: item.topic
  })));
  if (!quizzes.length) {
    mountEmptyState(target, 'No quiz set yet', 'Analyze a file and your quiz mode will appear here.', '<div style="margin-top:18px;"><a class="button" href="upload.html">Generate quiz</a></div>');
    return;
  }
  target.innerHTML = quizzes.map((quiz, index) => `
    <article class="quiz-item">
      <h4>${index + 1}. ${escapeHtml(quiz.question)}</h4>
      <p class="muted small">${escapeHtml(quiz.subject)} · ${escapeHtml(quiz.topic)}</p>
      <div class="quiz-options">
        ${(quiz.options || []).map((option, optionIndex) => `
          <button type="button" class="quiz-option" data-answer-index="${optionIndex}" data-correct-index="${Number.isInteger(quiz.answerIndex) ? quiz.answerIndex : 0}">
            ${escapeHtml(option)}
          </button>
        `).join('')}
      </div>
      <div class="quiz-explanation" hidden>${escapeHtml(quiz.explanation || 'Review the underlying notes and try again.')}</div>
    </article>
  `).join('');
  target.querySelectorAll('.quiz-item').forEach((item) => {
    const explanation = item.querySelector('.quiz-explanation');
    item.querySelectorAll('.quiz-option').forEach((button) => {
      button.addEventListener('click', () => {
        const selected = Number(button.dataset.answerIndex);
        const correct = Number(button.dataset.correctIndex);
        item.querySelectorAll('.quiz-option').forEach((optionButton) => {
          optionButton.disabled = true;
          const answerIndex = Number(optionButton.dataset.answerIndex);
          optionButton.classList.toggle('correct', answerIndex === correct);
          optionButton.classList.toggle('incorrect', answerIndex === selected && answerIndex !== correct);
        });
        if (explanation) explanation.hidden = false;
      });
    });
  });
};

const initUploadPage = () => {
  const uploadForm = document.querySelector('[data-upload-form]');
  const dropzone = document.querySelector('[data-dropzone]');
  const input = document.querySelector('[data-file-input]');
  const browseButton = document.querySelector('[data-browse-files]');
  if (!uploadForm || !dropzone || !input || !browseButton) return;

  const syncFiles = () => renderSelectedFiles(input.files);

  browseButton.addEventListener('click', () => input.click());
  input.addEventListener('change', syncFiles);

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (event) => {
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    input.files = files;
    syncFiles();
  });

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();
    const file = input.files?.[0];
    if (!file) {
      setStatus('error', 'Upload one file first. Drag it in or choose it from your device.');
      return;
    }

    setStatus('info', 'Processing your upload… ReimuruABT is building your study pack.');

    const formData = new FormData(uploadForm);
    formData.set('file', file);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Upload failed. Please try again.');
      }

      const result = normalizeServerResult(payload);
      saveResult(result);

      const user = ensureDefaultUser();
      user.credits = Math.max(0, Number(user.credits || 0) - 1);
      setUser(user);

      setStatus('success', 'Done. Opening your results…');
      setTimeout(() => {
        window.location.href = `results.html?id=${encodeURIComponent(result.id)}`;
      }, 600);
    } catch (error) {
      setStatus('error', error.message || 'Something went wrong while analyzing your file.');
    }
  });
};

const initSettingsPage = () => {
  const form = document.querySelector('[data-settings-form]');
  if (!form) return;
  const user = ensureDefaultUser();
  const settings = getSettings();
  form.elements.name.value = user.name || '';
  form.elements.email.value = user.email || '';
  form.elements.studyLevel.value = settings.studyLevel || 'University';
  form.elements.focusMode.value = settings.focusMode || 'Exam mode';
  form.elements.goal.value = settings.goal || '';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const updatedUser = {
      ...user,
      name: form.elements.name.value.trim() || 'Student',
      email: form.elements.email.value.trim() || 'student@reimuru.app'
    };
    setUser(updatedUser);
    saveSettings({
      studyLevel: form.elements.studyLevel.value,
      focusMode: form.elements.focusMode.value,
      goal: form.elements.goal.value
    });
    updateUserShell();
    const status = document.querySelector('[data-settings-status]');
    if (status) {
      status.textContent = 'Saved. Your local prototype settings are updated.';
    }
  });
};

const initAuthForm = () => {
  const form = document.querySelector('[data-auth-form]');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = form.elements.name ? form.elements.name.value.trim() : 'Student';
    const email = form.elements.email.value.trim() || 'student@reimuru.app';
    const user = {
      ...ensureDefaultUser(),
      name: name || email.split('@')[0] || 'Student',
      email
    };
    setUser(user);
    window.location.href = 'dashboard.html';
  });
};

const initLogoutButtons = () => {
  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      clearUser();
      window.location.href = 'index.html';
    });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  updateUserShell();
  initLogoutButtons();
  initAuthForm();
  initUploadPage();
  initSettingsPage();

  const page = document.body.dataset.page;
  if (page === 'dashboard') renderDashboard();
  if (page === 'results') renderResultsPage();
  if (page === 'history') renderHistoryPage();
  if (page === 'flashcards') renderFlashcardsPage();
  if (page === 'quiz') renderQuizPage();
});
