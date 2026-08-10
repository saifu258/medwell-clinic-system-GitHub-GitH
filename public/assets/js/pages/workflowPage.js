import { apiGet, apiPost, apiPut } from "../api.js";
import { pageHeader, errorState, wireCommonActions, field } from "../components/ui.js";
import { toast, setButtonLoading } from "../notifications.js";
import { formToObject } from "../validators.js";

const STAGES = [
  { id: "registration", label: "ลงทะเบียน (Registration)" },
  { id: "screening", label: "คัดกรอง (Screening)" },
  { id: "history_physical", label: "ประวัติและตรวจร่างกาย (History & Physical)" },
  { id: "treatment_program", label: "โปรแกรมการรักษา (Treatment Program)" },
  { id: "next_appointment", label: "นัดหมายครั้งถัดไป (Next Appointment)" },
  { id: "summary_billing", label: "สรุปและชำระเงิน (Summary & Billing)" },
  { id: "completed", label: "เสร็จสิ้น (Completed)" }
];

export async function render(root, params) {
  const visitId = params.id;
  if (!visitId) {
    root.innerHTML = pageHeader("Workflow", "ไม่พบข้อมูล Visit") + errorState("รหัส Visit ไม่ถูกต้อง");
    return;
  }

  const refresh = () => render(root, params);

  try {
    // Load visit and workflow state
    const [visit, workflow] = await Promise.all([
      apiGet(`/visits/${visitId}`).catch(() => null),
      apiGet(`/visits/${visitId}/workflow`).catch(() => null)
    ]);

    if (!visit || !workflow) {
      throw new Error("ไม่สามารถโหลดข้อมูลการเข้ารับบริการได้");
    }

    const currentStage = workflow.workflowStage || "registration";
    const currentIndex = STAGES.findIndex(s => s.id === currentStage);
    const nextStage = currentIndex < STAGES.length - 1 ? STAGES[currentIndex + 1].id : null;

    let html = pageHeader(`สถานะการเข้ารับบริการ: ${visit.vn}`, `ผู้ป่วย: ${visit.patientId}`);
    html += `<section class="card mb-3"><div class="card-body">
      <div style="display: flex; justify-content: space-between; overflow-x: auto; padding: 10px 0;">`;

    STAGES.forEach((stage, idx) => {
      const isPast = idx < currentIndex || currentStage === 'completed';
      const isCurrent = idx === currentIndex && currentStage !== 'completed';
      const color = isPast ? 'var(--primary)' : isCurrent ? 'var(--warning)' : 'var(--text-light)';
      const weight = isCurrent ? 'bold' : 'normal';
      html += `<div style="text-align: center; min-width: 120px; color: ${color}; font-weight: ${weight};">
        <div style="font-size: 24px; margin-bottom: 5px;">${isPast ? '✓' : isCurrent ? '●' : '○'}</div>
        <div style="font-size: 12px;">${stage.label}</div>
      </div>`;
      if (idx < STAGES.length - 1) {
        html += `<div style="flex-grow: 1; height: 2px; background: ${isPast ? 'var(--primary)' : 'var(--border)'}; margin-top: 15px;"></div>`;
      }
    });

    html += `</div></div></section>`;

    if (visit.visitStatus === 'cancelled') {
      html += errorState("การเข้ารับบริการนี้ถูกยกเลิกแล้ว");
      root.innerHTML = html;
      return;
    }

    // Action Area based on Current Stage
    html += `<section class="card mb-3"><div class="card-header"><h2>ดำเนินการ: ${STAGES.find(s => s.id === currentStage)?.label}</h2></div><div class="card-body">`;

    if (currentStage === "registration") {
      html += `<p>ผู้ป่วยได้รับการลงทะเบียนแล้ว</p>`;
    } else if (currentStage === "screening") {
      html += `<form id="workflow-form">
        <div class="form-grid">
          ${field({ name: "chiefComplaint", label: "อาการสำคัญ (บังคับ)", type: "textarea", required: true, value: visit.chiefComplaint || "" })}
        </div>
        <button type="submit" class="btn btn-secondary mt-3">บันทึกข้อมูลคัดกรอง</button>
      </form>`;
    } else if (currentStage === "history_physical") {
      html += `<form id="workflow-form">
        <div class="form-grid">
          ${field({ name: "presentIllness", label: "ประวัติปัจจุบัน (บังคับอย่างน้อยหนึ่งอย่าง)", type: "textarea", value: visit.presentIllness || "" })}
          ${field({ name: "physicalExamination", label: "ตรวจร่างกาย (บังคับอย่างน้อยหนึ่งอย่าง)", type: "textarea", value: visit.physicalExamination || "" })}
        </div>
        <button type="submit" class="btn btn-secondary mt-3">บันทึกประวัติและตรวจร่างกาย</button>
      </form>`;
    } else if (currentStage === "treatment_program") {
      html += `<form id="workflow-form">
        <div class="form-grid">
          ${field({ name: "treatmentPlan", label: "แผนการรักษา (บังคับ)", type: "textarea", required: true, value: visit.treatmentPlan || "" })}
        </div>
        <button type="submit" class="btn btn-secondary mt-3">บันทึกแผนการรักษา</button>
      </form>`;
    } else if (currentStage === "next_appointment") {
      html += `<form id="workflow-form">
        <div class="form-grid">
          ${field({ name: "nextAppointmentDecision", label: "นัดหมายครั้งถัดไป (บังคับ)", type: "select", required: true, value: workflow.nextAppointmentDecision || "", options: [["", "เลือกการดำเนินการ"], ["not_required", "ไม่ต้องนัดติดตาม"], ["appointment_created", "สร้างนัดหมายแล้ว"]] })}
        </div>
        <p class="text-sm text-light mt-2">หากต้องการสร้างนัดหมาย กรุณาไปที่หน้านัดหมายแล้วกลับมาระบุที่นี่</p>
        <button type="submit" class="btn btn-secondary mt-3">บันทึกการนัดหมาย</button>
      </form>`;
    } else if (currentStage === "summary_billing") {
      html += `<form id="workflow-form">
        <div class="form-grid">
          ${field({ name: "visitSummary", label: "สรุปผลการเข้ารับบริการ (บังคับ)", type: "textarea", required: true, value: visit.visitSummary || "" })}
        </div>
        <p class="text-sm mt-2">กรุณาตรวจสอบยอดค้างชำระในระบบการเงิน หากยอดค้างชำระเป็น 0 จะสามารถดำเนินการเสร็จสิ้นได้</p>
        <button type="submit" class="btn btn-secondary mt-3">บันทึกสรุปผล</button>
      </form>`;
    } else if (currentStage === "completed") {
      html += `<p class="text-success">การเข้ารับบริการเสร็จสิ้นสมบูรณ์</p>`;
    }

    if (nextStage && currentStage !== 'completed') {
      const nextLabel = STAGES.find(s => s.id === nextStage).label;
      html += `<div class="mt-4 pt-3" style="border-top: 1px solid var(--border)">
        <button id="btn-next-stage" class="btn btn-primary">ข้ามไปยัง: ${nextLabel}</button>
        <p id="transition-error" class="text-danger mt-2" style="display:none;"></p>
      </div>`;
    }

    html += `</div></section>`;
    root.innerHTML = html;

    // Event Listeners for Forms
    const form = root.querySelector("#workflow-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("button[type=submit]");
        setButtonLoading(btn, true);
        try {
          const body = formToObject(form);
          if (currentStage === "next_appointment") {
            await apiPost(`/visits/${visitId}/workflow/next-appointment`, { decision: body.nextAppointmentDecision });
          } else if (currentStage === "history_physical") {
            await apiPost(`/visits/${visitId}/workflow/history-physical`, { presentIllness: body.presentIllness, physicalExamination: body.physicalExamination });
          } else if (currentStage === "summary_billing") {
            await apiPost(`/visits/${visitId}/workflow/summary`, { visitSummary: body.visitSummary });
          } else {
            await apiPut(`/visits/${visitId}`, body);
          }
          toast("บันทึกข้อมูลสำเร็จ");
          refresh();
        } catch (err) {
          toast(err.message, "error");
        } finally {
          setButtonLoading(btn, false);
        }
      });
    }

    // Event Listener for Transition
    const btnNext = root.querySelector("#btn-next-stage");
    if (btnNext) {
      btnNext.addEventListener("click", async () => {
        setButtonLoading(btnNext, true);
        const errEl = root.querySelector("#transition-error");
        errEl.style.display = 'none';
        try {
          await apiPost(`/visits/${visitId}/workflow/transition`, {
            expectedCurrentStage: currentStage,
            targetStage: nextStage
          });
          toast("เปลี่ยนสถานะสำเร็จ");
          refresh();
        } catch (err) {
          errEl.textContent = err.message;
          errEl.style.display = 'block';
        } finally {
          setButtonLoading(btnNext, false);
        }
      });
    }

  } catch (error) {
    root.innerHTML = pageHeader("Workflow") + errorState(error.message);
  }

  wireCommonActions(root, refresh);
}
