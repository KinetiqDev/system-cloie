# CLOIE Notion Workspace Audit Report

**Date:** 2026-07-18  
**Source:** Notion API (read-only)  
**Scope:** CLOIE Project Management Dashboard and all sub-pages/databases

---

## 1. WORKSPACE STRUCTURE OVERVIEW

**Root page:** 🎓 CLOIE Project Management Dashboard

- ID: `31bf0a70-0ba5-8043-9ecf-cbeac1ee0172`
- Created: 2026-03-06 | Last edited: 2026-05-22
- URL: https://app.notion.com/p/CLOIE-Project-Management-Dashboard-31bf0a700ba580439ecfcbeac1ee0172

**Direct children (pages and databases on the dashboard):**

| Type                     | Name                                   | ID                                     | Notes                      |
| ------------------------ | -------------------------------------- | -------------------------------------- | -------------------------- |
| child_page               | Key Notes                              | `342f0a70-0ba5-8039-80ce-e963d57da736` | Has subpage: Defense Notes |
| child_page               | WBS section outline                    | `33bf0a70-0ba5-80e1-91f5-cc692df64a59` |                            |
| child_page               | Chapter 3 Draft Outline                | `33bf0a70-0ba5-80d3-a22a-ce5386f34f1a` |                            |
| child_page               | Notion Template                        | `332f0a70-0ba5-80e7-8a54-c141a781e88f` |                            |
| child_page               | Requirements Specification Revision    | `343f0a70-0ba5-80d7-bd83-e459dcd1d690` |                            |
| child_page               | Kanban Backlog table                   | `343f0a70-0ba5-8022-a090-f7a17b23a17f` | Old kanban subpage         |
| child_page               | Evaluation Tools type                  | `34ef0a70-0ba5-8050-af61-ed58e0870af7` |                            |
| child_page               | Use Cases                              | `345f0a70-0ba5-80d8-b889-d38c9abb2142` |                            |
| child_page               | Product Requirements Document          | `343f0a70-0ba5-802f-82e7-e6e5602139d4` |                            |
| child_page               | Software Requirements Specification    | `343f0a70-0ba5-808c-ba9f-f6334e309a50` |                            |
| child_page               | UI/UX Per Page Elements and Components | `343f0a70-0ba5-8096-82eb-d2675d2fee66` |                            |
| child_page               | Full Stack Folder Structure            | `343f0a70-0ba5-8005-b987-d11c2c2a8498` |                            |
| child_page               | Bugs to fix                            | `35af0a70-0ba5-80fa-b728-e550a18e8ba9` |                            |
| child_database           | CLOIE Tasks (NEW, by-module Kanban)    | `3fcf91b2-741b-4981-97e1-f212f6d89882` | Active kanban              |
| child_database           | CLOIE Backlog                          | `a05b66d4-b966-45f2-a0ad-a276b222006a` | Active backlog             |
| child_database           | CLOIE Tasks (OLD)                      | `332f0a70-0ba5-807a-8d4e-ef493675c479` | Deprecated                 |
| child_database           | Consultation Notes                     | `332f0a70-0ba5-809c-9e1c-dfcf248ff176` |                            |
| child_database           | Development Log                        | `332f0a70-0ba5-80d1-816e-e3ef7ac0dac2` |                            |
| child_database           | Testing Records                        | `332f0a70-0ba5-80cf-8dc2-cc3a05f918ca` |                            |
| child_database           | Change Log                             | `332f0a70-0ba5-80ae-b3cd-fa42cc22fccc` |                            |
| child_database           | Questions to ask                       | `31bf0a70-0ba5-807e-b697-e461e0d64a9a` |                            |
| child_database (unnamed) | Untitled (Kanban Board section)        | `368f0a70-0ba5-806f-ba55-f26c84e933ef` | Inline unnamed DB          |
| child_database (unnamed) | Untitled (Backlog table section)       | `368f0a70-0ba5-80dc-9329-caf413083893` | Inline unnamed DB          |
| child_database (unnamed) | Untitled (Failed Tests section)        | `343f0a70-0ba5-800a-9e35-de85fcd30adb` | Inline unnamed DB          |
| child_database (unnamed) | Untitled (Recent Changes)              | `343f0a70-0ba5-80b8-b355-d27d01948f78` | Inline unnamed DB          |

---

## 2. DEFENSE NOTES — VERBATIM CONTENT

**Page:** Defense Notes  
**ID:** `361f0a70-0ba5-80c1-a39d-fb349f452f58`  
**Parent:** Key Notes → CLOIE Project Management Dashboard

---

### Title Defense {yellow background}

