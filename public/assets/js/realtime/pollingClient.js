import { apiFetch } from "../api.js";

export const PollingClient = {
  intervals: {},

  startPolling(key, endpoint, intervalMs, callback) {
    if (this.intervals[key]) this.stopPolling(key);

    const execute = async () => {
      if (document.visibilityState !== "visible") return;
      if (!navigator.onLine) return;
      try {
        const data = await apiFetch(endpoint);
        callback(data);
      } catch (e) {
        console.error("Polling error:", e);
      }
    };

    execute(); // initial fetch
    this.intervals[key] = setInterval(execute, intervalMs);

    // Resume polling immediately when tab becomes visible
    const visibilityHandler = () => {
      if (document.visibilityState === "visible") execute();
    };
    document.addEventListener("visibilitychange", visibilityHandler);

    return () => {
      this.stopPolling(key);
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  },

  stopPolling(key) {
    if (this.intervals[key]) {
      clearInterval(this.intervals[key]);
      delete this.intervals[key];
    }
  }
};
