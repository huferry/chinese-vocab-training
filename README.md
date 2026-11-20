# Chinese Vocabulary Training

**Demo:** https://chinese-vocabulary-train-1a187.web.app — demo mode, 10 AI calls per hour

![Demo QR Code](assets/demo-qr.png)

A web app to study Chinese characters and vocabulary using flash cards and quizzes. Words are stored in a PostgreSQL database with HSK levels, pinyin, meanings, and explanations.

## Prerequisites

- Docker & Docker Compose
- A running PostgreSQL instance (default: host `kingston`, port `5432`)
- An Anthropic API key (for AI autofill and document import)

## Running with Docker Compose

1. Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env
   ```

   `.env`:
   ```
   DB_HOST=kingston
   DB_PORT=5432
   DB_NAME=chinese_vocab
   DB_USER=chinese-test
   DB_PASSWORD=chinese-test
   CLAUDE_API_KEY=sk-ant-...
   ```

2. Build and start:

   ```bash
   docker compose up --build
   ```

3. Open [http://localhost:3001](http://localhost:3001).

To run in the background:

```bash
docker compose up --build -d
docker compose logs -f   # tail logs
docker compose down      # stop
```

## Running with Docker directly

```bash
docker build -t chinese-vocab .

docker run -p 3001:3001 \
  --env-file .env \
  chinese-vocab
```

## Database setup

The app expects a `dictionary` table in your PostgreSQL database:

```sql
CREATE TABLE IF NOT EXISTS dictionary (
  id          SERIAL PRIMARY KEY,
  hanzi       TEXT NOT NULL UNIQUE,
  pinyin      TEXT NOT NULL,
  level       INTEGER NOT NULL,
  meaning     TEXT NOT NULL,
  explanation TEXT NOT NULL,
  source      TEXT NOT NULL,
  update_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence  FLOAT NOT NULL DEFAULT 1.0
);
```

## Release Notes

### v1.8.4 (2026-11-20)

- Quiz and Pinyin: clicking a character after submitting opens the character breakdown popup (same as Flash Card)
- Security: removed leaked Neon credentials from git history

### v1.8.3 (2026-11-17)

- Import words: switched AI model from Haiku to Sonnet for improved accuracy

### v1.8.2 (2026-11-17)

- Mobile: hide banner title and demo badge on small screens so the hamburger menu is always visible

### v1.8.1 (2026-11-17)

- Reorganised project structure: frontend → `src/frontend`, backend → `src/backend`, Docker files → `docker/`
- Firebase config files (`firebase.json`, `.firebaserc`, `function.js`) moved into `firebase/` subfolder
- Demo QR code added to README

### v1.8.0 (2026-11-17)

- Firebase Hosting + Cloud Functions deployment via `npm run deploy-firebase`
- Neon serverless Postgres as the production database (Singapore region)
- Demo mode: set `APP_MODE=demo` and `DEMO_HOURLY_CALL_LIMIT=10` to cap AI calls per hour; demo badge with remaining calls shown in the header
- SSL database connection support via `DB_SSL=true`

### v1.7.2 (2026-10-26)

- App version shown in footer on all pages

### v1.7.1 (2026-10-25)

- Flash Card: removed Hide button — revealed cards stay open; "Close all" button below cards rates revealed cards as confident, unrevealed as not confident
- Writing: story sentences simplified to A2–B1 level
- Writing: fixed JSON parse error when Claude prepends text before the JSON object

### v1.7.0 (2026-10-24)

- Writing: hover hint now shows animated stroke order (from strokeorder.com) for each character in the word
- Import: minimum HSK level filter — only words at or above the selected level are imported

### v1.6.1 (2026-10-21)

- Writing: use Claude Sonnet 4.6 for better story quality
- Writing: hover hints now cover all words including particles and function words
- Writing: stale cached stories (without word-level hints) are auto-discarded

### v1.6.0 (2026-10-19)

- New game: Writing — Claude generates a short story from filtered vocabulary; hover any character to see the sentence's pinyin and translation; click any character for radical breakdown
- Stories are saved to the database (`stories` table, auto-created on startup)

### v1.5.0 (2026-10-19)

- Character breakdown: click any character in Flash Card or Sentences to see radical breakdown, etymology, pinyin, and common words (powered by Claude Sonnet, cached in DB)

### v1.4.2 (2026-10-19)

- Word selection: lower confidence now means more likely to appear (was inverted)
- Word selection: play_count uses pool-relative percentile ranking for stronger influence
- Dev mode: log weight changes to console on confidence updates

### v1.4.1 (2026-10-19)

- Move HSK level badge to bottom-right of the Chinese word

### v1.4.0 (2026-10-19)

- Dictionary: filter table by Level, Source, and Tags
- All games: HSK level badge shown next to the Chinese word

### v1.3.0 (2026-10-19)

- Word tagging: add tags when creating or importing words
- Tags filter on the game filter screen
- Import: upsert tags onto existing words
- Tags displayed in the Dictionary table

### v1.2.2 (2026-10-19)

- Track play count per word in the database
- Word selection in all games now factors in play count: less-played words appear more often
- Quiz and Pinyin games now use weighted selection (previously random shuffle)

### v1.2.1 (2026-10-17)

- Dictionary import: support .txt and .srt files
- Dictionary import: fix JSON truncation error on large files; cap output at 80 words

### v1.2.0 (2026-10-17)

- New game: Sentences — translate AI-generated English sentences to Chinese with Claude as tutor
- Paste-last-answer button in the sentence input field

### v1.1.2 (2026-10-16)

- Pinyin game: fix correct tone sometimes missing from choices
- Pinyin game: scroll to top on Next

### v1.1.1 (2026-10-16)

- Pinyin game: reveal correct answer and meaning after a wrong tone selection

### v1.1.0 (2026-10-16)

- New game: Pinyin — select the correct sound and tone for a given hanzi

### v1.0.1 (2026-10-16)

- Dictionary: on mobile, show only Hanzi, Pinyin, and Meaning columns

### v1.0.0 (2026-10-16)

- Initial release
- Flash Card training with confidence-based weighted selection
- Quiz with 10-question sessions and results review
- Dictionary with sortable/filterable table, word management, AI autofill, and document/image import
- Level and source filter screen before Flash Card and Quiz
- Docker & Docker Compose support

## Local development (without Docker)

```bash
npm install
npm run dev      # Vite dev server on :5173, proxies /api → :3001
node server.js   # Express API on :3001
```
