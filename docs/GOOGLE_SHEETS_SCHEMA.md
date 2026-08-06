# Google Sheets Schema

ฐานข้อมูลมี 21 ชีต ใช้แถวแรกเป็น Header และใช้ UUID/UID เป็น Primary Key เสมอ ห้ามใช้เลขแถวเป็น ID รายละเอียดที่เป็น Array เก็บด้วย `JSON.stringify()` และ Backend จะ parse แบบมี fallback.

| Sheet | Primary key | Columns |
|---|---|---|
| Settings | key | key, value, description, updatedAt, updatedBy |
| Users | uid | uid, email, displayName, rolesJson, permissionsJson, active, phone, lastLoginAt, createdAt, updatedAt |
| Patients | patientId | patientId, hn, title, firstName, lastName, nickname, citizenId, passportNo, gender, dateOfBirth, bloodType, nationality, religion, maritalStatus, occupation, phone, email, address, province, postalCode, emergencyName, emergencyRelation, emergencyPhone, drugAllergies, chronicDiseases, notes, consentStatus, consentDate, active, createdAt, createdBy, updatedAt, updatedBy |
| Appointments | appointmentId | appointmentId, appointmentNumber, patientId, patientName, appointmentDate, startTime, endTime, doctorUid, appointmentType, reason, notes, channel, status, priority, cancellationReason, createdAt, createdBy, updatedAt, updatedBy |
| Queues | queueId | queueId, queueNumber, patientId, patientName, appointmentId, queueDate, checkInTime, priority, currentStatus, currentStation, calledTime, callCount, completedTime, notes, cancellationReason, createdAt, createdBy, updatedAt, updatedBy |
| Screenings | screeningId | screeningId, visitId, queueId, patientId, weight, height, bmi, temperature, pulse, respiratoryRate, systolic, diastolic, spO2, painScore, chiefComplaint, initialHistory, drugAllergies, pregnancy, nurseNotes, alertsJson, createdAt, createdBy, updatedAt, updatedBy |
| Visits | visitId | visitId, vn, patientId, queueId, appointmentId, visitDate, doctorUid, chiefComplaint, presentIllness, pastHistory, familyHistory, socialHistory, physicalExamination, assessment, diagnosis, diagnosisCode, treatmentPlan, doctorNote, followUpDate, visitStatus, closedAt, closedBy, cancellationReason, createdAt, createdBy, updatedAt, updatedBy |
| VisitAddendums | addendumId | addendumId, visitId, note, reason, createdAt, createdBy |
| Diagnoses | diagnosisId | diagnosisId, visitId, diagnosisName, diagnosisCode, diagnosisType, isPrimary, notes, createdAt, createdBy, updatedAt, updatedBy |
| DiagnosisMaster | diagnosisMasterId | diagnosisMasterId, diagnosisCode, diagnosisName, active, notes, createdAt, createdBy, updatedAt, updatedBy |
| Prescriptions | prescriptionId | prescriptionId, visitId, patientId, queueId, doctorUid, prescriptionDate, status, notes, dispensedAt, dispensedBy, createdAt, createdBy, updatedAt, updatedBy |
| PrescriptionItems | itemId | itemId, prescriptionId, medicineId, medicineNameSnapshot, strength, dosage, frequency, route, duration, quantity, unit, instructions, mealTiming, specialWarning, dispensedQuantity, dispensedLot, status, createdAt, createdBy, updatedAt, updatedBy |
| Medicines | medicineId | medicineId, medicineCode, genericName, tradeName, strength, dosageForm, unit, purchaseUnit, conversionRate, minimumStock, quantityRemaining, sellingPrice, cost, active, notes, createdAt, createdBy, updatedAt, updatedBy |
| StockLots | lotId | lotId, medicineId, lotNumber, receivedDate, expiryDate, quantityReceived, quantityRemaining, unitCost, supplier, referenceDocument, status, createdAt, createdBy, updatedAt, updatedBy |
| StockMovements | movementId | movementId, medicineId, lotId, type, quantity, balanceBefore, balanceAfter, unitCost, referenceType, referenceId, reason, createdBy, createdAt |
| Services | serviceId | serviceId, serviceCode, serviceName, category, standardPrice, cost, active, notes, createdAt, createdBy, updatedAt, updatedBy |
| Invoices | invoiceId | invoiceId, invoiceNumber, visitId, patientId, invoiceDate, subtotal, discount, tax, grandTotal, paidAmount, balance, status, notes, voidReason, voidedAt, voidedBy, createdBy, createdAt, updatedAt, updatedBy |
| InvoiceItems | invoiceItemId | invoiceItemId, invoiceId, itemType, referenceId, itemCode, itemName, quantity, unitPrice, discount, total, createdAt, createdBy |
| Payments | paymentId | paymentId, invoiceId, paymentDate, amount, paymentMethod, referenceNumber, receivedBy, notes, idempotencyKey, createdAt, createdBy |
| AuditLogs | logId | logId, timestamp, userUid, userName, role, action, module, recordType, recordId, description, ipAddress, userAgent, success, errorCode |
| Counters | counterKey | counterKey, dateKey, lastValue, updatedAt |

ไฟล์ `functions/src/config/schema.js` เป็น source of truth และคำสั่ง `npm run setup:sheets` จะสร้างชีตที่ขาดพร้อม Header.
