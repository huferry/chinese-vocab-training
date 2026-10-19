import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import multer from 'multer';
import { autofillWord } from './autofill.js';
import { extractWordsFromFile } from './importWords.js';
import { sentenceChatTurn } from './sentenceChat.js';
import { fetchBreakdown } from './breakdown.js';
import { generateStory } from './writingStory.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.get('/api/words', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, hanzi, pinyin, level, meaning, explanation, source, confidence, play_count, tags FROM dictionary ORDER BY level, hanzi'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/words/:id/play', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE dictionary SET play_count = play_count + 1 WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/autofill', async (req, res) => {
  const { hanzi } = req.body;
  if (!hanzi) return res.status(400).json({ error: 'hanzi is required' });
  try {
    const result = await autofillWord(hanzi);
    res.json(result);
  } catch (err) {
    console.error('Autofill error:', err.message);
    res.status(500).json({ error: 'Failed to autofill word' });
  }
});

app.post('/api/words', async (req, res) => {
  const { hanzi, pinyin, level, meaning, explanation, source, tags = [] } = req.body;
  if (!hanzi || !pinyin || !level || !meaning || !explanation || !source) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const validTags = tags.filter(t => /^[a-z0-9]+$/.test(t));
  try {
    const result = await pool.query(
      `INSERT INTO dictionary (hanzi, pinyin, level, meaning, explanation, source, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, hanzi, pinyin, level, meaning, explanation, source, confidence, play_count, tags`,
      [hanzi, pinyin, parseInt(level), meaning, explanation, source, validTags]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/import', upload.single('file'), async (req, res) => {
  const { source } = req.body;
  const tags = JSON.parse(req.body.tags || '[]').filter(t => /^[a-z0-9]+$/.test(t));
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!source)   return res.status(400).json({ error: 'source is required' });

  try {
    const words = await extractWordsFromFile(req.file.buffer, req.file.mimetype);

    // Fetch existing hanzi to deduplicate
    const { rows: existing } = await pool.query('SELECT hanzi FROM dictionary');
    const existingSet = new Set(existing.map(r => r.hanzi));

    const toAdd   = words.filter(w => !existingSet.has(w.hanzi));
    const skipped = words.filter(w =>  existingSet.has(w.hanzi)).map(w => w.hanzi);

    // Upsert tags for existing words
    if (tags.length > 0 && skipped.length > 0) {
      for (const hanzi of skipped) {
        await pool.query(
          `UPDATE dictionary
           SET tags = (SELECT array_agg(DISTINCT t ORDER BY t) FROM unnest(tags || $2::text[]) t)
           WHERE hanzi = $1`,
          [hanzi, tags]
        );
      }
    }

    const added = [];
    for (const w of toAdd) {
      const { rows } = await pool.query(
        `INSERT INTO dictionary (hanzi, pinyin, level, meaning, explanation, source, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, hanzi, pinyin, level, meaning, explanation, source, confidence, play_count, tags`,
        [w.hanzi, w.pinyin, w.level, w.meaning, w.explanation, source, tags]
      );
      added.push(rows[0]);
    }

    res.json({ added, skipped });
  } catch (err) {
    console.error('Import error:', err.message);
    res.status(500).json({ error: err.message || 'Import failed' });
  }
});

app.patch('/api/words/:id/confidence', async (req, res) => {
  const { id } = req.params;
  const { confident, factor = 1.0 } = req.body; // factor amplifies the confidence change
  try {
    const { rows } = await pool.query('SELECT hanzi, confidence, play_count FROM dictionary WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Word not found' });

    const { hanzi, play_count } = rows[0];
    const current = rows[0].confidence ?? 1.0;
    const updated = confident
      ? Math.min(20.0, current * 2.0 * factor)   // green: raise confidence → appears less
      : Math.max(0.1, current * 0.5);             // red: lower confidence → appears more

    const weight = (pc) => 1.0 / (pc * Math.pow((play_count ?? 0) + 1, 2));
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[weight] ${hanzi} | ${confident ? '✓' : '✗'} | ` +
        `confidence: ${current.toFixed(3)} → ${updated.toFixed(3)} | ` +
        `weight: ${weight(current).toFixed(4)} → ${weight(updated).toFixed(4)}`
      );
    }

    await pool.query('UPDATE dictionary SET confidence = $1 WHERE id = $2', [updated, id]);
    res.json({ id: parseInt(id), confidence: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/breakdown/:hanzi', async (req, res) => {
  const { hanzi } = req.params;
  try {
    const { rows } = await pool.query('SELECT breakdown FROM character_breakdown WHERE hanzi = $1', [hanzi]);
    if (rows.length) return res.json({ hanzi, breakdown: rows[0].breakdown, cached: true });

    const breakdown = await fetchBreakdown(hanzi);
    await pool.query('INSERT INTO character_breakdown (hanzi, breakdown) VALUES ($1, $2)', [hanzi, breakdown]);
    res.json({ hanzi, breakdown, cached: false });
  } catch (err) {
    console.error('Breakdown error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/writing/story', async (req, res) => {
  const { words } = req.body;
  if (!Array.isArray(words) || words.length === 0) {
    return res.status(400).json({ error: 'words array is required' });
  }
  try {
    const story = await generateStory(words);
    await pool.query(
      `INSERT INTO stories (title, title_pinyin, title_translation, sentences)
       VALUES ($1, $2, $3, $4)`,
      [story.title, story.title_pinyin, story.title_translation, JSON.stringify(story.sentences)]
    );
    res.json(story);
  } catch (err) {
    console.error('Writing story error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sentences/chat', async (req, res) => {
  const { word, messages } = req.body;
  if (!word?.hanzi) return res.status(400).json({ error: 'word is required' });
  try {
    const result = await sentenceChatTurn(word, messages ?? []);
    res.json(result);
  } catch (err) {
    console.error('Sentence chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = 3001;
app.listen(PORT, async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stories (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      title_pinyin      TEXT NOT NULL,
      title_translation TEXT NOT NULL,
      sentences  JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  console.log(`Server running on port ${PORT}`);
});
