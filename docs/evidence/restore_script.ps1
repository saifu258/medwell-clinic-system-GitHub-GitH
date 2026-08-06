# Restore Rehearsal Script

Write-Host "Starting Supabase Restore Rehearsal (psql)"
Write-Host "------------------------------------------"

# Set your STAGING database URL (DO NOT USE PRODUCTION)
$STAGING_DB_URL = "postgres://postgres.[YOUR_STAGING_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

Write-Host "1. Restoring Schema..."
psql -d $STAGING_DB_URL -f schema_backup.sql
Write-Host "Schema restored."

Write-Host "2. Restoring Data..."
psql -d $STAGING_DB_URL -f data_backup.sql
Write-Host "Data restored."

Write-Host "Restore completed."
Write-Host "Please perform reconciliation checks (row counts, financial totals) and update RESTORE_REHEARSAL_REPORT.md."
