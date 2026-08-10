-- Additive schema changes for Phase 4 Treatment Course Management Foundation

-- 1. Treatment Programs
create table public.treatment_programs (
  program_id uuid primary key default gen_random_uuid(),
  program_code text not null unique,
  name_th text not null,
  name_en text,
  description text,
  category text,
  default_price numeric(14,2) not null default 0 check (default_price >= 0),
  default_duration_minutes integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by text references public.users(uid),
  updated_at timestamptz not null default now(),
  updated_by text references public.users(uid)
);
create index treatment_programs_category_idx on public.treatment_programs (category);

-- 2. Course Products
create table public.course_products (
  course_product_id uuid primary key default gen_random_uuid(),
  course_code text not null unique,
  name text not null,
  description text,
  total_sessions integer not null check (total_sessions > 0),
  selling_price numeric(14,2) not null default 0 check (selling_price >= 0),
  validity_days integer check (validity_days > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by text references public.users(uid),
  updated_at timestamptz not null default now(),
  updated_by text references public.users(uid)
);

-- 3. Course Product to Treatment Programs Mapping (Many-to-Many)
create table public.course_product_programs (
  course_product_id uuid not null references public.course_products(course_product_id) on delete cascade,
  treatment_program_id uuid not null references public.treatment_programs(program_id) on delete cascade,
  primary key (course_product_id, treatment_program_id)
);

-- 4. Course Enrollments (Purchased Packages)
create table public.course_enrollments (
  enrollment_id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(patient_id),
  course_product_id uuid not null references public.course_products(course_product_id),
  course_name_snapshot text not null,
  total_sessions integer not null check (total_sessions > 0),
  used_sessions integer not null default 0 check (used_sessions >= 0 and used_sessions <= total_sessions),
  remaining_sessions integer generated always as (total_sessions - used_sessions) stored,
  purchase_price numeric(14,2) not null check (purchase_price >= 0),
  purchase_invoice_id uuid references public.invoices(invoice_id),
  purchase_invoice_item_id uuid references public.invoice_items(invoice_item_id),
  purchase_idempotency_key text unique,
  purchase_date date not null default current_date,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'active', 'completed', 'expired', 'cancelled')),
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  created_by text references public.users(uid),
  updated_at timestamptz not null default now(),
  updated_by text references public.users(uid)
);

-- 5. Visit Treatments (Clinical Treatment Events)
create table public.visit_treatments (
  visit_treatment_id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(visit_id),
  patient_id uuid not null references public.patients(patient_id),
  program_id uuid references public.treatment_programs(program_id),
  custom_treatment_name text,
  program_name_snapshot text,
  price_snapshot numeric(14,2) not null default 0,
  practitioner_uid text not null references public.users(uid),
  practitioner_role text not null,
  started_at timestamptz,
  completed_at timestamptz,
  status text not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  result text,
  notes text,
  charge_type text check (charge_type in ('pay_per_visit', 'course_covered')),
  course_enrollment_id uuid references public.course_enrollments(enrollment_id),
  created_at timestamptz not null default now(),
  created_by text references public.users(uid),
  updated_at timestamptz not null default now(),
  updated_by text references public.users(uid),
  check (program_id is not null or custom_treatment_name is not null)
);

-- 6. Course Usage History (Immutable Ledger)
create table public.course_usage_history (
  usage_id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('consume', 'reversal')),
  enrollment_id uuid not null references public.course_enrollments(enrollment_id),
  patient_id uuid not null references public.patients(patient_id),
  visit_id uuid references public.visits(visit_id),
  visit_treatment_id uuid references public.visit_treatments(visit_treatment_id),
  sessions_delta integer not null,
  balance_before integer not null,
  balance_after integer not null,
  original_usage_id uuid references public.course_usage_history(usage_id),
  reason text,
  actor_uid text not null references public.users(uid),
  actor_role text not null,
  occurred_at timestamptz not null default now(),
  idempotency_key text unique
);
create unique index course_usage_history_consume_uq on public.course_usage_history (enrollment_id, visit_treatment_id) where entry_type = 'consume' and visit_treatment_id is not null;
create unique index course_usage_history_reversal_uq on public.course_usage_history (original_usage_id) where entry_type = 'reversal';

