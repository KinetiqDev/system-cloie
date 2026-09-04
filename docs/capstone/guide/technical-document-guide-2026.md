---
title: "CAPSTONE PROJECT TECHNICAL DOCUMENT GUIDE (2026)"
kind: official-reference
status: authoritative-reference
source_file: Capstone_Technical_Document_Guide_2026.docx
conversion: faithful-markdown-transcription
---

**Bachelor of Science in Information Technology**

# CAPSTONE PROJECT TECHNICAL DOCUMENT GUIDE

This guide defines the recommended structure and minimum evidence for BSIT Capstone Project technical documentation. It is designed to demonstrate competencies in problem analysis, requirements engineering, solution design, software development, data management, cybersecurity and privacy, testing and quality assurance, deployment, professional communication, teamwork, and responsible computing.

The document should function as technical evidence of the project rather than as a collection of required diagrams. Artifacts must be selected because they explain, justify, or verify the solution. Not every capstone requires the same modeling artifact.

## I. DOCUMENT AND WRITING STANDARDS

| Item             | Recommended Standard                                                                                                                                                                                  |
| :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paper / Margins  | Letter (8.5 × 11 in); 1 in margins on all sides. A larger left margin may be retained only if required for hard binding.                                                                              |
| Font             | Arial 11 or Times New Roman 12\. Use one font consistently throughout the manuscript.                                                                                                                 |
| Spacing          | 1.5 spacing for body text; single spacing for tables, captions, references, and long technical entries. Use paragraph spacing rather than blank lines.                                                |
| Alignment        | Body text justified or left-aligned consistently. Avoid excessive first-line indentation; use a standard 0.5 in first-line indent if required.                                                        |
| Headings         | Use numbered hierarchical headings (e.g., 3.2, 3.2.1) consistently. Avoid unnecessary levels.                                                                                                         |
| Tables / Figures | Number consecutively by chapter or throughout the document. Table titles appear above; figure captions appear below. Every table/figure must be discussed in the text and cite its source if adapted. |
| Page numbering   | Roman numerals for preliminary pages; Arabic numerals beginning with Chapter 1\. Title page carries no displayed page number.                                                                         |
| Citation style   | APA 7th edition unless the College adopts another official style. Use a reference manager when possible.                                                                                              |
| Writing          | Use concise technical prose. Avoid unsupported claims, generic filler, and lengthy textbook definitions. Explain project-specific decisions and evidence.                                             |

## II. MANUSCRIPT STRUCTURE

Recommended preliminary pages: Title Page; Approval/Endorsement Sheet; Acknowledgment (optional); Abstract; Table of Contents; List of Figures; List of Tables; List of Abbreviations/Acronyms when needed.

The main manuscript is organized into five chapters. Requirements and design are deliberately separated from the development methodology so that the document mirrors contemporary software engineering practice: the methodology explains how the team worked, while the requirements and design chapters specify what must be built and how the solution is structured.

## ABSTRACT

Provide a concise, self-contained summary of the completed Capstone Project, preferably **200–300 words in a single paragraph**. Briefly present the **problem and context, project objective and developed IT solution, technical or development approach, testing and validation methods, key measurable results, and overall conclusion or contribution**. The Abstract shall reflect the actual completed project and its evaluation rather than merely describe the proposed work. Avoid citations, tables, figures, detailed feature lists, and unsupported claims.

Include **three to five keywords** immediately after the Abstract.

**Keywords:** keyword 1; keyword 2; keyword 3; keyword 4; keyword 5

## CHAPTER 1. PROJECT CONTEXT AND DEFINITION

Purpose: Establish the real problem or opportunity, the stakeholders affected, the intended IT intervention, and the boundaries and success targets of the capstone.

### 1.1 Background and Problem Context

Describe the organization/community/domain, current workflow or situation, evidence of the problem, affected stakeholders, and why an IT intervention is appropriate. Begin with the actual context rather than a generic discussion of 'computerization.' Use baseline data, observations, interviews, records, or credible external evidence where available.

### 1.2 Problem Statement

State the core problem and its major manifestations in concise, evidence-based terms. Distinguish symptoms from root causes when possible.

### 1.3 Project Objectives

State one general objective and specific objectives that are measurable and traceable to project outputs, requirements, and evaluation criteria. Avoid objectives that merely say 'to design,' 'to develop,' and 'to test' without specifying the intended capability or outcome.

### 1.4 Scope, Boundaries and Constraints

Define included users, processes, modules/features, platforms, integrations, data, locations, and intended operating environment. State exclusions, assumptions, dependencies, and known constraints. Do not list normal project limitations as excuses.

