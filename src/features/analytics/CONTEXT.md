# Analytics

Analytics defines how System CLOIE presents stakeholder-evaluation evidence for monitoring and continuous quality improvement without treating ratings as individual mastery or grades.

## Evidence language

**Analytics evidence**:
Submitted-response aggregates and qualitative summaries used to inspect perceived or stakeholder-rated attainment within an explicitly selected Program and academic scope. Analytics evidence is not an individual student mastery record, grade, or transcript.
_Avoid_: Student performance, mastery score, grade result

**Evaluation opportunity**:
An in-scope `EvaluationAssignment` created for a respondent and deployment. Evaluation opportunities form the historical denominator for response-rate reporting.
_Avoid_: Current roster eligibility, live pending count, respondent total

**Response rate**:
The proportion of submitted responses among in-scope evaluation opportunities. A scope with no opportunities has no response rate rather than a zero-percent response rate.
_Avoid_: Completion percentage when the denominator is unspecified

**Evidence source**:
The origin and construct context of evaluation evidence: course-bound student evidence or central-deployment evidence for central student respondents, alumni, or industry partners. Evidence sources are not interchangeable merely because they use rating values.
_Avoid_: Stakeholder pool when source and instrument differences matter

**Course-bound student evidence**:
Evaluation evidence produced by a Course-bound evaluation of course learning outcomes for assigned Students. It is distinct from central student-respondent evidence.
_Avoid_: Student evidence when the central/course-bound distinction matters

**Central student-respondent evidence**:
Evidence from a Central Deployment targeting `STUDENT`, such as a program-wide or exit instrument. It is distinct from Course-bound student evidence.
_Avoid_: Course evaluation evidence

## Outcome evidence

**Program GO evidence**:
Course-bound quantitative evidence connected through a published evaluation's CILO question binding to a CILO and that CILO's Graduate Outcome mapping in the selected Program. Central instrument questions and Institutional Outcome evidence are not Program GO evidence.
_Avoid_: Universal outcome attainment, ILO-to-GO evidence

**Current-mapping interpretation**:
The grouping of historical Course-bound ratings by the selected Program's current CILO-to-GO mappings when publication-time mapping rows were not snapshotted. This interpretation carries an explicit historical limitation and does not rewrite the underlying response.
_Avoid_: Publication-time GO result, immutable historical mapping result

## AI-assisted interpretation

**AI-assisted interpretation**:
A supplementary, bounded interpretation of authorized Analytics evidence that does not replace deterministic metrics or the Program Head's human CQI judgment. In development and testing, it may process de-identified submitted qualitative responses server-side through a deliberately configured provider endpoint and engineering-configured corpus threshold; raw qualitative text is never returned to the analytics browser surface or persisted as an AI result. Production enablement remains a separate governance decision.
_Avoid_: AI decision, automatic CQI plan, AI grading, chatbot
