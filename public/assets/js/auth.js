import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
import { store } from "./store.js";
import { SUPABASE_API_URL } from "./supabase-config.js";

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const googleRedirectReady = getRedirectResult(auth).then((result) => result?.user || null).catch((error) => { logSafeAuthError(error, "google_redirect_result"); throw error; });
const authDebugEnabled = ["localhost", "127.0.0.1"].includes(location.hostname) || new URLSearchParams(location.search).get("debugAuth") === "1";
function logSafeAuthError(error, operation) {
  if (!authDebugEnabled) return;
  console.error("[MEDWELL Firebase Auth]", JSON.stringify({
    operation,
    code: String(error?.code || "unknown"),
    message: String(error?.message || "Unknown authentication error"),
    origin: location.origin,
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
  }));
}
let resolved = false;
const sessionListeners = new Set();
export const authReady = new Promise((resolve) => {
  const timer = setTimeout(() => {
    if (!resolved) {
      resolved = true;
      resolve(null);
      store.set({ authError: "ไม่สามารถตรวจสอบสถานะการเข้าสู่ระบบได้ภายในเวลาที่กำหนด" });
    }
  }, 15_000);
  onAuthStateChanged(auth, (user) => {
    store.set({ firebaseUser: user, authError: null });
    if (!resolved) { resolved = true; clearTimeout(timer); resolve(user); }
    sessionListeners.forEach((listener) => listener(user));
  });
});
export function onSessionChange(listener) { sessionListeners.add(listener); return () => sessionListeners.delete(listener); }
export async function login(email, password, remember = false) { await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence); const credential = await signInWithEmailAndPassword(auth, email, password); if (remember) localStorage.setItem("medwell_email", email); else localStorage.removeItem("medwell_email"); return credential.user; }
export async function loginWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);
  try { return (await signInWithPopup(auth, googleProvider)).user; }
  catch (error) {
    logSafeAuthError(error, "google_popup");
    if (error.code === "auth/popup-blocked") {
      try { await signInWithRedirect(auth, googleProvider); return null; }
      catch (redirectError) { logSafeAuthError(redirectError, "google_redirect"); throw redirectError; }
    }
    throw error;
  }
}
let refreshTokenPromise = null;
export function refreshIdToken() {
  if (!auth.currentUser) return Promise.reject(Object.assign(new Error("กรุณาเข้าสู่ระบบ"), { code: "UNAUTHENTICATED" }));
  if (!refreshTokenPromise) refreshTokenPromise = auth.currentUser.getIdToken(true).finally(() => { refreshTokenPromise = null; });
  return refreshTokenPromise;
}
let logoutPromise = null;
export function logout() {
  if (!logoutPromise) logoutPromise = (async () => {
    if (auth.currentUser) {
      try { const token = await auth.currentUser.getIdToken(false); await fetch(`${SUPABASE_API_URL}/audit-events`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "logout", module: "authentication" }) }); } catch { /* Logout must still complete when audit transport is unavailable. */ }
      await signOut(auth);
    }
    store.clear();
    if (location.hash !== "#/login") location.hash = "#/login";
  })().finally(() => { logoutPromise = null; });
  return logoutPromise;
}
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);
