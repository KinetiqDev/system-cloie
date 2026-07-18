# CLOIE-PRD.md

# Product Requirements Document (PRD)
## PROJECT CLOIE: The Development of a System for Comprehensive Learning Outcomes and Instructional Evaluation

---

## 1. Document Overview

### 1.1 Document Purpose
This Product Requirements Document defines the product vision, scope, users, modules, workflows, requirements, constraints, and acceptance expectations for **PROJECT CLOIE**. It serves as the primary reference for design, development, testing, consultation, and milestone planning for the BSIT capstone project.

### 1.2 Product Summary
CLOIE is a **college-level digital evaluation, monitoring, and reporting platform** for Assumption College of Davao. It supports multiple academic programs, their courses, faculty members, academic leaders, and stakeholder-based outcome evaluation processes. The platform is intended to help the college manage **Graduate Outcomes (GOs)** as the program-level outcomes, manage **Course Intended Learning Outcomes (CILOs)** as the course-level outcomes, gather structured stakeholder feedback, compute attainment results, and generate organized reports that support quality assurance, accreditation, and continuous quality improvement.

CLOIE shall provide **role-specific portals and dashboards** for system administrators, program heads, faculty members, students, alumni, industry partners, and the college dean. These portals must enforce role-based permissions, academic-context-based visibility, and program-scoped analytics access where applicable.

The **Student role shall include both regular students and graduating students**, who will use the same portal and dashboard. Graduating-student-specific evaluation tools shall be exposed based on academic eligibility, year level, or graduating status rather than through a separate role or portal.

CLOIE shall be developed as a **responsive Progressive Web Application (PWA)** that provides a **native-like, installable, and cross-device user experience** across **desktop, tablet, and mobile**, including supported use on **Android, iOS, and desktop platforms**. The product must remain centered on evaluation, monitoring, and reporting workflows rather than instructional delivery, grading, or student information management.

The four default evaluation tools serve as the institutional baseline; however, the system shall not be limited to these tools. Authorized program heads shall be able to create, manage, edit, version, and maintain additional program-scoped evaluation tools through governed template workflows.

For the **Post-Term CILO Evaluation Tool**, faculty members shall create **derived editable course-bound form instances** from authorized templates by selecting the valid academic context, including **Program**, **Major if applicable**, **Semester**, **Term**, and **Course** from the scoped course catalog, then encoding course-specific CILOs, editing allowed configurable portions of the derived instance, previewing the form, and publishing it.

Where faculty-accessible program-scoped templates are supported, faculty edits shall apply only to the **derived instance** or faculty-configurable copy and shall not overwrite the source template.

### 1.3 Intended Audience
This document is intended for:
- Capstone proponents
- Capstone adviser and panelists
- Client representatives
- Program heads and academic administrators
- Future maintainers or implementers of the system

---

## 2. Product Overview and Vision

### 2.1 Product Vision
To provide Assumption College of Davao with a structured, centralized, and scalable system for monitoring learning outcomes and program effectiveness across its academic programs through stakeholder-based evaluation, organized data management, and evidence-based reporting.

The product vision also includes delivering this system through a **responsive PWA experience** that feels modern, accessible, and app-like across different device classes. CLOIE should allow stakeholders to access and use the system comfortably whether they are completing evaluation forms on a phone, reviewing reports on a tablet, or managing academic structures and dashboards on a desktop.

### 2.2 Product Purpose
CLOIE exists to:
- manage **Graduate Outcomes (GOs)** as the program-level outcomes of each academic program
- support faculty encoding and management of **Course Intended Learning Outcomes (CILOs)**
- support **CILO-to-GO mapping**
- digitize and organize stakeholder evaluation processes
- support **role-specific dashboards and portals** for operational use and review
- securely collect and store evaluation responses
- compute and present outcome attainment results
- generate reports for academic review, accreditation support, and CQI
- support **program-scoped evaluation-tool template management** for authorized program heads
- support the controlled addition of new evaluation tools and modification of existing ones through governed template/version workflows
- support student-role-based evaluation where graduating-student tools are delivered through eligibility and targeting, not a separate role
- support program heads in creating, managing, editing, and extending evaluation tools beyond the initial baseline instruments
- support a constrained question model consisting of Likert-scale and open-ended questions only
- compute quantitative results using mean-based aggregation
- generate qualitative insights using word cloud visualization from open-ended responses
- support faculty creation of **editable derived course-bound instances** from authorized templates
- require faculty selection of **Program**, **Major if applicable**, **Semester**, **Term**, and **Course** from the valid scoped course catalog when creating a Post-Term CILO evaluation instance
- support guided open-ended suggested responses that populate the textbox while preserving editable final text


### 2.3 Product Positioning
CLOIE is a focused **academic evaluation platform**, not a general academic management suite. It is designed specifically for outcome evaluation and reporting within Assumption College of Davao and is intentionally narrower than enterprise institutional systems.

From a platform perspective, CLOIE is positioned as a **web-first Progressive Web Application** rather than a fully native mobile application. This means the system will be delivered through a centralized web architecture while still providing an installable, app-like experience on supported Android, iOS, and desktop environments. This positioning fits the nature of CLOIE as a multi-user, data-driven, form-heavy, dashboard-oriented academic platform that does not depend on mobile-only hardware features.

### 2.4 Product Principles
- **Evaluation-first**: the platform centers on monitoring and reporting, not teaching or enrollment.
- **Role-based access**: each stakeholder sees only the functions and forms relevant to them.
- **Confidentiality by design**: responses must be handled securely and reported appropriately.
- **Structured evidence**: the system should make academic evidence easier to collect, interpret, and retain.
- **College-level scalability**: the product must support multiple programs without redesign.
- **Capstone realism**: scope must remain implementable by a 2-person team.
- **Native-feel experience**: the system should feel polished and app-like across supported devices rather than like a basic resized website.
- **Responsive by device class**: layouts must be optimized separately for mobile, tablet, and desktop contexts.
- **Installable access**: the system should support add-to-home-screen or install behavior on supported platforms.
- **Centralized delivery, cross-platform use**: the system should retain the efficiency of a single web codebase while remaining highly usable across different device types.
- **Operational simplicity**: the system should avoid unnecessary administrative complexity when a lighter workflow can satisfy the same evaluation objective.

### 2.5 Platform and Experience Direction
CLOIE shall be implemented as a **responsive Progressive Web Application (PWA)**.