- The flexibility of the forms. The system should be able to adapt for changes later on.
- Curriculum revision is every **5 years.**
- Important: GOs are intercorrelated with the CILOs. So you cannot say the GOs were attained when the CILO's were not attained. The system should do something about this. In relation to this, how do we do—implement analytics to create that report.
- Less of the detailed profile of the users—the system is more concerned about their responses.
- Bulk uploading of the list of students????
- The client is the school—Assumption College of Davao.
- Program / Graduate Outcomes should be set by the admin or the program head. What the faculty should set is the CILO—the course or subject assigned to that faculty member.
- What CHED required is the CQI—Continuous Quality Improvement. To prove CQI, there should a system that monitors whether the curriculum is ok or not.
- Due to many schools offering IT courses nowadays, CHED now screens schools. The time will come if your school doesn't have accreditation, the program affected will be forced to close.
- There has to be some sort of way to know if the students' response is reflective to their tests scores. To handle contradictions in the responses (e.g., student evaluates himself to have not attained the learning outcomes; however, when it comes to his test scores, they are passed)
- A way to keep the integrity of the responses, but at the same time protecting the identity of the person/ student. To prevent CLOIE in becoming a platform to attack the teacher.
- Ensure that before the submission of a response, there should be proofing. There should be a preview modal of the filled out answer of the students, a confirmation prompt, and final submission. The purpose of this is giving the student the possibility to change their responses before submitting.
- The faculty would only input the CILO.
- In the scope, separate who encodes the CILOs and GOs. The program heads will be the one who encodes the GOs, while the faculty will be the one who encodes the CILO.
- Program / Graduate Outcomes

---

### Outline Defense {yellow background}

- **Software Development Methodology**
  - The Gantt chart must reflect the development progress of the kanban board. No documentation, except for related technical documentations (e.g. user manual/guide).
  - Gantt chart must utilize different colors signifying different status of activities: to-do, in-progress, done. There must be a legend. Follow the color scheme used in the kanban stages.
  - Consider showing the starting backlog and also the finished backlog.
  - The backlog is the overall lists of tasks. These should not move. Moreover, the to-do would mirror these tasks. So when all is done, the backlog and the done column of the board are the same.
  - The backlog can be based on the SDLC phases we have or it can be based on the modules the system have.
  - Consider adding a definition of done in each backlog entry.
  - Do not include documentation tasks in the kanban. It should solely focus on the software development tasks.
  - All in all, refactor the kanban board to be a per module board with its backlog based on the tasks of that specific module.

- **Use-case Diagram**
  - System admin would be the secretary. ICTC would only handle the maintenance.
  - Have a secretary actor.
  - Secretary will have access to program head's privileges in cases a certain PH is not available.
  - The secretary will have access to College Dean privileges.
  - The College Dean would have access to Program head privileges.
  - The secretary would have some sort of a "bypass" to have access to what privileges and permissions a program head have, for instances a certain program head is unavailable. The same thing with the college dean, the secretary should be able to have access to certain privileges of the college dean. Also, the college dean should also have "bypass" access to program heads if a program head/s are not available.
  - We are given the liberty and some what freedom to the design the system given that the necessary Information and Reports are produced by the system; that the system would be able to address the requirements of the users and support their functionalities.

- **System Functionalities and Operations**
  - Encoded Courses should be tied to a specific Year level, Semester, and Term.
  - Consider implementing a evaluation form code entry for CILO evaluations wherein, a student will encode a code given by the faculty member pertaining to a certain course so that, that student will now have access to the cilo evaluation tool form and will now be included in the list of respondents. - **Deprecated**. Students will be bulk uploaded in someway.
  - Each respondent role must have their own sign up page forms. - Addressed through portal/respondents and portal/staff pages, where they have their own "continue as \*" buttons
  - Create a sign up form for Faculty Members, Industry Partners, and Alumni. - Addressed through on-boarding forms and secretary role creation forms.
  - Bulk uploading of the lists of students to a specific course assigned to that faculty member. The faculty member can add or bulk upload the list. The secretary would also have access to the lists of enrolled students per course, and per program, for instances that the faculty member is not available or for whatever other reason.
  - Program heads would be able to enroll their own industry partners. The program head provides the access code to their industry partners. - **Not yet addressed.**
  - Implementation of encoding of Requested/ Tutorial courses. - **Deferred**
  - In the program head's course assignment to the faculty, the program head would just simply assign a course to a faculty member. 5 steps is a lot. Now, the program head would just choose a course to assign, and to which faculty member to assign that course, given that the courses encoded by the secretary are already tied to specific year level, semester, and term. Furthermore, given that the faculty member would be the one to specify the respondents of the course-bound evaluations that is based on the assigned courses to them by the program head via bulk uploading of the lists of students. - Addressed but in a different way. It still has 5 steps, but courses now have columns for default year level, semester, and term.

---

