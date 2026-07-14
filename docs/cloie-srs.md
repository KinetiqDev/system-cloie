# CLOIE Software Requirements Specification (SRS)

**Document Title:** Software Requirements Specification for **PROJECT CLOIE: The Development of a System for Comprehensive Learning Outcomes and Instructional Evaluation**  
**Version:** Draft 0.5 (Revised for Program-Scoped Template Access, Guided Open-Ended Suggestions, and Scoped Course Catalog Management)  
**Status:** Working Draft  
**Prepared For:** Assumption College of Davao  
**Prepared By:** BSIT Capstone Proponents  

---

## 1. Introduction

### 1.1 Purpose of the Document
This Software Requirements Specification (SRS) defines the software requirements for **PROJECT CLOIE**, a college-level digital evaluation, monitoring, and reporting platform for Assumption College of Davao. The document describes what the software must do, the conditions under which it must operate, the data it must manage, the interfaces it must provide, the role-specific workflows it must support, and the quality attributes it must satisfy.

This SRS is intended to guide:
- requirements validation with the client and adviser
- system design and architecture decisions
- database and interface planning
- module development and implementation planning
- testing and acceptance checking
- future revision and maintenance of the system

### 1.2 Scope of the System
CLOIE is a **college-level, multi-program academic evaluation platform** that supports the management of:
- **Graduate Outcomes (GOs)** as the program-level outcomes of each academic program
- **Course Intended Learning Outcomes (CILOs)** as the course-level outcomes of each course
- stakeholder-based evaluation from students, including graduating students when eligible, plus alumni and industry partners
- controlled evaluation availability, assignment, and stakeholder-specific visibility
- confidential response collection and storage
- attainment analysis, reporting, evidence generation, and word-cloud-supported qualitative summaries
- support for quality assurance, accreditation-related reporting, and continuous quality improvement (CQI)

CLOIE is intended to support multiple academic programs, their courses, faculty members, academic leaders, and stakeholder groups within Assumption College of Davao.

CLOIE shall provide **role-specific portals and dashboards** for:
- System Administrator
- Program Head
- Faculty Member
- Student
- Alumni
- Industry Partner
- College Dean

The **Student portal** shall be shared by regular students and graduating students. Graduating-student-specific instruments, such as the **Graduating Student Exit Survey**, shall be delivered through the Student role based on academic eligibility and assignment rather than through a separate portal role.

The **College Dean portal** and **Program Head portal** shall follow the same general portal capabilities and operational access pattern. The primary difference shall be scope of visibility:
- the **Program Head** shall operate within the assigned program scope
- the **College Dean** shall access analytics and reports across all college programs, with filtering and drill-down into specific programs

For the **Post-Term CILO Evaluation Tool**, CLOIE shall use a **course-bound evaluation form model** in which a faculty member creates a **derived course-bound form instance** from an authorized template by selecting the academic/course context, including **Program**, **Major if applicable**, **Semester**, **Term**, and **Course** from the valid scoped course catalog, then encoding the course’s CILOs, configuring allowed editable form content, setting activation and deadline values, previewing the student-facing form, and publishing it.

For the **Graduating Student Exit Survey**, **Alumni Evaluation Tool**, **Industry Partner Internship Evaluation Tool**, and any additional authorized program-scoped tools, CLOIE shall support governed template/version management and controlled deployment settings. Authorized **Program Heads** may create, manage, version, edit, save, and deploy **program-level templates** for non-course-bound stakeholder tools within their assigned program scope, may mark selected templates as **faculty-accessible**, and may modify those templates only within the owning program scope. Administrators retain governance authority over institutional baseline instruments.

Where faculty-accessible templates are supported, faculty members may create new evaluation tools only from templates explicitly exposed for faculty use. Faculty edits in those workflows shall apply to the **derived instance** or faculty-configurable copy created from the allowed template and shall not overwrite the source template.

Supported question types in the current scope shall be limited to:
- **Likert-scale questions** for quantitative responses
- **Guided open-ended questions** for qualitative responses

Guided open-ended questions may include **predefined suggested responses** configured in the builder. On the respondent side, selecting a suggestion shall populate the textbox with the encoded phrase while preserving the respondent’s ability to edit the final submitted text.

Quantitative analytics for supported Likert-scale questions shall be computed using the **mean**, while qualitative analytics shall support **word-cloud generation** from open-ended responses.

CLOIE shall be developed as a **Progressive Web Application (PWA)** that provides a **native-like, installable, and responsive user experience** across **desktop, tablet, and mobile devices**, including supported use on **Android, iOS, and desktop platforms**. The system shall remain focused on evaluation, monitoring, and reporting workflows and shall not extend into LMS, SIS, or grading-system functions.

### 1.3 Intended Audience
This document is intended for:
- the capstone proponents
- the capstone adviser and panelists
- the client and academic stakeholders
- future implementers or maintainers of the system
- testers and validators of the final system

### 1.4 Definitions, Acronyms, and Abbreviations
- **ACD** - Assumption College of Davao
- **CILO** - Course Intended Learning Outcome
- **CLOIE** - Comprehensive Learning Outcomes and Instructional Evaluation
- **CQI** - Continuous Quality Improvement
- **Derived Form Instance** - A faculty-created editable form instance generated from an authorized template for a specific academic/course context without overwriting the source template
- **FR** - Functional Requirement
- **FK** - Foreign Key
- **GO** - Graduate Outcome; the program-level outcome construct used by CLOIE
- **LMS** - Learning Management System
- **MVP** - Minimum Viable Product
- **NFR** - Non-Functional Requirement
- **OBE** - Outcome-Based Education
- **PDCA** - Plan-Do-Check-Act
- **PWA** - Progressive Web Application
- **RBAC** - Role-Based Access Control
- **SIS** - Student Information System
- **SRS** - Software Requirements Specification
- **TBD** - To Be Determined

### 1.5 References
This SRS is based on the following project sources:
- current CLOIE capstone documentation
- revised CLOIE Product Requirements Document (PRD)
- CLOIE Tech Stack Document
- clarified project scope and client direction
- integrated evaluation instruments:
  - Post-Term CILO Evaluation Tool
  - Graduating Student Exit Survey
  - Alumni Evaluation Tool
  - Industry Partner Internship Evaluation Tool
- module hierarchy and requirements planning documents
- capstone schedule and delivery constraints

### 1.6 Document Conventions
- Requirements use the phrase **"The system shall..."** where possible.
- Functional requirements are grouped by module.
- Non-functional requirements are grouped by quality attribute.
- Draft-level open decisions are noted as assumptions, constraints, or open items instead of being hidden as facts.
- Where the product uses different operational behavior for different evaluation tools, that difference is stated explicitly instead of being generalized.
- Role scope, program scope, and academic-context scope shall be stated explicitly where they affect visibility, deployment, reporting, or analytics.
- Graduating-student-specific access shall be treated as **student eligibility under the Student role**, not as a separate role.

---

## 2. Overall Description

### 2.1 Product Perspective
CLOIE is a dedicated academic evaluation system. It is not intended to replace:
- a Learning Management System (LMS)
- a Student Information System (SIS)
- a grading platform
- an institutional accreditation management suite

Its primary role is to serve as a structured platform for:
- outcomes management
- stakeholder evaluation
- program-scoped and college-scoped analytics
- data consolidation
- analysis and reporting
- evidence generation for review and improvement

CLOIE supports the **evaluation, monitoring, and reporting** part of the academic quality cycle. Teaching, grading, enrollment management, and broader institutional records remain outside the system.

