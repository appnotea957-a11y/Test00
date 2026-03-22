require('dotenv').config();

const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_DIR = path.resolve(__dirname, 'FullWebsiteCode');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const MODEL_DEFAULTS = {
  free: process.env.DEEPSEEK_MODEL_FREE || 'deepseek-chat',
  starter: process.env.OPENAI_MODEL_STARTER || 'gpt-5-mini',
  standard: process.env.OPENAI_MODEL_STANDARD || 'gpt-5',
  pro: process.env.OPENAI_MODEL_PRO || 'gpt-5.2',
};

const EXAM_STYLES = [
  'GCSE',
  'A-Level',
  'IGCSE',
  'IB',
  'SAT',
  'AP',
  'University',
  'OCR',
  'Edexcel',
  'Custom',
  'Korean CSAT',
  'Japanese Entrance',
  'Chinese Gaokao',
  'Singapore A-Level',
  'Hong Kong DSE',
];

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    })
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

const pageRoutes = {
  '/': 'index.html',
  '/login': 'login.html',
  '/signup': 'signup.html',
  '/dashboard': 'dashboard.html',
  '/upload': 'upload.html',
  '/results': 'results.html',
  '/notes': 'notes.html',
  '/history': 'history.html',
  '/flashcards': 'flashcards.html',
  '/quiz': 'quiz.html',
  '/exam': 'exam.html',
  '/pricing': 'pricing.html',
  '/settings': 'settings.html',
};

const scoreMatch = (text, keywords) =>
  keywords.reduce((score, word) => (text.includes(word) ? score + 1 : score), 0);

const titleCase = (value = '') =>
  value
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const inferSubject = (text) => {
  let best = { subject: 'general study', score: 0 };
  Object.entries(SUBJECT_KEYWORDS).forEach(([subject, words]) => {
    const score = scoreMatch(text, words);
    if (score > best.score) best = { subject, score };
  });
  return titleCase(best.subject);
};

const inferTopic = (text) => {
  if (!text.trim()) return 'Core Concepts';
  const cleaned = text
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, 24);
  const unique = [...new Set(cleaned)];
  return unique
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' · ') || 'Core Concepts';
};

const stripCodeFences = (value = '') =>
  String(value)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

