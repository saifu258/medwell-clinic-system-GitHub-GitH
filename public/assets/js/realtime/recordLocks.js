import { apiFetch } from "../api.js";

export const RecordLocks = {
  activeLocks: {},
  channel: new BroadcastChannel("medwell_record_locks"),

  async acquire(resourceType, resourceId) {
    const sessionId = this.getSessionId();
    try {
      const data = await apiFetch("/api/locks/acquire", {
        method: "POST",
        body: JSON.stringify({ resourceType, resourceId, sessionId })
      });
      if (data.success) {
        this.activeLocks[resourceId] = { lockId: data.lock_id, expiresAt: data.expires_at, interval: null };
        this.startHeartbeat(resourceId);
        this.channel.postMessage({ type: "LOCK_ACQUIRED", resourceId, sessionId });
        return data;
      }
      return data; // lock conflict
    } catch (e) {
      if (e.message?.includes("LOCK_CONFLICT")) return { success: false, error: "LOCK_CONFLICT" };
      throw e;
    }
  },

  async refresh(resourceId) {
    const lock = this.activeLocks[resourceId];
    if (!lock) return;
    try {
      const data = await apiFetch(`/api/locks/${lock.lockId}/refresh`, {
        method: "POST",
        body: JSON.stringify({ sessionId: this.getSessionId() })
      });
      if (data.success) {
        lock.expiresAt = data.expires_at;
      } else {
        this.clearHeartbeat(resourceId);
      }
    } catch (e) {
      console.error("Lock heartbeat failed:", e);
    }
  },

  async release(resourceId) {
    const lock = this.activeLocks[resourceId];
    if (!lock) return;
    this.clearHeartbeat(resourceId);
    try {
      await apiFetch(`/api/locks/${lock.lockId}/release`, {
        method: "POST",
        body: JSON.stringify({ sessionId: this.getSessionId() })
      });
      this.channel.postMessage({ type: "LOCK_RELEASED", resourceId, sessionId: this.getSessionId() });
    } catch (e) {
      console.error("Lock release failed:", e);
    }
  },

  startHeartbeat(resourceId) {
    this.clearHeartbeat(resourceId);
    // Heartbeat interval 30s
    this.activeLocks[resourceId].interval = setInterval(() => {
      // Pause heartbeat if document hidden. Lock expires after 90s, safe to pause.
      if (document.visibilityState === "visible") {
        this.refresh(resourceId);
      }
    }, 30000);
  },

  clearHeartbeat(resourceId) {
    if (this.activeLocks[resourceId]) {
      if (this.activeLocks[resourceId].interval) clearInterval(this.activeLocks[resourceId].interval);
      delete this.activeLocks[resourceId];
    }
  },

  getSessionId() {
    let id = sessionStorage.getItem("medwell_session_id");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("medwell_session_id", id);
    }
    return id;
  }
};

RecordLocks.channel.onmessage = (event) => {
  if (event.data.sessionId === RecordLocks.getSessionId()) return;
  // If another tab acquires/releases a lock, this tab can know,
  // but usually a tab enforces single-writer.
};
