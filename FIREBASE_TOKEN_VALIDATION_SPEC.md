# Firebase Token Validation Specification

All Edge Functions must rigorously validate incoming Firebase ID tokens before authorizing any business logic.

## Required Token Validation Rules
Edge Functions must validate at least:
- Token signature
- Issuer
- Audience
- Subject
- Expiration
- Issued-at time
- Firebase project ID
- Revocation status, where supported
- Internal account status
- Token version, if implemented

## Rejection Criteria
The request MUST be rejected if any of the following apply:
- Expired token
- Invalid signature
- Wrong Firebase project
- Missing subject
- Disabled Firebase user
- Suspended MEDWELL user
- Disabled MEDWELL account
- User requiring role migration (unless accessing the explicit migration dashboard)
- User without an active role assignment
