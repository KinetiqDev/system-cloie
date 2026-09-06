---
title: "PROJECT CLOIE: The Development of a System for Comprehensive Learning Outcomes and Instructional Evaluation"
kind: imported-manuscript-snapshot
status: imported-snapshot
source_file: System-CLOIE-Technical-Document.docx
conversion: google-docs-markdown-download-export
as_of: 2026-09-06
last_verified: 2026-09-06
---

# **PROJECT CLOIE: The Development of a System for Comprehensive Learning Outcomes and Instructional Evaluation**

A System Proposal Presented to the Faculty of   
Information Technology Education Program

Assumption College of Davao  
J.P., Cabaguio, Agdao, Davao City

In Partial Fulfillment of the   
Academic Requirements for the Subject:  
Capstone 2

Abebon, Abbegail D.  
Egut, Andy Zane B.  
Ms. Ordaneza, Christine Marie D., LPT

Submitted to:  
Ms. Roselyn M. Biala, MIT

**September 2026**

# **ABSTRACT**

\[Write this after the project, testing, and validation are substantially complete.

Target: approximately 200 to 300 words in one paragraph.

Include:  
\- the actual problem and institutional context;  
\- the main objective of Project CLOIE;  
\- the implemented System CLOIE solution;  
\- the engineering/development approach;  
\- testing and user-validation methods;  
\- the most important measurable results;  
\- whether the objectives and success criteria were achieved;  
\- the main contribution of the project.

Do not include citations, tables, figures, or a long feature list.\]

Keywords: outcome-based education; learning outcomes; academic evaluation;  
quality assurance; \[keyword\]

# **TABLE OF CONTENTS**

\[Generate automatically.\]

# **LIST OF FIGURES**

\[Generate automatically.\]

# **LIST OF TABLES**

\[Generate automatically.\]

# **LIST OF ABBREVIATIONS AND ACRONYMS**

ACD      Assumption College of Davao  
CILO     Course Intended Learning Outcome  
CQI      Continuous Quality Improvement  
CI       Continuous Integration  
ICTC     Information and Communications Technology Center  
ILO      Institutional Learning Outcome  
OBE      Outcome-Based Education  
PDCA     Plan-Do-Check-Act  
PLO      Program Learning Outcome  
RTM      Requirements Traceability Matrix  
UAT      User Acceptance Testing  
UX       User Experience  
\[Add only abbreviations actually used in the manuscript.\]

\==================================================

# **CHAPTER 1**

# **PROJECT CONTEXT AND DEFINITION**

\==================================================

Project CLOIE is the capstone project behind System CLOIE, the academic evaluation and learning-outcomes management system developed for Assumption College of Davao (ACD). This chapter explains the problem Project CLOIE is designed to solve, what the system is expected to achieve, who will use it, where its responsibilities begin and end, and how the team will determine whether the project succeeds.

## **1.1 Background and Problem Context**

Higher education institutions are expected to define what learners should know and be able to demonstrate, assess whether these outcomes are being achieved, and use the resulting evidence in reviewing academic programs. Outcome-Based Education places intended learning outcomes at the center of curriculum, learning activities, and assessment rather than treating course completion alone as evidence of learning. Recent literature continues to describe the alignment of course and program outcomes with assessment as an important part of implementing OBE in higher education (Noushad, 2024). In the Philippine context, this direction is also reflected in the Commission on Higher Education's outcomes-based and typology-based approach to quality assurance under CMO No. 46, Series of 2012 (Commission on Higher Education \[CHED\], 2012).

Assessing learning outcomes, however, involves more than defining them. Institutions need a systematic way to collect evidence, connect that evidence to the appropriate outcomes, interpret the results, and retain them for later review. Goss (2022) described student learning outcomes assessment in higher education as a complex process tied to concerns such as competence and continuous improvement. Bennett et al. (2023) similarly found that meaningful assessment requires time and resources and has a long-term orientation that also responds to external stakeholders. These concerns become more pronounced when evidence must be organized across courses, programs, academic periods, respondent groups, and evaluation activities.

The relationship between course-level and program-level outcomes is particularly relevant to this process. Course learning outcomes provide a more immediate statement of what students are expected to achieve within a course, while program learning outcomes represent broader competencies expected across the academic program. Systematic alignment between these levels makes it possible to interpret course evidence within the wider goals of the program. Derouich (2025), for example, describes Course Learning Outcome to Program Learning Outcome alignment and feedback loops as a means of supporting coherent and auditable outcome-based assessment. El Marsafawy et al. (2022) likewise found that course and program outcome measurement requires explicit assessment processes and mappings when institutions need consistent evidence for quality assurance and accreditation.

At Assumption College of Davao, the need that led to Project CLOIE emerged from consultations concerning learning-outcome monitoring and accreditation preparation. During the initial client consultation, the project client explained that ACD did not have an established centralized system for this purpose and described the intended system primarily as a feedback and tracking system. Students would evaluate whether course outcomes had been attained, while the resulting responses would be stored, analyzed, and reported at the course-outcome level and in relation to broader program outcomes. The client also emphasized that CLOIE should provide evidence for academic decision-making rather than decide what changes should be made to instruction or the curriculum.

The evaluation context extends beyond one respondent group. CLOIE's project requirements include students, alumni or graduates, and industry partners as respondents. Faculty members manage course-level learning outcomes and course-related evaluation activities, while academic personnel use the resulting information according to their assigned responsibilities. Current system evidence also provides role-scoped functions for academic and administrative users, including outcome management, evaluation tools, analytics, reports, course assignments, and deployment management. Respondents have workflows for accessing evaluations, answering questions, saving responses, submitting evaluations, and viewing submission information.

Four institutional evaluation instruments form an important part of this context. The **Post-Term CILO Evaluation Tool** gathers student responses concerning the Course Intended Learning Outcomes of a course after the relevant instructional period. The **Graduating Student Exit Survey** gathers feedback from students approaching completion of their program. The **Alumni Evaluation Tool** collects post-graduation perspectives, while the **Industry Partner Internship Evaluation Tool** obtains workplace-based feedback from industry partners. These are ACD evaluation instruments represented within the CLOIE project. They are not external research instruments adopted for the capstone study.

Using several stakeholder perspectives is useful because educational quality is not observed from only one position. Employer participation, for example, can provide information about graduate competencies and the relationship between higher education and workplace expectations, although such feedback still requires interpretation within the institution's own quality-assurance process (Hou et al., 2022). CLOIE therefore treats stakeholder responses as evidence for academic review rather than as automatic judgments about program quality.

This creates an information-management problem as much as an evaluation problem. A response has meaning only when its context is retained: which instrument generated it, which academic period it belongs to, which course or program it concerns, which outcomes it evaluates, and which stakeholder group supplied it. Quantitative ratings must also remain distinguishable from qualitative comments. When these records accumulate across evaluation cycles, organizing them consistently becomes necessary if they are to support useful analysis and reporting.

Digital analytics can help transform collected educational data into interpretable summaries, but the usefulness of analytics depends on the purpose and structure of the underlying data. Hernández-de-Menéndez et al. (2022) describe learning analytics as the measurement, analysis, and reporting of educational data to better understand learning and its context. Research also cautions against assuming that collecting more data automatically improves education. Analytics must remain tied to educational questions and human interpretation (Khalil et al., 2023).

System CLOIE, or the **System for Comprehensive Learning Outcomes and Instructional Evaluation**, was developed in response to this institutional need. Its central purpose is to organize learning outcomes and stakeholder evaluation responses, analyze quantitative and qualitative evidence, and present the resulting information through analytics and reports. It provides the technological link between response collection and evidence that authorized academic stakeholders can review.

Within continuous quality improvement, CLOIE primarily supports the evidence or "check" portion of the process. Academic personnel remain responsible for interpreting findings and deciding what action, if any, should follow. This separation is important. Samuel and Farrer (2025) describe PDCA-based academic quality improvement as a cycle involving systematic data collection, analysis, identification of opportunities, implementation of actions, and subsequent review. CLOIE supplies structured evidence that can contribute to this process, but it does not replace institutional academic judgment.

## **1.2 Problem Statement**

Assumption College of Davao needs a more organized mechanism for managing and reviewing learning-outcome evaluation evidence across its academic context. The issue is not simply the absence of digital forms. Evaluation evidence can be associated with different courses, programs, academic periods, learning outcomes, evaluation instruments, and respondent groups. Without a system designed around these relationships, consolidating responses into consistent evidence for academic review becomes difficult.

The project addresses the following connected problems:

1. Learning outcomes and their evaluation context need to be represented in a structured form that connects course-level outcomes with the broader outcomes relevant to academic programs.  
2. ACD's institutional evaluation instruments require respondent workflows that preserve the context of each deployment and response while supporting the appropriate student, graduating-student, alumni, and industry-partner evaluations.  
3. Quantitative ratings and qualitative feedback need to be organized and summarized so authorized academic stakeholders can examine evaluation evidence across relevant courses, outcomes, respondent groups, and academic periods.  
4. Academic personnel need reports and analytics that make collected evidence easier to review for quality assurance, program evaluation, continuous improvement, and accreditation-related documentation without allowing the system itself to make curriculum, accreditation, or academic-policy decisions.

The core problem addressed by CLOIE is therefore the management of learning-outcome evaluation evidence from **response collection to analytics and reporting**. Curriculum revision, instructional intervention, accreditation decisions, and other academic actions remain human and institutional responsibilities.

## **1.3 Project Objectives**

### **General Objective**

The general objective of Project CLOIE is to provide Assumption College of Davao with a centralized information system that manages learning-outcome evaluation context and stakeholder responses and transforms the collected evidence into role-appropriate analytics and reports for academic quality assurance and continuous improvement.

### **Specific Objectives**

**OBJ-01.** Maintain the academic and learning-outcome context required for evaluation by managing relevant academic periods, programs, courses, course assignments, rosters, Institutional Learning Outcomes, Program Learning Outcomes, Course Intended Learning Outcomes, and approved outcome mappings.

**OBJ-02.** Support controlled administration of ACD's institutional evaluation instruments and enable eligible students, graduating students, alumni, and industry partners to complete the evaluation workflows applicable to them.

**OBJ-03.** Process collected quantitative ratings and qualitative feedback into traceable analytical evidence that authorized users can examine by relevant dimensions such as learning outcome, course, program, academic period, evaluation instrument, deployment, and stakeholder group where applicable.

**OBJ-04.** Provide authorized academic personnel with dashboards and reports that consolidate relevant learning-outcome and stakeholder evaluation evidence for academic review, quality-assurance activities, continuous improvement, and accreditation preparation.

**OBJ-05.** Protect evaluation and academic information through authenticated access, role and scope restrictions, controlled response handling, and confidentiality measures appropriate to the user's institutional responsibility.

The objective identifiers are intended to remain stable throughout the project documentation. Each objective will be linked in the Requirements Traceability Matrix to approved requirements, design components, implementation evidence, test or validation references, and the latest verified status. This avoids treating the objectives as statements that are automatically achieved simply because the software was developed.

## **1.4 Scope, Boundaries and Constraints**

### **1.4.1 Project Scope**

System CLOIE is a web-based academic evaluation and learning-outcome evidence system for Assumption College of Davao. Its functional scope is centered on establishing the context of evaluations, collecting responses, processing those responses, and making the resulting evidence available to authorized users.

The system maintains the academic structures needed to identify where evaluation evidence belongs. These include academic periods, programs, courses, course assignments, faculty-course relationships, and course rosters where applicable. These structures provide context for evaluation and analytics. They do not turn CLOIE into a complete curriculum-management or Student Information System.

System CLOIE manages several levels of learning outcomes. **Institutional Learning Outcomes** represent institution-level outcomes under the applicable academic responsibility. **Program Learning Outcomes** describe the broader outcomes associated with an academic program. **Course Intended Learning Outcomes** describe outcomes associated with a particular course and are managed within the appropriate course and faculty context.

CILOs may be mapped to one or more PLOs. The mapping records a manifestation of **Learning, Practice, or Opportunity** according to the approved CLOIE model. This allows the system to preserve how a course outcome relates to broader program outcomes. The mapping is part of the evidence context. It does not authorize the system to redesign the curriculum or determine that an outcome should be added, removed, or rewritten.

System CLOIE also manages evaluation instruments and the controlled deployment of evaluations. The baseline institutional evaluation context contains the **Post-Term CILO Evaluation Tool**, **Graduating Student Exit Survey**, **Alumni Evaluation Tool**, and **Industry Partner Internship Evaluation Tool**. The system distinguishes the reusable instrument or template from an actual evaluation activity made available to intended respondents.

A **course-bound evaluation** operates within a specific course context. The Post-Term CILO Evaluation is the clearest example because students respond to the CILOs associated with a course. A **central evaluation** is deployed at a broader institutional or program context rather than being tied to one faculty-course evaluation workflow. Graduating-student, alumni, and industry-partner evaluations may operate in this broader deployment context according to their approved configuration.

Respondent workflows include accessing assigned or available evaluations, viewing evaluation details, answering applicable questions, rating CILOs where required, saving draft responses where supported, reviewing completion information, submitting responses, and viewing the appropriate submission history. Existing CLOIE use-case documentation represents these response workflows for students, alumni, and industry partners.

Quantitative processing covers structured response data used to produce summaries and outcome-related measures. The system may present results through counts, distributions, averages, attainment-oriented summaries, comparative views, or other approved analytics appropriate to an evaluation. The exact calculation rules and acceptance criteria belong to the requirements and system-design chapters and should not be inferred from this introductory description.

Qualitative processing covers open-ended stakeholder feedback. System CLOIE can present qualitative evidence through appropriate summaries and text-oriented visualizations where implemented, including word-frequency or word-cloud views. Such representations are supplementary aids. They do not establish the meaning or cause of a respondent's comment without human review.

Analytics are organized around the evidence available to the user's authorized scope. These may include views of evaluation participation, response distributions, CILO evidence, PLO-related evidence, course or program comparisons, stakeholder-source comparisons, qualitative feedback, and trends across available academic periods. CLOIE analytics are descriptive and evidence-oriented. They are not an automatic curriculum-revision system.

Reporting allows authorized users to produce or access structured representations of relevant evaluation evidence. These reports can be used as supporting material in academic review, Continuous Quality Improvement, program evaluation, and accreditation preparation. A generated CLOIE report is evidence for review. It is not itself an accreditation finding or an academic decision.

The system includes identity, onboarding or verification where applicable, authenticated sessions, and role-based and scope-based authorization. These controls limit access to academic functions and evaluation information according to the user's responsibilities.

**Peer-to-Peer Evaluation, Self-Evaluation, and Class Observation are newly proposed or pending features.** They are not treated as completed baseline System CLOIE modules in this manuscript unless later requirements, implementation, testing, and validation evidence establishes otherwise. Until then, they should retain a proposed or pending status in the project's requirements and change records.

### **1.4.2 Users and Organizational Scope**

The organizational scope of System CLOIE covers academic and respondent users whose responsibilities differ by institutional role.

The **Secretary** handles the administrative academic structures and records assigned to the role. The Secretary's scope does not include ownership of General Education course assignment or Institutional Learning Outcome management where those responsibilities have been transferred to the General Education Coordinator.

The **College Dean** has college-level oversight. The role can review academic and evaluation information across the scope authorized for the college, including relevant dashboards, analytics, reports, and course information. The Dean's access is primarily for oversight and evidence review rather than routine ownership of every program-level workflow.

The **General Education Coordinator** manages responsibilities specific to General Education across programs. This includes applicable General Education course assignments, Institutional Learning Outcome management, and General Education analytics or oversight supported by the system. Unlike a Program Head, this scope follows General Education courses across programs rather than one professional academic program.

The **Program Head** operates within the programs assigned to the user. Program Heads manage applicable PLOs, oversee courses and course assignments within their program responsibility, manage or use evaluation tools and deployments according to their permissions, review program-level analytics, and generate reports. Where a Program Head is responsible for more than one program, the system must preserve the selected program context so data from unrelated programs is not mixed.

The **Faculty Member** operates primarily at course level. Faculty members work with assigned courses, manage CILOs for those courses, maintain approved CILO-to-PLO mappings and manifestations where applicable, manage course-bound evaluation activities within their authority, and review authorized course-level evidence.

The **Student** operates as a respondent within the student's eligible academic and course context. Students view and complete evaluations made available to them, including the Post-Term CILO Evaluation and, where eligibility applies, the Graduating Student Exit Survey.

The **Alumni** user participates in evaluations intended for graduates and provides post-graduation feedback through the Alumni Evaluation Tool. Alumni do not receive academic-management privileges by virtue of being respondents.

The **Industry Partner** participates in the appropriate industry evaluation workflow, including the Industry Partner Internship Evaluation Tool. Industry respondents provide an external stakeholder perspective but do not gain program-management or student-record access.

These scopes are enforced by the system rather than relying only on differences in navigation. Detailed permission rules, role matrices, and authorization requirements will be specified in Chapter 4\.

### **1.4.3 System Boundaries**

System CLOIE has deliberate boundaries.

It does not replace ACD's **Learning Management System**. CLOIE does not deliver lessons, course materials, assignments, quizzes, or general instructional content.

It does not replace a **Student Information System**. It is not the authoritative system for admissions, registration, official grades, transcripts, tuition, or complete student academic records. Academic and roster information maintained by CLOIE exists only to the extent required for its evaluation and evidence workflows.

It is not an **individual student grading system**. A respondent's evaluation answers do not become grades for that respondent, and CLOIE does not calculate official academic grades.

It is not an **instructional delivery platform**. Faculty members may manage outcomes and evaluations within CLOIE, but classroom teaching and delivery of learning activities occur outside the system.

It does not replace the **formal authority of academic decision-makers**. Analytics may show patterns or areas that warrant attention, but System CLOIE does not decide that teaching methods, courses, curricula, learning outcomes, or institutional policies must be changed.

It does not replace the **institution's accreditation process** and does not determine whether a program satisfies an accrediting body's standards. It can organize and report evidence that ACD may use as supporting material during accreditation preparation and academic review.

The boundary can therefore be stated plainly: **System CLOIE collects, manages, analyzes, and presents learning-outcome evaluation evidence. Authorized institutional personnel interpret that evidence and decide what action should follow.**

### **1.4.4 Technical and Operational Constraints**

System CLOIE depends on internet connectivity because its primary interface and application services are web-based. Users must be able to reach the deployed application and the services required for authentication, data access, and other configured functions. Loss of connectivity may prevent or interrupt access until service is restored.

The system's authentication model depends on its configured Google and Supabase authentication services. Institutional academic roles also depend on the institution's account, provisioning, and verification rules. These dependencies mean that access cannot be treated as independent of the institution's identity-management practices.

System CLOIE also depends on accurate and available stakeholder and academic-context data. Course assignments, roster membership, respondent eligibility, program information, evaluation deployments, and similar records affect what a user can see or complete. Incorrect or unavailable source information can therefore affect evaluation access and the interpretation of results.

Because the system processes academic evaluation data and qualitative stakeholder comments, privacy and confidentiality place operational limits on who may access raw or identifiable information. System CLOIE should not be described as providing absolute anonymity where internal response relationships are retained for eligibility, integrity, duplicate prevention, or other legitimate system controls. The final manuscript should use the terms confidential, pseudonymized, aggregated, or de-identified according to the actual implementation verified in Chapter 4 and Chapter 5\.

Representative-user validation is also constrained by the availability and approval of actual stakeholders. Testing with developers and automated tools can verify many requirements, but user acceptance or beta evidence can only be reported for stakeholder groups that actually participate. The project will not infer acceptance for a role that was not represented during validation.

Production operation further depends on ACD's approval of the final deployment arrangement, service configuration, technical ownership, backup procedures, and turnover responsibilities. These matters must be verified as part of deployment and handover rather than assumed in Chapter 1\.

## **1.5 Significance and Intended Beneficiaries**

### **1.5.1 Assumption College of Davao**

For Assumption College of Davao, System CLOIE provides a common structure for learning-outcome evaluation evidence that can otherwise belong to different courses, programs, academic periods, instruments, and stakeholder groups. Its institutional value is the ability to retain these relationships while making the collected evidence available for later review.

This supports ACD's quality-assurance work because outcomes-based quality assurance depends on evidence that can be interpreted in relation to intended educational results. CHED's outcomes-based quality-assurance framework establishes this wider institutional context in Philippine higher education (CHED, 2012). CLOIE does not satisfy quality-assurance or accreditation requirements by itself, but it can make relevant evaluation evidence easier to organize, retrieve, and present.

### **1.5.2 College Dean**

The College Dean benefits from college-level visibility over evaluation and learning-outcome evidence within the role's authorized scope. Instead of relying only on isolated course results, the Dean can review broader patterns through dashboards, analytics, and reports.

This access supports oversight rather than replacing the responsibilities of Program Heads, the General Education Coordinator, or Faculty Members. The Dean can use CLOIE evidence to identify matters that warrant discussion or closer review while leaving academic action to the appropriate institutional process.

### **1.5.3 General Education Coordinator**

The General Education Coordinator benefits from a system scope that follows General Education responsibilities across academic programs. The coordinator can manage applicable General Education course assignments, Institutional Learning Outcomes, and relevant evaluation or analytical evidence without requiring each professional program to duplicate the same college-wide responsibility.

This separation is useful because General Education does not fit neatly within the scope of one Program Head. System CLOIE therefore gives the coordinator an appropriate institutional scope while preserving the boundaries of program-specific academic management.

### 

### **1.5.4 Program Heads**

Program Heads benefit from program-scoped management and evidence. They can maintain relevant PLOs, oversee applicable course information and assignments, work with evaluation activities under their responsibility, inspect program analytics, and obtain reports.

