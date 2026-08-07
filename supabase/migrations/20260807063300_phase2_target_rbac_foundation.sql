-- Drop existing check constraint and replace with extended one
alter table public.google_role_approvals drop constraint if exists google_role_approvals_approved_role_check;
alter table public.google_role_approvals add constraint google_role_approvals_approved_role_check
  check (approved_role in (
    'physiotherapist', 'thai_traditional_practitioner', 'clinic_assistant',
    'receptionist', 'nurse', 'doctor', 'pharmacist', 'cashier'
  ));

-- Update medwell_claim_google_role to ONLY accept the three target roles (non-admin)
create or replace function public.medwell_claim_google_role(
  p_uid text,
  p_email text,
  p_display_name text,
  p_photo_url text,
  p_role text,
  p_provider text
) returns public.users
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_approval public.google_role_approvals;
  v_existing public.users;
  v_created public.users;
begin
  if p_provider <> 'google.com' then
    raise exception using errcode = 'P0001', message = 'GOOGLE_PROVIDER_REQUIRED';
  end if;

  -- ONLY TARGET ROLES ALLOWED FOR NEW ASSIGNMENT
  if p_role is null or p_role not in ('physiotherapist', 'thai_traditional_practitioner', 'clinic_assistant') then
    raise exception using errcode = 'P0001', message = 'ROLE_NOT_ALLOWED';
  end if;

  select * into v_existing
  from public.users
  where uid = p_uid or lower(email) = v_email
  order by (uid = p_uid) desc
  limit 1;

  if found then
    if v_existing.uid = p_uid
       and v_existing.active
       and v_existing.auth_provider = 'google.com'
       and v_existing.roles = array[p_role]::text[]
       and v_existing.role_selection_completed then
      return v_existing;
    end if;
    raise exception using errcode = 'P0001', message = 'ROLE_ALREADY_SELECTED';
  end if;

  select * into v_approval
  from public.google_role_approvals
  where email = v_email
  for update;

  if not found or not v_approval.active or v_approval.used_by is not null or v_approval.approved_role <> p_role then
    raise exception using errcode = 'P0001', message = 'ROLE_APPROVAL_DENIED';
  end if;

  insert into public.users (
    uid, email, display_name, photo_url, auth_provider, roles, permissions,
    active, role_selection_completed, role_selected_at, last_login_at
  ) values (
    p_uid, v_email, coalesce(nullif(btrim(p_display_name), ''), split_part(v_email, '@', 1)),
    nullif(btrim(p_photo_url), ''), 'google.com', array[p_role]::text[], '{}'::text[],
    true, true, now(), now()
  ) returning * into v_created;

  update public.google_role_approvals
  set active = false, used_by = p_uid, used_at = now()
  where approval_id = v_approval.approval_id;

  insert into public.audit_logs (user_uid, user_name, roles, action, module, record_type, record_id, description, success)
  values (p_uid, v_created.display_name, v_created.roles, 'role_selection', 'authentication', 'user', p_uid, 'Google first-login role approved', true);

  return v_created;
end;
$$;
