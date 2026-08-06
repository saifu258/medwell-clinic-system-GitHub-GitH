# MEDWELL Staging Restore Rehearsal Report

**Report Date:** 2026-08-06  
**System:** MEDWELL CLINIC SYSTEM  
**Restore Environment:** Local isolated PostgreSQL database  
**Restore Database:** medwell\_restore\_test  
**Database Container:** supabase\_db\_MEDWELL  
**Executed By:** Saifu Yusoh  
**Role:** Technical Lead / Database Owner / Security Owner

## 1\. Objective

To verify that the MEDWELL encrypted backup can be extracted, validated, and restored into an isolated non-production PostgreSQL environment.

## 2\. Backup Used

* Archive: medwell\_phase0\_backup\_20260806\_145743.7z
* Encryption: 7z AES-256
* Archive integrity result: PASS
* Internal checksum verification: PASS
* Restored files:

  * roles.sql
  * schema.sql
  * data.sql
  * SHA256SUMS.csv

## 3\. Restore Target

* Environment type: Local isolated restore rehearsal
* Database: medwell\_restore\_test
* Production database modified: NO
* Production data accessed during restore: NO

## 4\. Restore Results

|Verification item|Result|
|-|-|
|Archive extraction|PASS|
|Internal SHA-256 verification|PASS|
|Schema restore|PASS|
|Data restore|PASS|
|Public tables restored|PASS — 23 tables|
|Foreign key validation|PASS|
|Function validation|PASS|
|View validation|PASS|
|Supabase realtime publication validation|PASS|
|ERROR or FATAL messages|NONE|

## 5\. Data Verification

The restored tables contained zero records.

This is consistent with the source database, which did not contain actual records at the time the backup was created.

The zero-row result is therefore not considered a restore failure.

## 6\. Limitations

* The rehearsal verified logical database restoration only.
* Supabase Storage object files were not restored.
* Authentication secrets, environment variables, API keys, and backup passwords were not included.
* Application-level workflows could not be validated using real records because the source database was empty.
* A future restore rehearsal should include approved synthetic test records.

## 7\. Final Result

**STAGING RESTORE REHEARSAL: PASS**

The encrypted MEDWELL backup was successfully validated and restored into an isolated non-production PostgreSQL database without ERROR or FATAL messages.

## 8\. Execution Sign-off

**Executed by:** Saifu Yusoh  
**Execution role:** Technical Lead / Database Owner / Security Owner  
**Executed at:** 2026-08-06 16:09 Asia/Bangkok  
**Execution result:** PASS

**Executor signature:** Saifu Yusoh  
**Signed date:** 2026-08-06

## 9\. Independent Review

**Reviewed by:** PENDING  
**Reviewer role:** PENDING  
**Reviewed at:** PENDING  
**Review status:** PENDING\_REVIEW  
**Reviewer comments:** PENDING  
**Reviewer signature:** PENDING