CLOIE shall be delivered as a **web-first PWA** rather than a separate native mobile application. The software shall use a centralized web architecture while still providing installable and app-like behavior on supported devices.

### 2.2 Product Objectives
The software is intended to:
1. centralize **Graduate Outcome (GO)** and **CILO** management across multiple programs
2. digitize evaluation instruments used by different stakeholder groups
3. control who can answer which form and during what availability window
4. support a faculty-managed, course-bound CILO evaluation flow for the Post-Term CILO Evaluation Tool
5. support program-head-managed template authoring, editing, reuse, deployment, and controlled faculty sharing of non-course-bound stakeholder tools within governed program scope
6. store responses securely and preserve traceability over time
7. compute summarized quantitative results using mean-based aggregation and generate qualitative word-cloud outputs from open-ended responses
8. generate reports usable by faculty, program heads, and the college dean while preserving scoped visibility
9. support CQI-oriented review through organized evidence and historical records
10. provide a **responsive and native-like user experience** across desktop, tablet, and mobile
11. support **installable access** through PWA-compatible behavior on supported Android, iOS, and desktop platforms
12. ensure device-specific interaction quality for forms, dashboards, and administrative workflows
13. support the governed addition of new evaluation tools and the controlled modification of existing ones through template/version workflows
14. support a shared academic-leadership portal model in which **Program Heads** and the **College Dean** use the same general reporting, monitoring, and evaluation-management capabilities, differing primarily in academic scope of visibility
15. support student-role-based delivery of graduating-student-specific tools through academic eligibility rather than a separate portal role
16. restrict the supported question model in current scope to **Likert-scale** and **guided open-ended** question types
17. support predefined suggested responses for guided open-ended questions and respondent-side click-to-populate behavior with editable final text
18. support Program Head course-catalog management within assigned program and valid major scope
19. support faculty selection of only those templates explicitly allowed for faculty access within valid program affiliation context
20. support faculty creation of **editable derived course-bound form instances** from authorized templates without overwriting the source template
21. require faculty selection of **Program**, **Major if applicable**, **Semester**, **Term**, and **Course** from the valid scoped course catalog when creating a Post-Term CILO Evaluation Tool instance
22. support active monitoring and reporting around **Graduate Outcomes** and **Course Intended Learning Outcomes** only
23. support **CILO-to-GO mapping** for reporting, analytics, and review

### 2.3 High-Level Product Functions
At a high level, CLOIE provides:
- user authentication and access control
- role-specific portal routing and navigation
- academic structure management
- outcomes encoding and mapping
- evaluation instrument management
- evaluation availability and assignment control
- response collection and submission control
- qualitative feedback handling
- analytics and attainment computation
- reporting and evidence generation
- administrative controls and configuration

### 2.4 User Classes and Characteristics

#### 2.4.1 System Administrator
Administrative user responsible for configuration and governance of the platform, including users, roles, programs, majors, program catalog details, course catalog, institutional instruments, core records, and traceable system configuration. This role may also manage centrally governed availability and respondent assignment settings for non-course-bound stakeholder tools.

#### 2.4.2 College Dean
Academic-leadership user who has the same general portal capabilities and operational access pattern as the Program Head. The College Dean may review outcomes, governed stakeholder-tool templates, deployment context, analytics, reports, dashboards, and evidence outputs across all college programs, with filtering and drill-down into specific programs. The dean does not automatically inherit administrator privileges.

#### 2.4.3 Program Head
Academic-leadership user who is assigned to a specific program scope and has the same general portal capabilities and operational access pattern as the College Dean, but limited to the assigned program. This role may review program outcomes, author and manage program-level templates for non-course-bound stakeholder tools, configure deployment settings within program scope, manage the course catalog within assigned program and valid major scope, control whether selected templates are available for faculty use, and review program-scoped analytics and reports.

#### 2.4.4 Faculty Member
Academic user who encodes and manages CILOs, maps course outcomes where applicable to Graduate Outcomes, creates and publishes **course-bound Post-Term CILO Evaluation Tool** instances, and reviews summarized course-level results. Where faculty-accessible program templates are supported, a faculty member may create a new evaluation tool only from templates explicitly exposed for faculty use.

For the Post-Term CILO Evaluation Tool, the faculty member shall create a **derived editable course-bound form instance** from an authorized template by selecting the valid academic context, including **Program**, **Major if applicable**, **Semester**, **Term**, and **Course** from the scoped course catalog, then encoding or updating the course-specific CILOs and other allowed configurable fields before publication.

A faculty member may be affiliated with one or more programs.

#### 2.4.4 Faculty Member
Academic user who encodes and manages CILOs, maps course outcomes where applicable, creates and publishes **course-bound Post-Term CILO Evaluation Tool** instances, and reviews summarized course-level results. Where faculty-accessible program templates are supported, a faculty member may create a new evaluation tool only from templates explicitly exposed for faculty use. A faculty member may be affiliated with one or more programs.

#### 2.4.5 Student
Internal respondent who signs up or logs in through the approved access model, views only assigned evaluation forms relevant to academic context, submits responses, and may review submitted answers in read-only mode where permitted. This role includes graduating students when they qualify for graduating-student-targeted instruments based on academic status, year level, or assigned eligibility.

#### 2.4.6 Alumni
External respondent who provides feedback on graduate outcomes, program relevance, and employment readiness within the associated program context.

#### 2.4.7 Industry Partner
External respondent who evaluates internship or graduate readiness in terms of knowledge, skills, professionalism, workplace relevance, and recommendation. Industry-partner records shall include company information and program association.

### 2.5 Operating Environment
CLOIE is intended to operate as a **responsive Progressive Web Application (PWA)**. The operating environment includes:
- modern web browsers on **desktop, tablet, and smartphone devices**
- internet-based access for internal and external stakeholders
- centralized backend services and relational database support
- installable app behavior on supported **Android and desktop** environments
- add-to-home-screen and app-like launch behavior on supported **iOS** environments
- responsive layouts optimized separately for **mobile, tablet, and desktop**
- role-specific portal and dashboard views optimized by device class
- app-style launch and framing behavior where supported by browser and platform capabilities

The operating environment shall support two primary access contexts:
1. **browser-based access**, where users open CLOIE through a standard web browser
2. **installed-app access**, where users launch CLOIE from a home screen, app launcher, or desktop shortcut after installation or add-to-home-screen behavior

CLOIE shall maintain usability across both contexts while preserving its centralized web-based architecture.

### 2.6 Design and Implementation Constraints
- The project must remain realistic for a **2-person capstone team**.
- The system must remain within **evaluation, monitoring, and reporting** scope.
- The system must support **multiple academic programs** within ACD.
- The system must preserve confidentiality, controlled visibility, program-scoped analytics segregation, and historical traceability.
- The system must be developed within milestone-driven academic timelines.
- Advanced enterprise-level integrations are outside the current implementation scope unless explicitly approved.
- The system shall avoid unnecessary administrative complexity when a lighter workflow can satisfy the same evaluation objective.
- The system shall implement only the **PWA features necessary to support installability and native-feel usability**, not full native-app parity.
- The system shall avoid overbuilding offline behavior beyond realistic capstone needs.
- The current scope shall limit question types to Likert-scale and open-ended questions.

