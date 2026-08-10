import { t, setLocale } from "../i18n/index.js";
import { escapeHtml, formatDate } from "../formatters.js";

function maskIdentifier(id) {
  if (!id) return "-";
  // Keep first and last digit, mask the rest. Example for 13 digits: 1-XXXX-XXXXX-XX-3
  // But a simpler approach requested: X-XXXX-XXXXX-12-3
  if (id.length === 13) {
    return `X-XXXX-XXXXX-${id.slice(10, 12)}-${id.slice(12)}`;
  }
  return `XXXXXX${id.slice(-4)}`;
}

export function renderMedicalCertificate(cert, printPolicy = "masked") {
  // Determine language for the template
  const originalLocale = localStorage.getItem("medwell_locale");
  setLocale(cert.language || "th");

  const clinicName = escapeHtml(cert.clinic_name_snapshot || t("document.clinicName"));
  const clinicAddress = escapeHtml(cert.clinic_address_snapshot || t("document.clinicAddress"));
  const clinicPhone = escapeHtml(cert.clinic_phone_snapshot || "");

  const certNumber = cert.certificate_number ? escapeHtml(cert.certificate_number) : `<span class="text-muted">${t("document.statusDraft")}</span>`;

  const identifierDisplay = printPolicy === "full"
    ? escapeHtml(cert.patient_identifier_snapshot)
    : maskIdentifier(cert.patient_identifier_snapshot);

  let html = `
    <div class="print-document medical-certificate">
      <div class="print-header">
        <div class="clinic-info">
          <h2>${clinicName}</h2>
          <p>${clinicAddress}</p>
          ${clinicPhone ? `<p>${t("document.clinicPhone")}: ${clinicPhone}</p>` : ''}
        </div>
        <div class="document-title">
          <h1>${t("document.medicalCertificate")}</h1>
          <p class="document-meta">
            <strong>${t("document.certificateNumber")}:</strong> ${certNumber}
            <br>
            <strong>${t("document.issueDate")}:</strong> ${cert.issued_at ? formatDate(cert.issued_at) : '-'}
          </p>
        </div>
      </div>

      <div class="print-body">
        <div class="patient-info-box">
          <p>
            <strong>${t("document.patientName")}:</strong> ${escapeHtml(cert.patient_name_snapshot)}
          </p>
          <p>
            <strong>${t("document.citizenId")}:</strong> ${identifierDisplay}
          </p>
        </div>

        <div class="clinical-content">
          ${cert.diagnosis_snapshot ? `
            <div class="content-section">
              <h3>${t("document.diagnosis")}</h3>
              <p>${escapeHtml(cert.diagnosis_snapshot)}</p>
            </div>
          ` : ''}

          ${cert.treatment_summary_snapshot ? `
            <div class="content-section">
              <h3>${t("document.treatmentSummary")}</h3>
              <p>${escapeHtml(cert.treatment_summary_snapshot)}</p>
            </div>
          ` : ''}

          <div class="content-section">
            <h3>${t("document.recommendation")}</h3>
            <p>${escapeHtml(cert.recommendation || '-')}</p>
          </div>

          ${(cert.leave_start_date && cert.leave_end_date) ? `
            <div class="content-section leave-section">
              <h3>${t("document.leavePeriod")}</h3>
              <p>
                ${t("document.leaveStartDate")} <strong>${formatDate(cert.leave_start_date)}</strong>
                ${t("document.leaveEndDate")} <strong>${formatDate(cert.leave_end_date)}</strong>
              </p>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="print-footer">
        <div class="signature-box">
          <div class="signature-line"></div>
          <p class="practitioner-name">(${escapeHtml(cert.practitioner_title_snapshot || t("document.clinicalAuthor"))})</p>
          ${cert.practitioner_license_snapshot ? `<p class="license-number">${t("document.licenseNumber")}: ${escapeHtml(cert.practitioner_license_snapshot)}</p>` : ''}
        </div>
      </div>
    </div>
  `;

  // Restore locale
  setLocale(originalLocale || "th");

  return html;
}