The main value is that program-level evidence can remain connected to its underlying courses, outcomes, evaluation activities, and respondents. This gives Program Heads a stronger basis for review than an isolated total or raw response file. CLOIE still leaves decisions about academic changes to the Program Head and other authorized institutional bodies.

### **1.5.5 Faculty Members**

Faculty Members benefit from course-level outcome and evaluation workflows associated with the courses assigned to them. They can manage CILOs, maintain approved CILO mappings where required, administer course-bound evaluations within their authority, and review the evidence available for their courses.

Post-term student feedback can therefore be examined in relation to the CILOs that students were actually asked to evaluate. The system does not interpret a lower rating as proof of ineffective teaching. It provides evidence that faculty members and academic managers can consider alongside other assessment and instructional information.

### **1.5.6 Students**

Students benefit from having a defined channel through which they can provide structured feedback on the learning outcomes associated with their academic experience. The Post-Term CILO Evaluation connects student responses directly to course outcomes rather than relying only on general impressions of a course.

For graduating students, the Graduating Student Exit Survey provides another evaluation context near completion of the program. Their responses contribute to aggregate academic evidence but do not become grades and should not expose individual feedback beyond the confidentiality rules of the system.

### 

### **1.5.7 Alumni**

Alumni provide a perspective that current students cannot yet have. Their experience after completing or leaving the program can inform evaluation of program relevance and the outcomes they encountered after graduation.

The Alumni Evaluation Tool gives this stakeholder group a structured mechanism for contributing feedback. CLOIE allows those responses to be stored and analyzed alongside other evidence while preserving alumni as a distinct respondent context rather than merging their feedback with current student responses.

### **1.5.8 Industry Partners**

Industry Partners provide an external perspective through the Industry Partner Internship Evaluation Tool. Their observations can contribute evidence about competencies demonstrated in internship or workplace settings and can complement evidence gathered from students and alumni.

Employer involvement has recognized value within higher-education quality assurance, particularly when institutions need evidence about the relationship between academic preparation and workplace expectations. Hou et al. (2022), however, show that employer input should be interpreted within a broader quality-assurance process rather than treated as decisive on its own. System CLOIE follows this approach by treating industry responses as one stakeholder source within the larger body of evidence.

### **1.5.9 ICTC and Future System Maintainers**

The Information and Communications Technology Center and future technical maintainers can benefit from technical and operational documentation that explains how the application is deployed, configured, secured, backed up, tested, and maintained. The value to maintainers depends on the project leaving behind more than working source code.

The final handover should therefore include the information needed to operate and maintain the system without exposing credentials or other secrets. Deployment instructions, environment requirements, database migration procedures, backup and recovery procedures, dependency information, technical documentation, and turnover records are expected parts of the project's operational evidence. Whether ACD or ICTC formally accepts operational ownership must be reported from actual turnover evidence in Chapter 5 rather than presumed here.

### **1.5.10 Future Capstone Researchers or Institutions**

Project CLOIE may provide future capstone researchers with a documented case of developing a learning-outcome evaluation and evidence-management system for a Philippine higher-education context. Its requirements model, outcome relationships, stakeholder evaluation workflows, analytics design, security decisions, and eventual validation results may be examined or extended in later work.

Other institutions may also find parts of the approach relevant, but the project does not assume that System CLOIE can be transferred directly to another college or university without adaptation. Academic structures, evaluation instruments, outcome terminology, authorization practices, accreditation contexts, and institutional policies differ. Any reuse would therefore require a separate requirements and validation process.

## **1.6 Success Criteria / Expected Project Outcomes**

The success of Project CLOIE will be determined from evidence rather than from the existence of a working interface alone. Each project objective must trace into approved requirements, implementation evidence, and tests or stakeholder validation. Appendix F requires this relationship to remain visible and specifically prohibits treating a requirement as passed without supporting evidence.

The criteria in Table 1.1 define what evidence should demonstrate before an objective is considered achieved. They are acceptance targets for later verification. They are not claims that testing or validation has already produced these results.

#### **Table 1.1 *Project Success Criteria*** 

| Objective ID | Success Criterion | Measurement / Evidence | Acceptance Threshold |
| ----- | ----- | ----- | ----- |
| OBJ-01 | The system correctly maintains the approved academic, course, learning-outcome, mapping, assignment, and roster context required by evaluation workflows. | RTM coverage, functional and integration tests, database or invariant tests, selected end-to-end workflows, and implementation evidence. | All requirements classified as critical or Must for the OBJ-01 baseline are verified, with no unresolved defect that prevents the required academic or outcome context from being maintained correctly. |
| OBJ-02 | Intended respondents can complete the approved evaluation workflows through controlled deployments using the applicable institutional instruments. | Functional tests, browser end-to-end tests, deployment and eligibility tests, response-submission tests, duplicate-response or finalization checks, and representative-user validation. | Critical workflows for each baseline evaluation context included in the approved final scope are successfully verified. Any excluded or deferred instrument or workflow is explicitly recorded rather than counted as passed. |
| OBJ-03 | Quantitative and qualitative responses are processed into analytics that preserve the correct academic, outcome, evaluation, and stakeholder context. | Analytics verification against controlled test data, calculation tests, integration tests, qualitative-processing checks, browser verification, and selected user-validation tasks. | Required analytical outputs reproduce the expected results for verified test datasets and no unresolved high-priority defect materially changes or misattributes the displayed evidence. |
| OBJ-04 | Authorized academic users can obtain the dashboards and reports required for their approved scope and use them to review evaluation evidence. | Role-based workflow tests, report-generation tests, browser end-to-end tests, output review, and representative stakeholder validation. | All critical approved dashboard and reporting workflows are accessible to the correct roles and complete successfully for the supported scopes. Deferred report formats remain identified as deferred. |
| OBJ-05 | Academic and evaluation data are protected through the project's approved authentication, authorization, confidentiality, and response-integrity controls. | Positive and negative authorization tests, cross-role and cross-scope tests, response confidentiality checks, one-response and finalization tests, security verification, and defect records. | Critical authorization and confidentiality scenarios pass, unauthorized cross-role or cross-scope access is rejected, and no unresolved high-priority security or privacy defect remains for the final validated build. |

The broader project will also consider representative-user validation, usability and accessibility evidence, defect correction and retesting, deployment readiness, and client or stakeholder acceptance where these are completed. Appendix G permits validation through methods such as task performance, observation, questionnaires, interviews, and UAT checklists and requires identified issues to be followed by revision and retesting where applicable.

Final achievement of these criteria will therefore be reported in Chapter 5\. A criterion that is only partially satisfied, deferred, changed, or not tested will retain that status rather than being presented as achieved.

## **1.7 Definition of Terms**

**Central Evaluation.** An evaluation deployed beyond a single faculty-course context and administered to an eligible respondent population according to the applicable program or institutional scope. In System CLOIE, graduating-student, alumni, and industry-partner evaluations may use this form of deployment where configured.

**CILO Mapping Manifestation.** The type of relationship recorded when a Course Intended Learning Outcome is mapped to a Program Learning Outcome in System CLOIE. The approved manifestation model uses **Learning, Practice, and Opportunity**. **Learning** indicates that the course facilitates learning of the competency by providing input and evaluating the competency. **Practice** indicates that the course allows learners to practice the competency. **Opportunity** indicates that the course gives learners an opportunity to apply or demonstrate the competency within the learning context. The manifestation describes the role of the course outcome in relation to the PLO and is not itself an attainment score.

**Continuous Quality Improvement (CQI).** In Project CLOIE, CQI refers to the continuing institutional process of reviewing evidence, identifying matters that warrant action, making authorized improvements, and reviewing later evidence. System CLOIE contributes evaluation evidence to this process but does not autonomously determine or implement academic changes.

**Controlled Deployment.** A specific release of an evaluation instrument to an authorized or eligible respondent population under defined academic and availability conditions. The deployment separates a reusable evaluation instrument from an actual evaluation activity and provides the context for collecting responses.

**Course-Bound Evaluation.** An evaluation associated with a specific course offering or course assignment. The Post-Term CILO Evaluation is the primary course-bound evaluation in Project CLOIE because respondents evaluate CILOs within the context of a particular course.

**Course Intended Learning Outcome (CILO).** An intended learning outcome associated with a particular course. Within System CLOIE, faculty members manage CILOs for the courses within their authorized assignment, and CILOs may be mapped to applicable PLOs.

**Evaluation Instrument.** A defined set of evaluation questions, scales, prompts, and related configuration used as the basis for one or more evaluation deployments. The baseline Project CLOIE context includes the Post-Term CILO Evaluation Tool, Graduating Student Exit Survey, Alumni Evaluation Tool, and Industry Partner Internship Evaluation Tool.

**Institutional Learning Outcome (ILO).** An outcome defined at the institutional level rather than for a single academic program or course. In the current System CLOIE organizational model, management of ILOs belongs to the authorized General Education Coordinator scope.

**Outcome Attainment.** An analytical indication derived from evaluation evidence associated with a learning outcome according to the approved calculation and interpretation rules of System CLOIE. An attainment result is evidence for academic review and is not equivalent to an individual student's grade or an automatic judgment about curriculum effectiveness.

**Program Learning Outcome (PLO).** A learning outcome that describes the broader competencies expected within an academic program. In System CLOIE, PLOs provide the program-level context to which applicable CILOs may be mapped.

**Project CLOIE.** The capstone undertaking titled *Project CLOIE: The Development of a System for Comprehensive Learning Outcomes and Instructional Evaluation*. It includes the project's requirements engineering, design, implementation, testing, validation, documentation, and handover activities.

**Stakeholder Evaluation.** The collection of structured or qualitative evaluation evidence from a stakeholder group whose perspective is relevant to the academic context. Project CLOIE's baseline respondent groups include students, graduating students, alumni, and industry partners.

**System CLOIE.** The software system developed through Project CLOIE. It manages learning-outcome evaluation context, controlled evaluation activities, stakeholder responses, analytics, and reporting for authorized users at Assumption College of Davao.

\==================================================

# **CHAPTER 2**

# **REVIEW OF RELATED LITERATURE, TECHNOLOGIES AND SYSTEMS**

\==================================================

This chapter reviews the academic literature, technical evidence, standards, and existing systems that provide the foundation for Project CLOIE. The review focuses on Outcome-Based Education, learning-outcome assessment and alignment, stakeholder evaluation, quality-assurance evidence, learning analytics, qualitative feedback, privacy, and usable and accessible information systems. These areas are examined in relation to System CLOIE's purpose of collecting stakeholder evaluation responses, preserving their academic context, processing them into interpretable evidence, and presenting analytics and reports for authorized academic personnel. Existing higher-education assessment and feedback systems are also reviewed to identify established approaches and the specific institutional need that Project CLOIE addresses at Assumption College of Davao. 

## **2.1 Thematic Review of Literature and Technical Evidence**

\[Organize by themes. Synthesize multiple sources within each theme rather than  
writing one paragraph per author.\]

### **2.1.1 Outcome-Based Education and Continuous Quality Improvement**

Outcome-Based Education organizes educational planning and assessment around what learners are expected to know, perform, or demonstrate. Within Philippine higher education, this approach is supported by Commission on Higher Education Memorandum Order No. 46, Series of 2012, which establishes an outcomes-based and typology-based approach to quality assurance. The policy connects educational outcomes with institutional quality assurance and places responsibility on higher-education institutions to demonstrate that their programs achieve their intended outcomes (Commission on Higher Education \[CHED\], 2012).

The CHED Handbook on Typology, Outcomes-Based Education, and Institutional Sustainability Assessment further explains that an outcomes-based approach requires institutions to define expected outcomes, gather evidence, evaluate results, and use the findings to support quality improvement (CHED, 2014). The emphasis is therefore not limited to defining outcomes in curricula. Institutions also need a process for determining whether evidence supports those outcomes and for retaining that evidence for subsequent review.

Recent literature reinforces this relationship between assessment and improvement. Goss (2022) describes student learning-outcome assessment as a complex process that has become increasingly important to institutional discussions of competence and continuous improvement. Alyasin et al. (2023) likewise describe learning-outcome assessment as part of a systematic cycle that connects learning, program objectives, curriculum, assessment evidence, and institutional decision-making. Bennett et al. (2023) add a practical dimension to this discussion. Their study found that meaningful assessment requires time, resources, long-term attention, and responsiveness to external stakeholders. Taken together, these studies show that outcomes assessment depends on an organized process rather than isolated measurement activities.

Continuous Quality Improvement gives this evidence an institutional purpose. Samuel and Farrer (2025) describe the use of the Plan-Do-Check-Act cycle in higher education as a means of systematically collecting and analyzing evidence, identifying opportunities for improvement, implementing actions, and examining subsequent results. This does not mean that an information system performs CQI by itself. The system supports the evidence and review portions of the cycle, while academic personnel remain responsible for deciding what changes should be made.

This distinction is central to Project CLOIE. System CLOIE is designed to collect, manage, analyze, and present evaluation evidence. It does not determine curriculum revisions or instructional interventions automatically. The system instead gives authorized academic personnel a structured basis for examining stakeholder responses and learning-outcome evidence.

The relationship between OBE and CQI also supports the retention of historical evaluation evidence. If academic personnel are expected to examine outcomes over successive periods, current results should not exist in isolation from previous evaluation cycles. Historical comparison is useful only when the context of the evidence is preserved. A result should remain associated with the relevant course, program, learning outcome, respondent group, evaluation instrument, and academic period.

For Project CLOIE, OBE and CQI therefore support several underlying system requirements. Learning outcomes must be represented explicitly. Evaluations need controlled contexts. Responses need to remain connected to the outcomes and academic structures they concern. Analytics and reports must present evidence without making academic decisions on behalf of authorized personnel. Historical evidence should also remain available when meaningful comparison across evaluation periods is required.

### **2.1.2 Learning Outcomes Assessment and Curriculum Alignment**

Learning-outcome assessment becomes more useful when the relationship among different levels of educational outcomes is explicit. Course outcomes describe what students are expected to achieve within a course, while program outcomes represent broader competencies developed across multiple courses. Institutional outcomes may express learning expectations that apply across programs or the institution as a whole. These levels are related, but evidence collected for one level should not automatically be treated as evidence for another.

Goss (2022) notes that effective student learning-outcome assessment is difficult because assessment requires institutions to determine what evidence represents learning and how that evidence contributes to broader academic purposes. Alyasin et al. (2023) similarly describe systematic assessment as a process that connects learning outcomes with program objectives, curriculum, assessment methods, and evidence. Their work emphasizes that assessment should be interpretable and organized around defined relationships rather than treated as a collection of unrelated scores.

El Marsafawy et al. (2022) examined the relationship between accreditation requirements and learning-management-system functions for measuring intended learning outcomes. They found that institutions require explicit criteria and processes for assessing learning outcomes at course and program levels. Their work is particularly relevant to CLOIE because it demonstrates that general-purpose educational platforms do not automatically satisfy institution-specific outcome-assessment requirements. The academic relationships and measurement rules still need to be defined.

Curriculum mapping provides one method for making those relationships visible. Rather than treating courses and outcomes as independent records, a curriculum map identifies where broader program outcomes are addressed through courses or course-level outcomes. Recent work by Derouich (2025) further demonstrates how systematic alignment between Course Learning Outcomes and Program Learning Outcomes can support analysis of outcome coverage and curriculum coherence. The value of such mapping lies in preserving the relationship between lower-level and higher-level outcomes so that evidence can be interpreted at the appropriate academic level.

For System CLOIE, this principle applies to the relationship between Course Intended Learning Outcomes and Program Learning Outcomes. A student response concerning a CILO should not become evidence about a PLO merely because the two records belong to the same program. The relationship needs to be represented explicitly through an approved CILO-to-PLO mapping.

System CLOIE also records the manifestation assigned to a CILO-to-PLO relationship according to ACD's approved Learning, Practice, and Opportunity model. The manifestation adds academic context to the mapping rather than reducing the relationship to a simple yes-or-no connection. Existing outcome-management platforms use comparable concepts in which courses can contribute to broader outcomes at different levels or degrees, although their categories and institutional meanings differ from CLOIE's model. These existing approaches support the general principle of qualified outcome mapping without establishing that their categories are equivalent to CLOIE's manifestations.

The role of curriculum alignment in CLOIE should nevertheless remain bounded. Project CLOIE is not primarily a curriculum-management system. It does not need to assume responsibility for curriculum approval, degree auditing, instructional delivery, or automatic curriculum revision. Course and outcome relationships are represented because evaluation evidence needs academic context. Their primary purpose within CLOIE is to support the interpretation of responses and outcome-oriented analytics.

The literature therefore supports a specific design principle for CLOIE. Learning outcomes, their academic ownership, and their approved mappings should be stored in a form that allows evaluation evidence to retain its meaning. This provides the connection needed for course-level responses to contribute to broader program-level analysis without implying that every course-level result directly measures every program outcome.

### **2.1.3 Stakeholder-Based Academic Evaluation**

Academic evaluation can draw evidence from several stakeholder groups, but the perspectives provided by those groups are not interchangeable. Current students can describe their experiences within courses and their perceptions of learning-outcome attainment. Graduating students can reflect on their academic experience near the completion of a program. Alumni can evaluate their education after gaining further academic or professional experience. Industry partners can provide an external perspective on competencies observed in workplace or internship settings.

The use of multiple sources matters because stakeholder ratings represent perceptions within particular contexts. Research concerning student ratings demonstrates why such evidence requires careful interpretation. Stoesz et al. (2022), in a systematic review of research on student ratings of instruction, found evidence of biases associated with characteristics unrelated to teaching quality. Although CLOIE's Post-Term CILO Evaluation is not identical to a conventional teaching evaluation, the broader lesson remains relevant. A student rating should be interpreted according to what the instrument actually asks the student to evaluate rather than treated as a complete objective measure of educational quality.

This supports an important boundary in System CLOIE. Student responses concerning perceived CILO attainment provide stakeholder evidence about learning outcomes. They are not equivalent to direct evidence such as examination scores, performance assessments, official grades, or faculty assessment rubrics. CLOIE can analyze the responses that its instruments collect without claiming that those responses replace all other forms of learning-outcome assessment.

External stakeholders contribute a different kind of evidence. Hou et al. (2022) examined employer engagement in external quality assurance across Asian higher-education contexts. Their findings show that employer participation can provide useful external perspectives, but the effectiveness and role of employer involvement vary according to institutional and national context. Industry feedback should therefore be treated as a distinct source of evidence rather than as a universal measure of program quality.

Alumni evidence has a similar contextual value. Graduates can reflect on the relevance of their education after leaving the institution, which distinguishes their perspective from that of currently enrolled students. The value of the evidence comes partly from preserving that difference. Combining every respondent group into a single undifferentiated score would remove information needed to understand what the result represents.

System CLOIE addresses this by maintaining separate evaluation contexts for its approved stakeholder instruments. These include the Post-Term CILO Evaluation Tool, Graduating Student Exit Survey, Alumni Evaluation Tool, and Industry Partner Internship Evaluation Tool. Graduating students remain within the Student user context rather than constituting a separate system role, while the instrument and deployment determine the evaluation context.

This multi-stakeholder model affects the system beyond questionnaire design. Evaluation deployments need eligibility rules so that the appropriate respondents receive the appropriate instruments. Stored responses need to retain their instrument and deployment context. Analytics need to identify the respondent group represented by a result. Access to the resulting evidence should also follow the academic responsibilities of the user viewing it.

The literature therefore supports CLOIE's use of multiple stakeholder perspectives while cautioning against treating them as interchangeable measures. System CLOIE should make those perspectives easier to collect and compare where appropriate, while preserving enough context for academic personnel to understand what each source of evidence actually represents.

### **2.1.4 Quality Assurance, Accreditation, and Evidence Management**

Quality assurance requires institutions to demonstrate how academic processes and outcomes are examined using evidence. Under CHED's outcomes-based quality-assurance framework, higher-education institutions are expected to define educational outcomes and examine evidence related to their achievement (CHED, 2012, 2014). Accreditation and institutional review can therefore create a practical need for organized records of learning outcomes, assessment processes, stakeholder feedback, and resulting evidence.

El Marsafawy et al. (2022) identify a related problem in the gap between accreditation expectations for learning-outcome measurement and the functions provided by commonly used learning-management systems. Their study shows that institutions may need additional structures or systems to connect outcome measurement with accreditation requirements. The finding is important to CLOIE because it demonstrates why storing learning materials or grades in an LMS does not automatically solve the problem of institutional outcome-evidence management.

Alyasin et al. (2023) similarly frame learning-outcome assessment as an accountability and quality-assurance process. Their discussion of systematic assessment connects curriculum, outcomes, evidence, and review rather than treating assessment as an isolated reporting task. Bennett et al. (2023) further show that assessment work responds to external stakeholders and has a long-term orientation. Together, these findings support systems that preserve evidence beyond a single evaluation cycle.

Evidence management requires traceability. A summarized result is more useful when academic personnel can determine what produced it. In CLOIE, an outcome-related result may depend on an evaluation instrument, deployment, respondent group, academic period, course, CILO, and associated mappings. Removing those relationships may make a dashboard simpler, but it also makes the evidence harder to interpret or defend.

Historical evidence presents another concern. Results from different academic periods should not automatically be treated as directly comparable when the underlying outcome, instrument, population, or evaluation rule has changed. A system that supports longitudinal review therefore needs enough contextual information to prevent historical evidence from becoming detached from the conditions under which it was collected.

This distinction also defines CLOIE's relationship with accreditation. System CLOIE can produce reports and organized evidence that ACD may use during accreditation preparation, internal quality review, or program evaluation. It does not determine whether ACD satisfies an accreditation standard, nor does it replace the institution's formal accreditation process. Academic personnel and accrediting bodies retain responsibility for those judgments.

