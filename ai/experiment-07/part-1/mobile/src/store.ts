import { create } from "zustand";
import { api } from "./api";
import type { RunEvent, Task } from "./types";

// Zustand: one small store the whole app reads from. Screens just show what is in here.
type State = {
  goal: string;
  runId: string | null;
  status: "idle" | "running" | "done" | "failed";
  events: RunEvent[];
  tasks: Task[];
  error: string | null;
  setGoal: (g: string) => void;
  start: () => Promise<void>;
  poll: () => Promise<void>;
  loadTasks: () => Promise<void>;
  toggle: (id: string) => Promise<void>;
};

export const useMission = create<State>((set, get) => ({
  goal: "",
  runId: null,
  status: "idle",
  events: [],
  tasks: [],
  error: null,

  setGoal: (goal) => set({ goal }),

  async start() {
    const { goal } = get();
    set({ error: null, events: [], status: "running", runId: null });
    try {
      const { id } = await api.startRun(goal);
      set({ runId: id });
    } catch (e) {
      set({ status: "idle", error: e instanceof Error ? e.message : "Something went wrong." });
    }
  },

  // Called every second while a run is going: ask only for events we have not seen.
  async poll() {
    const { runId, events } = get();
    if (!runId) return;
    try {
      const run = await api.getRun(runId, events.at(-1)?.seq ?? 0);
      // a slow answer can overlap the next poll: keep only events still newer than what we show
      const now = get().events;
      const fresh = run.events.filter((e) => e.seq > (now.at(-1)?.seq ?? 0));
      set({ events: [...now, ...fresh], status: run.status });
      if (run.status !== "running") await get().loadTasks();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Lost the server." });
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