### 1.5 Significance and Intended Beneficiaries

Explain concrete benefits or value to primary stakeholders, the client/partner, the institution/community, and relevant future work. Avoid generic statements.

### 1.6 Success Criteria / Expected Project Outcomes

Define how the team and stakeholders will determine whether the capstone has achieved its objectives. Link success criteria to requirements, testing, user acceptance, quality measures, or operational outcomes.

### 1.7 Definition of Terms

Define only project-specific, specialized, or ambiguous terms. Do not create a glossary of common IT vocabulary.

## CHAPTER 2. REVIEW OF RELATED LITERATURE, TECHNOLOGIES AND SYSTEMS

Purpose: Build the evidence base for the project, establish what is already known or available, identify the gap or opportunity, and justify important requirements and technical choices.

### 2.1 Thematic Review of Literature and Technical Evidence

Organize sources by themes relevant to the problem, users, technologies, quality concerns, or domain. Synthesize findings instead of presenting one-source-at-a-time summaries.

### 2.2 Review of Related Systems / Existing Solutions

Compare relevant commercial, open-source, institutional, or research systems using meaningful criteria such as features, architecture, platform, usability, security, integration, limitations, or cost where applicable.

### 2.3 Synthesis, Gap and Project Contribution

Explain what the reviewed evidence collectively shows, what remains unresolved or unsuitable for the target context, and how the proposed capstone responds to that gap. Clearly state the intended contribution or value of the project.

Source guidance: prioritize peer-reviewed research, standards, official technical documentation, government/industry reports, and credible professional sources. Emphasize recent evidence, normally from the last five years, but allow older seminal or foundational sources when justified. Do not impose an arbitrary minimum number of sources as a substitute for relevance and sufficiency.

## CHAPTER 3. PROJECT METHODOLOGY AND ENGINEERING PROCESS

Purpose: Explain and provide evidence of how the team planned, elicited requirements, developed, secured, tested, managed, and iteratively improved the capstone. The chapter should document the actual engineering process used, not reproduce a textbook description of a methodology.

### 3.1 Development Approach and Lifecycle

Identify and justify the development approach used (e.g., Scrum, Kanban, iterative/incremental, prototyping, hybrid, or another appropriate lifecycle). Describe how it was actually implemented: iteration/sprint length, planning, reviews/demos, retrospectives or feedback loops, release/milestone strategy, roles, and artifacts. A methodology diagram alone is insufficient.

### 3.2 Requirements Engineering and Stakeholder Engagement

Describe how requirements were elicited, analyzed, prioritized, validated, changed, and approved. Identify stakeholders and methods such as interviews, observation, workshops, document analysis, surveys, or prototyping. Maintain requirements traceability. User stories/use cases belong to the requirements specification in Chapter 4; this section explains how they were obtained and managed.

### 3.3 Development Workflow, Collaboration and Configuration Management

Describe repository/version-control practices, branching or integration workflow where applicable, issue/task tracking, code review, documentation practices, environment/configuration management, and management of third-party libraries/APIs. Identify how individual and team contributions are evidenced.

### 3.4 Secure and Responsible Development

Explain how security, privacy, data protection, access control, secrets/credentials, dependency risks, backups, and ethical concerns are considered throughout development according to project risk. For AI-enabled projects, include dataset/model provenance, limitations, evaluation, human oversight, and responsible-use safeguards as applicable.

### 3.5 Verification, Validation and Testing Strategy

Define the overall testing strategy before implementation results are presented: unit/component, integration, system, usability, security, performance, compatibility, user acceptance, alpha/beta/pilot testing, or other applicable tests. Specify test environment, responsibilities, entry/exit or acceptance criteria, defect handling, retesting, and evidence to be retained.

### 3.6 Project Management, Risks and Milestones

Present a concise milestone/release plan and major project risks with likelihood/impact, mitigation, owner, and status. Detailed Gantt charts, WBS, sprint logs, backlogs, and risk registers may be placed in appendices or linked project artifacts rather than occupying the main narrative.

### 3.7 Feasibility and Sustainability (as applicable)

Discuss technical, operational, schedule, economic, organizational, and sustainability considerations only when they materially affect the project. Cost-benefit analysis is required only when financial feasibility is a genuine project decision, not as a ritual calculation.

## CHAPTER 4. REQUIREMENTS AND SYSTEM DESIGN

Purpose: Specify what the system must do and document the architecture and design decisions that enable the team to build, test, deploy, maintain, and secure it. Use models selectively. A diagram should answer a technical question, not exist merely because it appears in a template.

### 4.1 System Context and Stakeholders

