# Episode 04 — Recording Script

**Title (YouTube):** Design Your Mobile Data Models Like a Senior Engineer | UUIDs, Timestamps & Zod Validation | Hinglish
**Alt title:** Offline-First Data Models in React Native: UUID v7, Timestamps & Zod | Hinglish
**Playlist position:** Phase 1 · Episode 04 of 20 · **Target length:** 15–17 min
**Code:** `offline_first/episode-04/PlanIt`

> Legend: **🎥 SCREEN** = what's on screen · **🗣 SAY** = what you say · **⌨️ DO** = action/command

---

## Before you hit record (checklist)

- [ ] Postgres running (`brew services list` → postgresql@16 started)
- [ ] `server/` runs: `npm run dev` → `curl localhost:4000/health` is OK
- [ ] To type code live: record in a **fresh copy of `episode-03/PlanIt`**, use `episode-04/PlanIt` as the answer key
- [ ] Packages installed + pods: `npm install zod uuid react-native-get-random-values` → `cd ios && bundle exec pod install`
- [ ] iOS simulator booted, app builds once before recording (first build is slow)
- [ ] Slides ready: `ep4_00_agenda` … `ep4_09_milestone` (list at the end)
- [ ] VS Code font size up, terminal cleared, Do Not Disturb on

---

## 0:00 — Hook (30 s)

**🎥 SCREEN:** Ep 01 phone mock — "Bijli bill pay karna", Aaj 6:00 PM, no internet.

**🗣 SAY:**
> "Metro mein ho, internet nahi hai, aur aapne task add kiya — 'Bijli bill pay karna'. Phone pe save ho gaya. Ab sawaal ye hai: **is task ki ID kaun dega?** Server toh hai hi nahi abhi.
> Aur jab do ghante baad internet aayega, server ko kaise pata chalega ki ye task naya hai, update hai, ya delete ho chuka hai?
> Aaj ka episode isi ka jawab hai — **data model**. Aur yahi woh jagah hai jahan junior aur senior engineer ka fark dikhta hai."

---

## 0:30 — Recap + where we are (40 s)

**🎥 SCREEN:** Architecture slide from Ep 03 (`ep3_02_architecture.png`), highlight **Domain** layer.

**🗣 SAY:**
> "Episode 2 mein humne backend aur PostgreSQL setup kiya. Episode 3 mein architecture banaya aur ek simple `Task` interface likha.
> Lekin ek TypeScript interface sirf compile time pe kaam karta hai. App chalne ke baad — user ka input, SQLite se aaya data, server ka response — inko koi check nahi karta.
> Aaj hum **Domain layer** ko solid banayenge."

> 💡 If someone is new: "PostgreSQL ya backend naya hai? Episode 2 dekh lo — link upar card mein."

---

## 1:10 — Today's plan (30 s)

**🎥 SCREEN:** `ep4_00_agenda`

**🗣 SAY:** "Aaj ke 7 steps:"
1. Interface vs schema — kyun TypeScript kaafi nahi hai
2. IDs: auto-increment vs UUID v4 vs **UUID v7**
3. Shared metadata: timestamps, tombstone, **version**
4. Project + Task models with **Zod**
5. Domain operations: create, update, delete
6. One task, three shapes: app, SQLite, API
7. PostgreSQL migration 002 + demo

> "Aaj bhi SQLite CRUD ya sync engine nahi — wo Ep 07 aur 12 mein. Aaj sirf foundation."

---

## 1:40 — Step 1: Interface vs Schema (1.5 min)

**🎥 SCREEN:** Ep 03 `task.ts` (the old interface), then `ep4_01_interface_vs_schema`

**🗣 SAY:**
> "Ye hamara Ep 03 wala interface hai. Isme ek bug bhi hai — `description: string` likha hai, par database mein description null ho sakta hai. Compiler ko nahi pata.
> TypeScript ke types **build ke time** mit jaate hain. Runtime pe agar `title` khaali aaya, ya `priority: 'urgent'` aaya — koi nahi rokega.
> Isliye hum **Zod** use karenge: ek schema likho, usi se runtime validation bhi milta hai aur TypeScript type bhi. **Ek jagah rule, do fayde.**"

**Slide content:**
| | TypeScript interface | Zod schema |
|---|---|---|
| Checks at build time | ✅ | ✅ (type inferred) |
| Checks at runtime | ❌ | ✅ |
| Error messages for UI | ❌ | ✅ |