## 3. KEY NOTES — SUBPAGE LISTING

**Page:** Key Notes (`342f0a70-0ba5-8039-80ce-e963d57da736`)  
**Subpages:** Programs in assumption | Defense Notes | Client needs

**Key Notes body content (inline)** covers detailed RBAC workflow documentation per role:

- System Administrator (Secretary): User Management, Program Catalog, Course Catalog CRUD
- Program Head Portal: Analytics scope, evaluation tool builder, section/question management
- Industry Partners: Respondent portal, company affiliation, internship evaluation flow
- College Dean: Aggregated analytics, cross-program filtering
- Faculty Member Portal: CILO evaluation tool management, multi-program affiliation
- Workflows A–F: Outcomes management, Instrument review, Evaluation availability, Analytics, Reporting/CQI, Qualitative review (each with step-by-step typical flow and named UI pages)
- Student workflow: 10-step flow (sign-up → dashboard → evaluation → preview → submit → receipt)
- Industry Partners workflow: 8-step flow
- Alumni workflow: 6-step flow

---

## 4. BY-MODULE CLOIE TASKS KANBAN BOARD (Active)

**Database name:** CLOIE Tasks  
**Database ID:** `3fcf91b2-741b-4981-97e1-f212f6d89882`  
**Data Source ID:** `df448eca-7a4f-4da5-a7f6-75e5d1173fff`  
**Description:** Actionable work items that move through the Kanban workflow. Child subtasks linked to parent features in CLOIE Backlog.  
**Created:** 2026-05-16 | **Last edited:** 2026-06-01  
**Parent page:** CLOIE Project Management Dashboard

### 4.1 Schema (All Properties)

| Property Name        | Type                     | Options / Notes                                                                                                                                                                                                                   |
| -------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task Name            | title                    | Main task title                                                                                                                                                                                                                   |
| Status               | select                   | Backlog (gray), To Do (purple), In Progress (orange), Testing (blue), Done (green)                                                                                                                                                |
| Module               | select                   | User Roles and Authentication (red), Academic Structure (orange), Evaluation Instrument (yellow), Evaluation Deployment (green), Outcomes Management (blue), Response Collection (purple), Analytics (pink), Report Export (gray) |
| Priority             | select                   | Low (gray), Medium (blue), High (red)                                                                                                                                                                                             |
| Assignee             | multi_select             | Andy (purple), Abbegail (pink)                                                                                                                                                                                                    |
| Type                 | multi_select             | UI/UX and Branding (blue), Database and System Design (default), Frontend Development (green), Backend Development (purple), Testing (gray)                                                                                       |
| Description          | rich_text                | Short explanation of task                                                                                                                                                                                                         |
| Definition of Done   | rich_text                |                                                                                                                                                                                                                                   |
| Task id              | rich_text                |                                                                                                                                                                                                                                   |
| Start Date           | date                     |                                                                                                                                                                                                                                   |
| Completed Date       | date                     |                                                                                                                                                                                                                                   |
| Files & media        | files                    |                                                                                                                                                                                                                                   |
| Related Backlog Item | relation → CLOIE Backlog | Dual-property synced to "Related Tasks"                                                                                                                                                                                           |

### 4.2 All Kanban Items (94 total)

**NOTE:** All items have `module = null` and `priority = null` except one (ERD: Draft has Priority=High). The `Module` select field is defined in schema but not populated on any task — a significant data gap. Most tasks have no Start Date, Completed Date, or Task id filled in.

#### Status: Done (17 items)

| Task Name                                                       | Assignee | Type                       |
| --------------------------------------------------------------- | -------- | -------------------------- |
| Review Modal & Final Submit                                     | Andy     | Frontend, Backend          |
| Submitted Response History                                      | Andy     | Frontend, Backend          |
| Alumni Evaluation Portal                                        | Andy     | Frontend, Backend          |
| Evaluation Response Draft Auto-Save                             | Andy     | Backend                    |
| Evaluation Wizard Flow (Respondents)                            | Andy     | Frontend                   |
| Pending Evaluations Dashboard (Respondents)                     | Andy     | Frontend, Backend          |
| Program / Graduate Outcomes Management (Program Heads)          | Andy     | Frontend, Backend          |
| Respondent Form Submission Validation                           | Andy     | Backend                    |
| Respondent Review Modal (Students, Industry Partners, Alumni)   | Andy     | Frontend                   |
| Template Listing and Filtering                                  | Andy     | Frontend, Backend          |
| Template Builder - Backend Validation                           | Andy     | Backend                    |
| Template Builder - Question Management                          | _(none)_ | Frontend                   |
| Template Builder - Section Management                           | Andy     | Frontend                   |
| Program-Owned Template Management (Program Heads)               | Andy     | Frontend, Backend          |
| Baseline Template Management (Secretary & College Dean)         | Andy     | Frontend, Backend          |
| CILO Management per Course (Faculty Member)                     | Andy     | Frontend, Backend          |
| Majors Management                                               | Andy     | Frontend, Backend          |
| Student Sign-Up Form                                            | Andy     | Frontend, Backend          |
| UI/UX Design System: Define Visual Foundations                  | Andy     | UI/UX and Branding         |
| UI/UX Design System: Build Reusable Component Library           | Andy     | UI/UX and Branding         |
| UI/UX Design System: Define Layout, Grid, and Breakpoints       | Andy     | UI/UX and Branding         |
| System Architecture: Design Authentication and RBAC Model       | Andy     | Database and System Design |
| System Architecture: Define API Design and Endpoint Conventions | Andy     | Database and System Design |
| System Architecture: Define Tech Stack and Layer Structure      | Andy     | Database and System Design |
| Centralized Login Page                                          | Andy     | Frontend, Backend          |

