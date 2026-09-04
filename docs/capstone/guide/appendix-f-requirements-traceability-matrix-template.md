---
title: "APPENDIX F: REQUIREMENTS TRACEABILITY MATRIX (RTM) TEMPLATE"
kind: official-reference
status: authoritative-reference
source_file: Appendix_F_Requirements_Traceability_Matrix_Template.docx
conversion: faithful-markdown-transcription
---

# APPENDIX F

## REQUIREMENTS TRACEABILITY MATRIX (RTM) TEMPLATE

**\*Purpose.** The Requirements Traceability Matrix provides end-to-end evidence that approved project objectives are translated into requirements, reflected in the system design and implementation, and verified through testing and stakeholder acceptance. It should be maintained throughout the Capstone Project rather than prepared only before Final Defense.\*

| Capstone Project Title: |                                       | Team / Proponents:         |     |
| :---------------------- | :------------------------------------ | :------------------------- | :-- |
| **Client / Partner:**   |                                       | **Adviser:**               |     |
| **Current Version:**    |                                       | **Date Updated:**          |     |
| **Project Milestone:**  | ☐ Title ☐ Outline ☐ Pre-Final ☐ Final | **Prepared / Updated by:** |     |

### A. Instructions for Use

- Assign each approved objective and requirement a unique and stable identifier. Do not renumber IDs simply because a requirement changes.
- Trace requirements in both directions: every important requirement should support an approved objective or stakeholder need, and every approved objective should be represented by one or more requirements.
- Functional requirements may use IDs such as FR-01; quality/non-functional requirements may use NFR-01; security/privacy requirements may use SEC-01; data requirements may use DR-01; integration requirements may use INT-01.
- Write requirements as clear, testable statements. Critical requirements should have explicit acceptance criteria.
- Identify the design/component, module, screen, API, database entity, infrastructure element, or other artifact that realizes each requirement.
- Link each implemented requirement to credible evidence such as repository issue/commit/release, build version, configuration, or implementation reference.
- Link each requirement to one or more test cases or validation activities and record the latest result.
- Update the matrix whenever a requirement is added, changed, deferred, rejected, or verified. Significant changes should have an approval/change reference.
- At Final Defense, unresolved, partially implemented, deferred, or failed requirements must be disclosed and justified. Do not mark a requirement 'Passed' without evidence.

### B. Recommended Requirement Status

| Status                   | Meaning                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| **Proposed**             | Identified but not yet formally approved.                                                    |
| **Approved**             | Included in the approved requirements baseline.                                              |
| **In Development**       | Implementation is underway.                                                                  |
| **Implemented**          | Implementation is complete but may still require verification.                               |
| **Verified / Passed**    | Required test/acceptance evidence demonstrates that the requirement is satisfied.            |
| **Partially Met**        | Only part of the requirement or acceptance criteria is satisfied.                            |
| **Deferred**             | Approved for a later release or outside the current capstone completion, with justification. |
| **Changed / Superseded** | Requirement was formally modified or replaced; retain traceability to the change.            |
| **Rejected / Removed**   | Formally removed from scope with documented reason and approval.                             |

### C. REQUIREMENTS TRACEABILITY MATRIX

| Req. ID | Objective / Stakeholder Need | Requirement Statement | Type / Priority | Acceptance Criteria | Design / Component Reference | Implementation Evidence | Test / Validation Reference | Latest Result / Status | Remarks / Change Reference |
| ------- | ---------------------------- | --------------------- | --------------- | ------------------- | ---------------------------- | ----------------------- | --------------------------- | ---------------------- | -------------------------- |
| FR-\_\_ |                              |                       |                 |                     |                              |                         |                             |                        |                            |
| FR-\_\_ |                              |                       |                 |                     |                              |                         |                             |                        |                            |
| FR-\_\_ |                              |                       |                 |                     |                              |                         |                             |                        |                            |
| FR-\_\_ |                              |                       |                 |                     |                              |                         |                             |                        |                            |
| FR-\_\_ |                              |                       |                 |                     |                              |                         |                             |                        |                            |
| FR-\_\_ |                              |                       |                 |                     |                              |                         |                             |                        |                            |
| FR-\_\_ |                              |                       |                 |                     |                              |                         |                             |                        |                            |
| FR-\_\_ |                              |                       |                 |                     |                              |                         |                             |                        |                            |
| FR-\_\_ |                              |                       |                 |                     |                              |                         |                             |                        |                            |
| FR-\_\_ |                              |                       |                 |                     |                              |                         |                             |                        |                            |
| FR-\_\_ |                              |                       |                 |                     |                              |                         |                             |                        |                            |
| FR-\_\_ |                              |                       |                 |                     |                              |                         |                             |                        |                            |

