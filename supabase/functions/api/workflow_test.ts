import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { db } from "./db.ts";

// Note: These tests require a running Supabase instance with the phase 3 migrations applied.
// To run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... deno test --allow-env --allow-net supabase/functions/api/workflow_test.ts

Deno.test({
  name: "State Machine: Valid Transitions (Full Flow)",
  ignore: !Deno.env.get("SUPABASE_URL"),
  async fn() {
    const { data: v0 } = await db.rpc("medwell_open_visit", {
      p_data: { patient_id: "00000000-0000-0000-0000-000000000001", chief_complaint: "Headache" },
      p_vn: "TEST-FULL", p_visit_date: "2026-08-10", p_actor: "admin"
    });
    const visitId = v0.visit_id;

    // 1. registration -> screening
    await db.rpc("medwell_workflow_transition", {
      p_visit_id: visitId, p_expected_stage: "registration", p_target_stage: "screening", p_actor: "admin", p_actor_roles: ["admin"]
    });

    // Add screening gate data
    await db.from("screenings").insert({ queue_id: v0.queue_id, chief_complaint: "Headache", created_by: "admin" });

    // 2. screening -> history_physical
    await db.rpc("medwell_workflow_transition", {
      p_visit_id: visitId, p_expected_stage: "screening", p_target_stage: "history_physical", p_actor: "admin", p_actor_roles: ["admin"]
    });

    // Add H&P gate data
    await db.from("visits").update({ present_illness: "Severe headache", hp_recorded_by: "admin", hp_recorded_at: new Date().toISOString() }).eq("visit_id", visitId);

    // 3. history_physical -> treatment_program
    await db.rpc("medwell_workflow_transition", {
      p_visit_id: visitId, p_expected_stage: "history_physical", p_target_stage: "treatment_program", p_actor: "admin", p_actor_roles: ["admin"]
    });

    // Add treatment plan gate data
    await db.from("visits").update({ treatment_plan: "Rest" }).eq("visit_id", visitId);

    // 4. treatment_program -> next_appointment
    await db.rpc("medwell_workflow_transition", {
      p_visit_id: visitId, p_expected_stage: "treatment_program", p_target_stage: "next_appointment", p_actor: "admin", p_actor_roles: ["admin"]
    });

    // Add next appointment decision
    await db.from("visits").update({ next_appointment_decision: "not_required" }).eq("visit_id", visitId);

    // 5. next_appointment -> summary_billing
    await db.rpc("medwell_workflow_transition", {
      p_visit_id: visitId, p_expected_stage: "next_appointment", p_target_stage: "summary_billing", p_actor: "admin", p_actor_roles: ["admin"]
    });

    // Add summary & zero-balance invoice
    await db.from("visits").update({ visit_summary: "Patient advised to rest.", visit_summary_recorded_by: "admin", visit_summary_recorded_at: new Date().toISOString() }).eq("visit_id", visitId);
    await db.from("invoices").insert({ visit_id: visitId, status: "paid", balance: 0, total_amount: 100, created_by: "admin" });

    // 6. summary_billing -> completed
    const { error: err6 } = await db.rpc("medwell_workflow_transition", {
      p_visit_id: visitId, p_expected_stage: "summary_billing", p_target_stage: "completed", p_actor: "admin", p_actor_roles: ["admin"]
    });
    assertEquals(err6, null);
  }
});

Deno.test({
  name: "State Machine: Invalid Jumps and State Protection",
  ignore: !Deno.env.get("SUPABASE_URL"),
  async fn() {
    const { data: v0 } = await db.rpc("medwell_open_visit", {
      p_data: { patient_id: "00000000-0000-0000-0000-000000000001", chief_complaint: "Headache" },
      p_vn: "TEST-JUMPS", p_visit_date: "2026-08-10", p_actor: "admin"
    });

    // Jump
    const { error: err1 } = await db.rpc("medwell_workflow_transition", {
      p_visit_id: v0.visit_id, p_expected_stage: "registration", p_target_stage: "treatment_program", p_actor: "admin", p_actor_roles: ["admin"]
    });
    assertEquals(err1?.message.includes("INVALID_TRANSITION"), true);

    // Stale state
    const { error: err2 } = await db.rpc("medwell_workflow_transition", {
      p_visit_id: v0.visit_id, p_expected_stage: "screening", p_target_stage: "history_physical", p_actor: "admin", p_actor_roles: ["admin"]
    });
    assertEquals(err2?.message.includes("WORKFLOW_STATE_CONFLICT"), true);
  }
});

