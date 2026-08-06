# Identity Mapping Specification

This document maps external Firebase identities to internal Supabase domain accounts and manages user status.

## Table: `users`
```sql
CREATE TABLE users (
  internal_user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_uid VARCHAR(128) UNIQUE NOT NULL, -- Firebase UID
  authentication_provider VARCHAR(50) NOT NULL DEFAULT 'firebase',
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  role_assignment_id VARCHAR(50) NOT NULL, -- active role
  account_status VARCHAR(50) NOT NULL DEFAULT 'invited',
  last_login_at TIMESTAMPTZ,
  token_version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Account Statuses
- `invited`: Account created but never logged in.
- `active`: Normal, authorized state.
- `suspended`: Temporarily disabled for security review.
- `disabled`: Permanently deactivated (ex-employees).
- `migration_review_required`: Legacy users needing admin approval for role mapping.

## Lifecycle
1. User logs in via Firebase.
2. Edge Function checks `external_uid`.
3. If `account_status` is `disabled` or `suspended`, throw 403 Forbidden.
4. If `account_status` is `migration_review_required`, restrict access to only the "Awaiting Approval" dashboard.
5. If `active`, proceed to business logic.
