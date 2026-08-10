-- Phase 5 Financial Foundation Migration

-- 1. Constraints on existing tables
create unique index invoice_items_treatment_uq on public.invoice_items (reference_id) where item_type = 'treatment' and reference_id is not null;
create unique index invoice_items_course_uq on public.invoice_items (reference_id) where item_type = 'course_purchase' and reference_id is not null;
alter table public.payments add constraint payments_method_check check (payment_method in ('cash', 'transfer', 'card', 'qr'));

-- 2. Global High-Water Counter for Receipts
insert into public.counters (counter_key, date_key, last_value)
values ('global_receipt', '2000-01-01', 0)
on conflict (counter_key, date_key) do nothing;

-- 3. New Tables
create table public.receipts (
  receipt_id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  invoice_id uuid not null references public.invoices(invoice_id),
  payment_id uuid not null references public.payments(payment_id) unique,
  amount numeric(14,2) not null check (amount > 0),
  issued_at timestamptz not null default now(),
  issued_by text not null references public.users(uid),
  created_at timestamptz not null default now()
);

create table public.refunds (
  refund_id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(invoice_id),
  payment_id uuid not null references public.payments(payment_id),
  amount numeric(14,2) not null check (amount > 0),
  reason text not null,
  idempotency_key text not null unique,
  refunded_at timestamptz not null default now(),
  refunded_by text not null references public.users(uid),
  created_at timestamptz not null default now()
);

create table public.expenses (
  expense_id uuid primary key default gen_random_uuid(),
  expense_date timestamptz not null default now(),
  amount numeric(14,2) not null check (amount > 0),
  category text not null,
  description text,
  payment_method text not null check (payment_method in ('cash', 'transfer', 'card', 'qr')),
  status text not null default 'approved' check (status in ('pending', 'approved', 'cancelled')),
  recorded_by text not null references public.users(uid),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text references public.users(uid)
);

create table public.daily_closings (
  closing_id uuid primary key default gen_random_uuid(),
  business_date date not null unique,
  gross_payments numeric(14,2) not null default 0,
  total_refunds numeric(14,2) not null default 0,
  net_receipts numeric(14,2) not null default 0,
  cash_payments numeric(14,2) not null default 0,
  cash_refunds numeric(14,2) not null default 0,
  cash_expenses numeric(14,2) not null default 0,
  expected_cash numeric(14,2) not null default 0,
  actual_cash numeric(14,2) not null default 0,
  variance numeric(14,2) not null default 0,
  closed_at timestamptz not null default now(),
  closed_by text not null references public.users(uid),
  created_at timestamptz not null default now()
);

create table public.visit_financial_dispositions (
  visit_id uuid primary key references public.visits(visit_id),
  disposition text not null check (disposition in ('billable', 'course_covered', 'no_charge')),
  reason text,
  approved_by text references public.users(uid),
  created_at timestamptz not null default now()
);

