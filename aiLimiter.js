const HOUR_MS = 60 * 60 * 1000;

export class DemoLimitError extends Error {
  constructor() {
    super('Demo hourly AI call limit reached. Try again later.');
    this.status = 429;
  }
}

export function isDemo() {
  return process.env.APP_MODE === 'demo';
}

function getLimit() {
  return parseInt(process.env.DEMO_HOURLY_CALL_LIMIT || '10');
}

const calls = []; // timestamps

function getUsedCalls() {
  const cutoff = Date.now() - HOUR_MS;
  while (calls.length && calls[0] < cutoff) calls.shift();
  return calls.length;
}

export function getRemainingCalls() {
  return Math.max(0, getLimit() - getUsedCalls());
}

export function recordCall() {
  calls.push(Date.now());
}

export function checkLimit() {
  if (!isDemo()) return;
  if (getRemainingCalls() <= 0) throw new DemoLimitError();
}