Show the system boundary, external actors/systems, major interactions, and operating context. A context diagram or equivalent model may be used.

### 4.2 Requirements Specification

Present prioritized functional requirements and measurable non-functional/quality requirements. User stories and/or use cases may be used. Include acceptance criteria for important requirements. Maintain a Requirements Traceability Matrix linking objectives → requirements → design/components → test evidence.

### 4.3 Use Case / User Interaction Model

Provide a use case diagram and concise descriptions for major use cases when UML use cases are appropriate. For product-oriented projects, well-defined user stories, story maps, or workflow models may complement or replace excessive use-case documentation.

### 4.4 Solution Architecture

Present the high-level architecture: client/front end, services/back end, data stores, external services/APIs, devices/IoT components, cloud/on-premise infrastructure, and trust boundaries as applicable. Explain major architectural decisions and trade-offs.

### 4.5 Data Design

For data-driven systems, provide the conceptual/logical data model or ERD and essential schema/data dictionary. Explain key entities, relationships, constraints, data ownership, retention, validation, and sensitive-data handling. Do not reproduce every database field in the main chapter when an appendix is more readable.

### 4.6 Component, API and Integration Design (as applicable)

Document important modules/components, service interfaces, APIs, external integrations, message/data flows, protocols, and failure handling. Use component, sequence, activity, data-flow, or API specifications only where they improve technical understanding.

### 4.7 User Experience and Interface Design

Present key user flows, wireframes/prototypes, navigation, design conventions, responsive behavior, feedback/error states, and accessibility considerations. Explain how stakeholder/user feedback influenced the design.

### 4.8 Security and Privacy Design

Document authentication, authorization/roles, data protection, validation, logging/audit needs, secure communication, backup/recovery, threat considerations, and privacy controls appropriate to the project. A simple threat model or data-flow/trust-boundary view is encouraged for projects handling sensitive or high-risk data.

### 4.9 Deployment / Infrastructure Design

Show the intended runtime environment and deployment topology, including devices, servers/cloud services, databases, networks, external services, and major configuration/dependency requirements. Containerization/CI-CD may be documented when actually used.

## CHAPTER 5. IMPLEMENTATION, EVALUATION AND PROJECT OUTCOMES

Purpose: Provide evidence that the solution was implemented, tested, evaluated, improved, and prepared for operational use. This chapter replaces a vague 'Findings' section with verifiable engineering results.

### 5.1 Implemented Solution and Key Technical Features

Summarize the completed solution, implemented architecture, major modules, integrations, and notable technical decisions. Include selected screenshots only when they demonstrate important functionality; the manuscript should not become a screen-by-screen user manual.

### 5.2 Requirements Fulfillment

Report the status of approved requirements and objectives using the traceability matrix. Identify implemented, partially implemented, changed, or deferred items and justify deviations.

### 5.3 Testing and Quality Evaluation Results

Present actual test evidence and defect outcomes. Evaluate the quality characteristics relevant to the project rather than mechanically testing every possible characteristic. Use measurable criteria where possible. Include functional, integration, usability, security, performance, compatibility, reliability, or other relevant results.

### 5.4 Alpha/Beta/Pilot/User Acceptance Evaluation

Describe testing with representative users/client/stakeholders conducted before Final Defense. Report participants/context, tasks or scenarios, instruments/criteria, results, feedback, issues identified, revisions made, and retesting/verification. Protect participant privacy and avoid exposing personal data.

### 5.5 Discussion of Results and Limitations

Interpret results against objectives, requirements, baseline conditions, related work, and success criteria. Discuss defects, technical debt, constraints, risks, and limitations candidly.

### 5.6 Deployment, Handover and Operational Readiness

Document deployment status, client/stakeholder acceptance, installation/configuration, data migration where applicable, backup/recovery, user/admin guidance, training, maintenance responsibilities, and known operational requirements.

### 5.7 Conclusions and Recommendations

State evidence-based conclusions about whether project objectives and success criteria were achieved. Recommend realistic improvements, scaling, integration, maintenance, research, policy, or future technical work.

## CHAPTER 6. APPENDICES

_Please see VI. APPENDICES/ SUPPORTING EVIDENCES_

## III. REQUIRED CORE TECHNICAL ARTIFACTS

The following artifacts provide a common BSIT competency baseline. The exact form may vary according to the capstone type.