The platform and experience direction of CLOIE shall follow these rules:
- The system shall be accessible through modern web browsers on **desktop, tablet, and mobile devices**.
- The system shall support **installability** on supported **Android, iOS, and desktop** environments through PWA-compatible browser behavior.
- The user experience shall aim for a **native-like feel**, especially for frequently repeated stakeholder tasks such as form completion, dashboard viewing, and navigation between system modules.
- Responsive behavior shall not rely only on resizing content. Instead, the system shall provide **device-aware layout behavior**, where mobile, tablet, and desktop interfaces are arranged according to the needs of each device class.
- Mobile and tablet interfaces shall prioritize **touch-friendly controls, spacing, navigation, and form usability**.
- Desktop interfaces shall preserve a **polished, dashboard-oriented administrative experience**, not a stretched mobile layout.
- The application shall include PWA presentation elements such as **application icons, manifest configuration, and app-style launch framing**.
- The system should provide app-like launch and usage behavior where supported, including **home-screen access** and **standalone-style presentation**.

---

## 3. Problem Statement

Assumption College of Davao needs a centralized and structured way to monitor learning outcomes and program effectiveness across its academic programs. At present, the college does not have an established centralized system for conducting and consolidating evaluation processes related to outcomes monitoring. This creates difficulty in organizing stakeholder feedback, tracing outcome attainment, generating consistent reports, and preparing evidence for academic review and accreditation.

The absence of a dedicated platform makes evaluation fragmented, less traceable, and harder to scale across multiple programs, courses, and stakeholders. CLOIE addresses this gap by introducing a college-level system that formalizes evaluation workflows, centralizes relevant data, and supports reporting for academic leadership.

---

## 4. Product Goals and Objectives

### 4.1 Product Goals
1. Provide centralized management of **Graduate Outcomes (GOs)** and **CILOs**.
2. Digitize the required evaluation instruments for multiple stakeholder groups.
3. Support controlled evaluation availability, scheduling, respondent visibility, and role-appropriate tool exposure.
4. Collect confidential and structured stakeholder feedback.
5. Compute and present outcome attainment results, word-cloud-supported qualitative summaries, and other scoped analytics outputs.
6. Generate reports usable for program review, quality assurance, accreditation support, and CQI.
7. Deliver role-specific portals and dashboards with permissions scoped by role and academic context.
8. Deliver a **responsive and native-like PWA experience** across desktop, tablet, and mobile devices.
9. Support **installable access** for stakeholders using Android, iOS, and desktop platforms where supported.
10. Support extensible evaluation-tool management so approved tools can be added or modified without redesigning the whole system.
11. Unify student and graduating-student experience under a single student portal with context-based tool exposure.
12. Support extensible evaluation-tool creation beyond the default four instruments.
13. Ensure quantitative analytics are computed using mean aggregation for Likert-scale responses.
14. Ensure qualitative analytics are represented through word cloud outputs.
15. Support **CILO-to-GO mapping** for reporting, analytics, and review.
16. Support faculty creation of **derived editable course-bound Post-Term CILO form instances** from authorized templates without overwriting shared source templates.
17. Require valid scoped academic-context selection for course-bound CILO workflows, including **Program**, **Major if applicable**, **Semester**, **Term**, and **Course**.

### 4.2 Product Objectives
- Enable authorized users to encode, organize, update, and map academic outcomes.
- Deliver stakeholder-specific evaluation forms according to program, course, availability window, stakeholder type, and intended respondent context.
- Support one-response-per-assigned-form rules where applicable.
- Preserve instrument versions and historical records for longitudinal review.
- Provide actionable reports for program heads, deans, and faculty while preserving scoped visibility.
- Support scalable use across all academic programs of the college.
- Support governed program-level template authoring for non-course-bound evaluation tools.
- Support controlled administration of programs, majors, courses, year-level classifications, context where applicable, and user academic affiliations.
- Provide **responsive layouts tailored to device class**, not just resized layouts.
- Provide **touch-friendly interaction patterns** for mobile and tablet users.
- Provide **installability and app-like launch behavior** consistent with a PWA.
- Maintain consistent usability across **desktop, tablet, and mobile** user journeys.
- Deliver graduating-student-specific evaluation tools through the student role using academic-status-based targeting.
- Support governed creation of additional program-level evaluation tools by authorized program heads.
- Restrict supported question types to Likert-scale and open-ended questions.
- Compute quantitative evaluation results using the mean.
- Generate qualitative outputs using word cloud representations.
- Support **CILO-to-GO mapping** as the product’s program-to-course outcome alignment model.
- Support faculty creation of **editable derived course-bound instances** from authorized templates.
- Require faculty selection of **Program**, **Major if applicable**, **Semester**, **Term**, and **Course** from the valid scoped course catalog for Post-Term CILO evaluation setup.

## 5. Academic Scope Coverage

### 5.1 Initial College Coverage
CLOIE is intended to support the academic programs of Assumption College of Davao, including:

1. Bachelor of Elementary Education  
2. Bachelor of Secondary Education major in English  
3. Bachelor of Secondary Education major in Mathematics  
4. Bachelor of Secondary Education major in Science  
5. Bachelor of Secondary Education major in Values Education  
6. Bachelor of Science in Social Work  
7. Bachelor of Science in Business Administration major in Financial Management  
8. Bachelor of Science in Business Administration major in Human Resource Development Management  
9. Bachelor of Science in Business Administration major in Marketing Management  
10. Bachelor of Science in Information Technology  
11. Bachelor of Science in Hospitality Management  

### 5.2 Academic Entities in Scope
- College programs
- Program acronyms and detailed program metadata
- Majors where applicable
- Program-specific courses
- General education courses
- Course-to-program and course-to-major associations
- Course applicability to the entire program or to selected majors within a program
- Faculty members and faculty accounts
- Faculty-to-program affiliations, including multi-program affiliation support
- Program head-to-program assignment
- Student academic context records
- Year-level classification where applicable
- Section/class-group context where applicable
- Student academic status or graduating eligibility context
- Industry partner company and program association records
- **Graduate Outcomes (GOs)**
- **CILOs**
- **CILO-to-GO mappings**
- Evaluation templates, sections, questions, and versions
- Evaluation form instances, assignments, and deployment records
- Response records and analytics/report outputs

---

## 6. Stakeholders and User Roles

### 6.1 Stakeholders
- Assumption College of Davao
- College dean
- Program heads
- Faculty members
- Students
- Graduating students
- Alumni
- Industry partners / employers
- System administrators
- Capstone proponents and adviser

### 6.2 Primary User Roles

