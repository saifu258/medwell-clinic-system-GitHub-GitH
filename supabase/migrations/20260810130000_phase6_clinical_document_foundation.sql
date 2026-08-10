-- =========================================================================================
-- Phase 6: Clinical Documents, Medical Certificates & Localization Foundation
-- =========================================================================================

-- 1. PROFESSIONAL PROFILES
create table public.user_professional_profiles (
  uid text primary key references public.users(uid) on delete cascade,
  professional_title_th text,
  professional_title_en text,
  license_number text,
  signature_display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by text references public.users(uid),
  updated_at timestamptz not null default now(),
  updated_by text references public.users(uid)
);

alter table public.user_professional_profiles enable row level security;
grant select, insert, update on table public.user_professional_profiles to service_role;
revoke all on table public.user_professional_profiles from public, anon, authenticated;

-- 2. MEDICAL CERTIFICATES
create table public.medical_certificates (
  certificate_id uuid primary key default gen_random_uuid(),
  certificate_number text unique,
  patient_id uuid not null references public.patients(patient_id),
  visit_id uuid not null references public.visits(visit_id),

  -- Identity
  clinical_author_uid text not null references public.users(uid),
  clinical_author_role text not null check (clinical_author_role in ('physiotherapist', 'thai_traditional_practitioner')),

  -- Issuance Context
  status text not null default 'draft' check (status in ('draft', 'issued', 'cancelled')),
  issued_by text references public.users(uid),
  issued_at timestamptz,
  issue_idempotency_key text unique,

  -- Clinical Content
  diagnosis_snapshot text,
  treatment_summary_snapshot text,
  recommendation text,
  leave_start_date date,
  leave_end_date date check (leave_end_date >= leave_start_date),
  language text not null default 'th' check (language in ('th', 'en')),

  -- Historical Snapshots (Minimal PII for Integrity)
  patient_name_snapshot text,
  patient_identifier_snapshot text,
  practitioner_title_snapshot text,
  practitioner_license_snapshot text,
  clinic_name_snapshot text,
  clinic_address_snapshot text,
  clinic_phone_snapshot text,

  -- Cancellation
  cancelled_by text references public.users(uid),
  cancelled_at timestamptz,
  cancellation_reason text,

  created_at timestamptz not null default now(),
  created_by text references public.users(uid),
  updated_at timestamptz not null default now(),
  updated_by text references public.users(uid)
);

create index medical_certificates_patient_idx on public.medical_certificates(patient_id);
create index medical_certificates_visit_idx on public.medical_certificates(visit_id);
create index medical_certificates_author_idx on public.medical_certificates(clinical_author_uid);

alter table public.medical_certificates enable row level security;
grant select, insert, update on table public.medical_certificates to service_role;
revoke all on table public.medical_certificates from public, anon, authenticated;

-- Initialize high-water sequence for certificates (global, no reset)
insert into public.counters (counter_key, date_key, last_value)
values ('global_certificate', '2000-01-01', 0)
on conflict (counter_key, date_key) do nothing;

-- 3. RPC: Issue Medical Certificate (Atomic, Idempotent)
create or replace function public.medwell_issue_medical_certificate(
  p_certificate_id uuid,
  p_issued_by text,
  p_idempotency_key text
) returns public.medical_certificates
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cert public.medical_certificates;
  v_patient public.patients;
  v_profile public.user_professional_profiles;
  v_seq int;
  v_cert_number text;
  v_clinic_name text;
  v_clinic_address text;
  v_clinic_phone text;
  v_current_month text;
  v_existing_issue public.medical_certificates;
begin
  -- Idempotency Check
  if p_idempotency_key is not null then
    select * into v_existing_issue
    from public.medical_certificates
    where issue_idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return v_existing_issue;
    end if;
  end if;

  -- Lock Draft
  select * into v_cert
  from public.medical_certificates
  where certificate_id = p_certificate_id
  for update;

  if not found then
    raise exception 'DOCUMENT_NOT_FOUND';
  end if;

  if v_cert.status != 'draft' then
    raise exception 'DOCUMENT_NOT_DRAFT';
  end if;

  -- Fetch Authoritative Snapshots
  select * into v_patient from public.patients where patient_id = v_cert.patient_id;
  select * into v_profile from public.user_professional_profiles where uid = v_cert.clinical_author_uid;

  select value#>>'{}' into v_clinic_name from public.clinic_settings where key = 'clinicNameTh';
  select value#>>'{}' into v_clinic_address from public.clinic_settings where key = 'clinicAddressTh';
  select value#>>'{}' into v_clinic_phone from public.clinic_settings where key = 'clinicPhone';

  -- Global High-Water Counter (MC-YYYYMM-XXXXXX format, sequence NEVER resets)
  update public.counters
  set last_value = last_value + 1
  where counter_key = 'global_certificate' and date_key = '2000-01-01'
  returning last_value into v_seq;

  v_current_month := to_char((now() at time zone 'Asia/Bangkok'), 'YYYYMM');
  v_cert_number := 'MC-' || v_current_month || '-' || lpad(v_seq::text, 6, '0');

  -- Final Update
  update public.medical_certificates
  set
    status = 'issued',
    certificate_number = v_cert_number,
    issued_by = p_issued_by,
    issued_at = now(),
    issue_idempotency_key = p_idempotency_key,
    patient_name_snapshot = trim(coalesce(v_patient.title, '') || ' ' || v_patient.first_name || ' ' || v_patient.last_name),
    patient_identifier_snapshot = coalesce(v_patient.citizen_id, v_patient.passport_number),
    practitioner_title_snapshot = case
      when v_cert.language = 'en' then coalesce(v_profile.professional_title_en, v_profile.professional_title_th)
      else coalesce(v_profile.professional_title_th, v_profile.professional_title_en)
    end,
    practitioner_license_snapshot = v_profile.license_number,
    clinic_name_snapshot = v_clinic_name,
    clinic_address_snapshot = v_clinic_address,
    clinic_phone_snapshot = v_clinic_phone,
    updated_at = now(),
    updated_by = p_issued_by
  where certificate_id = p_certificate_id
  returning * into v_cert;

  -- Audit log insert is handled by API route
  return v_cert;
end;
$$;
revoke execute on function public.medwell_issue_medical_certificate(uuid, text, text) from public, anon, authenticated;
grant execute on function public.medwell_issue_medical_certificate(uuid, text, text) to service_role;

-- 4. RPC: Cancel Medical Certificate (Admin Only)
create or replace function public.medwell_cancel_medical_certificate(
  p_certificate_id uuid,
  p_reason text,
  p_cancelled_by text
) returns public.medical_certificates
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cert public.medical_certificates;
begin
  if nullif(trim(p_reason), '') is null then
    raise exception 'REASON_REQUIRED';
  end if;

  select * into v_cert
  from public.medical_certificates
  where certificate_id = p_certificate_id
  for update;

  if not found then
    raise exception 'DOCUMENT_NOT_FOUND';
  end if;

  if v_cert.status != 'issued' then
    raise exception 'DOCUMENT_NOT_ISSUED';
  end if;

  update public.medical_certificates
  set
    status = 'cancelled',
    cancelled_by = p_cancelled_by,
    cancelled_at = now(),
    cancellation_reason = p_reason,
    updated_at = now(),
    updated_by = p_cancelled_by
  where certificate_id = p_certificate_id
  returning * into v_cert;

  return v_cert;
end;
$$;
revoke execute on function public.medwell_cancel_medical_certificate(uuid, text, text) from public, anon, authenticated;
grant execute on function public.medwell_cancel_medical_certificate(uuid, text, text) to service_role;
