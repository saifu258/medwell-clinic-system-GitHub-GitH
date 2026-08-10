# Phase 8: Open Conditions Register

This document tracks all recognized compatibility debt, skipped validations, and explicit design constraints accumulated during Phases 2–7. These do NOT block Staging or Production unless the owner overrides their status.

| ID | Source Phase | Condition / Debt | Risk | Required Before Staging? | Required Before Prod? | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **OC-01** | Phase 7 | `DIRECT_SUPABASE_REALTIME_DEFERRED_DUE_AUTH_BOUNDARY`. Supabase Realtime requires a verified JWT, but the system uses Firebase Auth. Edge API secure polling fallback implemented instead. | Low | No | No | OPEN (Deferred) |
| **OC-02** | Phase 7 | `LONG_TERM_OFFLINE_DRAFT_KEY_RECOVERY_DEFERRED`. Data Encryption Keys (DEKs) for offline drafts are stored in `sessionStorage` and drop on browser close. | Medium | No | No | OPEN (Deferred) |
| **OC-03** | Phase 7 | `FULL_REALTIME_PRESENCE_DEFERRED`. Only lock-ownership visibility is broadcasted, no cursor/multi-user real-time presence. | Low | No | No | OPEN (Deferred) |
| **OC-04** | Phase 6 & 7 | `CERTIFICATE_DRAFT_VERSION_GUARD_UI_INTEGRATION_DEFERRED`. Medical certificate drafts do not yet have an interactive UI utilizing the `expectedVersion` guards. | Low | No | Yes (if drafted) | OPEN |
| **OC-05** | Global | **Deno Pure Tests Skipped**. No pure functional Deno tests authored yet. | Medium | No | Yes | OPEN |
| **OC-06** | Global | **PostgreSQL RPC Integration Skipped**. Local Docker/Supabase was unavailable, preventing direct SQL integration execution. | High | No | Yes | OPEN |
| **OC-07** | Phase 7 | **DB Concurrency Tests Skipped**. Lost-update test harnesses require local Postgres execution. | High | No | Yes | OPEN |
| **OC-08** | Global | **Playwright E2E Skipped**. End-to-end tests require local frontend & backend harnesses which were unavailable. | High | No | Yes | OPEN |
| **OC-09** | Global | **Advanced Secret Scanning Skipped**. Only static git-grep pattern scanning was executed. | Low | No | No | OPEN |
