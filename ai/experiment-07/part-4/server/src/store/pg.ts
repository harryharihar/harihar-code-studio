import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { EventKind, Note, Run, RunEvent, RunSummary, Store, StoredPlan, Task } from "../types";

// Part 4: the same Store, but the data lives in PostgreSQL.
// `Db` is the one thing we need from a database: run a query, get rows. The `pg` Pool has it.
// (The tests plug in PGlite: a real Postgres that runs inside Node, nothing to install.)
export type Db = { query(text: string, params?: any[]): Promise<{ rows: any[] }> };

// Run sql/001_init.sql. Every statement is "if not exists", so running it twice is safe.
export async function migrate(db: Db, file = join(__dirname, "../../sql/001_init.sql")) {
  const sql = readFileSync(file, "utf8").replace(/--.*$/gm, "");
  for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) await db.query(stmt);
}

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : String(d));
const json = (v: unknown) => JSON.stringify(v);

export function pgStore(db: Db): Store {
  const q = async (text: string, params: any[] = []) => (await db.query(text, params)).rows;
  const uuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id); // a bad id is simply "not found", never a crash

  const toEvent = (r: any): RunEvent => ({ seq: r.seq, at: iso(r.at), kind: r.kind, title: r.title, detail: r.detail });
  const toTask = (r: any): Task => ({
    id: r.id, runId: r.run_id, ref: r.ref, title: r.title, kind: r.kind, day: r.day, cost: r.cost, minutes: r.minutes,
    dependsOn: r.depends_on, notes: r.notes, done: r.done, order: r.purchase ?? null, verified: r.verified,
  });
  const toNote = (r: any): Note => ({ id: r.id, content: r.content, createdAt: iso(r.created_at) });

  return {
    async createRun(goal, kind = "agent") {
      const [r] = await q("insert into runs (goal, kind) values ($1, $2) returning id", [goal, kind]);
      return (await this.getRun(r.id))!;
    },

    // A run is rebuilt from the database every time. Nothing is kept in the server's memory.
    async getRun(id) {
      if (!uuid(id)) return undefined;
      const [r] = await q("select * from runs where id = $1", [id]);
      if (!r) return undefined;
      const events = (await q("select * from run_events where run_id = $1 order by seq", [id])).map(toEvent);
      return { id: r.id, kind: r.kind, goal: r.goal, status: r.status, usage: r.usage, events, createdAt: iso(r.created_at) } as Run;
    },
    async setStatus(id, status) {
      await q("update runs set status = $2, updated_at = now() where id = $1", [id, status]);
    },
    async setUsage(id, usage) {
      await q("update runs set usage = $2, updated_at = now() where id = $1", [id, json(usage)]);
    },
    async addEvent(id, kind: EventKind, title, detail = "") {
      const [r] = await q(
        `insert into run_events (run_id, seq, kind, title, detail)
         select $1, coalesce(max(seq), 0) + 1, $2, $3, $4 from run_events where run_id = $1
         returning *`,
        [id, kind, title, detail],
      );
      return toEvent(r);
    },

    async addTask(t) {
      const [r] = await q(
        `insert into tasks (run_id, ref, title, kind, day, cost, minutes, depends_on, notes)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *`,
        [t.runId, t.ref ?? "", t.title, t.kind ?? "other", t.day, t.cost ?? 0, t.minutes ?? 0, json(t.dependsOn ?? []), t.notes],
      );
      return toTask(r);
    },
    async listTasks() {
      return (await q("select * from tasks order by position")).map(toTask); // the plan's order: dependencies first
    },
    async updateTask(id, patch) {
      if (!uuid(id)) return undefined;
      const [r] = await q(
        `update tasks set day = coalesce($2, day),
                          purchase = case when $3::boolean then $4::jsonb else purchase end,
                          verified = coalesce($5, verified)
         where id = $1 returning *`,
        [id, patch.day ?? null, "order" in patch, json(patch.order ?? null), patch.verified ?? null],
      );
      return r ? toTask(r) : undefined;
    },
    async toggleTask(id) {
      if (!uuid(id)) return undefined;
      const [r] = await q("update tasks set done = not done where id = $1 returning *", [id]);
      return r ? toTask(r) : undefined;
    },
    async clearTasks() {
      await q("delete from tasks");
    },
    async setBudget(rupees) {
      await q("insert into settings (key, value) values ('budget', $1) on conflict (key) do update set value = $1", [json(rupees)]);
    },
    async getBudget() {
      const [r] = await q("select value from settings where key = 'budget'");
      return r ? Number(r.value) : 0;
    },

    async savePlan(p) {
      await q("insert into plans (id, plan, plan_order, fixed, notes, accepted) values ($1, $2, $3, $4, $5, $6)", [p.id, json(p.plan), json(p.order), json(p.fixed), json(p.notes), p.accepted]);
      return p;
    },
    async getPlan(id) {
      if (!uuid(id)) return undefined;
      const [r] = await q("select * from plans where id = $1", [id]);
      return r ? ({ id: r.id, plan: r.plan, order: r.plan_order, fixed: r.fixed, notes: r.notes, accepted: r.accepted } as StoredPlan) : undefined;
    },
    async markAccepted(id) {
      await q("update plans set accepted = true where id = $1", [id]);
    },

    // ─── Part 4: history, checkpoint, resume ───
    async listRuns(limit = 20) {
      const rows = await q(
        `select r.*, (select title from run_events e where e.run_id = r.id order by seq desc limit 1) as last
           from runs r order by created_at desc limit $1`,
        [limit],
      );
      return rows.map((r): RunSummary => ({ id: r.id, kind: r.kind, goal: r.goal, status: r.status, createdAt: iso(r.created_at), last: r.last ?? "" }));
    },

    // The server just started. A run that still says "running" never finished: the server stopped under it.
    async markInterrupted() {
      return (await q("update runs set status = 'interrupted', updated_at = now() where status = 'running' returning id")).length;
    },

    // The checkpoint: the model conversation so far + what was spent. Saved after every finished step.
    async saveCheckpoint(runId, cp) {
      await q("update runs set checkpoint = $2, usage = $3, updated_at = now() where id = $1", [runId, json(cp.input), json(cp.usage)]);
    },
    async loadCheckpoint(runId) {
      if (!uuid(runId)) return undefined;
      const [r] = await q("select checkpoint, usage from runs where id = $1", [runId]);
      return r?.checkpoint ? { input: r.checkpoint, usage: r.usage } : undefined;
    },

    // ─── Part 4: long-term memory ───
    async addNote(content) {
      const [r] = await q(
        "insert into memory (content) select $1 where not exists (select 1 from memory where lower(content) = lower($1)) returning *",
        [content],
      );
      return r ? toNote(r) : null;
    },
    async listNotes() {
      return (await q("select * from memory order by created_at")).map(toNote);
    },
    async deleteNote(id) {
      if (!uuid(id)) return false;
      return (await q("delete from memory where id = $1 returning id", [id])).length > 0;
    },
  };
}