### 2.7 Assumptions and Dependencies
- Official outcome definitions and academic structure data will be available from the institution.
- The four required evaluation tools will serve as the baseline institutional instruments.
- Program, major, course, and outcome reference data will be available for initial setup.
- Reporting interpretation rules may be refined with the client during implementation.
- The access method for some external stakeholders may still require final operational confirmation.
- Institutional Google-authenticated access is available for internal users where intended.
- Faculty members will use a controlled course catalog or eligible course pool instead of depending solely on repeated manual per-term course assignment.
- Program heads will be assigned to valid program scopes before scoped template or analytics access is enabled.
- Graduating-student-specific form exposure will be resolved through student academic eligibility rather than a separate role record.

### 2.8 Explicit Non-Scope
The following are not part of CLOIE:
- instructional content delivery
- assignment posting or grading
- enrollment management
- transcript and academic record management
- direct tracking of individual student grades
- full institutional accreditation workflow automation
- automatic curriculum revision or policy enforcement
- full academic load scheduling
- full advanced AI decision-making as a core system function
- qualitative analytics beyond governed scope such as word-cloud support and related basic text preprocessing

---

## 3. System Context and Business Rules

### 3.1 Institutional Context
CLOIE is a **college-level system** for Assumption College of Davao. It must support multiple academic programs, the courses under those programs, faculty members, academic leaders, and multiple respondent groups. The product is designed to serve academic evaluation needs across the college rather than a single department or course only.

### 3.2 Academic Structure Context
The software must represent the academic context required for grouping, visibility, assignment, analytics, and reporting, including:
- program
- program acronym and metadata
- major where applicable
- program structure where a program may exist with or without majors
- course
- course type (general education, program-specific, or major-specific)
- course applicability scope within a program, including all-program applicability or selected-major applicability
- course-to-program association
- course-to-major association where applicable
- year-level classification where needed for targeting, grouping, or reporting
- student academic status or graduating eligibility where required for tool exposure
- stakeholder type
- faculty-to-program affiliation
- program-head-to-program assignment
- industry-partner-to-program association
- company association for industry partners
- course-bound form context where applicable
- centrally managed or program-managed respondent assignment context where applicable

The academic structure shall explicitly support:
- programs with or without majors
- general education courses shared across programs
- program-specific courses
- major-specific courses that apply only to selected majors within a program
- courses that apply to the entire program or to selected major contexts within that program

Year level shall be treated as an academic classification field or constrained value set unless a later implementation need justifies a heavier standalone data structure.

### 3.3 Evaluation Context
CLOIE manages evaluation data from several stakeholder groups using multiple instruments. Each evaluation must be associated with the correct academic, stakeholder, and temporal context so that outputs remain meaningful and traceable.

For the **Post-Term CILO Evaluation Tool**, the evaluation context is primarily **course-bound** and includes:
- program
- major if applicable
- semester
- term
- course selected from the valid scoped course catalog
- course code and title
- target year level(s) where valid
- activation datetime
- deadline datetime
- form status

The selected **course + semester + term** shall form part of the identity and traceable context of the course-bound CILO evaluation instance.

For the other stakeholder tools, the evaluation context may be managed centrally or by the program head through authorized template, assignment, and availability rules. Guided open-ended questions in those tools may include predefined suggested responses configured in the builder and shown to respondents as clickable helper choices that populate the response textbox without preventing further editing.

### 3.4 Core Business Rules
1. Only authorized users shall access role-appropriate functions.
2. Each major role shall be routed to a role-specific portal/dashboard after authentication.
3. Students shall only see forms assigned to their academic context.
4. Graduating-student-specific instruments shall be exposed through the Student role using academic eligibility and assignment rules rather than a separate role.
5. Alumni and industry partners shall only see forms intended for their stakeholder type and authorized program context.
6. Faculty shall only create, manage, or review course-bound CILO evaluation forms for eligible academic/course contexts.
7. A faculty member may be affiliated with more than one program.
8. The Post-Term CILO Evaluation Tool shall preserve the governed template structure while allowing faculty-configured course context, semester, term, course-specific CILOs, availability settings, and valid deployment targets through a **derived editable form instance**.
9. Faculty shall create a Post-Term CILO Evaluation Tool instance only by selecting a valid **Program**, **Major if applicable**, **Semester**, **Term**, and **Course** from the scoped course catalog.
10. Faculty edits to a derived course-bound form instance shall not overwrite the source template or affect other faculty users, other programs, or historical deployments.
11. Program Heads may create, manage, version, edit, save, and deploy program-level templates for non-course-bound stakeholder tools within their authorized program scope, including the creation of new program-scoped evaluation tools beyond the institutional baseline instruments.
12. Program Heads may enable faculty access only for selected templates within their authorized program scope.
13. Faculty may create a new evaluation tool only from templates explicitly allowed for faculty access and filtered by valid faculty program affiliation.
14. Template modifications by one Program Head shall remain isolated to the owning program and shall not affect other programs or baseline institutional tools.
15. Guided open-ended questions may include predefined suggested responses; selecting a suggestion shall populate the respondent’s textbox while preserving the respondent’s ability to edit the final submitted text.
16. Graduating student, alumni, and industry partner tools shall retain institutional baseline instrument identity when based on default tools, even when program-scoped variants or templates are created.
17. Evaluation forms shall only be answerable during active availability windows.
18. The system shall enforce one response per eligible evaluator per assigned or configured form where applicable.
19. Historical relationships among instrument version, template version, configured form instance or deployment context, and response records shall be preserved.
20. Default institutional instruments shall remain preserved even when configured instances or variants are created.
21. Active or already-used instrument versions, template versions, or form instances shall not be directly overwritten when historical traceability would be affected.
22. Supported question types in current scope shall be limited to Likert-scale and guided open-ended questions.
23. Quantitative analytics for supported Likert-scale questions shall use mean-based aggregation.
24. Qualitative analytics for supported guided open-ended questions shall support word-cloud generation.
25. Quantitative and qualitative outputs shall be exposed only according to role, program scope, and confidentiality rules.
26. Program Heads shall only access templates, analytics, reports, governed evaluation-management records, and course-catalog records within assigned program scope and valid major scope.
27. General education courses shall remain shared academic entities even when they are visible or selectable across multiple program contexts.
28. The College Dean shall have the same general review, monitoring, reporting, and governed evaluation-management capabilities as the Program Head, except that the dean’s analytics and report visibility shall span all college programs.
29. The College Dean may filter, compare, and drill down into specific program views without being restricted to a single assigned program scope.
30. Reports shall support review and evidence generation, but final academic decisions remain outside the system.
31. Submitted responses shall be protected from unintended modification after final confirmation.
32. Read-only access to submitted answers shall not grant editing, resubmission, or deletion privileges.
33. Where GO-level and CILO-level results diverge materially, the system shall preserve both result sets and surface the discrepancy for review rather than automatically resolving it.

### 3.5 Confidentiality and Governance Rules
- Responses shall be handled confidentially.
- Reports shall favor aggregated and role-appropriate views where needed.
- Raw qualitative comments shall be restricted to authorized users.
- Sensitive respondent information shall not be unnecessarily exposed in reports or dashboards.
- Student-facing and respondent-facing workflows shall avoid exposing raw data about other respondents.
- Program-scoped visibility rules shall be enforced for templates, assignments, analytics, and reports where program-limited access is required.
- College-wide visibility rules shall be enforced for the College Dean only within authorized academic-leadership scope and shall not imply system-administration rights.

---

## 4. External Interface Requirements

