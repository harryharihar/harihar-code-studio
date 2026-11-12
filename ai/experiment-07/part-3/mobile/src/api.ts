import type { ExecRun, Party, PlanRun, Task } from "./types";

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
  makePlan: (goal: string) => call<{ id: string }>("/api/plans", { method: "POST", body: JSON.stringify({ goal }) }),
  getPlan: (id: string, after: number) => call<PlanRun>(`/api/plans/${id}?after=${after}`),
  acceptPlan: (id: string) => call<{ tasks: Task[] }>(`/api/plans/${id}/accept`, { method: "POST" }),
  // Part 3
  execute: (o: { flaky: boolean; fresh: boolean }) => call<{ id: string }>("/api/execute", { method: "POST", body: JSON.stringify(o) }),
  getRun: (id: string, after: number) => call<ExecRun>(`/api/runs/${id}?after=${after}`),
  party: () => call<Party>("/api/party"),
  tasks: () => call<{ tasks: Task[] }>("/api/tasks"),
  toggle: (id: string) => call<{ task: Task }>(`/api/tasks/${id}/toggle`, { method: "POST" }),
};
