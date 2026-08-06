import { apiGet } from "./api.js";
import { store } from "./store.js";

let sessionPromise = null;
let loadedUid = null;

export function clearSessionCache() {
  sessionPromise = null;
  loadedUid = null;
  store.set({ profile: null, settings: {}, authState: "AUTH_LOADING", pendingGoogleUser: null });
}

export function resolveSessionState(user, { force = false } = {}) {
  if (!user) return Promise.reject(Object.assign(new Error("กรุณาเข้าสู่ระบบ"), { code: "UNAUTHENTICATED" }));
  if (!force && loadedUid === user.uid && store.get().profile) return Promise.resolve({ state: "ACTIVE_USER", profile: store.get().profile });
  if (!sessionPromise) {
    sessionPromise = apiGet("/auth/profile").then(async (result) => {
      if (result.state === "NEEDS_ROLE_SELECTION") {
        loadedUid = null;
        store.set({ firebaseUser: user, profile: null, settings: {}, authState: "NEEDS_ROLE_SELECTION", pendingGoogleUser: { ...result.user, approved: result.approved === true }, authError: null });
        return result;
      }
      const settings = await apiGet("/clinic-info");
      loadedUid = user.uid;
      store.set({ firebaseUser: user, profile: result.profile, settings, authState: "ACTIVE_USER", pendingGoogleUser: null, authError: null });
      return result;
    }).catch((error) => {
      store.set({ authState: error.code === "ACCOUNT_DISABLED" ? "DISABLED_USER" : error.status === 403 ? "ACCESS_DENIED" : "SYSTEM_ERROR", authError: error.message });
      throw error;
    }).finally(() => { sessionPromise = null; });
  }
  return sessionPromise;
}

export function hydrateSession(user, { force = false } = {}) {
  if (!user) return Promise.reject(Object.assign(new Error("กรุณาเข้าสู่ระบบ"), { code: "UNAUTHENTICATED" }));
  if (!force && loadedUid === user.uid && store.get().profile) return Promise.resolve(store.get());
  if (!sessionPromise) {
    sessionPromise = Promise.all([apiGet("/me"), apiGet("/clinic-info")])
      .then(([profile, settings]) => {
        loadedUid = user.uid;
        store.set({ firebaseUser: user, profile, settings, authState: "ACTIVE_USER", pendingGoogleUser: null, authError: null });
        return store.get();
      })
      .finally(() => { sessionPromise = null; });
  }
  return sessionPromise;
}
