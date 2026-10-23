import 'dotenv/config';

// Fail fast: crash at startup, not on the first request.
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is missing. Copy .env.example to .env and add your key.');
}

export const openaiKey = process.env.OPENAI_API_KEY;
export const model = process.env.OPENAI_MODEL || 'gpt-6-luna';
export const rateLimitPerMin = Number(process.env.RATE_LIMIT_PER_MIN) || 20;
export const port = Number(process.env.PORT) || 4000;
