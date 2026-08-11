import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { db } from "./db.ts";
import { verifyFirebaseRequest } from "./auth.ts";
import { getEdgeConfig } from "./environment.ts";
import { dbError, failure, hasPermission, isValidThaiCitizenId, nowIso, nullifyBlankStrings, randomCode, requireAdmin, requirePermission, requireClinicalPractitioner, success, todayBangkok, toSnake, validateAppointmentInput, validateGoogleRoleSelection } from "./helpers.ts";

const { allowedOrigins } = getEdgeConfig();
const cors = (origin: string) => ({ ...(origin ? { "access-control-allow-origin": origin } : {}), "access-control-allow-headers": "authorization, content-type, idempotency-key", "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS", vary: "Origin" });
const body = async (request: Request) => request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
const actorFields = (uid: string, creating = false) => ({ ...(creating ? { created_by: uid } : {}), updated_by: uid });
const routePath = (request: Request) => { const pathname = new URL(request.url).pathname; const marker = pathname.indexOf("/api"); return marker >= 0 ? pathname.slice(marker + 4) || "/" : pathname; };
const err = (message: string, status = 400, code = "VALIDATION_ERROR") => Object.assign(new Error(message), { status, code });
const patientFields = new Set(["title", "first_name", "last_name", "nickname", "citizen_id", "passport_no", "gender", "date_of_birth", "blood_type", "nationality", "religion", "occupation", "phone", "email", "address", "province", "postal_code", "emergency_name", "emergency_relation", "emergency_phone", "drug_allergies", "chronic_diseases", "notes", "consent_status", "consent_date"]);
const patientInput = (value: Record<string, unknown>) => nullifyBlankStrings(Object.fromEntries(Object.entries(value).filter(([key]) => patientFields.has(key))));

async function audit(request: Request, profile: any, action: string, module: string, recordId = "", description = "") {
  await db.from("audit_logs").insert({ user_uid: profile.uid, user_name: profile.display_name, roles: profile.roles, action, module, record_id: recordId, description: description.slice(0, 500), user_agent: (request.headers.get("user-agent") || "").slice(0, 300), success: true });
}

async function auditIdentity(request: Request, identity: any, action: string, successValue = true, errorCode = "") {
  await db.from("audit_logs").insert({
    user_uid: identity.uid,
    user_name: identity.name || identity.email,
    roles: [],
    action,
    module: "authentication",
    record_type: "firebase_identity",
    record_id: identity.uid,
    description: "Google authentication event",
    user_agent: (request.headers.get("user-agent") || "").slice(0, 300),
    success: successValue,
    error_code: errorCode || null
  });
}

async function getProfile(uid: string) {
  const { data, error } = await db.from("users").select("*").eq("uid", uid).maybeSingle(); dbError(error);
  if (!data) throw err("ไม่พบบัญชีผู้ใช้ในระบบคลินิก", 403, "PROFILE_NOT_FOUND");
  if (!data.active) throw err("บัญชีถูกระงับการใช้งาน", 403, "ACCOUNT_DISABLED");
  return data;
}

async function listPatients(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") || 1)); const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20))); const search = (url.searchParams.get("search") || "").replace(/[(),.%]/g, "").trim();
  let query = db.from("patients").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
  if (search.length >= 2) query = query.or(`hn.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,citizen_id.ilike.%${search}%,phone.ilike.%${search}%`);
  const { data, error, count } = await query; dbError(error); return { items: data || [], pagination: { page, limit, total: count || 0, pages: Math.max(1, Math.ceil((count || 0) / limit)) } };
}

