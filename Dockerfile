# ── Stage 1: build the React frontend ──────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: production image ───────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.js autofill.js importWords.js sentenceChat.js breakdown.js writingStory.js ./

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server.js"]
