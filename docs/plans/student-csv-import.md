# Student CSV import

## Approved scope and flow

Secretary-only Student creation. Existing emails are skipped, regardless of assigned roles or account activity. Imports never grant roles, update placement, reactivate accounts, create Auth identities, or change course rosters.

1. Prepare: download UTF-8 CSV template and consult active program/major reference. Maximum 100 students and 256 KiB per upload.
2. Review: server parses and validates all rows, resolves catalog labels, and marks Ready, Skipped, or Needs correction. No writes. Invalid rows block confirmation; existing-email rows may be skipped.
3. Confirm: display creation/skipped counts and the active period or explicit deferred-enrollment warning. Confirmation expires after 15 minutes and is bound to Secretary, exact CSV, and catalog/period context.
4. Results: each row reports Created, Skipped, or Failed. Download only failed inputs as a reusable correction CSV. Retrying the original file skips successfully created accounts.

## Columns

`name,email,program_code,major_name,year_level,section`

Names remain opaque and retain case. Trim inputs; match headers, program codes, major names and sections case-insensitively. Accept year numbers 1–4 and canonical year enum names. Require active program and an active major when available; reject ambiguous matches. Institutional email uses existing schema normalization and domain policy. Do not normalize Gmail aliases. Reject duplicate emails within the file, unknown/repeated/missing headers, malformed quotes, invalid UTF-8, wrong column counts, oversized files and excessive rows. Preserve physical CSV line numbers. Quote CSV downloads and neutralize spreadsheet formulas in reports.

## Implementation slices and checks

1. CSV contract plus tests: reuse existing CSV decoder/parser, creation schema, native enums. Test capitalization, whitespace, BOM, CRLF, quoted names, column reordering, blank lines, duplicates, malformed/unsupported files, limits, and formula-safe export.
2. Authorized preview and per-row atomic commit plus tests: read catalogs and existing emails on server, sign review, revalidate context, and create User/Student role/profile/enrollment in one transaction per row. Test forbidden callers, token tampering/expiry/other actor, stale catalogs/term, existing emails, concurrent unique conflicts, rollback and partial failure. Use disposable databases only for integration checks.
3. Responsive step-by-step UI plus tests: separate import route with server-prepared catalogs, narrow client upload/review boundary, accessible status and pending feedback, review table on desktop and stacked review rows on phones. Test file replacement, failed review, confirmation, results, reset and retry. Verify browser flow on desktop/mobile against local development only.
4. Regression verification: run affected Users/Auth/CSV tests, typecheck, targeted lint/format, and broad Vitest when practical. Update Users contract. Report any environmental blockers without claiming missing evidence.

## Blast radius

Writes use existing Users, roles, student profiles and enrollment tables. No schema migration, persistent cache, Supabase Auth API, or new package is needed. First Google link/name authority, active-role authorization, deferred-enrollment gates, enrollment sources, roster eligibility and response history remain unchanged. Revalidate Secretary Users/dashboard after creation. Existing single-account provisioning/editing and shared parser behavior remain unchanged. Signed review uses existing deployment confirmation secret. Uploaded student data stays in request/client memory and is not persisted as an import file or logged.
