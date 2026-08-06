# MEDWELL CLINIC SYSTEM Upgrade Open Questions

An unresolved question blocks only the phase assigned in its primary blocking classification, unless the question creates a direct safety or data-integrity risk to an earlier phase.

## Questions Blocking Before Phase 0
*None currently identified.*

## Questions Blocking Phase 0 Exit

**Authentication Execution Path**
- **Question ID**: `Q-001`
- **Background**: We must verify if RLS can safely read Firebase claims or if we must use restricted Edge RPCs.
- **Recommended Default**: Execution Path B (Edge Functions with restricted RPCs).
- **Risk if unresolved**: Severe permission bypass vulnerability.
- **Primary Classification**: `BLOCKING_PHASE_0_EXIT`
- **Approval Category**: `REQUIRES_CLINICAL_APPROVAL`
- **Owner**: Architecture Team
- **Approver**: Tech Lead
- **Target Phase**: Phase 0
- **Status**: `EVIDENCE_MISSING`

**RPO (Recovery Point Objective)**
- **Question ID**: `Q-002`
- **Background**: Determines acceptable data loss window in case of a critical failure.
- **Recommended Default**: Max 24 hours.
- **Risk if unresolved**: Loss of clinical records beyond acceptable limits.
- **Primary Classification**: `BLOCKING_PHASE_0_EXIT`
- **Approval Category**: `REQUIRES_CLINICAL_APPROVAL`
- **Owner**: DevOps
- **Approver**: Tech Lead
- **Status**: `EVIDENCE_MISSING`

**RTO (Recovery Time Objective)**
- **Question ID**: `Q-003`
- **Background**: Determines acceptable downtime during a restore operation.
- **Recommended Default**: Max 4 hours.
- **Risk if unresolved**: Extended clinic downtime.
- **Primary Classification**: `BLOCKING_PHASE_0_EXIT`
- **Approval Category**: `REQUIRES_CLINICAL_APPROVAL`
- **Owner**: DevOps
- **Approver**: Tech Lead
- **Status**: `EVIDENCE_MISSING`

## Questions Blocking Phase 1

**Doctor Migration Decision**
- **Question ID**: `Q-004`
- **Recommended Default**: Manual Admin Reassignment.
- **Primary Classification**: `BLOCKING_PHASE_1`
- **Approval Category**: `REQUIRES_CLINICAL_APPROVAL`
- **Status**: `EVIDENCE_MISSING`

**Pharmacist Migration Decision**
- **Question ID**: `Q-005`
- **Recommended Default**: Deprecated.
- **Primary Classification**: `BLOCKING_PHASE_1`
- **Approval Category**: `REQUIRES_CLINICAL_APPROVAL`
- **Status**: `EVIDENCE_MISSING`

**Cashier Migration Decision**
- **Question ID**: `Q-006`
- **Recommended Default**: Manual Admin Reassignment.
- **Primary Classification**: `BLOCKING_PHASE_1`
- **Approval Category**: `REQUIRES_FINANCIAL_APPROVAL`
- **Status**: `EVIDENCE_MISSING`

## Questions Blocking Phase 4

**Partial Payment Permission**
- **Question ID**: `Q-007`
- **Recommended Default**: Allowed, balance remains outstanding.
- **Primary Classification**: `BLOCKING_PHASE_4`
- **Approval Category**: `REQUIRES_FINANCIAL_APPROVAL`
- **Status**: `EVIDENCE_MISSING`

**Visit Closing with Outstanding Balance**
- **Question ID**: `Q-008`
- **Recommended Default**: Clinically closed, financially outstanding.
- **Primary Classification**: `BLOCKING_PHASE_4`
- **Approval Category**: `REQUIRES_FINANCIAL_APPROVAL`
- **Status**: `EVIDENCE_MISSING`

**Discount Thresholds**
- **Question ID**: `Q-009`
- **Recommended Default**: Assistant < 5%, Admin Unlimited.
- **Primary Classification**: `BLOCKING_PHASE_4`
- **Approval Category**: `REQUIRES_FINANCIAL_APPROVAL`
- **Status**: `EVIDENCE_MISSING`

**Refund Thresholds**
- **Question ID**: `Q-010`
- **Recommended Default**: Assistant DENY, Admin ALLOW.
- **Primary Classification**: `BLOCKING_PHASE_4`
- **Approval Category**: `REQUIRES_FINANCIAL_APPROVAL`
- **Status**: `EVIDENCE_MISSING`

**Receipt Issuance Model**
- **Question ID**: `Q-011`
- **Recommended Default**: One receipt per confirmed payment.
- **Primary Classification**: `BLOCKING_PHASE_4`
- **Approval Category**: `REQUIRES_FINANCIAL_APPROVAL`
- **Status**: `EVIDENCE_MISSING`

## Questions Blocking Phase 5

**Certificate Signing Authority**
- **Question ID**: `Q-012`
- **Recommended Default**: Practitioner MUST explicitly click 'Issue'.
- **Primary Classification**: `BLOCKING_PHASE_5`
- **Approval Category**: `REQUIRES_CLINICAL_APPROVAL`
- **Status**: `EVIDENCE_MISSING`

**Certificate Counter Reset Policy**
- **Question ID**: `Q-013`
- **Recommended Default**: Infinite increment with YY prefix.
- **Primary Classification**: `BLOCKING_PHASE_5`
- **Approval Category**: `REQUIRES_CLINICAL_APPROVAL`
- **Status**: `EVIDENCE_MISSING`

## Questions Blocking Phase 6

**Translation Provider**
- **Question ID**: `Q-014`
- **Recommended Default**: Google Cloud Translation.
- **Primary Classification**: `BLOCKING_PHASE_6`
- **Approval Category**: `CONFIGURABLE_LATER`
- **Status**: `EVIDENCE_MISSING`

## Questions Blocking Phase 9

**Production Maintenance Window**
- **Question ID**: `Q-015`
- **Recommended Default**: Sunday 2:00 AM.
- **Primary Classification**: `BLOCKING_PHASE_9`
- **Approval Category**: `NON_BLOCKING` (for Phase 0)
- **Status**: `EVIDENCE_MISSING`

## Non-Blocking Configuration Questions

**Branch-specific Document Numbering**
- **Question ID**: `Q-016`
- **Recommended Default**: No prefix (Default to YY).
- **Primary Classification**: `NON_BLOCKING`
- **Approval Category**: `CONFIGURABLE_LATER`
- **Status**: `EVIDENCE_MISSING`