| Role | Primary Purpose in CLOIE |
|---|---|
| System Administrator | Manage users, roles, programs, majors, program catalog details, course catalog, institutional instruments, system records, and governed platform configuration |
| College Dean | Use the same portal capabilities and operational access pattern as a Program Head, but with college-wide visibility across all academic programs; review aggregated analytics and reports across the college and filter into specific programs for deeper analysis |
| Program Head | Operate within an assigned program scope; manage or review program outcomes, author/manage program-level evaluation tool templates, deploy stakeholder tools, and review program-scoped analytics and reports |
| Faculty Member | Encode CILOs, map course outcomes to Graduate Outcomes where applicable, create and publish **derived course-bound Post-Term CILO evaluation form instances**, select valid academic/course context from the scoped course catalog, edit allowed configurable portions of the derived instance, and review summarized results for valid academic contexts |
| Student | Answer assigned course/program evaluation forms relevant to their academic context, including graduating-student-specific instruments when eligible based on academic status |
| Alumni | Provide feedback on program relevance, outcomes, and graduate readiness within their associated program context |
| Industry Partner | Evaluate graduate or intern readiness within assigned program context and provide employer-side feedback linked to company information |

### 6.3 Role-Based Access Principle
Access must be restricted based on:
- user role
- program affiliation or program assignment
- major where applicable
- course or academic context
- year level/section or class group where applicable
- stakeholder type
- form availability window and assignment rules
- report visibility and analytics segregation rules

The role-based access model shall also enforce scoped academic visibility:
- **Program Heads** shall access only the functions, analytics, reports, and evaluation-management records within their assigned program scope.
- **College Deans** shall have the same portal capabilities and operational access pattern as Program Heads, but their analytics and report visibility shall span all college programs under the college.
- **College Deans** shall be able to filter, compare, and drill down into specific programs without being limited to a single assigned program scope.
- Graduating-student-specific evaluation tools shall be delivered through the **Student** role based on academic status, year level, or graduating eligibility rather than through a separate role.

### 6.4 Role-Specific Portal Principle
Each major role shall have a **role-specific portal/dashboard** with a header, role-appropriate navigation, and device-aware layout behavior. The experience shall remain responsive and app-like across desktop, tablet, and mobile contexts, while preserving role-specific function boundaries.

The student portal/dashboard shall be shared by both regular students and graduating students. Differences in accessible evaluation tools shall be determined by assignment and eligibility rules rather than separate portal structures.

### 6.5 Role Scope Clarifications
- **System Administrator** may register/invite faculty members, program heads, deans, and industry partners using controlled account-creation workflows; may change user roles; and may update student year level and program affiliation.
- **Program Head** shall be tied to a program scope and may only view analytics and reports belonging to that program, while the college dean may view cross-program aggregates.
- **Faculty Member** may be affiliated with one or more programs.
- **Industry Partner** records shall include company information and associated program context.
- **College Dean** may filter college-wide analytics down to specific programs, but does not automatically inherit system-administration rights.
- Graduating students are not a separate system role; they are students who qualify for graduating-student-targeted instruments based on academic context.

## 7. Scope and Non-Scope

### 7.1 In Scope
CLOIE includes:
- GO management
- CILO encoding and management
- outcome mapping between CILOs and Graduate Outcomes
- role-specific portals and dashboards for administrator, program head, faculty member, dean, student, alumni, and industry partner
- student-role-based handling of graduating-student evaluation tools through eligibility rules
- evaluation instrument delivery and management
- governed program-level evaluation-tool template management for non-course-bound stakeholder tools
- support for creation of additional program-scoped evaluation tools beyond the default instruments
- faculty creation of **derived editable course-bound instances** for the Post-Term CILO Evaluation Tool
- course-bound evaluation form configuration for the Post-Term CILO Evaluation Tool
- scheduling and visibility control for evaluation forms
- respondent targeting and stakeholder-appropriate form exposure
- response collection and storage
- qualitative and quantitative response handling
- a constrained question model consisting of Likert-scale and open-ended questions only
- mean-based computation for quantitative responses
- word-cloud-based analytics for qualitative responses
- post-data processing and analytics, especially for the Post-Term CILO Evaluation Tool
- analytics, attainment computation, and reporting with program-scoped segregation
- qualitative word cloud analytics for open-ended responses
- historical record retention
- CQI-supporting evidence outputs
- administrator controls for college-wide use

### 7.2 Out of Scope
CLOIE will **not**:
- calculate or manage student grades
- serve as a Learning Management System (LMS)
- manage enrollment, transcripts, or broader SIS records
- track individual student academic performance as a grading tool
- replace institutional accreditation systems
- make curriculum decisions automatically
- implement full advanced AI decision-making as a core function
- operate as a full academic load scheduling system

### 7.3 Product Boundary Statement
CLOIE is limited to **evaluation, monitoring, reporting, and evidence support**. Academic leadership remains responsible for interpreting findings and deciding on improvement actions. The system may support CQI discussions and documentation, but it does not automate policy or curriculum decisions.

## 8. Core User Workflows

### 8.1 Administrator Workflow
1. Open CLOIE through browser or installed app entry point.
2. Log in securely.
3. Manage users, roles, programs, majors, course catalog, rosters, and mappings.
4. Manage default institutional instruments and approved variants.
5. Configure deployment settings for stakeholder tools that are not faculty-owned course-bound forms.
6. Preserve records for reporting and traceability.
7. Desktop shall be the primary administration context, while tablet support should remain usable for light administration and review tasks.

### 8.2 Program Head Workflow
1. Open CLOIE through browser or installed app entry point.
2. Log in securely.
3. Enter the Program Head portal/dashboard with role-appropriate navigation and controls.
4. Review program outcomes, mappings, stakeholder evaluation tools, and deployment context within the assigned program scope.
5. Create, manage, edit, version, save, or deploy authorized program-level stakeholder evaluation tools where applicable.
6. Access program-scoped analytics and reports.
7. Compare attainment and feedback across stakeholder groups within the assigned program.
8. Use results for program review and CQI discussions.
9. Desktop and tablet views shall emphasize dashboard readability, report navigation, tool management, and structured comparison of results.

### 8.3 Faculty Workflow
1. Open CLOIE through browser or installed app entry point.
2. Log in securely.
3. Enter the faculty portal with dashboard and management navigation.
4. Open **Create Post-Term CILO Evaluation Tool** or enter a course workspace.
5. Select **Program**.
6. Select **Major** if applicable.
7. Select **Semester**.
8. Select **Term**.
9. Select **Course** from the valid scoped course catalog.
10. Create the **derived course-bound form instance** from the authorized template.
11. Encode or manage CILOs for the selected course.
12. Link course outcomes to Graduate Outcomes where applicable.
13. Review the governed CILO Evaluation Tool structure with dynamically generated CILO items.
14. Edit the allowed configurable portions of the derived form instance.
15. Set course information, activation date/time, and deadline date/time.
16. Select valid deployment targets such as year levels and programs where academically allowed by the selected course context.
17. Preview the student-facing form.
18. Confirm and publish the course-bound evaluation form.
19. Monitor status and summarized results for that course.