The literature therefore supports CLOIE's evidence-management functions without requiring it to become a full accreditation-management platform. Its role is to make relevant evaluation evidence easier to organize, inspect, retrieve, and report while preserving the context necessary for authorized personnel to interpret it.

### **2.1.5 Learning Analytics and Outcome-Attainment Reporting**

Learning analytics concerns the collection and analysis of educational data for understanding or supporting learning and educational processes. Its usefulness depends on whether the analysis answers a meaningful academic question. Guzmán-Valenzuela et al. (2021) reviewed learning-analytics research in higher education and found that the field has often placed more emphasis on analytics than on the complexity of learning itself. Their conclusion provides a useful warning for CLOIE. Producing more charts or calculations does not automatically create better academic evidence.

Stojanov and Daniel (2024) similarly found that analytics in higher education has been used to support learning, teaching, and administrative decision-making, while also identifying technical, ethical, and practical challenges. This broader evidence supports the use of analytics for institutional review but cautions against assuming that data alone can explain educational outcomes.

Dashboards are one way of making analytical evidence accessible to users. Paulsen and Lindsay (2024) found that recent learning-analytics dashboards increasingly connect analytical design with educational goals rather than presenting available data without a clear purpose. Their findings support a user-centered approach in which the choice of indicators and visualizations follows the question the dashboard is intended to help answer.

For CLOIE, this means that analytics should remain closely connected to the evaluation process. The system's primary analytical task is not to predict an individual student's future performance. Instead, it needs to summarize stakeholder responses while retaining their relationships to learning outcomes, courses, programs, respondent groups, evaluation instruments, and academic periods.

Outcome-attainment reporting requires the same discipline. A numerical average alone does not establish that an outcome has been attained. Any classification of attainment needs a defined calculation and interpretation rule. El Marsafawy et al. (2022) emphasize the need for explicit criteria when measuring intended learning outcomes, while Alyasin et al. (2023) show how systematic assessment depends on agreed processes and measures. CLOIE should therefore implement approved deterministic calculations rather than infer attainment from arbitrary thresholds.

Quantitative evaluation can include descriptive statistics such as response counts, distributions, percentages, and means where appropriate to the instrument. These calculations make large response sets easier to examine, but their meaning still depends on the instrument and scale used. A mean score from one stakeholder instrument should not automatically be compared with a differently structured measure from another instrument.

Longitudinal analysis presents a similar issue. Trends across terms or academic years can help users identify patterns, but a trend does not establish causation. A change in evaluation results following an academic intervention does not by itself prove that the intervention caused the change. System CLOIE can present the sequence of evidence while leaving causal and academic interpretation to authorized personnel.

Role context should also influence analytical presentation. Faculty Members need course-level evidence relevant to their assigned courses. Program Heads require program-level views. The General Education Coordinator requires analytics within the authorized General Education context, while the Dean may require broader oversight. The same underlying evidence can support these views without giving every user unrestricted access to all data.

The reviewed literature therefore supports an intentionally restrained analytics model for CLOIE. The system should provide calculations and visualizations that users can understand and verify. More advanced analytics should be added only when they answer a defined academic question and can be validated against the evidence they represent.

### 

### **2.1.6 Qualitative Feedback Analysis**

Quantitative ratings make responses easier to aggregate, but fixed-choice questions cannot capture every issue that respondents may want to raise. Open-ended feedback allows respondents to explain experiences, concerns, or observations in their own words. This can provide useful context for numerical results, although larger collections of comments are harder to review manually.

Research on educational text analysis shows why automated processing can help while also requiring restraint. Dalipi et al. (2021) reviewed sentiment-analysis research involving student feedback and identified applications in course evaluation, understanding course performance, and examining written feedback. Kastrati et al. (2021) likewise found growing use of natural-language processing and machine-learning techniques for sentiment analysis of student feedback. These methods can help organize large collections of comments, but their results depend on the data, language, model, and analytical method used.

Cunningham-Nelson et al. (2021) examined visualizations of qualitative student comments and found that thematic and sentiment-oriented views could help academics focus on patterns across comments instead of reacting to isolated statements. At the same time, participants expressed concerns about the accuracy of sentiment analysis and the validity of the underlying evaluation data. The study therefore supports visualization as a review aid rather than as a substitute for the original comments.

This distinction is relevant to System CLOIE. Open-ended comments can provide context that rating distributions cannot. Text-processing features may help authorized users identify recurring words or themes, but those outputs should not be treated as authoritative interpretations of respondent intent.

Word clouds illustrate this limitation clearly. A word cloud can show which terms occur frequently in a collection of comments, making it useful for exploratory review. Frequency alone, however, does not reveal whether a term was used positively or negatively, whether several terms refer to the same idea, or whether an important but less frequent comment deserves attention. Word-cloud output should therefore supplement access to the underlying qualitative evidence rather than replace it.

The same rule applies if AI-assisted interpretation remains part of the final System CLOIE implementation. Generated summaries or interpretations should remain separate from deterministic response statistics and original evaluation evidence. Any data sent to an external model should follow the project's privacy controls, and generated interpretation should remain subject to human review. The system should not convert an AI-generated observation directly into an academic or curricular decision.

Qualitative analysis therefore extends CLOIE's evidence beyond numerical summaries while introducing additional requirements for transparency and privacy. The system should make written feedback easier to inspect without presenting automated interpretation as more certain than the underlying evidence allows.

### **2.1.7 Privacy, Confidentiality, and Security in Academic Evaluation Systems**

Academic evaluation systems process information that may be sensitive even when they do not store official grades. Respondent identity, enrollment or course relationships, evaluation eligibility, academic program, submission records, and written comments can reveal information about individuals. In the Philippines, Republic Act No. 10173, or the Data Privacy Act of 2012, establishes requirements for the processing and protection of personal information in government and private-sector information systems (Republic of the Philippines, 2012).

The Act establishes general principles including transparency, legitimate purpose, and proportionality. Its implementing rules further require organizations processing personal information to protect data and use it according to lawful and defined purposes (National Privacy Commission, 2016). These requirements are directly relevant to an academic evaluation system because education-related information and respondent records can contain personal or sensitive information.

Research on learning analytics expands the issue beyond technical security. Cerratto Pargman and McGrath (2021), in their systematic review of learning-analytics ethics, identified privacy and responsible data use as recurring concerns. The significance for CLOIE is that secure authentication alone does not resolve every privacy issue. The system also needs to consider what information is collected, why it is needed, who can access it, and how much respondent detail is necessary for a particular academic task.

This distinction affects how CLOIE describes respondent anonymity. If the system retains an internal relationship between an authenticated respondent and a response to enforce eligibility or prevent duplicate submissions, the response is not absolutely anonymous at the data layer. The more accurate terms may be confidential, pseudonymized, de-identified, or aggregated depending on the final implementation and the view presented to a particular user.

Qualitative comments require particular care. Removing a respondent's name does not guarantee that a written comment cannot identify the person. A respondent may mention a particular event, course circumstance, faculty interaction, or personal experience. Access to raw qualitative feedback should therefore follow the same authorization principles as other sensitive evaluation evidence.

Authorization also needs to account for organizational scope. A Program Head should not gain access to unrelated program evidence merely because the account has the Program Head role. Faculty access should correspond to appropriate course assignments. The General Education Coordinator may require cross-program access for General Education responsibilities without receiving unrestricted control over program-specific information. This makes scope enforcement an important complement to role-based access control.

Evaluation integrity creates additional security requirements. Controlled deployments may need to restrict participation to eligible respondents, prevent duplicate finalized responses, preserve finalized evidence, and ensure that analytics are calculated from the intended response population. These controls protect the reliability of the evidence as well as respondent privacy.

Privacy and security therefore influence CLOIE's authentication, authorization, deployment, response-storage, analytics, reporting, qualitative-feedback, and external-processing requirements. The objective is not to hide all information from all users. It is to expose only the information required for an authorized academic purpose while protecting respondent data and preserving the integrity of evaluation evidence.

### 

### **2.1.8 Usability, Accessibility, and Adoption of Academic Information Systems**

System CLOIE serves users with different responsibilities and levels of interaction. Administrative and academic users may work with the system regularly, while Students, Alumni, and Industry Partners may interact with it mainly when completing an evaluation. A usable interface therefore needs to make the current task and scope understandable without requiring every user to understand the system's internal data model.

Research on analytics dashboards supports this user-centered approach. Paulsen and Lindsay (2024) found that dashboard research has increasingly considered user goals and educational purpose rather than focusing only on available data and technical capability. This is relevant to CLOIE's management dashboards because a chart is useful only when the intended user can understand what it represents and how it relates to the user's responsibility.

Accessibility provides a more concrete set of requirements. The World Wide Web Consortium's Web Content Accessibility Guidelines 2.2 provide testable criteria for making web content more accessible to users with visual, auditory, physical, cognitive, and other disabilities (World Wide Web Consortium \[W3C\], 2024). Relevant requirements include keyboard access, visible focus, sufficient contrast, accessible authentication, usable target sizes, meaningful labels, and appropriate error communication.

These requirements affect ordinary CLOIE interactions. Evaluation questions need labels that remain understandable to assistive technologies. Rating controls should not communicate meaning through color alone. Buttons and other interactive controls need adequate visibility and target size. Keyboard users should be able to navigate forms and dashboards without losing track of focus. Validation errors should explain what needs correction rather than relying solely on a visual border or icon.

Responsive design is also important because evaluation respondents may access the system through phones, tablets, or desktop computers. A management dashboard may reasonably present dense information on a larger screen, while a student evaluation should remain practical on a smaller mobile display. Responsive behavior therefore needs to follow the task rather than simply shrink a desktop layout.

Usability also affects evidence quality. Respondents who misunderstand a scale, miss a required item, or cannot determine whether a response was submitted can produce incomplete or unintended data. Academic users who misunderstand a dashboard filter or chart scope may draw conclusions from the wrong evidence. Clear status messages, loading states, empty states, confirmation feedback, and visible scope information therefore contribute to the reliability of system use.

The literature and accessibility standards support CLOIE's use of role-specific navigation, responsive evaluation workflows, accessible form controls, clear system feedback, and representative-user validation. These qualities should later be evaluated as part of the project's testing and user-validation process rather than assumed from the visual appearance of the interface.

## 

## **2.2 Review of Related Systems / Existing Solutions**

Project CLOIE operates within an established category of higher-education software. Commercial systems already support outcome assessment, curriculum mapping, course evaluation, institutional planning, analytics, and accreditation evidence. Reviewing these systems helps identify established approaches that can inform CLOIE while also showing where the project's institution-specific requirements differ.

Three systems are particularly relevant to the CLOIE design space: Watermark Planning & Self-Study, Anthology Outcomes, formerly associated with Blackboard's institutional-effectiveness products, and Explorance Blue. These systems were selected because each addresses a substantial part of CLOIE's problem rather than merely sharing superficial features such as dashboards or online forms.

### **2.2.1 Watermark Planning & Self-Study** 

Watermark Planning & Self-Study is an institutional assessment and planning platform used in higher education. Its relevant capabilities include learning-outcome management, outcome mapping, curriculum mapping, assessment measures, organizational hierarchy, historical curriculum-map snapshots, and reporting.

Watermark's outcome-mapping model allows outcomes defined at one organizational level to be connected with outcomes at other levels. For example, program outcomes can be aligned with department, college, or institutional outcomes. Course-level outcomes can also participate in these relationships. Its curriculum map separately shows where program outcomes are addressed through courses or other learning activities.

This separation between outcome mapping and curriculum mapping is useful for CLOIE. It demonstrates that relationships among outcomes and relationships between courses and outcomes answer different questions. System CLOIE similarly needs to preserve the academic relationships required to interpret CILO, PLO, and ILO evidence rather than representing every relationship as a generic link.

Watermark also allows curriculum mappings to indicate the degree to which an outcome is addressed through a course, including configurable concepts such as Introduce, Reinforce, and Master. CLOIE does not use these categories. Its CILO-to-PLO relationship follows ACD's approved Learning, Practice, and Opportunity manifestation model. The similarity lies in representing additional meaning on an outcome relationship rather than assuming that a binary mapping is always sufficient.

Another useful Watermark feature is the preservation of curriculum-map snapshots. Historical snapshots allow users to examine a map as it existed at an earlier time even after the live map changes. This demonstrates an established approach to preserving historical academic context, although CLOIE's historical evidence requirements concern evaluation cycles and outcome evidence rather than reproducing Watermark's full curriculum-management model.

Watermark is considerably broader than System CLOIE. Its product family supports institutional planning, program review, assessment planning, curriculum management, and accreditation-related work. Project CLOIE has a narrower purpose. Academic structures and outcome mappings exist primarily to provide context for ACD's evaluation responses, analytics, and reports.

The main lesson from Watermark is therefore structural. Outcome relationships, academic hierarchy, assessment evidence, and historical context become more useful when they remain explicitly connected. CLOIE adopts this principle within a smaller institution-specific evaluation system.

### **2.2.2 Anthology Outcomes** 

Anthology Outcomes is a higher-education outcome-assessment platform that supports learning outcomes, curriculum mapping, assessment evidence, reporting, organizational hierarchy, and integration with learning-management systems. Its curriculum-map reports connect outcomes with courses or institutional units and can indicate the degree of learning associated with a mapping.

Anthology Outcomes is relevant to CLOIE because it demonstrates how course-level evidence can be placed within a broader outcome hierarchy. Curriculum maps allow users to see where outcomes are addressed and assessed, while outcome-related reports make the corresponding assessment evidence available for review.

The platform also demonstrates the importance of permissions and organizational scope. Access to outcomes and imported assessment data depends on the organizational units and courses to which a user has appropriate permissions. This resembles CLOIE's need to combine a user's role with the user's academic scope. A role alone does not determine every record that the user should be able to access.

Anthology also integrates with learning-management systems such as Blackboard and Canvas to import assessment evidence. This is a major difference from System CLOIE. CLOIE is not designed to derive its primary evidence from LMS grades or learning activities. Its central evidence comes from ACD's stakeholder evaluation instruments and controlled deployments.

The distinction helps clarify CLOIE's system boundary. An outcome-assessment platform can use direct assessment evidence from LMS activities, while CLOIE currently focuses on stakeholder evaluation evidence. Student responses about CILOs should therefore not be represented as though they were equivalent to grades or direct faculty assessments.

Anthology Outcomes also demonstrates that outcome assessment can coexist with separate products for course evaluation, planning, program review, and accreditation. This supports CLOIE's decision not to absorb every quality-assurance process into a single system. CLOIE can support evaluation evidence and reporting without replacing ACD's LMS, Student Information System, curriculum-governance processes, or formal accreditation activities.

### **2.2.3 Explorance Blue** 

Explorance Blue is a feedback and course-evaluation platform designed for higher education and other organizations. Its relevant capabilities include automated evaluation workflows, configurable questionnaires, institutional hierarchy, personalized evaluation distribution, integration with institutional systems, reporting, trend analysis, and qualitative feedback processing.

Explorance Blue is particularly relevant to CLOIE because it demonstrates that an evaluation workflow involves more than publishing an online questionnaire. Evaluation dates, respondent populations, course structures, questionnaire rules, access methods, reminders, result distribution, and reporting all affect how evaluation evidence is collected and used.

Its support for institutional hierarchy and reporting also provides a useful comparison with CLOIE's role-scoped analytics. Different academic users need different views of the same evaluation environment. A Faculty Member may need results for an assigned course, while a Program Head requires broader program evidence. The College Dean and General Education Coordinator have still different oversight responsibilities.

Explorance Blue also supports quantitative and qualitative evaluation data. Structured ratings can be summarized through reports and trends, while open-ended feedback can be processed through text-analysis functions. This is similar to CLOIE's need to keep quantitative and qualitative evidence within the same evaluation environment without pretending that both forms of evidence should be processed identically.

The main difference concerns how evaluation evidence is connected to academic outcomes. Explorance Blue is primarily a configurable feedback and evaluation platform. System CLOIE is designed around ACD's own learning-outcome and stakeholder-evaluation context. Its Post-Term CILO Evaluation Tool concerns specific Course Intended Learning Outcomes, which can be mapped to Program Learning Outcomes according to the approved CLOIE mapping model. The system also supports ACD's Graduating Student Exit Survey, Alumni Evaluation Tool, and Industry Partner Internship Evaluation Tool within the same institution-specific evidence environment.

Explorance Blue therefore provides a useful reference for controlled evaluation administration, feedback collection, analytics, and qualitative processing. CLOIE applies related ideas within a narrower context in which evaluation evidence is explicitly tied to ACD's academic outcome structures, roles, and quality-assurance needs.

#### 

#### **Table 2.1** *Comparison of Related Systems*

| Criterion | Watermark Planning & Self-Study | Anthology Outcomes | Explorance Blue | System CLOIE |
| ----- | ----- | ----- | ----- | ----- |
| Primary purpose | Institutional assessment, planning, outcome management, and accreditation-supporting work | Learning-outcome assessment and evidence management | Course evaluation and feedback analytics | ACD learning-outcome evaluation, stakeholder response analytics, and reporting |
| Course and program outcomes | Supported | Supported | Not the primary focus | CILOs and PLOs supported within CLOIE's academic model |
| Institutional-level outcomes | Supported through organizational outcome hierarchy | Supported through organizational hierarchy | Not the primary focus | ILOs supported within ACD's authorized scope |
| Outcome mapping | Supports mappings across organizational levels | Supports outcome connections and curriculum maps | Limited compared with dedicated outcome-assessment platforms | Supports approved CILO-to-PLO relationships |
| Mapping degree or manifestation | Supports configurable curriculum-map indicators | Supports degree-of-learning information | Not a core capability | Uses ACD's Learning, Practice, and Opportunity manifestation model |
| Course evaluation | Available through Watermark's broader product portfolio | Separate from the core Outcomes function | Core capability | Post-Term CILO Evaluation Tool |
| Graduating-student evaluation | Possible through broader assessment or survey tools | Depends on institutional configuration and related tools | Configurable through feedback initiatives | Graduating Student Exit Survey |
| Alumni evaluation | Possible through broader institutional tools | Depends on configuration and related tools | Configurable through feedback initiatives | Alumni Evaluation Tool |
| Industry-partner evaluation | Possible through configurable institutional processes | Depends on configuration | Can support external stakeholder feedback | Industry Partner Internship Evaluation Tool |
| Controlled evaluation deployment | Available through related evaluation functions | Depends on assessment configuration | Core evaluation-management capability | Required for CLOIE stakeholder evaluations |
| Quantitative analytics | Supported | Supported | Supported | Response distributions, summaries, and approved outcome-oriented calculations |
| Qualitative feedback | Supported in relevant Watermark products | Depends on associated evaluation tools | Strong feedback and text-analysis capability | Open-ended feedback and implemented qualitative-processing views |
| Historical or trend analysis | Supported | Supported | Trend analysis supported | Historical comparison where academic context permits |
| Role and organizational scope | Supported | Supported through permissions and organizational units | Supports institutional hierarchy and role-sensitive reporting | College, program, General Education, course, and respondent scope |
| Accreditation support | Broad assessment and accreditation-supporting capabilities | Supports outcome evidence within a broader institutional-effectiveness environment | Feedback can contribute evidence but accreditation is not its primary function | Produces accreditation-supporting evidence but does not perform accreditation |
| LMS/SIS integration | Supports institutional integrations | Strong LMS integration | Supports LMS, SIS, and other institutional integrations | Limited to approved CLOIE institutional requirements |
| Main distinction from CLOIE | Broader institutional planning and assessment platform | More closely connected to direct assessment and LMS evidence | Broader configurable feedback platform | Built around ACD's specific stakeholder instruments, outcome mappings, roles, and response-to-analytics workflow |

The comparison shows that CLOIE does not introduce an entirely new class of academic software. Outcome mapping, institutional assessment, course evaluation, feedback analytics, role-sensitive access, historical reporting, and accreditation-supporting evidence already appear in mature higher-education systems.

Watermark and Anthology provide stronger references for structured learning outcomes, curriculum alignment, organizational hierarchy, and assessment evidence. Explorance provides a stronger reference for evaluation deployment, stakeholder feedback, reporting, and qualitative analysis. System CLOIE draws from the same problem space but combines only the capabilities required for ACD's defined evaluation process.

The comparison also helps establish a practical boundary for the project. Reproducing the complete functions of these commercial platforms would expand CLOIE into curriculum administration, institutional planning, LMS assessment, enterprise survey management, and accreditation management. Those functions are not required to solve the project's central problem.

## **2.3 Synthesis, Gap and Project Contribution**

The literature reviewed in this chapter establishes that learning-outcome assessment is not an isolated measurement activity. OBE requires educational outcomes to be defined, related to the academic structures through which they are developed, supported by evidence, and reviewed as part of quality-improvement processes. The assessment literature further shows that evidence becomes more useful when institutions preserve the relationships among outcomes, courses, assessment contexts, and academic periods.

Curriculum alignment addresses part of this requirement. Explicit relationships between course-level and program-level outcomes make it possible to understand how lower-level evidence relates to broader program expectations. For CLOIE, this supports the CILO-to-PLO mapping model and the associated manifestation. The mapping exists to preserve the academic meaning of evaluation evidence, not to turn CLOIE into a full curriculum-management system.

The literature on stakeholder evaluation establishes another requirement. Student, graduating-student, alumni, and industry-partner responses provide different perspectives. None should automatically be treated as a complete measure of educational quality. Their usefulness depends on the questions asked, the respondent context, and the way the resulting evidence is interpreted. CLOIE therefore needs separate instruments and controlled evaluation contexts while preserving the possibility of comparing stakeholder evidence when the comparison is academically meaningful.

Quality-assurance literature connects these processes to institutional evidence management. Outcome definitions, mappings, evaluation results, historical records, and reports can support academic review and accreditation preparation, but the information system does not make accreditation or curriculum decisions. This supports CLOIE's boundary as an evidence system. Authorized ACD personnel remain responsible for deciding what the evidence means and what action should follow.