const sanitizeString = (value, fallback) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const extractTextHint = (file) => {
  const name = String(file?.originalname || '').toLowerCase();
  const mime = String(file?.mimetype || '').toLowerCase();
  const sizeKb = Math.max(1, Math.round((file?.size || 0) / 1024));

  let content = '';
  if (mime.startsWith('text/') || name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.csv')) {
    content = file.buffer.toString('utf8').slice(0, 18000);
  }

  return [
    `filename: ${name}`,
    `mime: ${mime || 'unknown'}`,
    `size_kb: ${sizeKb}`,
    content ? `content_excerpt: ${content}` : '',
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
};

const computeCoverage = (sourceMode = 'strict') => (sourceMode === 'expanded' ? 68 : 96);

const buildNotesDocument = ({ subject, title, topic, sourceMode = 'strict' }) => {
  const researchLine =
    sourceMode === 'expanded'
      ? 'This version can add wider subject context when it helps understanding.'
      : 'This version stays tightly anchored to the uploaded source.';
  return [
    `${subject} study notes`,
    '',
    `Core focus`,
    `${title} appears to centre on ${topic}. Start by identifying the exact objective, the language that signals what is being assessed, and the ideas that are most likely to recur in a test or essay setting.`,
    '',
    `High-yield understanding`,
    `Break the source into the few concepts that genuinely drive marks. Define each one clearly, explain why it matters, and connect it to the type of reasoning an examiner could reward.`,
    '',
    `Revision approach`,
    `Move from understanding into retrieval. Review the clean notes first, then use flashcards and quiz prompts to test recall before returning to the source.`,
    '',
    `Study strategy`,
    `${researchLine} Keep revision active: summarise, self-test, correct gaps, and only then reread.`,
  ].join('\n');
};

const determineAccess = ({ plan, guestMode } = {}) => {
  const cleanedPlan = String(plan || '').toLowerCase();
  const guest =
    guestMode === true ||
    guestMode === 'true' ||
    guestMode === '1' ||
    cleanedPlan === 'free' ||
    cleanedPlan === 'guest';

  if (guest) {
    return {
      plan: 'free',
      provider: deepseek ? 'deepseek' : openai ? 'openai' : 'fallback',
      model: deepseek ? MODEL_DEFAULTS.free : openai ? MODEL_DEFAULTS.starter : 'fallback',
      accessMode: 'guest',
      richFileSupport: false,
      watermark: true,
    };
  }

  const paidPlan = ['starter', 'standard', 'pro'].includes(cleanedPlan) ? cleanedPlan : 'starter';
  return {
    plan: paidPlan,
    provider: openai ? 'openai' : deepseek ? 'deepseek' : 'fallback',
    model: openai ? MODEL_DEFAULTS[paidPlan] : deepseek ? MODEL_DEFAULTS.free : 'fallback',
    accessMode: 'account',
    richFileSupport: Boolean(openai),
    watermark: false,
  };
};

const accessLabel = (access) => {
  if (access.provider === 'deepseek') return 'DeepSeek';
  if (access.provider === 'openai') return 'GPT';
  return 'Fallback';
};

const createFallbackAnalysis = (file, access, note = '', options = {}) => {
  const textHint = extractTextHint(file);
  const subject = inferSubject(textHint);
  const topic = inferTopic(textHint);
  const title = file.originalname;
  const providerLabel = accessLabel(access);
  const sourceMode = options.sourceMode === 'expanded' ? 'expanded' : 'strict';
  const sourceCoverage = computeCoverage(sourceMode);
  const guestWarning =
    access.plan === 'free'
      ? 'Guest mode keeps everything temporary. Create an account to save history and remove the watermark.'
      : 'Your account mode can save this result locally in the browser.';

  const notesDocument = buildNotesDocument({ subject, title, topic, sourceMode });

  return {
    title,
    subject,
    topic,
    summary: `${providerLabel} organized "${title}" into a clean study pack. ${guestWarning}`,
    notes: [
      `Start by identifying the core objective of ${title}.`,
      `Break the material into the most testable ideas for ${subject}.`,
      `Use the notes, flashcards, quiz, and exam tabs as one revision loop.`,
      note || 'Add your provider API keys for richer live AI output.',
    ].filter(Boolean),
    notesDocument,
    sourceMode,
    sourceCoverage,
    flashcards: [
      {
        question: `What is the core idea in this ${subject} upload?`,
        answer: `Use the upload title, visible context, and key terms to identify the main idea being tested.`,
      },
      {
        question: `What should you revise first from ${topic}?`,
        answer: `Start with the concepts most likely to control marks, then expand into examples and application.`,
      },
      {
        question: `How should you study this file efficiently?`,
        answer: `Read the notes, test yourself with flashcards and quiz questions, then finish with exam-mode practice.`,
      },
    ],
    quizzes: [
      {
        question: 'What is the best first step after generating a study pack?',
        options: [
          'Read the notes and identify the high-yield ideas',
          'Ignore the output and reopen the file',
          'Delete the file',
          'Guess without reviewing anything',
        ],
        answerIndex: 0,
        explanation: 'The notes give you the quickest clean map of the uploaded material before deeper revision.',
      },
      {
        question: 'Which method best supports active recall?',
        options: [
          'Using flashcards and quiz questions',
          'Only rereading your notes passively',
          'Memorizing without testing',
          'Skipping straight to the next topic',
        ],
        answerIndex: 0,
        explanation: 'Active recall works best when you retrieve information instead of only rereading it.',
      },
    ],
    examQuestions: [
      {
        question: `Explain the most important idea in ${subject} from "${title}" and why it matters.`,
        answerGuide: 'Define the concept, explain the reasoning, and connect it to the kind of wording an examiner could use.',
      },
      {
        question: `What is one higher-level question a teacher could ask about ${topic}?`,
        answerGuide: 'Aim for explanation, evaluation, or application rather than simple recall.',
      },
    ],
    source: 'fallback',
    provider: access.provider,
    model: access.model,
    plan: access.plan,
    accessMode: access.accessMode,
    watermark: access.watermark,
  };
};

const normalizeAnalysis = (payload, file, access, options = {}) => {
  const fallback = createFallbackAnalysis(file, access, '', options);

  const notes = Array.isArray(payload?.notes)
    ? payload.notes.filter((item) => typeof item === 'string' && item.trim()).slice(0, 8)
    : fallback.notes;

  const flashcards = Array.isArray(payload?.flashcards)
    ? payload.flashcards
        .filter((card) => card && typeof card.question === 'string' && typeof card.answer === 'string')
        .slice(0, 12)
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
        .slice(0, 8)
        .map((quiz) => ({
          question: quiz.question.trim(),
          options: quiz.options.slice(0, 4).map((option) => String(option).trim()),
          answerIndex:
            Number.isInteger(quiz.answerIndex) && quiz.answerIndex >= 0 && quiz.answerIndex < 4
              ? quiz.answerIndex
              : 0,
          explanation: sanitizeString(
            quiz.explanation,
            'Review the notes and source material to confirm why this answer works.'
          ),
        }))
    : fallback.quizzes;

  const examQuestions = Array.isArray(payload?.examQuestions)
    ? payload.examQuestions
        .filter((item) => item && typeof item.question === 'string' && typeof item.answerGuide === 'string')
        .slice(0, 6)
        .map((item) => ({
          question: item.question.trim(),
          answerGuide: item.answerGuide.trim(),
        }))
    : fallback.examQuestions;

  const sourceMode = payload?.sourceMode === 'expanded' ? 'expanded' : options.sourceMode === 'expanded' ? 'expanded' : 'strict';
  const notesDocument = sanitizeString(payload?.notesDocument, fallback.notesDocument);
  const coverage =
    Number.isFinite(Number(payload?.sourceCoverage)) && Number(payload?.sourceCoverage) > 0
      ? Math.max(0, Math.min(100, Number(payload.sourceCoverage)))
      : computeCoverage(sourceMode);

  return {
    title: sanitizeString(payload?.title, file.originalname),
    subject: sanitizeString(payload?.subject, fallback.subject),
    topic: sanitizeString(payload?.topic, fallback.topic),
    summary: sanitizeString(payload?.summary, fallback.summary),
    notes: notes.length ? notes : fallback.notes,
    notesDocument,
    sourceMode,
    sourceCoverage: coverage,
    flashcards: flashcards.length ? flashcards : fallback.flashcards,
    quizzes: quizzes.length ? quizzes : fallback.quizzes,
    examQuestions: examQuestions.length ? examQuestions : fallback.examQuestions,
    source: access.provider === 'openai' ? 'gpt' : access.provider === 'deepseek' ? 'deepseek' : 'fallback',
    provider: access.provider,
    model: access.model,
    plan: access.plan,
    accessMode: access.accessMode,
    watermark: access.watermark,
  };
};

const buildAnalysisPrompt = ({ file, options, textHint, access }) => [
  'You are Reimuru, a premium AI study tool for students.',
  'Analyze the uploaded study material and return ONLY valid JSON.',
  'Use this exact JSON shape:',
  '{"title":"string","subject":"string","topic":"string","summary":"string","sourceMode":"strict","sourceCoverage":96,"notes":["string"],"notesDocument":"string","flashcards":[{"question":"string","answer":"string"}],"quizzes":[{"question":"string","options":["string","string","string","string"],"answerIndex":0,"explanation":"string"}],"examQuestions":[{"question":"string","answerGuide":"string"}]}',
  'Rules:',
  '- Keep subject names concise and student-friendly.',
  '- Topic should be short and specific.',
  '- Summary should sound calm, premium, and genuinely useful for revision.',
  '- Write 4 to 6 structured notes.',
  '- notesDocument must be long-form study notes as plain text, with section headings and blank lines between sections.',
  '- Write 5 to 8 flashcards.',
  '- Write 4 to 6 multiple-choice quiz questions with exactly 4 options.',
  '- answerIndex must be zero-based and correct.',
  '- Write 3 to 4 exam-style questions with short answer guidance.',
  '- sourceMode should match the requested mode.',
  '- sourceCoverage should be a realistic integer percentage showing how much the output stayed anchored to the upload.',
  '- No markdown fences, no extra commentary, no extra keys.',
  options.sourceMode === 'expanded'
    ? '- You may enrich the upload with broader subject knowledge when it clearly helps understanding, but keep the uploaded source central.'
    : '- Stay tightly anchored to the uploaded source. If details are unclear, say so rather than invent specifics.',
  `Selected plan: ${access.plan}`,
  options.outputType ? `Requested output focus: ${options.outputType}` : '',
  options.difficulty ? `Target study level: ${options.difficulty}` : '',
  options.context ? `Extra user context: ${options.context}` : '',
  options.examStyle ? `Preferred exam flavour: ${options.examStyle}` : '',
  textHint ? `Helpful file hint:\n${textHint.slice(0, 10000)}` : '',
  `Filename: ${file.originalname}`,
].filter(Boolean).join('\n');

const parseJsonContent = (value) => JSON.parse(stripCodeFences(value));

const getTextFromCompletion = (completion) => {
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.type === 'text' && typeof item.text === 'string') return item.text;
        if (typeof item?.text === 'string') return item.text;
        return '';
      })
      .join('');
  }
  return '';
};