Desktop and tablet layouts shall prioritize dashboard clarity, table readability, and efficient multi-step management tasks.

### 8.4 Student Workflow
1. Open CLOIE through browser or installed app entry point.
2. Sign up or log in using the approved student access flow.
3. Enter the student portal and view only assigned evaluation forms, including graduating-student-specific tools when eligible.
4. Complete quantitative and qualitative items through a touch-friendly, mobile-optimized form experience.
5. Review answers in preview mode.
6. Confirm submission.
7. Finalized response is stored and locked.
8. View submission status or submitted answers in read-only mode where permitted.
9. The workflow should remain simple and app-like on mobile devices, especially during active evaluation periods.

### 8.5 Alumni Workflow
1. Open CLOIE through browser link or installed app entry point.
2. Access the alumni evaluation tool assigned to the appropriate program context.
3. Provide feedback on program relevance and readiness.
4. Add qualitative comments.
5. Review answers in preview mode.
6. Confirm submission.
7. Submit final response.
8. The interface should remain usable on mobile-first access contexts, since alumni may frequently access the system outside campus settings.

### 8.6 Industry Partner Workflow
1. Open CLOIE through browser link or installed app entry point.
2. Access the industry partner portal and the assigned internship or graduate-readiness evaluation.
3. Review or confirm organization and company context where needed.
4. Evaluate knowledge, skills, professionalism, and readiness.
5. Provide recommendations and comments.
6. Review answers in preview mode.
7. Confirm submission.
8. Submit final response.
9. The experience should remain professional, efficient, and readable across phone, tablet, and desktop devices.

### 8.7 College Dean Workflow
1. Open CLOIE through browser or installed app entry point.
2. Log in securely.
3. Enter the College Dean portal/dashboard, which uses the same general portal capabilities and operational access pattern as the Program Head portal.
4. Access aggregated analytics, reports, outcomes views, and stakeholder evaluation insights across all college programs.
5. Filter or drill down into specific programs for deeper analysis and review.
6. Compare attainment and feedback across programs and across stakeholder groups.
7. Use results for college-level academic review, quality assurance discussions, and CQI planning.
8. Desktop and tablet views shall emphasize dashboard readability, cross-program report navigation, and structured analysis of college-wide and per-program results.

## 9. Evaluation Instruments

### 9.1 Default Institutional Instruments
The system must support the following client-requested instruments as the default institutional baseline:

1. **CILO Evaluation Tool**
   - for post-term course outcome attainment and facilities/resources evaluation by students

2. **Graduating Student Exit Survey Tool**
   - for academic experience, learning outcomes, facilities, blended learning, values formation, and overall satisfaction

3. **Alumni Evaluation Tool**
   - for program learning experience, graduate outcomes attainment, employment readiness, and qualitative feedback

4. **Industry Internship Evaluation Tool**
   - for knowledge competence, skills competence, professional traits, graduate readiness, qualitative feedback, and employment recommendation

These instruments serve as the default institutional baseline and do not limit the total number of evaluation tools supported by the system.

### 9.2 Instrument Design Requirements
- Instruments must support quantitative and qualitative sections.
- Instruments may have different visible descriptors per stakeholder group.
- The system should preserve the structure and intent of the client-requested instruments.
- Instruments must support **section-based organization**.
- Supported question types are limited to:
  - **Likert-scale questions** with configurable point count and point descriptors
  - **Open-ended questions** with predefined or prompt-assisted guidance
- Quantitative responses shall be analyzed using mean-based aggregation.
- Qualitative responses shall support word cloud generation.
- Program-level tools must support title, description, purpose or instructions, sections, questions, and reusable template saving.
- Active instrument versions must remain traceable to the form deployment that used them.

### 9.3 Instrument Ownership and Configuration Model
- The **default institutional instruments** are system-provided and maintained under controlled governance.
- The **Post-Term CILO Evaluation Tool** shall use a governed institutional template.
- Faculty members shall **not** freely redesign the shared source CILO template itself.
- Faculty members shall create **derived editable course-bound instances** of the CILO Evaluation Tool from authorized templates by providing:
  - Program
  - Major (if applicable)
  - Semester
  - Term
  - Course
  - Course Code
  - Course Title
  - Academic Term
  - CILO entries
  - activation date/time
  - deadline date/time
  - valid deployment targets such as year level and program where academically allowed
- Faculty members shall be able to edit the **allowed configurable portions** of the derived course-bound instance before publication.
- Faculty edits shall apply only to the **derived instance** and shall not overwrite the shared source template.
- Program heads may create, manage, edit, version, save, and deploy **program-level evaluation tool templates** for non-course-bound stakeholder tools within their authorized program scope, including the creation of entirely new evaluation tools.
- Program heads and administrators shall manage the deployment and assignment of non-course-bound stakeholder tools such as the Graduating Student Exit Survey Tool, Alumni Evaluation Tool, and Industry Internship Evaluation Tool.

### 9.4 Form Management Rules
- Default institutional forms are the baseline.
- Program-specific customized variants or templates may be created when approved.
- One program’s customization must not affect another program’s form.
- Instruments with existing responses must not be overwritten directly.
- New versions must be created for future use when structural changes are needed.
- Course-bound CILO Evaluation Tool instances shall preserve the governed institutional structure while allowing faculty-supplied course-specific data and other allowed configurable content.
- Faculty edits to one derived course-bound instance shall not affect another faculty member’s instance, the shared source template, or prior historical deployments.
- Program-level templates shall preserve section, question, and scale-definition history across versions.
- The system shall support the controlled addition of more evaluation tools and modification of existing ones through governed template or version workflows.
- Program-level templates may be edited and saved for reuse within the owning program scope.
- Quantitative analytics shall use mean computation.
- Qualitative analytics shall support word cloud outputs.
## 10. Functional Requirements by Module

## 10.1 Authentication and Access Control Module
### Purpose
Control secure access to the platform and enforce permissions by role and academic context.

### Requirements
- Support secure authentication for all authorized user types.
- Support role-based access control.
- Restrict functions, forms, dashboards, analytics, and reports based on role and assignment.
- Maintain active user sessions securely.
- Support Google-based authentication for approved institutional domains and invited stakeholder accounts where applicable.
- Support student self-sign-up and onboarding if this operational model is retained.
- Support user creation, modification, activation, deactivation, and role assignment.
- Determine role, permissions, scoped visibility, and redirect behavior from internal account records rather than email domain alone.
- Redirect authenticated users to role-specific portals after login.
- Allow **Program Heads** and **College Deans** to use the same general portal pattern and feature set where applicable, while enforcing different academic visibility scopes.
- Enforce that **Program Heads** are limited to their assigned program scope.
- Enforce that **College Deans** can access the same analytics and reporting functions across all college programs, with filtering into specific programs.
- Enforce that graduating-student-specific forms are exposed through the **Student** role based on academic status rather than a separate role.