⌨️ **DO:**
```bash
cd apps/PlanItMobile
npm install zod uuid react-native-get-random-values
cd ios && bundle exec pod install && cd ..
```

**🗣 SAY:** "`zod` validation ke liye, `uuid` IDs ke liye, aur `react-native-get-random-values` — ye phone pe secure random numbers deta hai. Iske bina uuid phone pe crash karega."

---

## 3:10 — Step 2: Who creates the ID? (2 min)

**🎥 SCREEN:** `ep4_02_id_options`

**🗣 SAY:**
> "Teen options hain:
> **1. Auto-increment (1, 2, 3…)** — server deta hai. Offline ho toh ID hi nahi milegi. Aur do phone dono '5' bana denge — clash. ❌
> **2. UUID v4** — phone pe ban jaata hai, unique hai. Lekin poora random hai, toh database index mein har nayi row random jagah jaati hai — bade table mein slow.
> **3. UUID v7** — phone pe bhi banta hai, unique bhi hai, **aur shuru mein timestamp hota hai.** Baad mein bani ID, sort mein baad mein aati hai. Index khush, hum khush. ✅
> Fun fact: PostgreSQL 18 mein `uuidv7()` built-in aa gaya hai — industry yahi direction mein ja rahi hai."

⌨️ **DO:** create `src/shared/domain/id.ts`
```ts
import { v7 as uuidv7 } from 'uuid';

export function createId(): string {
  return uuidv7();
}
```

⌨️ **DO:** `index.js` — add as the **first** import:
```js
import 'react-native-get-random-values';
```
**🗣 SAY:** "Ye line sabse upar honi chahiye — warna uuid ko random source milne se pehle hi call ho sakta hai."

---

## 5:10 — Step 3: Shared metadata (2 min)

**🎥 SCREEN:** `ep4_03_entity_base` (5 fields, one line each)

**🗣 SAY:**
> "Project ho ya Task — har cheez jo sync hogi, uske paas ye 5 fields honi chahiye:
> - `id` — UUID v7
> - `createdAt`, `updatedAt` — ISO 8601, **hamesha UTC**, 'Z' ke saath. Ek format, har jagah.
> - `deletedAt` — tombstone. Ep 03 mein dekha tha: delete matlab row hatana nahi, mark karna.
> - **`version`** — naya hai. Har change pe +1. Jab do phone ek hi task edit karenge — Ep 16 — tab yahi batayega kaun purana hai. Senior engineers ye **pehle din** design karte hain, baad mein jodna bahut mehenga padta hai."

⌨️ **DO:** `src/shared/domain/time.ts`
```ts
export function nowIso(): string {
  return new Date().toISOString();
}
```

⌨️ **DO:** `src/shared/domain/schemas.ts` — type and explain each line
```ts
export const idSchema = z.uuid();
export const isoDateTimeSchema = z.iso.datetime();

export const entityBaseSchema = z.object({
  id: idSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.nullable(),
  version: z.int().min(1),
});

export const syncStatusSchema = z.enum(['pending', 'synced', 'failed']);
```
**🗣 SAY:** "`z.iso.datetime()` by default sirf UTC 'Z' wala time accept karta hai — `+05:30` wala reject. Yahi chahiye."

---

## 7:10 — Step 4: Project + Task with Zod (2.5 min)

**🎥 SCREEN:** `src/features/projects/domain/project.ts`

**🗣 SAY:**
> "Project simple hai — base fields + `name`. `.extend()` se base schema reuse kar rahe hain. Aur type? **Haath se nahi likhenge** — `z.infer` se nikaalenge. Schema badla, type apne aap badlega."

```ts
export const projectSchema = entityBaseSchema.extend({
  name: z.string().trim().min(1, 'Project name is required').max(100),
});
export type Project = z.infer<typeof projectSchema>;
```

**🎥 SCREEN:** `src/features/tasks/domain/task.ts` — top half (schemas)

**🗣 SAY:**
> "Task mein naya kya hai: `projectId` — har task kisi project mein. `priority` — low, medium, high. `dueAt` — Ep 01 wala 'Aaj 6 baje'.
> Aur dhyaan do — **do tarah ke schema hain:**
> - `taskSchema` — poora task, jo app aur server dono samajhte hain
> - `localTaskSchema` — task + `syncStatus`, jo sirf phone pe rehta hai
> Aur ek **input schema** — user sirf title, description, priority, dueAt bhej sakta hai. ID, version, timestamps user nahi deta — **hum dete hain.**"