const analyzeWithOpenAIText = async (file, options, access) => {
  if (!openai) throw new Error('Missing OPENAI_API_KEY');
  const prompt = buildAnalysisPrompt({ file, options, textHint: extractTextHint(file), access });
  const completion = await openai.chat.completions.create({
    model: access.model,
    temperature: 0.35,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });
  return normalizeAnalysis(parseJsonContent(getTextFromCompletion(completion)), file, access, options);
};

const analyzeWithOpenAIFile = async (file, options, access) => {
  if (!openai) throw new Error('Missing OPENAI_API_KEY');

  const textHint = extractTextHint(file);
  const prompt = buildAnalysisPrompt({ file, options, textHint, access });
  const mimeType = file.mimetype || 'application/octet-stream';
  const fileData = `data:${mimeType};base64,${file.buffer.toString('base64')}`;

  try {
    const response = await openai.responses.create({
      model: access.model,
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
      max_output_tokens: 3200,
    });

    const raw = stripCodeFences(response.output_text || '');
    if (!raw) throw new Error('OpenAI returned an empty file-analysis response.');
    return normalizeAnalysis(JSON.parse(raw), file, access, options);
  } catch (error) {
    console.warn('OpenAI rich file analysis failed, retrying with text prompt:', error.message);
    return analyzeWithOpenAIText(file, options, access);
  }
};