Deno.test({
  name: "State Machine: Legacy NULL Workflow & Cancelled Visits",
  ignore: !Deno.env.get("SUPABASE_URL"),
  async fn() {
    const { data: legacy } = await db.from("visits").insert({ patient_id: "00000000-0000-0000-0000-000000000001", visit_date: "2026-08-10", vn: "LEGACY", created_by: "admin" }).select().single();
    const { error: err1 } = await db.rpc("medwell_workflow_transition", { p_visit_id: legacy.visit_id, p_expected_stage: "registration", p_target_stage: "screening", p_actor: "admin", p_actor_roles: ["admin"] });
    assertEquals(err1?.message.includes("LEGACY_VISIT_NOT_SUPPORTED"), true);

    const { data: vC } = await db.rpc("medwell_open_visit", { p_data: { patient_id: "00000000-0000-0000-0000-000000000001" }, p_vn: "CANC", p_visit_date: "2026-08-10", p_actor: "admin" });
    await db.from("visits").update({ visit_status: "cancelled" }).eq("visit_id", vC.visit_id);
    const { error: err2 } = await db.rpc("medwell_workflow_transition", { p_visit_id: vC.visit_id, p_expected_stage: "registration", p_target_stage: "screening", p_actor: "admin", p_actor_roles: ["admin"] });
    assertEquals(err2?.message.includes("VISIT_CANCELLED"), true);
  }
});

Deno.test({
  name: "State Machine: RBAC Denials",
  ignore: !Deno.env.get("SUPABASE_URL"),
  async fn() {
    const { data: v0 } = await db.rpc("medwell_open_visit", { p_data: { patient_id: "00000000-0000-0000-0000-000000000001" }, p_vn: "TEST-RBAC", p_visit_date: "2026-08-10", p_actor: "admin" });
    await db.from("visits").update({ workflow_stage: "treatment_program" }).eq("visit_id", v0.visit_id);

    const rolesToTest = [["pending_role_review"], ["doctor"], ["pharmacist"]];
    for (const roles of rolesToTest) {
      const { error } = await db.rpc("medwell_workflow_transition", { p_visit_id: v0.visit_id, p_expected_stage: "treatment_program", p_target_stage: "next_appointment", p_actor: "u1", p_actor_roles: roles });
      assertEquals(error?.message.includes("UNAUTHORIZED_ROLE"), true);
    }

    const { error: errClinic } = await db.rpc("medwell_workflow_transition", { p_visit_id: v0.visit_id, p_expected_stage: "treatment_program", p_target_stage: "next_appointment", p_actor: "u1", p_actor_roles: ["clinic_assistant"] });
    assertEquals(errClinic?.message.includes("UNAUTHORIZED_TREATMENT_ROLE"), true);
  }
});

