import type { Run, RunEvent, Task } from "./types";

// Phone → server. On a real phone, use your laptop's Wi-Fi IP in .env.local (see README).
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3007";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { headers: { "Content-Type": "application/json" }, ...init });
  } catch {
    throw new Error("Can't reach the server. Is it running, on the same Wi-Fi?");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status}).`);
  return data as T;
}

export const api = {
  startRun: (goal: string) => call<{ id: string }>("/api/runs", { method: "POST", body: JSON.stringify({ goal }) }),
  getRun: (id: string, after: number) => call<Run & { events: RunEvent[] }>(`/api/runs/${id}?after=${after}`),
  tasks: () => call<{ tasks: Task[] }>("/api/tasks"),
  toggle: (id: string) => call<{ task: Task }>(`/api/tasks/${id}/toggle`, { method: "POST" }),
};
