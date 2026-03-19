
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const path = require('path');

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const PORT = process.env.PORT || 3000;
const SITE_DIR = path.resolve(__dirname, 'FullWebsiteCode');
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const SUBJECT_KEYWORDS = {
  biology: ['cell', 'mitochondria', 'photosynthesis', 'dna', 'enzyme'],
  chemistry: ['atom', 'molecule', 'bond', 'acid', 'reaction'],
  physics: ['force', 'energy', 'velocity', 'motion', 'quantum'],
  maths: ['integral', 'derivative', 'equation', 'probability', 'function'],
  history: ['war', 'treaty', 'empire', 'revolution', 'source'],
  literature: ['poem', 'novel', 'metaphor', 'theme', 'author'],
  economics: ['market', 'inflation', 'demand', 'supply', 'economy'],
  psychology: ['behavior', 'cognitive', 'study', 'memory', 'theory'],
  'computer science': ['algorithm', 'network', 'code', 'program', 'database'],
  law: ['statute', 'case', 'liability', 'contract', 'tort'],
};

const scoreMatch = (text, keywords) =>
  keywords.reduce((score, word) => (text.includes(word) ? score + 1 : score), 0);

const inferSubject = (text) => {
  let best = { subject: 'General Study', score: 0 };
  Object.entries(SUBJECT_KEYWORDS).forEach(([subject, words]) => {
    const score = scoreMatch(text, words);
    if (score > best.score) best = { subject, score };
  });
  return best.subject
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const inferTopic = (text) => {
  if (!text.trim()) return 'Core Concepts';
  const cleaned = text
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, 20);

  const unique = [...new Set(cleaned)];
  return unique.slice(0, 3).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' · ') || 'Core Concepts';
};

const extractTextHint = (file) => {
  const name = file.originalname.toLowerCase();
  let content = '';
  if ((file.mimetype || '').startsWith('text/')) {
    content = file.buffer.toString('utf8').slice(0, 12000);
  }
  return `${name} ${content}`.toLowerCase();
};

const createFallbackAnalysis = (file) => {
  const textHint = extractTextHint(file);
  const subject = inferSubject(textHint);
  const topic = inferTopic(textHint);
  const title = file.originalname;

  return {
    title,
    subject,
    topic,
    summary: `ReimuruABT organized "${title}" into a clean starter study pack. Add your OpenAI key for richer, file-aware output.`,
    notes: [
      `Start by identifying the core objective of ${title}.`,
      `Break the material into the most testable ideas for ${subject}.`,
      `Use the flashcards and quiz below as a first active-recall pass.`,
    ],
    flashcards: [
      {
        question: `What is the core idea from this ${subject} upload?`,
        answer: `Use the upload title and context to identify the main concept being tested.`,
      },
      {
        question: `What should you revise first from ${topic}?`,
        answer: `Focus on the high-yield concepts most likely to appear in exam questions.`,
      },
      {
        question: `How should you study this file efficiently?`,
        answer: `Review the summary, then test yourself with flashcards and quiz questions before rereading.`,
      },
    ],
    quizzes: [
      {
        question: `What is the best first step after uploading study material?`,
        options: [
          'Read the generated summary',
          'Ignore the output',
          'Delete the file',
          'Skip straight to random guessing',
        ],
        answerIndex: 0,
        explanation: 'The summary gives you a fast map of the upload before deeper revision.',
      },
      {
        question: `Which method best supports active recall?`,
        options: [
          'Rewriting everything passively',
          'Using flashcards and quiz questions',
          'Only rereading the file',
          'Memorizing without testing',
        ],
        answerIndex: 1,
        explanation: 'Active recall works best when you force yourself to retrieve the answer.',
      },
    ],
    examQuestions: [
      {
        question: `Using the content from "${title}", explain the most important idea in ${subject} and why it matters.`,
        answerGuide: 'Define the concept, explain the mechanism or reasoning, and connect it to likely assessment wording.',
      },
      {
        question: `What is one higher-level exam question a teacher could ask from ${topic}?`,
        answerGuide: 'Focus on explanation, evaluation, or application rather than simple recall.',
      },
    ],
    source: 'fallback',
  };
};

const stripCodeFences = (value = '') =>
  value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

