-- Additive schema changes for Phase 3 Clinical Workflow Foundation

-- 1. Extend public.visits table
alter table public.visits
add column workflow_stage text,
add column stage_started_at timestamptz,
add column stage_completed_at timestamptz,
add column completed_at timestamptz,
add column next_appointment_decision text check (next_appointment_decision in ('appointment_created', 'not_required')),
add column next_appointment_id uuid references public.appointments(appointment_id),
add column next_appointment_recorded_by text references public.users(uid),
add column next_appointment_recorded_at timestamptz,
add column hp_recorded_by text references public.users(uid),
add column hp_recorded_at timestamptz,
add column visit_summary text,
add column visit_summary_recorded_by text references public.users(uid),
add column visit_summary_recorded_at timestamptz;

-- Add check constraint for workflow_stage
alter table public.visits add constraint visits_workflow_stage_check
check (workflow_stage in ('registration', 'screening', 'history_physical', 'treatment_program', 'next_appointment', 'summary_billing', 'completed'));

-- 1.5 Update medwell_open_visit to initialize workflow_stage
create or replace function public.medwell_open_visit(p_data jsonb, p_vn text, p_visit_date date, p_actor text)
returns public.visits language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.visits;
begin
  insert into public.visits (vn,patient_id,queue_id,appointment_id,visit_date,doctor_uid,chief_complaint,present_illness,past_history,family_history,social_history,physical_examination,assessment,diagnosis,diagnosis_code,treatment_plan,doctor_note,follow_up_date,visit_status,workflow_stage,stage_started_at,created_by,updated_by)
  values (p_vn,(p_data->>'patient_id')::uuid,nullif(p_data->>'queue_id','')::uuid,nullif(p_data->>'appointment_id','')::uuid,p_visit_date,p_actor,p_data->>'chief_complaint',p_data->>'present_illness',p_data->>'past_history',p_data->>'family_history',p_data->>'social_history',p_data->>'physical_examination',p_data->>'assessment',p_data->>'diagnosis',p_data->>'diagnosis_code',p_data->>'treatment_plan',p_data->>'doctor_note',nullif(p_data->>'follow_up_date','')::date,'in_consultation','registration',now(),p_actor,p_actor)
  returning * into r;
  if r.queue_id is not null then
    update public.queues set current_status='in_consultation',updated_by=p_actor where queue_id=r.queue_id;
    if not found then raise exception 'QUEUE_NOT_FOUND' using errcode='P0002'; end if;
  end if;
  return r;
end; $$;

-- 2. Create RPC for atomic workflow transition
create or replace function public.medwell_workflow_transition(
  p_visit_id uuid,
  p_expected_stage text,
  p_target_stage text,
  p_actor text,
  p_actor_roles text[]
) returns public.visits
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_visit public.visits;
  v_screening public.screenings;
  v_invoice_count int;
  v_unpaid_count int;
  v_now timestamptz := now();