Point at:
- `description` input: blank `'   '` → `null`
- `priority.default('medium')`

---

## 9:40 — Step 5: Domain operations (2 min)

**🎥 SCREEN:** `task.ts` — bottom half (`createTask`, `updateTask`, `deleteTask`)

**🗣 SAY (createTask):**
> "`createTask` — pehle input validate, phir ID, timestamps, version 1, status `pending`. **Koi network call nahi.** Airplane mode mein bhi chalega."

**🗣 SAY (updateTask):**
> "Ep 03 mein ek problem chhodi thi — update pe `updated_at` change nahi hota tha. Yahan fix: har update pe `updatedAt = now`, `version + 1`, aur status wapas `pending` — kyunki naya change abhi server tak nahi gaya. **ID kabhi nahi badalti.**"

**🗣 SAY (deleteTask):**
> "Delete = soft delete. Row rahegi, `deletedAt` set hoga, taaki doosre phone ko bhi pata chale."

---

## 11:40 — Step 6: One task, three shapes (1.5 min)

**🎥 SCREEN:** `ep4_06_three_shapes`, then `src/features/tasks/data/taskMappers.ts`

**🗣 SAY:**
> "Ek hi task ke teen roop hain:
> - **App mein** `LocalTask` — camelCase, `isCompleted: true`
> - **SQLite mein** `TaskRow` — snake_case, aur boolean nahi hota toh `1` ya `0`
> - **API pe** `Task` — bina `syncStatus` ke
> `fromTaskRow` mein bhi validation hai — database se aaya data bhi trust nahi karte. Corrupt row aayi toh yahin pakdi jaayegi, UI mein crash nahi hoga.
> Aur `toTaskPayload` mein ek trick: Zod unknown keys hata deta hai, toh `syncStatus` kabhi phone se bahar nahi jaata."

---

## 13:10 — Step 7a: PostgreSQL migration 002 (1.5 min)

**🎥 SCREEN:** `server/database/migrations/002_projects_and_task_fields.sql`

**🗣 SAY:**
> "Ep 03 mein bola tha — naya change = naya migration file. 001 ko haath nahi lagayenge.
> Ye poora `BEGIN … COMMIT` mein hai — ya sab chalega, ya kuch nahi.
> Ek senior wali baat: purane tasks ka kya? Unka koi project nahi hai. Toh pehle ek **Inbox** project banaya, purane tasks usme daale, **phir** `NOT NULL` lagaya.
> Aur jo rules Zod mein hain — priority low/medium/high, title 1 se 200 — wahi `CHECK` constraints database mein bhi. **App ke bahar se bhi koi galat data nahi ghus sakta.**"

⌨️ **DO:**
```bash
psql -h localhost -p 5432 -U planit_user -d planit \
  -f offline_first/episode-04/PlanIt/server/database/migrations/002_projects_and_task_fields.sql
psql -h localhost -U planit_user -d planit -c '\d tasks'
```
**🗣 SAY:** "Output padho — `CREATE TABLE`, `ALTER TABLE`, `COMMIT`. Aur `\d tasks` mein `project_id`, `priority`, `due_at`, `version` aur check constraints dikh rahe hain."

⌨️ **DO (break it on purpose):**
```sql
INSERT INTO tasks (id, project_id, title, priority)
VALUES (gen_random_uuid(), '00000000-0000-7000-8000-000000000001', 'Test', 'urgent');
```
**🗣 SAY:** "`urgent` — reject. Database ne bhi wahi rule follow kiya jo app follow karti hai."

> ⚠️ Run 002 **once**. Running it again errors (`projects` already exists) — say: "Migration kitni baar chali, ye track karna Ep 07 mein seekhenge."

---

## 14:40 — Step 7b: Demo — tests + phone (2 min)

⌨️ **DO:** `npx jest __tests__/domainModels.test.ts`

**🎥 SCREEN:** green list of 10 tests

**🗣 SAY:** read 3–4 test names out loud — "stable ID and pending status… rejects bad input… round-trips through a SQLite row… never sends syncStatus to the server."

⌨️ **DO:** Simulator → **turn off Wi-Fi on the Mac** (or airplane mode on a real phone) → `npm run ios`

**🎥 SCREEN:** "PlanIt · Ep 04 models" screen
1. Tap **+ Task** 3 times → "Dekho — internet nahi, phir bhi har task ko ID mil gayi. Aur IDs ka shuru ka hissa almost same hai — wahi timestamp hai, v7."
2. Tap **Toggle done** → "ID same, `version: 2`, `updatedAt` naya, sync phir se `pending`."
3. Tap **Invalid** → "Khaali title, 'kal shaam' as date — Zod ne field-wise error diya. Ep 05-06 mein yahi errors form mein dikhayenge."

