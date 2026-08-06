# Backup Security Policy

1. **Encryption**: All logical `pg_dump` exports must be encrypted at rest (e.g., via GPG) before being stored outside the Supabase environment.
2. **Transit**: Backups downloaded locally must be transferred over TLS (HTTPS/SSH).
3. **Storage Location**: Backups must be stored in a separate, secure Cloud Storage bucket with restricted IAM access, not on local developer workstations.
4. **Least Privilege**: Only authorized Admin credentials (or specific service accounts) may trigger or access backups.
5. **Retention**: Daily backups retained for 30 days. Weekly backups retained for 1 year. (Pending legal confirmation).
6. **Deletion**: Expired backups are permanently wiped via automated bucket lifecycle rules.
7. **Secret Exclusion**: Raw API keys and production secrets must never be exported in plaintext SQL dumps. They reside securely in Supabase Vault and are injected during deployment.
8. **Auditing**: Every manual backup or restore action must be logged in the `audit_logs` table (if system is online) or the infrastructure IAM logs.