#### Status: Testing (26 items)

| Task Name                                                           | Assignee | Type                                          |
| ------------------------------------------------------------------- | -------- | --------------------------------------------- |
| Testing: Implement github actions for CI/CD                         | Andy     | _(none)_                                      |
| Anonymized Individual Response View                                 | Andy     | Frontend, Backend                             |
| Response Progress Tracking                                          | Andy     | Frontend                                      |
| Evaluation Availability Guard                                       | Andy     | Backend                                       |
| Program / Graduate Outcomes Listing                                 | Andy     | Frontend, Backend                             |
| CILO Management (Faculty)                                           | Andy     | Frontend, Backend                             |
| Deployment Scheduling (Activation and Deadline)                     | Andy     | Frontend, Backend                             |
| Program-Deployment Flow (Program Heads)                             | Andy     | Frontend, Backend                             |
| Course-Bound Evaluation Publish Flow (Faculty Members)              | Andy     | Frontend, Backend                             |
| Template type support: Program-Wide and Course-Bound Form Templates | Andy     | Frontend, Backend                             |
| Faculty Template Duplication and Edit                               | Andy     | Frontend, Backend                             |
| Template Versioning                                                 | Andy     | Frontend, Backend                             |
| CILO to Question Binding                                            | Andy     | Frontend, Backend                             |
| Deadline Enforcement                                                | Andy     | Backend                                       |
| Course Assignment (Program Heads)                                   | Andy     | Frontend, Backend                             |
| Active Term Instance Setting                                        | Andy     | Frontend, Backend                             |
| Term Instance Management                                            | Andy     | Frontend, Backend                             |
| School Year Management                                              | Andy     | Frontend, Backend                             |
| Course Scope Type Support (GE, Prof. Courses, Major-specific)       | Andy     | Frontend, Backend                             |
| Course Encoding                                                     | Andy     | Frontend, Backend                             |
| Program Management                                                  | Andy     | Frontend, Backend                             |
| Role-Based Access Control                                           | Andy     | Frontend, Backend                             |
| Logout and Session Management                                       | Andy     | Frontend, Backend                             |
| Wireframe: Respondent Dashboard and CILO Code Entry Screens         | Andy     | UI/UX and Branding                            |
| Wireframe: Outcomes Management Screens                              | Andy     | UI/UX and Branding                            |
| Wireframe: Evaluation Instrument Builder Screens                    | _(none)_ | UI/UX and Branding                            |
| Wireframe: Academic Structure and Enrollment Screens                | Andy     | UI/UX and Branding                            |
| Use Case: Identify All System Actors and Draft a Use-Case Diagram   | Abbegail | Database and System Design                    |
| ERD: Finalize and Baseline Schema                                   | Andy     | Database and System Design                    |
| ERD: Define Database Constraint and Rules                           | Andy     | Database and System Design                    |
| ERD: Draft Initial Entity-Relationship Diagram                      | Andy     | Database and System Design _(Priority: High)_ |

#### Status: In Progress (23 items)

