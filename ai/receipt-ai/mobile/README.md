# 📱 Receipt AI — Mobile

Expo (React Native + TypeScript) app. Paste a receipt or bank SMS, tap **Categorize**, and get back a receipt-style card with the merchant, amount, date, category, a short reason and a confidence bar.

The app talks only to the [server](../server/README.md). It never holds the OpenAI key.

---

## Requirements

- Node.js 20+
- The server running (`npm run dev` in `receipt-ai/server`)
- One of: iOS Simulator (Xcode), Android emulator, or a phone with **Expo Go**

## Setup

```bash
cd receipt-ai/mobile
npm i
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` in `.env` to the server's address:

| Where the app runs | Value |
| --- | --- |
| iOS Simulator | `http://localhost:4000` |
| Android emulator | `http://10.0.2.2:4000` |
| Real phone (same Wi-Fi) | Your laptop's Wi-Fi IP, e.g. `http://192.168.1.10:4000` |

On a Mac, `ipconfig getifaddr en0` prints your Wi-Fi IP.

> Anything in an `EXPO_PUBLIC_` variable is bundled into the app. Never put a secret there.

## Start Metro

```bash
npx expo start -c         # -c clears the cache so .env changes are picked up
```

Then press **i** for the iOS Simulator, **a** for the Android emulator, or scan the QR code with Expo Go.

Shortcuts:

```bash
npm run ios
npm run android
```

If you change `.env`, restart Metro with `npx expo start -c`.

## Source files

| File | Role |
| --- | --- |
| `App.tsx` | Entry component, renders the receipt screen |
| `src/screens/ReceiptScreen.tsx` | Input box (with 4000-char counter), Categorize button, result card, error + Retry |
| `src/services/receiptApi.ts` | `categorizeReceipt()` — fetch with a 25 s timeout, one retry on 429/502/504 or network errors, typed `ApiError` |
| `src/constants/theme.ts` | Colors |

## Error handling

Server errors come back as `ApiError` with the server's `code` and `message`, which the screen shows as is. Two extra client-side codes:

| Code | When |
| --- | --- |
| `TIMEOUT` | No answer within 25 s (after the retry) |
| `NETWORK` | Can't reach the server. Check Wi-Fi and `EXPO_PUBLIC_API_URL` |