async function dashboard() {
  const today = todayBangkok();
  const [queues, appointments, invoices, medicines, lots] = await Promise.all([
    db.from("queues").select("*,patients(first_name,last_name)").eq("queue_date", today).order("check_in_time"), db.from("appointments").select("*").eq("appointment_date", today).order("start_time"),
    db.from("invoices").select("paid_amount,status").eq("invoice_date", today), db.from("medicines").select("*"), db.from("stock_lots").select("*").gt("quantity_remaining", 0)
  ]); [queues.error, appointments.error, invoices.error, medicines.error, lots.error].forEach((error) => dbError(error));
  const q = queues.data || []; const meds = medicines.data || []; const expiryLimit = Date.now() + 90 * 86400000;
  return { patientsToday: q.length, waiting: q.filter((x) => ["waiting", "screening", "waiting_doctor"].includes(x.current_status)).length, consulting: q.filter((x) => x.current_status === "in_consultation").length, completed: q.filter((x) => x.current_status === "completed").length, appointmentsToday: appointments.data?.length || 0, revenueToday: (invoices.data || []).filter((x) => x.status === "paid").reduce((sum, x) => sum + Number(x.paid_amount), 0), queues: q.slice(-8).map((row: any) => ({ ...row, patient_name: `${row.patients?.first_name || ""} ${row.patients?.last_name || ""}`.trim() || row.patient_id })), appointments: (appointments.data || []).slice(0, 6), lowStock: meds.filter((x) => Number(x.quantity_remaining || 0) <= Number(x.minimum_stock || 0)).slice(0, 5), expiring: (lots.data || []).filter((x) => { const time = new Date(x.expiry_date).getTime(); return time > Date.now() && time <= expiryLimit; }).slice(0, 5) };
}

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID();
  const path = routePath(request);
  const origin = request.headers.get("origin") || "";
  if (origin && !allowedOrigins.has(origin)) {
    return failure(Object.assign(new Error("Origin is not allowed"), { status: 403, code: "CORS_ORIGIN_DENIED" }), { vary: "Origin", "x-request-id": requestId });
  }
  const headers = { ...cors(origin), "x-request-id": requestId };
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  try {
    const url = new URL(request.url);
    if (request.method === "GET" && path === "/health") return success({ status: "ok", service: "medwell-supabase-api", database: "postgres", timezone: "Asia/Bangkok" }, "พร้อมให้บริการ", 200, headers);
    const identity = await verifyFirebaseRequest(request); const uid = identity.uid;

    if (request.method === "GET" && path === "/auth/profile") {
      const { data: profile, error: profileError } = await db.from("users").select("*").eq("uid", uid).maybeSingle(); dbError(profileError);
      if (profile) {
        if (!profile.active) { await auditIdentity(request, identity, "google_login_denied", false, "ACCOUNT_DISABLED"); throw err("บัญชีถูกระงับการใช้งาน", 403, "ACCOUNT_DISABLED"); }
        await db.from("users").update({ last_login_at: nowIso() }).eq("uid", uid);
        const isPending = profile.roles?.some((r: string) => ["pending_role_review", "doctor", "pharmacist"].includes(r));
        return success({ state: "ACTIVE_USER", profile: { ...profile, displayName: profile.display_name, pendingRoleReview: isPending }, redirectRoute: isPending ? "#/role-review" : "#/dashboard" }, undefined, 200, headers);
      }
      if (identity.provider !== "google.com") throw err("ไม่พบบัญชีผู้ใช้ในระบบคลินิก", 403, "PROFILE_NOT_FOUND");
      const email = identity.email.trim().toLowerCase();
      const { data: conflicting, error: conflictError } = await db.from("users").select("uid").eq("email", email).maybeSingle(); dbError(conflictError);
      if (conflicting) { await auditIdentity(request, identity, "google_login_denied", false, "EMAIL_ALREADY_REGISTERED"); throw err("อีเมลนี้เชื่อมกับบัญชีอื่นอยู่แล้ว", 403, "ACCESS_DENIED"); }
      const { data: approval, error: approvalError } = await db.from("google_role_approvals").select("approval_id").eq("email", email).eq("active", true).is("used_by", null).maybeSingle(); dbError(approvalError);
      return success({
        state: "NEEDS_ROLE_SELECTION",
        approved: Boolean(approval),
        user: { displayName: identity.name || email.split("@")[0], email, photoURL: identity.picture || null }
      }, undefined, 200, headers);
    }

    if (request.method === "POST" && path === "/auth/select-role") {
      if (identity.provider !== "google.com") { await auditIdentity(request, identity, "role_selection_denied", false, "GOOGLE_PROVIDER_REQUIRED"); throw err("รองรับเฉพาะบัญชี Google ที่ยืนยันแล้ว", 403, "GOOGLE_PROVIDER_REQUIRED"); }
      let role: string;
      try { role = validateGoogleRoleSelection(await body(request)); }
      catch (error) { await auditIdentity(request, identity, "role_selection_denied", false, "ROLE_NOT_ALLOWED"); throw error; }
      const { data, error } = await db.rpc("medwell_claim_google_role", {
        p_uid: uid,
        p_email: identity.email,
        p_display_name: identity.name || "",
        p_photo_url: identity.picture || "",
        p_role: role,
        p_provider: identity.provider
      });
      if (error) {
        const code = ["ROLE_NOT_ALLOWED", "ROLE_APPROVAL_DENIED", "ROLE_ALREADY_SELECTED", "GOOGLE_PROVIDER_REQUIRED"].find((item) => error.message?.includes(item)) || "ROLE_APPROVAL_DENIED";
        await auditIdentity(request, identity, "role_selection_denied", false, code);
        const message = code === "ROLE_ALREADY_SELECTED"
          ? "บัญชีนี้เลือกบทบาทไปแล้ว"
          : code === "ROLE_APPROVAL_DENIED"
            ? "อีเมลนี้ยังไม่ได้รับการอนุมัติบทบาท หรือตำแหน่งที่เลือกไม่ตรงกับที่คลินิกอนุมัติ"
            : "ไม่สามารถกำหนดบทบาทนี้ได้";
        throw err(message, code === "ROLE_ALREADY_SELECTED" ? 409 : 403, code);
      }
      return success({ profile: { ...data, displayName: data.display_name }, redirectRoute: "#/dashboard" }, "กำหนดบทบาทสำเร็จ", 201, headers);
    }

    if (request.method === "POST" && path === "/auth/google-login-audit") {
      if (identity.provider !== "google.com") throw err("ประเภทผู้ให้บริการเข้าสู่ระบบไม่ถูกต้อง", 403, "GOOGLE_PROVIDER_REQUIRED");
      await auditIdentity(request, identity, "google_login");
      return success({ recorded: true }, undefined, 201, headers);
    }

    const profile = await getProfile(identity.uid);
    const isPending = profile.roles?.some((r: string) => ["pending_role_review", "doctor", "pharmacist"].includes(r));

    if (request.method === "GET" && path === "/me") return success({ ...profile, displayName: profile.display_name, pendingRoleReview: isPending }, undefined, 200, headers);

    if (isPending) throw err("บัญชีนี้ต้องได้รับการตรวจสอบบทบาท", 403, "PENDING_ROLE_REVIEW");

    if (request.method === "POST" && path === "/audit-events") { const input: any = await body(request); const allowed = new Set(["login", "logout", "print", "export"]); if (!allowed.has(input.action)) throw err("ประเภท Audit event ไม่ถูกต้อง"); await audit(request, profile, input.action, String(input.module || "application"), String(input.recordId || ""), String(input.description || "")); return success({ recorded: true }, undefined, 201, headers); }
    if (request.method === "GET" && path === "/clinic-info") { const { data, error } = await db.from("clinic_settings").select("key,value").in("key", ["clinicNameTh", "clinicNameEn", "timezone"]); dbError(error); return success(Object.fromEntries((data || []).map((row) => [row.key, row.value])), undefined, 200, headers); }
    if (request.method === "GET" && path === "/dashboard") return success(await dashboard(), undefined, 200, headers);

    if (path === "/locks/acquire" && request.method === "POST") {
      const input: any = await body(request);
      if (!input.resourceType || !input.resourceId || !input.sessionId) throw err("ข้อมูลไม่ครบถ้วน", 400, "VALIDATION_ERROR");

      if (input.resourceType === "visit_clinical_draft") {
        requirePermission(profile, "visits.write");
        const { data: v } = await db.from("visits").select("visit_id").eq("visit_id", input.resourceId).maybeSingle();
        if (!v) throw err("ไม่พบข้อมูล", 404, "NOT_FOUND");
      } else if (input.resourceType === "medical_certificate_draft") {
        requireClinicalPractitioner(profile);
        const { data: m } = await db.from("medical_certificates").select("certificate_id").eq("certificate_id", input.resourceId).maybeSingle();
        if (!m) throw err("ไม่พบข้อมูล", 404, "NOT_FOUND");
      } else {
        throw err("ประเภทข้อมูลไม่ถูกต้อง", 400, "VALIDATION_ERROR");
      }

      const { data, error } = await db.rpc("medwell_acquire_edit_lock", {
        p_resource_type: input.resourceType,
        p_resource_id: input.resourceId,
        p_session_id: input.sessionId,
        p_actor: uid,
        p_role: profile.roles?.[0] || "unknown"
      });
      dbError(error);
      if (!data.success) throw err("ไม่สามารถล็อกข้อมูลได้ อาจถูกแก้ไขโดยผู้อื่นอยู่", 409, "LOCK_CONFLICT");
      await audit(request, profile, "acquire_lock", "concurrency", input.resourceId);
      return success(data, undefined, 200, headers);
    }
    let match = path.match(/^\/locks\/([0-9a-f-]+)\/refresh$/i);
    if (match && request.method === "POST") {
      const input: any = await body(request);
      if (!input.sessionId) throw err("ต้องระบุ Session ID", 400, "VALIDATION_ERROR");
      const { data, error } = await db.rpc("medwell_refresh_edit_lock", { p_lock_id: match[1], p_session_id: input.sessionId });
      dbError(error);
      if (!data.success) throw err("ต่ออายุ Lock ไม่สำเร็จ (อาจหมดอายุไปแล้ว)", 409, data.error);
      return success(data, undefined, 200, headers);
    }
    match = path.match(/^\/locks\/([0-9a-f-]+)\/release$/i);
    if (match && request.method === "POST") {
      const input: any = await body(request);
      if (!input.sessionId) throw err("ต้องระบุ Session ID", 400, "VALIDATION_ERROR");
      const { data, error } = await db.rpc("medwell_release_edit_lock", { p_lock_id: match[1], p_session_id: input.sessionId });
      dbError(error);
      if (!data.success) throw err("ปลด Lock ไม่สำเร็จ", 409, data.error);
      return success(data, undefined, 200, headers);
    }
    match = path.match(/^\/locks\/([0-9a-f-]+)\/force-release$/i);
    if (match && request.method === "POST") {
      requireAdmin(profile);
      const input: any = await body(request);
      if (!input.reason) throw err("ต้องระบุเหตุผล", 400, "VALIDATION_ERROR");
      const { data, error } = await db.rpc("medwell_force_release_edit_lock", { p_lock_id: match[1], p_reason: input.reason, p_admin_uid: uid });
      dbError(error);
      if (!data.success) throw err("ปลด Lock ไม่สำเร็จ", 404, data.error);
      await audit(request, profile, "force_release_lock", "concurrency", match[1], input.reason);
      return success(data, "บังคับปลด Lock สำเร็จ", 200, headers);
    }

    if (request.method === "GET" && path === "/patients") { requirePermission(profile, "patients.read"); return success(await listPatients(url), undefined, 200, headers); }
    if (request.method === "POST" && path === "/patients") { requirePermission(profile, "patients.write"); const raw: any = toSnake(await body(request)); const input: any = patientInput(raw); if (!input.first_name || !input.last_name || !input.phone) throw err("กรุณากรอกชื่อ นามสกุล และโทรศัพท์"); if (!isValidThaiCitizenId(input.citizen_id)) throw err("เลขบัตรประชาชนไม่ถูกต้อง"); const { data, error } = await db.from("patients").insert({ ...input, hn: randomCode("HN"), ...actorFields(uid, true) }).select().single(); dbError(error); await audit(request, profile, "create", "patients", data.patient_id); return success(data, "เพิ่มผู้ป่วยสำเร็จ", 201, headers); }
    match = path.match(/^\/patients\/([0-9a-f-]+)$/i);
    if (match && request.method === "GET") { requirePermission(profile, "patients.read"); const { data, error } = await db.from("patients").select("*").eq("patient_id", match[1]).single(); dbError(error); await audit(request, profile, "view", "patients", match[1]); return success(data, undefined, 200, headers); }
    if (match && request.method === "PUT") { requirePermission(profile, "patients.write"); const raw: any = toSnake(await body(request)); const expected = raw.updated_at; const input: any = patientInput(raw); if (input.citizen_id && !isValidThaiCitizenId(input.citizen_id)) throw err("เลขบัตรประชาชนไม่ถูกต้อง"); const query = db.from("patients").update({ ...input, ...actorFields(uid) }).eq("patient_id", match[1]); if (expected) query.eq("updated_at", expected); const { data, error } = await query.select().maybeSingle(); dbError(error); if (!data) throw err("ข้อมูลถูกแก้ไขโดยผู้ใช้อื่น กรุณารีเฟรช", 409, "CONFLICT"); await audit(request, profile, "update", "patients", match[1]); return success(data, "แก้ไขผู้ป่วยสำเร็จ", 200, headers); }

    if (path === "/appointments" && request.method === "GET") { requirePermission(profile, "appointments.read"); const { data, error } = await db.from("appointments").select("*,patients(hn,first_name,last_name)").order("appointment_date", { ascending: false }).limit(500); dbError(error); return success((data || []).map((row: any) => ({ ...row, patient_name: `${row.patients?.first_name || ""} ${row.patients?.last_name || ""}`.trim() || row.patient_id })), undefined, 200, headers); }
    if (path === "/appointments" && request.method === "POST") {
      requirePermission(profile, "appointments.write");
      const input = validateAppointmentInput(await body(request));
      const idempotencyKey = (request.headers.get("idempotency-key") || "").trim();
      if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) throw err("คำขอสร้างนัดหมายไม่มี Idempotency Key ที่ถูกต้อง", 400, "IDEMPOTENCY_KEY_REQUIRED");
      const { data, error } = await db.rpc("medwell_create_appointment", {
        p_patient_id: input.patientId,
        p_appointment_date: input.appointmentDate,
        p_start_time: input.startTime,
        p_end_time: input.endTime,
        p_doctor_uid: input.doctorUid,
        p_appointment_type: input.appointmentType,
        p_reason: input.reason,
        p_appointment_number: randomCode("AP"),
        p_idempotency_key: idempotencyKey,
        p_actor: uid,
        p_actor_name: profile.display_name,
        p_actor_roles: profile.roles || []
      });
      if (error) {
        const known = ["PATIENT_NOT_FOUND", "DOCTOR_NOT_FOUND", "APPOINTMENT_CONFLICT", "INVALID_APPOINTMENT_TIME", "INVALID_APPOINTMENT_TYPE", "IDEMPOTENCY_KEY_REQUIRED"].find((code) => error.message?.includes(code));
        if (known === "PATIENT_NOT_FOUND") throw err("ไม่พบผู้ป่วยที่ใช้งานได้", 404, known);
        if (known === "DOCTOR_NOT_FOUND") throw err("ไม่พบแพทย์ที่ใช้งานได้", 404, known);
        if (known === "APPOINTMENT_CONFLICT") throw err("ช่วงเวลานี้มีนัดหมายซ้ำ", 409, known);
        if (known === "INVALID_APPOINTMENT_TIME") throw err("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น", 422, known);
        if (known === "INVALID_APPOINTMENT_TYPE") throw err("ประเภทนัดหมายไม่ถูกต้อง", 422, known);
        if (known === "IDEMPOTENCY_KEY_REQUIRED") throw err("คำขอสร้างนัดหมายไม่มี Idempotency Key ที่ถูกต้อง", 400, known);
        dbError(error);
      }
      return success(data, "สร้างนัดหมายสำเร็จ", 201, headers);
    }
    match = path.match(/^\/appointments\/([0-9a-f-]+)$/i);
    if (match && request.method === "PUT") { requirePermission(profile, "appointments.write"); const input: any = toSnake(await body(request)); const { data, error } = await db.from("appointments").update({ ...input, ...actorFields(uid) }).eq("appointment_id", match[1]).select().single(); dbError(error); return success(data, undefined, 200, headers); }
    match = path.match(/^\/appointments\/([0-9a-f-]+)\/check-in$/i);
    if (match && request.method === "POST") {
      requirePermission(profile, "queues.write");
      const reqBody: any = await body(request).catch(() => ({}));
      const { data: appointment, error: appointmentError } = await db.from("appointments").select("*").eq("appointment_id", match[1]).maybeSingle();
      if (appointmentError) dbError(appointmentError);
      if (!appointment) throw err("ไม่พบนัดหมาย", 404, "APPOINTMENT_NOT_FOUND");

      const reqPatientId = reqBody.patientId || reqBody.patient_id;
      if (reqPatientId && reqPatientId !== appointment.patient_id) throw err("ข้อมูลผู้ป่วยไม่ตรงกับนัดหมาย", 400, "PATIENT_MISMATCH");

      const today = todayBangkok();
      if (appointment.appointment_date !== today) throw err("เช็กอินได้เฉพาะวันนัดหมาย", 422, "APPOINTMENT_NOT_ELIGIBLE");

      // Check if an active queue already exists for this appointment or patient today
      const { data: existingQueue } = await db.from("queues").select("*")
        .eq("queue_date", today)
        .or(`appointment_id.eq.${match[1]},patient_id.eq.${appointment.patient_id}`)
        .neq("current_status", "cancelled")
        .maybeSingle();

      if (existingQueue) {
        if (appointment.status !== "checked_in") {
          await db.from("appointments").update({ status: "checked_in", updated_by: uid }).eq("appointment_id", match[1]);
          appointment.status = "checked_in";
        }
        return success({ appointment, queue: existingQueue }, "ผู้ป่วยมีคิวแล้ว", 200, headers);
      }

      if (!["scheduled", "confirmed"].includes(appointment.status)) throw err("สถานะนัดหมายไม่สามารถเช็กอินได้", 422, "APPOINTMENT_NOT_ELIGIBLE");

      const { data: todayQueues } = await db.from("queues").select("queue_number").eq("queue_date", today);
      let maxSeq = 0;
      (todayQueues || []).forEach((q: any) => {
        const num = parseInt(String(q.queue_number || "").replace(/\D/g, ""), 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      });
      const queueNumber = `A${String(maxSeq + 1).padStart(3, "0")}`;

      const { data: queueData, error: insertError } = await db.from("queues").insert({
        queue_date: today,
        queue_number: queueNumber,
        patient_id: appointment.patient_id,
        appointment_id: match[1],
        current_status: "waiting",
        current_station: "reception",
        ...actorFields(uid, true)
      }).select().single();

      if (insertError) {
        // Handle race condition idempotency
        const { data: racedQueue } = await db.from("queues").select("*")
          .eq("queue_date", today)
          .or(`appointment_id.eq.${match[1]},patient_id.eq.${appointment.patient_id}`)
          .neq("current_status", "cancelled")
          .maybeSingle();
        if (racedQueue) {
          await db.from("appointments").update({ status: "checked_in", updated_by: uid }).eq("appointment_id", match[1]);
          appointment.status = "checked_in";
          return success({ appointment, queue: racedQueue }, "ผู้ป่วยมีคิวแล้ว", 200, headers);
        }
        dbError(insertError);
      }

      const { data: updatedAppointment } = await db.from("appointments").update({ status: "checked_in", updated_by: uid }).eq("appointment_id", match[1]).select().single();
      await audit(request, profile, "check_in", "queues", queueData.queue_id);
      return success({ appointment: updatedAppointment || { ...appointment, status: "checked_in" }, queue: queueData }, "เช็กอินและออกคิวสำเร็จ", 201, headers);
    }
    match = path.match(/^\/appointments\/([0-9a-f-]+)\/cancel$/i);
    if (match && request.method === "POST") { requirePermission(profile, "appointments.write"); const input: any = await body(request); if (!input.reason) throw err("กรุณาระบุเหตุผล"); const { data, error } = await db.from("appointments").update({ status: "cancelled", cancellation_reason: input.reason, updated_by: uid }).eq("appointment_id", match[1]).select().single(); dbError(error); return success(data, undefined, 200, headers); }

    if (path === "/queues/today" && request.method === "GET") { requirePermission(profile, "queues.read"); const { data, error } = await db.from("queues").select("*,patients(hn,first_name,last_name)").eq("queue_date", todayBangkok()).order("check_in_time"); dbError(error); return success(data, undefined, 200, headers); }
    if (path === "/queues" && request.method === "POST") {
      requirePermission(profile, "queues.write");
      const input: any = toSnake(await body(request));
      const patientId = input.patient_id;
      if (!patientId) throw err("กรุณาระบุผู้ป่วย", 400, "VALIDATION_ERROR");

      const today = todayBangkok();
      const { data: existingQueue } = await db.from("queues").select("*")
        .eq("queue_date", today)
        .eq("patient_id", patientId)
        .neq("current_status", "cancelled")
        .maybeSingle();

      if (existingQueue) {
        return success({ queue: existingQueue }, "ผู้ป่วยมีคิวแล้ว", 200, headers);
      }

      const { data: todayQueues } = await db.from("queues").select("queue_number").eq("queue_date", today);
      let maxSeq = 0;
      (todayQueues || []).forEach((q: any) => {
        const num = parseInt(String(q.queue_number || "").replace(/\D/g, ""), 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      });
      const queueNumber = `A${String(maxSeq + 1).padStart(3, "0")}`;

      const { data, error } = await db.from("queues").insert({
        ...input,
        queue_date: today,
        queue_number: queueNumber,
        current_status: "waiting",
        current_station: "reception",
        ...actorFields(uid, true)
      }).select().single();
      if (error) {
        const { data: racedQueue } = await db.from("queues").select("*")
          .eq("queue_date", today)
          .eq("patient_id", patientId)
          .neq("current_status", "cancelled")
          .maybeSingle();
        if (racedQueue) return success({ queue: racedQueue }, "ผู้ป่วยมีคิวแล้ว", 200, headers);
        dbError(error);
      }
      return success({ queue: data }, "ออกคิวสำเร็จ", 201, headers);
    }
    match = path.match(/^\/queues\/([0-9a-f-]+)\/status$/i);
    if (match && request.method === "PUT") { requirePermission(profile, "queues.write"); const input: any = await body(request); const allowedStatuses = new Set(["waiting", "screening", "waiting_doctor", "in_consultation", "waiting_pharmacy", "waiting_payment", "completed", "cancelled"]); if (!allowedStatuses.has(input.status)) throw err("สถานะคิวไม่ถูกต้อง"); if (input.status === "cancelled" && !String(input.reason || "").trim()) throw err("กรุณาระบุเหตุผลการยกเลิกคิว"); const { data: current, error: currentError } = await db.from("queues").select("current_status").eq("queue_id", match[1]).single(); dbError(currentError); if (["completed", "cancelled"].includes(current?.current_status || "")) throw err("คิวสิ้นสุดแล้ว ไม่สามารถเปลี่ยนสถานะได้", 422, "BUSINESS_RULE_ERROR"); const { data, error } = await db.from("queues").update({ current_status: input.status, cancellation_reason: input.status === "cancelled" ? String(input.reason).trim() : null, completed_time: input.status === "completed" ? nowIso() : null, updated_by: uid }).eq("queue_id", match[1]).select().single(); dbError(error); await audit(request, profile, input.status === "cancelled" ? "cancel" : "update", "queues", match[1], input.reason || input.status); return success(data, undefined, 200, headers); }
    match = path.match(/^\/queues\/([0-9a-f-]+)\/call$/i);
    if (match && request.method === "POST") { requirePermission(profile, "queues.write"); const { data: queue, error: getError } = await db.from("queues").select("call_count").eq("queue_id", match[1]).single(); dbError(getError); const { data, error } = await db.from("queues").update({ called_time: nowIso(), call_count: Number(queue?.call_count || 0) + 1, updated_by: uid }).eq("queue_id", match[1]).select().single(); dbError(error); return success(data, "เรียกคิวแล้ว", 200, headers); }

    if (path === "/screenings" && request.method === "POST") { requirePermission(profile, "screenings.write"); const input: any = toSnake(await body(request)); const numericRanges: Record<string, [number, number]> = { weight: [0.1, 500], height: [20, 250], temperature: [30, 45], pulse: [20, 250], respiratory_rate: [5, 80], systolic: [40, 300], diastolic: [20, 200], spo2: [1, 100], pain_score: [0, 10] }; for (const [field, [min, max]] of Object.entries(numericRanges)) { if (input[field] !== undefined && input[field] !== "") { const value = Number(input[field]); if (!Number.isFinite(value) || value < min || value > max) throw err(`ค่า ${field} ต้องอยู่ระหว่าง ${min}–${max}`); input[field] = value; } } const height = Number(input.height) / 100; const alerts: string[] = []; if (Number(input.systolic) >= 180 || Number(input.diastolic) >= 120) alerts.push("ความดันสูงมาก"); if (Number(input.temperature) >= 38) alerts.push("มีไข้"); if (Number(input.spo2) > 0 && Number(input.spo2) < 95) alerts.push("SpO2 ต่ำ"); const bmi = height > 0 ? Number(input.weight) / (height * height) : null; const { data, error } = await db.rpc("medwell_create_screening", { p_data: input, p_bmi: bmi, p_alerts: alerts, p_actor: uid }); dbError(error); await audit(request, profile, "create", "screenings", data.screening_id); return success(data, "บันทึกคัดกรองสำเร็จ", 201, headers); }
    match = path.match(/^\/screenings\/([0-9a-f-]+)$/i);
    if (match && request.method === "GET") { requirePermission(profile, "screenings.read"); const { data, error } = await db.from("screenings").select("*").eq("queue_id", match[1]).order("created_at", { ascending: false }); dbError(error); return success(data, undefined, 200, headers); }

    if (path === "/visits" && request.method === "POST") { requirePermission(profile, "visits.write"); const input: any = toSnake(await body(request)); const { data, error } = await db.rpc("medwell_open_visit", { p_data: input, p_vn: randomCode("VN"), p_visit_date: todayBangkok(), p_actor: uid }); dbError(error); await audit(request, profile, "create", "visits", data.visit_id); return success(data, "เปิด Visit สำเร็จ", 201, headers); }
    match = path.match(/^\/visits\/([0-9a-f-]+)$/i);
    if (match && request.method === "GET") { requirePermission(profile, "records.read"); const { data, error } = await db.from("visits").select("*,diagnoses(*),visit_addendums(*)").eq("visit_id", match[1]).single(); dbError(error); await audit(request, profile, "view", "medical_records", match[1]); return success(data, undefined, 200, headers); }
    if (match && request.method === "PUT") { requirePermission(profile, "visits.write"); const raw: any = toSnake(await body(request)); const expectedVersion = raw.expected_version; const input = { ...raw }; delete input.expected_version; const protectedFields = ["workflow_stage", "workflow_status", "stage_started_at", "stage_completed_at", "completed_at", "completed_by", "visit_status", "closed_at", "closed_by", "updated_by", "created_by", "created_at", "updated_at", "next_appointment_decision", "next_appointment_id", "next_appointment_recorded_by", "next_appointment_recorded_at", "hp_recorded_by", "hp_recorded_at", "visit_summary_recorded_by", "visit_summary_recorded_at"]; const hasProtected = Object.keys(input).some(k => protectedFields.includes(k)); if (hasProtected) throw err("ไม่อนุญาตให้แก้ไขข้อมูลการควบคุม Workflow ผ่าน API นี้", 400, "VALIDATION_ERROR"); const { data: existing } = await db.from("visits").select("visit_status").eq("visit_id", match[1]).single(); if (existing?.visit_status === "completed") throw err("Visit ปิดแล้ว กรุณาเพิ่ม Addendum", 422, "BUSINESS_RULE_ERROR"); const query = db.from("visits").update({ ...input, updated_by: uid }).eq("visit_id", match[1]); if (expectedVersion) query.eq("version", expectedVersion); const { data, error } = await query.select().maybeSingle(); dbError(error); if (!data) throw err("ข้อมูลถูกแก้ไขโดยผู้ใช้อื่น (Version Conflict)", 409, "RECORD_VERSION_CONFLICT"); return success(data, undefined, 200, headers); }
    match = path.match(/^\/visits\/([0-9a-f-]+)\/complete$/i);
    if (match && request.method === "POST") { requirePermission(profile, "visits.write"); const { data: visit } = await db.from("visits").select("visit_status, workflow_stage, queue_id").eq("visit_id", match[1]).single(); if (!visit) throw err("ไม่พบ Visit", 404, "NOT_FOUND"); if (visit.workflow_stage !== null) throw err("Visit นี้อยู่ในระบบ Workflow ใหม่ ต้องปิดผ่าน Workflow Transition เท่านั้น", 409, "WORKFLOW_COMPLETION_REQUIRED"); if (visit.visit_status === "completed") throw err("Visit ปิดแล้ว", 422, "BUSINESS_RULE_ERROR"); const { data, error } = await db.from("visits").update({ visit_status: "completed", closed_at: nowIso(), closed_by: uid, updated_by: uid }).eq("visit_id", match[1]).select().single(); dbError(error); const { count } = await db.from("prescriptions").select("prescription_id", { count: "exact", head: true }).eq("visit_id", match[1]).neq("status", "cancelled"); await db.from("queues").update({ current_status: count ? "waiting_pharmacy" : "waiting_payment", updated_by: uid }).eq("queue_id", data.queue_id); await audit(request, profile, "complete", "visits", match[1]); return success(data, "ปิด Visit สำเร็จ", 200, headers); }
    match = path.match(/^\/visits\/([0-9a-f-]+)\/addendum$/i);
    if (match && request.method === "POST") { requirePermission(profile, "visits.write"); const input: any = await body(request); if (!input.note || !input.reason) throw err("กรุณาระบุเหตุผลและข้อความ"); const { data, error } = await db.from("visit_addendums").insert({ visit_id: match[1], note: input.note, reason: input.reason, created_by: uid }).select().single(); dbError(error); return success(data, "เพิ่ม Addendum สำเร็จ", 201, headers); }
    match = path.match(/^\/visits\/([0-9a-f-]+)\/workflow$/i);
    if (match && request.method === "GET") { requirePermission(profile, "records.read"); const { data, error } = await db.from("visits").select("workflow_stage, stage_started_at, stage_completed_at, next_appointment_decision, next_appointment_id").eq("visit_id", match[1]).single(); dbError(error); return success(data, undefined, 200, headers); }
    match = path.match(/^\/visits\/([0-9a-f-]+)\/workflow\/next-appointment$/i);
    if (match && request.method === "POST") {
      requirePermission(profile, "visits.write");
      const input: any = await body(request);
      if (!input.decision || (input.decision !== "appointment_created" && input.decision !== "not_required")) throw err("การตัดสินใจไม่ถูกต้อง", 400, "VALIDATION_ERROR");
      if (input.decision === "appointment_created" && !input.appointmentId) throw err("ต้องระบุรหัสการนัดหมาย", 400, "VALIDATION_ERROR");
      if (input.decision === "not_required" && input.appointmentId) throw err("ไม่ต้องระบุรหัสการนัดหมาย", 400, "VALIDATION_ERROR");
      const { data: visit } = await db.from("visits").select("workflow_stage, patient_id").eq("visit_id", match[1]).single();
      if (!visit) throw err("ไม่พบ Visit", 404, "NOT_FOUND");
      if (visit.workflow_stage !== 'next_appointment') throw err("ไม่สามารถบันทึกนัดหมายในสถานะนี้ได้", 422, "BUSINESS_RULE_ERROR");
      if (input.decision === "appointment_created") {
        const { data: apt } = await db.from("appointments").select("patient_id").eq("appointment_id", input.appointmentId).single();
        if (!apt || apt.patient_id !== visit.patient_id) throw err("ไม่พบข้อมูลนัดหมายที่ถูกต้อง", 400, "VALIDATION_ERROR");
      }
      const { data, error } = await db.from("visits").update({ next_appointment_decision: input.decision, next_appointment_id: input.appointmentId || null, next_appointment_recorded_by: uid, next_appointment_recorded_at: nowIso() }).eq("visit_id", match[1]).select().single();
      dbError(error);
      return success(data, "บันทึกข้อมูลนัดหมายสำเร็จ", 200, headers);
    }
    match = path.match(/^\/visits\/([0-9a-f-]+)\/workflow\/history-physical$/i);
    if (match && request.method === "POST") {
      requirePermission(profile, "visits.write");
      const input: any = toSnake(await body(request));
      if (!input.present_illness && !input.physical_examination) throw err("ข้อมูลไม่ครบถ้วน", 400, "VALIDATION_ERROR");
      const { data: visit } = await db.from("visits").select("workflow_stage").eq("visit_id", match[1]).single();
      if (!visit) throw err("ไม่พบ Visit", 404, "NOT_FOUND");
      if (!['history_physical', 'treatment_program'].includes(visit.workflow_stage)) throw err("ไม่สามารถบันทึกข้อมูลในสถานะนี้ได้", 422, "BUSINESS_RULE_ERROR");
      const query = db.from("visits").update({ present_illness: input.present_illness, physical_examination: input.physical_examination, hp_recorded_by: uid, hp_recorded_at: nowIso(), updated_by: uid }).eq("visit_id", match[1]);
      if (input.expected_version) query.eq("version", input.expected_version);
      const { data, error } = await query.select().maybeSingle();
      dbError(error);
      if (!data) throw err("ข้อมูลถูกแก้ไขโดยผู้ใช้อื่น (Version Conflict)", 409, "RECORD_VERSION_CONFLICT");
      return success(data, "บันทึกข้อมูลซักประวัติและตรวจร่างกายสำเร็จ", 200, headers);
    }
    match = path.match(/^\/visits\/([0-9a-f-]+)\/workflow\/summary$/i);
    if (match && request.method === "POST") {
      requirePermission(profile, "visits.write");
      const input: any = toSnake(await body(request));
      if (!input.visit_summary) throw err("ข้อมูลไม่ครบถ้วน", 400, "VALIDATION_ERROR");
      const { data: visit } = await db.from("visits").select("workflow_stage").eq("visit_id", match[1]).single();
      if (!visit) throw err("ไม่พบ Visit", 404, "NOT_FOUND");
      if (!['summary_billing', 'completed', 'next_appointment'].includes(visit.workflow_stage)) throw err("ไม่สามารถบันทึกข้อมูลในสถานะนี้ได้", 422, "BUSINESS_RULE_ERROR");
      const query = db.from("visits").update({ visit_summary: input.visit_summary, visit_summary_recorded_by: uid, visit_summary_recorded_at: nowIso(), updated_by: uid }).eq("visit_id", match[1]);
      if (input.expected_version) query.eq("version", input.expected_version);
      const { data, error } = await query.select().maybeSingle();
      dbError(error);
      if (!data) throw err("ข้อมูลถูกแก้ไขโดยผู้ใช้อื่น (Version Conflict)", 409, "RECORD_VERSION_CONFLICT");
      return success(data, "บันทึกสรุปผลการเข้ารับบริการสำเร็จ", 200, headers);
    }
    match = path.match(/^\/visits\/([0-9a-f-]+)\/workflow\/transition$/i);
    if (match && request.method === "POST") {
      requirePermission(profile, "visits.write");
      const input: any = await body(request);
      if (!input.targetStage || !input.expectedCurrentStage) throw err("ข้อมูลไม่ครบถ้วน", 400, "VALIDATION_ERROR");
      const { data, error } = await db.rpc("medwell_workflow_transition", {
        p_visit_id: match[1],
        p_expected_stage: input.expectedCurrentStage,
        p_target_stage: input.targetStage,
        p_actor: uid,
        p_actor_roles: profile.roles || []
      });
      if (error) {
        const codes = ["UNAUTHORIZED_ROLE", "UNAUTHORIZED_TREATMENT_ROLE", "VISIT_NOT_FOUND", "VISIT_CANCELLED", "LEGACY_VISIT_NOT_SUPPORTED", "VISIT_ALREADY_COMPLETED", "WORKFLOW_STATE_CONFLICT", "INVALID_TRANSITION", "SCREENING_INCOMPLETE", "SCREENING_MISSING", "HP_INCOMPLETE", "TREATMENT_INCOMPLETE", "NEXT_APPOINTMENT_INCOMPLETE", "NEXT_APPOINTMENT_MISSING", "UNPAID_BALANCE", "REGISTRATION_INCOMPLETE", "SCREENING_AUTHORSHIP_REQUIRED", "HP_AUTHORSHIP_REQUIRED", "VISIT_SUMMARY_REQUIRED", "VISIT_SUMMARY_AUTHORSHIP_REQUIRED", "BILLING_GATE_COMPATIBILITY_DEBT"];
        const code = codes.find(c => error.message?.includes(c)) || "BUSINESS_RULE_ERROR";
        let status = 422;
        if (code === "WORKFLOW_STATE_CONFLICT") status = 409;
        if (["UNAUTHORIZED_ROLE", "UNAUTHORIZED_TREATMENT_ROLE"].includes(code)) status = 403;
        throw err(error.message || "ไม่สามารถเปลี่ยนสถานะได้", status, code);
      }
      return success(data, "อัปเดตสถานะการรักษาสำเร็จ", 200, headers);
    }

    if (path === "/prescriptions" && request.method === "POST") { requirePermission(profile, "prescriptions.write"); const input: any = await body(request); if (!Array.isArray(input.items) || !input.items.length) throw err("กรุณาเพิ่มรายการยา"); const prescription = toSnake({ visitId: input.visitId, patientId: input.patientId, queueId: input.queueId || null, notes: input.notes || "" }); const items = toSnake(input.items); const { data: rx, error } = await db.rpc("medwell_create_prescription", { p_data: prescription, p_items: items, p_actor: uid }); dbError(error); await audit(request, profile, "create", "prescriptions", rx.prescription_id); return success(rx, "ออกใบสั่งยาสำเร็จ", 201, headers); }
    match = path.match(/^\/prescriptions\/([0-9a-f-]+)$/i);
    if (match && request.method === "GET") { requirePermission(profile, "prescriptions.read"); const { data, error } = await db.from("prescriptions").select("*,prescription_items(*)").eq("prescription_id", match[1]).single(); dbError(error); return success({ ...data, items: data.prescription_items }, undefined, 200, headers); }
    match = path.match(/^\/prescriptions\/([0-9a-f-]+)\/dispense$/i);
    if (match && request.method === "POST") { requirePermission(profile, "dispense.write"); const { data, error } = await db.rpc("medwell_dispense_prescription", { p_prescription_id: match[1], p_actor: uid }); dbError(error); await audit(request, profile, "dispense", "pharmacy", match[1]); return success(data, "จ่ายยาสำเร็จ", 200, headers); }

    for (const config of [{ path: "medicines", table: "medicines", id: "medicine_id", read: "medicines.read", write: "inventory.receive" }, { path: "services", table: "services", id: "service_id", read: "services.read", write: "billing.write" }, { path: "treatment-programs", table: "treatment_programs", id: "program_id", read: "billing.read", write: "billing.write" }]) {
      if (path === `/${config.path}` && request.method === "GET") { requirePermission(profile, config.read); const { data, error } = await db.from(config.table).select("*").order("created_at", { ascending: false }); dbError(error); return success(data, undefined, 200, headers); }
      if (path === `/${config.path}` && request.method === "POST") { requireAdmin(profile); const { data, error } = await db.from(config.table).insert({ ...(toSnake(await body(request)) as object), ...actorFields(uid, true) }).select().single(); dbError(error); return success(data, "สร้างข้อมูลสำเร็จ", 201, headers); }
      const resourceMatch = path.match(new RegExp(`^/${config.path}/([0-9a-f-]+)$`, "i"));
      if (resourceMatch && request.method === "PUT") { requireAdmin(profile); const { data, error } = await db.from(config.table).update({ ...(toSnake(await body(request)) as object), ...actorFields(uid) }).eq(config.id, resourceMatch[1]).select().single(); dbError(error); return success(data, undefined, 200, headers); }
    }

    if (path === "/course-products" && request.method === "GET") {
      requirePermission(profile, "billing.read");
      const { data, error } = await db.from("course_products").select("*,course_product_programs(treatment_program_id)").order("created_at", { ascending: false });
      dbError(error);
      const mapped = (data || []).map((row: any) => ({ ...row, programs: row.course_product_programs.map((p: any) => p.treatment_program_id) }));
      return success(mapped, undefined, 200, headers);
    }
    if (path === "/course-products" && request.method === "POST") {
      requireAdmin(profile);
      const input: any = await body(request);
      const { data, error } = await db.rpc("medwell_create_course_product", {
        p_data: toSnake(input),
        p_programs: input.programs || [],
        p_actor: uid
      });
      dbError(error);
      return success(data, "สร้างคอร์สสำเร็จ", 201, headers);
    }
    match = path.match(/^\/course-products\/([0-9a-f-]+)$/i);
    if (match && request.method === "PUT") {
      requireAdmin(profile);
      const input: any = await body(request);
      const { data, error } = await db.rpc("medwell_update_course_product", {
        p_id: match[1],
        p_data: toSnake(input),
        p_programs: input.programs || [],
        p_actor: uid
      });
      dbError(error);
      return success(data, "แก้ไขคอร์สสำเร็จ", 200, headers);
    }

    match = path.match(/^\/patients\/([0-9a-f-]+)\/courses$/i);
    if (match && request.method === "GET") {
      requirePermission(profile, "billing.read");
      const { data, error } = await db.from("course_enrollments").select("*").eq("patient_id", match[1]).order("created_at", { ascending: false });
      dbError(error);
      return success(data, undefined, 200, headers);
    }
    if (match && request.method === "POST") {
      requirePermission(profile, "billing.write");
      const input: any = await body(request);
      if (!input.invoiceId) throw err("การซื้อคอร์สต้องผูกกับใบแจ้งหนี้", 400, "VALIDATION_ERROR");

      const idempotencyKey = (request.headers.get("idempotency-key") || "").trim() || crypto.randomUUID();
      const { data, error } = await db.rpc("medwell_purchase_course_enrollment", {
        p_patient_id: match[1],
        p_product_id: input.courseProductId,
        p_invoice_id: input.invoiceId,
        p_idempotency_key: idempotencyKey,
        p_actor: uid
      });
      dbError(error);
      return success(data, "เพิ่มคอร์สผู้ป่วยสำเร็จ", 201, headers);
    }

    match = path.match(/^\/visits\/([0-9a-f-]+)\/treatments$/i);
    if (match && request.method === "POST") {
      requirePermission(profile, "visits.write");
      requireClinicalPractitioner(profile);
      const input: any = await body(request);
      const { data: visit } = await db.from("visits").select("patient_id").eq("visit_id", match[1]).single();
      if (!visit) throw err("ไม่พบ Visit", 404, "NOT_FOUND");

      let pName = null;
      let pPrice = 0;
      if (input.programId) {
        const { data: prog } = await db.from("treatment_programs").select("name_th, default_price").eq("program_id", input.programId).single();
        if (!prog) throw err("ไม่พบข้อมูล Program", 400, "VALIDATION_ERROR");
        pName = prog.name_th;
        pPrice = prog.default_price;
      } else if (!input.customTreatmentName) {
        throw err("กรุณาระบุการรักษา", 400, "VALIDATION_ERROR");
      }

      const verifiedRole = (profile.roles || []).find((r: string) => r === 'physiotherapist' || r === 'thai_traditional_practitioner');

      const { data, error } = await db.from("visit_treatments").insert({
        visit_id: match[1],
        patient_id: visit.patient_id,
        program_id: input.programId || null,
        custom_treatment_name: input.customTreatmentName || null,
        program_name_snapshot: pName,
        price_snapshot: pPrice,
        practitioner_uid: uid,
        practitioner_role: verifiedRole,
        started_at: input.startedAt || nowIso(),
        status: "planned",
        notes: input.notes || null,
        charge_type: "pay_per_visit",
        ...actorFields(uid, true)
      }).select().single();
      dbError(error);
      return success(data, "บันทึกข้อมูลการรักษาสำเร็จ", 201, headers);
    }

    match = path.match(/^\/visit-treatments\/([0-9a-f-]+)\/complete$/i);
    if (match && request.method === "POST") {
      requirePermission(profile, "visits.write");
      requireClinicalPractitioner(profile);
      const input: any = await body(request);
      const { data, error } = await db.from("visit_treatments").update({
        status: "completed",
        completed_at: nowIso(),
        result: input.result || null,
        ...actorFields(uid)
      }).eq("visit_treatment_id", match[1]).select().single();
      dbError(error);
      return success(data, "ดำเนินการรักษาเสร็จสิ้น", 200, headers);
    }

    match = path.match(/^\/course-enrollments\/([0-9a-f-]+)\/consume$/i);
    if (match && request.method === "POST") {
      requirePermission(profile, "visits.write");
      requireClinicalPractitioner(profile);
      const input: any = await body(request);
      if (!input.visitTreatmentId) throw err("ต้องระบุข้อมูลการรักษา", 400, "VALIDATION_ERROR");
      const verifiedRole = (profile.roles || []).find((r: string) => r === 'physiotherapist' || r === 'thai_traditional_practitioner');
      const idempotencyKey = (request.headers.get("idempotency-key") || "").trim() || crypto.randomUUID();
      const { data, error } = await db.rpc("medwell_consume_course_session", {
        p_enrollment_id: match[1],
        p_visit_treatment_id: input.visitTreatmentId,
        p_actor: uid,
        p_actor_roles: [verifiedRole],
        p_idempotency_key: idempotencyKey,
        p_result: input.result || null,
        p_notes: input.notes || null
      });
      if (error) {
        dbError(error);
      }
      return success(data, "ตัดคอร์สสำเร็จ", 200, headers);
    }

    match = path.match(/^\/course-usage\/([0-9a-f-]+)\/reverse$/i);
    if (match && request.method === "POST") {
      requireAdmin(profile);
      const input: any = await body(request);
      if (!input.reason) throw err("ต้องระบุเหตุผล", 400, "VALIDATION_ERROR");
      const idempotencyKey = (request.headers.get("idempotency-key") || "").trim() || crypto.randomUUID();
      const { data, error } = await db.rpc("medwell_reverse_course_session", {
        p_usage_id: match[1],
        p_reason: input.reason,
        p_actor: uid,
        p_actor_roles: ['admin'],
        p_idempotency_key: idempotencyKey
      });
      if (error) {
        dbError(error);
      }
      return success(data, "ยกเลิกการตัดคอร์สสำเร็จ", 200, headers);
    }


    if (path === "/inventory/receive" && request.method === "POST") { requirePermission(profile, "inventory.receive"); const input: any = toSnake(await body(request)); const { data: lot, error } = await db.rpc("medwell_receive_stock", { p_data: input, p_actor: uid }); dbError(error); await audit(request, profile, "receive", "inventory", lot.lot_id); return success(lot, "รับยาเข้าสต็อกสำเร็จ", 201, headers); }
    if (path === "/inventory/adjust" && request.method === "POST") { requireAdmin(profile); const input: any = await body(request); const { data, error } = await db.rpc("medwell_adjust_stock", { p_lot_id: input.lotId, p_change: Number(input.quantity), p_reason: input.reason, p_actor: uid, p_reference_id: input.idempotencyKey || crypto.randomUUID() }); dbError(error); await audit(request, profile, "adjust", "inventory", input.lotId, input.reason); return success(data, undefined, 200, headers); }
    if (path === "/inventory/low-stock" && request.method === "GET") { requirePermission(profile, "inventory.read"); const { data: meds, error } = await db.from("medicines").select("*,stock_lots(quantity_remaining)").eq("active", true); dbError(error); const rows = (meds || []).map((med: any) => ({ ...med, quantity_remaining: med.stock_lots.reduce((sum: number, lot: any) => sum + Number(lot.quantity_remaining), 0) })).filter((med: any) => med.quantity_remaining <= Number(med.minimum_stock)); return success(rows, undefined, 200, headers); }
    if (path === "/inventory/expiring" && request.method === "GET") { requirePermission(profile, "inventory.read"); const limit = new Date(Date.now() + Number(url.searchParams.get("days") || 90) * 86400000).toISOString().slice(0, 10); const { data, error } = await db.from("stock_lots").select("*,medicines(medicine_code,generic_name,trade_name)").gt("quantity_remaining", 0).gte("expiry_date", todayBangkok()).lte("expiry_date", limit).order("expiry_date"); dbError(error); return success(data, undefined, 200, headers); }

    if (path === "/invoices" && request.method === "POST") {
      requirePermission(profile, "billing.write");
      const input: any = await body(request);
      const idempotency = (request.headers.get("idempotency-key") || input.idempotencyKey || "").trim();
      if (!idempotency) throw err("ต้องระบุ Idempotency Key", 400, "IDEMPOTENCY_KEY_REQUIRED");
      if (!Array.isArray(input.items) || !input.items.length) throw err("Invoice ต้องมีรายการ");
      const discount = Number(input.discount || 0);
      const tax = Number(input.tax || 0);
      const items = input.items.map((i: any) => ({
        item_type: i.itemType,
        reference_id: i.referenceId,
        quantity: Number(i.quantity) || 1,
        discount: Number(i.discount) || 0
      }));
      const { data: invoice, error } = await db.rpc("medwell_create_invoice_v2", {
        p_visit_id: input.visitId,
        p_patient_id: input.patientId,
        p_invoice_number: randomCode("INV"),
        p_items: items,
        p_discount: discount,
        p_tax: tax,
        p_notes: input.notes || "",
        p_actor: uid
      });
      dbError(error);
      await audit(request, profile, "create", "billing", invoice.invoice_id);
      return success(invoice, "สร้าง Invoice สำเร็จ", 201, headers);
    }
    match = path.match(/^\/invoices\/([0-9a-f-]+)$/i);
    if (match && request.method === "GET") {
      requirePermission(profile, "billing.read");
      const { data, error } = await db.from("invoices").select("*,invoice_items(*),payments(*)").eq("invoice_id", match[1]).single();
      dbError(error);
      return success({ ...data, items: data.invoice_items }, undefined, 200, headers);
    }
    match = path.match(/^\/invoices\/([0-9a-f-]+)\/payments$/i);
    if (match && request.method === "POST") {
      requirePermission(profile, "payments.write");
      const input: any = await body(request);
      const idempotency = (request.headers.get("idempotency-key") || input.idempotencyKey || "").trim();
      if (!idempotency) throw err("ต้องระบุ Idempotency Key", 400, "IDEMPOTENCY_KEY_REQUIRED");
      const { data, error } = await db.rpc("medwell_record_payment", {
        p_invoice_id: match[1],
        p_amount: Number(input.amount),
        p_method: input.paymentMethod || "cash",
        p_reference: input.referenceNumber || "",
        p_notes: input.notes || "",
        p_idempotency_key: idempotency,
        p_actor: uid
      });
      dbError(error);
      await audit(request, profile, "payment", "billing", match[1]);
      return success(data, "รับชำระเงินและออกใบเสร็จสำเร็จ", 201, headers);
    }
    match = path.match(/^\/invoices\/([0-9a-f-]+)\/refunds$/i);
    if (match && request.method === "POST") {
      requireAdmin(profile);
      const input: any = await body(request);
      const idempotency = (request.headers.get("idempotency-key") || input.idempotencyKey || "").trim();
      if (!idempotency) throw err("ต้องระบุ Idempotency Key", 400, "IDEMPOTENCY_KEY_REQUIRED");
      const { data, error } = await db.rpc("medwell_issue_refund", {
        p_invoice_id: match[1],
        p_payment_id: input.paymentId,
        p_amount: Number(input.amount),
        p_reason: input.reason,
        p_idempotency_key: idempotency,
        p_actor: uid
      });
      dbError(error);
      await audit(request, profile, "refund", "billing", match[1], input.reason);
      return success(data, "คืนเงินสำเร็จ", 201, headers);
    }
    match = path.match(/^\/invoices\/([0-9a-f-]+)\/void$/i);
    if (match && request.method === "POST") {
      requireAdmin(profile);
      const input: any = await body(request);
      const { data, error } = await db.rpc("medwell_void_invoice_v2", {
        p_invoice_id: match[1],
        p_reason: input.reason,
        p_actor: uid
      });
      dbError(error);
      await audit(request, profile, "void", "billing", match[1], input.reason);
      return success(data, undefined, 200, headers);
    }
    if (path === "/daily-closing" && request.method === "POST") {
      requireAdmin(profile);
      const input: any = await body(request);
      const { data, error } = await db.rpc("medwell_close_business_day", {
        p_date: input.businessDate || new Date().toISOString().slice(0, 10),
        p_actual_cash: Number(input.actualCash),
        p_actor: uid
      });
      dbError(error);
      await audit(request, profile, "daily_close", "financial", data.closing_id);
      return success(data, "ปิดยอดประจำวันสำเร็จ", 201, headers);
    }
    match = path.match(/^\/users\/([0-9a-f-]+)\/professional-profile$/i);
    if (match && request.method === "PUT") {
      requireAdmin(profile);
      const input: any = await body(request);
      const { data, error } = await db.from("user_professional_profiles").upsert({
        uid: match[1],
        professional_title_th: input.professionalTitleTh,
        professional_title_en: input.professionalTitleEn,
        license_number: input.licenseNumber || null,
        signature_display_name: input.signatureDisplayName,
        active: input.active !== false,
        updated_at: new Date().toISOString(),
        updated_by: uid
      }).select().single();
      dbError(error);
      await audit(request, profile, "update", "professional_profile", match[1]);
      return success(data, "อัปเดตข้อมูลผู้ประกอบวิชาชีพสำเร็จ", 200, headers);
    }
    if (path === "/medical-certificates" && request.method === "POST") {
      const input: any = await body(request);

      // Determine effective clinical role
      let clinicalAuthorUid = uid;
      let clinicalAuthorRole = null;

      if (profile.roles.includes("physiotherapist")) {
        clinicalAuthorRole = "physiotherapist";
      } else if (profile.roles.includes("thai_traditional_practitioner")) {
        clinicalAuthorRole = "thai_traditional_practitioner";
      } else {
        throw err("บัญชีนี้ไม่มีสิทธิ์ออกเอกสารทางคลินิก (ต้องเป็นนักกายภาพบำบัด หรือ ผู้ประกอบวิชาชีพการแพทย์แผนไทย)");
      }

      // Prove patient and visit relationship
      const { data: visitData, error: visitError } = await db.from("visits")
        .select("patient_id")
        .eq("visit_id", input.visitId)
        .single();

      if (visitError || !visitData) throw err("ไม่พบข้อมูลการเข้ารับบริการ");
      if (visitData.patient_id !== input.patientId) throw err("ข้อมูลผู้ป่วยและการเข้ารับบริการไม่ตรงกัน");

      const { data, error } = await db.from("medical_certificates").insert({
        patient_id: input.patientId,
        visit_id: input.visitId,
        clinical_author_uid: clinicalAuthorUid,
        clinical_author_role: clinicalAuthorRole,
        recommendation: input.recommendation,
        leave_start_date: input.leaveStartDate || null,
        leave_end_date: input.leaveEndDate || null,
        language: input.language || 'th',
        created_by: uid,
        updated_by: uid
      }).select().single();
      dbError(error);
      await audit(request, profile, "medical_certificate_draft_create", "documents", data.certificate_id);
      return success(data, "บันทึกร่างใบรับรองแพทย์สำเร็จ", 201, headers);
    }
    match = path.match(/^\/medical-certificates\/([0-9a-f-]+)\/issue$/i);
    if (match && request.method === "POST") {
      const input: any = await body(request);
      if (!input.idempotencyKey) throw err("ต้องระบุ Idempotency Key");
      const idempotencyKey = input.idempotencyKey;
      const { data, error } = await db.rpc("medwell_issue_medical_certificate", {
        p_certificate_id: match[1],
        p_issued_by: uid,
        p_idempotency_key: idempotencyKey
      });
      dbError(error);
      await audit(request, profile, "medical_certificate_issue", "documents", match[1]);
      return success(data, "ออกใบรับรองแพทย์สำเร็จ", 200, headers);
    }
    match = path.match(/^\/medical-certificates\/([0-9a-f-]+)\/cancel$/i);
    if (match && request.method === "POST") {
      requireAdmin(profile);
      const input: any = await body(request);
      const { data, error } = await db.rpc("medwell_cancel_medical_certificate", {
        p_certificate_id: match[1],
        p_reason: input.reason,
        p_cancelled_by: uid
      });
      dbError(error);
      await audit(request, profile, "medical_certificate_cancel", "documents", match[1], input.reason);
      return success(data, "ยกเลิกใบรับรองแพทย์สำเร็จ", 200, headers);
    }
    if (path === "/medical-certificates" && request.method === "GET") {
      const { data, error } = await db.from("medical_certificates").select(`
        certificate_id, certificate_number, patient_id, visit_id, status,
        issued_at, clinical_author_uid, clinical_author_role, language,
        patient_name_snapshot
      `).order("created_at", { ascending: false }).limit(100);
      dbError(error);
      return success(data, undefined, 200, headers);
    }
    match = path.match(/^\/medical-certificates\/([0-9a-f-]+)$/i);
    if (match && request.method === "GET") {
      const { data, error } = await db.from("medical_certificates").select().eq("certificate_id", match[1]).single();
      dbError(error);
      return success(data, undefined, 200, headers);
    }
    match = path.match(/^\/visits\/([0-9a-f-]+)\/no-charge$/i);
    if (match && request.method === "POST") {
      requireAdmin(profile);
      const input: any = await body(request);
      if (!input.reason) throw err("ต้องระบุเหตุผล", 400, "VALIDATION_ERROR");
      const { data, error } = await db.from("visit_financial_dispositions").upsert({
        visit_id: match[1],
        disposition: 'no_charge',
        reason: input.reason,
        approved_by: uid,
        created_at: nowIso()
      }).select().single();
      dbError(error);
      await audit(request, profile, "no_charge", "visits", match[1], input.reason);
      return success(data, "บันทึก No-Charge สำเร็จ", 200, headers);
    }

    if (path.startsWith("/reports/") && request.method === "GET") { const report = path.slice(9); const map: Record<string, [string, string | null]> = { appointments: ["appointments", "appointments.read"], queues: ["queues", "queues.read"], revenue: ["payments", "billing.read"], inventory: ["stock_lots", "inventory.read"], movements: ["stock_movements", "inventory.read"], treatments: ["visits", "records.read"], users: ["users", "admin"] }; const config = map[report]; if (!config) throw err("ไม่พบรายงาน", 404, "NOT_FOUND"); if (config[1] === "admin") requireAdmin(profile); else if (config[1]) requirePermission(profile, config[1]); const { data, error } = await db.from(config[0]).select("*").order(config[0] === "payments" ? "payment_date" : "created_at", { ascending: false }).limit(1000); dbError(error); return success(data, undefined, 200, headers); }

    if (path === "/users" && request.method === "GET") { requireAdmin(profile); const { data, error } = await db.from("users").select("*").order("display_name"); dbError(error); return success(data, undefined, 200, headers); }
    if (path === "/users" && request.method === "POST") { requireAdmin(profile); const input: any = await body(request); const uidValue = String(input.uid || "").trim(); const roles = Array.isArray(input.roles) ? input.roles : []; const allowedRoles = new Set(["admin", "physiotherapist", "thai_traditional_practitioner", "clinic_assistant", "pending_role_review"]); if (!uidValue || !input.email || !input.displayName || !roles.length || roles.some((role: string) => !allowedRoles.has(role))) throw err("กรุณาระบุ Firebase UID อีเมล ชื่อ และบทบาทที่ถูกต้อง"); const { data, error } = await db.from("users").insert({ uid: uidValue, email: String(input.email).trim().toLowerCase(), display_name: String(input.displayName).trim(), phone: input.phone || null, roles, active: true, role_selection_completed: true, role_selected_at: nowIso() }).select().single(); dbError(error); await audit(request, profile, "create", "users", uidValue); return success(data, "เพิ่มผู้ใช้สำเร็จ", 201, headers); }
    if (path === "/google-role-approvals" && request.method === "GET") { requireAdmin(profile); const { data, error } = await db.from("google_role_approvals").select("*").order("created_at", { ascending: false }); dbError(error); return success(data, undefined, 200, headers); }
    if (path === "/google-role-approvals" && request.method === "POST") {
      requireAdmin(profile); const input: any = await body(request); const email = String(input.email || "").trim().toLowerCase();
      let role: string; try { role = validateGoogleRoleSelection({ role: input.role }); } catch { throw err("อีเมลหรือบทบาทที่อนุมัติไม่ถูกต้อง", 400, "VALIDATION_ERROR"); }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw err("รูปแบบอีเมลไม่ถูกต้อง");
      const { data: current, error: currentError } = await db.from("google_role_approvals").select("used_by").eq("email", email).maybeSingle(); dbError(currentError);
      if (current?.used_by) throw err("การอนุมัตินี้ถูกใช้งานแล้ว", 409, "APPROVAL_ALREADY_USED");
      const { data, error } = await db.from("google_role_approvals").upsert({ email, approved_role: role, active: true, used_by: null, used_at: null, created_by: uid }, { onConflict: "email" }).select().single(); dbError(error);
      await audit(request, profile, "create", "google_role_approvals", data.approval_id, email); return success(data, "อนุมัติอีเมล Google แล้ว", 201, headers);
    }
    match = path.match(/^\/users\/([^/]+)$/);
    if (match && request.method === "PUT") { requireAdmin(profile); const input: any = toSnake(await body(request)); const { data, error } = await db.from("users").update(input).eq("uid", match[1]).select().single(); dbError(error); await audit(request, profile, "update", "users", match[1]); return success(data, undefined, 200, headers); }
    match = path.match(/^\/users\/([^/]+)\/resolve-role$/);
    if (match && request.method === "POST") {
      requireAdmin(profile);
      const input: any = await body(request);
      const targetRole = String(input.role || "").trim();
      const allowedResolution = new Set(["physiotherapist", "thai_traditional_practitioner", "clinic_assistant"]);
      if (!allowedResolution.has(targetRole)) throw err("บทบาทที่เลือกไม่ถูกต้องสำหรับการตรวจสอบ", 400, "VALIDATION_ERROR");
      const { data: userRecord, error: userError } = await db.from("users").select("roles").eq("uid", match[1]).single();
      dbError(userError);
      const isPending = userRecord?.roles?.some((r: string) => ["pending_role_review", "doctor", "pharmacist"].includes(r));
      if (!isPending) throw err("บัญชีนี้ไม่ได้อยู่ในสถานะรอตรวจสอบบทบาท", 422, "BUSINESS_RULE_ERROR");
      const oldRole = userRecord?.roles?.join(",") || "";
      const { data, error } = await db.from("users").update({ roles: [targetRole], role_selection_completed: true, role_selected_at: nowIso() }).eq("uid", match[1]).select().single();
      dbError(error);
      const requestIdValue = request.headers.get("x-request-id") || requestId;
      await db.from("audit_logs").insert({ user_uid: profile.uid, user_name: profile.display_name, roles: profile.roles, action: "resolve_role", module: "users", record_id: match[1], description: `Admin resolved role: ${oldRole} -> ${targetRole}. source=phase2_role_resolution, reqId=${requestIdValue}`, success: true });
      return success(data, "กำหนดบทบาทสำเร็จ", 200, headers);
    }
    match = path.match(/^\/users\/([^/]+)\/disable$/);
    if (match && request.method === "POST") { requireAdmin(profile); if (match[1] === uid) throw err("ไม่สามารถระงับบัญชีที่กำลังใช้งานอยู่", 422, "BUSINESS_RULE_ERROR"); const { data, error } = await db.from("users").update({ active: false }).eq("uid", match[1]).select().single(); dbError(error); await audit(request, profile, "disable", "users", match[1]); return success(data, undefined, 200, headers); }

    if (path === "/settings" && request.method === "GET") { requireAdmin(profile); const { data, error } = await db.from("clinic_settings").select("key,value"); dbError(error); return success(Object.fromEntries((data || []).map((row) => [row.key, row.value])), undefined, 200, headers); }
    if (path === "/settings" && request.method === "PUT") { requireAdmin(profile); const input: any = await body(request); const rows = Object.entries(input).map(([key, value]) => ({ key, value, updated_by: uid })); const { error } = await db.from("clinic_settings").upsert(rows); dbError(error); await audit(request, profile, "update", "settings"); return success(input, "บันทึกการตั้งค่าสำเร็จ", 200, headers); }
    if (path === "/audit-logs" && request.method === "GET") { requireAdmin(profile); const { data, error } = await db.from("audit_logs").select("*").order("occurred_at", { ascending: false }).limit(1000); dbError(error); return success(data, undefined, 200, headers); }
    match = path.match(/^\/backup\/([a-z_]+)$/i);
    if (match && request.method === "GET") { requireAdmin(profile); const allowed = new Set(["clinic_settings","users","patients","appointments","queues","screenings","visits","visit_addendums","diagnosis_master","diagnoses","prescriptions","prescription_items","medicines","stock_lots","stock_movements","services","invoices","invoice_items","payments","audit_logs","counters"]); if (!allowed.has(match[1])) throw err("ไม่พบตาราง", 404, "NOT_FOUND"); const { data, error } = await db.from(match[1]).select("*").limit(10000); dbError(error); await audit(request, profile, "export", "backup", match[1]); return success(data, undefined, 200, headers); }

    throw err("ไม่พบ API ที่เรียก", 404, "ROUTE_NOT_FOUND");
  } catch (error) {
    const value = error as { status?: number; code?: string };
    console.error(JSON.stringify({ event: "api_error", requestId, method: request.method, path, status: value.status || 500, code: value.code || "INTERNAL_ERROR" }));
    return failure(error, headers);
  }
});