Learning-analytics research supports the use of dashboards and quantitative summaries while warning against analytics that are disconnected from educational purpose. CLOIE's analytical model should therefore remain focused on questions its evidence can answer. Response distributions, means where appropriate, outcome-oriented summaries, stakeholder comparisons, and longitudinal views can make evaluation evidence easier to inspect. They should not be presented as proof of causation or as automatic prescriptions for academic change.

Qualitative feedback extends this evidence by allowing respondents to explain issues that rating scales may not capture. Research supports the use of text-processing and visualization methods to make larger collections of comments easier to review, but it also exposes the risk of oversimplifying respondent meaning. CLOIE should therefore treat word clouds, themes, sentiment analysis, or AI-assisted interpretation as supporting views when implemented. The original response evidence and deterministic analytics remain the basis for academic review.

Privacy and security literature places further limits on how the system handles this evidence. Respondent information should be collected for a defined purpose and exposed only to authorized users. Where an internal relationship between respondent and response remains necessary for eligibility or duplicate prevention, CLOIE should use accurate terms such as confidential or pseudonymized rather than claim absolute anonymity. Authorization also needs to consider program, course, General Education, and college scope rather than relying on role names alone.

Usability and accessibility complete the foundation because the quality of an evaluation system depends partly on whether stakeholders can use it correctly. Respondents need clear and accessible evaluation workflows. Academic users need dashboards whose filters, scope, calculations, and states are understandable. Accessibility, responsive behavior, and representative-user validation therefore support the reliability of the evaluation process rather than merely improving appearance.

Existing systems confirm that many individual capabilities required by CLOIE already have established precedents. Watermark demonstrates structured outcome and curriculum mapping within institutional assessment. Anthology Outcomes demonstrates outcome assessment, organizational permissions, and connections to course evidence. Explorance Blue demonstrates controlled course-evaluation workflows, institutional feedback analytics, and qualitative processing. These systems show that CLOIE's individual functions are not unprecedented.

The gap addressed by Project CLOIE is therefore contextual rather than universal. ACD requires an information system that applies these established ideas to its own outcome-evaluation process. The required combination includes ACD's Institutional Learning Outcomes, Program Learning Outcomes, Course Intended Learning Outcomes, approved CILO-to-PLO manifestations, course and respondent context, controlled stakeholder evaluation instruments, quantitative and qualitative response processing, role-scoped analytics, and reports that can support quality-assurance and accreditation-related review.

This context also explains the project's focus. Academic structures, assignments, rosters, and outcome mappings are necessary insofar as they give evaluation responses their academic meaning. The core flow remains the movement from stakeholder response to structured evidence, analytics, and reporting. System CLOIE is not intended to replace the institution's Learning Management System, Student Information System, grading processes, curriculum-governance authority, or accreditation process.

Taken together, the reviewed literature and systems provide the basis for CLOIE's major requirement areas: structured learning-outcome data; CILO-to-PLO mapping and manifestation; controlled Student, Alumni, and Industry Partner evaluation workflows; quantitative and qualitative response processing; role- and scope-aware analytics; historical evidence; reporting; privacy and response integrity; and usable and accessible interfaces.

Project CLOIE's contribution is the implementation and evaluation of these ideas within ACD's specific institutional setting. Whether that contribution succeeds cannot be established by the literature review alone. It must later be demonstrated through requirements traceability, implementation evidence, system testing, representative-user validation, and the project outcomes reported in Chapter 5\.

# **\==================================================**

# **CHAPTER 3**

# **PROJECT METHODOLOGY AND ENGINEERING PROCESS**

# **\==================================================**

This chapter describes how Project CLOIE was planned, refined, implemented, secured, and prepared for verification and stakeholder validation. It documents the engineering process actually reflected in the project's consultation records, requirements documents, use cases, prototypes, repository history, architectural decisions, test infrastructure, and current System CLOIE codebase. The project followed an iterative and incremental development process organized around continuously refined work items rather than fixed Scrum sprints. Requirements and technical decisions changed as the proponents received client and adviser feedback, examined institutional workflows, reviewed prototypes, implemented system capabilities, and discovered technical or scope issues during development. 

## **3.1 Development Approach and Lifecycle**

Project CLOIE used an **iterative, incremental, and Kanban-based development approach**. Development did not follow a fixed sequence in which all requirements were permanently finalized before design and implementation began. It also did not operate as Scrum, since the available project records do not establish fixed sprint durations, formal sprint planning, sprint reviews, or Scrum roles. Instead, work progressed continuously as requirements became clearer and implementation exposed additional design questions.

Kanban is appropriate for software work in which tasks move continuously through development stages and priorities may change as new information becomes available. Research on Kanban in software engineering identifies continuous delivery of work, visibility of work items, coordination, and management of changing priorities among the commonly reported reasons for its use, although the effectiveness of a particular Kanban implementation depends on its organizational context (Ahmad et al., 2018).

The early project records already showed the need for iteration. During the March 3, 2026 client consultation, the project was defined primarily as a learning-outcome feedback and tracking system. At that stage, several matters remained open, including the evaluation scale, final report format, authentication approach, stakeholder data requirements, and initial program coverage. The client clarified the essential boundary that CLOIE should collect, store, analyze, and report evaluation evidence while academic personnel retain responsibility for deciding what curriculum or instructional changes should follow.

The adviser consultation on March 7, 2026 also anticipated refinement rather than a fully fixed lifecycle. An iterative process with some sequential planning characteristics was discussed because the project had an identifiable academic purpose while many details still needed to be clarified through development and stakeholder feedback. Later consultations and implementation work changed responsibilities, academic roles, outcome ownership, course-assignment behavior, authentication, evaluation flows, analytics, and other parts of the system.

The current repository reflects this iterative process more clearly than the project's original methodology description. Its documented development flow treats GitHub issues as execution units. Larger changes are first investigated and specified, then separated into dependency-ordered vertical slices. Each slice is implemented and verified using the relevant automated tests, static checks, and production build. Architectural decisions that affect several parts of the system are recorded separately through Architectural Decision Records.

In practice, the development lifecycle followed this general flow:

1. A requirement, problem, client request, defect, or technical concern was identified.  
2. The proponents investigated the affected workflow and existing implementation.  
3. Larger or ambiguous changes were clarified through specifications, prototypes, design review, or architectural analysis.  
4. The change was divided into smaller implementation work items where appropriate.  
5. The affected frontend, service, data, authorization, and test layers were modified.  
6. The implementation was checked through applicable automated tests, linting, database checks, browser tests, builds, and manual inspection.  
7. Findings from verification, prototype review, client consultation, or adviser feedback could reopen or alter the requirement.  
8. Cross-cutting decisions and significant changes were retained in repository documentation, specifications, ADRs, issue records, or related project evidence.

This was not a fixed-length iteration. Work items varied in size and moved according to dependency, priority, risk, and project need. This distinction matters because describing the process as a series of "two-week sprints," for example, would not match the available evidence.

Prototypes were also used where interaction or information architecture needed exploration before or during implementation. The repository contains a dedicated prototypes/ area as well as design documents and interface review material. These prototypes allowed the team to examine workflows such as dashboards, analytics, responses, course rosters, and role-specific interfaces before treating an interface direction as settled.

The project's iteration was therefore driven by **requirements clarification and implementation evidence**, not simply by a desire to make frequent releases. A feature could be reconsidered when client feedback changed the underlying responsibility, when a workflow proved too broad for CLOIE's scope, or when implementation exposed a conflict in the data model. The transfer of Institutional Learning Outcome responsibilities to the General Education Coordinator and the removal of Secretary course-assignment mutation are examples of requirements that changed after the project's earlier design assumptions.

Release and milestone work followed the same principle. The project moved through capstone documentation and defense stages while the software developed incrementally. Repository builds, demo environments, deployment preparation, and testing provided technical checkpoints, but these should not be treated as evidence of final acceptance. Final milestone status, stakeholder validation, and production-readiness conclusions belong in Chapter 5 and the supporting appendices.

## **3.2 Requirements Engineering and Stakeholder Engagement**

Requirements engineering for Project CLOIE was an ongoing process of identifying institutional needs, converting them into system behavior, validating them against stakeholder expectations, and revising them when later evidence contradicted earlier assumptions. ISO/IEC/IEEE 29148:2018 treats requirements engineering as a lifecycle activity that covers the processes and information needed to establish and manage system and software requirements. This supports CLOIE's use of persistent requirement identifiers and change records rather than treating the first requirements document as permanently final. 

### **3.2.1 Stakeholders Consulted**

The principal client represented in the consultation records is Ms. Roselyn M. Biala. Client consultations were used to establish the institutional problem, expected system outputs, respondent groups, evaluation workflows, scope boundaries, academic responsibilities, and later workflow corrections.

The project adviser, Ms. Christine Marie D. Ordaneza, provided guidance concerning the capstone process, documentation, project scope, development approach, analytical possibilities, and presentation of the proposed system.

The requirements also concern several operational stakeholder groups whose workflows are represented in the system. These include the Secretary, College Dean, General Education Coordinator, Program Heads, Faculty Members, Students, Alumni, and Industry Partners. Their presence as system users does not mean that every member of every group participated directly in early requirements consultations. Chapter 5 must report only the groups that actually participate in formal validation.

The current use-case documentation represents Program Head, Faculty, Student, Alumni, Industry Partner, Dean, administrative, authentication, and evaluation interactions through stable UC identifiers. For example, Program Head use cases include outcome management, evaluation tools, analytics, reports, and controlled deployments, while Faculty use cases cover CILO management, assigned courses, course-bound evaluations, and analytics. Respondent use cases cover viewing evaluations, answering questions, saving drafts, submission, and history.

Some role definitions changed after earlier use-case documentation was produced. The current implementation includes the General Education Coordinator and revised Secretary responsibilities. Those differences should be reconciled when Appendix C and the final Chapter 4 interaction model are prepared rather than silently relying on outdated use cases.

### **3.2.2 Requirements-Elicitation Methods**

The proponents used several forms of project evidence to identify and refine CLOIE's requirements.

**Client consultation.** Direct discussions with the client established the original problem and system boundary. The March 3 consultation identified CLOIE as a response, tracking, basic statistical analysis, and reporting system for learning outcomes. It also identified Students, Alumni, Industry Partners, Faculty Members, Program Heads, and management-level users as relevant participants.

**Adviser consultation.** Adviser meetings were used to review the proposed system, documentation direction, development model, reporting expectations, and possible analytical features. Advice concerning iterative development was treated as methodological guidance, while actual system behavior continued to depend on client and project evidence.

**Institutional-document analysis.** Existing academic evaluation tools, program and course information, curriculum records, outcome definitions, prospectus material, and related documents were examined to understand the information CLOIE needed to represent. These documents provided domain evidence rather than software requirements by themselves. The proponents still had to determine which institutional information was necessary for an evaluation workflow.

**Evaluation-instrument analysis.** The project examined the evaluation tools that CLOIE needed to administer, including the Post-Term CILO Evaluation Tool, Graduating Student Exit Survey, Alumni Evaluation Tool, and Industry Partner Internship Evaluation Tool. Instrument structure influenced question types, respondent eligibility, deployment behavior, quantitative processing, qualitative responses, and report requirements.

**Prototype review.** Interface prototypes and design explorations were used to clarify workflows that were difficult to settle through written requirements alone. Dashboard, analytics, response inspection, course-roster, and other interface work could therefore be reviewed before or during implementation.

**Use-case and workflow analysis.** User interactions were formalized into UC records so that requirements could be examined from the point of view of a specific actor and task. These use cases are part of the detailed requirements and interaction specification rather than evidence that a workflow passed testing.

**Implementation feedback.** Some requirements were refined after the team encountered contradictions, missing domain rules, authorization questions, or unnecessary complexity during implementation. Repository specifications and ADRs capture several of these later changes.

**Testing and defect evidence.** Automated tests, browser journeys, manual findings, and later stakeholder-validation records can reveal that an implemented behavior does not satisfy its requirement. Such findings are part of requirements refinement when they expose an incorrect assumption rather than only a coding defect.

External literature was not used as evidence that these activities occurred. Literature and standards support why requirements elicitation, validation, traceability, and change management are useful. The evidence that CLOIE actually performed a particular activity comes from its consultations, documents, prototypes, repository artifacts, and testing records.

### **3.2.3 Requirements Analysis and Prioritization**

Raw stakeholder requests were not automatically treated as final requirements. They first had to be interpreted against Project CLOIE's purpose and system boundary.

A request was considered more central when it directly supported the path from academic context and stakeholder evaluation to response evidence, analytics, and reporting. Requirements related to learning outcomes, evaluation instruments, controlled deployments, responses, role-appropriate access, analytics, and reports therefore received greater architectural importance than features outside that flow.

This distinction became important as the project grew. Academic structures such as courses, assignments, rosters, periods, ILOs, PLOs, and CILOs are necessary because evaluation evidence needs context. They are not justification for converting CLOIE into a general curriculum-management, LMS, SIS, or academic-decision platform.

Requirements were also constrained by authorization and organizational ownership. A workflow could not be specified merely as "manage outcomes" or "manage courses." The requirement needed to identify which actor owned the operation and at what scope. Later changes concerning the General Education Coordinator and Secretary demonstrate why role ownership had to remain revisable.

The repository's current issue-based implementation process further supports this analysis. Large requirements are broken into vertical work items with dependency relationships rather than implemented as one broad change. This allows database, service, interface, authorization, and testing effects to be addressed together where practical.

Priority was influenced by stakeholder need, dependency, architectural risk, system integrity, security, and readiness of the underlying domain model. The final priority classifications used in Appendix F should be taken from the approved requirements records rather than reconstructed from repository activity after the fact.

### **3.2.4 Requirements Validation and Change Management**

Requirements remained subject to confirmation and revision throughout development. A requirement could be confirmed through client discussion, prototype review, implementation inspection, testable acceptance criteria, or later user validation. A requirement could also be changed when newer institutional information superseded an earlier assumption.

The project repository contains architectural and requirements records that document substantial changes. Examples include revisions to account behavior, course assignments, outcome ownership, selected Program Head context, academic-calendar responsibility, Google-authoritative names, roster identity handling, CILO-to-PLO manifestations, General Education responsibilities, and self-hosted backend architecture. The current repository lists these decisions as ADRs rather than hiding them inside commit history.

This approach prevents an old requirement from silently remaining "correct" after the institution changes its direction. In the RTM, affected requirements should preserve their stable IDs where appropriate and record statuses such as Changed/Superseded, Deferred, Rejected/Removed, Implemented, or Verified/Passed according to the official Appendix F rules. An implementation should not be marked Verified/Passed merely because code exists.

Scope-control decisions followed the same rule. Proposed functionality that did not become an approved and implemented requirement should remain identified as proposed, deferred, or outside scope. This is particularly important for analytical, AI, or additional evaluation features whose desirability may have been discussed before their final status was established.

### **3.2.5 Requirements Traceability**

Traceability connects the reason a capability exists to the evidence that it was actually implemented and verified. ISO/IEC/IEEE 29148 supports requirements management across the lifecycle, while the official CLOIE Appendix F format requires explicit links among stakeholder needs, requirements, acceptance criteria, design/components, implementation evidence, testing, validation, status, and change records.

Project CLOIE uses the following identifier families:

* OBJ for project objectives;  
* FR for functional requirements;  
* NFR for quality or non-functional requirements;  
* SEC for security and privacy requirements;  
* DR for data and integrity requirements;  
* INT for integration and infrastructure requirements;  
* UC for use cases or user interactions;  
* TC for test cases or test scenarios.

The intended traceability chain is:

**Objective → Requirement → Design/Component → Use Case → Implementation Evidence → Test Case → Validation Evidence**

The chain does not require every artifact to have a one-to-one relationship. One objective may require several FR, SEC, or DR items. One requirement may affect several components or use cases. A single test case may verify more than one related requirement when the relationship remains explicit.

The RTM in Appendix F is the controlling traceability record. It should identify the exact requirement, stakeholder or objective need, acceptance criteria, corresponding design or component, implementation evidence, test or validation reference, latest result, and any relevant change record. The appendix also requires an objective-coverage check and requirement-change log.

Use-case IDs provide behavioral context within this chain but do not replace requirements. Likewise, the existence of an implementation file does not prove that the requirement is correct, and the existence of a test does not prove that the test passed. Those distinctions are retained so that Chapter 5 can report actual fulfillment without rewriting the history of the requirement.

## **3.3 Development Workflow, Collaboration and Configuration Management**

### **3.3.1 Source Control and Repository Management**

System CLOIE is maintained using **Git** with **GitHub** as the project repository and collaboration platform. The repository contains application source code, database schema and migrations, tests, specifications, ADRs, design documentation, deployment documentation, scripts, and supporting engineering records.

The current repository documents Conventional Commit categories including feat, fix, refactor, perf, style, test, docs, build, ops, and chore. It also contains a substantial revision history rather than a single final code upload.

The available evidence does not establish that the team consistently used a particular Git branching model such as Git Flow or trunk-based development, nor does it establish that every change required a pull request. This chapter therefore does not claim either practice. If branch-protection or pull-request policies are later presented as part of the final process, they should be supported by GitHub configuration or repository evidence in Appendix D.

Repository history, selected commits, issues, pull requests where applicable, and contribution records should be retained in Appendix D as evidence of development activity rather than reproduced page by page in the manuscript.

### **3.3.2 Issue, Specification, and Change Tracking**

The current repository describes change management as conversation-driven, with GitHub issues acting as implementation units. Larger changes may begin as investigation or design work, become a specification, and then be divided into smaller dependency-ordered issues. Cross-cutting decisions are recorded through ADRs.

This workflow separates different forms of project knowledge. An issue identifies work that needs to be completed. A specification records expected behavior and constraints for a larger change. An ADR records an architectural decision whose consequences extend beyond a single task. Domain context documents retain terminology and invariants that future changes should respect.

The repository currently maintains a context map, domain-specific CONTEXT.md documentation, design records, ADRs, issue-related materials, runbooks, and testing documentation. These records help prevent important rules from existing only in developer memory.

Historical specification systems used earlier in the project should be described according to their actual period of use. If a specification mechanism was later retired or migrated, the final documentation should retain the migration evidence rather than presenting the retired process as the current workflow.

### 

### **3.3.3 Code Review and Quality Gates**

Implementation verification occurs at more than one level. The repository documents a feature workflow in which implementation is followed by applicable tests, linting, and a production build. GitHub Actions provides automated checks against repository changes.

The current ci.yml workflow runs quality checks, database integration testing, and browser end-to-end testing on pushes to main and pull requests. The quality job includes formatting checks, ESLint, Vitest, and a production build. Database integration uses a disposable PostgreSQL container, while browser testing runs a production build against an isolated test environment. Failure artifacts can include Playwright reports and traces.

A separate code-intelligence workflow also exists in the current repository. These automated checks are quality gates, not proof of final quality. Chapter 5 should report the actual final CI and test evidence selected for submission.

The repository evidence does not by itself establish a mandatory human code-review rule for every commit. Any claim about formal peer review, required approval count, or branch protection should therefore be verified before inclusion in the final manuscript.

### **3.3.4 Environment and Configuration Management**

CLOIE separates development, automated testing, demo, and deployed runtime concerns rather than relying on one shared environment.

Local development uses Node.js, pnpm, a local Supabase CLI Docker stack, and a local environment configuration. The repository's setup procedure resets the local database from committed migrations and optionally loads demo seed data.

Authentication is deliberately separated by environment. Primary production uses Supabase Auth with Google OAuth and approved ACD domains. Local development has a development-only authentication mechanism for test users. A separate dedicated-demo authentication mechanism uses an isolated resettable database and is not intended to substitute for production OAuth verification.

Continuous integration uses disposable database infrastructure rather than writing test data to a shared institutional database. Playwright uses a separate CI test-session mechanism when running against the production build.

Environment variables are separated into browser-safe public values and server-only configuration. The repository provides .env.example as the configuration reference while actual secrets remain outside version-controlled source files.

### **3.3.5 Dependency Management**

The current project uses **pnpm 10** as its package manager and commits a pnpm-lock.yaml file, allowing dependency resolution to remain reproducible across developer and CI environments. The codebase specifies Node.js 22 through its repository configuration.

The current application stack includes Next.js 16 with TypeScript 5 for the web application; Tailwind CSS and shadcn/ui with Base UI primitives for interface construction; Zod and React Hook Form for form handling; Recharts for data visualizations; PostgreSQL through self-hosted Supabase for persistence; Prisma 6 for application data access and schema modeling; Supabase Auth with Google OAuth for authentication; and Vitest, Testing Library, and Playwright for automated testing. The repository also records bounded qualitative and AI-related dependencies where those features are enabled.

Dependencies should not be documented simply as a list of software names. Their exact versions, licenses, operational requirements, and third-party processing implications should be retained in the dependency and license inventory required by Appendix E.

### **3.3.6 Team Responsibilities and Contribution Evidence**

Project CLOIE was developed by the two proponents, Abbegail D. Abebon and Andy Zane B. Egut. Project records indicate shared involvement in consultations, requirements work, documentation, testing, revisions, and project presentation, with technical-development and research/documentation work distributed between the proponents.

The final manuscript should not rely only on an early proposed division of labor to establish contribution. Actual contribution evidence should come from repository history, authored project documents, issue participation, implementation records, testing artifacts, consultation participation, and other evidence retained under Appendix D-9.

The final individual contribution statement should therefore be completed after that evidence is consolidated. This avoids assigning credit from an old plan when the actual workload may have changed during the project.

## **3.4 Secure and Responsible Development**

