# AI Receipt Categorizer

Paste a receipt or a bank SMS into the app. The server sends it to OpenAI and gets back a clean, validated result: merchant, amount, currency, date, one category, a confidence score and a short note.

```text
📱 Expo app  ──POST /api/receipts/categorize──▶  🖥 Express server  ──▶  🤖 OpenAI
   (no API key)                                  (key lives here)        (structured output)
```

## Docs

| Guide | What's in it |
| --- | --- |
| [OPENAI_SETUP.md](OPENAI_SETUP.md) | OpenAI platform steps: billing, project, API key, model access, budget |
| [server/README.md](server/README.md) | Server setup, env vars, API and error codes |
| [mobile/README.md](mobile/README.md) | Mobile setup, API URL per device, starting Metro |
| [SAMPLE_RECEIPTS.md](SAMPLE_RECEIPTS.md) | Receipts to copy-paste while testing |

## Project structure

```text
receipt-ai/
├── OPENAI_SETUP.md          OpenAI platform steps
├── server/                  Node.js + Express (ES modules)
│   ├── README.md
│   ├── .env.example
│   └── src/
│       ├── config.js        loads .env, fails fast if the key is missing
│       ├── schema.js        categories + Zod schemas
│       ├── openaiClient.js  OpenAI client (retries + timeout)
│       ├── categorize.js    the AI call + 3 output guards
│       └── index.js         routes, rate limit, error mapping
├── mobile/                  Expo app (TypeScript)
│   ├── README.md
│   ├── .env.example
│   └── src/
│       ├── services/receiptApi.ts
│       └── screens/ReceiptScreen.tsx
└── SAMPLE_RECEIPTS.md       receipts to copy-paste while testing
```

## 1. Get an OpenAI API key

1. Go to [platform.openai.com](https://platform.openai.com) and sign in.
2. Open **API keys** → **Create new secret key**.
3. Copy the key. You will only see it once.

Billing, projects, model access and budgets are covered step by step in [OPENAI_SETUP.md](OPENAI_SETUP.md).

## 2. Run the server

```bash
cd server
cp .env.example .env      # then paste your key into OPENAI_API_KEY
npm i
npm run dev
```

You should see:

```text
Receipt AI server running on http://0.0.0.0:4000
```

If the key is missing, the server stops right away with a clear error. That is on purpose.

## 3. Test with curl

Health check:

```bash
curl http://localhost:4000/health
```

Happy path:

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

Bad input (text too short) returns `400`:

```bash
curl -i -X POST http://localhost:4000/api/receipts/categorize \
  -H "Content-Type: application/json" \
  -d '{"text":"hi"}'
```

```json
{ "error": { "code": "BAD_INPUT", "message": "Please paste receipt text between 5 and 4000 characters." } }
```

### Error codes

Every error has the same shape: `{ "error": { "code", "message" } }`.

| Status | Code | When |
| --- | --- | --- |
| 400 | `BAD_INPUT` | Text missing, shorter than 5 or longer than 4000 characters |
| 429 | `RATE_LIMITED` | More than `RATE_LIMIT_PER_MIN` requests in a minute |
| 429 | `AI_BUSY` | OpenAI rate limit (sends `Retry-After: 5`) |
| 502 | `AI_BAD_OUTPUT` | AI answer was cut off, refused, or failed validation |
| 502 | `AI_UPSTREAM` | Any other OpenAI error |
| 503 | `AI_UNAVAILABLE` | OpenAI account is out of credits |
| 504 | `AI_UNREACHABLE` | Could not connect to OpenAI |
| 500 | `SERVER_CONFIG` | Key is wrong or has no access (the key is never shown) |
| 500 | `INTERNAL` | Anything unexpected |

## 4. Run the mobile app

```bash
cd mobile
npm i
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` in `mobile/.env`:

| Where the app runs | Value |
| --- | --- |
| iOS Simulator | `http://localhost:4000` |
| Android emulator | `http://10.0.2.2:4000` |
| Real phone (same Wi-Fi) | Your laptop's Wi-Fi IP, e.g. `http://192.168.1.10:4000` |

On a Mac, `ipconfig getifaddr en0` prints your Wi-Fi IP.

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press **a** for the Android emulator. If you change `.env`, restart with `npx expo start -c`.

## Security

- The OpenAI key lives **only on the server**. The app never sees it. Anything in an `EXPO_PUBLIC_` variable ends up inside the app, so never put a secret there.
- `.env` is in `.gitignore` and is never committed. Only `.env.example` is.
- If you use a key in a demo or a recording, **revoke it afterwards** on platform.openai.com.