---

## 10.2 Academic Structure and User Assignment Module
### Purpose
Represent the college’s academic structure so forms, outcomes, and reports can be properly organized, filtered, and grouped.

### Requirements
- Manage academic programs.
- Store program acronym and detailed program metadata.
- Manage majors where applicable.
- Manage program-specific courses.
- Manage general education courses.
- Classify course type as program-specific or general education.
- Support course-to-program and course-to-major associations.
- Support cases where the same course exists across different majors or valid academic contexts.
- Support year-level classification and section/class-group context where applicable for targeting, grouping, or reporting.
- Associate users with their relevant academic context when needed.
- Support student roster/class association management where operationally required.
- Support student academic status or graduating eligibility records where needed for tool targeting.
- Support faculty-to-program affiliation, including multi-program affiliation support.
- Support program-head-to-program assignment.
- Support industry-partner-to-program assignment.
- Store industry partner company information.
- Support a controlled course catalog that faculty can use as an eligible course pool when creating course-bound CILO evaluation forms.
- Support course applicability to the entire program or to selected majors within a program.

---

## 10.3 Outcomes Management Module
### Purpose
Manage the core academic outcomes that CLOIE monitors.

### Requirements
- Allow authorized program-level users to encode and manage **Graduate Outcomes (GOs)**.
- Allow faculty to encode and manage CILOs for selected course contexts.
- Preserve program-level and course-level outcome records.
- Support organized storage of outcomes by program and course.

### Submodule: Outcome Mapping and Alignment
- Map CILOs to related Graduate Outcomes.
- Preserve mapping relationships for reporting and longitudinal analysis.
- Allow authorized review and maintenance of mappings.
- Preserve cases where GO-level and mapped CILO-level results may diverge and require review rather than automatic reconciliation.

---

## 10.4 Evaluation Instrument Management Module
### Purpose
Digitize, configure, version, and govern evaluation instruments.

### Requirements
- Deliver the four default institutional instruments.
- Support assignment by stakeholder group and academic context where applicable.
- Support approved program-specific variants.
- Preserve default forms separately from custom variants.
- Support instrument versioning, archiving, and replacement.
- Support optional qualitative prompts and suggested-response guidance for selected open-ended questions.
- Allow faculty to generate **derived editable course-bound CILO Evaluation Tool instances** from the governed institutional template without altering the shared source structure.
- Provide a **program-level evaluation tool builder** for authorized program heads.
- Allow program heads to create entirely new evaluation tools beyond the default instruments.
- Allow program heads to create and manage templates by defining title, description, instructions, sections, question items, Likert-scale configuration, and open-ended prompt-assisted items.
- Allow editing of program-level templates and saving them within program scope.
- Restrict question types to Likert-scale and open-ended formats.
- Support Likert-scale configuration and open-ended prompt assistance.
- Allow program heads to save templates for reuse within authorized program scope.
- Prevent destructive overwriting of templates already used in deployed or responded-to forms.
- Allow faculty to edit the allowed configurable portions of a derived course-bound instance before publication.
- Ensure faculty edits to derived instances do not overwrite the source template.

---

## 10.5 Evaluation Availability and Assignment Module
### Purpose
Control when forms are available, who can answer them, and under what visibility rules they are shown.

### Requirements
- Support activation date/time and deadline date/time for evaluation forms.
- Support status logic such as **Draft**, **Scheduled**, **Active**, **Closed**, and **Archived** where applicable.
- For the Post-Term CILO Evaluation Tool, allow faculty to configure availability for the selected course-bound form instance.
- For non-course-bound stakeholder tools, allow authorized administrators or program heads to configure assignment and availability.
- Restrict visibility to intended respondents only.
- Enforce one response per respondent per assigned form where applicable.
- Preserve the relationship among form instance, version context, schedule, and target respondents.
- Support stakeholder-specific exposure so only the appropriate stakeholder sees the appropriate tool.
- Support targeting by program, major where applicable, year level, section/class group, course, and stakeholder type where relevant.
- Support graduating-student-specific targeting through the **Student** role using academic-status conditions.
- Support faculty multiselect deployment targets only where valid under the selected course context and academic rules.

---

## 10.6 Response Collection and Submission Module
### Purpose
Collect finalized responses from stakeholders with controlled submission flow.

### Requirements
- Accept both quantitative and qualitative responses.
- Restrict supported question rendering to Likert-scale and open-ended question types.
- Validate required fields before final review.
- Provide preview or review before submission.
- Require explicit confirmation before final submission.
- Store responses as finalized records after confirmation.
- Prevent unintended modification after final submission.
- Support prompt-assisted qualitative entry while preserving final edited text.
- Support submission receipts and read-only post-submission answer review where permitted by policy.

---

## 10.7 Qualitative Feedback Handling Module
### Purpose
Store and expose qualitative comments safely and usefully.

### Requirements
- Store raw qualitative comments securely.
- Preserve original submitted text.
- Allow authorized viewing only.
- Support aggregated or controlled presentation of comments.
- Support qualitative word cloud outputs from open-ended responses.
- Support generation of word cloud visualizations from aggregated qualitative responses.
- Prevent misuse of raw comment data.

---

## 10.8 Analytics and Attainment Computation Module
### Purpose
Transform collected responses into meaningful academic insights.

### Requirements
- Compute aggregated ratings and summarized attainment results.
- Produce outcome attainment summaries for **GOs and CILOs** where applicable.
- Support stakeholder-based comparisons.
- Support historical and longitudinal analysis.
- Highlight possible inconsistencies between program-level GO results and mapped course-level CILO results.
- Identify outcome gaps and recurring weaknesses for review.
- Quantitative Likert-scale responses shall be aggregated using mean computation.
- Qualitative open-ended responses shall support word cloud-based analysis.
- Support program-scoped analytics segregation so that Program Heads only access analytics for their assigned program.
- Support college-wide analytics visibility for the College Dean using the same general analytics capabilities available to Program Heads, but across all college programs.
- Allow the College Dean to filter, compare, and drill down into specific programs for deeper analysis.

---

## 10.9 Reporting and Evidence Generation Module
### Purpose
Generate usable outputs for academic leadership, quality assurance, and accreditation support.

