import { apiGet, apiPost, apiPut } from "../api.js";
import { escapeHtml, formatDateTime } from "../formatters.js";
import { pageHeader, field, loadingState, errorState, table, wireCommonActions } from "../components/ui.js";
import { toast, setButtonLoading, confirmDialog } from "../notifications.js";

export async function render(root) {
  const refresh = () => render(root);
  root.innerHTML = pageHeader("ผู้ใช้งาน") + loadingState();
  try {
    const [users, approvals] = await Promise.all([apiGet("/users"), apiGet("/google-role-approvals")]);
    root.innerHTML = pageHeader("ผู้ใช้งาน", "จัดการโปรไฟล์ บทบาท และสถานะของบัญชี Firebase", `<button class="btn btn-secondary" id="approve-google" type="button"><i data-lucide="badge-check"></i> อนุมัติ Google</button><button class="btn btn-primary" id="add-user" type="button"><i data-lucide="user-plus"></i> เพิ่มผู้ใช้</button>`) +
      `<section class="card" id="approval-form-card" hidden><form class="card-body form-grid" id="approval-form">
        ${field({ name: "approvalEmail", label: "อีเมล Google", type: "email", required: true })}
        ${field({ name: "approvalRole", label: "บทบาทที่อนุมัติ", options: [["physiotherapist", "นักกายภาพบำบัด"], ["thai_traditional_practitioner", "แพทย์แผนไทย"], ["clinic_assistant", "ผู้ช่วยคลินิก"]] })}
        <div class="span-2 alert alert-info">ผู้ใช้ต้องเลือกบทบาทตรงกับที่อนุมัติไว้ ระบบจะใช้สิทธิ์นี้ได้เพียงครั้งเดียว</div>
        <div class="span-2 text-right"><button class="btn btn-primary" type="submit">บันทึกการอนุมัติ</button></div>
      </form></section>
      <section class="card" id="user-form-card" hidden><form class="card-body form-grid" id="user-form">
        ${field({ name: "uid", label: "Firebase UID", required: true })}
        ${field({ name: "displayName", label: "ชื่อผู้ใช้", required: true })}
        ${field({ name: "email", label: "อีเมล", type: "email", required: true })}
        ${field({ name: "phone", label: "โทรศัพท์" })}
        ${field({ name: "roles", label: "บทบาท", options: [["physiotherapist", "นักกายภาพบำบัด"], ["thai_traditional_practitioner", "แพทย์แผนไทย"], ["clinic_assistant", "ผู้ช่วยคลินิก"], ["admin", "Admin"]] })}
        <div class="span-2 text-right"><button class="btn btn-primary" type="submit">บันทึกผู้ใช้</button></div>
        <div class="span-2 alert alert-info">สร้างบัญชีใน Firebase Authentication และคัดลอก UID มากรอกก่อน ระบบนี้จะไม่รับหรือเก็บรหัสผ่านของผู้ใช้</div>
      </form></section>
      <section class="card" id="resolve-role-card" hidden><form class="card-body form-grid" id="resolve-role-form">
        <input type="hidden" name="resolveUid" />
        <div class="span-2">
          <h4>ตรวจสอบบทบาทใหม่</h4>
          <p class="text-muted">เลือกบทบาทใหม่สำหรับผู้ใช้งาน: <strong id="resolve-name"></strong></p>
        </div>
        ${field({ name: "resolveRole", label: "บทบาทเป้าหมาย", options: [["physiotherapist", "นักกายภาพบำบัด"], ["thai_traditional_practitioner", "แพทย์แผนไทย"], ["clinic_assistant", "ผู้ช่วยคลินิก"]] })}
        <div class="span-2 text-right"><button class="btn btn-primary" type="submit">ยืนยันตรวจสอบบทบาท</button></div>
      </form></section>
      <section class="card mt-3">${table(["ชื่อ", "อีเมล", "บทบาท", "สถานะ", "เข้าใช้ล่าสุด", "จัดการ"], users, (user) => [
        escapeHtml(user.displayName), escapeHtml(user.email), escapeHtml((user.roles || []).join(", ")),
        user.active ? '<span class="badge success">ใช้งาน</span>' : '<span class="badge danger">ระงับ</span>',
        formatDateTime(user.lastLoginAt),
        `<div class="table-actions">
           ${(user.roles || []).some(r => ["pending_role_review", "doctor", "pharmacist"].includes(r)) ? `<button class="btn btn-warning btn-sm" type="button" data-resolve-user="${escapeHtml(user.uid)}">ตรวจสอบบทบาท</button>` : ""}
           <button class="btn btn-secondary btn-sm" type="button" data-edit-user="${escapeHtml(user.uid)}">แก้ไข</button>
           ${user.active ? `<button class="btn btn-danger btn-sm" type="button" data-disable-user="${escapeHtml(user.uid)}">ระงับ</button>` : ""}
         </div>`
      ], "ยังไม่มีผู้ใช้")}</section>
      <section class="card mt-3"><div class="card-header"><h2>อีเมล Google ที่อนุมัติ</h2></div>${table(["อีเมล", "บทบาท", "สถานะ", "สร้างเมื่อ"], approvals, (approval) => [escapeHtml(approval.email), escapeHtml(approval.approvedRole), approval.usedBy ? '<span class="badge info">ใช้แล้ว</span>' : approval.active ? '<span class="badge success">รอใช้งาน</span>' : '<span class="badge danger">ปิด</span>', formatDateTime(approval.createdAt)], "ยังไม่มีอีเมลที่อนุมัติ")}</section>`;

    const card = root.querySelector("#user-form-card");
    const form = root.querySelector("#user-form");
    const approvalCard = root.querySelector("#approval-form-card");
    const approvalForm = root.querySelector("#approval-form");
    const resolveCard = root.querySelector("#resolve-role-card");
    const resolveForm = root.querySelector("#resolve-role-form");
    let editingUid = "";
    root.querySelector("#approve-google").addEventListener("click", () => { approvalForm.reset(); approvalCard.hidden = false; approvalForm.approvalEmail.focus(); });
    approvalForm.addEventListener("submit", async (event) => {
      event.preventDefault(); const button = approvalForm.querySelector("button[type=submit]"); setButtonLoading(button, true);
      try { await apiPost("/google-role-approvals", { email: approvalForm.approvalEmail.value.trim(), role: approvalForm.approvalRole.value }); toast("อนุมัติอีเมล Google แล้ว"); refresh(); }
      catch (error) { toast(error.message, "error"); }
      finally { setButtonLoading(button, false); }
    });
    root.querySelector("#add-user").addEventListener("click", () => { editingUid = ""; form.reset(); form.uid.disabled = false; card.hidden = false; form.uid.focus(); });
    root.querySelectorAll("[data-edit-user]").forEach((button) => button.addEventListener("click", () => {
      const user = users.find((item) => item.uid === button.dataset.editUser);
      if (!user) return;
      editingUid = user.uid; form.uid.value = user.uid; form.uid.disabled = true; form.displayName.value = user.displayName || ""; form.email.value = user.email || ""; form.phone.value = user.phone || ""; form.roles.value = user.roles?.[0] || "receptionist"; card.hidden = false; card.scrollIntoView({ behavior: "smooth" });
    }));
    root.querySelectorAll("[data-disable-user]").forEach((button) => button.addEventListener("click", async () => {
      if (!await confirmDialog("ยืนยันการระงับบัญชี", "ผู้ใช้นี้จะเข้าใช้งานระบบคลินิกไม่ได้")) return;
      button.disabled = true;
      try { await apiPost(`/users/${button.dataset.disableUser}/disable`, {}); toast("ระงับบัญชีแล้ว"); refresh(); }
      catch (error) { toast(error.message, "error"); button.disabled = false; }
    }));
    root.querySelectorAll("[data-resolve-user]").forEach((button) => button.addEventListener("click", () => {
      const user = users.find((item) => item.uid === button.dataset.resolveUser);
      if (!user) return;
      resolveForm.resolveUid.value = user.uid;
      root.querySelector("#resolve-name").textContent = user.displayName;
      resolveCard.hidden = false; resolveCard.scrollIntoView({ behavior: "smooth" });
    }));
    resolveForm?.addEventListener("submit", async (event) => {
      event.preventDefault(); const button = resolveForm.querySelector("button[type=submit]"); setButtonLoading(button, true);
      try { await apiPost(`/users/${resolveForm.resolveUid.value}/resolve-role`, { role: resolveForm.resolveRole.value }); toast("ตรวจสอบบทบาทสำเร็จแล้ว"); refresh(); }
      catch (error) { toast(error.message, "error"); }
      finally { setButtonLoading(button, false); }
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); const button = form.querySelector("button[type=submit]"); setButtonLoading(button, true);
      const payload = { uid: editingUid || form.uid.value, displayName: form.displayName.value, email: form.email.value, phone: form.phone.value, roles: [form.roles.value] };
      try { if (editingUid) await apiPut(`/users/${editingUid}`, payload); else await apiPost("/users", payload); toast("บันทึกผู้ใช้แล้ว"); refresh(); }
      catch (error) { toast(error.message, "error"); }
      finally { setButtonLoading(button, false); }
    });
  } catch (error) { root.innerHTML = pageHeader("ผู้ใช้งาน") + errorState(error.message); }
  wireCommonActions(root, refresh);
}