Security and privacy were treated as engineering concerns that affect authentication, authorization, responses, data integrity, deployment, testing, and analytics. NIST's Secure Software Development Framework recommends integrating security practices into the development lifecycle rather than treating security as a final activity performed after implementation (Souppaya et al., 2022).

CLOIE does not claim that these measures make the application perfectly secure. Chapter 3 documents the controls and development approach. Security verification results belong in Chapter 5\.

### **3.4.1 Authentication and Account Security**

The current primary authentication design uses **Supabase Auth with Google OAuth**. Production authentication is restricted to the institution's approved Google domains, currently documented as @acd.edu.ph and @acdeducation.com. The restriction is enforced in the authentication callback rather than relying only on the user interface.

Authentication identity and application-domain identity have also been treated as separate concerns in the project's architecture. This supports account lifecycle and role-management rules without assuming that possession of a Google account alone determines a user's full application authorization.

Development and demo authentication mechanisms are intentionally separated from production. Development authentication is restricted to development mode, while the dedicated demo uses a separate signed session and isolated data environment. The repository explicitly states that demo authentication does not replace OAuth evidence.

### 

### **3.4.2 Authorization and Scope Enforcement**

CLOIE requires authorization beyond authentication. A successfully authenticated user still needs permission to perform an operation and access the requested academic scope.

OWASP recommends least privilege, denial by default, and permission validation on each request rather than assuming that a role name alone guarantees access. It also notes that authorization often requires contextual relationships in addition to basic role-based access.

System CLOIE applies this principle through role and scope rules. Program Head permissions depend on program context. Faculty permissions depend on appropriate course assignments. General Education operations have a distinct organizational scope. The Dean has broader oversight, while respondent users are limited to workflows appropriate to their evaluation participation.

This approach is more accurate than describing CLOIE as using only conventional RBAC. Roles form one authorization dimension, but program, course, General Education, assignment, and respondent relationships determine whether a specific operation is authorized.

Database-level security is also tested in parts of the current codebase. The repository contains invariant suites for row-level-security behavior and table-access dispositions in addition to application-level authorization tests.

### **3.4.3 Evaluation Confidentiality and Data Protection**

CLOIE evaluation responses should not be described as absolutely anonymous unless the final data model truly prevents the system from relating a response to a respondent. The current design needs identity information for purposes such as eligibility, controlled participation, response lifecycle enforcement, or duplicate prevention.

The more accurate description is that evaluation evidence is handled through **confidential, pseudonymized, de-identified, or aggregated views according to the final implementation and user context**. Faculty-facing or management-facing analytics do not require unrestricted disclosure of respondent identity merely because the system internally retains integrity information.

The project also moved away from unnecessary student-identifier storage in parts of its roster design and records a specific architectural decision concerning student-ID removal and name-based roster resolution. This reflects a broader data-minimization principle, although final compliance with institutional privacy policy must still be reviewed.

Qualitative responses receive particular attention because free-text comments can contain identifying information even when explicit names are hidden. Raw comment access and any text-processing pipeline should therefore follow the same authorization and minimization rules as other sensitive evaluation data.

### **3.4.4 Input Validation and Data Integrity**

CLOIE uses validation at multiple layers. Forms use schema-based validation through Zod, while service and database rules enforce business invariants that cannot safely depend on the browser alone. The repository also contains database tests for academic-period state, course-assignment membership, curriculum relationships, evaluation publication, response lifecycle, user assignment, and access-policy behavior.

OWASP recommends validating untrusted input as early as practical and distinguishing syntactic validity from semantic validity. A value may have the correct data type while still being invalid for the business process.

This distinction applies directly to CLOIE. A valid database identifier does not prove that the current user owns the corresponding program. A correctly formatted evaluation response does not prove that the deployment is open or that the respondent is eligible. A valid rating value does not prove that it belongs to the scale used by a particular question.

Database constraints supplement application validation for rules that must remain true regardless of interface behavior. The current repository documents PostgreSQL constraints and indexes that Prisma cannot express fully, with corresponding migration and database-invariant tests.

Finalized-response and one-response controls should be verified against the final implementation and documented through DR, SEC, and test-case evidence before the manuscript claims that these controls passed.

### **3.4.5 Secrets, Dependencies, and Infrastructure Security**

Credentials, API keys, OAuth secrets, signing secrets, and database connection information are handled through environment configuration rather than committed application code. The repository includes an .env.example reference while server-only variables remain outside browser bundles.

OWASP recommends avoiding hard-coded secrets and limiting access to credentials according to purpose. The CLOIE deployment model follows this separation by distinguishing browser-safe build values from server-only runtime configuration. It also avoids configuring a privileged Supabase key inside the application container according to the current deployment documentation.

The application container runs as a non-root user and exposes a health-check endpoint. Database migrations are performed as an explicit operator/deployment action rather than automatically inside application startup, which reduces the risk of multiple application replicas racing to perform schema changes.

Dependency security still requires maintenance. The existence of a lockfile or CI pipeline does not prove that all dependencies are free from vulnerabilities. Dependency versions, known risks, update procedures, and licenses should therefore remain part of operational maintenance and the Appendix E dependency inventory.

### 

### **3.4.6 Backup, Recovery, and Incident Considerations**

The current architecture separates the application container from PostgreSQL, Supabase services, and related infrastructure. Database migrations are committed and can be replayed against controlled targets. Local and demo databases can also be reset from migration history and seed data.

These capabilities assist recovery but do not by themselves constitute a complete institutional backup policy. A valid backup also requires retained data, secure storage, restoration procedures, responsible operators, and evidence that restoration works.

Backup and recovery preparation should therefore be documented in Appendix E, including the database backup procedure, storage backup where applicable, configuration backup, restore verification, and credential-handling procedure. Final operational readiness and any actual backup/restore evidence should be reported in Chapter 5\.

Incident considerations should likewise identify who will operate System CLOIE after turnover and how security or availability incidents will be handled. The final institutional responsibility, escalation path, and ICTC involvement require confirmation during turnover.

### **3.4.7 Responsible Analytics and AI-Assisted Interpretation**

System CLOIE's deterministic analytics remain separate from optional AI-assisted interpretation. The current repository identifies an OpenAI-compatible, server-only AI capability and records a specific architectural decision for a bounded AI interpretation boundary.

The intended boundary is that AI does not become the authoritative source for response counts, rating distributions, means, completion rates, or other deterministic evidence. These values are calculated by the application. AI-assisted interpretation, where enabled, may summarize or discuss already prepared evidence but should not silently alter the underlying calculation.

Current project design documentation further constrains AI input to aggregated evidence rather than respondent-identifying information or unrestricted raw comments. The final Chapter 4 and Chapter 5 descriptions should verify the exact production implementation of this boundary, including the configured provider, model, enabled status, information sent to the service, de-identification process, output limitations, and human-review requirement.

AI output should not automatically generate curriculum decisions, outcome classifications, or institutional actions. An authorized academic user remains responsible for reviewing any generated interpretation. If the capability is disabled or remains experimental at final submission, the manuscript should state that directly rather than treating the presence of AI-related code as production use.

## **3.5 Verification, Validation and Testing Strategy**

Testing for Project CLOIE is organized as a layered verification and validation process. Chapter 3 defines how the project is tested. It does **not** claim that those tests passed. Final counts, failures, defects, usability findings, stakeholder acceptance, and retest results belong in Chapter 5 and Appendix G.

ISO/IEC/IEEE 29119-2:2021 defines software testing processes that can be applied across different software-development lifecycle models, supporting the project's use of several test levels rather than relying on one form of testing alone.

### **3.5.1 Testing Levels**

The current CLOIE repository supports several complementary testing levels.

**Unit and component testing.** Vitest and Testing Library are used for application logic, components, services, helpers, validation behavior, and related isolated or semi-isolated units.

**Integration testing.** Integration tests verify behavior across modules or infrastructure boundaries where isolated unit tests are insufficient.

**Database and invariant testing.** The repository currently contains gated database suites that test PostgreSQL constraints, RLS behavior, academic state, course-assignment membership, evaluation publication, response lifecycle, and other database invariants. They are deliberately separated from the ordinary unit-test command to prevent unintended writes to shared databases.

**Browser end-to-end testing.** Playwright exercises complete browser journeys using seeded fixtures. The repository currently defines desktop and mobile projects and contains workflows covering authentication boundaries, cross-role privacy, denials, course rosters, publication, respondent lifecycles, General Education scope, accessibility, empty states, UI quality, and other interactions.

**Accessibility verification.** Browser tests include accessibility-oriented scenarios, while final usability and accessibility evidence should combine automated checks with manual or representative-user review where appropriate.

**Security and authorization verification.** Negative tests are needed in addition to normal successful workflows. These include attempts to access the wrong program, course, role, deployment, or protected record. Existing browser and database tests provide mechanisms for such verification, but final results must be reported later.

**Manual system verification.** Human inspection remains useful for interaction behavior, visual quality, workflows, error messages, unexpected combinations of state, and other concerns that automated tests may not cover adequately.

**Beta, pilot, UAT, or stakeholder validation.** Representative users should perform the tasks relevant to their roles so the team can determine whether System CLOIE supports the agreed workflow. The official Appendix G permits Alpha, Beta, Pilot/Field, Usability, UAT, and other appropriate validation methods.

**Performance and compatibility testing.** These should be performed only to the extent that they address a real requirement or risk. The current repository has production-browser evidence procedures and supports desktop and mobile browser execution, but Chapter 5 should include performance or compatibility results only if credible tests are actually conducted.

### **3.5.2 Test Environments and Test Data**

Test data is separated from institutional production data.

Unit tests use fixtures, mocks, or isolated application data as appropriate. Database integration tests are designed to run against disposable PostgreSQL infrastructure. The current CI process provisions a disposable PostgreSQL container, applies migrations, loads the required fixture data, runs the test suite, and discards the environment.

Playwright browser journeys use seeded test fixtures rather than live student or stakeholder records. The browser setup validates the seed against a pinned contract before executing journeys so that accidental fixture drift is detected before the workflow produces misleading evidence.

The dedicated demo environment is also separated from the primary production environment and uses an isolated resettable database. Demo data exists for demonstration and verification purposes and must not be presented as real institutional evaluation results.

The final user-validation environment should be recorded in Appendix G, including the system/build version, testing period, validation type, location or mode, participant group, and tasks performed.

### 

### **3.5.3 Test Responsibilities**

The proponents are responsible for preparing and executing the project's development-level verification, maintaining automated tests, reviewing failures, correcting defects, and retaining supporting evidence.

Stakeholder validation has a different purpose. Representative users or institutional stakeholders evaluate whether the system supports their expected tasks and requirements. They are not expected to inspect source code or prove database invariants.

The client, adviser, ICTC personnel, or other institutional representatives may participate in review or acceptance where required by the capstone process, but the final manuscript should identify only individuals and stakeholder groups that actually participated.

### 

### **3.5.4 Entry, Exit and Acceptance Criteria**

Testing should begin from a defined build or revision whose dependencies and test environment can be reproduced. For automated workflows, migrations and fixture setup must complete before tests that depend on them are executed. Browser journeys should start only after the fixture contract and application startup checks succeed.

Acceptance criteria should come from the requirement being tested rather than from whether a test happens to execute without an exception. Important FR, NFR, SEC, DR, and INT requirements should have observable acceptance criteria in Chapter 4 and Appendix F.

The repository's Playwright policy provides an example of evidence discipline. Retries are disabled, and a failed run followed by a successful retry should be treated as flaky evidence rather than automatically converted into a clean pass.

For stakeholder validation, Appendix G distinguishes **Accepted**, **Needs Revision**, and **Not Accepted** rather than reducing every observation to a numerical satisfaction score.

Final exit criteria should include resolution or documented acceptance of critical defects, completion of required verification for critical requirements, appropriate retesting, and completion of the user/client validation required for the final defense. Whether those criteria were achieved will be determined from Chapter 5 evidence.

### **3.5.5 Defect Handling, Revision and Retesting**

A defect or validation concern follows the sequence:

**finding → issue or record → correction → retest → closure or further revision**

A finding may originate from an automated test, CI failure, manual review, client feedback, usability observation, or stakeholder validation. The proponents determine whether the finding represents a coding defect, incorrect requirement, usability problem, infrastructure issue, or changed stakeholder expectation.

After correction, the affected scenario should be retested. Related regression tests should also be run when the change could affect other workflows.

Appendix G-3 is the formal capstone record for significant defects, stakeholder feedback, revisions, and retest outcomes. Its purpose is to preserve the link between a problem, the revision performed, and the evidence that the revised behavior was checked again.

### **3.5.6 Evidence Retention**

Automated and manual evidence should be retained according to the type of verification performed. Relevant evidence may include CI runs, test reports, Playwright traces, screenshots, browser artifacts, issue references, commits, build records, database-test output, manually completed system-test records, and signed stakeholder-validation forms.

The current CI configuration uploads Playwright reports and traces on relevant failures, while the repository contains dedicated production-browser evidence procedures.

The institutional testing records are organized through Appendix G:

* G-1 records system tests and expected versus actual behavior;  
* G-2 records user or stakeholder validation;  
* G-3 records defects, revisions, and retesting;  
* G-4 records the user/client validation summary and acceptance.

These forms are designed to show evidence of actual testing and improvement. Blank forms do not constitute proof that validation occurred.

### **3.6 Project Management, Risks and Milestones**

Project management was integrated with the iterative development workflow. Detailed backlog history, issue records, repository activity, risk registers, and contribution evidence should remain in Appendix D rather than being reproduced in full in this chapter. The CLOIE manuscript format specifically reserves Appendix D for milestone history, selected Kanban or backlog evidence, risks, requirement changes, GitHub issues, pull requests, build evidence, CI evidence, and team contributions. 

### **3.6.1 Major Project Milestones**

The milestone table below records the major project stages supported by the available project history. Exact closure dates and final statuses should be reconciled with Appendix D before submission. 

#### **Table 3.1** *Project Milestones* 

| Milestone | Planned Period | Actual / Current Status | Evidence |
| ----- | ----- | ----- | ----- |
| Initial problem identification and client consultation | Capstone planning stage | Consultation completed; exact milestone closure record to verify | Client consultation records |
| Title proposal and early requirements definition | Capstone 1 | Conducted; final administrative status to verify against Appendix A/D | Adviser/client consultations, proposal records |
| Initial prototype and system design | Development stage | Multiple prototypes and design revisions are evidenced; formal milestone status to verify | Prototype files, design documents |
| Core application and data-model implementation | Development stage | Substantial implementation exists in repository; completion against final RTM not yet claimed here | Git history, source code, migrations |
| Stakeholder and role workflow refinement | Iterative development stage | Revisions evidenced throughout repository; final requirement status to verify | Specifications, ADRs, issues |
| Evaluation, response, analytics, and reporting implementation | Development stage | Implemented areas exist; final fulfillment status belongs to Chapter 5 | Source code, tests, RTM |
| Automated verification and CI strengthening | Development and verification stage | Test and CI infrastructure exists; final pass results not reported in this chapter | GitHub Actions, Vitest, Playwright, database tests |
| User / stakeholder validation | Pre-final/final validation stage | **To be verified from completed Appendix G evidence** | Appendix G |
| Deployment and operational preparation | Pre-final/final stage | Deployment architecture and procedures exist; final operational status to verify | Deployment/runbook evidence |
| Institutional turnover / final acceptance | Final stage | **To be verified** | Appendix A, E, G and Chapter 5 evidence |

### **3.6.2 Major Project Risks**

The following risks arise directly from the project's documented engineering and institutional context. Final likelihood, owner, and closure status should be confirmed in the formal risk register rather than inferred solely for manuscript completion.

#### **Table 3.2** *Project Risk Summary*

| Risk | Likelihood | Impact | Mitigation | Owner | Status |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Requirements or stakeholder responsibilities change after implementation begins | Verify in risk register | High | Maintain traceability, specifications, ADRs, and change records; revise affected tests and workflows | Proponents / Client as applicable | Verify |
| Scope expands from evaluation evidence into unrelated curriculum, LMS, SIS, or decision-making functions | Verify | High | Evaluate proposed work against project objectives and boundaries before implementation | Proponents / Client | Verify |
| Incorrect role or organizational-scope enforcement exposes unauthorized academic data | Verify | High | Server-side authorization, scoped services, negative tests, database policies, review of role changes | Proponents | Verify |
| Confidential respondent information or qualitative feedback is exposed unnecessarily | Verify | High | Minimize data, restrict raw evidence, aggregate where appropriate, review external-processing boundaries | Proponents / Institutional data controller | Verify |
| Database change or migration affects integrity of academic/evaluation records | Verify | High | Committed migrations, local replay, database invariant tests, dry-run before remote migration, backup procedure | Technical proponent / Maintainer | Verify |
| Google OAuth or self-hosted backend configuration prevents normal access | Verify | High | Separate environment configuration, health checks, deployment runbooks, pre-production verification | Technical proponent / Infrastructure operator | Verify |
| Test/demo data is confused with real evaluation evidence | Verify | Moderate to High | Isolate test and demo environments and label demo data clearly | Proponents | Verify |
| Stakeholder validation cannot cover all important roles before final submission | Verify | High | Prioritize critical workflows and representative users; retain incomplete coverage honestly | Proponents / Client | Verify |
| AI-assisted interpretation exposes sensitive data or is treated as authoritative | Verify | High if feature enabled | Server-only bounded processing, aggregate inputs, human review, optional enablement, deterministic analytics as evidence source | Proponents | Verify |
| Project knowledge is difficult to maintain after turnover | Verify | Moderate to High | ADRs, context documentation, runbooks, dependency inventory, backup/deployment documentation, turnover checklist | Proponents / Future maintainer | Verify |

## **3.7 Feasibility and Sustainability**

### **3.7.1 Technical Feasibility**

The implemented technology base demonstrates that System CLOIE is technically feasible as a web application. The current repository contains a functioning Next.js and TypeScript application, PostgreSQL/Supabase persistence, Prisma data access, Google OAuth integration, role-specific interfaces, migrations, automated tests, Docker deployment support, and CI workflows.

The architecture uses widely maintained technologies rather than custom infrastructure for every problem. PostgreSQL supplies relational constraints suited to the structured academic and evaluation data. Next.js provides the server and client application framework. Supabase supplies the authentication and PostgreSQL-related infrastructure, while Prisma provides application-level data modeling and database access.

Technical feasibility does not mean that every operational scenario has already been proven. Production traffic, backup restoration, institutional support, authentication configuration, and final deployment must still be verified at the scale and environment ACD intends to use.

### **3.7.2 Operational Feasibility**

CLOIE was designed around roles and workflows identified in the institution rather than around a generic public-survey model. Faculty Members, Program Heads, the General Education Coordinator, the Dean, Secretary, Students, Alumni, and Industry Partners interact with different parts of the system according to their responsibilities.

The system is also bounded so that it does not require ACD to replace its LMS, SIS, grading process, or academic decision authority. This makes operational adoption more realistic because CLOIE can operate as an evaluation and evidence system rather than requiring a wholesale replacement of existing academic systems.

Operational feasibility still depends on the availability of accurate academic data, clear responsibility for maintaining records, stakeholder participation in evaluations, institutional Google accounts where applicable, user training, and assignment of an operational maintainer. Representative-user validation is required before the project can claim that these workflows are acceptable in practice.

### **3.7.3 Schedule Feasibility**

Project CLOIE is constrained by the capstone academic schedule. The iterative work model helped the proponents continue implementing useful vertical slices while requirements were still being clarified, but it also created a risk that late requirement changes could displace testing, documentation, or user validation.

Schedule feasibility should therefore be judged against the actual milestone and validation evidence rather than against the original proposed timeline alone. Any feature that cannot be implemented and credibly verified before the final evaluation should remain deferred or identified as incomplete rather than being included merely to make the feature list appear larger.

The final schedule assessment will be completed in Chapter 5 using the actual milestone history and remaining work.

### **3.7.4 Organizational and Institutional Feasibility**

System CLOIE depends on institutional ownership of the academic processes it represents. Program Heads, Faculty Members, the General Education Coordinator, the Dean, Secretary, and respondent groups must have responsibilities that match ACD's actual organizational structure.

This became particularly important when earlier assumptions about Secretary and General Education responsibilities changed. The project therefore treats stakeholder ownership as a requirement that can change rather than as a permanent software assumption.

Institutional feasibility also depends on approval for use of evaluation data, authentication configuration, privacy responsibilities, infrastructure, production operation, and eventual ownership by an appropriate ACD unit such as ICTC or another designated maintainer. Final turnover responsibility remains subject to confirmation and should be recorded in Chapter 5 and Appendix E.

### 

### **3.7.5 Economic Considerations**

No evidence reviewed for this revision establishes that a formal cost-benefit calculation was a decisive factor in selecting the CLOIE solution. The 2026 guide explicitly states that economic analysis should be included only when material to the project rather than performed as a ritual calculation.

System CLOIE does have operational dependencies that may carry costs, including hosting infrastructure, domain and network services, storage, backup resources, external APIs if enabled, and maintenance effort. The exact costs depend on the final institutional hosting and service configuration.

The manuscript should therefore report verified actual or expected operational costs when those figures are available. It should not invent development labor values, hypothetical commercial-license savings, or return-on-investment percentages simply to populate an economic-feasibility subsection.

### **3.7.6 Sustainability and Maintainability**

Sustainability depends on whether the system can be understood, operated, changed, and recovered after the proponents complete the capstone.

The current repository already contains several maintainability mechanisms: domain context documentation, ADRs, a context map, committed database migrations, automated tests, CI workflows, code-formatting conventions, deployment documentation, environment templates, and operational runbooks.

The project also packages the web application as a portable Docker image while keeping database and authentication infrastructure separate. The database migration process explicitly distinguishes local and remote targets and includes dry-run support before remote changes.

