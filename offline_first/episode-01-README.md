# Episode 01 — What Are We Building?

> **Phase:** 🟦 Build the product · **Code in this episode:** none (by design) · **Next:** [Episode 02 — Project setup](#next-episode)

📺 **Watch:** [YouTube — Episode 1](https://youtu.be/nGkV0NkR7pM)

---

## TL;DR

- Most mobile apps need the internet just to **save** something. When the network drops, the user's work is lost.
- **Offline-first** means the app saves to the phone first and syncs with the server later.
- In this series we build **PlanIt**, a daily to-do app for you and your family, in **React Native + TypeScript + SQLite + Node.js + PostgreSQL**.
- Offline-first does **not** mean "no backend". The server still exists; the app just stops *waiting* for it.
- The hard parts are not the screens — they are **failures**: lost responses, duplicate requests, conflicts between devices.
- Over 20 episodes we take PlanIt from zero to production, one layer at a time.

---

## Chapters

| Time | Chapter |
|---|---|
| 0:00 | Intro |
| 0:03 | Internet gaya, task gaya — the problem |
| 1:00 | Offline-First kya hai? |
| 1:41 | AI can generate code — can it handle failure? |
| 2:43 | Meet PlanIt |
| 4:26 | How a normal online app works |
| 5:12 | 3 ways a request can fail |
| 6:05 | Offline-first ≠ No backend |
| 6:23 | Local first, sync later |
| 6:48 | PlanIt core architecture |
| 8:24 | Multi-device sync |
| 9:19 | 4 hard problems |
| 10:43 | The 20-episode route |
| 11:12 | AI in every episode |
| 11:56 | 20 episodes, one app |
| 12:20 | Recap: the problem is clear |
| 12:48 | Next: Episode 2 |

---

## 1. The problem

> **Metro. Subah 8:42. Bijli bill. Aaj 6 baje.**

You're in the metro and remember the electricity bill is due at 6 PM. You open your to-do app and type **"Bijli bill pay karna"**, due **Aaj, 6:00 PM**, priority **High**. You tap **Add task**.

**No internet.** The app shows:

> ❗ **Unable to save task** — No internet connection. Please try again later.

**Task save nahi hua.** And the question is simple:

> **"Ek line ka task likhne ke liye internet kyun chahiye?"**
> *Why do I need the internet to write a one-line task?*

A daily task should never disappear just because the network is unavailable or the app was closed.

---

## 2. What is offline-first?

**Offline-first** is an architecture where:

1. Every change is **saved on the device first** (in a local database).
2. The UI reads from that **local data**, so it works with or without the network.
3. Changes are **synced to the server later**, whenever a connection is available.

The internet becomes something the app *uses when available* — not something it *needs* to function.

---

## 3. AI can generate code. But can it handle failure?

Ask an AI coding agent:

```
> Build me a production-grade offline-first React Native app
```

You'll get something like this:

```ts
export async function addTask(t) {
  const res = await api.post('/tasks', t);
  return res.data;
}
// looks fine.. until the metro enters a tunnel
```

It works in the demo. It breaks in real life. Three questions the generated code doesn't answer:

| Failure | What happens |
|---|---|
| **Response lost** | Server saved the task, but the phone never heard back. |
| **App killed** | The app dies in the middle of a save. |
| **Two phones** | The same task is edited offline on two phones. |

**That is what this series is really about.** Generating code is easy. Knowing what happens when things go wrong is engineering.

---

## 4. Meet PlanIt

**PlanIt — your daily to-do list, for you and your family.**

| Feature | Description |
|---|---|
| ➕ Add tasks | Create a task in one line |
| 📋 Lists | Group tasks into lists (e.g. *Ghar ka kaam*) |
| 📅 Due dates | Today, tomorrow, or any date |
| 🔔 Reminders | e.g. *30 min pehle* |
| ✅ Mark done | Complete tasks and track daily progress |
| 👨‍👩‍👧 Shared lists | Family members share the same list |
| 🕘 Activity | See who changed what |

✔️ **Works even when you're offline.**

### Screens

| Screen | Purpose |
|---|---|
| **Today** | *Aaj ke kaam, ek nazar mein* — today's tasks and progress (e.g. *3 of 7 done*) |
| **List detail** | A shared list and all its tasks, with members |
| **New task** | Title, due date, list, priority, reminder |
| **Profile** | Preferences and sync status |

> The screens shown in Episode 1 are UI concepts. We build the real UI in Episodes 5–6.

---

## 5. How a normal online app works

```
React Native UI  ──(REST API)──►  Node.js Backend  ──►  PostgreSQL
```

The phone sends a request, the server saves it, the server sends a response back. Simple — **as long as the network works**.

**The mobile network is not reliable.** A request can go down fine, but the response may never come back. Metros, tunnels, lifts, weak signal, switching between Wi-Fi and mobile data — all of these happen every day.

See all diagrams in [`architecture.md`](architecture.md).

---

## 6. Three ways a request can end

| Case | What happens | Result |
|---|---|---|
| **1. Happy path** | Request → Server → ✅ Success | Everyone agrees. |
| **2. Network lost** | Request → ✕ Network lost | The server never got it. The task is lost unless the app kept it. |
| **3. Response lost** | Request sent → ✓ Server saved it → ✕ Response lost | **The dangerous one.** The server has the task, but the phone thinks it failed. |

### Why case 3 is dangerous

The user thinks it failed and taps **"Try again"**. Now the database looks like this:

| id | title | due |
|---|---|---|
| task_101 | Bijli bill pay | 6:00 PM |
| task_102 | Bijli bill pay | 6:00 PM ← **duplicate** |

🔔🔔 **Two reminders at 6 PM.** One request, two tasks. We fix this properly with **idempotency** in Episode 14.

---

## 7. Offline-first ≠ No backend

> **The backend stays. The app just stops waiting for it.**

Offline-first is often misunderstood as "an app without a server". That's wrong. PlanIt still has a Node.js API and a PostgreSQL database, because:

- Data must be **backed up** beyond one phone.
- Family members must **share** lists across devices.
- The server enforces **validation, security and business rules**.

What changes is the **order**: save locally first, sync to the server second.

---

## 8. Local first. Sync later.

```
User action  →  Local database  →  UI updated  →  Sync later
(tap "Add task")   (SQLite)         (instantly)      (when online)
```

1. **User action** — the user taps *Add task*.
2. **Local database** — the task is committed to SQLite on the phone.
3. **UI updated** — the screen reads from local data, so it updates instantly with no network.
4. **Sync later** — when the phone is online, the change is sent to the server.

**Accuracy rule:** local persistence always comes *before* sync.

---

## 9. PlanIt core architecture

### On the phone

| Layer | Role | One-liner |
|---|---|---|
| **React Native UI** | Screens + hooks | What the user sees and taps |
| **Repository** | One door to data | The UI never talks to the database or network directly |
| **SQLite** | Local source of truth | Tasks survive app restarts and work offline |
| **Sync Queue** | Pending changes | A durable list of changes not yet sent to the server |
| **Sync Engine** | Push + pull | Sends queued changes and fetches remote changes when online |

### On the server

| Layer | Role | One-liner |
|---|---|---|
| **REST API** | Endpoints | Authentication, validation, entry point for sync |
| **Node.js** | Business rules | Sync protocol, deduplication, conflict handling |
| **PostgreSQL** | Server source of truth | Shared data for all devices and family members |

The phone and the server talk only through the **Sync Engine ↔ REST API** path, and only **when the internet is available**.

Full diagram: [`architecture.md`](architecture.md#planit-core-architecture).

---

## 10. Multi-device sync — Harihar & Priya

PlanIt has shared lists, so two people can use the same list from different phones.

1. **Harihar is offline.** He adds *"Doodh lana"* to the shared list *Ghar ka kaam*. It is **saved locally ✓** and **waiting to sync**.
2. **Priya is online.** She does **not** see *"Doodh lana"* yet — Harihar's phone hasn't synced.
3. **Harihar comes back online.** His Sync Engine pushes the change to the server; Priya's phone pulls it. Now both phones show the same list.

**Every phone has its own local database.** Other devices never read Harihar's SQLite directly — they get changes only through the server.

Two key ideas:

- **Offline ≠ shared instantly.** Offline changes reach others only after sync.
- **Offline + sync = eventual consistency.** All devices *eventually* agree on the same data.

---

## 11. Four hard problems

These are the real challenges of offline-first. We solve each one in a later episode.

| # | Problem | Example | Solved in |
|---|---|---|---|
| 1 | **Does the task still exist?** | You edit a task offline, but someone deleted it on another device. | Ep 16 — Conflict resolution |
| 2 | **How do we prevent duplicates?** | Request sent, server saved it, response lost, app retries. | Ep 14 — Idempotency |
| 3 | **Done and renamed: can we keep both?** | One phone marks a task done, another renames it, both offline. | Ep 16 — Conflict resolution |
| 4 | **Which change wins?** | Two phones change the same due date to different values. | Ep 16 — Conflict resolution |

We will **not** blindly apply "last write wins" to everything. Each conflict gets an explicit, documented, tested rule.

---

## 12. The route we'll take

```
Product → Local database → Repository → Offline mutations → Optimistic UI
→ Sync queue → Sync engine → Retry → Idempotency → Shared lists
→ Conflict resolution → Background sync → Testing → 🚀 Production
```

Each step builds on the previous one, in the same codebase.

---

## 13. How we'll use AI in every episode

```
🤖 AI → Generate → Review → Test → Break → Fix → Production
```

| Step | What we do |
|---|---|
| **Generate** | Let AI write a first draft of the code. |
| **Review** | Read it like a senior engineer. What assumptions did it make? |
| **Test** | Run it. Write tests for the behaviour we need. |
| **Break** | Airplane mode, app kill, server down, duplicate request. |
| **Fix** | Handle the failure properly. |
| **Production** | Ship only what passed the tests. |

> **Production engineering isn't generating code.**
> **It's knowing what happens when things go wrong.**

---

## 14. Definition of done (series contract)

We never mark a feature complete just because the screen looks right. Each milestone needs **evidence**.

| Milestone | ✅ Proof it works | ❌ Not enough |
|---|---|---|
| Project setup | App launches; API health endpoint confirms the database connection. | Files exist or the code compiles. |
| Task CRUD | Create, edit, complete and delete a task; empty titles are rejected. | Buttons respond, but data is lost on restart. |
| SQLite persistence | Tasks survive force-close and relaunch; migrations are repeatable. | Data lives only in React state. |
| Offline mutations | Airplane mode on → create/update task → relaunch → task is still there. | An "offline" badge with no durable write. |
| Sync queue | Pending changes survive app restart and retry safely. | An in-memory array lost when the app is killed. |
| Idempotency | Replaying the same operation creates no duplicate. | Assuming a request is only ever sent once. |
| Conflict resolution | Two clients edit the same task; the documented rule produces the expected result. | Silently overwriting changes with no policy. |
| Production hardening | Auth and access checks, safe logs, monitoring, error handling, automated tests. | Demo credentials and debug config in production. |

---

## 15. Recap — the problem is clear

We need:

- ✅ An app that manages your daily tasks
- ✅ Local data on the phone
- ✅ Sync with the server and family
- ✅ Handle failures
- ✅ Handle conflicts
- ✅ Production-grade architecture

**No disconnected demos. PlanIt grows every episode.**

---

## Key terms

| Term | Meaning |
|---|---|
| **Offline-first** | The app works fully without a network; syncing is a background concern. |
| **Source of truth** | The place whose data is considered correct. Locally: SQLite. Across devices: PostgreSQL. |
| **Repository** | A single interface the UI uses to read and change data, hiding where data comes from. |
| **Sync queue (outbox)** | A durable table of local changes waiting to be sent to the server. |
| **Sync engine** | The component that pushes queued changes and pulls remote changes. |
| **Optimistic UI** | Showing the result immediately from local data, before the server confirms. |
| **Idempotency** | Sending the same operation twice has the same effect as sending it once. |
| **Eventual consistency** | Devices may differ for a while, but all converge to the same data after syncing. |
| **Conflict** | Two devices changed the same data before syncing with each other. |

---

## Check your understanding

<details>
<summary>1. Why is "response lost" more dangerous than "network lost"?</summary>

With *network lost*, the server never received the request, so nothing changed. With *response lost*, the server **did** save the task but the phone thinks it failed — so a retry creates a **duplicate**.
</details>

<details>
<summary>2. Does offline-first mean the app has no backend?</summary>

No. The backend stays for backup, sharing across devices, validation and security. The app just **stops waiting** for it before saving.
</details>

<details>
<summary>3. In PlanIt, where does the UI read its data from?</summary>

From the **local SQLite database**, through the **Repository**. Never directly from the network.
</details>

<details>
<summary>4. Harihar adds a task offline. Why can't Priya see it immediately?</summary>

Because every phone has its own local database. Harihar's change reaches Priya only after Harihar's phone **syncs to the server** and Priya's phone **pulls** the change. This is eventual consistency.
</details>

<details>
<summary>5. What is the order of operations when a user adds a task?</summary>

User action → save to local database → UI updates → sync later when online.
</details>

---

## Next episode

### Episode 02 — Project setup from scratch

**Stack:** React Native · TypeScript · Node.js · PostgreSQL

**Goal:** Create one repository with the mobile app, the API and a local development database.

**Done when:** the mobile app launches **and** the API health endpoint reports a working database connection.

> **Let's build PlanIt.** 🚀

---

[⬅ Back to series overview](../../README.md) · Made by **Harihar Code Studio** · Real apps. Production-level engineering. In Hinglish.
