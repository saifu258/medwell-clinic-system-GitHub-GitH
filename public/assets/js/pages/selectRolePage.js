import { auth, logout } from "../auth.js";
import { apiPost } from "../api.js";
import { resolveSessionState } from "../session.js";
import { store } from "../store.js";
import { setRoute } from "../router.js";
import { confirmDialog, setButtonLoading } from "../notifications.js";
import { escapeHtml } from "../formatters.js";

const roles = [
  { id: "physiotherapist", name: "นักกายภาพบำบัด", icon: "activity", description: "ตรวจประเมิน วางแผน และให้การรักษาทางกายภาพบำบัด", duties: "คัดกรอง • ประเมิน • แผนการรักษา" },
  { id: "thai_traditional_practitioner", name: "แพทย์แผนไทย", icon: "leaf", description: "ตรวจวินิจฉัย และให้การรักษาด้วยศาสตร์การแพทย์แผนไทย", duties: "คัดกรอง • วินิจฉัย • แผนการรักษา" },
  { id: "clinic_assistant", name: "ผู้ช่วยคลินิก", icon: "clipboard-list", description: "ลงทะเบียน นัดหมาย จัดการคิว และงานเอกสารทั่วไป", duties: "เวชระเบียน • นัดหมาย • คิวบริการ" }
];

export async function render() {
  const state = store.get(); const identity = state.pendingGoogleUser || {};
  const approved = identity.approved === true;
  let submissionInFlight = false;
  const avatar = identity.photoURL ? `<img src="${escapeHtml(identity.photoURL)}" alt="รูปโปรไฟล์ Google" referrerpolicy="no-referrer">` : `<span>${escapeHtml((identity.displayName || identity.email || "G").slice(0, 1).toUpperCase())}</span>`;
  document.querySelector("#app").innerHTML = `<main class="role-shell"><section class="role-panel"><header class="role-header"><div class="brand"><div class="brand-mark">M</div><div class="brand-copy"><strong>MEDWELL</strong><span>CLINIC SYSTEM</span></div></div><div class="google-identity"><div class="google-avatar">${avatar}</div><div><strong>${escapeHtml(identity.displayName || "ผู้ใช้ Google")}</strong><span>${escapeHtml(identity.email || auth.currentUser?.email || "")}</span></div></div><h1>เลือกบทบาทการทำงาน</h1><p>เลือกบทบาทที่คลินิกอนุมัติไว้สำหรับอีเมลนี้ เมื่อยืนยันแล้วจะเปลี่ยนเองไม่ได้</p></header>${approved ? "" : '<div class="alert alert-danger" role="alert">อีเมลนี้ยังไม่ได้รับการอนุมัติบทบาท กรุณาติดต่อผู้ดูแลระบบ แล้วกด “ตรวจสอบการอนุมัติอีกครั้ง”<br><button class="btn btn-secondary mt-2" id="recheck-approval" type="button">ตรวจสอบการอนุมัติอีกครั้ง</button></div>'}<form id="role-form"><div class="role-grid">${roles.map((role) => `<label class="role-card"><input type="radio" name="role" value="${role.id}" ${approved ? "" : "disabled"}><span class="role-icon"><i data-lucide="${role.icon}"></i></span><span class="role-name">${role.name}</span><span class="role-description">${role.description}</span><span class="role-duties">${role.duties}</span><span class="btn btn-secondary role-select">เลือกบทบาทนี้</span></label>`).join("")}</div><div id="role-error" class="alert alert-danger" role="alert" hidden></div><div class="role-actions"><button class="btn btn-secondary" id="cancel-role" type="button"><i data-lucide="log-out"></i> ยกเลิกและออกจากระบบ</button><button class="btn btn-primary" id="confirm-role" type="submit" disabled>ยืนยันบทบาท</button></div></form></section></main>`;
  const form = document.querySelector("#role-form"); const confirmButton = document.querySelector("#confirm-role"); const errorBox = document.querySelector("#role-error");
  form.addEventListener("change", () => { confirmButton.disabled = !form.role.value; document.querySelectorAll(".role-card").forEach((card) => card.classList.toggle("selected", card.querySelector("input").checked)); });
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); if (!approved || submissionInFlight || confirmButton.disabled || !form.role.value) return;
    submissionInFlight = true;
    const selected = roles.find((role) => role.id === form.role.value);
    if (!await confirmDialog("ยืนยันบทบาทการทำงาน", `คุณเลือก “${selected.name}” หลังยืนยันแล้วต้องให้ผู้ดูแลระบบเป็นผู้เปลี่ยนบทบาท`)) { submissionInFlight = false; return; }
    errorBox.hidden = true; store.set({ authState: "ROLE_SUBMISSION_IN_PROGRESS" }); setButtonLoading(confirmButton, true, "กำลังตรวจสอบ…");
    try { await apiPost("/auth/select-role", { role: selected.id }, { freshToken: true, idempotent: true }); await resolveSessionState(auth.currentUser, { force: true }); setRoute("dashboard"); }
    catch (error) { if (new URLSearchParams(location.search).has("debugAuth")) console.warn("Role selection rejected", { code: error.code, status: error.status, requestId: error.requestId }); const retryable = ["ROLE_APPROVAL_DENIED", "ROLE_NOT_ALLOWED"].includes(error.code); store.set({ authState: retryable ? "NEEDS_ROLE_SELECTION" : error.status === 403 ? "ACCESS_DENIED" : "NEEDS_ROLE_SELECTION" }); errorBox.textContent = error.message || "ไม่สามารถกำหนดบทบาทนี้ได้"; errorBox.hidden = false; }
    finally { submissionInFlight = false; setButtonLoading(confirmButton, false); confirmButton.disabled = !form.role.value; }
  });
  document.querySelector("#recheck-approval")?.addEventListener("click", async (event) => { const button = event.currentTarget; setButtonLoading(button, true, "กำลังตรวจสอบ…"); try { await resolveSessionState(auth.currentUser, { force: true }); await render(); } catch (error) { errorBox.textContent = error.message; errorBox.hidden = false; setButtonLoading(button, false); } });
  document.querySelector("#cancel-role").addEventListener("click", () => logout());
  window.lucide?.createIcons();
}