Deno.test({
  name: "State Machine: Gate Enforcement",
  ignore: !Deno.env.get("SUPABASE_URL"),
  async fn() {
    const { data: v0 } = await db.rpc("medwell_open_visit", { p_data: { patient_id: "00000000-0000-0000-0000-000000000001" }, p_vn: "TEST-GATES", p_visit_date: "2026-08-10", p_actor: "admin" });

    // Screening Gate: missing record
    await db.from("visits").update({ workflow_stage: "screening" }).eq("visit_id", v0.visit_id);
    const { error: errSc1 } = await db.rpc("medwell_workflow_transition", { p_visit_id: v0.visit_id, p_expected_stage: "screening", p_target_stage: "history_physical", p_actor: "admin", p_actor_roles: ["admin"] });
    assertEquals(errSc1?.message.includes("SCREENING_MISSING"), true);

    await db.from("screenings").insert({ queue_id: v0.queue_id, chief_complaint: "x" }); // missing created_by (DB default handles it? Let's assume testing authorship)
    await db.from("screenings").update({ created_by: null }).eq("queue_id", v0.queue_id);
    const { error: errSc2 } = await db.rpc("medwell_workflow_transition", { p_visit_id: v0.visit_id, p_expected_stage: "screening", p_target_stage: "history_physical", p_actor: "admin", p_actor_roles: ["admin"] });
    assertEquals(errSc2?.message.includes("SCREENING_AUTHORSHIP_REQUIRED"), true);

    // H&P Gate: content without authorship
    await db.from("visits").update({ workflow_stage: "history_physical", present_illness: "yes", hp_recorded_by: null }).eq("visit_id", v0.visit_id);
    const { error: errHp1 } = await db.rpc("medwell_workflow_transition", { p_visit_id: v0.visit_id, p_expected_stage: "history_physical", p_target_stage: "treatment_program", p_actor: "admin", p_actor_roles: ["admin"] });
    assertEquals(errHp1?.message.includes("HP_AUTHORSHIP_REQUIRED"), true);

    // Treatment Gate
    await db.from("visits").update({ workflow_stage: "treatment_program", treatment_plan: null }).eq("visit_id", v0.visit_id);
    const { error: errTx1 } = await db.rpc("medwell_workflow_transition", { p_visit_id: v0.visit_id, p_expected_stage: "treatment_program", p_target_stage: "next_appointment", p_actor: "admin", p_actor_roles: ["admin"] });
    assertEquals(errTx1?.message.includes("TREATMENT_INCOMPLETE"), true);

    // Next Appointment Gate
    await db.from("visits").update({ workflow_stage: "next_appointment", next_appointment_decision: "appointment_created", next_appointment_id: null }).eq("visit_id", v0.visit_id);
    const { error: errNa1 } = await db.rpc("medwell_workflow_transition", { p_visit_id: v0.visit_id, p_expected_stage: "next_appointment", p_target_stage: "summary_billing", p_actor: "admin", p_actor_roles: ["admin"] });
    assertEquals(errNa1?.message.includes("NEXT_APPOINTMENT_MISSING"), true);

    // Summary/Billing Gate
    await db.from("visits").update({ workflow_stage: "summary_billing", visit_summary: null }).eq("visit_id", v0.visit_id);
    const { error: errSb1 } = await db.rpc("medwell_workflow_transition", { p_visit_id: v0.visit_id, p_expected_stage: "summary_billing", p_target_stage: "completed", p_actor: "admin", p_actor_roles: ["admin"] });
    assertEquals(errSb1?.message.includes("VISIT_SUMMARY_REQUIRED"), true);

    await db.from("visits").update({ visit_summary: "sum", visit_summary_recorded_by: "admin", visit_summary_recorded_at: new Date().toISOString() }).eq("visit_id", v0.visit_id);
    // zero invoice
    const { error: errSb2 } = await db.rpc("medwell_workflow_transition", { p_visit_id: v0.visit_id, p_expected_stage: "summary_billing", p_target_stage: "completed", p_actor: "admin", p_actor_roles: ["admin"] });
    assertEquals(errSb2?.message.includes("BILLING_GATE_COMPATIBILITY_DEBT"), true);

    // unpaid invoice
    await db.from("invoices").insert({ visit_id: v0.visit_id, balance: 500, status: "issued", total_amount: 500, created_by: "admin" });
    const { error: errSb3 } = await db.rpc("medwell_workflow_transition", { p_visit_id: v0.visit_id, p_expected_stage: "summary_billing", p_target_stage: "completed", p_actor: "admin", p_actor_roles: ["admin"] });
    assertEquals(errSb3?.message.includes("UNPAID_BALANCE"), true);
  }
});