-- Automated updated_at triggers
create trigger treatment_programs_set_updated_at before update on public.treatment_programs for each row execute function public.set_updated_at();
create trigger course_products_set_updated_at before update on public.course_products for each row execute function public.set_updated_at();
create trigger course_enrollments_set_updated_at before update on public.course_enrollments for each row execute function public.set_updated_at();
create trigger visit_treatments_set_updated_at before update on public.visit_treatments for each row execute function public.set_updated_at();

-- RLS
alter table public.treatment_programs enable row level security;
alter table public.course_products enable row level security;
alter table public.course_product_programs enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.visit_treatments enable row level security;
alter table public.course_usage_history enable row level security;

revoke all on table public.treatment_programs from anon, authenticated;
revoke all on table public.course_products from anon, authenticated;
revoke all on table public.course_product_programs from anon, authenticated;
revoke all on table public.course_enrollments from anon, authenticated;
revoke all on table public.visit_treatments from anon, authenticated;
revoke all on table public.course_usage_history from anon, authenticated;

grant select, insert, update, delete on table public.treatment_programs to service_role;
grant select, insert, update, delete on table public.course_products to service_role;
grant select, insert, update, delete on table public.course_product_programs to service_role;
grant select, insert, update, delete on table public.course_enrollments to service_role;
grant select, insert, update, delete on table public.visit_treatments to service_role;
grant select, insert, update, delete on table public.course_usage_history to service_role;

-- 7. Course Session Consume RPC
create or replace function public.medwell_consume_course_session(
  p_enrollment_id uuid,
  p_visit_treatment_id uuid,
  p_actor text,
  p_actor_roles text[],
  p_idempotency_key text,
  p_result text default null,
  p_notes text default null
) returns public.course_usage_history
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.course_enrollments;
  v_treatment public.visit_treatments;
  v_eligible boolean;
  v_usage public.course_usage_history;
begin
  -- Validate practitioner role
  if not ('physiotherapist' = any(p_actor_roles) or 'thai_traditional_practitioner' = any(p_actor_roles)) then
    raise exception 'UNAUTHORIZED_TREATMENT_ROLE' using errcode = '42501';
  end if;

  select * into v_treatment from public.visit_treatments where visit_treatment_id = p_visit_treatment_id for update;
  if v_treatment is null then raise exception 'TREATMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_treatment.status = 'completed' then raise exception 'TREATMENT_ALREADY_COMPLETED' using errcode = '42200'; end if;
  if v_treatment.practitioner_uid <> p_actor then raise exception 'TREATMENT_AUTHOR_MISMATCH' using errcode = '42200'; end if;

  select * into v_enrollment from public.course_enrollments where enrollment_id = p_enrollment_id for update;
  if v_enrollment is null then raise exception 'ENROLLMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_enrollment.patient_id <> v_treatment.patient_id then raise exception 'PATIENT_MISMATCH' using errcode = '42200'; end if;
  if v_enrollment.status <> 'active' then raise exception 'ENROLLMENT_NOT_ACTIVE' using errcode = '42200'; end if;
  if v_enrollment.expires_at is not null and v_enrollment.expires_at < now() then raise exception 'ENROLLMENT_EXPIRED' using errcode = '42200'; end if;
  if v_enrollment.remaining_sessions <= 0 then raise exception 'NO_REMAINING_SESSIONS' using errcode = '42200'; end if;

  -- Eligibility
  if v_treatment.program_id is null then raise exception 'CUSTOM_TREATMENT_NOT_ELIGIBLE' using errcode = '42200'; end if;
  select exists(select 1 from public.course_product_programs where course_product_id = v_enrollment.course_product_id and treatment_program_id = v_treatment.program_id) into v_eligible;
  if not v_eligible then raise exception 'TREATMENT_NOT_ELIGIBLE_FOR_COURSE' using errcode = '42200'; end if;

  -- Consume
  update public.course_enrollments
  set used_sessions = used_sessions + 1,
      status = case when (total_sessions - (used_sessions + 1)) = 0 then 'completed' else status end,
      updated_by = p_actor
  where enrollment_id = p_enrollment_id;

  insert into public.course_usage_history (
    entry_type, enrollment_id, patient_id, visit_id, visit_treatment_id, sessions_delta, balance_before, balance_after, actor_uid, actor_role, idempotency_key
  ) values (
    'consume', p_enrollment_id, v_enrollment.patient_id, v_treatment.visit_id, p_visit_treatment_id, -1, v_enrollment.remaining_sessions, v_enrollment.remaining_sessions - 1, p_actor, p_actor_roles[1], p_idempotency_key
  ) returning * into v_usage;

  -- Complete and Link treatment to course
  update public.visit_treatments set
    status = 'completed',
    completed_at = now(),
    result = coalesce(p_result, result),
    notes = coalesce(p_notes, notes),
    course_enrollment_id = p_enrollment_id,
    charge_type = 'course_covered',
    updated_by = p_actor
  where visit_treatment_id = p_visit_treatment_id;

  return v_usage;
