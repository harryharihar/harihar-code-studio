# 🤖 OpenAI Platform Setup

What you need on [platform.openai.com](https://platform.openai.com) before the server can run.

---

## 1. Sign in

Go to [platform.openai.com](https://platform.openai.com) and sign in (or sign up). This is the developer platform, separate from a ChatGPT subscription. A ChatGPT Plus plan does **not** include API credits.

## 2. Add billing credits

The API is prepaid.

1. Open **Settings → Billing**.
2. Add a payment method and buy credits. A small amount is plenty for this demo.
3. Optional: turn off auto-recharge while you are just experimenting.

With no credits, OpenAI returns `insufficient_quota` and the server answers `503 AI_UNAVAILABLE`.

## 3. Create a project (recommended)

1. Use the project picker at the top of the dashboard → **Create project**, e.g. `receipt-ai`.
2. Keeping each demo in its own project lets you see its usage separately and revoke its keys without touching anything else.

## 4. Create an API key

1. Open **API keys** (inside your project) → **Create new secret key**.
2. Give it a name, e.g. `receipt-ai-local`, and pick the project.
3. Copy the key (it starts with `sk-proj-`). **You will only see it once.**
4. Paste it into `server/.env`:

   ```text
   OPENAI_API_KEY=sk-proj-...
   ```

A wrong, revoked or restricted key makes the server answer `500 SERVER_CONFIG`.

## 5. Check model access

The server uses `OPENAI_MODEL` from `server/.env` (default `gpt-6-luna`). Open **Settings → Limits** for your project and make sure that model is allowed. If it is not, either allow it or set `OPENAI_MODEL` to a model your project can use.

## 6. Set a budget (recommended)

In **Settings → Limits**, set a monthly budget and an email alert for the project, so a bug or a leaked key can't run up a large bill.

## 7. Watch usage

**Usage** shows requests and cost per day. The server also logs the tokens used for every successful call:

```text
categorize ok · 412 tokens
```

## 8. Revoke when done

If you used a key in a demo, a screen recording or a screenshot, go to **API keys** and **revoke** it afterwards, then create a new one.

## Key safety checklist

- The key goes only in `server/.env`, never in the mobile app or any `EXPO_PUBLIC_` variable.
- `.env` is git-ignored. Only `.env.example` (with a placeholder) is committed.
- Never paste the key into an issue, a chat or a commit message.
