import { apiGet, apiPost } from "../api.js";
import { escapeHtml, formatDate, maskCitizenId, maskPhone } from "../formatters.js?v=20260802-patient-fix-3";
import { pageHeader, loadingState, errorState, wireCommonActions } from "../components/ui.js";
import { toast } from "../notifications.js";
import { can } from "../permissions.js";

export async function render(root, params) {
  const refresh = () => render(root, params);
  root.innerHTML = pageHeader("ข้อมูลผู้ป่วย") + loadingState();
  try {
    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
    const [patient, appointments, queuesToday] = await Promise.all([
      apiGet(`/patients/${params.id}`),
      apiGet("/appointments").catch(() => []),
      apiGet("/queues/today").catch(() => [])
    ]);

    const activeQueue = (queuesToday || []).find((q) => q.patientId === patient.patientId && q.currentStatus !== "cancelled");
    const todayAppointment = (appointments || []).find((a) => a.patientId === patient.patientId && a.appointmentDate === todayStr && ["scheduled", "confirmed"].includes(a.status));

    const rows = [
      ["HN", patient.hn],
      ["ชื่อ-นามสกุล", `${patient.title || ""}${patient.firstName} ${patient.lastName}`],
      ["วันเกิด", formatDate(patient.dateOfBirth)],
      ["เลขบัตรประชาชน", maskCitizenId(patient.citizenId)],
      ["โทรศัพท์", maskPhone(patient.phone)],
      ["อีเมล", patient.email],
      ["ที่อยู่", `${patient.address || ""} ${patient.province || ""} ${patient.postalCode || ""}`],
      ["ประวัติแพ้ยา", patient.drugAllergies || "ไม่มีข้อมูล"],
      ["โรคประจำตัว", patient.chronicDiseases || "ไม่มีข้อมูล"],
      ["Consent", patient.consentStatus]
    ];
    const headerActions = can("patients.write") ? `<a class="btn btn-primary" href="#/patients/${patient.patientId}/edit"><i data-lucide="pencil"></i> แก้ไข</a>` : "";

    let receiveButtonHtml = "";
    if (can("queues.write")) {
      if (activeQueue) {
        receiveButtonHtml = `<a class="quick-action" href="#/queue"><i data-lucide="list-ordered"></i><strong>ดูคิว (${escapeHtml(activeQueue.queueNumber)})</strong><span>สถานะ: ${statusLabel(activeQueue.currentStatus)}</span></a>`;
      } else if (todayAppointment) {
        receiveButtonHtml = `<button class="quick-action" id="receive-patient-btn" type="button"><i data-lucide="user-check"></i><strong>รับผู้ป่วย (เช็กอิน)</strong><span>มีนัดหมายวันนี้ ${escapeHtml(todayAppointment.startTime)}</span></button>`;
      } else {
        receiveButtonHtml = `<button class="quick-action" id="receive-patient-btn" type="button"><i data-lucide="list-plus"></i><strong>รับผู้ป่วย (ออกคิว)</strong><span>Walk-in</span></button>`;
      }
    }

    const quickActions = [
      can("appointments.write") ? `<a class="quick-action" href="#/appointments?patientId=${patient.patientId}"><i data-lucide="calendar-plus"></i><strong>สร้างนัด</strong></a>` : "",
      receiveButtonHtml,
      can("admin") ? `<a class="quick-action" href="#/reports?patientId=${patient.patientId}"><i data-lucide="history"></i><strong>ประวัติรักษา</strong></a>` : "",
      `<button class="quick-action" id="print-patient-summary" type="button"><i data-lucide="printer"></i><strong>พิมพ์สรุป</strong></button>`
    ].join("");

    root.innerHTML = pageHeader("ข้อมูลผู้ป่วย", patient.hn, headerActions) + `<div class="dashboard-grid"><section class="card"><div class="card-header"><h2>ข้อมูลทั่วไป</h2></div><div class="card-body detail-list">${rows.map(([label, value]) => `<div class="detail-row"><span>${label}</span><strong>${escapeHtml(value || "-")}</strong></div>`).join("")}</div></section><section class="card"><div class="card-header"><h2>ทางลัดการดูแล</h2></div><div class="card-body quick-grid">${quickActions}</div></section></div>`;

    const receiveBtn = root.querySelector("#receive-patient-btn");
    if (receiveBtn) {
      let isSubmitting = false;
      receiveBtn.addEventListener("click", async () => {
        if (isSubmitting) return;
        isSubmitting = true;
        receiveBtn.disabled = true;
        try {
          if (todayAppointment) {
            await apiPost(`/appointments/${todayAppointment.appointmentId}/check-in`, { patientId: patient.patientId });
            toast("เช็กอินและออกคิวเรียบร้อย");
          } else {
            await apiPost("/queues", { patientId: patient.patientId, appointmentId: null, source: "walk_in" });
            toast("ออกคิวเรียบร้อย");
          }
          location.hash = "#/queue";
        } catch (error) {
          toast(error.message || "ไม่สามารถออกคิวได้", "error");
          receiveBtn.disabled = false;
        } finally {
          isSubmitting = false;
        }
      });
    }

    root.querySelector("#print-patient-summary")?.addEventListener("click", async () => {
      try {
        await apiPost("/audit-events", { action: "print", module: "patients", recordId: patient.patientId, description: "พิมพ์สรุปข้อมูลผู้ป่วย" });
        window.print();
      } catch (error) {
        toast(error.message || "ไม่สามารถบันทึก Audit ก่อนพิมพ์ได้", "error");
      }
    });
  } catch (error) {
    root.innerHTML = pageHeader("ข้อมูลผู้ป่วย") + errorState(error.message);
  }
  wireCommonActions(root, refresh);
}