end;
$$;
revoke execute on function public.medwell_consume_course_session(uuid, uuid, text, text[], text, text, text) from public, anon, authenticated;
grant execute on function public.medwell_consume_course_session(uuid, uuid, text, text[], text, text, text) to service_role;

-- 8. Course Session Reversal RPC
create or replace function public.medwell_reverse_course_session(
  p_usage_id uuid,
  p_reason text,
  p_actor text,
  p_actor_roles text[],
  p_idempotency_key text
) returns public.course_usage_history
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_original public.course_usage_history;
  v_enrollment public.course_enrollments;
  v_reversal public.course_usage_history;
begin
  if not ('admin' = any(p_actor_roles)) then raise exception 'UNAUTHORIZED_ROLE' using errcode = '42501'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'REASON_REQUIRED' using errcode = '42200'; end if;

  select * into v_original from public.course_usage_history where usage_id = p_usage_id;
  if v_original is null or v_original.entry_type <> 'consume' then raise exception 'INVALID_USAGE_RECORD' using errcode = '42200'; end if;

  select * into v_enrollment from public.course_enrollments where enrollment_id = v_original.enrollment_id for update;
  if v_enrollment.used_sessions <= 0 then raise exception 'CANNOT_REVERSE_ZERO_USAGE' using errcode = '42200'; end if;

  update public.course_enrollments
  set used_sessions = used_sessions - 1,
      status = case when status = 'completed' then 'active' else status end,
      updated_by = p_actor
  where enrollment_id = v_original.enrollment_id;

  insert into public.course_usage_history (
    entry_type, enrollment_id, patient_id, visit_id, visit_treatment_id, sessions_delta, balance_before, balance_after, original_usage_id, reason, actor_uid, actor_role, idempotency_key
  ) values (
    'reversal', v_original.enrollment_id, v_original.patient_id, v_original.visit_id, v_original.visit_treatment_id, 1, v_enrollment.remaining_sessions, v_enrollment.remaining_sessions + 1, p_usage_id, p_reason, p_actor, p_actor_roles[1], p_idempotency_key
  ) returning * into v_reversal;

  update public.visit_treatments set course_enrollment_id = null, charge_type = 'pay_per_visit' where visit_treatment_id = v_original.visit_treatment_id;

  return v_reversal;
end;
$$;
revoke execute on function public.medwell_reverse_course_session(uuid, text, text, text[], text) from public, anon, authenticated;
grant execute on function public.medwell_reverse_course_session(uuid, text, text, text[], text) to service_role;