const analyzeWithDeepSeekText = async (file, options, access) => {
  if (!deepseek) throw new Error('Missing DEEPSEEK_API_KEY');
  const textHint = extractTextHint(file);
  const prompt = buildAnalysisPrompt({ file, options, textHint, access });

  const completion = await deepseek.chat.completions.create({
    model: access.model,
    temperature: 0.35,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  return normalizeAnalysis(parseJsonContent(getTextFromCompletion(completion)), file, access, options);
};

const normalizeQuizQuestion = (payload, material) => {
  const fallbackQuestion = material?.flashcards?.[0]?.question || `What is the main idea in ${material?.topic || 'this study pack'}?`;
  const fallbackAnswer = material?.flashcards?.[0]?.answer || material?.summary || 'Review the notes and summary for the key idea.';
  const distractorBase = [
    'A distractor that ignores the main concept',
    'A partially true statement missing the key detail',
    'A confident-sounding but incorrect interpretation',
  ];

  const options = Array.isArray(payload?.options) ? payload.options.slice(0, 4).map((option) => String(option).trim()) : [];
  while (options.length < 4) options.push(distractorBase[options.length - 1] || 'Another incorrect option');

  return {
    question: sanitizeString(payload?.question, fallbackQuestion),
    options,
    answerIndex:
      Number.isInteger(payload?.answerIndex) && payload.answerIndex >= 0 && payload.answerIndex < 4
        ? payload.answerIndex
        : 0,
    explanation: sanitizeString(payload?.explanation, fallbackAnswer),
  };
};

const buildQuizPrompt = ({ material, access, recentQuestions = [] }) => {
  const compactMaterial = {
    title: material?.title || 'Untitled study pack',
    subject: material?.subject || 'General',
    topic: material?.topic || 'Core concepts',
    summary: material?.summary || '',
    notes: Array.isArray(material?.notes) ? material.notes.slice(0, 6) : [],
    flashcards: Array.isArray(material?.flashcards) ? material.flashcards.slice(0, 6) : [],
    recentQuestions: recentQuestions.slice(-8),
  };

  return [
    'You are generating a fresh multiple-choice study question for Reimuru.',
    'Return ONLY valid JSON using this exact shape:',
    '{"question":"string","options":["string","string","string","string"],"answerIndex":0,"explanation":"string"}',
    'Rules:',
    '- Make the question feel exam-ready and not repetitive.',
    '- Use exactly 4 options.',
    '- Only one option should be correct.',
    '- explanation should briefly explain why the right answer is right.',
    '- Avoid repeating any question listed in recentQuestions.',
    `Current plan: ${access.plan}`,
    JSON.stringify(compactMaterial),
  ].join('\n');
};

const generateQuizWithClient = async (client, model, prompt) => {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.45,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });
  return parseJsonContent(getTextFromCompletion(completion));
};