begin
  -- RBAC checks
  if 'pending_role_review' = any(p_actor_roles) or 'doctor' = any(p_actor_roles) or 'pharmacist' = any(p_actor_roles) then
    raise exception 'UNAUTHORIZED_ROLE' using errcode = '42501';
  end if;

  -- Lock visit
  select * into v_visit from public.visits where visit_id = p_visit_id for update;
  if not found then raise exception 'VISIT_NOT_FOUND' using errcode = 'P0002'; end if;

  if v_visit.visit_status = 'cancelled' then
    raise exception 'VISIT_CANCELLED' using errcode = '42200';
  end if;

  if v_visit.workflow_stage is null then
    raise exception 'LEGACY_VISIT_NOT_SUPPORTED' using errcode = '42200';
  end if;

  if v_visit.workflow_stage = 'completed' then
    raise exception 'VISIT_ALREADY_COMPLETED' using errcode = '42200';
  end if;

  if v_visit.workflow_stage <> p_expected_stage then
    raise exception 'WORKFLOW_STATE_CONFLICT' using errcode = '40900';
  end if;

  -- State machine validation
  if v_visit.workflow_stage = 'registration' and p_target_stage <> 'screening' then raise exception 'INVALID_TRANSITION' using errcode = '42200'; end if;
  if v_visit.workflow_stage = 'screening' and p_target_stage <> 'history_physical' then raise exception 'INVALID_TRANSITION' using errcode = '42200'; end if;
  if v_visit.workflow_stage = 'history_physical' and p_target_stage <> 'treatment_program' then raise exception 'INVALID_TRANSITION' using errcode = '42200'; end if;
  if v_visit.workflow_stage = 'treatment_program' and p_target_stage <> 'next_appointment' then raise exception 'INVALID_TRANSITION' using errcode = '42200'; end if;
  if v_visit.workflow_stage = 'next_appointment' and p_target_stage <> 'summary_billing' then raise exception 'INVALID_TRANSITION' using errcode = '42200'; end if;
  if v_visit.workflow_stage = 'summary_billing' and p_target_stage <> 'completed' then raise exception 'INVALID_TRANSITION' using errcode = '42200'; end if;

  -- Gates Validation
  if v_visit.workflow_stage = 'registration' and p_target_stage = 'screening' then
    if v_visit.patient_id is null or v_visit.created_by is null or v_visit.created_at is null then
      raise exception 'REGISTRATION_INCOMPLETE' using errcode = '42200';
    end if;
  end if;

  if p_target_stage = 'history_physical' then
    -- Leaving screening
    select * into v_screening from public.screenings where queue_id = v_visit.queue_id;
    if v_screening is null then
      raise exception 'SCREENING_MISSING' using errcode = '42200';
    end if;
    if nullif(trim(v_screening.chief_complaint), '') is null and nullif(trim(v_visit.chief_complaint), '') is null then
      raise exception 'SCREENING_INCOMPLETE' using errcode = '42200';
    end if;
    if v_screening.created_by is null or v_screening.created_at is null then
      raise exception 'SCREENING_AUTHORSHIP_REQUIRED' using errcode = '42200';
    end if;
  end if;

  if p_target_stage = 'treatment_program' then
    -- Leaving H&P
    if nullif(trim(v_visit.present_illness), '') is null and nullif(trim(v_visit.physical_examination), '') is null then
      raise exception 'HP_INCOMPLETE' using errcode = '42200';
    end if;
    if v_visit.hp_recorded_by is null or v_visit.hp_recorded_at is null then
      raise exception 'HP_AUTHORSHIP_REQUIRED' using errcode = '42200';
    end if;
  end if;

  if p_target_stage = 'next_appointment' then
    -- Leaving Treatment Program
    -- Role check: clinic_assistant cannot do practitioner treatment transitions
    if not ('admin' = any(p_actor_roles) or 'physiotherapist' = any(p_actor_roles) or 'thai_traditional_practitioner' = any(p_actor_roles)) then
      raise exception 'UNAUTHORIZED_TREATMENT_ROLE' using errcode = '42501';
    end if;
    if nullif(trim(v_visit.treatment_plan), '') is null then
      raise exception 'TREATMENT_INCOMPLETE' using errcode = '42200';
    end if;
  end if;

  if p_target_stage = 'summary_billing' then
    -- Leaving Next Appointment
    if nullif(trim(v_visit.next_appointment_decision), '') is null then
      raise exception 'NEXT_APPOINTMENT_INCOMPLETE' using errcode = '42200';
    end if;
    if v_visit.next_appointment_decision = 'appointment_created' and v_visit.next_appointment_id is null then
      raise exception 'NEXT_APPOINTMENT_MISSING' using errcode = '42200';
    end if;
  end if;

  if p_target_stage = 'completed' then
    -- Leaving Summary Billing
    if nullif(trim(v_visit.visit_summary), '') is null then
      raise exception 'VISIT_SUMMARY_REQUIRED' using errcode = '42200';
    end if;
    if v_visit.visit_summary_recorded_by is null or v_visit.visit_summary_recorded_at is null then
      raise exception 'VISIT_SUMMARY_AUTHORSHIP_REQUIRED' using errcode = '42200';
    end if;

    select count(*), count(*) filter (where status not in ('paid', 'void') and balance > 0)
    into v_invoice_count, v_unpaid_count
    from public.invoices where visit_id = p_visit_id;

    if v_invoice_count = 0 then
      raise exception 'BILLING_GATE_COMPATIBILITY_DEBT' using errcode = '42200';
    end if;
    if v_unpaid_count > 0 then
      raise exception 'UNPAID_BALANCE' using errcode = '42200';
    end if;

    -- Queue handling
    if v_visit.queue_id is not null then
      update public.queues set current_status = 'completed', completed_time = v_now, updated_by = p_actor where queue_id = v_visit.queue_id;
    end if;

    -- Mark current stage completed
    update public.visits
    set stage_completed_at = v_now
    where visit_id = p_visit_id;

    -- Actually complete the visit
    update public.visits
    set workflow_stage = 'completed',
        visit_status = 'completed',
        stage_started_at = v_now,
        stage_completed_at = v_now,
        completed_at = v_now,
        closed_at = v_now,
        closed_by = p_actor,
        updated_by = p_actor
    where visit_id = p_visit_id
    returning * into v_visit;
  else
    -- Mark current stage completed
    update public.visits
    set stage_completed_at = v_now
    where visit_id = p_visit_id;

    update public.visits
    set workflow_stage = p_target_stage,
        stage_started_at = v_now,
        stage_completed_at = null,
        updated_by = p_actor
    where visit_id = p_visit_id
    returning * into v_visit;
  end if;

  -- Audit log
  insert into public.audit_logs (user_uid, roles, action, module, record_type, record_id, description, success)
  values (p_actor, p_actor_roles, 'clinical_workflow_transition', 'visits', 'workflow', p_visit_id::text, 'Transition from ' || p_expected_stage || ' to ' || p_target_stage, true);

  return v_visit;
end;
$$;

revoke execute on function public.medwell_workflow_transition(uuid, text, text, text, text[]) from public, anon, authenticated;
grant execute on function public.medwell_workflow_transition(uuid, text, text, text, text[]) to service_role;
