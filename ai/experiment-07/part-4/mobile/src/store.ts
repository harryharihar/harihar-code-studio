import { create } from "zustand";
import { api } from "./api";
import type { Note, Party, PlanResult, RunEvent, RunSummary, Status, Task, Usage } from "./types";

// Zustand: one small store the whole app reads from. Screens just show what is in here.
type State = {
  goal: string;
  runId: string | null;
  status: "idle" | Status;
  events: RunEvent[];
  result: PlanResult | null;
  tasks: Task[];
  error: string | null;
  setGoal: (g: string) => void;
  makePlan: () => Promise<void>;
  acceptPlan: () => Promise<boolean>;
  poll: () => Promise<void>;
  loadTasks: () => Promise<void>;
  toggle: (id: string) => Promise<void>;

  // Part 3: the execution run
  flaky: boolean;
  exec: { id: string | null; status: "idle" | Status; events: RunEvent[]; usage: Usage; budget: Usage; error: string | null };
  party: Party | null;
  setFlaky: (on: boolean) => void;
  execute: (fresh?: boolean) => Promise<void>;
  pollExec: () => Promise<void>;
  loadParty: () => Promise<void>;

  // Part 4: history, resume and long-term memory
  runs: RunSummary[];
  notes: Note[];
  loadRuns: () => Promise<void>;
  openRun: (id: string) => Promise<void>;
  resume: (id: string) => Promise<void>;
  loadNotes: () => Promise<void>;
  addNote: (content: string) => Promise<string | null>;
  deleteNote: (id: string) => Promise<void>;
};

const ZERO = { steps: 0, tokens: 0, seconds: 0 };
const IDLE_EXEC = { id: null, status: "idle" as const, events: [], usage: ZERO, budget: { steps: 30, tokens: 250000, seconds: 240 }, error: null };

export const useMission = create<State>((set, get) => ({
  goal: "",
  runId: null,
  status: "idle",
  events: [],
  result: null,
  tasks: [],
  error: null,
  flaky: false,
  exec: IDLE_EXEC,
  party: null,
  runs: [],
  notes: [],

  setGoal: (goal) => set({ goal }),

  async makePlan() {
    const { goal } = get();
    set({ error: null, events: [], result: null, status: "running", runId: null });
    try {
      const { id } = await api.makePlan(goal);
      set({ runId: id });
    } catch (e) {
      set({ status: "idle", error: e instanceof Error ? e.message : "Something went wrong." });
    }
  },

  // Called every second while the planner works: ask only for events we have not seen.
  async poll() {
    const { runId, events } = get();
    if (!runId) return;
    try {
      const run = await api.getPlan(runId, events.at(-1)?.seq ?? 0);
      // a slow answer can overlap the next poll: keep only events still newer than what we show
      const now = get().events;
      const fresh = run.events.filter((e) => e.seq > (now.at(-1)?.seq ?? 0));
      set({ events: [...now, ...fresh], status: run.status, result: run.result });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Lost the server." });
    }
  },

  // The user's yes. Only now do the tasks reach the Party tab.
  async acceptPlan() {
    const { result } = get();
    if (!result) return false;
    try {
      const { tasks } = await api.acceptPlan(result.id);
      set({ tasks, result: { ...result, accepted: true }, error: null, exec: IDLE_EXEC, party: null });
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Could not save the plan." });
      return false;
    }
  },

  setFlaky: (flaky) => set({ flaky }),

  // Start the executor. The server answers at once; the agent keeps working in the background.
  async execute(fresh = false) {
    set({ exec: { ...IDLE_EXEC, status: "running" } });
    try {
      const { id } = await api.execute({ flaky: get().flaky, fresh });
      set({ exec: { ...get().exec, id } });
    } catch (e) {
      set({ exec: { ...IDLE_EXEC, error: e instanceof Error ? e.message : "Something went wrong." } });
    }
  },

  async pollExec() {
    const { exec } = get();
    if (!exec.id) return;
    try {
      const run = await api.getRun(exec.id, exec.events.at(-1)?.seq ?? 0);
      const now = get().exec;
      const fresh = run.events.filter((e) => e.seq > (now.events.at(-1)?.seq ?? 0));
      set({ exec: { ...now, events: [...now.events, ...fresh], status: run.status, usage: run.usage, budget: run.budget, error: null } });
      if (fresh.some((e) => e.kind === "verify") || run.status !== "running") get().loadParty();
    } catch (e) {
      // the server is down (or restarting): keep the run on screen and keep asking
      set({ exec: { ...get().exec, error: e instanceof Error ? e.message : "Lost the server." } });
    }
  },

  // ─── Part 4 ───
  async loadRuns() {
    try {
      set({ runs: (await api.runs()).runs });
    } catch {
      /* shown on the Run tab */
    }
  },

  // Open an old ordering run on the Run tab: its whole timeline comes back from the database.
  async openRun(id) {
    try {
      const run = await api.getRun(id, 0);
      set({ exec: { ...IDLE_EXEC, id, status: run.status, events: run.events, usage: run.usage, budget: run.budget } });
      await get().loadParty();
    } catch (e) {
      set({ exec: { ...get().exec, error: e instanceof Error ? e.message : "Could not open that run." } });
    }
  },

  // Resume: the same run id, so the timeline just keeps growing from where it stopped.
  async resume(id) {
    try {
      await api.resume(id);
      if (get().exec.id !== id) await get().openRun(id);
      set({ exec: { ...get().exec, status: "running", error: null } });
    } catch (e) {
      set({ exec: { ...get().exec, error: e instanceof Error ? e.message : "Could not resume." } });
    }
  },

  async loadNotes() {
    try {
      set({ notes: (await api.notes()).notes });
    } catch {
      /* the screen shows an empty list */
    }
  },
  async addNote(content) {
    try {
      await api.addNote(content.trim());
      await get().loadNotes();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Could not save that.";
    }
  },
  async deleteNote(id) {
    set({ notes: get().notes.filter((n) => n.id !== id) }); // gone on screen at once
    try {
      await api.deleteNote(id);
    } catch {
      await get().loadNotes();
    }
  },

  async loadParty() {
    try {
      set({ party: await api.party() });
    } catch {
      /* the Mission screen already shows connection errors */
    }
  },

  async loadTasks() {
    try {
      set({ tasks: (await api.tasks()).tasks });
    } catch {
      /* the Mission screen already shows connection errors */
    }
  },

  async toggle(id) {
    set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }); // instant on screen
    try {
      await api.toggle(id);
    } catch {
      await get().loadTasks();
    }
  },
}));
