import { store } from "../store.js";
import { logout } from "../auth.js";
import { escapeHtml } from "../formatters.js";

export async function render(root) {
  const profile = store.get().profile || {};

  root.innerHTML = `
    <main class="role-shell">
      <section class="role-panel">
        <header class="role-header">
          <div class="brand">
            <div class="brand-mark">M</div>
            <div class="brand-copy">
              <strong>MEDWELL</strong>
              <span>CLINIC SYSTEM</span>
            </div>
          </div>
          <h1>บัญชีของคุณต้องได้รับการตรวจสอบบทบาท</h1>
          <p>บทบาทเดิมของบัญชีนี้ไม่สามารถนำมาใช้กับระบบ MEDWELL เวอร์ชันใหม่ได้โดยอัตโนมัติ กรุณาติดต่อผู้ดูแลระบบเพื่อกำหนดบทบาทใหม่ก่อนเข้าใช้งาน</p>
        </header>

        <div class="card p-3 mb-4 text-center">
          <div class="google-identity justify-content-center mb-3">
            <div class="google-avatar" style="width: 64px; height: 64px; font-size: 24px;">
              <span>${escapeHtml((profile.displayName || profile.email || "U").slice(0, 1).toUpperCase())}</span>
            </div>
          </div>
          <h4 class="mb-1">${escapeHtml(profile.displayName || "ไม่ทราบชื่อ")}</h4>
          <p class="text-muted mb-2">${escapeHtml(profile.email || "")}</p>
          <span class="badge bg-warning text-dark px-3 py-2" style="font-size: 0.9rem;">สถานะ: รอตรวจสอบบทบาท</span>
        </div>

        <div class="role-actions">
          <button class="btn btn-primary" id="cancel-role" type="button" style="width: 100%;">
            <i data-lucide="log-out"></i> ออกจากระบบ
          </button>
        </div>
      </section>
    </main>
  `;

  document.querySelector("#cancel-role").addEventListener("click", () => logout());
  window.lucide?.createIcons();
}