const normalizeAnalysis = (payload, file) => {
  const fallback = createFallbackAnalysis(file);

  const cleanString = (value, defaultValue) =>
    typeof value === 'string' && value.trim() ? value.trim() : defaultValue;

  const notes = Array.isArray(payload?.notes)
    ? payload.notes.filter((item) => typeof item === 'string' && item.trim()).slice(0, 6)
    : fallback.notes;

  const flashcards = Array.isArray(payload?.flashcards)
    ? payload.flashcards
        .filter((card) => card && typeof card.question === 'string' && typeof card.answer === 'string')
        .slice(0, 8)
        .map((card) => ({
          question: card.question.trim(),
          answer: card.answer.trim(),
        }))
    : fallback.flashcards;

  const quizzes = Array.isArray(payload?.quizzes)
    ? payload.quizzes
        .filter(
          (quiz) =>
            quiz &&
            typeof quiz.question === 'string' &&
            Array.isArray(quiz.options) &&
            quiz.options.length >= 2
        )
        .slice(0, 5)
        .map((quiz) => ({
          question: quiz.question.trim(),
          options: quiz.options.slice(0, 4).map((option) => String(option).trim()),
          answerIndex:
            Number.isInteger(quiz.answerIndex) && quiz.answerIndex >= 0 && quiz.answerIndex < 4
              ? quiz.answerIndex
              : 0,
          explanation: cleanString(quiz.explanation, 'Review the material and the summary to confirm why this answer works.'),
        }))
    : fallback.quizzes;

  const examQuestions = Array.isArray(payload?.examQuestions)
    ? payload.examQuestions
        .filter(
          (item) =>
            item &&
            typeof item.question === 'string' &&
            typeof item.answerGuide === 'string'
        )
        .slice(0, 4)
        .map((item) => ({
          question: item.question.trim(),
          answerGuide: item.answerGuide.trim(),
        }))
    : fallback.examQuestions;

  return {
    title: cleanString(payload?.title, file.originalname),
    subject: cleanString(payload?.subject, fallback.subject),
    topic: cleanString(payload?.topic, fallback.topic),
    summary: cleanString(payload?.summary, fallback.summary),
    notes: notes.length ? notes : fallback.notes,
    flashcards: flashcards.length ? flashcards : fallback.flashcards,
    quizzes: quizzes.length ? quizzes : fallback.quizzes,
    examQuestions: examQuestions.length ? examQuestions : fallback.examQuestions,
    source: 'openai',
  };
};

const analyzeWithOpenAI = async (file, options = {}) => {
  if (!openai) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const mimeType = file.mimetype || 'application/octet-stream';
  const fileData = `data:${mimeType};base64,${file.buffer.toString('base64')}`;
  const textHint = extractTextHint(file).slice(0, 4000);

  const prompt = [
    'You are ReimuruABT, a premium AI study tool for students.',
    'Analyze the attached study material and return ONLY valid JSON.',
    'Use this exact JSON shape:',
    '{"title":"string","subject":"string","topic":"string","summary":"string","notes":["string"],"flashcards":[{"question":"string","answer":"string"}],"quizzes":[{"question":"string","options":["string","string","string","string"],"answerIndex":0,"explanation":"string"}],"examQuestions":[{"question":"string","answerGuide":"string"}]}',
    'Rules:',
    '- Pick a clear subject name.',
    '- Pick a concise topic.',
    '- Write a premium-quality summary students can revise from.',
    '- Write 3 to 6 structured notes.',
    '- Write 4 to 6 useful flashcards.',
    '- Write 2 to 4 multiple-choice quiz questions with exactly 4 options each.',
    '- answerIndex must be the zero-based correct option index.',
    '- Write 1 to 3 exam-style questions with a short answer guide.',
    '- No markdown fences, no commentary, no extra keys.',
    options.outputType ? `Requested output focus: ${options.outputType}` : '',
    options.difficulty ? `Target study level: ${options.difficulty}` : '',
    options.context ? `Extra user context: ${options.context}` : '',
    textHint ? `Helpful filename/text hint: ${textHint}` : `Filename: ${file.originalname}`,
  ].filter(Boolean).join('\n');

  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: prompt },
          {
            type: 'input_file',
            filename: file.originalname,
            file_data: fileData,
          },
        ],
      },
    ],
    max_output_tokens: 1600,
  });

  const raw = stripCodeFences(response.output_text || '');
  if (!raw) {
    throw new Error('OpenAI returned an empty response.');
  }

  return normalizeAnalysis(JSON.parse(raw), file);
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(SITE_DIR));

const pageRoutes = {
  '/': 'index.html',
  '/login': 'login.html',
  '/signup': 'signup.html',
  '/dashboard': 'dashboard.html',
  '/upload': 'upload.html',
  '/results': 'results.html',
  '/history': 'history.html',
  '/pricing': 'pricing.html',
  '/settings': 'settings.html',
  '/flashcards': 'flashcards.html',
  '/quiz': 'quiz.html',
};

Object.entries(pageRoutes).forEach(([route, fileName]) => {
  app.get(route, (_req, res) => {
    res.sendFile(path.resolve(SITE_DIR, fileName));
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'ReimuruABT',
    openaiEnabled: Boolean(openai),
  });
});

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const options = {
    outputType: req.body?.outputType,
    difficulty: req.body?.difficulty,
    context: req.body?.context,
  };

  try {
    const result = await analyzeWithOpenAI(req.file, options);
    return res.json(result);
  } catch (error) {
    console.warn('AI analysis unavailable, using fallback:', error.message);
    return res.json({
      ...createFallbackAnalysis(req.file),
      warning: openai
        ? 'OpenAI analysis failed, so ReimuruABT used a fallback study pack.'
        : 'Add OPENAI_API_KEY to enable richer file-aware AI output.',
    });
  }
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found.' });
  }
  return res.status(404).sendFile(path.resolve(SITE_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ReimuruABT running on port ${PORT}`);
});