const generateFallbackQuiz = (material, recentQuestions = []) => {
  const recent = new Set(recentQuestions.map((item) => String(item).toLowerCase()));
  const flashcards = Array.isArray(material?.flashcards) ? material.flashcards : [];
  const firstUnused = flashcards.find((card) => !recent.has(String(card.question).toLowerCase()));
  if (firstUnused) {
    return normalizeQuizQuestion(
      {
        question: firstUnused.question,
        options: [
          firstUnused.answer,
          'An unrelated definition from another topic',
          'A vague idea that sounds correct but is incomplete',
          'A guess based on surface-level keywords only',
        ],
        answerIndex: 0,
        explanation: firstUnused.answer,
      },
      material
    );
  }

  const note = Array.isArray(material?.notes) ? material.notes[0] : material?.summary;
  return normalizeQuizQuestion(
    {
      question: `Which statement best matches the central idea of ${material?.topic || 'this study pack'}?`,
      options: [
        note || material?.summary || 'The summary highlights the key idea clearly.',
        'The least important detail is always the main point.',
        'Exam answers should ignore structure and explanation.',
        'Memorising without testing is the best revision method.',
      ],
      answerIndex: 0,
      explanation: note || material?.summary || 'Use the strongest idea from the summary as your anchor.',
    },
    material
  );
};

const buildNotesPrompt = ({ material, access, sourceMode }) => {
  const compact = {
    title: material?.title || 'Untitled study pack',
    subject: material?.subject || 'General Study',
    topic: material?.topic || 'Core Concepts',
    summary: material?.summary || '',
    notes: Array.isArray(material?.notes) ? material.notes.slice(0, 8) : [],
    notesDocument: material?.notesDocument || '',
    flashcards: Array.isArray(material?.flashcards) ? material.flashcards.slice(0, 4) : [],
  };

  return [
    'You are refining detailed study notes for Reimuru.',
    'Return ONLY valid JSON in this exact shape:',
    '{"notesDocument":"string","summary":"string","sourceMode":"strict","sourceCoverage":96}',
    'Rules:',
    '- notesDocument must be plain text with clear section headings and blank lines between sections.',
    '- Make the notes detailed, useful, calm, and revision-friendly.',
    '- summary should stay concise and premium.',
    '- sourceMode must match the requested mode.',
    '- sourceCoverage must be an integer percentage.',
    sourceMode === 'expanded'
      ? '- You may enrich the uploaded material with broader subject knowledge when it genuinely helps.'
      : '- Stay tightly anchored to the uploaded material. Do not add outside facts unless they are implied by the material.',
    `Current plan: ${access.plan}`,
    JSON.stringify(compact),
  ].join('\n');
};

