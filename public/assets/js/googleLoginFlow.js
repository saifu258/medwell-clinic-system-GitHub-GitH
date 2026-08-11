const RECOVERABLE_POPUP_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request"
]);

export const GOOGLE_AUTH_MESSAGES = Object.freeze({
  "auth/popup-closed-by-user": "ปิดหน้าต่าง Google ก่อนเข้าสู่ระบบสำเร็จ กรุณาลองใหม่",
  "auth/cancelled-popup-request": "ยกเลิกคำขอ Google เดิมแล้ว กรุณากดเข้าสู่ระบบอีกครั้ง",
  "auth/popup-blocked": "เบราว์เซอร์บล็อกหน้าต่าง Google กรุณาอนุญาตป๊อปอัปแล้วลองใหม่"
});

export function routeForGoogleSession(result) {
  if (result?.state === "NEEDS_ROLE_SELECTION") return "select-role";
  const route = String(result?.redirectRoute || "#/dashboard").replace(/^#\/?/, "");
  return ["dashboard", "role-review"].includes(route) ? route : "dashboard";
}

export function createGoogleLoginFlow({ auth, provider, persistence, setPersistence, signInWithPopup, onAuthError = () => {} }) {
  let inFlight = null;

  const run = (afterAuthentication = async (user) => user) => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      await setPersistence(auth, persistence);
      let user;
      try {
        const credential = await signInWithPopup(auth, provider);
        user = credential?.user || auth.currentUser;
      } catch (error) {
        onAuthError(error, "google_popup");
        if (RECOVERABLE_POPUP_CODES.has(error?.code) && auth.currentUser) user = auth.currentUser;
        else throw error;
      }
      if (!user) throw Object.assign(new Error("ไม่พบผู้ใช้หลังการยืนยันตัวตนด้วย Google"), { code: "AUTHENTICATED_USER_MISSING" });
      await user.getIdToken(true);
      return afterAuthentication(user);
    })().finally(() => { inFlight = null; });
    return inFlight;
  };

  return Object.freeze({ run, isInProgress: () => Boolean(inFlight) });
}