### 4.1 User Interface Requirements
The user interface shall support the following interface types:
- public or entry interfaces
- shared authenticated interfaces
- administrator portal interfaces
- academic-leadership portal interfaces
- faculty course/workflow management interfaces
- respondent form completion interfaces
- reporting and analytics interfaces

The user interface shall meet these general requirements:
1. The system shall provide a **role-based home/dashboard** after successful login.
2. The system shall provide **device-aware layouts** optimized for desktop, tablet, and mobile, rather than merely shrinking or stretching one layout.
3. The system shall provide **touch-friendly controls** and spacing for mobile and tablet users.
4. The system shall provide **dashboard-oriented layouts** for desktop-oriented management and reporting tasks.
5. The system shall provide header, navigation, and role-appropriate sidebar or equivalent navigation structure for major authenticated portals.
6. The **Program Head portal** and **College Dean portal** shall follow the same general portal structure, navigation pattern, and major feature set, with the primary difference being scope of visible analytics, reports, and governed evaluation-management records.
7. The **Student portal** shall be shared by regular students and graduating students, with graduating-student-specific forms shown through eligibility and assignment rules rather than a separate portal.
8. The system shall provide preview and confirmation steps for critical workflows such as evaluation submission and faculty publication of course-bound CILO forms.
9. The system shall support app-like navigation and installability expectations consistent with a PWA.

### 4.2 Software Interface Requirements
CLOIE shall use a web-based full-stack application architecture with a managed backend platform and a relational database.

At implementation level, the software interface direction is:
- **Frontend / application runtime:** Next.js
- **Programming language:** TypeScript
- **Backend platform:** Supabase
- **Database:** PostgreSQL
- **ORM / data layer:** Prisma ORM
- **Authentication:** Supabase Auth with Google OAuth where applicable

The system shall support:
- protected server-side business logic
- secure database access through structured application/backend logic
- centralized validation and authorization checks
- responsive PWA presentation behavior

### 4.3 Hardware Interface Requirements
The system shall operate on standard end-user hardware capable of running modern web browsers, including:
- desktop computers and laptops
- tablets
- smartphones

The system shall not require specialized hardware for MVP operation.

### 4.4 Communications Interface Requirements
The system shall require network connectivity for:
- authentication
- loading protected pages and forms
- submitting evaluation responses
- retrieving reports and dashboards
- synchronizing application data

MVP operation assumes online use, with only limited PWA shell support outside fully connected conditions.

---

## 5. Functional Requirements by Module

### 5.1 Authentication and Access Control Module

#### 5.1.1 User Authentication
- **FR-1.1** The system shall authenticate internal users using the approved institutional or invited account model.
- **FR-1.2** The system shall support Google-authenticated login through the chosen authentication platform where applicable.
- **FR-1.3** The system shall create or restore a secure session after successful authentication.
- **FR-1.4** The system shall redirect authenticated users to the correct role-based landing area.

#### 5.1.2 Role-Based Access Control
- **FR-1.5** The system shall resolve user role and access scope from CLOIE’s internal records after authentication.
- **FR-1.6** The system shall restrict module and page access according to user role.
- **FR-1.7** The system shall restrict data access according to role, program, major, course, academic context, stakeholder visibility rules, and report-segregation rules.
- **FR-1.8** The system shall enforce program-scoped analytics, report, and governed evaluation-management access for Program Heads.
- **FR-1.9** The system shall enforce college-wide aggregated analytics, report, and governed evaluation-management access with program filtering for the College Dean.
- **FR-1.10** The system shall allow the Program Head and College Dean to use the same general academic-leadership portal pattern while enforcing different visibility scopes.
- **FR-1.11** The system shall not grant administrator privileges to the College Dean unless separately assigned through a valid administrator role.
- **FR-1.12** The system shall deliver graduating-student-specific form access through the Student role using academic-status or eligibility checks.

#### 5.1.3 Session Management
- **FR-1.13** The system shall support secure log out.
- **FR-1.14** The system shall prevent unauthorized access to protected routes when no valid session is present.

### 5.2 Academic Structure and User Assignment Module

#### 5.2.1 Program and Major Management
- **FR-2.1** The system shall allow authorized administrative users to create, update, activate, and organize academic programs.
- **FR-2.2** The system shall allow authorized administrative users to store and update program acronym and required program metadata.
- **FR-2.3** The system shall allow authorized administrative users to create and manage majors linked to programs where applicable.

#### 5.2.2 Course Management
- **FR-2.4** The system shall allow authorized administrative users to manage the course catalog at the college-wide governance level.
- **FR-2.5** The system shall allow authorized Program Heads to create, update, activate, archive, and manage course records only within assigned program scope and valid major scope.
- **FR-2.6** The system shall allow course records to store course code, course title, course type, and required academic metadata.
- **FR-2.7** The system shall support general education, program-specific, and major-specific courses.
- **FR-2.8** The system shall support course-to-program and course-to-major associations.
- **FR-2.9** The system shall support cases where the same course exists across multiple valid program or major contexts.
- **FR-2.10** The system shall support marking a course as applicable to the entire program or only to selected major contexts within that program.

#### 5.2.3 Academic Context Management
- **FR-2.11** The system shall support year-level classification and context where required for assignment, targeting, grouping, or reporting.
- **FR-2.12** The system shall support student academic context records needed for form visibility, grouping, analytics segregation, and graduating-student eligibility.
- **FR-2.13** The system shall support student program and year-level updates by authorized administrators.

#### 5.2.4 User Affiliation and Assignment Support
- **FR-2.14** The system shall support faculty-to-program affiliation records, including multi-program affiliation.
- **FR-2.15** The system shall support program-head-to-program assignment.
- **FR-2.16** The system shall support industry-partner-to-program association.
- **FR-2.17** The system shall store industry partner company information.

#### 5.2.5 Eligible Course Context Support for Faculty
- **FR-2.18** The system shall provide a controlled course catalog or eligible course pool for faculty workflow use.
- **FR-2.19** The system shall allow faculty to select valid academic/course context combinations based on defined rules instead of requiring a rigid repeated per-term assignment process in every case.
- **FR-2.20** The system shall filter eligible course contexts according to faculty program affiliation, course applicability scope, and valid academic rules.

### 5.3 Outcomes Management Module

#### 5.3.1 Program-Level Outcomes Management
- **FR-3.1** The system shall allow authorized users to encode, update, reorder, and manage **Graduate Outcomes (GOs)** for academic programs.
- **FR-3.2** The system shall preserve Graduate Outcome records by program scope.

#### 5.3.2 Course-Level Outcomes Management
- **FR-3.3** The system shall allow faculty members to encode, update, reorder, and manage CILOs for selected course contexts.
- **FR-3.4** The system shall support variable numbers of CILOs per course.
- **FR-3.5** The system shall support CILO management for general education, program-specific, and major-specific course contexts.

#### 5.3.3 Outcome Mapping and Alignment
- **FR-3.6** The system shall support mapping of CILOs to relevant Graduate Outcomes.
- **FR-3.7** The system shall preserve CILO-to-GO mapping records for later reporting and review.
- **FR-3.8** The system shall preserve cases where GO-level and CILO-level results may diverge rather than forcing automatic reconciliation.

### 5.4 Evaluation Instrument Management Module

#### 5.4.1 Default Institutional Instruments
- **FR-4.1** The system shall preserve the following default institutional instruments as baseline evaluation tools:
  - Post-Term CILO Evaluation Tool
  - Graduating Student Exit Survey
  - Alumni Evaluation Tool
  - Industry Partner Internship Evaluation Tool
