# Decision and Approval Register

This register is the single source of truth for all project decisions and approvals. A checked box in any other document is valid ONLY when a corresponding record here is marked `APPROVED` or `APPROVED_WITH_CONDITIONS` with a named approver and evidence reference.

| Decision ID | Decision title | Related phase | Owner | Required approver | Current status | Approval date | Evidence reference | Blocking classification | Conditions | Last updated |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DEC-001` | Authentication execution path | Phase 0 | Architecture Team | Tech Lead | `EVIDENCE_MISSING` | - | - | `BLOCKING_PHASE_0_EXIT` | - | Current |
| `DEC-002` | Firebase-to-Supabase identity mapping | Phase 1 | Architecture Team | Tech Lead | `EVIDENCE_MISSING` | - | - | `BLOCKING_PHASE_0_EXIT` | - | Current |
| `DEC-003` | Action-level permission matrix | Phase 1 | Product Team | Clinic Admin | `EVIDENCE_MISSING` | - | - | `BLOCKING_PHASE_1` | - | Current |
| `DEC-004` | RLS policy matrix | Phase 1 | SecOps | Tech Lead | `EVIDENCE_MISSING` | - | - | `BLOCKING_PHASE_1` | - | Current |
| `DEC-005` | Workflow transition matrix | Phase 2 | Product Team | Clinic Admin | `EVIDENCE_MISSING` | - | - | `BLOCKING_PHASE_2` | - | Current |
| `DEC-006` | Partial payment policy | Phase 4 | Finance Team | Clinic Admin | `EVIDENCE_MISSING` | - | - | `BLOCKING_PHASE_4` | - | Current |
| `DEC-007` | Visit closing policy | Phase 4 | Finance Team | Clinic Admin | `EVIDENCE_MISSING` | - | - | `BLOCKING_PHASE_4` | - | Current |
| `DEC-008` | Medical cert reissue model | Phase 5 | Clinical Team | Clinic Admin | `EVIDENCE_MISSING` | - | - | `BLOCKING_PHASE_5` | - | Current |
| `DEC-009` | Cert signing authority | Phase 5 | Clinical Team | Clinic Admin | `EVIDENCE_MISSING` | - | - | `BLOCKING_PHASE_5` | - | Current |
| `DEC-010` | Backup policy | Phase 0 | DevOps | Tech Lead | `EVIDENCE_MISSING` | - | - | `BLOCKING_PHASE_0_EXIT` | - | Current |
| `DEC-011` | RPO (Recovery Point Objective) | Phase 0 | DevOps | Tech Lead | `EVIDENCE_MISSING` | - | - | `BLOCKING_PHASE_0_EXIT` | - | Current |
| `DEC-012` | RTO (Recovery Time Objective) | Phase 0 | DevOps | Tech Lead | `EVIDENCE_MISSING` | - | - | `BLOCKING_PHASE_0_EXIT` | - | Current |
| `DEC-013` | Rollback plan | Phase 0 | DevOps | Tech Lead | `EVIDENCE_MISSING` | - | - | `BLOCKING_PHASE_0_EXIT` | - | Current |
| `DEC-014` | Phase 0 scope | Phase 0 | Architecture Team | Tech Lead | `APPROVED` | 2026-08-06 | User Chat Confirmation | `BLOCKING_BEFORE_PHASE_0` | Owner: Clinic Admin, Storage: Local Folder | Current |
