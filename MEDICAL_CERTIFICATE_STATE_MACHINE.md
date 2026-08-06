# Medical Certificate State Machine

## Certificate Statuses
- `draft`: Initial creation.
- `under_review`: Submitted for practitioner review.
- `approved`: Practitioner signed and approved content.
- `issued`: Finalized, document number generated, PDF generated.
- `voided`: Cancelled after issuance.

## Allowed Transitions
- `draft` → `under_review` (By Assistant, Practitioner)
- `under_review` → `draft` (If rejected/needs changes)
- `under_review` → `approved` (By Practitioner ONLY)
- `approved` → `issued` (By Practitioner or Assistant*, triggers Number Generation and PDF generation)
- `issued` → `voided` (By Practitioner or Admin ONLY, requires reason)

*\* Pending final clinical decision on whether Clinic Assistants can click the final "Issue" button for an already approved certificate.*

## Immutability Rules
Once `issued`, no fields inside the `medical_certificates` table row (except `voided` status and `replaced_by_certificate_id`) can be updated. The JSON snapshot and PDF checksum become read-only.