### Requirements
- Generate outcome attainment reports.
- Generate stakeholder evaluation summaries.
- Generate program evaluation insights.
- Generate accreditation-supporting evidence outputs.
- Provide role-appropriate report access.
- Support export-ready reporting where feasible.
- Restrict Program Head reporting access to the assigned program scope only.
- Allow the College Dean to access the same general report structures and reporting functions as the Program Head, but across all college programs.
- Allow the College Dean to filter and drill down into specific programs for deeper review.
- Support report outputs that include mean-based quantitative summaries and qualitative word cloud views where applicable.

### Expected Report Types
- Graduate outcome summary report
- Course/CILO attainment report
- Stakeholder comparison report
- Historical or longitudinal trend report
- Qualitative feedback summary view
- Cross-program comparative report for college-level review

---

## 10.10 CQI and Action Support Module
### Purpose
Support the review side of CQI without overstepping into automated decision-making.

### Requirements
- Present findings that can support program review.
- Help identify outcome gaps and areas for follow-up.
- Preserve results over time for future comparison.
- Support documentation-oriented review, not automatic policy changes.

---

## 10.11 System Administration and Configuration Module
### Purpose
Allow controlled governance of the platform.

### Requirements
- Manage users and roles.
- Manage programs, majors, course catalog, rosters, and mappings.
- Manage program acronyms and program-detail records.
- Manage default institutional forms and approved custom variants.
- Configure assignment and availability rules for centrally managed stakeholder tools.
- Maintain traceable system records.
- Configure prompt libraries for supported qualitative items.
- Update student year level, program context, and academic status where needed.
- Maintain governed creation/update flows for system accounts such as faculty members, program heads, deans, and industry partners.

## 11. Data Requirements

### 11.1 Core Data Entities
- User
- Role
- Program
- Program Acronym / Program Metadata
- Major
- Course
- Course Type / Course Classification
- Course Program/Major Association
- Year-Level Classification
- Student Academic Profile
- Student Academic Status / Graduating Eligibility
- Faculty Program Affiliation
- Program Head Program Assignment
- Industry Partner Profile
- Company
- GO
- CILO
- Outcome Mapping
- Evaluation Instrument
- Instrument Version
- Evaluation Template Section
- Evaluation Template Question
- Question Type / Question Configuration
- Likert Scale Definition
- Prompt Library / Prompt Definition
- Guided Open-Ended Suggested Response structure
- Course-Bound Evaluation Form Instance
- Evaluation Availability Window / Assignment
- Response Record
- Quantitative Response Item
- Qualitative Response Item
- Report / Analytics Output Metadata

### 11.2 Data Handling Rules
- Collect only necessary and relevant user or classification data.
- Protect identifiable user information.
- Preserve historical response and instrument version records.
- Keep reporting traceable to the deployed form instance and its context.
- Maintain separation between raw responses and aggregated outputs.
- Preserve program-scoped ownership and visibility relationships for analytics and reports.
- Preserve template, section, question, and scale-definition version history when structural changes occur.
- Resolve graduating-student-specific form visibility through student academic context and academic status.
- Preserve quantitative mean-based summaries and qualitative word cloud outputs as traceable analytics results where applicable.

## 12. Non-Functional Requirements

## 12.1 Usability
- Interfaces must be clear and understandable for all stakeholder groups.
- Each role portal shall provide a role-appropriate header, navigation structure, and responsive layout.
- Forms must be easy to complete with minimal training.
- Navigation, labels, and layout must be consistent.
- Preview and confirmation flow must reduce accidental submission.
- The system must provide a **native-like and polished user experience** rather than only basic responsiveness.
- Mobile, tablet, and desktop interfaces must be **optimized by device class**.
- Mobile and tablet interfaces must use **touch-friendly controls, spacing, and navigation patterns**.
- Desktop interfaces must preserve a **clean dashboard-oriented layout** suitable for administration, report review, and outcome management.
- Repeated user actions such as logging in, opening forms, reviewing data, and moving between modules should feel streamlined and app-like.

## 12.2 Security and Access Control
- Authentication and authorization must be enforced.
- Sensitive data must be protected from unauthorized access.
- Role-based access must apply to forms, analytics, and reports.
- Program-scoped report segregation must be enforced for program heads and other scoped roles.
- Raw qualitative comments must be limited to authorized access.

## 12.3 Confidentiality and Privacy
- Confidential responses must be handled appropriately.
- Reports should use aggregated views where required.
- Respondent identity must not be unnecessarily exposed.
- Sensitive views must follow system privacy rules.

## 12.4 Reliability
- Finalized responses must remain stable.
- Instrument versions and deployed form instances must remain traceable.
- Outcome mappings must remain consistent for reporting.
- Historical records must not break when new versions or new form instances are introduced.

## 12.5 Performance
- Pages and forms should load within reasonable response times.
- Report generation should remain practical under expected usage.
- Evaluation availability windows should support normal concurrent access without major degradation.
- Installed or repeatedly accessed views should benefit from **PWA-oriented loading behavior** such as fast asset retrieval and efficient repeat access.
- Perceived performance should remain smooth across mobile, tablet, and desktop usage.

## 12.6 Scalability
- The system must support multiple programs, courses, stakeholder groups, and evaluation deployments.
- The database design must support college-wide expansion.
- Program-specific customizations must not require redesign of the core system.
- The evaluation-tool architecture must support the governed addition of new evaluation tools and modification of existing ones.

## 12.7 Availability
- The system should be accessible online during active evaluation periods and administrative use.
- End users should be able to access it from common modern devices and browsers.
- The system should remain usable when launched from a standard browser entry point or from an installed app entry point where supported.
- The application should present a stable launch experience consistent with a PWA on supported platforms.

## 12.8 Cross-Platform Accessibility
- The interface shall be responsive across **desktop, tablet, and mobile**.
- Responsive behavior must be based on **device-aware layout optimization**, not only screen resizing.
- The system shall support modern browser-based access on Android, iOS, tablet, and desktop environments.
- The application shall be designed to provide a **native-feel experience** across supported device classes.
- Mobile and tablet views shall prioritize:
  - touch-friendly controls
  - readable form layouts
  - simplified navigation
  - reduced visual clutter

## 12.9 Maintainability
- The system must be maintainable by a small development team.
- Future updates should be possible without complete redevelopment.
- Instrument versions, mappings, scheduling rules, reporting logic, and template-governance rules should remain manageable over time.

### 12.10 PWA and Installability Requirements
- CLOIE shall be developed as a **Progressive Web Application (PWA)**.
- CLOIE shall support **installability** on supported Android and desktop environments.
- CLOIE shall support **add-to-home-screen behavior** and app-like launch use on supported iOS environments.
- CLOIE shall provide the required PWA identity assets, including:
  - application name
  - short name
  - icons
  - manifest configuration
  - theme-appropriate application framing
