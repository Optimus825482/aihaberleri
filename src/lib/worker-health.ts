export const WORKER_HEARTBEAT_MAX_AGE_MS = 120 * 1000;

export interface WorkerHeartbeatState {
  isAlive: boolean;
  lastHeartbeat: string | null;
  ageMs: number | null;
}

export function parseWorkerHeartbeat(
  heartbeat: string | null | undefined,
): WorkerHeartbeatState {
  if (!heartbeat) {
    return {
      isAlive: false,
      lastHeartbeat: null,
      ageMs: null,
    };
  }

  const lastHeartbeatMs = Number.parseInt(heartbeat, 10);
  if (!Number.isFinite(lastHeartbeatMs)) {
    return {
      isAlive: false,
      lastHeartbeat: null,
      ageMs: null,
    };
  }

  const ageMs = Date.now() - lastHeartbeatMs;

  return {
    isAlive: ageMs < WORKER_HEARTBEAT_MAX_AGE_MS,
    lastHeartbeat: new Date(lastHeartbeatMs).toISOString(),
    ageMs,
  };
}