const normalizeNotesPayload = (payload, material = {}, sourceMode = 'strict') => {
  const fallbackDoc =
    material?.notesDocument ||
    buildNotesDocument({
      subject: material?.subject || 'General Study',
      title: material?.title || 'Untitled upload',
      topic: material?.topic || 'Core Concepts',
      sourceMode,
    });
  return {
    notesDocument: sanitizeString(payload?.notesDocument, fallbackDoc),
    summary: sanitizeString(payload?.summary, material?.summary || 'Detailed notes are ready.'),
    sourceMode: payload?.sourceMode === 'expanded' ? 'expanded' : sourceMode === 'expanded' ? 'expanded' : 'strict',
    sourceCoverage:
      Number.isFinite(Number(payload?.sourceCoverage)) && Number(payload?.sourceCoverage) > 0
        ? Math.max(0, Math.min(100, Number(payload?.sourceCoverage)))
        : computeCoverage(sourceMode),
  };
};

const refineNotesWithClient = async (client, model, prompt) => {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });
  return parseJsonContent(getTextFromCompletion(completion));
};

const refineNotes = async ({ material, access, sourceMode }) => {
  const prompt = buildNotesPrompt({ material, access, sourceMode });
  try {
    if (access.provider === 'openai' && openai) {
      return normalizeNotesPayload(await refineNotesWithClient(openai, access.model, prompt), material, sourceMode);
    }
    if (access.provider === 'deepseek' && deepseek) {
      return normalizeNotesPayload(await refineNotesWithClient(deepseek, access.model, prompt), material, sourceMode);
    }
  } catch (error) {
    console.warn('Notes refinement failed, using fallback:', error.message);
  }
  return normalizeNotesPayload({}, material, sourceMode);
};

const normalizeExamPayload = (payload, material, style) => {
  const fallbackQuestions = Array.isArray(material?.examQuestions) && material.examQuestions.length
    ? material.examQuestions
    : [
        {
          question: `Explain the main idea in ${material?.topic || 'this study pack'} in a structured exam response.`,
          answerGuide: 'Define the concept, explain the reasoning, and support it with the strongest detail from the notes.',
        },
      ];

  const sections = Array.isArray(payload?.sections)
    ? payload.sections
        .filter((section) => section && typeof section.title === 'string' && Array.isArray(section.questions))
        .map((section) => ({
          title: section.title.trim(),
          marks: Math.max(4, Number(section.marks || section.questions.length * 6)),
          questions: section.questions
            .filter((item) => item && typeof item.prompt === 'string')
            .slice(0, 8)
            .map((item, index) => ({
              id: `${Date.now()}_${index}`,
              prompt: item.prompt.trim(),
              marks: Math.max(2, Number(item.marks || 4)),
              answerGuide: sanitizeString(item.answerGuide, 'Use the uploaded notes to structure a full answer.'),
            })),
        }))
        .filter((section) => section.questions.length)
    : [];

  if (!sections.length) {
    sections.push({
      title: `${style} paper`,
      marks: fallbackQuestions.length * 6,
      questions: fallbackQuestions.map((item, index) => ({
        id: `${Date.now()}_${index}`,
        prompt: item.question,
        marks: 6,
        answerGuide: item.answerGuide,
      })),
    });
  }

  const durationMinutes = Math.max(
    10,
    Number(payload?.durationMinutes || sections.reduce((sum, section) => sum + section.questions.length * 6, 0))
  );

  return {
    style: sanitizeString(payload?.style, style),
    title: sanitizeString(payload?.title, `${style} practice paper`),
    durationMinutes,
    instructions: Array.isArray(payload?.instructions)
      ? payload.instructions.filter((item) => typeof item === 'string' && item.trim()).slice(0, 5)
      : [
          'Answer every question as if it were a real timed exam.',
          'Use the notes and summary only if your mode allows it before starting.',
          'Keep structure, precision, and exam language clean.',
        ],
    sections,
  };
};

