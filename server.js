import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import multer from 'multer';
import { autofillWord } from './autofill.js';
import { extractWordsFromFile } from './importWords.js';
import { sentenceChatTurn } from './sentenceChat.js';
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
    const { rows } = await pool.query('SELECT confidence FROM dictionary WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Word not found' });

    const current = rows[0].confidence ?? 1.0;
    const updated = confident
      ? Math.max(0.1, current * (0.5 / factor))  // green: reduce weight (more = stronger)
      : Math.min(20.0, current * 2.0);            // red: double weight

    await pool.query('UPDATE dictionary SET confidence = $1 WHERE id = $2', [updated, id]);
    res.json({ id: parseInt(id), confidence: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
