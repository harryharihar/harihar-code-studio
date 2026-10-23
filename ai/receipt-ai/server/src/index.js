import express from 'express';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';
import { port, rateLimitPerMin } from './config.js';
import { CategorizeBody } from './schema.js';
import { AiOutputError, categorizeReceipt } from './categorize.js';

const app = express();
app.use(express.json({ limit: '20kb' }));

app.use(
  '/api/',
  rateLimit({
    windowMs: 60_000,
    limit: rateLimitPerMin,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) =>
      sendError(res, 429, 'RATE_LIMITED', 'Too many requests. Please wait a minute and try again.'),
  }),
);

function sendError(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/receipts/categorize', async (req, res) => {
  const body = CategorizeBody.safeParse(req.body);
  if (!body.success) {
    return sendError(res, 400, 'BAD_INPUT', 'Please paste receipt text between 5 and 4000 characters.');
  }

  try {
    const { result, usage } = await categorizeReceipt(body.data.text);
    console.log(`categorize ok · ${usage?.total_tokens ?? '?'} tokens`);
    res.json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
});

// Bad JSON bodies and anything else Express throws.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return sendError(res, 400, 'BAD_INPUT', 'The request body is not valid.');
  }
  handleError(res, err);
});

// Order matters: specific OpenAI errors first, the generic APIError last.
function handleError(res, err) {
  if (err instanceof AiOutputError) {
    console.error('AI output error:', err.message);
    return sendError(res, 502, 'AI_BAD_OUTPUT', 'The AI gave an unexpected answer. Please try again.');
  }
  if (err instanceof OpenAI.RateLimitError && err.code === 'insufficient_quota') {
    console.error(`🚨 QUOTA EXCEEDED — add billing credits. requestID=${err.requestID}`);
    return sendError(res, 503, 'AI_UNAVAILABLE', 'The AI service is unavailable right now. Please try later.');
  }
  if (err instanceof OpenAI.RateLimitError) {
    res.set('Retry-After', '5');
    return sendError(res, 429, 'AI_BUSY', 'The AI is busy. Please try again in a few seconds.');
  }
  if (err instanceof OpenAI.AuthenticationError || err instanceof OpenAI.PermissionDeniedError) {
    console.error(`OpenAI auth/permission error (check server config). requestID=${err.requestID}`);
    return sendError(res, 500, 'SERVER_CONFIG', 'The server is not set up correctly. Please contact support.');
  }
  if (err instanceof OpenAI.APIConnectionError) {
    console.error('OpenAI unreachable:', err.message);
    return sendError(res, 504, 'AI_UNREACHABLE', 'Could not reach the AI service. Please try again.');
  }
  if (err instanceof OpenAI.APIError) {
    console.error(`OpenAI API error ${err.status}. requestID=${err.requestID}`);
    return sendError(res, 502, 'AI_UPSTREAM', 'The AI service had a problem. Please try again.');
  }
  console.error('Unexpected error:', err);
  return sendError(res, 500, 'INTERNAL', 'Something went wrong. Please try again.');
}

// 0.0.0.0 so a real phone on the same Wi-Fi can reach the server.
app.listen(port, '0.0.0.0', () => {
  console.log(`Receipt AI server running on http://0.0.0.0:${port}`);
});