Maintainability still requires institutional handover. Appendix E should contain the final deployment guide, data dictionary, database migration procedure, backup and restore procedure, administrator documentation, maintenance and incident guide, dependency and license inventory, turnover checklist, and credential-transfer procedure. Actual credentials must never be printed in the manuscript.

Long-term sustainability also depends on maintaining third-party dependencies and external services. Node.js, Next.js, Supabase, PostgreSQL, Prisma, OAuth configuration, and other dependencies will change over time. Future maintainers therefore need both technical documentation and a process for reviewing dependency updates without bypassing the project's test and migration controls.

Project CLOIE should be considered operationally sustainable only after the institution has a confirmed environment, backup procedure, maintenance owner, documentation set, credentials-transfer process, and verified deployment. Those conclusions belong to the final operational-readiness evidence in Chapter 5 rather than being assumed from the existence of source code.

# **\==================================================**

# **CHAPTER 4**

# **REQUIREMENTS AND SYSTEM DESIGN**

# **\==================================================**

This chapter specifies the functional, quality, security, data, and infrastructure requirements of System CLOIE and describes the design used to realize them. It translates the project objectives and institutional requirements established in the preceding chapters into system behavior that can be implemented, traced, and tested.

System CLOIE is an evaluation, evidence-management, analytics, and reporting system for Assumption College of Davao. Its academic structures, course assignments, learning outcomes, evaluation instruments, and user scopes provide the context needed to collect and interpret evaluation evidence. The system does not replace the institution's Learning Management System, Student Information System, grading processes, instructional delivery, academic decision-making authority, or accreditation process.

## **4.1 System Context and Stakeholders**

System CLOIE operates within the academic environment of Assumption College of Davao. Its principal users are the Secretary, College Dean, General Education Coordinator, Program Heads, Faculty Members, Students, Alumni, and Industry Partners. Google authentication, the self-hosted Supabase services, PostgreSQL database, and optional external processing services lie across defined system trust boundaries rather than being treated as ordinary users.

A distinction is maintained between a user's **role** and the user's **scope**. A role identifies the type of authority a user has. Scope identifies the academic records or organizational context over which that authority applies. Two users may therefore perform similar operations while being authorized over different data.

A Program Head, for example, manages Program Learning Outcomes and program-specific course assignments only within the Program Head's authorized program context. A General Education Coordinator operates across the college for General Education responsibilities but does not thereby acquire Program Head authority over program-specific courses. Faculty authority depends on assigned course contexts. The Dean has college-wide oversight and specific stewardship capabilities. The Secretary performs administrative and identity-management responsibilities but does not inherit every academic-management capability.

**\[Insert Figure 4.1 – System CLOIE Context Diagram here\]**

#### ***Figure 4.1.** System CLOIE Context Diagram*

The context diagram should show System CLOIE as the central system boundary. Human actors should appear outside that boundary, together with Google OAuth and the self-hosted backend infrastructure. The diagram should distinguish authenticated internal academic users from respondent users and should show evaluation data entering CLOIE and analytics or reports leaving it. It should not depict an LMS or SIS as an integrated system unless such an integration is actually implemented.

#### **Table 4.1** *Stakeholder and System Interaction Summary*

| Stakeholder | Primary responsibilities | Scope | Major system interactions |
| ----- | ----- | ----- | ----- |
| Secretary | User and account administration, academic-calendar administration, administrative oversight, permitted catalog and correction functions | College-wide administrative scope, subject to explicit authorization rules | Manage users, maintain permitted administrative data, view course assignments, perform authorized administrative actions |
| College Dean | College-wide academic oversight and stewardship where explicitly authorized | All programs and applicable General Education contexts | View college analytics, inspect outcomes and academic structures, oversee course assignments, access reports and evidence |
| General Education Coordinator | Manage Institutional Learning Outcomes and General Education course assignments | College-wide General Education scope | Manage ILOs, manage General Education assignments, inspect General Education courses, access applicable analytics |
| Program Head | Manage program outcomes, program-specific assignments, evaluation instruments and deployments, and program evidence | Authorized academic program or programs | Manage PLOs, course assignments, instruments, deployments, analytics, responses, and reports |
| Faculty Member | Maintain CILOs and mappings for authorized course contexts, manage applicable course-bound evaluations, inspect course evidence | Assigned courses and teaching contexts | Manage CILOs and alignment, course rosters where authorized, course-bound evaluations, course analytics |
| Student | Participate in assigned or eligible evaluations | Own respondent and course/evaluation context | View evaluations, save drafts, answer questions, rate CILOs where applicable, review and submit responses, view submission history |
| Alumni | Participate in eligible alumni evaluations | Own respondent/evaluation context | View evaluations, save drafts, answer questions, review and submit responses, view submission history |
| Industry Partner | Participate in eligible industry evaluation activities | Own respondent/evaluation context | View evaluations, save drafts, answer questions, review and submit responses, view submission history |

The table describes current responsibility boundaries rather than a hierarchy in which a higher-level role automatically inherits all lower-level permissions. Authorization is explicit. This is particularly important for the Secretary, Dean, General Education Coordinator, and Program Head because some of their views may use common services while their mutation rights remain different.

## **4.2 Requirements Specification**

The following requirements form the current Chapter 4 baseline. Every approved requirement should appear in Appendix F using the same identifier. Appendix F should then connect the requirement to its originating objective or stakeholder need, design component, implementation evidence, test case, validation evidence, and current status.

The priority scheme used here is **Must**, **Should**, and **Could**. "Must" identifies behavior required for the approved core workflow or system integrity. "Should" identifies important behavior that supports usability, analysis, maintainability, or institutional operation. "Could" is reserved for non-core capability whose absence does not invalidate the primary evaluation workflow.

\[Every requirement receives a stable ID and appears in Appendix F.\]

### **4.2.1 Functional Requirements**

#### **Identity and access**

**FR-01.** The system shall authenticate primary-production users through Supabase Auth using Google OAuth.

**FR-02.** The system shall restrict internal institutional accounts to the approved Assumption College of Davao Google domains configured for production authentication.

**FR-03.** The system shall associate an authenticated identity with a System CLOIE domain user before granting access to protected role-specific functions.

**FR-04.** The system shall provide role-specific navigation and protected routes for the Secretary, Dean, General Education Coordinator, Program Head, Faculty, Student, Alumni, and Industry Partner roles.

**FR-05.** The system shall allow authorized Secretary users to create complete user accounts for supported CLOIE roles using the role-specific information required by the selected account type.

**FR-06.** The system shall support the approved onboarding and verification process for respondent accounts that are not institutionally pre-provisioned.

#### **Academic structure and academic periods**

**FR-07.** The system shall maintain academic programs and the academic structures required to associate courses, outcomes, users, and evaluation evidence with their institutional context.

**FR-08.** The system shall maintain school years, semesters, and terms required to identify the academic period associated with assignments, deployments, responses, and analytics.

**FR-09.** The system shall identify the active academic period according to the authorized academic-calendar state.

**FR-10.** The system shall preserve academic-period references needed to distinguish current evidence from historical evidence.

#### **Courses, assignments, and rosters**

**FR-11.** The system shall maintain course records and identify whether a course belongs to the Program-specific or General Education scope.

**FR-12.** The system shall associate course assignments with the appropriate course, faculty member, academic period, section, program context, and other required assignment attributes.

**FR-13.** The system shall allow an authorized Program Head to manage Program-specific course assignments only within the Program Head's authorized program scope.

**FR-14.** The system shall allow the General Education Coordinator to manage General Education course assignments across the college.

**FR-15.** The system shall allow the Dean to perform course-assignment stewardship across authorized college contexts.

**FR-16.** The system shall provide the Secretary with read-only course-assignment visibility and shall not provide Secretary course-assignment mutation.

**FR-17.** The system shall maintain the roster or enrollment relationships required to determine student participation in course-bound evaluations.

#### **Learning outcomes and alignment**

**FR-18.** The system shall allow the General Education Coordinator to create, update, reorder, archive, and restore Institutional Learning Outcomes within the college-wide General Education scope.

**FR-19.** The system shall allow authorized Program Heads to create, update, reorder, archive, and restore Program Learning Outcomes within their authorized program scope.

**FR-20.** The system shall allow Faculty Members to author and maintain Course Intended Learning Outcomes for course contexts they are authorized to teach or manage.

**FR-21.** The system shall store CILOs at the course level so that the outcome remains associated with the course rather than becoming a faculty-owned or assignment-period-specific record.

**FR-22.** The system shall support typed CILO-to-PLO mappings for Program-specific courses.

**FR-23.** The system shall support typed CILO-to-ILO mappings for General Education courses.

**FR-24.** The system shall record the approved manifestation value associated with an outcome mapping using the project's Learning, Practice, or Opportunity classification.

**FR-25.** For a Program-specific course to satisfy the current alignment-readiness rule, every active CILO shall have the required manifestation mapping to every active PLO of the owning program.

**FR-26.** For a General Education course to satisfy the current alignment-readiness rule, every active CILO shall have at least one active ILO mapping with a non-null manifestation.

#### **Evaluation instruments and deployments**

**FR-27.** The system shall maintain evaluation instruments and their versioned question structures independently from submitted response evidence.

**FR-28.** The system shall support the institutional evaluation workflows represented by the Post-Term CILO Evaluation Tool, Graduating Student Exit Survey, Alumni Evaluation Tool, and Industry Partner Internship Evaluation Tool.

**FR-29.** The system shall support quantitative rating questions and qualitative or open-ended questions where defined by an evaluation instrument.

**FR-30.** The system shall distinguish course-bound evaluations from central or program-wide evaluation deployments according to the target respondent and academic context.

**FR-31.** The system shall restrict publication of an evaluation when mandatory readiness conditions for the relevant course or outcome alignment have not been satisfied.

**FR-32.** The system shall allow an authorized academic user to publish and close an evaluation deployment within that user's permitted scope.

**FR-33.** The system shall associate a deployment with the instrument version, target context, academic period, eligibility information, and publication state required to interpret later responses.

#### **Responses**

**FR-34.** The system shall present eligible Students, Alumni, and Industry Partners with evaluations available to their respondent context.

**FR-35.** The system shall allow a respondent to save an incomplete evaluation as a draft when the evaluation workflow permits draft responses.

**FR-36.** The system shall validate required questions and response values before accepting final submission.

**FR-37.** The system shall present a review step before final submission so that the respondent can inspect the answers to be submitted.

**FR-38.** The system shall record a final response only after the respondent explicitly confirms submission.

**FR-39.** The system shall prevent a finalized response from being silently modified through the ordinary respondent workflow.

**FR-40.** The system shall provide the respondent with submission status or history sufficient to determine whether an evaluation has been completed.

#### **Analytics and reporting**

**FR-41.** The system shall aggregate quantitative evaluation evidence according to the applicable course, outcome, instrument, stakeholder, program, and academic-period context.

**FR-42.** The system shall present role-scoped analytics so that users see only evidence within their authorized organizational and academic scope.

**FR-43.** The system shall provide course-level evidence that connects CILO evaluation results with the applicable outcome-alignment structure.

**FR-44.** The system shall provide Program Heads with program-scoped analytics and outcome evidence for their authorized program context.

**FR-45.** The system shall provide the Dean with college-wide oversight views without granting mutation authority solely because the Dean can view the corresponding evidence.

**FR-46.** The system shall provide the General Education Coordinator with analytics applicable to the General Education scope.

**FR-47.** The system shall retain academic-period relationships required for historical or longitudinal comparison on the appropriate analytics or source pages.

**FR-48.** The system shall process supported qualitative feedback into bounded descriptive outputs without treating word frequency alone as a determination of sentiment or academic quality.

**FR-49.** The system shall generate or present reportable evaluation evidence suitable for authorized academic review, quality-assurance work, and accreditation-supporting documentation.

System CLOIE's reporting requirement ends with the production and organization of evidence. It does not authorize the application to decide what instructional or curricular change should be made. This matches the original client boundary that CLOIE should track, store, analyze, and report while management retains decision authority.

### **4.2.2 Quality / Non-Functional Requirements**

**NFR-01. Functional suitability.** Core workflows shall preserve the role, academic scope, evaluation state, and outcome relationships defined by the approved requirements rather than relying solely on interface visibility.

**NFR-02. Usability.** Forms used for core data entry and evaluation submission shall identify required fields, provide validation feedback, and preserve enough context for the user to understand the operation being performed.

**NFR-03. Responsive interaction.** Role-specific interfaces and respondent evaluation workflows shall remain operable at the supported desktop, tablet, and mobile viewport classes used by the project's browser verification.

**NFR-04. Accessibility.** Core user workflows shall be designed toward WCAG 2.2 Level AA requirements applicable to the implemented interface, including keyboard operation, visible focus, labels, contrast, status communication, and adequate target sizing where applicable (World Wide Web Consortium \[W3C\], 2023).

**NFR-05. Reliability.** Failure of a write operation shall not be presented to the user as a successful mutation, and multi-record operations that require atomicity shall not leave an intentionally protected operation partially committed.

**NFR-06. Maintainability.** Application behavior shall remain organized through the established feature/domain structure, typed application contracts, database migrations, domain documentation, and automated verification mechanisms.

**NFR-07. Compatibility.** The web application shall support the browser environments used for the project's verified desktop and mobile workflows. Final supported-browser claims shall be based on Chapter 5 compatibility evidence.

**NFR-08. Recoverability.** The production design shall support database and configuration backup and restoration procedures appropriate to the final self-hosted environment. Final recovery readiness shall not be claimed until restoration evidence is recorded.

No arbitrary response-time threshold is introduced here. If a performance requirement is approved, its measurement conditions and acceptance threshold must be added to Appendix F before performance testing rather than chosen after results are known.

### 

### **4.2.3 Security and Privacy Requirements**

Authentication alone does not determine what a user may do. CLOIE applies authorization at the role and resource-scope levels. This follows the principle of least privilege, where a user receives only the access required for the authorized task, and authorization is enforced at trusted application boundaries rather than only through hidden interface controls (OWASP Foundation, n.d.).

**SEC-01.** Primary production shall use the approved Google OAuth and Supabase Auth authentication flow and shall not expose development or dedicated-demo authentication as a production login mechanism.

**SEC-02.** Protected server operations shall verify the authenticated session and authorized CLOIE role before accessing protected behavior.

**SEC-03.** Operations whose authority depends on program, course, General Education, assignment, deployment, or respondent context shall verify that scope on the server.

**SEC-04.** The system shall deny an operation when the authenticated role or resource scope does not authorize that operation, regardless of client-supplied identifiers.

**SEC-05.** The system shall enforce the permitted response count for an evaluator and deployment so that ordinary application use cannot create multiple finalized responses where only one is permitted.

**SEC-06.** The system shall prevent ordinary respondent editing of finalized submissions.

**SEC-07.** Analytics and reporting interfaces shall avoid disclosing respondent-identifying information to users who require only aggregated or de-identified evaluation evidence.

**SEC-08.** Qualitative feedback shall be treated as potentially identifying information and shall be exposed only to roles and workflows authorized to inspect it.

**SEC-09.** Application inputs shall undergo server-side validation before protected writes are committed.

**SEC-10.** Production credentials, signing secrets, OAuth secrets, database credentials, and external-service API keys shall not be stored in client-visible source code or committed as ordinary repository configuration.

**SEC-11.** Sensitive administrative mutations that use the project's protected confirmation workflow shall require server-side authorization and the required confirmation/freshness checks before persistence.

**SEC-12.** Destructive database or environment operations shall verify the intended backend target before execution where the project's target-verification mechanism applies.

The term "anonymous" is deliberately avoided as a blanket description of CLOIE responses. The system may retain internal relationships required for eligibility, response integrity, or controlled participation. The correct privacy description depends on the view and processing stage. Evaluation evidence may therefore be confidential, pseudonymized, de-identified, or aggregated. The Data Privacy Act of 2012 also requires personal-information processing to follow legitimate purpose, proportionality, and appropriate security obligations (Republic Act No. 10173, 2012).

### **4.2.4 Data and Integrity Requirements**

**DR-01.** The system shall preserve stable identifiers for users, programs, courses, academic periods, outcomes, instruments, deployments, and responses required for relational integrity and traceability.

**DR-02.** Program-specific academic records shall retain the program relationship required to enforce their organizational scope.

**DR-03.** Course assignments shall retain the course, faculty, academic-period, section, and applicable program relationships required to reconstruct the teaching context of an evaluation.

**DR-04.** Archived learning outcomes shall remain distinguishable from active outcomes so historical evidence can retain its original references while archived outcomes are excluded from new mappings where required.

**DR-05.** Evaluation responses shall retain the instrument/deployment context needed to interpret the submitted evidence after an instrument or academic period changes.

**DR-06.** Historical evidence shall not be rewritten solely because the current terminology, mapping rules, or active outcome catalog changes.

**DR-07.** The database shall enforce applicable uniqueness, foreign-key, and state constraints for relationships whose integrity must not depend solely on interface validation.

**DR-08.** The system shall preserve the distinction between mutable configuration data and historical evaluation evidence.

**DR-09.** Course-level CILOs shall remain stable across assignment periods unless explicitly changed through their authorized lifecycle.

**DR-10.** Mapping records shall preserve the mapped source, mapped target, and manifestation required to interpret outcome alignment.

### **4.2.5 Integration and Infrastructure Requirements**

**INT-01.** Primary production authentication shall integrate with Google OAuth through the self-hosted Supabase Auth configuration.

**INT-02.** Application persistence shall use PostgreSQL through the project's self-hosted Supabase backend and Prisma data-access layer.

**INT-03.** Database-schema changes shall be represented by committed migrations that can be reviewed and applied to an identified backend target.

**INT-04.** The production web application shall be deployable as the project's defined Dockerized Next.js application while PostgreSQL and self-hosted Supabase services remain separately managed infrastructure resources.

**INT-05.** Browser-visible backend configuration shall contain only values intended for public client use; server credentials and privileged configuration shall remain server-side.

**INT-06.** Optional AI-assisted interpretation shall use the project's server-side bounded integration when enabled and shall not receive unrestricted respondent-identifying information or become the source of deterministic analytics.

### **4.2.6 Proposed and pending requirements**

Peer-to-Peer Evaluation, Self-Evaluation, and Class Observation are **not part of the implemented baseline specified by FR-01 through FR-49**. They may represent later stakeholder requests or possible extensions, but current project evidence does not justify presenting them as completed System CLOIE modules.

If approved for a future revision, each should receive a new stable requirement ID, originating stakeholder need, instrument definition, authorized actors, privacy rules, implementation component, use cases, and test cases before being incorporated into the RTM. Until then, their status is **Proposed/Pending**.

This distinction prevents future requests from silently changing the scope against which the current system is tested.

### **4.3 Use Case / User Interaction Model**

Use cases describe how authorized actors interact with the requirements defined in Section 4.2. They do not replace the requirements themselves.

The existing use-case set already assigns stable identifiers to many respondent workflows. Students, for example, have UC-STU-01 through UC-STU-06, including dashboard access, evaluation access, response submission, draft saving, submission history, and profile management. Alumni and Industry Partners use corresponding UC-ALU and UC-IP series. Shared interactions include UC-AUTH-01, UC-AUTH-03, UC-AUTH-04, and UC-EVAL-01 through UC-EVAL-04.

The older administrative use-case set must be reconciled with the newer General Education Coordinator and Secretary responsibility changes before Appendix C is finalized. Existing identifiers should be retained when their behavior remains valid. A superseded use case should be marked Changed/Superseded rather than quietly reassigned to unrelated behavior.

**\[Insert Figure 4.2 – System CLOIE Use Case / User Interaction Diagram here\]**

#### ***Figure 4.2.** System CLOIE Use Case / User Interaction Model*

### 

### **4.3.1 Authentication, Registration and Onboarding**

UC-AUTH-01 Login represents the common authentication entry point. Production users authenticate through Google OAuth. The authenticated identity is then resolved against the CLOIE user model and authorized role.

UC-AUTH-03 Profile Gate covers the requirement that users complete or satisfy the required profile/account state before entering workflows that depend on that information. UC-AUTH-04 Session Refresh represents maintenance of the authenticated session during protected application use.

The system distinguishes pre-provisioned accounts from self-service onboarding. Secretary-created accounts are created with the information required by their selected role. Eligible self-service respondent accounts follow the onboarding and verification behavior defined for their account type. The final Appendix C should document those paths separately because their preconditions differ.

### 

### **4.3.2 Secretary Workflows**

The Secretary's current workflows center on administrative management rather than unrestricted academic ownership. Major interactions include user administration, permitted academic-calendar administration, administrative visibility, and other explicitly authorized catalog or correction operations.

The Secretary may inspect course assignments but does not mutate them. Likewise, ILO encoding is no longer a Secretary workflow. Any older Secretary use case that still grants these capabilities must be marked superseded during Appendix C reconciliation.

### 

### **4.3.3 Dean Workflows**

The Dean operates at college-wide scope. Major interactions include viewing college-level dashboards and analytics, inspecting programs and learning-outcome evidence, reviewing course-assignment information, and exercising the specific college-wide stewardship actions authorized by the current implementation.

Dean visibility does not imply unrestricted mutation. Outcome oversight, for example, may be read-only even when the Dean can inspect the same underlying information across several programs.

### **4.3.4 General Education Coordinator Workflows**

The General Education Coordinator is responsible for General Education workflows across the college. The major interactions are management of the ILO catalog, management of General Education course assignments, inspection of the General Education course catalog, and access to applicable General Education analytics.

The ILO workflow includes creation, editing, ordering, archiving, and restoration. This responsibility belongs to the General Education Coordinator rather than the Secretary in the current design.

### 

### **4.3.5 Program Head Workflows**

Program Head workflows are bounded by the selected or authorized program context. Major interactions include PLO management, Program-specific course assignments, program-level evaluation instruments, controlled deployments, response evidence, analytics, and reports.