- CLOIE shall support app-like launching in supported standalone or installed contexts.
- CLOIE should provide a consistent launch identity across supported devices through icons, naming, and app framing.
- CLOIE should support an **app shell style experience** for core pages and repeated navigation flows where feasible within capstone scope.

## 13. Technical Considerations (High-Level Only)

### 13.1 Recommended Product Form
CLOIE shall be developed as a **responsive Progressive Web Application (PWA)**.

A responsive PWA is the most suitable product form because CLOIE is:
- multi-user
- form-heavy
- dashboard and report oriented
- centralized
- data-driven
- not hardware-dependent

This approach allows the product to:
- operate from a single web-based codebase
- remain accessible across desktop, Android, and iOS environments
- support installability and app-like launch behavior
- provide a more native-feel user experience without requiring separate native mobile development

### 13.2 Logical Architecture Direction
- **Frontend layer** for responsive, device-aware user interfaces, PWA presentation behavior, and form delivery
- **Application/backend layer** for authentication, business rules, availability logic, reporting logic, and role-based controls
- **Relational database layer** for structured academic, response, and analytics data
- **Reporting/analytics layer** for summaries, charts, exportable outputs, and evidence generation
- **PWA support layer** for manifest configuration, installability behavior, icons, launch framing, and app-style loading behavior

### 13.3 Technical Priorities
- role-based access control
- role-specific portal routing and scoped navigation
- strong relational data model
- academic-context and program-segregation rules
- instrument version preservation
- program-level template builder governance
- clean evaluation submission flow
- scalable reporting structure
- constrained and consistent question model
- mean-based quantitative analytics and word-cloud-based qualitative analytics
- responsive layouts by device class
- installability and PWA identity assets
- app-like interaction quality across supported devices
- operational simplicity for course-bound form creation and publishing

### 13.4 Technical Constraints
- Must remain realistic for a 2-person capstone team
- Must avoid unnecessary enterprise-level complexity
- Must prioritize working core modules before advanced refinements
- Must implement only the **PWA features necessary to support installability and native-feel usability**, not full native-app parity
- Must avoid overbuilding offline behavior beyond realistic capstone needs

---

## 14. Assumptions, Constraints, and Dependencies

### 14.1 Assumptions
- ACD will define or validate the official **Graduate Outcomes (GOs)** and course-level outcomes needed for setup.
- Stakeholder categories remain stable for initial implementation, even if more tool variants may be added later.
- The four client-requested instruments serve as the baseline for evaluation.
- The system will be used primarily for structured evaluation deployments rather than continuous daily activity.
- Faculty can select valid academic/course contexts from a controlled course catalog rather than relying on full per-term manual course assignment.
- Semester and term are retained in the faculty course-bound form setup flow.
- Program heads will be permitted to manage program-level templates within governed scope.
- Faculty may create and edit **derived instances** from authorized templates without overwriting the source template.
- Word cloud analytics is part of the target working scope for the outline defense build.

### 14.2 Constraints
- 2-person capstone team
- limited development period
- milestone-driven academic schedule
- need for an early working prototype
- controlled scope boundaries

### 14.3 Dependencies
- client validation of requirements and output expectations
- availability of program/course/outcome reference data
- faculty and program-head consultation for mappings and reports
- final decisions on reporting thresholds and scoring interpretation
- final decision on whether student self-sign-up is retained in the implementation model
- validation of program/major/user affiliation rules for segregation and targeting

## 15. Risks

| Risk | Description | Mitigation Direction |
|---|---|---|
| Scope Creep | Adding too many administrative or enterprise features | Keep strict evaluation/monitoring/reporting boundary |
| Data Model Complexity | Multi-program, multi-course, multi-affiliation mappings may become too complex | Prioritize clean ERD and modular schema design early |
| Reporting Overload | Too many report variants may slow delivery | Start with essential reports first |
| Stakeholder Access Issues | Mis-targeted forms, wrong scoped visibility, or role confusion | Implement strong targeting, validation, and segregation rules |
| Confidentiality Risk | Exposure of raw responses or comments | Restrict access and favor aggregated views |
| Timeline Risk | Capstone milestones may force rushed implementation | Prioritize MVP-critical modules first |
| Over-Engineering Risk | Introducing unnecessary cycle, builder, or deployment complexity | Prefer governed but lightweight workflows where possible |
| Template Governance Risk | Program-level customization may create inconsistent tool structures if unmanaged | Use version control, scope rules, and template governance constraints |

## 16. Success Metrics

### 16.1 Product Success Metrics
- Graduate Outcomes (GOs) and CILOs can be encoded and managed correctly.
- CILOs can be mapped to GOs correctly.
- The four required evaluation instruments are digitized and usable.
- Additional program-level evaluation tools can be created and managed successfully.
- Evaluation forms can be scheduled or deployed correctly to the intended respondents.
- Intended respondents can complete assigned forms successfully.
- Reports can be generated from collected responses.
- Program-scoped segregation of analytics and reports works correctly.
- Quantitative results are correctly computed using mean aggregation.
- Qualitative word cloud analytics can be generated from supported open-ended responses.
- Graduating-student-specific tools are correctly exposed within the student portal.
- Faculty can create and edit derived course-bound Post-Term CILO instances correctly.
- Faculty can select valid **Program**, **Major if applicable**, **Semester**, **Term**, and **Course** from the scoped course catalog for course-bound CILO workflows.
- Shared templates remain protected from unintended overwrite.
- Historical records remain available for later review.
- CLOIE can be accessed effectively across **desktop, tablet, and mobile**.
- CLOIE can be presented and used as an **installable PWA** on supported platforms.

### 16.2 User Success Indicators
- Faculty can manage course outcomes, publish course-bound CILO evaluation forms, and view summaries.
- Program Heads can access full program-scoped analytics and reports for review within their assigned program.
- College Deans can access the same general analytics and reporting capabilities across all college programs and filter into specific programs for deeper review.
- Students and other respondents can complete assigned evaluations with minimal confusion.
- Administrators can configure core academic and evaluation structures without breaking system consistency.
- Users experience clear and usable navigation across different device classes.
- Mobile and tablet users can complete core workflows comfortably through touch-friendly interactions.

### 16.3 Operational Success Indicators
- The system supports multiple programs without redesign.
- Reporting remains aligned to college-level evaluation use.
- The platform remains within the intended scope and does not drift into LMS, SIS, or grading functions.
- The platform maintains a **consistent and polished cross-device experience**.
- The PWA implementation improves accessibility and repeated-use convenience without introducing unnecessary deployment overhead.

