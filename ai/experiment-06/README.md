# 🎙️ Voice Productivity Assistant

### Experiment 06 — Voice AI

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)

Experiment 05 let the app **see**. Experiment 06 lets it **hear, understand and talk back**.

Over five parts we build a voice productivity assistant: you speak in English, Hindi or Hinglish, and the app turns that into text, works out what you want, answers out loud, and manages your tasks. Each part adds one ability on top of the last, and each lives in its own folder with its own server, mobile app and README.

---

## 🗺 Parts

| Part | Topic | What the app gains | Status |
| --- | --- | --- | --- |
| [Part 1](part-1/README.md) | Speech-to-Text | Hears you and writes down what you said | Completed |
| [Part 2](part-2/README.md) | AI Assistant | Understands whether you want a reminder or a task, and replies | Completed |
| Part 3 | Text-to-Speech | Speaks the reply | Planned |
| Part 4 | Productivity Tools | Adds and lists tasks with tool calling | Planned |
| Part 5 | Real-Time Voice | Live conversation, like a phone call | Planned |

---

## 🏗 Architecture

The OpenAI key stays on the server in every part. The phone only ever talks to our own backend.

```text
📱 Mobile app (Expo)  ──▶  🖥 Node / Express server  ──▶  🤖 OpenAI
   records voice            checks the upload            speech → text (P1)
   shows / plays reply      calls the models             LLM + tools (P2, P4)
                            returns JSON / audio         text → speech (P3)
```

---

## 🗂 Structure

```text
experiment-06/
├── README.md        ← this file
├── part-1/          ← Speech-to-Text
│   ├── README.md
│   ├── server/
│   └── mobile/
└── part-2/          ← AI Assistant
    ├── README.md
    ├── server/
    └── mobile/
```

---

## 📱 Testing on a device

Test voice features on a **real phone**. While building Part 1, the iOS Simulator received silence from the Mac's microphone and the Android Emulator's mic cut out after a few seconds. Each part's README explains how to point the phone at the server on your computer.

---

## 🎓 About Harihar Code Studio

**Harihar Code Studio** focuses on practical software engineering tutorials covering:

`React Native` · `Mobile Engineering` · `Artificial Intelligence` · `LLM Integrations` · `AI Architecture` · `Developer Tools` · `Production Engineering`

The goal is to understand not only **how** to implement a feature, but also the **architecture and engineering decisions** behind it.