| Artifact                         | Expectation                                                                                                             |
| :------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| Problem / stakeholder evidence   | Interview/observation/documentary evidence or equivalent basis for requirements.                                        |
| Requirements specification       | Prioritized functional requirements plus measurable quality/non-functional requirements and acceptance criteria.        |
| Requirements Traceability Matrix | Trace objectives and requirements to design/implementation and test evidence.                                           |
| Interaction model                | Use cases, user stories/story map, workflows, or equivalent appropriate to the project.                                 |
| Solution architecture            | High-level components, interfaces, data stores, external services/devices, and deployment context.                      |
| Data model                       | ERD/schema or appropriate data model for projects that persist/manage data.                                             |
| UX prototype                     | Key flows and representative interfaces with evidence of user/stakeholder feedback.                                     |
| Security/privacy design          | Risk-appropriate controls and treatment of sensitive data, identities, permissions, dependencies, and threats.          |
| Repository / project evidence    | Version history, issue/task records, releases/milestones, and evidence of individual/team contribution.                 |
| Test evidence                    | Test plan/strategy, test cases or automated tests, defect/issue log, results, revisions, and retest evidence.           |
| User validation                  | Alpha, beta, pilot, usability, UAT, or equivalent testing appropriate to the project.                                   |
| Deployment / handover evidence   | Deployment topology, configuration/installation guidance, operational documentation, acceptance/handover as applicable. |

## IV. ARTIFACTS THAT ARE CONDITIONAL, NOT AUTOMATICALLY REQUIRED

To avoid documentation for documentation’s sake, require the following only when they add technical value: detailed sequence diagrams for every use case; exhaustive data dictionaries in the main manuscript; cost-benefit analysis; WBS; full Gantt chart; detailed deployment diagram before a deployment architecture exists; hardware specifications for software-only projects; and IPO conceptual frameworks. These may be used when appropriate, but should not be universal compliance items.

## V. QUALITY MODEL AND TESTING GUIDANCE

Use ISO/IEC 25010:2023 as a reference model for selecting relevant software/product quality characteristics and measures. Students should justify which characteristics matter for their project and define evidence or metrics for them. Quality requirements should be considered during requirements and design, not introduced only after development.

Security should be integrated into the lifecycle rather than treated as a final testing activity. Students should demonstrate risk-appropriate secure-development practices in requirements, design, implementation, dependency management, testing, deployment, and response to identified vulnerabilities.

Testing should progress from developer/internal verification to integrated system evaluation and, where applicable, representative-user alpha/beta/pilot or acceptance testing. Final-defense documentation should show not only that testing occurred, but that findings led to corrections, improvements, and retesting.

## VI. APPENDICES / SUPPORTING EVIDENCE

- Approved project proposal / letters / stakeholder agreements, as applicable
- Data-gathering instruments, interview guides, consent forms, and anonymized evidence
- Requirements Traceability Matrix
- Detailed user stories/use-case descriptions and acceptance criteria
- Backlog, sprint/release records, Gantt/WBS, risk register, and meeting/review evidence as applicable
- Detailed test cases, automated-test reports, defect/issue logs, alpha/beta/pilot/UAT evidence, and retest results
- Detailed data dictionary/schema and API documentation when too extensive for Chapter 4
- Selected relevant source-code excerpts only when needed as evidence; prefer repository/version-control evidence over printing large volumes of code
- User Manual and Administrator/Technical Guide as separate operational documents where appropriate
- Installation/Deployment Guide and configuration requirements
- Client/stakeholder acceptance, turnover, or deployment documentation
- Research-paper format output (ACM/IEEE-style paper) if required by the program

- **ACM-STYLE CAPSTONE RESEARCH PAPER TEMPLATE**

1. Title
2. Authors and Affiliations
3. Abstract
4. CCS Concepts (when required for the target ACM venue)
5. Keywords
6. Introduction
7. Related Work
8. Methodology / System Development Approach
9. System Design and Implementation
10. Evaluation and Results
11. Discussion
12. Conclusion and Future Work
13. Acknowledgments (if applicable)
14. References

## VII. CAPSTONE-SPECIFIC ADAPTATION

The adviser/panel may approve equivalent artifacts for projects that do not fit a conventional CRUD information-system model. Examples include AI/ML, data analytics, cybersecurity, IoT, networking, mobile, game, AR/VR, automation, and infrastructure projects. Students must still demonstrate the same underlying competencies: requirements, architecture/design, implementation, data or resource management, security/responsible computing, testing/evaluation, deployment/operation, and professional documentation.

## VIII. RECOMMENDED DOCUMENTATION PRINCIPLE

Evidence over volume. The technical manuscript should make it possible for an informed reader to understand the problem, reproduce the reasoning behind the solution, trace requirements into implementation and tests, evaluate the quality and risks of the product, and determine whether the proponents exercised professional BSIT-level engineering judgment.