- **FR-4.2** The system shall preserve the structure and baseline intent of the default institutional instruments.
- **FR-4.3** The system shall not be limited to only the four baseline institutional instruments.

#### 5.4.2 Instrument Structure and Version Preservation
- **FR-4.4** The system shall support preservation of default instrument definitions.
- **FR-4.5** The system shall support section-based organization of governed templates and instruments.
- **FR-4.6** The system shall support preservation of historical relationships between instrument structure, template version, and collected response data.
- **FR-4.7** The system shall prevent direct destructive overwriting of instrument structures already used in live deployments or responses.

#### 5.4.3 Faculty-Configured Course-Bound CILO Form Instances
- **FR-4.8** The system shall allow faculty to create a **derived course-bound Post-Term CILO Evaluation Tool instance** from an authorized template.
- **FR-4.9** The system shall require the faculty member to select:
  - Program
  - Major (if applicable)
  - Semester
  - Term
  - Course from the valid scoped course catalog
- **FR-4.10** The system shall allow the faculty member to supply or confirm the course information shown in the form instance.
- **FR-4.11** The system shall dynamically generate the CILO section based on the faculty-managed CILO list for the selected course context.
- **FR-4.12** The system shall keep fixed governed sections outside the dynamic CILO portion unchanged unless the faculty member has explicit permission to edit a configurable portion of the derived instance.
- **FR-4.13** The system shall allow valid deployment-target selection such as program and year level only where consistent with the selected academic context and business rules.
- **FR-4.14** The system shall allow faculty to edit the allowed configurable portions of the derived course-bound form instance through a builder/configuration interface before publication.
- **FR-4.15** Faculty edits to the derived course-bound form instance shall not overwrite the source template.

#### 5.4.4 Program-Level Template Builder for Non-Course-Bound Tools
- **FR-4.14** The system shall provide a governed program-level template builder for authorized program heads.
- **FR-4.15** The system shall allow a program head to create entirely new non-course-bound evaluation tools within authorized program scope.
- **FR-4.16** The system shall allow a program head to create or edit a template title, description, purpose, and instructions.
- **FR-4.17** The system shall allow a program head to create, edit, reorder, and delete template sections.
- **FR-4.18** The system shall allow a program head to add, edit, reorder, and delete question items within sections.
- **FR-4.19** The system shall support the following question types for program-level templates in current scope:
  - Likert-scale question
  - Guided open-ended question
- **FR-4.20** The system shall allow a program head to configure the number of Likert-scale points and define the descriptor for each point.
- **FR-4.21** The system shall allow a program head to configure predefined suggested responses for guided open-ended questions.
- **FR-4.22** The system shall allow a program head to mark a template as faculty-accessible within authorized program scope.
- **FR-4.23** The system shall allow a program head to save a template for reuse within authorized program scope.
- **FR-4.24** The system shall preserve template versions when structural changes occur.

#### 5.4.5 Faculty Access to Program-Scoped Templates
- **FR-4.25** The system shall expose only faculty-accessible templates to faculty users.
- **FR-4.26** The system shall filter faculty-accessible templates according to the faculty member’s valid program affiliation and applicable business rules.
- **FR-4.27** The system shall allow a faculty member to create a new evaluation tool only from templates explicitly allowed for faculty access where that workflow is supported.
- **FR-4.28** Where a faculty-created tool is based on an authorized shared template, the system shall create a faculty-editable derived instance or equivalent configurable copy without modifying the source template.

#### 5.4.6 Governed Template Ownership
- **FR-4.28** The system shall preserve institutional baseline ownership of the default stakeholder tools.
- **FR-4.29** The system shall preserve program-scoped ownership of Program Head customizations so that template modifications remain isolated to the owning program.
- **FR-4.30** The system shall allow authorized administrators to manage institutional baseline instruments and approve governed customizations where applicable.

### 5.5 Evaluation Availability and Assignment Module

#### 5.5.1 Course-Bound Availability for the Post-Term CILO Evaluation Tool
- **FR-5.1** The system shall allow faculty to set an activation datetime for a course-bound CILO evaluation form instance.
- **FR-5.2** The system shall allow faculty to set a deadline datetime for a course-bound CILO evaluation form instance.
- **FR-5.3** The system shall validate that the deadline is later than the activation time.
- **FR-5.4** The system shall assign a status to the form instance based on configuration and current time.
- **FR-5.5** The system shall support at least the following statuses for course-bound CILO form instances:
  - Draft
  - Scheduled
  - Active
  - Closed
  - Archived
- **FR-5.6** The system shall make the course-bound CILO form visible only to intended student respondents in the relevant academic context during the valid availability window.

#### 5.5.2 Assignment and Availability for Other Tools
- **FR-5.7** The system shall allow authorized administrators or program heads to define availability and assignment settings for the graduating student, alumni, and industry partner tools.
- **FR-5.8** The system shall ensure that only intended stakeholder respondents can access those forms.
- **FR-5.9** The system shall support targeting by program, major where applicable, year level, stakeholder type, and deployment context where relevant.
- **FR-5.10** The system shall preserve the relationship among form instance, version context, schedule, and target respondents.
- **FR-5.11** The system shall expose the Graduating Student Exit Survey through the Student role when graduating eligibility and assignment conditions are met.
- **FR-5.12** The system shall preserve the selected template context when a faculty-created tool is based on a faculty-accessible program-scoped template.
- **FR-5.13** The system shall apply faculty template-visibility rules before allowing a faculty member to create or configure a new evaluation tool from a shared template.

### 5.6 Response Collection and Submission Module

#### 5.6.1 Form Rendering and Delivery
- **FR-6.1** The system shall render evaluation forms appropriate to the respondent’s role and assignment context.
- **FR-6.2** The system shall display only forms that the respondent is permitted to answer.
- **FR-6.3** The system shall render only the supported question types in current scope: Likert-scale and open-ended questions.

#### 5.6.2 Input Validation and Completion Flow
- **FR-6.4** The system shall validate required response fields before final submission.
- **FR-6.5** The system shall support a preview or review step before final submission.
- **FR-6.6** The system shall support a confirmation step before final submission.

#### 5.6.3 Submission and Final Storage
- **FR-6.7** The system shall store finalized responses securely after confirmed submission.
- **FR-6.8** The system shall enforce one response per eligible evaluator per applicable form context.
- **FR-6.9** The system shall provide a submission receipt or status view after successful submission.
- **FR-6.10** The system shall preserve finalized responses from unintended modification.
- **FR-6.11** The system shall allow read-only viewing of submitted answers where permitted by policy and role.

### 5.7 Qualitative Feedback Handling Module
- **FR-7.1** The system shall support guided open-ended response capture for instruments that include qualitative sections.
- **FR-7.2** The system shall support storage of qualitative responses linked to the correct form instance or deployment context.
- **FR-7.3** The system shall restrict access to raw qualitative comments according to confidentiality and role rules.
- **FR-7.4** The system shall support prompt-assisted qualitative entry while preserving the final submitted text.
- **FR-7.5** The system shall support predefined suggested responses for guided open-ended questions.
- **FR-7.6** The system shall allow respondents to select a suggested response that populates the textbox with the corresponding phrase.
- **FR-7.7** The system shall preserve the respondent’s ability to edit the populated text before final submission.
- **FR-7.8** The system shall support qualitative word-cloud generation from open-ended responses according to implementation priority.

