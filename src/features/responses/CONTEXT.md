# Responses

Responses defines how System CLOIE captures stakeholder answers: the one-response invariant, the response lifecycle, availability and eligibility gating, and draft versus submission semantics.

## The response record

**Response**:
One respondent's answer set for one evaluation assignment. `assignment_id` is unique, so a respondent holds exactly one response row per assignment; the row records the respondent, deployment, status, and its quantitative and qualitative answer items.
_Avoid_: Submission, answer sheet

**Response lifecycle**:
The status transition IN_PROGRESS -> SUBMITTED. `submitted_at` is frozen at submission, and a SUBMITTED response rejects further draft saves and submissions.
_Avoid_: Drafting, pending

**One-response invariant**:
Submission resolves the respondent's response row by assignment and, in one transaction, deletes prior answer items and writes the final item set before flipping the status; the unique `assignment_id` constraint backs the invariant at the database level.
_Avoid_: Upsert, overwrite

**Answer key**:
The composite form key `sectionKey:kind:itemKey`, where kind is `quantitative` or `qualitative`, mapping browser answers to stored response items.
_Avoid_: Question id, answer id

## Availability and eligibility

**Availability window**:
A deployment is answerable only while ACTIVE or SCHEDULED and activation time <= now <= deadline. The same gate serves both course-bound and central student deployments.
_Avoid_: Open period, active-only check

**Eligibility gate**:
Course-bound answering additionally requires active Course Assignment membership resolved from the authoritative roster; without it the evaluation is not available to that student.
_Avoid_: Enrollment check, deployment-wide availability

## Draft and submission

**Draft save**:
Section-scoped save while IN_PROGRESS: the section's existing quantitative and qualitative items are replaced by the submitted answers, leaving other sections untouched.
_Avoid_: Full-response save, partial submission

**Submission completeness**:
Submission asserts every required quantitative item has a finite numeric value and every qualitative item is non-empty against the frozen structure snapshot before the status flips to SUBMITTED.
_Avoid_: Best-effort submit, optional-item submit

## Status

**Student evaluation status**:
The respondent-facing list states NOT_STARTED / IN_PROGRESS / DUE_SOON / SUBMITTED. DUE_SOON marks an untouched assignment whose deadline is within 3 days; SUBMITTED follows from a frozen `submitted_at`.
_Avoid_: Overdue, pending