const buildExamPrompt = ({ material, access, examStyle, sourceMode }) => {
  const compact = {
    title: material?.title || 'Untitled study pack',
    subject: material?.subject || 'General Study',
    topic: material?.topic || 'Core Concepts',
    summary: material?.summary || '',
    notes: Array.isArray(material?.notes) ? material.notes.slice(0, 8) : [],
    notesDocument: material?.notesDocument || '',
    examQuestions: Array.isArray(material?.examQuestions) ? material.examQuestions.slice(0, 6) : [],
  };

  return [
    'You are building a formatted practice exam pack for Reimuru.',
    'Return ONLY valid JSON using this exact shape:',
    '{"style":"string","title":"string","durationMinutes":25,"instructions":["string"],"sections":[{"title":"string","marks":20,"questions":[{"prompt":"string","marks":4,"answerGuide":"string"}]}]}',
    'Rules:',
    '- Match the requested exam style and difficulty flavour.',
    '- Produce clear exam-style prompts and realistic sectioning.',
    '- Keep answerGuide short and practical.',
    '- 2 to 3 sections is enough.',
    '- 5 to 10 questions total is enough.',
    sourceMode === 'expanded'
      ? '- You may enrich with broader subject knowledge when it sharpens the paper.'
      : '- Stay tightly anchored to the uploaded source material.',
    `Requested exam style: ${examStyle}`,
    `Current plan: ${access.plan}`,
    JSON.stringify(compact),
  ].join('\n');
};

const buildExamWithClient = async (client, model, prompt) => {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.35,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });
  return parseJsonContent(getTextFromCompletion(completion));
};

const buildExamPack = async ({ material, access, examStyle, sourceMode }) => {
  const safeStyle = EXAM_STYLES.includes(examStyle) ? examStyle : 'Custom';
  const prompt = buildExamPrompt({ material, access, examStyle: safeStyle, sourceMode });
  try {
    if (access.provider === 'openai' && openai) {
      return normalizeExamPayload(await buildExamWithClient(openai, access.model, prompt), material, safeStyle);
    }
    if (access.provider === 'deepseek' && deepseek) {
      return normalizeExamPayload(await buildExamWithClient(deepseek, access.model, prompt), material, safeStyle);
    }
  } catch (error) {
    console.warn('Exam generation failed, using fallback:', error.message);
  }
  return normalizeExamPayload({}, material, safeStyle);
};

const analyzeWithAccess = async (file, options, access) => {
  if (access.provider === 'openai') return analyzeWithOpenAIFile(file, options, access);
  if (access.provider === 'deepseek') return analyzeWithDeepSeekText(file, options, access);
  return createFallbackAnalysis(file, access, 'No AI provider key is configured on this environment.', options);
};

const generateQuizQuestion = async ({ material, access, recentQuestions }) => {
  const prompt = buildQuizPrompt({ material, access, recentQuestions });
  try {
    if (access.provider === 'openai' && openai) {
      return normalizeQuizQuestion(await generateQuizWithClient(openai, access.model, prompt), material);
    }
    if (access.provider === 'deepseek' && deepseek) {
      return normalizeQuizQuestion(await generateQuizWithClient(deepseek, access.model, prompt), material);
    }
  } catch (error) {
    console.warn('Quiz generation failed, using fallback:', error.message);
  }
  return generateFallbackQuiz(material, recentQuestions);
};

app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(SITE_DIR));