Program Heads may inspect course-to-outcome alignment within their program but should not acquire mutation authority over college-wide ILOs merely because General Education courses contribute evidence to their program.

### **4.3.6 Faculty Workflows**

Faculty workflows begin from assigned course contexts. Faculty Members manage the CILOs associated with authorized courses and perform the applicable CILO alignment workflow. Program-specific CILOs map to PLOs, while General Education CILOs map to ILOs.

The existing use-case set includes UC-FAC-09 Manage CILO Evaluations. Other Faculty use cases retained in Appendix C should be checked against the current course-level CILO ownership model and course-assignment rules before final submission.

### **4.3.7 Student Workflows**

The current Student use-case set includes:

UC-STU-01 View Dashboard, UC-STU-02 View My Evaluations, UC-STU-03 Submit Evaluation Response, UC-STU-04 Save Draft Response, UC-STU-05 View Submission History, and UC-STU-06 Manage Profile.

The shared evaluation flow also includes UC-EVAL-01 View Evaluation Detail, UC-EVAL-02 Answer Questions, UC-EVAL-03 Rate CILOs, and UC-EVAL-04 View Completion Status.

A Student therefore moves from eligibility and evaluation discovery into question answering, draft persistence where supported, completion checking, review, final submission, and submission history.

### **4.3.8 Alumni Workflows**

The Alumni use cases are UC-ALU-01 through UC-ALU-06, covering dashboard access, available evaluations, response submission, draft saving, submission history, and profile management.

Alumni use the shared evaluation-detail, question-answering, and completion-status workflows but do not use the Student-specific CILO-rating interaction unless an approved instrument explicitly defines such behavior.

### 

### **4.3.9 Industry Partner Workflows**

The Industry Partner use cases are UC-IP-01 through UC-IP-06, covering dashboard access, available evaluations, response submission, draft saving, submission history, and profile management.

Industry Partner participation is evaluation-specific. Authentication or account ownership does not grant access to unrelated program, student, or faculty information.

Detailed preconditions, postconditions, normal flows, alternate flows, and acceptance criteria should remain in Appendix C rather than expanding this chapter into a user manual.

## **4.4 Solution Architecture**

System CLOIE is implemented as a web-based **modular monolith**. The application is packaged and deployed as one Next.js application, while its source code is divided into feature domains with explicit responsibilities. Persistence and authentication are supplied by the separately operated self-hosted Supabase and PostgreSQL environment.

The current repository documents Next.js 16, TypeScript 5, Tailwind CSS, shadcn/ui with Base UI primitives, Prisma 6, PostgreSQL, Supabase Auth, Recharts, Zod, React Hook Form, Vitest, Testing Library, and Playwright as part of the current application stack.

**\[Insert Figure 4.3 – System CLOIE Solution Architecture here\]**

#### ***Figure 4.3.** System CLOIE Solution Architecture*

### 

### **4.4.1 Client and Presentation Architecture**

The presentation layer uses Next.js App Router and React. Routes are organized around authenticated role areas and public entry areas. The repository contains role-specific route groups for the Secretary, Dean, General Education Coordinator, Program Head, Faculty, Student, Alumni, and Industry Partner, together with public login, onboarding, portal, status, legal, and unauthorized routes.

Shared interface components are separated from feature-specific components. The design system uses Tailwind CSS and reusable UI primitives. Common typography and design values are represented through project tokens rather than repeatedly redefining equivalent visual rules inside individual pages.

The application uses server-rendered behavior where appropriate while client components handle interactions that require browser state, form control, or interactive visualization. This division avoids treating the entire application as a client-only single-page application.

#### 

#### **4.4.2 Application and Domain Architecture**

Application behavior is divided into feature domains including authentication, users, academic calendar, academic structure, course assignments, enrollments, curriculum-related structures, outcomes, instruments, evaluations, responses, analytics, Dean oversight, portals, and legal acknowledgements.

The architecture follows a service-oriented pattern inside the monolith. UI components and Server Actions should not contain unrestricted database logic. Server Actions act as application entry points and delegate business behavior to feature services. Services then enforce authorization, business invariants, and persistence rules.

This structure keeps deployment simple because CLOIE remains one application while avoiding a single undifferentiated codebase. A microservice architecture would add network boundaries, independent service deployment, distributed failure modes, and operational overhead that the current capstone does not require.

### **4.4.3 Authentication and Authorization Architecture** 

Production authentication uses Supabase Auth with Google OAuth. The application maintains its own domain-user records rather than treating the external authentication identity as the complete academic user model.

The request path includes session refresh and validation before protected application behavior is reached. Role-specific layouts and route guards provide one layer of protection, but server services remain responsible for authorization of protected operations.

Authorization combines role checks with resource relationships. The Program Head's active or selected program context, Faculty course assignments, General Education course scope, respondent eligibility, and other relationships narrow the data that an authenticated user may access.

This is closer to a role-plus-attribute model than pure RBAC. RBAC remains useful for identifying broad authority, while resource and organizational attributes answer the more important question of whether that authority applies to a particular record.

### **4.4.4 Persistence Architecture**

System CLOIE uses PostgreSQL as its relational database. Prisma provides the application's typed data-access layer, while Supabase provides the self-hosted PostgreSQL and authentication environment.

The project maintains its schema and migrations in the repository. Prisma model names follow application naming conventions while database tables use mapped snake-case names where defined.

Application validation and database integrity have different jobs. Zod and application services reject invalid requests before persistence. PostgreSQL constraints and relationships protect invariants that must remain true regardless of which application screen initiated the operation.

Database migrations are explicit deployment artifacts. Remote schema changes are not intended to occur implicitly whenever the application container starts.

### **4.4.5 External Services and Integrations**

The primary external identity integration is Google OAuth through Supabase Auth.

The current codebase also supports a bounded, server-side OpenAI-compatible integration for optional AI-assisted interpretation. This is not part of the deterministic analytics path and should be documented as optional unless final deployment evidence establishes that it is enabled.

No LMS or SIS integration is claimed. These systems are outside the System CLOIE boundary unless a later approved requirement introduces an actual integration.

### **4.4.6 Architectural Decisions and Trade-Offs**

Several decisions in the current architecture address problems discovered during development.

Authentication identity is separated from the CLOIE domain user so that an external Google identity does not become the application's entire authorization model. Single-role accounts simplify the primary authorization path. Program Head program context is explicit rather than inferred from whichever program happens to appear in a request.

Course assignments are separated from the course catalog because a course definition and a particular offering of that course are different records. CILOs remain course-level records so they are not recreated as faculty-owned outcomes every term.

Outcome mappings are typed according to course scope. Program-specific courses use CILO-to-PLO mappings. General Education courses use CILO-to-ILO mappings. The mapping relation also stores the Learning, Practice, or Opportunity manifestation rather than reducing alignment to a Boolean relationship.

The system uses a modular monolith rather than independent microservices. This keeps deployment and local development manageable for the project while retaining domain separation inside the application.

The project also moved to a self-hosted Supabase-only backend contract. This avoids tying production behavior to Supabase Cloud assumptions and allows the application to identify an approved self-hosted backend explicitly.

## **4.5 Data Design**

System CLOIE is strongly relational because evaluation evidence only becomes meaningful when its academic and temporal context remains intact. A response must be traceable to an evaluation deployment, instrument version, academic period, and authorized target context without exposing unnecessary respondent information in downstream views.

**\[Insert Figure 4.4 – System CLOIE Entity Relationship Diagram here\]**

#### ***Figure 4.4.** System CLOIE Entity Relationship Diagram*

The ERD should show conceptual and logical relationships rather than every implementation field. The complete field-level dictionary belongs in Appendix E.

### **4.5.1 Identity and Access Data**

The identity domain distinguishes authentication identity from the CLOIE domain user. A domain user contains the information required for application behavior, while the authentication relationship connects that record to the external identity used to sign in.

Role-specific records store information that does not apply uniformly to every account. Program Head scope, Student academic information, Alumni information, and Industry Partner information should therefore not be forced into one flat user table merely for convenience.

Account state and verification state are retained where required to determine whether the user may enter a protected workflow.

### **4.5.2 Academic Structure and Academic Calendar Data**

Programs provide the primary organizational context for Program-specific outcomes, assignments, analytics, and reports.

The academic-calendar domain stores the school year, semester, and term structure needed to identify the active evaluation context. Academic-period references are retained in downstream records so historical evidence can be distinguished from current-period evidence.

Academic periods should not be inferred only from the current date because the institution may need explicit control over which period the system treats as active.

### **4.5.3 Curriculum, Course, Assignment and Roster Data**

A Course represents the stable course catalog record. Its scope identifies whether it is Program-specific or General Education.

A Course Assignment represents a particular teaching context. It connects a course to Faculty, academic period, section, program context, year-level information where applicable, and the other information required for that offering.

The separation matters because the same course may recur across periods or appear in different academic contexts without becoming a different course definition each time.

Roster or enrollment records associate Students with the course-assignment context required for course-bound evaluation eligibility. The current architecture has also reduced unnecessary reliance on stored student identifiers in favor of the project's approved roster-resolution design.

### **4.5.4 Learning Outcome and Mapping Data**

The learning-outcome domain contains three principal levels.

An **Institutional Learning Outcome** is a college-wide outcome managed by the General Education Coordinator in the current design.

A **Program Learning Outcome** belongs to a specific academic program and is managed by an authorized Program Head.

A **Course Intended Learning Outcome** belongs to a course and is authored through authorized Faculty workflows.

Mappings are stored as explicit relations rather than as text embedded in an outcome description. Program-specific CILOs map to PLOs. General Education CILOs map to ILOs.

Each typed mapping stores its manifestation classification. The current model uses Learning, Practice, and Opportunity. This means two mappings between different outcome pairs can carry different pedagogical relationships even though both are structurally "mapped."

Active/archive state is important for outcome history. Archiving an outcome prevents it from being treated as an ordinary active target for new work while avoiding destructive removal of evidence that already references it.

### 

### **4.5.5 Evaluation Instrument and Deployment Data**

An evaluation instrument defines the reusable structure of an evaluation. It contains the question configuration, supported question types, and the information needed to render the instrument.

Instrument versioning separates the editable instrument definition from the version actually deployed. This is necessary because changing an instrument after responses have been collected must not change the meaning of those historical responses.

A deployment represents an instrument made available to a defined target context during an evaluation period. Course-bound deployments connect to a course-assignment context. Central or program-wide deployments target the applicable respondent population without pretending to be a course evaluation.

Deployment state records whether the evaluation is prepared, available, closed, or otherwise in the state defined by the implemented lifecycle.

### **4.5.6 Response and Evaluation Evidence Data**

A response represents one respondent's evaluation instance within the permitted deployment context. Draft and finalized states are distinguished because an unfinished response and a submitted response have different integrity rules.

Individual answers retain their question relationship and supported answer value. Quantitative answers can therefore be aggregated without discarding their source question. Qualitative answers remain text evidence and require stronger disclosure controls because a respondent may identify themselves inside free text even when the interface does not display their account identity.

The response domain retains enough internal information to enforce eligibility and response integrity. Downstream analytics need not expose that identity.

### **4.5.7 Analytics and Historical Evidence Considerations**

Analytics are derived from source evidence rather than maintained as an independent academic truth.

Quantitative views may calculate counts, distributions, mean values, completion measures, attainment-related summaries, and other approved descriptive metrics. The academic period, course, program, stakeholder type, outcome, and instrument relationships determine how those calculations are grouped.

Historical evidence must retain the context under which it was collected. If a PLO is later archived or terminology changes, a historical response should not be reassigned silently to a different outcome merely to match the current catalog.

Where immutable or versioned snapshots are used for readiness or publication evidence, those records preserve the rules and alignment state applicable at that point in the workflow.

### **4.5.8 Data Constraints, Validation and Integrity**

The application uses several layers of integrity protection.

Client-side form validation provides immediate feedback. Server-side validation rejects malformed or unauthorized requests before database mutation. Domain services enforce business rules such as ownership, academic scope, lifecycle state, and readiness. PostgreSQL provides foreign-key, uniqueness, nullability, and other database constraints for rules that must remain true even when the interface changes.

Transactions are used where several related writes must succeed or fail as one operation.

The database should reject structurally invalid relationships rather than depending on every future interface to remember the same rule.

### **4.5.9 Data Ownership, Retention and Sensitive-Data Handling**

"Ownership" in the CLOIE model refers to responsibility for managing a domain record, not personal ownership of institutional data.

The General Education Coordinator owns stewardship of the ILO catalog. Program Heads own stewardship of PLOs within their programs. Faculty author CILOs within authorized course contexts, while the CILO itself belongs to the course.

Evaluation evidence is institutional information subject to authorization and privacy controls. Respondent identity should be retained only where required for system integrity and participation rules and should not automatically appear in academic analytics.

Historical evidence should be retained according to the institutional retention policy applicable to evaluation and accreditation records. The exact retention duration remains **for institutional verification** unless an approved ACD retention policy establishes it. Chapter 4 should not invent a number of years.

## **4.6 Component, API and Integration Design**

### **4.6.1 Major System Modules**

The application is divided into feature modules rather than role-specific copies of the same business logic.

The **Identity and Access** domain resolves authenticated users, account state, role information, onboarding, and user administration.

The **Academic Structure and Academic Calendar** domains provide program and period context.

The **Course Assignments and Enrollment** domains connect courses, Faculty, sections, periods, and respondent membership.

The **Outcomes** domain manages ILOs, PLOs, CILOs, mappings, manifestations, and readiness behavior.

The **Instruments and Evaluations** domains manage evaluation definitions, versions, publication, deployments, and evaluation availability.

The **Responses** domain handles drafts, answers, finalization, and response evidence.

The **Analytics** domain derives quantitative and qualitative evidence for role-scoped presentation.

Role-specific application areas such as the Dean or General Education Coordinator can consume these shared domain services while applying different authorization and presentation rules.

### **4.6.2 Server Actions and Application Interfaces**

System CLOIE uses Next.js Server Actions for many application mutations. Server Actions remain thin entry points rather than becoming the location of all business logic.

A typical protected write follows this path:

**Interface → Server Action → Authentication and authorization → Feature service → Validation/business rules → Prisma → PostgreSQL → Result → Cache/path revalidation → User feedback**

This pattern creates a clear boundary between user interaction and domain logic. It also makes authorization reusable when more than one role legitimately performs related operations.

Traditional API routes are used where the interaction requires an HTTP endpoint, such as authentication-related or infrastructure-facing behavior. Chapter 4 does not list every internal function because the guide asks for interfaces that improve technical understanding rather than a source-code inventory.

### **4.6.3 Authentication Integration**

The browser begins the approved Google OAuth process through the Supabase authentication flow. After authentication, the application resolves the Supabase identity against the CLOIE domain user and determines the active role and account state.

Protected application routes require an authenticated session. Protected writes perform authorization again at the server boundary rather than assuming that reaching a particular page proves permission.

Development and dedicated-demo authentication are separate environment-specific mechanisms. They must never be presented as equivalent evidence that production Google OAuth works.

### **4.6.4 Database Integration**

Prisma provides the main application interface to PostgreSQL. The application maintains a Prisma schema alongside committed SQL migrations for the self-hosted Supabase/PostgreSQL environment.

Normal application requests use the configured database connection appropriate to the runtime. Migration operations use the controlled migration workflow and explicit target configuration.

Database access should remain inside server-side code. Database credentials are not browser configuration.

### **4.6.5 Analytics and Text-Processing Pipeline**

The quantitative analytics path begins with finalized evaluation evidence. The service identifies the authorized academic scope, selects the relevant deployment and response data, groups the evidence according to the requested dimension, and calculates the supported descriptive measures before returning a presentation-oriented result.

The qualitative path processes authorized textual responses separately. The current stack contains local text-processing support and word-cloud presentation capability. Such outputs are descriptive. A frequently occurring word does not by itself establish whether feedback is positive, negative, or academically significant.

Optional AI-assisted interpretation, where enabled, occurs after the deterministic evidence has been prepared. The AI service is not responsible for generating authoritative response counts or changing stored evaluation data.

**\[Insert Figure 4.5 – Evaluation Evidence and Analytics Data Flow here\]**

#### ***Figure 4.5. Evaluation Evidence and Analytics Data Flow***

A useful version of this figure should show:

**Instrument → Deployment → Eligibility → Draft Response → Review → Finalization → Stored Evidence → Authorized Aggregation → Analytics/Report**

The qualitative branch may then show local text processing and the optional bounded AI interpretation path separately.

### **4.6.6 Failure Handling and Error Boundaries**

Expected failures should return controlled application results rather than raw database or server exceptions.

Validation errors identify invalid fields or state. Authorization failures deny the requested operation without expanding the user's access. Stale protected-write state requires the user to review the current record rather than overwriting a newer change. Database failures should prevent the interface from reporting success.

Pages that depend on asynchronous server data use loading and error states where implemented. Retry behavior is provided where retrying is safe.

External-service failure must not corrupt deterministic evaluation evidence. If an optional AI interpretation request fails, the stored responses and deterministic analytics remain independent of that failure.

## **4.7 User Experience and Interface Design**

### 4.7.1 Design Goals and Principles

The interface is designed for an institutional environment with users who differ substantially in technical experience and frequency of system use. A respondent may enter the system only during an evaluation period, while a Program Head may use analytics and administrative workflows repeatedly.

The design therefore favors visible context, consistent navigation, recognizable controls, clear hierarchy, and explicit system feedback over dense administrative screens.

Role awareness is also part of usability. The interface should make it clear whether the user is operating at college, General Education, program, course, or respondent scope.

### 

### **4.7.2 Information Architecture and Navigation**

Authenticated users enter role-owned route areas rather than one universal dashboard containing every possible feature.

Secretary navigation emphasizes administrative responsibilities. Dean navigation emphasizes college-wide oversight. General Education Coordinator navigation exposes General Education courses, assignments, outcomes, and applicable analytics. Program Head navigation focuses on the selected program. Faculty navigation starts from assigned teaching contexts. Respondent navigation emphasizes available evaluations and submission history.

Breadcrumbs and page context are used on deeper workflows so the user can identify how the current page relates to the parent course, program, evaluation, or administrative area.

### 4.7.3 Administrative and Management Interfaces

Administrative interfaces use tables, filters, forms, confirmation dialogs, summary cards, and dedicated detail views according to the operation.

Potentially consequential actions should not be hidden behind ambiguous icons. Archive, restore, delete, publish, close, and other lifecycle operations should state the affected record and expected consequence.

Program and General Education context should remain visible on screens where selecting the wrong scope could alter academic data.

The Secretary interface no longer advertises course-assignment mutation or ILO encoding simply because older prototypes contained those functions. Removing unavailable actions is itself a UX requirement. An interface should not invite the user to perform an operation the server will reject.

### **4.7.4 Faculty Experience**

Faculty workflows are course-centered. A Faculty Member should be able to identify the relevant assigned course before entering CILO, mapping, roster, evaluation, or analytics workflows.

The outcome-alignment interface must communicate both the target outcome and manifestation. A mapping is therefore not represented as a generic checkbox when the user must also identify whether the relationship is Learning, Practice, or Opportunity.

Program-specific and General Education course contexts use related interaction patterns while changing the correct mapping target from PLO to ILO.

4.7.5 Respondent Experience

Student, Alumni, and Industry Partner interfaces reduce administrative detail and focus on evaluation participation.

The respondent dashboard identifies available and completed evaluation activity. Evaluation detail pages explain the evaluation context before answers are collected. Questions use controls appropriate to their configured type, and validation should occur close to the affected response rather than only after an unsuccessful final submission.

Respondents should not need to understand CLOIE's internal deployment, mapping, or database terminology to complete an evaluation.

4.7.6 Evaluation Wizard and Submission Experience

The evaluation workflow follows a staged interaction rather than an immediate one-screen commit:

**Open evaluation → Answer questions → Save draft where permitted → Check completion → Review answers → Confirm submission → Receive submission status**

The review step reflects explicit client feedback from the April 30, 2026 development review, where students were expected to see their answers before final submission.

Final submission must be visually distinct from saving progress. The interface should communicate that finalization changes what the respondent can subsequently edit.

4.7.7 Analytics and Data-Visualization Design

Analytics pages should answer academic questions rather than fill dashboards with charts.

Summary cards are appropriate for a small number of high-level measures. Distribution charts show how ratings are spread rather than hiding variation behind a single average. Outcome views connect evaluation evidence to CILOs, PLOs, or ILOs where the underlying relationship supports that interpretation. Qualitative views provide access to recurring terms or authorized comments without pretending that a word cloud is a complete qualitative analysis.

Program Head analytics remain program-scoped. Dean analytics can compare or inspect broader college evidence. Faculty analytics remain bounded to applicable course evidence. General Education analytics use the appropriate General Education context.

Historical filters belong on views where users are deliberately comparing periods. The main dashboard can prioritize the active academic context instead of requiring every card to become a longitudinal report.

4.7.8 Responsive Design

System CLOIE is a responsive web application rather than a desktop-only administrative system.

Navigation adapts to smaller screens, tables or dense layouts require mobile-safe alternatives, and forms should avoid horizontal overflow. Important controls need adequate touch targets. Evaluation participation is particularly important on smaller screens because Students, Alumni, and Industry Partners may access the system using mobile devices.

The project's browser verification uses desktop and mobile viewport configurations. Final claims about supported devices should be based on Chapter 5 test evidence rather than the presence of responsive CSS alone.

4.7.9 Accessibility

The project uses WCAG 2.2 as the principal accessibility reference for the web interface. WCAG 2.2 addresses perceivable content, operable interfaces, understandable interactions, and robust implementation and includes criteria relevant to keyboard access, focus visibility, target sizing, redundant entry, and accessible authentication (W3C, 2023).