-- 9. Replace medwell_workflow_transition for Phase 4 Treatment/Billing Updates
create or replace function public.medwell_workflow_transition(
  p_visit_id uuid,
  p_expected_stage text,
  p_target_stage text,
  p_actor text,
  p_actor_roles text[]
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_visit public.visits;
  v_screening public.screenings;
  v_invoice_count integer;
  v_unpaid_count integer;
  v_now timestamptz := now();
begin
  if not ('admin' = any(p_actor_roles) or 'clinic_assistant' = any(p_actor_roles) or 'physiotherapist' = any(p_actor_roles) or 'thai_traditional_practitioner' = any(p_actor_roles)) then
    raise exception 'UNAUTHORIZED_ROLE' using errcode = '42501';
  end if;

  select * into v_visit from public.visits where visit_id = p_visit_id for update;
  if v_visit is null then raise exception 'VISIT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_visit.visit_status = 'cancelled' then raise exception 'VISIT_CANCELLED' using errcode = '42200'; end if;
  if v_visit.workflow_stage is null then raise exception 'LEGACY_VISIT_NOT_SUPPORTED' using errcode = '42200'; end if;
  if v_visit.visit_status = 'completed' then raise exception 'VISIT_ALREADY_COMPLETED' using errcode = '42200'; end if;

  if v_visit.workflow_stage <> p_expected_stage then raise exception 'WORKFLOW_STATE_CONFLICT' using errcode = '40900'; end if;

  if (p_expected_stage = 'registration' and p_target_stage = 'screening') or
     (p_expected_stage = 'screening' and p_target_stage = 'history_physical') or
     (p_expected_stage = 'history_physical' and p_target_stage = 'treatment_program') or
     (p_expected_stage = 'treatment_program' and p_target_stage = 'next_appointment') or
     (p_expected_stage = 'next_appointment' and p_target_stage = 'summary_billing') or
     (p_expected_stage = 'summary_billing' and p_target_stage = 'completed') then
    null;
  else
    raise exception 'INVALID_TRANSITION' using errcode = '42200';
  end if;

  if p_target_stage = 'screening' then
    if v_visit.patient_id is null or v_visit.created_by is null then
      raise exception 'REGISTRATION_INCOMPLETE' using errcode = '42200';
    end if;
  end if;

  if p_target_stage = 'history_physical' then
    select * into v_screening from public.screenings where queue_id = v_visit.queue_id;
    if v_screening is null then raise exception 'SCREENING_MISSING' using errcode = '42200'; end if;
    if nullif(trim(v_screening.chief_complaint), '') is null and nullif(trim(v_visit.chief_complaint), '') is null then
      raise exception 'SCREENING_INCOMPLETE' using errcode = '42200';
    end if;
    if v_screening.created_by is null or v_screening.created_at is null then
      raise exception 'SCREENING_AUTHORSHIP_REQUIRED' using errcode = '42200';
    end if;
  end if;

  if p_target_stage = 'treatment_program' then
    if nullif(trim(v_visit.present_illness), '') is null and nullif(trim(v_visit.physical_examination), '') is null then
      raise exception 'HP_INCOMPLETE' using errcode = '42200';
    end if;
    if v_visit.hp_recorded_by is null or v_visit.hp_recorded_at is null then
      raise exception 'HP_AUTHORSHIP_REQUIRED' using errcode = '42200';
    end if;
  end if;

  if p_target_stage = 'next_appointment' then
    -- Prefer structured visit_treatments:
    if not exists(select 1 from public.visit_treatments where visit_id = p_visit_id and status = 'completed') then
      -- Fallback to Phase 3 treatment_plan text
      if nullif(trim(v_visit.treatment_plan), '') is null then
        raise exception 'TREATMENT_INCOMPLETE' using errcode = '42200';
      end if;
    end if;
    if ('clinic_assistant' = any(p_actor_roles) and not ('admin' = any(p_actor_roles) or 'physiotherapist' = any(p_actor_roles) or 'thai_traditional_practitioner' = any(p_actor_roles))) then
      raise exception 'UNAUTHORIZED_TREATMENT_ROLE' using errcode = '42501';
    end if;
  end if;

  if p_target_stage = 'summary_billing' then
    if v_visit.next_appointment_decision is null then raise exception 'NEXT_APPOINTMENT_INCOMPLETE' using errcode = '42200'; end if;
    if v_visit.next_appointment_decision = 'appointment_created' and v_visit.next_appointment_id is null then
      raise exception 'NEXT_APPOINTMENT_MISSING' using errcode = '42200';
    end if;
  end if;

  if p_target_stage = 'completed' then
    if nullif(trim(v_visit.visit_summary), '') is null then raise exception 'VISIT_SUMMARY_REQUIRED' using errcode = '42200'; end if;
    if v_visit.visit_summary_recorded_by is null or v_visit.visit_summary_recorded_at is null then raise exception 'VISIT_SUMMARY_AUTHORSHIP_REQUIRED' using errcode = '42200'; end if;

    select count(*), count(*) filter (where status not in ('paid', 'void') and balance > 0)
    into v_invoice_count, v_unpaid_count
    from public.invoices where visit_id = p_visit_id and status <> 'void';

    if v_invoice_count = 0 then
      if exists(select 1 from public.visit_treatments where visit_id = p_visit_id and status = 'completed' and (charge_type = 'pay_per_visit' or charge_type is null)) then
        raise exception 'UNINVOICED_PAY_PER_VISIT_TREATMENTS' using errcode = '42200';
      end if;

      if not exists(select 1 from public.visit_treatments where visit_id = p_visit_id and status = 'completed') then
        raise exception 'BILLING_GATE_COMPATIBILITY_DEBT' using errcode = '42200';
      end if;

      -- Verify each completed structured treatment has a valid, paid, non-reversed consume ledger entry
      if exists(
        select 1 from public.visit_treatments vt
        where vt.visit_id = p_visit_id and vt.status = 'completed'
        and not exists (
          select 1 from public.course_usage_history cuh
          join public.course_enrollments ce on ce.enrollment_id = cuh.enrollment_id
          join public.course_product_programs cpp on cpp.course_product_id = ce.course_product_id and cpp.treatment_program_id = vt.program_id
          join public.invoices inv on inv.invoice_id = ce.purchase_invoice_id
          where cuh.visit_treatment_id = vt.visit_treatment_id
            and cuh.entry_type = 'consume'
            and ce.patient_id = vt.patient_id
            and ce.status in ('active', 'completed')
            and vt.charge_type = 'course_covered'
            and vt.course_enrollment_id = ce.enrollment_id
            and inv.status = 'paid'
            and not exists (
              select 1 from public.course_usage_history rev
              where rev.original_usage_id = cuh.usage_id and rev.entry_type = 'reversal'
            )
        )
      ) then
        raise exception 'INSUFFICIENT_ZERO_INVOICE_PROOF' using errcode = '42200';
      end if;
    elsif v_unpaid_count > 0 then
      raise exception 'UNPAID_BALANCE' using errcode = '42200';
    end if;
  end if;

  update public.visits
  set workflow_stage = p_target_stage,
      stage_started_at = v_now,
      stage_completed_at = case when p_target_stage = 'completed' then v_now else null end,
      completed_at = case when p_target_stage = 'completed' then v_now else null end,
      updated_by = p_actor
  where visit_id = p_visit_id;

  return jsonb_build_object('visit_id', p_visit_id, 'workflow_stage', p_target_stage, 'timestamp', v_now);
end;
$$;
revoke execute on function public.medwell_workflow_transition(uuid, text, text, text, text[]) from public, anon, authenticated;
grant execute on function public.medwell_workflow_transition(uuid, text, text, text, text[]) to service_role;

-- 10. Atomic Course Product Create
create or replace function public.medwell_create_course_product(
  p_data jsonb,
  p_programs uuid[],
  p_actor text
) returns public.course_products
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.course_products;
  v_pid uuid;
begin
  insert into public.course_products (
    course_code, name, description, total_sessions, selling_price, validity_days, active, created_by, updated_by
  ) values (
    p_data->>'course_code', p_data->>'name', p_data->>'description', (p_data->>'total_sessions')::int, (p_data->>'selling_price')::numeric, (p_data->>'validity_days')::int, coalesce((p_data->>'active')::boolean, true), p_actor, p_actor
  ) returning * into v_product;

  if p_programs is not null and array_length(p_programs, 1) > 0 then
    if (select count(distinct x) from unnest(p_programs) x) <> array_length(p_programs, 1) then
      raise exception 'DUPLICATE_PROGRAM_IDS_NOT_ALLOWED' using errcode = '42200';
    end if;
    if (select count(*) from public.treatment_programs where program_id = any(p_programs)) <> array_length(p_programs, 1) then
      raise exception 'INVALID_PROGRAM_ID' using errcode = '42200';
    end if;
    foreach v_pid in array p_programs loop
      insert into public.course_product_programs (course_product_id, treatment_program_id) values (v_product.course_product_id, v_pid);
    end loop;
  end if;

  return v_product;
end;
$$;
revoke execute on function public.medwell_create_course_product(jsonb, uuid[], text) from public, anon, authenticated;
grant execute on function public.medwell_create_course_product(jsonb, uuid[], text) to service_role;

-- 11. Atomic Course Product Update
create or replace function public.medwell_update_course_product(
  p_id uuid,
  p_data jsonb,
  p_programs uuid[],
  p_actor text
) returns public.course_products
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.course_products;
  v_pid uuid;
begin
  update public.course_products set
    course_code = coalesce(p_data->>'course_code', course_code),
    name = coalesce(p_data->>'name', name),
    description = coalesce(p_data->>'description', description),
    total_sessions = coalesce((p_data->>'total_sessions')::int, total_sessions),
    selling_price = coalesce((p_data->>'selling_price')::numeric, selling_price),
    validity_days = coalesce((p_data->>'validity_days')::int, validity_days),
    active = coalesce((p_data->>'active')::boolean, active),
    updated_by = p_actor
  where course_product_id = p_id
  returning * into v_product;

  if v_product is null then raise exception 'COURSE_PRODUCT_NOT_FOUND' using errcode = 'P0002'; end if;

  if p_programs is not null then
    if array_length(p_programs, 1) > 0 then
      if (select count(distinct x) from unnest(p_programs) x) <> array_length(p_programs, 1) then
        raise exception 'DUPLICATE_PROGRAM_IDS_NOT_ALLOWED' using errcode = '42200';
      end if;
      if (select count(*) from public.treatment_programs where program_id = any(p_programs)) <> array_length(p_programs, 1) then
        raise exception 'INVALID_PROGRAM_ID' using errcode = '42200';
      end if;
    end if;

    delete from public.course_product_programs where course_product_id = p_id;
    if array_length(p_programs, 1) > 0 then
      foreach v_pid in array p_programs loop
        insert into public.course_product_programs (course_product_id, treatment_program_id) values (p_id, v_pid);
      end loop;
    end if;
  end if;

  return v_product;
end;
$$;
revoke execute on function public.medwell_update_course_product(uuid, jsonb, uuid[], text) from public, anon, authenticated;
grant execute on function public.medwell_update_course_product(uuid, jsonb, uuid[], text) to service_role;

-- 12. Atomic Course Purchase Enrollment
create or replace function public.medwell_purchase_course_enrollment(
  p_patient_id uuid,
  p_product_id uuid,
  p_invoice_id uuid,
  p_idempotency_key text,
  p_actor text
) returns public.course_enrollments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.course_products;
  v_invoice public.invoices;
  v_enrollment public.course_enrollments;
  v_invoice_item public.invoice_items;
  v_expires_at timestamptz;
begin
  if p_invoice_id is null then raise exception 'INVOICE_REQUIRED_FOR_PURCHASE' using errcode = '42200'; end if;
  if nullif(trim(p_idempotency_key), '') is null then raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode = '42200'; end if;

  select * into v_enrollment from public.course_enrollments where purchase_idempotency_key = p_idempotency_key;
  if found then return v_enrollment; end if;

  select * into v_invoice from public.invoices where invoice_id = p_invoice_id for update;
  if v_invoice is null then raise exception 'INVOICE_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_invoice.patient_id <> p_patient_id then raise exception 'PATIENT_MISMATCH' using errcode = '42200'; end if;
  if v_invoice.status = 'void' then raise exception 'INVOICE_VOIDED' using errcode = '42200'; end if;

  select * into v_product from public.course_products where course_product_id = p_product_id;
  if v_product is null or not v_product.active then raise exception 'PRODUCT_NOT_AVAILABLE' using errcode = 'P0002'; end if;

  if v_product.validity_days is not null then
    v_expires_at := (now() at time zone 'Asia/Bangkok')::date + v_product.validity_days;
  end if;

  insert into public.course_enrollments (
    patient_id, course_product_id, course_name_snapshot, total_sessions, purchase_price, purchase_invoice_id, purchase_idempotency_key, expires_at, status, created_by, updated_by
  ) values (
    p_patient_id, p_product_id, v_product.name, v_product.total_sessions, v_product.selling_price, p_invoice_id, p_idempotency_key, v_expires_at, 'pending_payment', p_actor, p_actor
  ) returning * into v_enrollment;

  insert into public.invoice_items (
    invoice_id, item_type, reference_id, item_code, item_name, quantity, unit_price, discount, total, created_by
  ) values (
    p_invoice_id, 'course_purchase', v_enrollment.enrollment_id::text, v_product.course_code, v_product.name, 1, v_product.selling_price, 0, v_product.selling_price, p_actor
  ) returning * into v_invoice_item;

  update public.course_enrollments set purchase_invoice_item_id = v_invoice_item.invoice_item_id where enrollment_id = v_enrollment.enrollment_id;
  v_enrollment.purchase_invoice_item_id := v_invoice_item.invoice_item_id;

  update public.invoices set
    subtotal = subtotal + v_product.selling_price,
    grand_total = grand_total + v_product.selling_price,
    balance = balance + v_product.selling_price,
    status = case when (balance + v_product.selling_price) > 0 and status = 'paid' then 'partially_paid' else status end,
    updated_by = p_actor
  where invoice_id = p_invoice_id;

  return v_enrollment;
end;
$$;
revoke execute on function public.medwell_purchase_course_enrollment(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.medwell_purchase_course_enrollment(uuid, uuid, uuid, text, text) to service_role;

-- 13. Replace medwell_record_payment for Authoritative Course Activation
create or replace function public.medwell_record_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text,
  p_notes text,
  p_idempotency_key text,
  p_actor text
) returns public.payments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv public.invoices;
  rx public.prescriptions;
  q public.queues;
  existing_payment public.payments;
  created_payment public.payments;
begin
  if p_amount <= 0 then
    raise exception 'INVALID_PAYMENT' using errcode = '22023';
  end if;
  select * into existing_payment from public.payments where idempotency_key = p_idempotency_key;
  if found then return existing_payment; end if;

  select * into inv from public.invoices where invoice_id = p_invoice_id for update;
  if inv.balance < p_amount then
    raise exception 'PAYMENT_EXCEEDS_BALANCE' using errcode = '23514';
  end if;

  insert into public.payments (invoice_id, amount, payment_method, reference_number, received_by, notes, idempotency_key)
  values (p_invoice_id, p_amount, p_method, p_reference, p_actor, p_notes, p_idempotency_key)
  returning * into created_payment;

  update public.invoices set
    paid_amount = paid_amount + p_amount,
    balance = balance - p_amount,
    status = case when (balance - p_amount) = 0 then 'paid' else 'partial' end,
    updated_by = p_actor
  where invoice_id = p_invoice_id;

  if (inv.balance - p_amount) = 0 then
    -- Authoritative Payment Activation for Phase 4 Courses
    update public.course_enrollments
    set status = 'active', activated_at = now(), updated_by = p_actor
    where purchase_invoice_id = p_invoice_id and status = 'pending_payment';

    select * into rx from public.prescriptions where visit_id = inv.visit_id order by created_at desc limit 1;
    if rx is not null then
      select * into q from public.queues where queue_id = rx.queue_id;
      if q is not null and q.current_status = 'waiting_payment' then
        if rx.status = 'dispensed' then
          update public.queues set current_status = 'completed', completed_time = now(), updated_by = p_actor where queue_id = q.queue_id;
          update public.visits set visit_status = 'completed', closed_at = now(), closed_by = p_actor, updated_by = p_actor where visit_id = inv.visit_id and visit_status = 'open';
        else
          update public.queues set current_status = 'waiting_pharmacy', current_station = 'pharmacy', updated_by = p_actor where queue_id = q.queue_id;
        end if;
      end if;
    else
      if inv.visit_id is not null then
        update public.visits set visit_status = 'completed', closed_at = now(), closed_by = p_actor, updated_by = p_actor where visit_id = inv.visit_id and visit_status = 'open';
        select * into q from public.queues where appointment_id = (select appointment_id from public.appointments where patient_id = inv.patient_id limit 1);
      end if;
    end if;
  end if;

  return created_payment;
end;
$$;
revoke execute on function public.medwell_record_payment(uuid, numeric, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.medwell_record_payment(uuid, numeric, text, text, text, text, text) to service_role;