Object.entries(pageRoutes).forEach(([route, fileName]) => {
  app.get(route, (_req, res) => {
    res.sendFile(path.resolve(SITE_DIR, fileName));
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'Reimuru',
    providers: {
      openai: Boolean(openai),
      deepseek: Boolean(deepseek),
    },
    models: MODEL_DEFAULTS,
    examStyles: EXAM_STYLES,
  });
});

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const access = determineAccess({
    plan: req.body?.plan,
    guestMode: req.body?.guestMode,
  });

  const options = {
    outputType: req.body?.outputType,
    difficulty: req.body?.difficulty,
    context: req.body?.context,
    sourceMode: req.body?.sourceMode === 'expanded' ? 'expanded' : 'strict',
    examStyle: req.body?.examStyle,
  };

  try {
    const result = await analyzeWithAccess(req.file, options, access);
    const warning =
      access.plan === 'free' && !String(req.file.mimetype || '').startsWith('text/')
        ? 'Guest mode is using DeepSeek with a lighter text-first path. Create an account for richer GPT processing and saved history.'
        : '';

    return res.json({
      ...result,
      plan: access.plan,
      provider: access.provider,
      model: access.model,
      accessMode: access.accessMode,
      watermark: access.watermark,
      warning: warning || result.warning || '',
    });
  } catch (error) {
    console.warn('AI analysis unavailable, using fallback:', error.message);
    return res.json({
      ...createFallbackAnalysis(req.file, access, error.message, options),
      warning:
        access.provider === 'openai'
          ? 'Live GPT processing failed, so Reimuru used a fallback study pack.'
          : access.provider === 'deepseek'
          ? 'DeepSeek processing failed, so Reimuru used a fallback study pack.'
          : 'No provider is configured, so Reimuru used a fallback study pack.',
    });
  }
});

app.post('/api/quiz/next', async (req, res) => {
  const access = determineAccess({
    plan: req.body?.plan,
    guestMode: req.body?.guestMode,
  });

  const material = req.body?.material || {};
  const recentQuestions = Array.isArray(req.body?.recentQuestions) ? req.body.recentQuestions : [];

  if (!material || (!material.summary && !Array.isArray(material.notes) && !Array.isArray(material.flashcards))) {
    return res.status(400).json({ error: 'Not enough study material to generate a quiz question.' });
  }

  try {
    const quiz = await generateQuizQuestion({ material, access, recentQuestions });
    return res.json({
      ...quiz,
      provider: access.provider,
      model: access.model,
      plan: access.plan,
      accessMode: access.accessMode,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to generate a quiz question.' });
  }
});

app.post('/api/notes/refine', async (req, res) => {
  const access = determineAccess({
    plan: req.body?.plan,
    guestMode: req.body?.guestMode,
  });
  const material = req.body?.material || {};
  const sourceMode = req.body?.sourceMode === 'expanded' ? 'expanded' : 'strict';

  if (!material || (!material.summary && !material.notesDocument && !Array.isArray(material.notes))) {
    return res.status(400).json({ error: 'Not enough study material to refine notes.' });
  }

  try {
    const notes = await refineNotes({ material, access, sourceMode });
    return res.json({
      ...notes,
      provider: access.provider,
      model: access.model,
      plan: access.plan,
      accessMode: access.accessMode,
      watermark: access.watermark,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to refine notes.' });
  }
});

app.post('/api/exam-mode', async (req, res) => {
  const access = determineAccess({
    plan: req.body?.plan,
    guestMode: req.body?.guestMode,
  });
  const material = req.body?.material || {};
  const examStyle = sanitizeString(req.body?.examStyle, 'Custom');
  const sourceMode = req.body?.sourceMode === 'expanded' ? 'expanded' : 'strict';

  if (!material || (!material.summary && !Array.isArray(material.examQuestions) && !material.notesDocument)) {
    return res.status(400).json({ error: 'Not enough study material to build exam mode.' });
  }

  try {
    const examPack = await buildExamPack({ material, access, examStyle, sourceMode });
    return res.json({
      ...examPack,
      provider: access.provider,
      model: access.model,
      plan: access.plan,
      accessMode: access.accessMode,
      watermark: access.watermark,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to build exam mode.' });
  }
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found.' });
  }
  return res.status(404).sendFile(path.resolve(SITE_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Reimuru V4 running on port ${PORT}`);
});