System CLOIE should therefore provide semantic labels for controls, keyboard-operable interactions, visible focus states, adequate text and control contrast, meaningful status communication, and accessible validation messages.

Color must not be the sole means of distinguishing an outcome status, error, chart category, or selected state. Charts should retain accompanying labels, values, legends, or textual context.

Automated accessibility checks are useful but do not prove full WCAG conformance. Final accessibility results belong in Chapter 5\.

4.7.10 Error, Empty, Loading, Success and Feedback States

A usable institutional application must explain what is happening when the ideal path is unavailable.

An **empty state** explains why no records are shown and provides an appropriate next action when the user can resolve it.

A **loading state** indicates that data is being retrieved or an operation is pending.

An **error state** identifies that an operation failed without falsely suggesting that the data was saved.

A **success state** confirms completion of meaningful operations such as saving, publishing, closing, or final submission.

Validation feedback should identify the affected input and explain what needs correction. Toast notifications may confirm transient actions, but important errors should remain visible long enough for the user to act on them.

4.7.11 Stakeholder Feedback and Design Revisions

The interface changed as the institutional workflow became clearer.

The April client review established the review-before-submit interaction and clarified the need for Likert and guided open-ended evaluation behavior, stakeholder analytics, and qualitative summaries.

Later implementation work also corrected responsibility boundaries that earlier prototypes did not model accurately. General Education assignment responsibility moved to the General Education Coordinator. ILO management likewise moved away from the Secretary. Secretary course-assignment mutation was subsequently removed.

These revisions show why the final interface should be documented from the current system rather than by reproducing old prototype screenshots without checking them against the present authorization model.

Selected before-and-after screenshots may be included where they demonstrate a meaningful design decision. Decorative screenshot galleries are unnecessary.

4.8 Security and Privacy Design

System CLOIE handles academic records, account information, evaluation participation, and potentially identifying qualitative feedback. Its security model therefore focuses on authentication, authorization, data minimization, integrity, trust boundaries, and protection of sensitive configuration.

The project's security design follows the broader principle that security controls should be integrated into software development and architecture rather than added only before release (National Institute of Standards and Technology \[NIST\], 2022).

4.8.1 Authentication

Primary production authentication uses Google OAuth through Supabase Auth. The approved institutional-domain restriction is enforced as part of the authentication flow for internal accounts.

Development authentication and dedicated-demo authentication are separate mechanisms and are not intended to coexist with the primary production authentication mode in the same instance.

4.8.2 Role-Based and Scope-Based Authorization

Role-specific routes improve usability but are not the final authorization boundary.

Protected server operations resolve the authenticated user and evaluate the relevant role and scope. A Program Head cannot widen access by submitting another program identifier. A Faculty Member cannot gain course authority merely by knowing a course ID. A Secretary cannot restore removed assignment authority by calling the server operation directly.

This server-side approach follows OWASP guidance that access control should deny by default and validate permission for protected requests rather than depending on client-side restrictions (OWASP Foundation, n.d.).

### **4.8.3 Response Integrity**

Controlled deployments determine when and to whom an evaluation is available.

The response model distinguishes drafts from finalized responses. Final submission requires the defined completion and confirmation process. One-response constraints are enforced where required by the deployment rules.

A finalized response is treated as evidence rather than an ordinary editable form record.

### **4.8.4 Evaluation Confidentiality**

The system does not assume that hiding a name in the interface makes a response technically anonymous.

Internal relationships may be required to establish eligibility, prevent duplicate submissions, or retain response lifecycle integrity. Presentation and reporting layers should therefore disclose only the identity information required by the authorized task.

Faculty and academic-management analytics should use aggregated or de-identified evidence where individual respondent identity is unnecessary.

Qualitative comments deserve additional caution because users can disclose identifying information in their own text.

### **4.8.5 Input and State Validation**

The system validates request structure using application schemas and then applies domain-specific checks in server services.

Validation covers more than data type. A syntactically valid UUID is still invalid if it refers to a program outside the current user's scope. A valid rating value is invalid if the corresponding question does not permit that scale. A structurally valid response is invalid for final submission if required questions remain unanswered.

Database constraints provide a final integrity layer for applicable relational and uniqueness rules.

### **4.8.6 Sensitive Configuration and Communication**

OAuth credentials, database credentials, signing secrets, confirmation secrets, and external API keys remain server-side configuration.

Browser bundles receive only configuration explicitly intended for browser use.

Production traffic is intended to operate over HTTPS through the configured deployment/network layer. Final claims concerning TLS termination, certificates, public routing, and operational availability must match the verified deployment evidence in Chapter 5\.

### **4.8.7 Logging, Auditability, Backup and Recovery**

Operational logs should provide enough information to diagnose failures without unnecessarily recording sensitive response content or credentials.

Administrative changes that require stronger accountability should preserve appropriate timestamps, responsible-user information, or change evidence where the implemented domain supports it.

Database backup and recovery belong to the production operating model. The application repository contains migration and deployment procedures, but the existence of those procedures does not prove successful disaster recovery. Actual backup and restoration verification should be retained as operational evidence.

### **4.8.8 Trust Boundaries and Threat Considerations**

The principal trust boundaries are:

1. the user's browser and the CLOIE server;  
2. the CLOIE server and self-hosted Supabase/Auth services;  
3. the application and PostgreSQL persistence layer;  
4. the application and Google OAuth;  
5. the application and any optional external AI service;  
6. administrative/deployment operators and production infrastructure.

Important threats include unauthorized cross-role access, forged scope identifiers, disclosure of respondent information, duplicate or altered submissions, credential leakage, incorrect deployment configuration, destructive operations against the wrong backend, and disclosure of sensitive text to an external processing service.

**\[Insert Figure 4.6 – System CLOIE Trust Boundary and Sensitive Data Flow Diagram here\]**

**Figure 4.6.** System CLOIE Trust Boundary and Sensitive Data Flow Diagram

The threat model should remain small and specific to these actual boundaries rather than becoming a generic cybersecurity diagram.

## **4.9 Deployment / Infrastructure Design**

System CLOIE uses different environments for development, automated verification, demonstration, and intended production operation. These environments must not be conflated when reporting project status.

**\[Insert Figure 4.7 – System CLOIE Deployment and Infrastructure Topology here\]**

**Figure 4.7.** System CLOIE Deployment and Infrastructure Topology

### **4.9.1 Development Environment**

Local development uses Node.js 22, pnpm 10, the Next.js development environment, and a local Supabase CLI Docker stack. Developers configure local environment variables and can reconstruct the local database from committed migrations and seed data.

The local authentication mechanism exists only for development and test workflows. It is not evidence of production authentication.

### **4.9.2 Automated Test and Demo Environments**

Database integration tests use disposable database infrastructure so destructive test behavior does not target the primary application database.

The project also defines a dedicated demo deployment with its own resettable database and signed demo-session mechanism. This environment supports production-build demonstrations, browser evidence, and cross-role verification without pretending to authenticate through the live production OAuth path.

The primary production authentication boundary and demo authentication boundary are intentionally separate.

### **4.9.3 Intended Production Architecture**

The current production architecture packages System CLOIE as a Dockerized Next.js application.

The application container does not bundle PostgreSQL or the self-hosted Supabase services. These are separate backend resources. Prisma connects the application to PostgreSQL, while the browser and server communicate with the configured Supabase endpoints for the functions that require them.

The current repository documents a non-root application container, an application health endpoint, environment-based backend identity, and explicit migration procedures.

The intended topology can therefore be represented as:

**User Browser → HTTPS/Public Route → Next.js Application Container → Self-Hosted Supabase/Auth \+ PostgreSQL**

Google OAuth forms an external authentication path through the configured Supabase Auth service.

Optional external AI processing, when enabled, is a separate outbound server-side integration and should be shown as such.

### **4.9.4 Network and Public Routing**

The deployed architecture requires public routing for both the application and the authentication/backend endpoints needed by the browser and OAuth flow.

Current project deployment work uses a self-hosted environment and supports Dockerfile-based deployment through platforms such as Coolify. Public routing may use Cloudflare infrastructure where configured. These technologies describe the deployment architecture, not proof that every production endpoint is currently operational.

No router port-forwarding requirement should be inferred merely because services run on internal container or host ports. Public ingress should terminate through the approved reverse-proxy or tunnel architecture.

### **4.9.5 Configuration and Secrets**

Browser-safe values required during the Next.js build are separated from server-only runtime secrets.

Changing browser-embedded public configuration may require rebuilding the application image. Server-only values can be supplied through the deployment environment without placing them in the source repository.

The deployed environment must identify the intended backend before operations that can affect persistent data. This is particularly important because the self-hosted architecture can use arbitrary hostnames that are not safe indicators of whether a database is development, demo, or production.

### **4.9.6 Database Migration and Recovery**

Database migrations are maintained as version-controlled artifacts. Remote migrations are applied explicitly rather than as an automatic side effect of application startup.

The deployment process should support a dry-run or inspection step before a remote migration is applied. A production migration should also be associated with an appropriate backup and recovery procedure.

Schema migration capability is not equivalent to backup capability. Both must be documented separately in the operational appendix.

### **4.9.7 Current Deployment Status**

The architecture and deployment procedures are implemented sufficiently to define a production topology, Docker application image, self-hosted backend contract, environment configuration, migration process, and public-routing requirements.

However, **this chapter does not claim final successful production deployment or institutional operational acceptance**.

The final deployment state must be established from actual evidence such as reachable production endpoints, verified Google OAuth, health checks, database connectivity, migration state, backup evidence, security configuration, and institutional turnover or acceptance records. Those results belong in Chapter 5\.

## **Chapter 4 traceability check**

Before Appendix F is finalized, the Chapter 4 baseline should be checked bidirectionally:

**OBJ → FR/NFR/SEC/DR/INT → UC → Design/Component → TC → Validation Evidence**

The current revision exposes several items that need deliberate reconciliation rather than being hidden:

| Traceability issue | Required action |
| ----- | ----- |
| Legacy SRS contains duplicate and superseded FR numbering | Establish the Chapter 4 identifiers above as the approved baseline and retain legacy mappings in the Appendix F change log |
| Older use cases predate the final General Education Coordinator responsibility model | Update Appendix C while retaining unaffected UC IDs |
| Secretary ILO and course-assignment authority changed | Mark older requirements/use cases Changed/Superseded rather than deleting their history |
| PLO terminology replaced older GO terminology in current code/documentation | Use PLO as the canonical term while retaining legacy database/snapshot terminology where historical evidence requires it |
| CILO mapping rules changed to typed L/P/O manifestation relationships | Map FR-22 through FR-26 to the current outcomes components and corresponding TC coverage |
| Peer-to-Peer Evaluation, Self-Evaluation, and Class Observation lack approved implementation evidence | Keep Proposed/Pending and outside the current verified FR/UC baseline |
| Exact retention period is not established | Obtain institutional retention requirement before creating a measurable DR or SEC retention criterion |
| Performance acceptance threshold is not established | Define a requirement and test conditions before Chapter 5 performance measurement if performance testing is required |
| Final production deployment is not yet established by this chapter | Map INT requirements to deployment verification evidence in Chapter 5 |
| Final backup/recovery acceptance evidence requires verification | Link NFR-08 and relevant security requirements to the final recovery test rather than marking them passed now |
| Optional AI capability may differ between code availability and production enablement | Record enabled/disabled final state and map only the deployed behavior into Chapter 5 |

\==================================================  
CHAPTER 5  
IMPLEMENTATION, EVALUATION AND PROJECT OUTCOMES  
\==================================================

\[This chapter reports evidence. Write it after implementation and validation.  
Do not simply repeat Chapters 3 and 4.\]

5.1 Implemented Solution and Key Technical Features

5.1.1 Final System Overview

\[State what was actually completed.\]

5.1.2 Identity, Authentication and Role Management

5.1.3 Academic Structure, Curriculum and Course Management

5.1.4 Learning Outcomes Management

\[ILO, PLO, CILO, mappings, manifestations.\]

5.1.5 Course Assignment and Roster Management

5.1.6 Evaluation Instrument Management

5.1.7 Evaluation Deployment and Response Collection

5.1.8 Stakeholder Evaluation Workflows

5.1.9 Analytics and Reporting

5.1.10 Qualitative Feedback Processing

5.1.11 General Education Management

5.1.12 Selected User Interface Evidence

\[Use only screenshots that prove important implementation results.  
Do not turn this section into the User Manual.\]

5.2 Requirements Fulfillment

\[Summarize Appendix F.\]

Table 5.1  
Requirements Fulfillment Summary

Status | Count | Percentage  
Verified / Passed | | |  
Partially Met | | |  
Deferred | | |  
Changed / Superseded | | |  
Failed / Unresolved | | |

\[Discuss:  
\- critical fulfilled requirements;  
\- partially fulfilled requirements;  
\- changed requirements;  
\- deferred requirements;  
\- unresolved requirements;  
\- reasons for deviations.

Reference individual RTM IDs where appropriate.\]

5.3 Testing and Quality Evaluation Results

5.3.1 Automated Test Results

\[Vitest, integration, database, Playwright, CI, or final tooling actually used.\]

Table 5.2  
Automated Verification Summary

Test Category | Tests / Scenarios | Passed | Failed | Evidence Reference  
Unit / Component | | | |  
Integration | | | |  
Database / Invariant | | | |  
Browser E2E | | | |  
Accessibility | | | |

5.3.2 Functional and Workflow Verification

\[Summarize G-1 and detailed test evidence.\]

5.3.3 Security and Authorization Verification

\[Positive and negative access tests, scope enforcement, privacy/integrity checks.\]

5.3.4 Usability and Accessibility Evaluation

5.3.5 Performance Evaluation

\[Include only if meaningful tests were actually conducted.\]

5.3.6 Reliability and Compatibility Evaluation

\[Include evidence relevant to supported browsers/devices/environments.\]

5.3.7 Defects, Corrections and Regression Testing

\[Summarize significant defects and link to Appendix G-3.\]

5.4 Alpha/Beta/Pilot/User Acceptance Evaluation

5.4.1 Validation Purpose

5.4.2 Participants and Stakeholder Groups

\[Report only the groups that actually participated.

Potential System CLOIE groups:  
Secretary  
Dean  
General Education Coordinator  
Program Head  
Faculty  
Student  
Alumni  
Industry Partner\]

5.4.3 Validation Environment and Procedure

5.4.4 Tasks and Scenarios

5.4.5 Instruments and Evaluation Criteria

5.4.6 Validation Results

Table 5.3  
User Validation Summary

Stakeholder Group | Participants | Tasks Evaluated | Accepted | Needs Revision | Not Accepted  
\[ \] | | | | | |

5.4.7 User Feedback and Observations

5.4.8 Revisions Made

5.4.9 Retesting Results

5.4.10 User / Client Acceptance

\[Reference Appendix G-4 and signed evidence.\]

5.5 Discussion of Results and Limitations

5.5.1 Results Against Project Objectives

\[Discuss each OBJ ID.\]

5.5.2 Results Against Success Criteria

5.5.3 Results in Relation to Related Literature and Systems

5.5.4 Technical Strengths

5.5.5 Remaining Limitations

\[Be specific.\]

5.5.6 Known Defects and Technical Debt

\[Do not conceal unresolved problems.\]

5.5.7 Operational and Institutional Constraints

5.5.8 Risks Remaining After Final Validation

5.6 Deployment, Handover and Operational Readiness

5.6.1 Deployment Status

\[Development, pilot, staging, production, or other truthful status.\]

5.6.2 Production Configuration and Environment

5.6.3 Database Migration and Data Preparation

5.6.4 Backup and Recovery

5.6.5 User Documentation

5.6.6 Administrator and Technical Documentation

5.6.7 Training and Knowledge Transfer

5.6.8 System Ownership and Maintenance Responsibilities

5.6.9 ICTC Review and Institutional Turnover

5.6.10 Dependency and License Inventory

5.6.11 Credential and Service-Account Turnover

\[Document the procedure or evidence reference. Never publish credentials.\]

5.6.12 Known Operational Requirements

\[Reference Appendix E where appropriate.\]

5.7 Conclusions and Recommendations

5.7.1 Conclusions

\[Answer the actual research/capstone objectives using the evidence from Chapter 5\.

State:  
\- what was achieved;  
\- what was only partially achieved;  
\- whether the success criteria were satisfied;  
\- what System CLOIE demonstrably contributes.\]

5.7.2 Recommendations

\[Make recommendations grounded in actual results.

Potential categories:  
\- further functional development;  
\- analytics;  
\- institutional integrations;  
\- security/privacy governance;  
\- deployment and operations;  
\- scalability;  
\- accessibility/usability;  
\- future evaluation cycles;  
\- institutional adoption;  
\- future research.

Do not recommend features simply because they sound interesting.\]

\==================================================  
REFERENCES  
\==================================================

\[APA 7th edition unless another official institutional style is prescribed.

Include only sources actually cited in the manuscript.\]

\==================================================  
CHAPTER 6  
APPENDICES / SUPPORTING EVIDENCE  
\==================================================

APPENDIX A  
PROJECT APPROVAL AND ADMINISTRATIVE RECORDS

A-1. Approved Project Proposal / Approval Evidence  
A-2. Research Adviser Endorsement Form  
A-3. Routing Form  
A-4. Relevant Permission and Stakeholder Letters  
A-5. Beta / User-Validation Permission Letter  
A-6. Relevant Institutional Agreements or Approvals  
A-7. Declaration of Originality, if required here by the program

\[Do not duplicate records unnecessarily.\]

APPENDIX B  
STAKEHOLDER CONSULTATION AND DATA-GATHERING EVIDENCE

B-1. Consultation Forms  
B-2. Client Meeting and Consultation Records  
B-3. Interview / Consultation Guides  
B-4. Requirements-Gathering Instruments  
B-5. Beta / UAT Participant Instructions  
B-6. User-Validation Instrument / Questionnaire / Task Checklist  
B-7. Consent or Participant Information Materials, when applicable  
B-8. Anonymized Supporting Evidence

\[Remove unnecessary personal identifiers.\]

APPENDIX C  
DETAILED REQUIREMENTS AND INTERACTION SPECIFICATIONS

C-1. Detailed Functional Requirements  
C-2. Detailed Quality / Non-Functional Requirements  
C-3. Security and Privacy Requirements  
C-4. Role and Permission Matrix  
C-5. Detailed User Stories / Use Cases  
C-6. Acceptance Criteria  
C-7. Authentication and Onboarding Workflows  
C-8. Administrative Workflows  
C-9. Program Head Workflows  
C-10. General Education Coordinator Workflows  
C-11. Faculty Workflows  
C-12. Student Evaluation Workflows  
C-13. Alumni Evaluation Workflows  
C-14. Industry Partner Evaluation Workflows

APPENDIX D  
PROJECT MANAGEMENT AND REPOSITORY EVIDENCE

D-1. Project Milestone History  
D-2. Selected Kanban / Backlog Evidence  
D-3. Risk Register  
D-4. Requirements / Change History  
D-5. Selected GitHub Issues  
D-6. Selected Pull Requests and Code Review Evidence  
D-7. Release / Build Evidence  
D-8. Continuous Integration Evidence  
D-9. Contributor / Team Contribution Evidence  
D-10. Gantt Chart or Work Breakdown Structure, only if retained and useful

\[Prefer references and selected evidence over hundreds of printed repository pages.\]

APPENDIX E  
TECHNICAL AND OPERATIONAL REFERENCE

E-1. Detailed System Architecture Reference  
E-2. Detailed Entity Relationship Diagram  
E-3. Database Data Dictionary / Schema Reference  
E-4. API / Server Action / Integration Reference  
E-5. Deployment and Configuration Guide  
E-6. Database Migration Procedure  
E-7. Backup and Restore Procedure  
E-8. Health Check and Post-Deployment Verification Procedure  
E-9. User Manual  
E-10. Administrator / Technical Guide  
E-11. Maintenance and Incident-Response Guide  
E-12. Dependency and License Inventory  
E-13. Institutional Turnover Checklist  
E-14. Credential / Service-Account Turnover Record

\[Actual passwords, tokens, API keys, OAuth secrets, private keys, and database  
credentials must never be printed here.\]

APPENDIX F  
REQUIREMENTS TRACEABILITY MATRIX

\[Use the official Appendix F template.

Maintain:  
Requirement ID  
Objective / Stakeholder Need  
Requirement Statement  
Type / Priority  
Acceptance Criteria  
Design / Component Reference  
Implementation Evidence  
Test / Validation Reference  
Latest Result / Status  
Remarks / Change Reference

Also complete:  
\- Objective-to-Requirement Coverage Check  
\- Requirement Change Log  
\- Final Traceability and Completion Summary  
\- Proponent Declaration and Review\]

APPENDIX G  
SIMPLIFIED TESTING AND USER VALIDATION FORMS

G-1. System Test Record

\[Use official format.\]

G-2. User / Stakeholder Validation Record

\[Use official format.\]

G-3. Issue, Revision and Retest Log

\[Use official format.\]

G-4. User / Client Validation Summary and Acceptance

\[Use official format and obtain the required confirmation/signatures.\]

**APPENDIX H**  
CAPSTONE PROJECT REVISION COMPLIANCE FORM

H-1. Title Defense Revision Compliance Form  
\[Include if applicable.\]

H-2. Outline Defense Revision Compliance Form

H-3. Pre-Final Defense Revision Compliance Form

H-4. Final Defense Revision Compliance Form

\[Use a fresh official form for each defense stage rather than combining  
everything into one sheet.\]

**APPENDIX** I  
ACM / IEEE-STYLE CAPSTONE RESEARCH PAPER

\[Include only if the BSIT program or adviser requires a separate research-paper  
output. Otherwise omit Appendix I.\]  