| Task Name                                                | Assignee | Type               |
| -------------------------------------------------------- | -------- | ------------------ |
| Reports Page UI (College Dean)                           | Andy     | Frontend           |
| Reports Page UI (Program Heads)                          | Andy     | Frontend           |
| Dean Dashboard KPI's and Charts (College-wide)           | Andy     | Frontend, Backend  |
| Program head Dashboard KPI's and Charts                  | Andy     | Frontend, Backend  |
| Industry Partners Evaluation Portal                      | Andy     | Frontend, Backend  |
| Evaluation Session Loading                               | Andy     | Backend            |
| CILO to GO Mapping                                       | Andy     | Frontend, Backend  |
| Deployment Duplicate Prevention                          | Andy     | Backend            |
| Deployment Detail View (Faculty and Program Heads)       | Andy     | Frontend, Backend  |
| Deployment Listing (Faculty and Program Heads)           | Andy     | Frontend, Backend  |
| Faculty-Owned Template Management (Faculty Members)      | Andy     | Frontend           |
| Student Enrollment Listing                               | Andy     | Frontend, Backend  |
| Student Enrollment (Bulk Uploading)                      | Andy     | Frontend, Backend  |
| Student Enrollment (Individual)                          | Andy     | Frontend, Backend  |
| Program Head Course Assigning to Faculty Members         | Andy     | Frontend, Backend  |
| Course Listing and Filtering                             | Andy     | Frontend, Backend  |
| Course Edit and Deactivation                             | Andy     | Frontend, Backend  |
| Industry Partner Sign-Up Form                            | Andy     | Frontend, Backend  |
| Alumni Sign-Up Form                                      | Andy     | Frontend, Backend  |
| Faculty Sign-Up Form                                     | Andy     | Frontend, Backend  |
| Wireframe: Report Export Screens                         | Andy     | UI/UX and Branding |
| Wireframe: Analytics Dashboard Screens                   | Andy     | UI/UX and Branding |
| Wireframe: Authentication and Role-Based Sign-up Screens | Andy     | UI/UX and Branding |

#### Status: To Do (11 items)

| Task Name                                                         | Assignee | Type               |
| ----------------------------------------------------------------- | -------- | ------------------ |
| Bulk Encoding of Courses                                          | Andy     | Frontend, Backend  |
| Cross-Program Outcomes Summary Report                             | Andy     | Frontend, Backend  |
| CILO Attainment Report                                            | Andy     | Frontend, Backend  |
| Program / Graduate Outcomes Summary Reports                       | Andy     | Frontend, Backend  |
| Analytics Page Filters for Program (College Dean)                 | Andy     | Frontend, Backend  |
| Analytics Page Filters for School Year, Semester, and term        | Andy     | Frontend, Backend  |
| Analytics Processing for Qualitative questions (wordcloud)        | Andy     | Backend            |
| Analytics Processing for Quantitative questions                   | Andy     | Backend            |
| Dean Analytics Cross-Program View                                 | Andy     | Frontend, Backend  |
| Program Head Analytics Page (Program-scope)                       | Andy     | Frontend, Backend  |
| Course Assignment Edit and Deactivation (Program Heads)           | Andy     | Frontend, Backend  |
| Course Assignment Listing (Program Heads)                         | Andy     | Frontend, Backend  |
| Industry Partner Program Access via Access Code                   | Andy     | Frontend, Backend  |
| Wireframe: Evaluation Deployment and CILO Code Generation Screens | Andy     | UI/UX and Branding |

#### Status: Backlog (0 in new DB — all tasks are in active workflow statuses)

---

## 5. BY-MODULE CLOIE BACKLOG (Active)

**Database name:** CLOIE Backlog  
**Database ID:** `a05b66d4-b966-45f2-a0ad-a276b222006a`  
**Data Source ID:** `e171616a-1fd3-4410-8bcd-4e905a6e3cf1`  
**Description:** High-level features, user stories, and epics representing deliverable value for CLOIE. Parent items that break down into actionable subtasks.  
**Created:** 2026-05-16 | **Last edited:** 2026-05-22

### 5.1 Schema (All Properties)

| Property Name      | Type                         | Options / Notes                                                    |
| ------------------ | ---------------------------- | ------------------------------------------------------------------ |
| Feature Name       | title                        |                                                                    |
| Status             | select                       | To do (purple), In Progress (orange), Testing (blue), Done (green) |
| Priority           | select                       | Low (gray), Medium (blue), High (red)                              |
| Backlog ID         | rich_text                    | e.g. MODULE-001, BASE-001                                          |
| Date               | date                         |                                                                    |
| Definition of Done | rich_text                    |                                                                    |
| Related Tasks      | relation → CLOIE Tasks (new) | Dual-property synced to "Related Backlog Item"                     |
| Progress           | rollup                       | Rolls up Status from Related Tasks                                 |

### 5.2 All Backlog Items (10 items)

