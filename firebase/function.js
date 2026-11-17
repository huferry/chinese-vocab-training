import { onRequest } from 'firebase-functions/v2/https';
import { app, ensureSchema } from '../server.js';

await ensureSchema();

export const api = onRequest({ region: 'asia-southeast1', timeoutSeconds: 300 }, app);