**Suggested priority:** Must / Should / Could (or High / Medium / Low, provided one scheme is used consistently). **Suggested latest result/status:** Not Tested / Passed / Failed / Partially Met / Deferred / Changed.

### D. OBJECTIVE-TO-REQUIREMENT COVERAGE CHECK

| Objective ID | Approved Objective | Linked Requirement IDs | Coverage / Evidence | Gap / Required Action |
| ------------ | ------------------ | ---------------------- | ------------------- | --------------------- |
| OBJ-01       |                    |                        |                     |                       |
| OBJ-02       |                    |                        |                     |                       |
| OBJ-03       |                    |                        |                     |                       |
|              |                    |                        |                     |                       |
|              |                    |                        |                     |                       |
|              |                    |                        |                     |                       |

### E. REQUIREMENT CHANGE LOG

| Change ID | Date | Req. ID | Change / Decision | Reason / Evidence | Impact on Scope/Design/Test | Approved by |
| --------- | ---- | ------- | ----------------- | ----------------- | --------------------------- | ----------- |
| CR-01     |      |         |                   |                   |                             |             |
| CR-02     |      |         |                   |                   |                             |             |
|           |      |         |                   |                   |                             |             |
|           |      |         |                   |                   |                             |             |
|           |      |         |                   |                   |                             |             |
|           |      |         |                   |                   |                             |             |

### F. FINAL TRACEABILITY AND COMPLETION SUMMARY

| Measure                                   | Count | Percentage | Notes |
| ----------------------------------------- | ----- | ---------- | ----- |
| Total approved requirements               |       | 100%       |       |
| Verified / Passed requirements            |       |            |       |
| Partially met requirements                |       |            |       |
| Deferred requirements                     |       |            |       |
| Failed / unresolved requirements          |       |            |       |
| Requirements with linked test evidence    |       |            |       |
| Requirements with implementation evidence |       |            |       |

**Completion Formula:** Verified Requirements ÷ Total Approved Requirements × 100\. This percentage is a progress indicator only; critical requirements and quality/security requirements should not be treated as equivalent to trivial features.

### G. PROPONENT DECLARATION AND REVIEW

We certify that this matrix accurately represents the approved requirements, current implementation status, testing evidence, changes, and unresolved items of the Capstone Project. Entries are supported by project artifacts and have not been fabricated or intentionally misrepresented.

| Prepared by:                         |     | Date:          |     |
| :----------------------------------- | :-- | :------------- | :-- |
| **Team Leader / Proponent:**         |     | **Signature:** |     |
| **Reviewed by Adviser:**             |     | **Date:**      |     |
| **Verified at Defense / Review by:** |     | **Date:**      |     |

### H. OPTIONAL SAMPLE ENTRY (FOR GUIDANCE ONLY)

| Req. ID | Objective / Stakeholder Need                 | Requirement Statement                                                                     | Type / Priority   | Acceptance Criteria                                                                            | Design / Component Reference                     | Implementation Evidence  | Test / Validation Reference | Latest Result / Status | Remarks / Change Reference     |
| ------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------ | --------------------------- | ---------------------- | ------------------------------ |
| FR-01   | OBJ-02: Reduce manual appointment processing | The system shall allow an authorized user to create, reschedule, and cancel appointments. | Functional / Must | Authorized user completes each action; schedule updates are saved and conflicts are prevented. | UC-03; Appointment Module; Appointment table/API | Issue \#24; Release v0.6 | TC-FR01-01 to 05; UAT-03    | Passed                 | Validated after revision CR-02 |

**Note:** The sample entry is illustrative. Teams should adapt evidence references to the technologies and project-management tools actually used.