| Backlog ID | Feature Name                   | Status      | Priority | Definition of Done                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | ------------------------------ | ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MODULE-001 | User Access and Authentication | In Progress | High     | All roles can successfully register via their respective sign-up forms; login, logout, and session expiry work correctly; RBAC enforces correct permissions per role; the bypass/delegation system allows Secretary and College Dean to assume delegated privileges on demand and logs each usage; ICTC access is restricted to maintenance functions only.                                                                                   |
| MODULE-002 | Academic Structure             | In Progress | High     | Secretary can create, update, and deactivate colleges, departments, programs, and courses; all courses are required to be tied to a Year Level, Semester, and Term upon encoding; Regular and Requested/Tutorial course types are supported; reference data is correctly reflected across dependent modules.                                                                                                                                  |
| MODULE-003 | Academic Period and Enrollment | In Progress | High     | Academic years and semesters can be created and activated; Program Head can assign a course to a faculty member in a single streamlined step; Faculty can bulk upload a student list to their assigned course; Secretary can manage student lists as fallback; Program Head can enroll Industry Partners via access code provisioning; enrolled student lists are visible to Secretary, Program Head, College Dean, and the assigned Faculty. |
| MODULE-004 | Evaluation Instrument          | In Progress | High     | Authorized users can create, edit, version, and deactivate evaluation instruments; all question types (rating scale, open-ended, etc.) are supported; criteria and indicators can be defined and mapped to evaluation purposes; CILO instrument type is available and correctly linked to the code-based access flow.                                                                                                                         |
| MODULE-005 | Evaluation Deployment          | In Progress | Medium   | Authorized users can assign an instrument to a course-faculty pair within a defined evaluation period; open and close dates are enforced; Faculty can generate a unique CILO access code per course evaluation; evaluator-evaluatee pairings are correctly configured per respondent role; evaluation instances can be activated and deactivated.                                                                                             |
| MODULE-006 | Outcomes Management            | In Progress | Medium   | Learning outcomes and performance indicators can be defined and linked to evaluation criteria; outcome attainment is computed per course and program based on evaluation results; OBE alignment is traceable from criteria to outcomes; authorized roles (Program Head, Dean) can view outcome attainment reports.                                                                                                                            |
| MODULE-007 | Response Collection            | In Progress | High     | Each respondent role has a distinct, functional entry point to their pending evaluations; students can enter a CILO access code, gain access to the corresponding form, and are added to the respondent list; all evaluation forms render correctly and submissions are saved and validated; anonymity is enforced where applicable; completion tracking accurately reflects who has and has not responded per evaluation instance.           |
| MODULE-008 | Analytics                      | To do       | Medium   | Scores and ratings are accurately computed from collected responses; summaries are generated per faculty, course, department, and program; trend analysis across semesters is functional; dashboards display role-appropriate data (e.g., Dean sees department-level, Program Head sees program-level, Faculty sees own results); all visualizations are accurate and performant.                                                             |
| MODULE-009 | Report Export                  | To do       | Low      | Authorized users can generate and download evaluation reports in PDF and/or Excel format; report templates are tailored per stakeholder role; batch report generation works for multiple courses or faculty; exported reports accurately reflect the data shown in Analytics; reports are formatted and presentable for official use.                                                                                                         |
| BASE-001   | System Design and Architecture | In Progress | High     | All design artifacts are completed, reviewed, and baselined: ERD is finalized and reflects the actual database schema; system architecture diagram is documented; use case diagram covers all roles including Secretary bypass flows; UI/UX design system and screen wireframes are approved; all diagrams are stored in the project repository.                                                                                              |

---

## 6. OLD / DEPRECATED CLOIE TASKS DATABASE

**Database name:** CLOIE Tasks (old)  
**Database ID:** `332f0a70-0ba5-807a-8d4e-ef493675c479`  
**Data Source ID:** `332f0a70-0ba5-80bd-ba5a-000bdef7e6c1`  
**Created:** 2026-03-29 | **Last edited:** 2026-05-16  
**No description.** Also on the dashboard page directly (not grouped under the new Kanban/Backlog headings).

This database has a different schema from the new one: Module is `multi_select` (not `select`), has an additional `Stakeholder Source` select property, `Related Consultation` select, `Notes` rich text, and `Related Test Record` relation to Testing Records.

It has 49 items — a mix of early implementation tasks, documentation tasks (Chapter 3/4 drafts), and prototype tasks. It does NOT follow the "by-module" structure — tasks lack module tags and include documentation work explicitly excluded from the new kanban by the adviser's direction.

**Representative items from old DB (selected):**

| Task                                                      | Status      | Assignee       |
| --------------------------------------------------------- | ----------- | -------------- |
| Build Program Heads Analytics Dashboard                   | In Progress | Andy           |
| Polish UI/UX and bug fixing across different role portals | In Progress | Andy           |
| Technical Documentation Revision based Adviser's comments | In Progress | Abbegail       |
| Finalize ERD from current Prisma schema                   | null        | Andy           |
| Build dean analytics dashboard                            | In Progress | Andy           |
| Add report export/print evidence view                     | null        | Andy           |
| Build qualitative feedback report view                    | null        | Andy           |
| Mobile/tablet responsiveness QA                           | null        | Andy, Abbegail |
| Add Supabase RLS/security hardening pass                  | Backlog     | Andy           |
| Build attainment computation engine                       | Backlog     | Andy           |
| Implement github actions ci/cd                            | null        | Andy           |
| Implement outcomes management services                    | null        | Andy           |
| Draft Chapter 3 – Requirements Specification              | Done        | Abbegail, Andy |
| Draft Chapter 3 – WBS                                     | Done        | Abbegail       |
| Draft Chapter 4 – Use Case Diagram                        | Done        | Abbegail       |
| Draft Chapter 3 - Implementation Plan                     | Done        | Abbegail       |
| Create base project repository and technical stack        | Done        | Andy           |
| Build authentication screens                              | Done        | Andy           |
| Implement authentication and RBAC                         | Done        | Andy           |
| Build respondent-facing evaluation forms                  | Done        | Andy           |

