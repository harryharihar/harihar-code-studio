# 🚀 Personal AI Mission Control

### Experiment 07 — Agentic AI & Workflows

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)

Experiment 06 gave the app a voice. Experiment 07 lets it **act on its own**.

You give the app one goal, for example *"Prepare me for a Senior React Native interview in seven days."* A chatbot would reply with advice. An agent plans the week, puts the tasks on your calendar, checks its own work, retries when something fails, remembers where it stopped, asks you before a risky step, and finally works as a small team of agents. Each part adds one of those abilities, and each lives in its own folder with its own server, mobile app and README.

---

## 🗺 Parts

| Part | Topic | What the app gains | Status |
| --- | --- | --- | --- |
| [Part 1](part-1/README.md) | Intro to Agentic AI | The agent loop: plan → act → observe → decide, with three tools | Completed |
| [Part 2](part-2/README.md) | Planning Engine | Goal → a checked, repaired, ordered plan | Completed |
| [Part 3](part-3/README.md) | Execution Loop | The plan carried out: a party ordered within budget, retry, verify by order list, loop guard | Completed |
| Part 4 | Memory & State | PostgreSQL, checkpoints, resume, long-term memory | Planned |
| Part 5 | Human-in-the-Loop | Policy engine, approvals, grants, expiry | Planned |
| Part 6 | Multi-Agent Team | Researcher + Planner + Executor, orchestrator, replan, report | Planned |

---

## 🏗 Architecture

The OpenAI key stays on the server in every part. The phone only ever talks to our own backend.

```text
📱 Mobile app (Expo)  ──▶  🖥 Node / Express server  ──▶  🤖 OpenAI Responses API
   sends the goal           runs the agent loop          decides the next step
   shows the timeline       runs the tools               asks for a tool
   shows the calendar       keeps runs + tasks
```

---

## 🗂 Structure

```text
experiment-07/
├── README.md        ← this file
├── part-1/          ← Intro to Agentic AI
│   ├── README.md
│   ├── server/
│   └── mobile/
├── part-2/          ← Planning Engine
│   ├── README.md
│   ├── server/
│   └── mobile/
└── part-3/          ← Execution Loop
    ├── README.md
    ├── server/
    └── mobile/
```

---

## 🎓 About Harihar Code Studio

**Harihar Code Studio** focuses on practical software engineering tutorials covering:

`React Native` · `Mobile Engineering` · `Artificial Intelligence` · `LLM Integrations` · `AI Architecture` · `Developer Tools` · `Production Engineering`

The goal is to understand not only **how** to implement a feature, but also the **architecture and engineering decisions** behind it.
