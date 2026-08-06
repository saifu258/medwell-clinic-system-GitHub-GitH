import { apiGet, apiPost } from "../api.js";
import { escapeHtml, formatDate } from "../formatters.js";
import { badge, pageHeader, loadingState, errorState, table, field, wireCommonActions } from "../components/ui.js";
import { formToObject } from "../validators.js";
import { setButtonLoading, toast } from "../notifications.js";
import { can } from "../permissions.js";

let pageController = null;
let pendingCreate = null;

export function cleanup() {
  pageController?.abort();
  pageController = null;
}

const appointmentPayload = (form) => {
  const value = formToObject(form);
  return {
    patientId: value.patientId,
    appointmentDate: value.appointmentDate,
    startTime: value.startTime,
    endTime: value.endTime,
    doctorUid: value.doctorUid?.trim() || null,
    appointmentType: value.appointmentType,
    reason: value.reason?.trim() || ""
  };
};

export async function render(root) {
  cleanup();
  const controller = new AbortController();
  pageController = controller;
  const refresh = () => render(root);
  root.innerHTML = pageHeader("นัดหมาย", "ตารางนัดหมายของคลินิก") + loadingState();

  try {
    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
    const canCheckIn = can("queues.write");
    const canCreate = can("appointments.write");
    const [appointments, patients] = await Promise.all([
      apiGet("/appointments", { signal: controller.signal }),
      apiGet("/patients?limit=100", { signal: controller.signal })
    ]);
    if (controller.signal.aborted) return;

    const renderAction = (appointment) => {
      if (!canCheckIn) return "-";
      if (["scheduled", "confirmed"].includes(appointment.status)) {
        if (appointment.appointmentDate === todayStr) {
          return `<button class="btn btn-primary btn-sm" type="button" data-checkin-appointment="${appointment.appointmentId}" data-patient-id="${appointment.patientId}"><i data-lucide="user-check"></i> เช็กอิน</button>`;
        }
        return `<span class="subtle">รอถึงวันนัด</span>`;
      }
      if (appointment.status === "checked_in") {
        return `<a class="btn btn-secondary btn-sm" href="#/queue"><i data-lucide="list-ordered"></i> ดูคิว</a>`;
      }
      return "-";
    };

    const headerButton = canCreate ? `<button class="btn btn-primary" id="show-form" type="button"><i data-lucide="calendar-plus"></i> สร้างนัด</button>` : "";

    root.innerHTML = pageHeader("นัดหมาย", "ตารางนัดหมายของคลินิก", headerButton) +
      (canCreate ? `<section class="card" id="appointment-form-card" hidden><div class="card-header"><h2>สร้างนัดหมาย</h2></div><form class="card-body form-grid" id="appointment-form">${field({ name: "patientId", label: "ผู้ป่วย", required: true, options: [["", "เลือกผู้ป่วย"], ...(patients.items || []).map((patient) => [patient.patientId, `${patient.hn} · ${patient.firstName} ${patient.lastName}`])] })}${field({ name: "appointmentDate", label: "วันที่นัด", type: "date", required: true })}${field({ name: "startTime", label: "เวลาเริ่ม", type: "time", required: true })}${field({ name: "endTime", label: "เวลาสิ้นสุด", type: "time", required: true })}${field({ name: "doctorUid", label: "แพทย์/UID (ไม่บังคับ)" })}${field({ name: "appointmentType", label: "ประเภทนัด", options: [["follow_up", "ติดตามอาการ"], ["general", "ตรวจทั่วไป"], ["procedure", "หัตถการ"]] })}${field({ name: "reason", label: "เหตุผลการนัด", type: "textarea", span: "span-2" })}<div class="span-2 text-right"><button class="btn btn-primary" type="submit">บันทึกนัดหมาย</button></div></form></section>` : "") +
      `<section class="card mt-3">${table(["เลขนัด", "ผู้ป่วย", "วันที่", "เวลา", "ประเภท", "สถานะ", "จัดการ"], appointments, (appointment) => [escapeHtml(appointment.appointmentNumber), escapeHtml(appointment.patientName || appointment.patientId), formatDate(appointment.appointmentDate), `${escapeHtml(appointment.startTime)}–${escapeHtml(appointment.endTime || "-")}`, escapeHtml(appointment.appointmentType || "ทั่วไป"), badge(appointment.status), renderAction(appointment)], "ยังไม่มีนัดหมาย")}</section>`;

    root.querySelectorAll("[data-checkin-appointment]").forEach((button) => button.addEventListener("click", async () => {
      if (button.disabled) return;
      button.disabled = true;
      setButtonLoading(button, true, "กำลังเช็กอิน…");
      try {
        await apiPost(`/appointments/${button.dataset.checkinAppointment}/check-in`, { patientId: button.dataset.patientId });
        toast("เช็กอินและออกคิวสำเร็จ");
        await render(root);
      } catch (error) {
        toast(error.message || "ไม่สามารถเช็กอินได้", "error");
        if (button.isConnected) setButtonLoading(button, false);
      }
    }));

    const showFormButton = root.querySelector("#show-form");
    const formCard = root.querySelector("#appointment-form-card");
    const form = root.querySelector("#appointment-form");
    let submissionInFlight = false;

    if (showFormButton && formCard) {
      showFormButton.addEventListener("click", () => {
        formCard.hidden = false;
        formCard.scrollIntoView({ behavior: "smooth" });
      });
    }

    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (submissionInFlight) return;
        submissionInFlight = true;
        const button = form.querySelector("button[type=submit]");
        const payload = appointmentPayload(form);
        const signature = JSON.stringify(payload);
        if (!pendingCreate || pendingCreate.signature !== signature) pendingCreate = { signature, key: crypto.randomUUID() };
        setButtonLoading(button, true, "กำลังบันทึก…");
        try {
          await apiPost("/appointments", payload, { idempotencyKey: pendingCreate.key, signal: controller.signal });
          pendingCreate = null;
          form.reset();
          toast("สร้างนัดหมายแล้ว");
          await render(root);
        } catch (error) {
          if (error.message !== "ยกเลิกคำขอแล้ว") {
            if (new URLSearchParams(location.search).has("debugAuth")) console.warn("Appointment creation rejected", { code: error.code, status: error.status, requestId: error.requestId });
            toast(error.message, "error");
          }
        } finally {
          submissionInFlight = false;
          if (button.isConnected) setButtonLoading(button, false);
        }
      });
    }
  } catch (error) {
    if (!controller.signal.aborted) root.innerHTML = pageHeader("นัดหมาย") + errorState(error.message);
  }
  wireCommonActions(root, refresh);
}