_(Full list: 49 items including documentation drafts, architecture tasks, and implementation tasks with no module grouping)_

---

## 7. OTHER CLOIE-RELATED PAGES FOUND

| Page/DB                                | ID                                     | Notes                                                                                                                                                                                               |
| -------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consultation Notes DB                  | `332f0a70-0ba5-809c-9e1c-dfcf248ff176` | 4+ consultation records found; one entry: "Data gathering regarding the inputs and outputs of System CLOIE" (2026-03-20, participants: Ms. Roselyn M. Biala, Abbegail D. Abebon, Andy Zane B. Egut) |
| Testing Records DB                     | `332f0a70-0ba5-80cf-8dc2-cc3a05f918ca` | Referenced by Related Test Record relation on old tasks DB                                                                                                                                          |
| Development Log DB                     | `332f0a70-0ba5-80d1-816e-e3ef7ac0dac2` | Present on dashboard                                                                                                                                                                                |
| Change Log DB                          | `332f0a70-0ba5-80ae-b3cd-fa42cc22fccc` | Present on dashboard                                                                                                                                                                                |
| Questions to ask DB                    | `31bf0a70-0ba5-807e-b697-e461e0d64a9a` | Last edited 2026-04-22                                                                                                                                                                              |
| CLOIE ui/ux (task record)              | `323f0a70-0ba5-80ae-b70b-df5709bc1f5c` | Status: Done; in old Tasks DB                                                                                                                                                                       |
| Product Requirements Document          | `343f0a70-0ba5-802f-82e7-e6e5602139d4` | Subpage of dashboard                                                                                                                                                                                |
| Software Requirements Specification    | `343f0a70-0ba5-808c-ba9f-f6334e309a50` | Subpage of dashboard                                                                                                                                                                                |
| Use Cases                              | `345f0a70-0ba5-80d8-b889-d38c9abb2142` | Subpage of dashboard                                                                                                                                                                                |
| UI/UX Per Page Elements and Components | `343f0a70-0ba5-8096-82eb-d2675d2fee66` | Subpage of dashboard                                                                                                                                                                                |
| Full Stack Folder Structure            | `343f0a70-0ba5-8005-b987-d11c2c2a8498` | Subpage of dashboard                                                                                                                                                                                |
| Bugs to fix                            | `35af0a70-0ba5-80fa-b728-e550a18e8ba9` | Last edited 2026-05-10                                                                                                                                                                              |
| Chapter 3 Draft Outline                | `33bf0a70-0ba5-80d3-a22a-ce5386f34f1a` |                                                                                                                                                                                                     |
| WBS section outline                    | `33bf0a70-0ba5-80e1-91f5-cc692df64a59` |                                                                                                                                                                                                     |

---

## 8. AUDIT FINDINGS — ISSUES, GAPS, AND INCONSISTENCIES

### 8.1 Two CLOIE Tasks Databases Coexist (Critical)

The dashboard contains **two databases both named "CLOIE Tasks"**:

- **Old DB** (`332f0a70...`): Created 2026-03-29, last edited 2026-05-16. No module grouping, includes documentation tasks, has different schema (multi_select Module, Stakeholder Source, Related Consultation, Notes). 49 items.
- **New DB** (`3fcf91b2...`): Created 2026-05-16 (same day), last edited 2026-06-01. Properly structured by-module Kanban. ~94 items.

The old DB was visually replaced but not archived/deleted. Both appear on the dashboard page. This creates confusion about which is the authoritative board. The "Kanban Board" heading on the dashboard points to an inline unnamed database (`368f0a70...` - "Untitled"), not to either named Tasks DB.

### 8.2 Module Field Unpopulated on All New Kanban Tasks

The new CLOIE Tasks Kanban has a `Module` select property with 8 defined options (User Roles and Authentication, Academic Structure, Evaluation Instrument, etc.) — these match the Backlog module IDs. However, **zero kanban tasks have Module filled in**. Only `ERD: Draft Initial Entity-Relationship Diagram` has Priority set (High); all others have null Priority and null Module. The "by-module" structure exists in schema only, not in data.