### 5.8 Analytics and Attainment Computation Module
- **FR-8.1** The system shall compute aggregated summaries from collected quantitative responses.
- **FR-8.2** The system shall compute quantitative Likert-scale analytics using mean-based aggregation.
- **FR-8.3** The system shall support outcome attainment analysis where the required mapping and scoring context exist.
- **FR-8.4** The system shall support stakeholder comparison or grouping views where applicable.
- **FR-8.5** The system shall support program-scoped analytics segregation for authorized Program Heads.
- **FR-8.6** The system shall support college-wide aggregated analytics with program filtering for the College Dean.
- **FR-8.7** The College Dean shall have the same general analytics capabilities available to the Program Head, except that the dean’s analytics visibility shall span all college programs.
- **FR-8.8** The system shall allow the College Dean to compare programs and drill down into specific program views for deeper analysis.
- **FR-8.9** The system shall prioritize post-data processing and analytics for the Post-Term CILO Evaluation Tool.
- **FR-8.10** The system shall support qualitative analytics through word-cloud generation from open-ended responses.
- **FR-8.11** The system shall preserve and surface materially conflicting GO-level and CILO-level results for review instead of automatically reconciling them.
- **FR-8.12** The system may support trend analysis or historical review subject to available data and implementation priority.

### 5.9 Reporting and Evidence Generation Module
- **FR-9.1** The system shall generate summarized reports appropriate to authorized user roles.
- **FR-9.2** The system shall support dashboard-style report views.
- **FR-9.3** The system shall support outcome-oriented reports.
- **FR-9.4** The system shall support comparative reporting where enough structured data is available.
- **FR-9.5** The system shall preserve historical records for later review.
- **FR-9.6** The system shall support exportable report outputs according to implementation priority.
- **FR-9.7** The system shall restrict Program Head reports to assigned program scope.
- **FR-9.8** The system shall support dean-level filtered access across programs.
- **FR-9.9** The College Dean shall have the same general reporting capabilities available to the Program Head, except that the dean’s report visibility shall span all college programs.
- **FR-9.10** The system shall support qualitative summary views, including word-cloud outputs where implemented.
- **FR-9.11** The system shall support mean-based quantitative summary outputs for supported Likert-scale instruments.
- **FR-9.12** The system shall support reporting views that preserve materially conflicting GO-level and CILO-level results for review.

### 5.10 CQI and Action Support Module
- **FR-10.1** The system shall present findings that can support program review.
- **FR-10.2** The system shall help identify outcome gaps and areas for follow-up.
- **FR-10.3** The system shall preserve results over time for future comparison.
- **FR-10.4** The system shall support documentation-oriented review, not automatic policy changes.

### 5.11 System Administration and Configuration Module
- **FR-11.1** The system shall allow authorized users to manage user accounts and roles.
- **FR-11.2** The system shall allow authorized administrators to register or invite faculty members, program heads, deans, and industry partners using controlled account-creation workflows.
- **FR-11.3** The system shall allow authorized administrators to update student year level, program context, and graduating eligibility where needed.
- **FR-11.4** The system shall allow authorized users to manage institutional instruments.
- **FR-11.5** The system shall allow authorized users to manage academic reference data and core records.
- **FR-11.6** The system shall allow authorized users to maintain system configuration needed for college-wide use.
- **FR-11.7** The system shall allow authorized users to configure prompt libraries for supported qualitative items.

---

## 6. Data Requirements

### 6.1 General Data Requirements
CLOIE shall use a relational data model suitable for structured academic records, RBAC, form instances, template versions, responses, and reporting.

### 6.2 Core Data Entities
The data model shall support at least the following core entities:
- User
- Role
- UserRole or equivalent access mapping
- Program
- ProgramMetadata
- Major
- Course
- CourseProgramAssociation
- CourseMajorAssociation
- StudentAcademicProfile or equivalent respondent academic context
- StudentAcademicStatus or GraduatingEligibility
- FacultyProgramAffiliation
- ProgramHeadProgramAssignment
- IndustryPartnerProfile
- Company
- GO
- CILO
- OutcomeMapping
- InstrumentTemplate
- InstrumentVersion
- TemplateSection
- TemplateQuestion
- TemplateAccessRule or equivalent faculty-visibility rule
- LikertScaleDefinition
- PromptDefinition or PromptLibrary
- GuidedOpenEndedSuggestion or equivalent suggested-answer structure
- CourseBoundEvaluationFormInstance
- Availability or Assignment record for stakeholder tools
- QuantitativeResponse
- QualitativeResponse
- OutcomeDiscrepancyFlag or equivalent reporting-support record where implemented
- ReportMetadata or equivalent reporting-support record

The following data concepts may be implemented as constrained attributes, enums, or lightweight classifications unless a later implementation need justifies heavier standalone structures:
- year level
- course type
- course applicability mode
- deployment status
- response status
- question type

### 6.3 Data Relationship Requirements
- One program may have many majors where applicable.
- One program may exist without majors and still contain program-specific courses.
- One program may have many courses.
- One course may be shared as a general education entity across multiple program contexts.
- One course may apply to all majors within a program or only to selected major contexts within that program.
- One course may have many CILOs.
- One CILO may map to one or more Graduate Outcomes.
- One Graduate Outcome may be supported by one or more CILOs.
- One faculty member may be affiliated with one or more programs.
- One Program Head shall be linked to an authorized program scope.
- One College Dean shall be linked to authorized college-wide academic-leadership scope.
- One student may have one academic status record that determines graduating-student eligibility where needed.
- One industry partner shall be linked to a company and an authorized program context.
- One default instrument may have one or more versions or preserved structures over time.
- One program-level template may have many sections and many questions across versions.
- One program-level template may have zero or more access rules that define whether it is visible to faculty.
- One guided open-ended question may have zero or more predefined suggested responses.
- One Likert-scale definition may belong to one question or reusable definition context.
- One course-bound CILO evaluation form instance shall reference one program context, one course, one semester, one term, and one faculty-configured availability window.
- One response shall belong to one valid respondent and one specific form instance or deployment context.
- Historical response records shall remain linked to the relevant instrument or template structure and context used at submission time.
- Report and analytics visibility shall resolve according to role and authorized scope, including program-scoped visibility for Program Heads and college-wide filtered visibility for the College Dean.
- Where implemented, discrepancy flags shall preserve materially conflicting GO-level and CILO-level result contexts for later review.
- Faculty edits to derived course-bound form instances shall not overwrite the source template.

### 6.4 Data Input Requirements
The system shall support input of:
- academic structure records
- program catalog and course catalog records
- role and access records
- user affiliation and assignment records
- program and course outcomes
- faculty-configured course context and CILO entries
- template title, description, sections, questions, scale definitions, and faculty-access flags
- guided open-ended suggested responses
- student academic status or graduating eligibility data where needed
- availability settings
- quantitative responses
- qualitative responses

### 6.5 Data Validation Requirements
The system shall validate:
- required identifiers and academic context fields
- required CILO content fields
- valid scheduling logic
- role-consistent operations
- scope-consistent template, course-catalog, and report access
- one-response rules where applicable
- required form completion before submission
- valid Likert-scale definition structure for template questions
- valid guided open-ended suggested-response structure where used
- valid student eligibility conditions for graduating-student-targeted tools
- valid course applicability rules for program-wide versus selected-major scope
- valid faculty-template visibility rules according to program affiliation

