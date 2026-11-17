import Anthropic from '@anthropic-ai/sdk';
import { isDemo, checkLimit, recordCall } from './aiLimiter.js';

export function createClient() {
  const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  if (!isDemo()) return client;

  const _create = client.messages.create.bind(client.messages);
  client.messages.create = async (params) => {
    checkLimit();
    const response = await _create(params);
    recordCall();
    return response;
  };
  return client;
}
