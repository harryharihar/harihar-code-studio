import { create } from "zustand";
import { api } from "./api";
import type { Party, PlanResult, RunEvent, Status, Task, Usage } from "./types";

// Zustand: one small store the whole app reads from. Screens just show what is in here.
type State = {
  goal: string;
  runId: string | null;
  status: "idle" | "running" | "done" | "failed";
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
      set({ exec: { ...now, events: [...now.events, ...fresh], status: run.status, usage: run.usage, budget: run.budget } });
      if (fresh.some((e) => e.kind === "verify") || run.status !== "running") get().loadParty();
    } catch (e) {
      set({ exec: { ...get().exec, error: e instanceof Error ? e.message : "Lost the server." } });
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