### 6.6 Data Retention and Historical Preservation
- The system shall preserve finalized response data for historical reporting and traceability.
- The system shall preserve the contextual relationship between response data and the form or template structure used at the time of submission.
- The system shall avoid destructive overwriting of historically significant records.
- The system shall preserve template, section, question, and scale-definition history where structure changes affect future deployments.

---

## 7. Core User Workflows

### 7.1 System Administrator Workflow
The administrator workflow shall support this sequence:
1. log in
2. enter the administrator portal
3. manage user accounts and roles
4. register or invite faculty members, program heads, deans, and industry partners
5. update student academic context and graduating eligibility where needed
6. manage programs, majors, and course catalog records
7. manage institutional baseline instruments and governed records
8. maintain traceable configuration state

### 7.2 Program Head Workflow
The program-head workflow shall support this sequence:
1. log in
2. enter the program-head portal scoped to the assigned program
3. review program outcomes and program-scoped analytics
4. manage the course catalog within assigned program and valid major scope
5. open the template builder for governed non-course-bound tools
6. create a new tool or edit an existing program-scoped template by defining title, description, sections, questions, scale settings, and guided open-ended suggested responses
7. decide whether a template is faculty-accessible
8. save, reuse, or version the template
9. configure availability and assignment for the relevant stakeholder group
10. review program-scoped reports and qualitative summary outputs

### 7.3 Faculty Workflow
The faculty workflow for the Post-Term CILO Evaluation Tool shall support this sequence:
1. log in
2. open the course-bound CILO evaluation workflow
3. select Program
4. select Major if applicable
5. select Semester
6. select Term
7. select Course from the valid scoped course catalog
8. create the derived course-bound form instance
9. encode or manage CILOs for the selected course
10. configure or confirm course information
11. edit the allowed configurable portions of the derived form instance
12. set activation and deadline values
13. select valid deployment targets where allowed
14. preview the student-facing form
15. confirm and publish
16. monitor form status and summarized results

Where faculty-accessible program-scoped templates are supported, the faculty workflow may also include:
17. open the new evaluation tool flow
18. select from templates explicitly allowed for faculty access and valid under current program affiliation
19. configure the allowed derived instance within permitted business rules
20. publish and monitor the resulting tool within authorized scope

### 7.4 Student Workflow
The student workflow shall support this sequence:
1. sign up or log in through the approved access model
2. enter the shared student portal
3. access only assigned evaluation forms
4. view graduating-student-specific forms such as the exit survey only when academic eligibility and assignment conditions are met
5. start or resume an eligible form
6. complete quantitative and qualitative items
7. review answers in preview mode
8. confirm submission
9. receive a submission receipt or status view
10. review submitted answers in read-only mode where permitted

### 7.5 Alumni and Industry Partner Workflows
Alumni and industry partners shall be able to:
1. access only the forms intended for their stakeholder type and context
2. complete the applicable form
3. review before submission
4. confirm submission
5. receive status feedback after submission

### 7.6 Dean Workflow
The dean workflow shall support this sequence:
1. log in
2. enter the dean portal
3. use the same general academic-leadership portal structure and core review capabilities available to the Program Head
4. review college-wide aggregated analytics and reports
5. review governed evaluation-management records within dean-authorized scope
6. filter into a specific program view where needed
7. compare programs and stakeholder-based outputs across the college
8. review comparative and evidence-supporting outputs

---

## 8. Technology and Architecture Requirements

### 8.1 Architecture Direction
CLOIE shall follow a **single-codebase, full-stack web architecture** that is practical for a 2-person capstone team and compatible with PWA delivery.

The logical architecture direction shall include:
- a **frontend layer** for responsive, device-aware interfaces and PWA presentation behavior
- an **application/backend layer** for authentication, business rules, validation, reporting logic, role-based controls, and scope checks
- a **relational database layer** for structured academic, response, template, and analytics data
- a **reporting and analytics layer** for summarized outputs and evidence generation
- a **PWA support layer** for manifest configuration, installability behavior, icons, launch framing, and app-like presentation

### 8.2 Technology Direction
The implementation direction shall align with:
- **Next.js** as the main full-stack web application framework
- **TypeScript** as the main programming language
- **Supabase** as the managed backend platform
- **PostgreSQL** as the primary database
- **Prisma ORM** as the data-access and schema-management layer
- **Supabase Auth** with Google OAuth where applicable for authentication

### 8.3 Security and Access-Control Direction
The application/backend layer shall enforce:
- route protection
- role and scope checks
- validation of untrusted input
- confidentiality of responses
- server-side protection of protected business operations
- program-scoped and role-scoped report segregation

---

## 9. Constraints, Assumptions, and Dependencies

### 9.1 Project Constraints
- 2-person capstone team
- limited development period
- milestone-driven academic schedule
- need for an early working prototype
- controlled scope boundaries

### 9.2 Key Assumptions
- institutional reference data will be available for initial setup
- stakeholder categories remain stable for initial implementation, even if more program-scoped tools may be added later
- the four required instruments remain the baseline institutional tools
- role expectations described in the revised PRD remain valid during detailed implementation
- graduating-student-specific access will be managed through student eligibility rather than a separate system role

### 9.3 Key Dependencies
- client validation of requirements and output expectations
- availability of program, course, and outcome reference data
- consultation with faculty and program heads for mapping and report expectations
- final decisions on scoring interpretation and report thresholds where needed

---

## 10. Acceptance Criteria and MVP Prioritization

### 10.1 Acceptance Criteria Framework
The software may be considered aligned with the intended CLOIE scope when it demonstrates:
- working authentication and role-based access
- role-specific portal routing and navigation
- shared student portal behavior with correct graduating-student eligibility-based tool exposure
- academic structure representation
- working **Graduate Outcome (GO)** and **CILO** management
- working **CILO-to-GO mapping**
- correct digital delivery of the required evaluation instruments
- working Program Head template management for governed non-course-bound tools, including creation of additional program-scoped tools
- working faculty-access control on shared templates where supported
- working faculty creation of **editable derived course-bound Post-Term CILO Evaluation Tool instances**
- working Program Head course-catalog management within assigned program scope
- valid faculty selection of **Program**, **Major if applicable**, **Semester**, **Term**, and **Course** from the scoped course catalog for course-bound CILO workflows
- working availability and visibility control for evaluation forms
- secure response collection, preview/confirmation, and final storage
- one-response enforcement where applicable
- guided open-ended question support with suggested-answer population and editable final text
- basic analytics and role-appropriate reporting with scoped visibility
- quantitative mean-based summaries for supported Likert-scale questions
- word-cloud generation for supported open-ended responses
- Program Head analytics and reports limited to assigned program scope
- College Dean analytics and reports available across all college programs with filtering and drill-down
- preservation of confidentiality and historical traceability
- correct usability across desktop, tablet, and mobile
- valid PWA configuration and installable behavior on supported platforms

### 10.2 MVP Requirement Prioritization
The following requirements are treated as MVP-critical:
- user authentication and RBAC
- academic structure management
- Program Head scoped course-catalog management
- outcomes management and mapping
- default evaluation instruments
- faculty creation and publication of course-bound CILO evaluation forms
- graduating-student, alumni, and industry-partner tool availability and delivery
- controlled availability and visibility of evaluation forms
- stakeholder-specific tool exposure
- student-role-based delivery of graduating-student-specific tools through eligibility rules
- response submission workflow with preview and confirmation
- secure response storage
- submission receipt/status behavior
- post-data processing and analytics for the Post-Term CILO Evaluation Tool
- quantitative mean-based computation for supported Likert-scale questions
- guided open-ended questions with suggested-answer support
- program-scoped analytics and report segregation
- qualitative word-cloud generation for open-ended responses
- responsive layouts for desktop, tablet, and mobile
- PWA manifest, icons, and installability support
- touch-friendly mobile and tablet form usability

