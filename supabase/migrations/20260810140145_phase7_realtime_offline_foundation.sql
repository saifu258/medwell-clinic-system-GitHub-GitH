-- Phase 7: Realtime, Concurrency Locks & Offline Draft Foundation

-- 1. Version Columns
ALTER TABLE public.visits ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE public.medical_certificates ADD COLUMN version integer NOT NULL DEFAULT 1;

-- 2. Version Increment Trigger
CREATE OR REPLACE FUNCTION public.medwell_increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_visits_increment_version
    BEFORE UPDATE ON public.visits
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION public.medwell_increment_version();

CREATE TRIGGER trg_medical_certificates_increment_version
    BEFORE UPDATE ON public.medical_certificates
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION public.medwell_increment_version();

-- 3. Lock Table
CREATE TABLE public.record_edit_locks (
    lock_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type text NOT NULL CHECK (resource_type IN ('visit_clinical_draft', 'medical_certificate_draft')),
    resource_id uuid NOT NULL,
    locked_by uuid NOT NULL REFERENCES public.users(uid),
    locked_by_role text NOT NULL,
    session_id text NOT NULL,
    acquired_at timestamptz NOT NULL DEFAULT now(),
    heartbeat_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    UNIQUE(resource_type, resource_id)
);

ALTER TABLE public.record_edit_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.record_edit_locks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.record_edit_locks TO service_role;

-- 4. Lock RPCs
CREATE OR REPLACE FUNCTION public.medwell_acquire_edit_lock(
    p_resource_type text,
    p_resource_id uuid,
    p_session_id text,
    p_actor uuid,
    p_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing record;
    v_now timestamptz := now();
    v_expires_at timestamptz := v_now + interval '90 seconds';
BEGIN
    -- Cleanup any expired lock for this resource first
    DELETE FROM public.record_edit_locks
    WHERE resource_type = p_resource_type
      AND resource_id = p_resource_id
      AND expires_at < v_now;

    -- Try to find existing active lock
    SELECT * INTO v_existing FROM public.record_edit_locks
    WHERE resource_type = p_resource_type AND resource_id = p_resource_id FOR UPDATE;

    IF v_existing.lock_id IS NOT NULL THEN
        IF v_existing.locked_by = p_actor AND v_existing.session_id = p_session_id THEN
            -- Refresh own lock
            UPDATE public.record_edit_locks
            SET heartbeat_at = v_now, expires_at = v_expires_at, locked_by_role = p_role
            WHERE lock_id = v_existing.lock_id;

            RETURN json_build_object('success', true, 'lock_id', v_existing.lock_id, 'expires_at', v_expires_at);
        ELSE
            -- Lock held by someone else
            RETURN json_build_object(
                'success', false,
                'error', 'LOCK_CONFLICT',
                'locked_by', v_existing.locked_by,
                'locked_by_role', v_existing.locked_by_role,
                'expires_at', v_existing.expires_at
            );
        END IF;
    END IF;

    -- Acquire new lock
    INSERT INTO public.record_edit_locks (
        resource_type, resource_id, locked_by, locked_by_role, session_id, acquired_at, heartbeat_at, expires_at
    ) VALUES (
        p_resource_type, p_resource_id, p_actor, p_role, p_session_id, v_now, v_now, v_expires_at
    ) RETURNING lock_id INTO v_existing.lock_id;

    RETURN json_build_object('success', true, 'lock_id', v_existing.lock_id, 'expires_at', v_expires_at);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.medwell_acquire_edit_lock(text, uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.medwell_acquire_edit_lock(text, uuid, text, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.medwell_refresh_edit_lock(
    p_lock_id uuid,
    p_session_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing record;
    v_now timestamptz := now();
    v_expires_at timestamptz := v_now + interval '90 seconds';
BEGIN
    SELECT * INTO v_existing FROM public.record_edit_locks WHERE lock_id = p_lock_id FOR UPDATE;

    IF v_existing.lock_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'LOCK_NOT_FOUND');
    END IF;

    IF v_existing.session_id != p_session_id THEN
        RETURN json_build_object('success', false, 'error', 'LOCK_OWNER_MISMATCH');
    END IF;

    IF v_existing.expires_at < v_now THEN
        -- Technically we could revive it, but safer to force re-acquire
        DELETE FROM public.record_edit_locks WHERE lock_id = p_lock_id;
        RETURN json_build_object('success', false, 'error', 'LOCK_EXPIRED');
    END IF;

    UPDATE public.record_edit_locks
    SET heartbeat_at = v_now, expires_at = v_expires_at
    WHERE lock_id = p_lock_id;

    RETURN json_build_object('success', true, 'expires_at', v_expires_at);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.medwell_refresh_edit_lock(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.medwell_refresh_edit_lock(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.medwell_release_edit_lock(
    p_lock_id uuid,
    p_session_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing record;
BEGIN
    SELECT * INTO v_existing FROM public.record_edit_locks WHERE lock_id = p_lock_id FOR UPDATE;

    IF v_existing.lock_id IS NOT NULL AND v_existing.session_id = p_session_id THEN
        DELETE FROM public.record_edit_locks WHERE lock_id = p_lock_id;
        RETURN json_build_object('success', true);
    END IF;

    RETURN json_build_object('success', false, 'error', 'LOCK_NOT_FOUND_OR_MISMATCH');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.medwell_release_edit_lock(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.medwell_release_edit_lock(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.medwell_force_release_edit_lock(
    p_lock_id uuid,
    p_reason text,
    p_admin_uid uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing record;
BEGIN
    SELECT * INTO v_existing FROM public.record_edit_locks WHERE lock_id = p_lock_id FOR UPDATE;

    IF v_existing.lock_id IS NOT NULL THEN
        DELETE FROM public.record_edit_locks WHERE lock_id = p_lock_id;
        RETURN json_build_object('success', true, 'released_lock', row_to_json(v_existing));
    END IF;

    RETURN json_build_object('success', false, 'error', 'LOCK_NOT_FOUND');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.medwell_force_release_edit_lock(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.medwell_force_release_edit_lock(uuid, text, uuid) TO service_role;
