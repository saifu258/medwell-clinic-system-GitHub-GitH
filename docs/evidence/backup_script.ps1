# Backup Evidence Script

Write-Host "Starting Supabase Logical Backup (pg_dump)"
Write-Host "------------------------------------------"

# Ensure you have pg_dump installed (from PostgreSQL tools)
# Set your production database URL
$PROD_DB_URL = "postgres://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

Write-Host "1. Backing up Schema..."
pg_dump --schema-only --quote-all-identifiers --clean --file=schema_backup.sql $PROD_DB_URL
Write-Host "Schema backup saved to schema_backup.sql"

Write-Host "2. Backing up Data..."
pg_dump --data-only --quote-all-identifiers --exclude-schema="auth" --file=data_backup.sql $PROD_DB_URL
Write-Host "Data backup saved to data_backup.sql"

Write-Host "Backup completed. Please securely encrypt these files and move them to cold storage."
Write-Host "Update BACKUP_EVIDENCE_REGISTER.md with the results."