### 10.3 Deferred or Enhancement-Level Requirements
The following may be implemented after core stability is reached:
- richer qualitative analytics beyond basic word cloud or prompt support
- more advanced longitudinal dashboards
- broader export and report customization
- deeper CQI action-record support
- deeper offline capabilities beyond a limited shell-style experience
- advanced PWA caching strategies and non-essential platform refinements

### 10.4 Traceability Matrix Placeholder
A traceability matrix should later map:
- stakeholder or user requirements
- functional requirements
- modules
- test cases
- acceptance results

---

## 11. Integrated Evaluation Instruments Summary

### 11.1 Post-Term CILO Evaluation Tool
Used primarily for student evaluation of:
- CILO attainment
- overall course outcome attainment
- facilities and learning resources
- optional qualitative feedback

This instrument shall use a **fixed institutional template** with a **faculty-generated dynamic CILO section**.

### 11.2 Graduating Student Exit Survey
Used for graduating students, through the Student role, to provide feedback on:
- program and academic experience
- learning outcomes and skills development
- facilities and learning environment
- blended learning experience
- mission-oriented formation
- overall satisfaction
- qualitative feedback

### 11.3 Alumni Evaluation Tool
Used for alumni to evaluate:
- program learning experience
- graduate outcomes attainment
- employment and readiness
- overall program assessment
- qualitative feedback

### 11.4 Industry Partner Internship Evaluation Tool
Used for industry partners to evaluate:
- knowledge competence
- skills competence
- professional and character traits
- overall graduate readiness
- qualitative recommendations and employment recommendation

### 11.5 Supported Program-Level Template Builder Structure
Governed program-level templates for non-course-bound tools shall support:
- title
- description and instructions
- sectioning
- Likert-scale questions with configurable scale definitions
- open-ended questions with predefined or prompt-assisted guidance
- reusable saved templates and preserved versions
- creation of additional program-scoped tools beyond the four baseline instruments

---

## 12. Non-Functional Requirements

### 12.1 Usability
- **NFR-1** The system shall provide clear, role-appropriate navigation.
- **NFR-2** The system shall support simple respondent workflows, especially on mobile devices.
- **NFR-3** The system shall provide preview and confirmation before final submission or publication in critical workflows.
- **NFR-4** The system shall optimize interfaces separately for desktop, tablet, and mobile device classes.
- **NFR-5** Each major authenticated role portal shall provide a header and role-appropriate sidebar or equivalent navigation pattern.
- **NFR-6** The Student portal shall remain consistent for regular students and graduating students, with differences in tool access determined by eligibility and assignment.

### 12.2 Security and Access Control
- **NFR-7** The system shall require secure authentication before protected access.
- **NFR-8** The system shall enforce role-based and scope-based authorization.
- **NFR-9** The system shall validate and sanitize untrusted input where needed.
- **NFR-10** The system shall protect finalized responses from unauthorized or unintended modification.
- **NFR-11** The system shall protect confidential and raw qualitative data from unauthorized exposure.
- **NFR-12** The system shall enforce program-scoped analytics and report segregation where required.
- **NFR-13** The system shall enforce college-wide filtered analytics and report access for the College Dean without automatically granting administrator privileges.

### 12.3 Reliability and Integrity
- **NFR-14** The system shall preserve data integrity across structured academic and response records.
- **NFR-15** The system shall preserve historical traceability for collected response data.
- **NFR-16** The system shall minimize duplicate submissions through one-response enforcement where applicable.
- **NFR-17** The system shall preserve template and version history where structural changes affect future deployments.

### 12.4 Performance
- **NFR-18** The system shall provide acceptable response times for common operations under expected capstone-scale usage.
- **NFR-19** The system shall remain usable for form-heavy and dashboard-oriented tasks on supported devices and browsers.

### 12.5 Maintainability
- **NFR-20** The software architecture shall remain understandable and modular enough for a 2-person team to maintain.
- **NFR-21** The implementation shall favor clear module boundaries, reusable validation, and structured schema evolution.

### 12.6 Scalability
- **NFR-22** The system shall be structured to support multiple academic programs without redesigning the entire platform.
- **NFR-23** The system shall support additional records and report history growth within reasonable capstone-scale expectations.
- **NFR-24** The system shall support the governed addition of new evaluation tools and controlled modification of existing ones.

### 12.7 Availability
- **NFR-25** The system shall be designed for centralized web availability through hosted deployment.
- **NFR-26** The system shall operate primarily as an online system, with only limited shell-style PWA support outside a fully connected state.

### 12.8 Cross-Platform Accessibility
- **NFR-27** The system shall remain accessible through modern desktop, tablet, and smartphone browsers.
- **NFR-28** The system shall support installable PWA behavior on supported platforms.
- **NFR-29** The system shall preserve a native-feel, app-like interaction pattern across device classes.

### 12.9 PWA and Installability Requirements
- **NFR-30** The system shall provide app manifest support and application identity assets.
- **NFR-31** The system shall support app-like launch framing where supported.
- **NFR-32** The system shall avoid claiming full native parity where platform limitations apply.

---

## 13. Supporting Design Artifacts
The following related artifacts may be maintained separately but should remain aligned with this SRS:
- use case diagram
- use case descriptions
- ERD or database schema
- data dictionary
- prototype screens
- module hierarchy
- testing plan
- deployment diagram
- PRD
- tech stack document

---

## 14. Summary Statement
This revised SRS defines CLOIE as a college-level academic evaluation, monitoring, and reporting system tailored for Assumption College of Davao. It formalizes the software behaviors, role scope, data rules, interface expectations, technical direction, constraints, and quality attributes needed to build a realistic capstone implementation aligned with the revised product direction.

It specifically reflects the revised architecture in which:
- the system manages **Graduate Outcomes (GOs)** as the program-level outcomes and **CILOs** as the course-level outcomes
- the system supports **CILO-to-GO mapping**
- the **Post-Term CILO Evaluation Tool** uses a **faculty-managed derived course-bound configuration and scheduling flow**
- faculty must select the valid **Program**, **Major if applicable**, **Semester**, **Term**, and **Course** from the scoped course catalog when creating a course-bound CILO evaluation instance
- faculty may edit the allowed configurable portions of the **derived course-bound form instance** without overwriting the source template
- **Graduating students use the shared Student portal**, with exit-survey access driven by academic eligibility rather than a separate system role
- **Program Heads** may create, manage, version, edit, save, and deploy **program-level templates** for non-course-bound stakeholder tools within assigned program scope, including additional tools beyond the four baseline instruments
- the system supports only **Likert-scale** and **guided open-ended** question types in current scope
- the system computes quantitative analytics through **mean-based aggregation** and supports qualitative analytics through **word-cloud generation**
- the **College Dean** uses the same general academic-leadership portal capabilities and operational access pattern as the **Program Head**, but with analytics and report visibility spanning all college programs
- the system enforces **program-scoped analytics and report segregation** for Program Heads and **college-wide filtered visibility** for the College Dean
- the system is delivered as a **responsive installable PWA**
- the application stack follows the current **Next.js + Supabase + PostgreSQL + Prisma** direction