---

## 16:40 — AI segment (45 s) — Generate · Review · Test · Break

**🗣 SAY:**
> "Ep 01 mein promise kiya tha — har episode mein AI ko test karenge. Maine AI se bola 'offline task model banao'. Usne diya:
> `id: Date.now().toString()` — do phone same millisecond mein → **duplicate ID.**
> Aur `updatedAt` sirf create pe set kiya, update pe nahi — **sync kabhi change detect nahi karega.**
> AI code jaldi likhta hai, lekin **failure cases aapko sochne padenge.** Isliye tests likhe."

> Tip: before recording, actually ask an AI and screenshot its answer — real output is more convincing.

---

## 17:25 — Milestone + next (35 s)

**🎥 SCREEN:** `ep4_09_milestone`

**🗣 SAY:**
> "Aaj ka milestone:
> ✅ Project + Task models, Zod se
> ✅ UUID v7 — phone pe, offline
> ✅ Timestamps, tombstone, version — sync ke liye ready
> ✅ App / SQLite / API — teen shapes, mappers ke saath
> ✅ PostgreSQL migration 002 with check constraints
> ✅ 10 tests green
> **Next — Episode 05:** PlanIt ka asli UI — projects, tasks aur navigation. Abhi tak buttons the, ab app jaisa dikhega. Milte hain!"

⌨️ **DO (on camera, optional):**
```bash
git add offline_first/episode-04
git commit -m "feat: add offline-ready project and task models with zod validation"
git push
```

---

## Slides to make (`images/ep4_*.png`)

| File | Content |
|---|---|
| ep4_00_agenda | 7 steps (above) |
| ep4_01_interface_vs_schema | table: build time / runtime / UI errors |
| ep4_02_id_options | auto-increment ❌ · UUID v4 ⚠️ · UUID v7 ✅ (+ "PostgreSQL 18 has uuidv7()") |
| ep4_03_entity_base | id · createdAt · updatedAt · deletedAt · version |
| ep4_04_task_model | Task fields + LocalTask(syncStatus) |
| ep4_05_update_flow | update → same id, updatedAt=now, version+1, pending |
| ep4_06_three_shapes | LocalTask ↔ TaskRow ↔ API payload |
| ep4_07_validation_boundaries | user input → app · SQLite → app · app → server · DB CHECK |
| ep4_08_migration_002 | Inbox backfill: add column → fill → NOT NULL |
| ep4_09_milestone | checklist above + "Next: Ep 05 UI" |

---

## YouTube description — chapters

```
0:00 Internet nahi, task ki ID kaun dega?
0:30 Recap: Episode 02 & 03
1:10 Today's plan
1:40 TypeScript interface vs Zod schema
3:10 Auto-increment vs UUID v4 vs UUID v7
5:10 Timestamps, tombstones & version
7:10 Project and Task models with Zod
9:40 Create, update, delete (offline)
11:40 One task, three shapes: app, SQLite, API
13:10 PostgreSQL migration 002 + CHECK constraints
14:40 Demo: tests + airplane mode
16:40 AI ne kya galat kiya?
17:25 Milestone & next episode
```

**Tags:** react native offline first, zod validation, uuid v7, react native typescript, data modeling, postgresql migration, local first, hinglish

---

## Files changed in this episode

```
apps/PlanItMobile/
  index.js                                   + random-values polyfill
  App.tsx                                    demo screen
  jest.config.js                             transform uuid for Jest
  package.json                               + zod, uuid, react-native-get-random-values
  src/shared/domain/id.ts                    NEW  createId() → UUID v7
  src/shared/domain/time.ts                  NEW  nowIso()
  src/shared/domain/schemas.ts               NEW  entityBaseSchema, syncStatus
  src/features/projects/domain/project.ts    NEW
  src/features/tasks/domain/task.ts          NEW  (replaces types/task.ts)
  src/features/tasks/data/taskMappers.ts     NEW
  src/features/tasks/types/                  REMOVED (task.ts moved, sample.ts deleted)
  __tests__/domainModels.test.ts             NEW  10 tests
server/
  database/migrations/002_projects_and_task_fields.sql   NEW
  .env.example                               fixed (two lines)
docs/task-data-model.md                      updated
docker-compose.yml                           user → planit_user
```