## 17. Acceptance Criteria

### 17.1 Minimum Acceptance Criteria
The product may be considered aligned with the intended CLOIE scope when:
1. role-based access is working
2. academic structure is represented
3. Graduate Outcomes and CILOs can be encoded and managed
4. CILOs can be mapped to GOs
5. required evaluation tools can be delivered digitally
6. course-bound and stakeholder-targeted evaluation forms can be scheduled or deployed correctly
7. faculty can create and edit derived course-bound Post-Term CILO instances from authorized templates
8. faculty can select valid **Program**, **Major if applicable**, **Semester**, **Term**, and **Course** from the scoped course catalog
9. responses can be submitted, stored, and preserved
10. student portal correctly exposes graduating-student-targeted tools based on eligibility
11. program heads can create and manage additional evaluation tools
12. program-scoped segregation of analytics and reports is enforced correctly
13. mean-based quantitative summaries are correctly generated
14. basic attainment and summary reports, including qualitative word cloud output, can be generated
15. confidentiality and non-scope boundaries are respected
16. the system functions correctly across desktop, tablet, and mobile
17. the system is configured and presented as a PWA

### 17.2 Report Acceptance Criteria
- Reports must show clear summarized outputs from collected evaluation data.
- Reports must be aligned to program outcomes and stakeholder feedback.
- Reports must be accessible only to appropriate roles.
- Program Head reports must be limited to the assigned program scope.
- College Dean reports must support college-wide access using the same general reporting capabilities available to Program Heads, with filtering into specific programs for drill-down review.

### 17.3 Usability Acceptance Criteria
- Respondents can complete forms without major confusion.
- Preview and confirmation steps are present before final submission.
- The interface is usable on desktop, tablet, and mobile web.
- Mobile and tablet interactions use touch-friendly spacing, controls, and navigation.
- Desktop views remain polished and dashboard-oriented.
- Core workflows feel app-like and consistent across supported device classes.

### 17.4 PWA and Installability Acceptance Criteria
- The application includes valid PWA identity elements such as application name, icons, and manifest configuration.
- The application can be installed on supported Android and desktop environments.
- iOS users can add the application to the home screen and launch it in a web-app-like context where supported.
- The system launches with branding and framing consistent with an installable app experience.
- Installed and browser-based experiences both preserve the usability of CLOIE’s core workflows.

## 18. MVP Scope and Release Prioritization

## 18.1 MVP Goal
Deliver the minimum working CLOIE version that demonstrates the platform’s core value as a **college-level evaluation, monitoring, and reporting system** and as a **responsive, installable PWA with a native-like cross-device experience**.

For the **outline defense**, the working build should demonstrate RBAC, stakeholder-appropriate tool exposure, Post-Term CILO evaluation, alumni evaluation, graduating-student exit survey exposure through the student role, industry partner evaluation access, word cloud analytics, mean-based quantitative analytics, and correct program-scoped segregation of analytics and reports.

## 18.2 MVP-Included Features

### Priority 1
- Authentication and role-based access
- Role-specific portal routing and scoped navigation
- Student sign-up/onboarding if retained in the implementation model
- Academic structure setup (programs, majors, course catalog, student academic context, student academic status, faculty affiliations, industry partner company/program context)
- GO/CILO encoding
- CILO-to-GO mapping
- Default evaluation instrument setup
- Faculty creation of **derived editable course-bound Post-Term CILO Evaluation Tool instances**
- Program-level deployment and targeting of alumni, graduating-student, and industry partner tools
- Controlled availability and visibility logic for evaluation forms
- Response collection with preview/confirmation
- Submission receipt and read-only submitted-answer view where permitted
- Basic response storage
- Post-Term CILO post-data processing and analytics
- Program-scoped segregation of analytics and report visibility
- Mean-based quantitative summaries
- Basic attainment summary and reporting
- Qualitative word cloud analytics
- Responsive layouts for mobile, tablet, and desktop
- PWA manifest, icons, and installable app configuration
- Core navigation and layout behavior optimized by device class

### Priority 2
- Program-specific template builder refinement for non-course-bound tools
- Historical record viewing
- Stakeholder comparison reporting
- Qualitative response handling with controlled access
- Enhanced app-like transitions and loading behavior
- Improved tablet-specific layout refinements
- Export-ready report refinements

### Priority 3
- richer qualitative analytics beyond word clouds
- enhanced comparative dashboards
- broader export options
- expanded CQI action support refinements
- deeper PWA refinements beyond core installability and app framing

## 18.3 MVP-Deferred Items
These may be deferred if needed to protect timeline:
- advanced qualitative analytics beyond word cloud output
- highly customized reporting builders
- heavy automation of CQI documentation
- deep integrations with external school systems
- institution-wide enterprise workflow complexity
- advanced offline capabilities beyond a practical app-shell style experience
- native-device feature parity beyond what is reasonable for a PWA

## 19. Release Framing

### Release 1: Outline Defense Working Prototype
Focus:
- RBAC and role-specific portal access
- academic structure and scoped user affiliations
- default evaluation tools
- faculty course-bound Post-Term CILO form creation
- stakeholder-targeted response submission
- graduating-student tool exposure through the student role
- Post-Term CILO analytics and reporting
- mean-based quantitative analytics
- program-scoped segregation of analytics and reports
- qualitative word cloud output

### Release 2: Structured Reporting and Builder Expansion
Focus:
- improved analytics
- stakeholder comparisons
- history-aware reporting
- program-level template builder refinement
- controlled qualitative views

### Release 3: Refinement and Finalization
Focus:
- usability refinement
- performance hardening
- documentation support
- broader export or report refinements
- optional qualitative visualization enhancements beyond the MVP baseline

## 20. Open Questions for Final Validation
The following should still be finalized or reconfirmed during detailed drafting and implementation:
1. final report templates and display preferences for the shared Program Head / College Dean reporting environment, noting that both roles use the same general reporting capabilities while differing in scope of visibility
2. whether all stakeholder types require account-based login or some external-access flow
3. exact scoring normalization rules across the supported instruments
4. specific attainment thresholds and interpretation rules
5. which report exports are essential for the capstone scope
6. whether semester and term should both be retained in the faculty course-bound form setup flow
7. whether students may update any onboarding/profile fields after initial setup
8. whether industry partners may be affiliated with more than one program context in the initial release

CLOIE manages **Graduate Outcomes (program-level)** and **CILOs (course-level)**, supports **CILO-to-GO mapping**, allows **Program Heads** to govern reusable program-scoped templates, and allows faculty to create and edit **derived course-bound instances** from authorized templates using valid scoped academic context.
