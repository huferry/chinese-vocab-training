# Chinese Vocabulary Training

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
