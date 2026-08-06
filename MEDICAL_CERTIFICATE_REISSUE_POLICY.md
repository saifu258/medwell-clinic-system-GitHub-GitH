# Medical Certificate Reissue Policy

## The Reissue Relationship
An issued certificate CANNOT transition back to a draft state, nor can its generated PDF be overwritten.

To correct an issued certificate (Certificate A), it must be Voided and a Replacement (Certificate B) is created.

**Workflow:**
1. User requests correction on Certificate A.
2. Authorized reviewer (Practitioner or Admin) checks the reason.
3. Certificate A is marked `voided`. (Its PDF remains in storage, immutable).
4. Certificate B is created as a `draft`, copying the patient, visit, and clinic snapshot data from Certificate A.
5. Certificate B references Certificate A via `replaces_certificate_id`. Certificate A references Certificate B via `replaced_by_certificate_id`.
6. Required fields are corrected in Certificate B.
7. Certificate B goes through standard review and approval.
8. Certificate B is `issued`, receiving a brand new Document Number.
9. A new PDF is generated for Certificate B.

## Auditing and Display
- Downloading Certificate A will overlay a `VOID` watermark or clearly display the void status.
- Both certificates appear in the patient history.
- The `void_reason`, `voided_by`, `reissue_reason`, and `reissue_requested_by` fields are mandatory.