### 8.3 Related Backlog Item Not Linked

The `Related Backlog Item` relation column in the Kanban (linking tasks to backlog epics) appears unset on all items based on API output — no backlog linkages surfaced. The Backlog's `Progress` rollup would therefore show no data.

### 8.4 Unnamed Inline Databases on Dashboard

Three "Untitled" child databases exist on the dashboard page (IDs: `368f0a70...(Kanban Board section)`, `368f0a70...(Backlog table section)`, `343f0a70...(Failed Tests section)`, `343f0a70...(Recent Changes)`). These appear to be inline view duplicates or abandoned drafts. Their content is unknown without further querying but they're cluttering the dashboard.

### 8.5 Old Kanban DB Contains Documentation Tasks

The Defence Notes explicitly state: _"Do not include documentation tasks in the kanban. It should solely focus on the software development tasks."_ The old DB contains items like "Draft Chapter 3 – WBS," "Draft Chapter 4 – Use Case Diagram," "Draft Chapter 3 – Requirements Specification," etc. — documentation tasks that violate the adviser's directive. These are correctly absent from the new DB.

### 8.6 Old Kanban DB Has Null-Status Items

The old DB has multiple tasks with `status = null` (no status set): "Add report export/print evidence view," "Finalize ERD from current Prisma schema," "Build qualitative feedback report view," "Mobile/tablet responsiveness QA," "Connect response submission to analytics-ready storage," "Implement github actions ci/cd," "Implement outcomes management services," "Build outcomes management UI," "Academic structure management...," "Current prototype pages per role." These are orphaned/untracked tasks.

### 8.7 Backlog Has Only 10 Items — Missing Modules

The Backlog covers MODULE-001 through MODULE-009 plus BASE-001. There is no explicit entry for:

- Secretary/Admin-specific workflows (beyond what's in MODULE-001)
- PWA / deployment infrastructure
- Security hardening (Supabase RLS)

These appear in the old kanban but not the backlog.

### 8.8 Defense Note: "Industry Partner Access Code — Not Yet Addressed"

The Defense Notes explicitly flag: _"Program heads would be able to enroll their own industry partners. The program head provides the access code to their industry partners. - Not yet addressed."_ The new Kanban has "Industry Partner Program Access via Access Code" with Status **To Do** — this is correctly captured but still unimplemented.

### 8.9 Requested/Tutorial Courses — Deferred

Defense Notes mark implementation of Requested/Tutorial courses as **Deferred**. Backlog MODULE-002's Definition of Done mentions "Regular and Requested/Tutorial course types are supported" — inconsistency between the deferred status in Defense Notes and the DoD claiming it should be supported.

### 8.10 No Dates on Kanban Tasks

None of the new Kanban tasks have Start Date or Completed Date populated. The Defence Notes require a Gantt chart reflecting Kanban progress — without dates this is impossible to generate automatically. Dates must be backfilled.

### 8.11 Kanban "Backlog" Status Never Used in New DB

The new Kanban has a "Backlog" status option but zero items use it. All items are in To Do / In Progress / Testing / Done. The old DB had "Backlog" items. The Defense Notes clarify: _"The backlog is the overall lists of tasks. These should not move... the to-do would mirror these tasks."_ This implies Kanban tasks should start in To Do (mirroring the Backlog DB), not in a Backlog column — which the new DB correctly implements.

### 8.12 Task IDs Not Populated

The `Task id` field in the new Kanban is empty on all tasks. No formal ID scheme is being used for traceability.

### 8.13 Abbegail Assignee Rarely Used in New DB

In the new Kanban, only 1 task is assigned to Abbegail ("Use Case: Identify All System Actors"). In the old DB she had more tasks (documentation drafts). This may reflect accurate work split but worth noting for documentation reconciliation.

---

## 9. SUMMARY STATISTICS

### New Kanban DB (CLOIE Tasks, active)

| Status      | Count   |
| ----------- | ------- |
| Done        | 25      |
| Testing     | ~31     |
| In Progress | ~23     |
| To Do       | ~14     |
| Backlog     | 0       |
| **Total**   | **~94** |

### Backlog DB (CLOIE Backlog)

| Status      | Count  |
| ----------- | ------ |
| In Progress | 7      |
| To do       | 2      |
| Done        | 0      |
| Testing     | 0      |
| **Total**   | **10** |

### Old Kanban DB (deprecated)

| Status      | Count   |
| ----------- | ------- |
| Done        | ~20     |
| In Progress | ~6      |
| Backlog     | ~4      |
| null        | ~10     |
| **Total**   | **~49** |

---

_Report generated: 2026-07-18 via Notion API v2025-09-03 (read-only)_