-- RLS setup
do $$
declare table_name text;
begin
  foreach table_name in array array['receipts', 'refunds', 'expenses', 'daily_closings', 'visit_financial_dispositions'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
  end loop;
end;
$$;

-- 4. Financial Evaluator RPC
create or replace function public.medwell_evaluate_visit_financial_status(
  p_visit_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_disposition public.visit_financial_dispositions;
  v_visit public.visits;
  v_unpaid_invoice boolean := false;
  v_unbilled_ppv boolean := false;
  v_invalid_coverage boolean := false;
  v_blocking_reasons text[] := '{}';
begin
  select * into v_visit from public.visits where visit_id = p_visit_id;
  if not found then raise exception 'VISIT_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into v_disposition from public.visit_financial_dispositions where visit_id = p_visit_id;
  if found and v_disposition.disposition = 'no_charge' then
    return jsonb_build_object(
      'financially_satisfied', true,
      'blocking_reasons', '{}'::text[],
      'disposition', 'no_charge'
    );
  end if;

  if exists(select 1 from public.invoices where visit_id = p_visit_id and status not in ('paid', 'void') and balance > 0) then
    v_unpaid_invoice := true;
    v_blocking_reasons := array_append(v_blocking_reasons, 'UNPAID_INVOICE_BALANCE');
  end if;

  if exists(
    select 1 from public.visit_treatments vt
    where vt.visit_id = p_visit_id and vt.status = 'completed' and (vt.charge_type = 'pay_per_visit' or vt.charge_type is null)
    and not exists (
      select 1 from public.invoice_items ii
      join public.invoices inv on inv.invoice_id = ii.invoice_id
      where ii.item_type = 'treatment' and ii.reference_id = vt.visit_treatment_id::text
      and inv.status <> 'void'
    )
  ) then
    v_unbilled_ppv := true;
    v_blocking_reasons := array_append(v_blocking_reasons, 'UNBILLED_PAY_PER_VISIT_TREATMENTS');
  end if;

  if exists(
    select 1 from public.visit_treatments vt
    where vt.visit_id = p_visit_id and vt.status = 'completed' and vt.charge_type = 'course_covered'
    and not exists (
      select 1 from public.course_usage_history cuh
      join public.course_enrollments ce on ce.enrollment_id = cuh.enrollment_id
      join public.course_product_programs cpp on cpp.course_product_id = ce.course_product_id and cpp.treatment_program_id = vt.program_id
      join public.invoices inv on inv.invoice_id = ce.purchase_invoice_id
      where cuh.visit_treatment_id = vt.visit_treatment_id
        and cuh.entry_type = 'consume'
        and ce.patient_id = vt.patient_id
        and ce.status in ('active', 'completed')
        and vt.course_enrollment_id = ce.enrollment_id
        and inv.status = 'paid'
        and not exists (
          select 1 from public.course_usage_history rev
          where rev.original_usage_id = cuh.usage_id and rev.entry_type = 'reversal'
        )
    )
  ) then
    v_invalid_coverage := true;
    v_blocking_reasons := array_append(v_blocking_reasons, 'INVALID_OR_REVERSED_COURSE_COVERAGE');
  end if;

  return jsonb_build_object(
    'financially_satisfied', array_length(v_blocking_reasons, 1) is null,
    'blocking_reasons', coalesce(v_blocking_reasons, '{}'::text[])
  );
end;
$$;
revoke execute on function public.medwell_evaluate_visit_financial_status(uuid) from public, anon, authenticated;
grant execute on function public.medwell_evaluate_visit_financial_status(uuid) to service_role;

-- 5. Updated medwell_workflow_transition to use evaluator
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
  v_now timestamptz := now();
  v_eval jsonb;
begin
  if not ('admin' = any(p_actor_roles) or 'physiotherapist' = any(p_actor_roles) or 'thai_traditional_practitioner' = any(p_actor_roles) or 'clinic_assistant' = any(p_actor_roles)) then
    raise exception 'UNAUTHORIZED_ROLE' using errcode = '42501';
  end if;

  select * into v_visit from public.visits where visit_id = p_visit_id for update;
  if not found then raise exception 'VISIT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_visit.visit_status = 'cancelled' then raise exception 'VISIT_CANCELLED' using errcode = '42200'; end if;
  if v_visit.workflow_stage is null then raise exception 'LEGACY_VISIT_NOT_SUPPORTED' using errcode = '42200'; end if;
  if v_visit.visit_status = 'completed' then raise exception 'VISIT_ALREADY_COMPLETED' using errcode = '42200'; end if;

  if v_visit.workflow_stage is distinct from p_expected_stage then
    raise exception 'WORKFLOW_STATE_CONFLICT' using errcode = '42200';
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
    if not exists(select 1 from public.visit_treatments where visit_id = p_visit_id and status = 'completed') then
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

    v_eval := public.medwell_evaluate_visit_financial_status(p_visit_id);
    if (v_eval->>'financially_satisfied')::boolean = false then
      raise exception 'FINANCIAL_NOT_SATISFIED' using errcode = '42200';
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

-- 6. Atomic Invoice Creation V2
create or replace function public.medwell_create_invoice_v2(
  p_visit_id uuid,
  p_patient_id uuid,
  p_invoice_number text,
  p_items jsonb,
  p_discount numeric,
  p_tax numeric,
  p_notes text,
  p_actor text
) returns public.invoices
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice public.invoices;
  v_item record;
  v_subtotal numeric := 0;
  v_grand_total numeric := 0;
  v_qty numeric;
  v_disc numeric;
  v_price numeric;
  v_total numeric;
  v_name text;
  v_code text;
  v_treatment public.visit_treatments;
  v_enrollment public.course_enrollments;
  v_service public.services;
  v_invoice_date date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
begin
  if p_discount < 0 or p_tax < 0 then raise exception 'INVALID_DISCOUNT_OR_TAX' using errcode = '22023'; end if;

  insert into public.invoices (invoice_number, visit_id, patient_id, invoice_date, subtotal, discount, tax, grand_total, balance, status, notes, created_by, updated_by)
  values (p_invoice_number, p_visit_id, p_patient_id, v_invoice_date, 0, p_discount, p_tax, 0, 0, 'unpaid', coalesce(p_notes, ''), p_actor, p_actor)
  returning * into v_invoice;

  for v_item in select * from jsonb_to_recordset(p_items) as x(item_type text, reference_id text, quantity numeric, discount numeric) loop
    v_qty := coalesce(v_item.quantity, 1);
    v_disc := coalesce(v_item.discount, 0);
    if v_qty <= 0 or v_disc < 0 then raise exception 'INVALID_ITEM_QUANTITY_OR_DISCOUNT' using errcode = '22023'; end if;

    if v_item.item_type = 'treatment' then
      select * into v_treatment from public.visit_treatments where visit_treatment_id = (v_item.reference_id)::uuid for update;
      if not found then raise exception 'TREATMENT_NOT_FOUND' using errcode = 'P0002'; end if;
      if v_treatment.visit_id <> p_visit_id or v_treatment.patient_id <> p_patient_id then raise exception 'TREATMENT_OWNERSHIP_MISMATCH' using errcode = '42200'; end if;
      if v_treatment.status <> 'completed' then raise exception 'TREATMENT_NOT_COMPLETED' using errcode = '42200'; end if;
      if v_treatment.charge_type = 'course_covered' then raise exception 'TREATMENT_COURSE_COVERED' using errcode = '42200'; end if;

      v_price := coalesce(v_treatment.price_snapshot, 0);
      v_name := 'Treatment';
      v_code := 'TRT';

    elsif v_item.item_type = 'course_purchase' then
      select * into v_enrollment from public.course_enrollments where enrollment_id = (v_item.reference_id)::uuid for update;
      if not found then raise exception 'ENROLLMENT_NOT_FOUND' using errcode = 'P0002'; end if;
      if v_enrollment.patient_id <> p_patient_id then raise exception 'ENROLLMENT_OWNERSHIP_MISMATCH' using errcode = '42200'; end if;

      v_price := coalesce(v_enrollment.purchase_price, 0);
      v_name := 'Course Purchase';
      v_code := 'CRS';

    elsif v_item.item_type = 'service' then
      select * into v_service from public.services where service_id = (v_item.reference_id)::uuid;
      if not found then raise exception 'SERVICE_NOT_FOUND' using errcode = 'P0002'; end if;
      v_price := coalesce(v_service.standard_price, 0);
      v_name := coalesce(v_service.service_name, 'General Service');
      v_code := coalesce(v_service.service_code, 'SRV');

    else
      raise exception 'UNSUPPORTED_ITEM_TYPE' using errcode = '22023';
    end if;

    v_total := (v_qty * v_price) - v_disc;
    if v_total < 0 then raise exception 'NEGATIVE_ITEM_TOTAL' using errcode = '22023'; end if;

    insert into public.invoice_items (invoice_id, item_type, reference_id, item_code, item_name, quantity, unit_price, discount, total, created_by)
    values (v_invoice.invoice_id, v_item.item_type, v_item.reference_id, v_code, v_name, v_qty, v_price, v_disc, v_total, p_actor);

    v_subtotal := v_subtotal + v_total;
  end loop;

  if v_subtotal < p_discount then raise exception 'DISCOUNT_EXCEEDS_SUBTOTAL' using errcode = '22023'; end if;
  v_grand_total := v_subtotal - p_discount + p_tax;

  update public.invoices
  set subtotal = v_subtotal, grand_total = v_grand_total, balance = v_grand_total
  where invoice_id = v_invoice.invoice_id
  returning * into v_invoice;

  return v_invoice;
end;
$$;
revoke execute on function public.medwell_create_invoice_v2(uuid, uuid, text, jsonb, numeric, numeric, text, text) from public, anon, authenticated;
grant execute on function public.medwell_create_invoice_v2(uuid, uuid, text, jsonb, numeric, numeric, text, text) to service_role;

-- 7. Payment and Atomic Receipt Issuance
create or replace function public.medwell_record_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text,
  p_notes text,
  p_idempotency_key text,
  p_actor text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice public.invoices;
  v_payment public.payments;
  v_receipt public.receipts;
  v_new_balance numeric;
  v_new_status text;
  v_counter bigint;
  v_receipt_number text;
  v_now timestamptz := now();
begin
  if p_amount <= 0 then raise exception 'INVALID_PAYMENT_AMOUNT' using errcode = '22023'; end if;

  select * into v_payment from public.payments where idempotency_key = p_idempotency_key;
  if found then
    select * into v_receipt from public.receipts where payment_id = v_payment.payment_id;
    return jsonb_build_object('payment', v_payment, 'receipt', v_receipt);
  end if;

  select * into v_invoice from public.invoices where invoice_id = p_invoice_id for update;
  if not found then raise exception 'INVOICE_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_invoice.status = 'void' then raise exception 'INVOICE_VOIDED' using errcode = '42200'; end if;
  if p_amount > v_invoice.balance then raise exception 'AMOUNT_EXCEEDS_BALANCE' using errcode = '42200'; end if;

  v_new_balance := v_invoice.balance - p_amount;
  if v_new_balance = 0 then v_new_status := 'paid'; else v_new_status := 'partially_paid'; end if;

  insert into public.payments (invoice_id, amount, payment_method, reference_number, received_by, notes, idempotency_key)
  values (p_invoice_id, p_amount, p_method, p_reference, p_actor, p_notes, p_idempotency_key)
  returning * into v_payment;

  update public.invoices
  set balance = v_new_balance, paid_amount = coalesce(paid_amount, 0) + p_amount, status = v_new_status, updated_by = p_actor
  where invoice_id = p_invoice_id;

  if v_new_status = 'paid' then
    update public.course_enrollments ce
    set status = 'active', updated_by = p_actor
    from public.invoice_items ii
    where ii.invoice_id = p_invoice_id
      and ii.item_type = 'course_purchase'
      and ce.enrollment_id = (ii.reference_id)::uuid
      and ce.status = 'draft';
  end if;

  update public.counters
  set last_value = last_value + 1
  where counter_key = 'global_receipt' and date_key = '2000-01-01'
  returning last_value into v_counter;

  v_receipt_number := 'RC-' || to_char(v_now AT TIME ZONE 'Asia/Bangkok', 'YYYYMM') || '-' || lpad(v_counter::text, 6, '0');

  insert into public.receipts (receipt_number, invoice_id, payment_id, amount, issued_by)
  values (v_receipt_number, p_invoice_id, v_payment.payment_id, p_amount, p_actor)
  returning * into v_receipt;

  return jsonb_build_object('payment', v_payment, 'receipt', v_receipt);
end;
$$;
revoke execute on function public.medwell_record_payment(uuid, numeric, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.medwell_record_payment(uuid, numeric, text, text, text, text, text) to service_role;

-- 8. Refund Logic
create or replace function public.medwell_issue_refund(
  p_invoice_id uuid,
  p_payment_id uuid,
  p_amount numeric,
  p_reason text,
  p_idempotency_key text,
  p_actor text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_refund public.refunds;
  v_payment public.payments;
  v_invoice public.invoices;
  v_prior_refunds numeric := 0;
  v_refundable numeric;
begin
  if p_amount <= 0 then raise exception 'INVALID_REFUND_AMOUNT' using errcode = '22023'; end if;
  if p_reason is null or trim(p_reason) = '' then raise exception 'REFUND_REASON_REQUIRED' using errcode = '22023'; end if;

  select * into v_refund from public.refunds where idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('refund', v_refund); end if;

  select * into v_invoice from public.invoices where invoice_id = p_invoice_id for update;
  if not found then raise exception 'INVOICE_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into v_payment from public.payments where payment_id = p_payment_id for update;
  if not found or v_payment.invoice_id <> p_invoice_id then raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0002'; end if;

  select coalesce(sum(amount), 0) into v_prior_refunds from public.refunds where payment_id = p_payment_id;
  v_refundable := v_payment.amount - v_prior_refunds;

  if p_amount > v_refundable then raise exception 'AMOUNT_EXCEEDS_REFUNDABLE' using errcode = '42200'; end if;

  if exists(
    select 1 from public.invoice_items ii
    join public.course_enrollments ce on ce.enrollment_id = (ii.reference_id)::uuid
    where ii.invoice_id = p_invoice_id and ii.item_type = 'course_purchase'
    and exists (select 1 from public.course_usage_history cuh where cuh.enrollment_id = ce.enrollment_id and cuh.entry_type = 'consume')
  ) then
    raise exception 'COURSE_USAGE_RECONCILIATION_REQUIRED' using errcode = '42200';
  end if;

  insert into public.refunds (invoice_id, payment_id, amount, reason, idempotency_key, refunded_by)
  values (p_invoice_id, p_payment_id, p_amount, p_reason, p_idempotency_key, p_actor)
  returning * into v_refund;

  update public.course_enrollments ce
  set status = 'cancelled', updated_by = p_actor
  from public.invoice_items ii
  where ii.invoice_id = p_invoice_id and ii.item_type = 'course_purchase' and ce.enrollment_id = (ii.reference_id)::uuid;

  return jsonb_build_object('refund', v_refund);
end;
$$;
revoke execute on function public.medwell_issue_refund(uuid, uuid, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.medwell_issue_refund(uuid, uuid, numeric, text, text, text) to service_role;

-- 9. Void Invoice V2
create or replace function public.medwell_void_invoice_v2(
  p_invoice_id uuid,
  p_reason text,
  p_actor text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice public.invoices;
  v_paid numeric;
  v_refunded numeric;
begin
  if p_reason is null or trim(p_reason) = '' then raise exception 'VOID_REASON_REQUIRED' using errcode = '22023'; end if;

  select * into v_invoice from public.invoices where invoice_id = p_invoice_id for update;
  if not found then raise exception 'INVOICE_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_invoice.status = 'void' then raise exception 'INVOICE_ALREADY_VOIDED' using errcode = '42200'; end if;

  v_paid := coalesce(v_invoice.paid_amount, 0);
  select coalesce(sum(amount), 0) into v_refunded from public.refunds where invoice_id = p_invoice_id;

  if v_paid > v_refunded then raise exception 'FINANCIAL_RECONCILIATION_REQUIRED' using errcode = '42200'; end if;

  update public.invoices
  set status = 'void', void_reason = p_reason, voided_at = now(), voided_by = p_actor, updated_by = p_actor
  where invoice_id = p_invoice_id
  returning * into v_invoice;

  return to_jsonb(v_invoice);
end;
$$;
revoke execute on function public.medwell_void_invoice_v2(uuid, text, text) from public, anon, authenticated;
grant execute on function public.medwell_void_invoice_v2(uuid, text, text) to service_role;

-- 10. Close Business Day
create or replace function public.medwell_close_business_day(
  p_date date,
  p_actual_cash numeric,
  p_actor text
) returns public.daily_closings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_closing public.daily_closings;
  v_gross numeric;
  v_total_refunds numeric;
  v_net numeric;
  v_cash_pay numeric;
  v_cash_ref numeric;
  v_cash_exp numeric;
  v_expected numeric;
  v_variance numeric;
begin
  if exists (select 1 from public.daily_closings where business_date = p_date) then
    raise exception 'DAILY_CLOSING_LOCKED' using errcode = '42200';
  end if;

  select coalesce(sum(amount), 0) into v_gross from public.payments where (payment_date AT TIME ZONE 'Asia/Bangkok')::date = p_date;
  select coalesce(sum(amount), 0) into v_cash_pay from public.payments where (payment_date AT TIME ZONE 'Asia/Bangkok')::date = p_date and payment_method = 'cash';

  select coalesce(sum(amount), 0) into v_total_refunds from public.refunds where (refunded_at AT TIME ZONE 'Asia/Bangkok')::date = p_date;
  select coalesce(sum(r.amount), 0) into v_cash_ref from public.refunds r join public.payments p on p.payment_id = r.payment_id where (r.refunded_at AT TIME ZONE 'Asia/Bangkok')::date = p_date and p.payment_method = 'cash';

  select coalesce(sum(amount), 0) into v_cash_exp from public.expenses where (expense_date AT TIME ZONE 'Asia/Bangkok')::date = p_date and payment_method = 'cash' and status = 'approved';

  v_net := v_gross - v_total_refunds;
  v_expected := v_cash_pay - v_cash_ref - v_cash_exp;
  v_variance := p_actual_cash - v_expected;

  insert into public.daily_closings (business_date, gross_payments, total_refunds, net_receipts, cash_payments, cash_refunds, cash_expenses, expected_cash, actual_cash, variance, closed_by)
  values (p_date, v_gross, v_total_refunds, v_net, v_cash_pay, v_cash_ref, v_cash_exp, v_expected, p_actual_cash, v_variance, p_actor)
  returning * into v_closing;

  return v_closing;
end;
$$;
revoke execute on function public.medwell_close_business_day(date, numeric, text) from public, anon, authenticated;
grant execute on function public.medwell_close_business_day(date, numeric, text) to service_role;
