const state = { firebaseUser: null, profile: null, settings: {}, route: null, loading: false, authError: null, authState: "AUTH_LOADING", pendingGoogleUser: null };
const listeners = new Set();
export const store = {
  get: () => ({ ...state }),
  set(patch) { Object.assign(state, patch); listeners.forEach((listener) => listener(store.get())); },
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  clear() { Object.assign(state, { firebaseUser: null, profile: null, settings: {}, route: null, loading: false, authError: null, authState: "AUTH_LOADING", pendingGoogleUser: null }); }
};
