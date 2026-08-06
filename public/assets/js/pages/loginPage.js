import { login, loginWithGoogle, logout, resetPassword } from "../auth.js";
import { hydrateSession, resolveSessionState } from "../session.js";
import { setRoute } from "../router.js";
import { apiPost } from "../api.js";
import { setButtonLoading, toast } from "../notifications.js";
import { escapeHtml } from "../formatters.js";

const googleMessages = {
  "auth/popup-closed-by-user": "ปิดหน้าต่าง Google ก่อนเข้าสู่ระบบสำเร็จ กรุณาลองใหม่",
  "auth/popup-blocked": "เบราว์เซอร์บล็อกหน้าต่าง Google ระบบกำลังเปลี่ยนไปใช้การเข้าสู่ระบบแบบ Redirect",
  "auth/cancelled-popup-request": "ยกเลิกคำขอ Google เดิมแล้ว กรุณากดเข้าสู่ระบบอีกครั้ง",
  "auth/account-exists-with-different-credential": "อีเมลนี้มีบัญชีด้วยวิธีอื่นอยู่แล้ว กรุณาเข้าสู่ระบบด้วยวิธีเดิม",
  "auth/unauthorized-domain": "โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Authentication",
  "auth/network-request-failed": "เครือข่ายขัดข้อง กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่",
  "auth/too-many-requests": "มีการลองเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่",
  "auth/user-disabled": "บัญชีนี้ถูกระงับการใช้งาน",
  "auth/operation-not-allowed": "Google Sign-In ยังไม่ได้รับอนุญาตสำหรับโปรเจกต์นี้",
  "auth/invalid-api-key": "Firebase API key ของเว็บไซต์ไม่ถูกต้อง",
  "auth/app-not-authorized": "เว็บไซต์นี้ไม่ได้รับอนุญาตให้ใช้ Firebase Authentication",
  "auth/internal-error": "เกิดข้อผิดพลาดภายในระหว่างเชื่อมต่อ Google Sign-In กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ",
  ACCOUNT_DISABLED: "บัญชีนี้ถูกระงับการใช้งาน",
  ACCESS_DENIED: "บัญชีนี้ไม่ได้รับอนุญาตให้เข้าใช้ MEDWELL"
};

export async function render() {
  const remembered = localStorage.getItem("medwell_email") || "";
  document.querySelector("#app").innerHTML = `<main class="login-shell"><section class="login-panel"><div class="brand"><div class="brand-mark">M</div><div class="brand-copy"><strong>MEDWELL</strong><span>CLINIC SYSTEM</span></div></div><h1>ยินดีต้อนรับกลับ</h1><p>เข้าสู่ระบบเพื่อเริ่มดูแลผู้ป่วยในวันนี้</p><form class="login-form" id="login-form"><div class="form-group"><label for="email">อีเมล</label><input class="form-control" id="email" name="email" type="email" autocomplete="username" value="${escapeHtml(remembered)}" placeholder="name@clinic.com" required></div><div class="form-group"><label for="password">รหัสผ่าน</label><div class="password-wrap"><input class="form-control" id="password" name="password" type="password" autocomplete="current-password" required><button type="button" class="password-toggle" aria-label="แสดงรหัสผ่าน"><i data-lucide="eye"></i></button></div></div><div class="checkbox-row"><label><input type="checkbox" name="remember" ${remembered ? "checked" : ""}> จำอีเมลไว้</label><button type="button" class="text-link" id="forgot">ลืมรหัสผ่าน?</button></div><div id="login-error" class="alert alert-danger" role="alert" hidden></div><button class="btn btn-primary" type="submit">เข้าสู่ระบบ <i data-lucide="arrow-right"></i></button><div class="login-divider"><span>หรือ</span></div><button class="btn btn-google" id="google-login" type="button"><span class="google-mark" aria-hidden="true">G</span> เข้าสู่ระบบด้วย Google</button></form><p class="subtle mt-3">บัญชี Google ใหม่ต้องได้รับการอนุมัติอีเมลและบทบาทจากคลินิกก่อนใช้งาน</p></section><section class="login-visual"><span class="badge" style="width:max-content;background:rgb(255 255 255 / 12%);color:#fff">ระบบคลินิกครบวงจร</span><h2>ดูแลทุกขั้นตอน<br>อย่างเป็นระบบ</h2><p>ตั้งแต่ลงทะเบียน คัดกรอง ตรวจรักษา จ่ายยา จนถึงการชำระเงิน ในพื้นที่ทำงานเดียวที่เรียบง่ายและปลอดภัย</p><div class="visual-stats"><div class="visual-stat"><strong>6 บทบาท</strong><span>สิทธิ์เหมาะกับหน้าที่</span></div><div class="visual-stat"><strong>Real-time</strong><span>อัปเดตคิวอย่างต่อเนื่อง</span></div><div class="visual-stat"><strong>Audit</strong><span>ตรวจสอบย้อนหลังได้</span></div></div></section></main>`;
  const form = document.querySelector("#login-form");
  const password = form.password;
  const errorBox = document.querySelector("#login-error");
  const showError = (error, messages = {}) => { errorBox.textContent = messages[error.code] || googleMessages[error.code] || error.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่"; errorBox.hidden = false; };

  document.querySelector(".password-toggle").addEventListener("click", (event) => { password.type = password.type === "password" ? "text" : "password"; event.currentTarget.innerHTML = `<i data-lucide="${password.type === "password" ? "eye" : "eye-off"}"></i>`; window.lucide?.createIcons(); });
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); const button = form.querySelector("button[type=submit]"); if (button.disabled) return; errorBox.hidden = true; setButtonLoading(button, true, "กำลังเข้าสู่ระบบ…");
    try { const user = await login(form.email.value.trim(), form.password.value, form.remember.checked); await hydrateSession(user); await apiPost("/audit-events", { action: "login", module: "authentication" }); setRoute("dashboard"); }
    catch (error) { if (["ACCOUNT_DISABLED", "PROFILE_NOT_FOUND"].includes(error.code)) await logout(); showError(error, { "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง", PROFILE_NOT_FOUND: "บัญชีนี้ยังไม่ได้รับสิทธิ์เข้าใช้ MEDWELL" }); }
    finally { setButtonLoading(button, false); }
  });
  document.querySelector("#google-login").addEventListener("click", async (event) => {
    const button = event.currentTarget; if (button.disabled) return; errorBox.hidden = true; setButtonLoading(button, true, "กำลังเชื่อมต่อ Google…");
    try {
      const user = await loginWithGoogle();
      if (!user) return;
      await apiPost("/auth/google-login-audit", {});
      const result = await resolveSessionState(user);
      setRoute(result.state === "NEEDS_ROLE_SELECTION" ? "select-role" : "dashboard");
    } catch (error) { if (["ACCOUNT_DISABLED", "ACCESS_DENIED"].includes(error.code)) await logout(); showError(error); }
    finally { setButtonLoading(button, false); }
  });
  document.querySelector("#forgot").addEventListener("click", async () => { const email = form.email.value.trim(); if (!email) return toast("กรุณากรอกอีเมลก่อน", "error"); try { await resetPassword(email); toast("ส่งอีเมลตั้งรหัสผ่านใหม่แล้ว"); } catch { toast("ไม่สามารถส่งอีเมลได้ กรุณาตรวจสอบอีเมล", "error"); } });
  window.lucide?.createIcons();
}
