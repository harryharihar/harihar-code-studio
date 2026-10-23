# 🖥 Receipt AI — Server

Node.js + Express (ES modules) API that takes raw receipt or bank-SMS text, asks OpenAI for a structured answer, validates it with Zod and returns a clean JSON result.

The OpenAI key lives **only here**. The mobile app never sees it.

---

## Requirements

- Node.js 20+
- An OpenAI API key with billing credits. See [OpenAI Platform Setup](../OPENAI_SETUP.md).

## Setup

```bash
cd receipt-ai/server
cp .env.example .env      # paste your key into OPENAI_API_KEY
npm i
npm run dev               # node --watch, restarts on file changes
```

You should see:

```text
Receipt AI server running on http://0.0.0.0:4000
```

If `OPENAI_API_KEY` is missing, the server stops at startup with a clear error. That is on purpose.

Use `npm start` to run without file watching.

## Environment variables

| Variable | Default | What it does |
| --- | --- | --- |
| `OPENAI_API_KEY` | — (required) | Your secret key from platform.openai.com |
| `OPENAI_MODEL` | `gpt-6-luna` | Model used for categorization |
| `RATE_LIMIT_PER_MIN` | `20` | Max requests per minute per IP on `/api/*` |
| `PORT` | `4000` | Port the server listens on (bound to `0.0.0.0`) |

## Source files

| File | Role |
| --- | --- |
| `src/config.js` | Loads `.env`, fails fast if the key is missing |
| `src/schema.js` | The category list, the AI output schema and the request body schema |
| `src/openaiClient.js` | OpenAI client with 2 retries and a 20 s timeout |
| `src/categorize.js` | The AI call plus 3 output guards (cut off, refused, invalid shape) |
| `src/index.js` | Routes, rate limiting and error mapping |

## API

### `GET /health`

```bash
curl http://localhost:4000/health
```

```json
{ "ok": true }
```

### `POST /api/receipts/categorize`

Body: `{ "text": string }`, trimmed, 5–4000 characters.

```bash
curl -X POST http://localhost:4000/api/receipts/categorize \
  -H "Content-Type: application/json" \
  -d '{"text":"Swiggy Order #48213 · Behrouz Biryani · Total paid: ₹559.65 · 12 Oct 2026"}'
```

```json
{
  "data": {
    "merchant": "Behrouz Biryani (Swiggy)",
    "amount": 559.65,
    "currency": "INR",
    "date": "2026-10-12",
    "category": "Food & Dining",
    "confidence": 0.95,
    "note": "Food order delivered through Swiggy."
  }
}
```

Multi-line receipts go in as `\n`:

```bash
curl -X POST http://localhost:4000/api/receipts/categorize \
  -H "Content-Type: application/json" \
  -d '{"text":"Uber Go · Andheri East → BKC\nTrip fare ₹212.40\nBooking fee ₹15.00\nTotal ₹227.40\nPaid on 2026-10-14"}'
```

Categories: `Food & Dining`, `Travel`, `Shopping`, `Bills & Utilities`, `Health`, `Entertainment`, `Other`.

More test inputs are in [SAMPLE_RECEIPTS.md](../SAMPLE_RECEIPTS.md).

### Errors

Every error has the same shape: `{ "error": { "code", "message" } }`.

| Status | Code | When |
| --- | --- | --- |
| 400 | `BAD_INPUT` | Text missing, shorter than 5 or longer than 4000 characters, or invalid JSON body |
| 429 | `RATE_LIMITED` | More than `RATE_LIMIT_PER_MIN` requests in a minute |
| 429 | `AI_BUSY` | OpenAI rate limit (sends `Retry-After: 5`) |
| 502 | `AI_BAD_OUTPUT` | AI answer was cut off, refused, or failed validation |
| 502 | `AI_UPSTREAM` | Any other OpenAI error |
| 503 | `AI_UNAVAILABLE` | OpenAI account is out of credits |
| 504 | `AI_UNREACHABLE` | Could not connect to OpenAI |
| 500 | `SERVER_CONFIG` | Key is wrong or has no access (the key is never shown) |
| 500 | `INTERNAL` | Anything unexpected |

## Security

- `.env` is git-ignored. Only `.env.example` is committed.
- The user's text is treated strictly as data in the system prompt, so "ignore all previous instructions…" receipts don't change the result.
- Error responses never include the key or raw OpenAI error details. Those go to the server log only.
