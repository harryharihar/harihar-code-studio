/**
 * Makes in-memory data behave a little like a real database:
 * - a small delay, so loading states are visible
 * - an optional failure, so error states can be shown in a demo
 */
export type SimulationOptions = {
  delayMs?: number;
  /** Called before each list(); return true to make that call fail. */
  failWhen?: () => boolean;
};

export function wait(ms: number): Promise<void> {
  return ms > 0
    ? new Promise(resolve => setTimeout(resolve, ms))
    : Promise.resolve();
}
