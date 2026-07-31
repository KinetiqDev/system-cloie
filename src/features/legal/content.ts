import type { LegalDocument } from "./types";

const pendingDate = "Pending institutional approval";
const draftApprovalNote =
  "This draft must be reviewed and approved by Assumption College of Davao's authorized institutional representative, Data Protection Officer, and ICTC before production use.";

export const LEGAL_VERSIONS = {
  privacy: "1.0",
  terms: "1.0",
} as const;

export const privacyNotice: LegalDocument = {
  kind: "privacy",
  title: "System CLOIE Privacy Notice",
  shortTitle: "Privacy Notice",
  description:
    "Learn what personal data System CLOIE processes, why it is used, how it is protected, and how data subjects may exercise their rights.",
  version: LEGAL_VERSIONS.privacy,
  effectiveDate: pendingDate,
  lastUpdated: pendingDate,
  approvalStatus: "Draft - pending institutional approval",
  approvalNote: draftApprovalNote,
  summary: {
    paragraphs: [
      "System CLOIE uses Google Sign-In through Supabase Auth to securely authenticate your account. When you continue, System CLOIE may receive your name, email address, and a unique authentication identifier from Google. It does not access your Google password, Gmail, Google Drive, Google Calendar, contacts, or other unrelated Google account content.",
      "Your information is used to create or match your account, verify your role and eligibility, provide access to assigned evaluations, prevent duplicate submissions, and support academic quality assurance, accreditation, and program improvement.",
      "System CLOIE may also process academic profile information, evaluation ratings, qualitative comments, submission records, and limited technical or security data. Evaluation results are intended to appear in aggregated or de-identified reports, but submissions are not completely anonymous because the system retains an internal link between the respondent and the assigned evaluation for verification, security, and data-integrity purposes.",
      "Your information will be accessible only to authorized institutional personnel and approved service providers, retained only as necessary, and protected through role-based access controls and other safeguards. Avoid including names or unnecessary sensitive information in open-ended comments.",
    ],
    acknowledgementLabel:
      "I acknowledge that I have read and understood the System CLOIE Privacy Notice and agree to the System CLOIE Terms of Use.",
  },
  sections: [
    {
      id: "introduction",
      title: "Introduction",
      blocks: [
        {
          type: "paragraph",
          text: 'Assumption College of Davao ("ACD," "the Institution," "we," "our," or "us") respects and protects the privacy of individuals who use the System for Comprehensive Learning Outcomes and Instructional Evaluation, referred to in this notice as System CLOIE.',
        },
        {
          type: "paragraph",
          text: "System CLOIE is an institutional academic evaluation platform designed to manage Course Intended Learning Outcomes and Program or Graduate Outcomes, collect stakeholder-based evaluation data, process quantitative ratings and qualitative comments, generate outcome-attainment reports and analytics, and support quality assurance, accreditation preparation, and continuous program improvement.",
        },
        {
          type: "paragraph",
          text: "This Privacy Notice explains what personal data System CLOIE processes, why those data are processed, how they are protected, who may access or receive them, how long they may be retained, and how data subjects may exercise their rights. System CLOIE is not a Student Information System or Learning Management System and is not intended to manage individual grades, transcripts, enrollment transactions, instructional materials, or course delivery.",
        },
      ],
    },
    {
      id: "controller-and-administration",
      title: "Personal Information Controller and System Administration",
      blocks: [
        {
          type: "paragraph",
          text: "Upon authorized institutional deployment, Assumption College of Davao will act as the Personal Information Controller responsible for determining the purposes and means of processing personal data through System CLOIE.",
        },
        {
          type: "paragraph",
          text: "The final operational owner, responsible office, and authorized service providers must be confirmed before production deployment.",
        },
        {
          type: "bullets",
          items: [
            "The ACD Information and Communications Technology Center or another designated institutional technology office",
            "Authorized academic administrators and System CLOIE administrators",
            "Authorized technical maintainers",
            "Project CLOIE student developers during approved development, testing, maintenance, and turnover activities",
            "Approved cloud, authentication, hosting, database, backup, monitoring, and technical-support providers",
          ],
        },
      ],
    },
    {
      id: "scope",
      title: "Scope of This Notice",
      blocks: [
        {
          type: "paragraph",
          text: "This notice applies to individuals whose information is entered into System CLOIE for account provisioning, verification, evaluation assignment, reporting, support, or administration.",
        },
        {
          type: "bullets",
          items: [
            "Students and graduating students",
            "Faculty members, program heads, and the college dean",
            "Alumni and graduates",
            "Industry partners, employers, and internship supervisors",
            "The secretary or designated system administrator",
            "Technical maintainers and invited or authorized institutional personnel",
          ],
        },
      ],
    },
    {
      id: "personal-data-processed",
      title: "Personal Data Processed by System CLOIE",
      blocks: [
        {
          type: "paragraph",
          text: "The categories of personal data processed depend on the user's role and activities.",
        },
        {
          type: "bullets",
          items: [
            "Google Sign-In and authentication data, including email address, name, provider identifier, verification information, session timestamps, and basic provider metadata",
            "General account and role data, including name, email, system role, account and verification status, authorized program scope, and account timestamps",
            "Student data, including student identification number, academic program and major, academic term, year level, section, enrollment status, assigned courses, and evaluation instruments",
            "Faculty and academic personnel data, including program affiliations, assigned courses and sections, organizational scope, managed outcomes, evaluation instruments, and administrative actions",
            "Alumni data, including graduation year, academic program and major, verification status, assignments, and participation records",
            "Industry partner data, including name, email, company or organization, position, program association, verification status, and assigned evaluations",
            "Invitation and provisioning data, including invitee details, intended role, program, company, administrative note, status, and related timestamps",
            "Evaluation and feedback data, including assignments, ratings, attainment responses, comments, cycle context, submission state, timestamps, and identifiers",
            "Technical and security data reasonably necessary for authentication, security, troubleshooting, accountability, and service reliability",
          ],
        },
        {
          type: "paragraph",
          text: "System CLOIE uses available name information and email to create or match an application account. It does not request or store the user's Google password or access unrelated Google account content such as Gmail, Drive, Calendar, Contacts, or photographs.",
        },
      ],
    },
    {
      id: "collection",
      title: "How Personal Data Are Collected",
      blocks: [
        {
          type: "bullets",
          items: [
            "Directly from the user during Google Sign-In, onboarding, verification, profile completion, or evaluation submission",
            "From Google through the user-authorized OAuth sign-in process",
            "From authorized ACD personnel who create, upload, assign, or verify institutional records",
            "From authorized faculty members, program heads, administrators, or internship coordinators",
            "From existing institutional records where the transfer is authorized and compatible with the declared purpose",
            "Automatically through necessary authentication, session, security, and system operations",
          ],
        },
      ],
    },
    {
      id: "purposes",
      title: "Purposes of Processing",
      blocks: [
        {
          type: "ordered",
          items: [
            "Authenticate users and maintain secure sessions",
            "Create, match, verify, and administer accounts",
            "Determine a user's role, eligibility, institutional affiliation, and authorized scope",
            "Restrict access according to assigned permissions",
            "Assign evaluation instruments to eligible respondents",
            "Enforce controlled evaluation periods and one-response-per-assignment rules",
            "Collect quantitative ratings and qualitative feedback",
            "Calculate aggregated outcome-attainment results",
            "Produce dashboards, summaries, reports, and accreditation-supporting evidence",
            "Support quality assurance, institutional research, program review, and continuous improvement",
            "Preserve approved historical evaluation evidence for longitudinal analysis",
            "Investigate errors, prevent unauthorized access, and protect system integrity",
            "Provide technical support and resolve account or evaluation issues",
            "Comply with applicable laws, regulations, institutional policies, audit requirements, accreditation requirements, and lawful orders",
          ],
        },
        {
          type: "paragraph",
          text: "Personal data will not be sold, used for unrelated advertising, or used for unauthorized commercial profiling.",
        },
      ],
    },
    {
      id: "legal-bases",
      title: "Legal Bases for Processing",
      blocks: [
        {
          type: "paragraph",
          text: "Depending on the user category and processing activity, ACD may rely on one or more lawful bases, including performance of or preparation for an educational, institutional, employment, service, or participant relationship; compliance with legal or institutional obligations; legitimate educational and institutional interests; establishment, exercise, or defense of lawful rights; and the data subject's specific consent where consent is required or appropriate.",
        },
        {
          type: "paragraph",
          text: "Where processing relies on consent, the consent request must be specific, informed, freely given, and recorded. Withdrawal of consent will not affect processing lawfully completed before withdrawal and may not require deletion of records retained under another valid legal basis.",
        },
      ],
    },
    {
      id: "google-oauth",
      title: "Google OAuth and Supabase Authentication",
      blocks: [
        {
          type: "ordered",
          items: [
            "The user is redirected to Google's authorization interface",
            "Google identifies the information requested by the application",
            "The user may approve or cancel the request",
            "Google returns authorized identity information to Supabase Auth",
            "Supabase Auth creates or resolves an authenticated identity and session",
            "System CLOIE creates or matches the corresponding account and authorized role",
          ],
        },
        {
          type: "paragraph",
          text: "System CLOIE should request only the minimum authentication scopes necessary: OpenID, email address, and basic profile information. Google and Supabase process information under their respective privacy policies, terms, infrastructure arrangements, and security practices.",
        },
        {
          type: "paragraph",
          text: "Revoking System CLOIE's access from a Google account stops future authorization but does not automatically delete records already lawfully stored by ACD. A separate data-subject request may be required.",
        },
      ],
    },
    {
      id: "confidentiality",
      title: "Confidentiality and Anonymity of Evaluation Responses",
      blocks: [
        {
          type: "paragraph",
          text: "System CLOIE is designed to protect evaluation confidentiality and present results primarily through aggregated, pseudonymized, de-identified, or summary outputs. However, the system maintains an internal relationship between the authenticated user, evaluation assignment, and submitted response to verify eligibility, prevent duplicate submissions, preserve data integrity, and investigate incidents.",
        },
        {
          type: "paragraph",
          text: "Responses are not completely anonymous at the database level. They should instead be described as confidential or pseudonymized. Ordinary reports should not display respondent identities, and access to identifiable response records or raw qualitative comments must be restricted to specially authorized personnel and approved purposes.",
        },
        {
          type: "bullets",
          items: [
            "Do not enter names, student numbers, contact information, medical, disciplinary, financial, family, or other unnecessary sensitive information in open-ended comments",
            "Do not enter passwords, access credentials, or confidential institutional information",
            "Remember that free-text comments may remain identifiable because of distinctive circumstances or writing style",
          ],
        },
      ],
    },
    {
      id: "analytics",
      title: "Analytics and Automated Processing",
      blocks: [
        {
          type: "bullets",
          items: [
            "Calculation of averages, distributions, response counts, and attainment levels",
            "Comparison of results across approved stakeholder groups or evaluation cycles",
            "Tokenization and filtering of qualitative comments",
            "Generation of recurring-term summaries, themes, or word clouds",
            "Identification of incomplete, inconsistent, or invalid response data",
          ],
        },
        {
          type: "paragraph",
          text: "System CLOIE does not use evaluation results to automatically assign individual grades, impose disciplinary action, determine employment status, or make a solely automated decision that produces a significant effect on a specific person. Significant academic or institutional decisions remain subject to human review and authority.",
        },
      ],
    },
    {
      id: "access-and-disclosure",
      title: "Access and Disclosure",
      blocks: [
        {
          type: "paragraph",
          text: "Personal data may be accessed or disclosed only where necessary to authorized System CLOIE administrators, ACD ICTC or designated technology personnel, authorized faculty members within assigned scope, program heads within assigned programs, the college dean within approved college-level scope, authorized quality-assurance, accreditation, audit, research, or institutional personnel, approved service providers, and government agencies or other organizations where disclosure is approved or required by law.",
        },
        {
          type: "paragraph",
          text: "Whenever practicable, reports shared outside the authorized operational team should contain only aggregated, anonymized, or de-identified information. System CLOIE does not sell personal data.",
        },
      ],
    },
    {
      id: "service-providers",
      title: "Third-Party Service Providers",
      blocks: [
        {
          type: "bullets",
          items: [
            "Google for identity authentication",
            "Supabase Auth for authentication and session services",
            "Supabase-hosted PostgreSQL or other approved PostgreSQL infrastructure",
            "An institutionally approved hosting provider",
            "Approved backup, monitoring, email, security, or technical-support services",
          ],
        },
        {
          type: "paragraph",
          text: "Before production deployment, ACD should document ownership of each service account, hosting location or region, provider roles, access restrictions, data-processing and confidentiality terms, backup and deletion procedures, cross-border safeguards, and provider replacement and termination procedures.",
        },
      ],
    },
    {
      id: "cloud-processing",
      title: "Cloud and Cross-Border Processing",
      blocks: [
        {
          type: "paragraph",
          text: "Google, Supabase, and other cloud providers may operate infrastructure or supporting services outside the Philippines. Where personal data are processed outside the Philippines, ACD should implement appropriate contractual, organizational, and technical safeguards consistent with applicable law and this Privacy Notice.",
        },
        {
          type: "paragraph",
          text: "The production hosting region and transfer arrangements must be confirmed before publication.",
        },
      ],
    },
    {
      id: "security",
      title: "Security Measures",
      blocks: [
        {
          type: "paragraph",
          text: "ACD and authorized System CLOIE personnel will apply reasonable organizational, physical, and technical safeguards appropriate to the nature of the data and the risks involved.",
        },
        {
          type: "bullets",
          items: [
            "Secure Google and Supabase authentication and HTTPS encryption during transmission",
            "Server-side session validation and role-based, program-scoped access controls",
            "Database-level restrictions, input validation, and one-response enforcement",
            "Protection of submitted or finalized responses from unauthorized modification",
            "Restricted access to raw qualitative comments",
            "Secure management of credentials and environment variables",
            "Security logging that avoids recording comment contents",
            "Backup, recovery, deletion procedures, access review, security testing, and incident response",
          ],
        },
        {
          type: "paragraph",
          text: "No information system can guarantee absolute security. Users should immediately report suspected unauthorized access, account compromise, disclosure, or misuse.",
        },
      ],
    },
    {
      id: "retention",
      title: "Retention and Disposal",
      blocks: [
        {
          type: "paragraph",
          text: "Personal data will be retained only for as long as necessary for the declared purposes, institutional recordkeeping, quality assurance, accreditation, legal compliance, audit, dispute resolution, security, or other approved purposes. The following periods must be finalized through ACD's approved records-retention schedule.",
        },
        {
          type: "table",
          table: {
            headers: ["Record category", "Approved retention period"],
            rows: [
              ["Authentication identity and user account", pendingDate],
              ["Student, faculty, alumni, and industry profiles", pendingDate],
              ["Evaluation assignments and participation records", pendingDate],
              ["Raw quantitative and qualitative responses", pendingDate],
              ["Aggregated reports and accreditation evidence", pendingDate],
              ["Invitations and unaccepted accounts", pendingDate],
              ["Authentication, security, and audit logs", pendingDate],
              ["Privacy acknowledgements and consent records", pendingDate],
              ["Backup copies", pendingDate],
            ],
          },
        },
        {
          type: "paragraph",
          text: "When retention is no longer justified, records should be securely deleted, anonymized, aggregated, or rendered inaccessible according to approved procedures. Deleting a Google connection or System CLOIE account does not automatically require deletion of evaluation evidence ACD remains authorized or required to retain.",
        },
      ],
    },
    {
      id: "data-subject-rights",
      title: "Rights of Data Subjects",
      blocks: [
        {
          type: "paragraph",
          text: "Subject to applicable law, verification requirements, and lawful limitations, a data subject may exercise the right to be informed, request access or correction, object to certain processing, withdraw consent where consent is the applicable legal basis, request erasure or blocking where legally warranted, request data portability where applicable, file a complaint with the National Privacy Commission, and claim damages where provided by law.",
        },
        {
          type: "paragraph",
          text: "A request may be limited or denied where another person's privacy would be affected, where a legal or institutional retention duty applies, or where another valid legal basis authorizes continued processing.",
        },
      ],
    },
    {
      id: "minors",
      title: "Users Below the Age of Majority",
      blocks: [
        {
          type: "paragraph",
          text: "Some college students may be below eighteen years of age. Where a data subject is a minor, ACD should apply safeguards appropriate to the user's age and recognize the role of a parent, guardian, or lawful representative where required.",
        },
        {
          type: "paragraph",
          text: "The ACD Data Protection Officer should confirm whether any System CLOIE activity requires parental or guardian authorization.",
        },
      ],
    },
    {
      id: "incidents",
      title: "Privacy Breaches and Security Incidents",
      blocks: [
        {
          type: "paragraph",
          text: "Suspected loss, unauthorized access, alteration, disclosure, or misuse of System CLOIE data must be reported immediately through the official institutional incident-reporting process. ACD should assess, contain, investigate, document, and respond to incidents and notify affected data subjects and the National Privacy Commission where legally required.",
        },
      ],
    },
    {
      id: "changes",
      title: "Changes to This Privacy Notice",
      blocks: [
        {
          type: "paragraph",
          text: "This Privacy Notice may be updated when System CLOIE's functions, data categories, purposes, service providers, hosting arrangements, legal bases, or institutional requirements change. The current version should remain publicly accessible through the System CLOIE privacy page.",
        },
        {
          type: "paragraph",
          text: "Users should be informed of material changes. Where a new purpose relies on consent, updated consent must be obtained before the new processing begins.",
        },
      ],
    },
    {
      id: "privacy-contact",
      title: "Contact Information",
      blocks: [
        {
          type: "paragraph",
          text: "Questions, requests, objections, corrections, or complaints concerning System CLOIE personal data may be directed to the responsible institutional contacts below. Official email addresses and telephone numbers remain pending institutional approval.",
        },
        {
          type: "bullets",
          items: [
            "Assumption College of Davao Data Protection Officer: Juan P. Cabaguio Avenue, Davao City 8000, Philippines; official email and telephone pending institutional approval",
            "System CLOIE Operational Contact: responsible ACD or ICTC office, official email, and telephone pending institutional approval",
            "Individuals may also file a complaint with the National Privacy Commission subject to its procedures",
          ],
        },
      ],
    },
    {
      id: "publication-checklist",
      title: "Institutional Items to Confirm Before Publication",
      blocks: [
        {
          type: "ordered",
          items: [
            "The Personal Information Controller and responsible operational office",
            "Official DPO and ICTC contact information",
            "The legal basis assigned to each processing activity",
            "Production application and privacy-page domain",
            "Database, hosting, and backup regions",
            "Cross-border processing safeguards",
            "Approved retention periods",
            "Who may access raw qualitative comments",
            "Minimum response thresholds for displaying qualitative feedback",
            "Whether alumni and industry-partner participation relies on consent",
            "Procedures involving minors",
            "Account deletion and data-subject request workflows",
            "Security incident and breach-response procedures",
            "Approved report recipients and export restrictions",
          ],
        },
      ],
    },
  ],
};

export const termsOfUse: LegalDocument = {
  kind: "terms",
  title: "System CLOIE Terms of Use",
  shortTitle: "Terms of Use",
  description:
    "Understand the authorized use, account responsibilities, evaluation integrity, confidentiality, and operating rules for System CLOIE.",
  version: LEGAL_VERSIONS.terms,
  effectiveDate: pendingDate,
  lastUpdated: pendingDate,
  approvalStatus: "Draft - pending institutional approval",
  approvalNote:
    "This draft must be reviewed and approved by Assumption College of Davao's authorized institutional representative, ICTC, and Data Protection Officer before production use.",
  summary: {
    paragraphs: [
      "By using System CLOIE, you agree to use only your authorized account and assigned role, provide honest and relevant evaluation responses, protect confidential information, and follow applicable ACD policies.",
      "You must not impersonate another user, submit an evaluation on someone else's behalf, manipulate results, bypass access restrictions, disclose confidential records, attempt to identify respondents, retaliate against participants, or disrupt the system.",
      "System-generated reports support academic review, quality assurance, accreditation, and program improvement. They do not replace authorized institutional judgment and must not be treated as guaranteed error-free until properly reviewed.",
    ],
    acknowledgementLabel:
      "I acknowledge that I have read and understood the System CLOIE Privacy Notice and agree to comply with the System CLOIE Terms of Use.",
  },
  sections: [
    {
      id: "terms-introduction",
      title: "Introduction",
      blocks: [
        {
          type: "paragraph",
          text: "These Terms of Use govern access to and use of the System for Comprehensive Learning Outcomes and Instructional Evaluation, referred to in these Terms as System CLOIE.",
        },
        {
          type: "paragraph",
          text: "System CLOIE is an institutional academic evaluation platform intended to support Assumption College of Davao through management of outcomes and CILOs, stakeholder-based academic evaluation, collection of feedback, outcome-attainment analysis, reporting, quality assurance, accreditation preparation, and continuous academic program improvement.",
        },
        {
          type: "paragraph",
          text: "These Terms apply to all individuals who access or use System CLOIE. By selecting Agree and Continue, signing in, accepting an invitation, submitting an evaluation, or otherwise using System CLOIE, the user confirms that they have read, understood, and agreed to comply with these Terms. A user who does not agree must not continue to access or use System CLOIE.",
        },
      ],
    },
    {
      id: "definitions",
      title: "Definitions",
      blocks: [
        {
          type: "bullets",
          items: [
            "ACD means Assumption College of Davao",
            "Authorized User means a person granted valid access through an approved registration, invitation, provisioning, or verification process",
            "Evaluation Data means ratings, responses, comments, submission records, assignments, and related information",
            "Institutional Data means academic structures, programs, courses, outcomes, instruments, assignments, reports, configurations, and related information",
            "Reports means dashboards, summaries, analytics, exports, outcome-attainment reports, stakeholder summaries, qualitative analyses, or other outputs",
            "User Content means information entered, uploaded, encoded, configured, or submitted by a user, including evaluation responses and comments",
          ],
        },
      ],
    },
    {
      id: "institutional-administration",
      title: "Institutional Administration",
      blocks: [
        {
          type: "paragraph",
          text: "Upon authorized deployment, System CLOIE will operate under the authority of ACD and the institutional office designated to administer the system. System administration may involve the ACD ICTC, a designated academic or administrative office, authorized administrators, technical maintainers, and other personnel formally assigned by ACD.",
        },
        {
          type: "paragraph",
          text: "During development, testing, pilot use, maintenance, or turnover, authorized members of the Project CLOIE development team may provide technical assistance under institutional supervision and approved access limits.",
        },
      ],
    },
    {
      id: "eligibility",
      title: "Eligibility and Authorized Access",
      blocks: [
        {
          type: "ordered",
          items: [
            "Belong to an eligible user category",
            "Use a valid and authorized account",
            "Have been assigned or approved for the appropriate role",
            "Meet applicable institutional, academic, program, or stakeholder requirements",
            "Comply with these Terms and applicable ACD policies",
          ],
        },
        {
          type: "paragraph",
          text: "Access may be limited according to user role, academic program or major, course or faculty assignment, school year or term, year level or section, evaluation cycle, stakeholder category, invitation or verification status, and other approved scopes. Possession of a login credential does not grant unrestricted access to all information or functions.",
        },
      ],
    },
    {
      id: "accounts",
      title: "Accounts and Google Sign-In",
      blocks: [
        {
          type: "bullets",
          items: [
            "Sign in using your own authorized Google account",
            "Provide accurate account and profile information",
            "Use an official institutional account where required",
            "Keep your Google account and device secure and sign out on shared devices",
            "Avoid sharing an authenticated session and report suspected compromise immediately",
            "Do not use another person's account, impersonate another user, create multiple accounts to bypass restrictions, or misrepresent your role, program, organization, or eligibility",
          ],
        },
        {
          type: "paragraph",
          text: "System CLOIE does not collect or store the user's Google password.",
        },
      ],
    },
    {
      id: "role-scope",
      title: "User Roles and Scope of Authority",
      blocks: [
        {
          type: "paragraph",
          text: "Students may access only assigned evaluations and must submit their own responses. Alumni and industry partners may access only evaluations intended for their verified or assigned participation. Faculty members may manage only courses, outcomes, instruments, assignments, and reports within authorized responsibilities. Program heads, the college dean, secretaries, administrators, and technical maintainers may access information only within their formally assigned scope and legitimate institutional purpose.",
        },
        {
          type: "paragraph",
          text: "Technical access does not authorize unrestricted use or disclosure of personal, academic, or evaluation data.",
        },
      ],
    },
    {
      id: "permitted-uses",
      title: "Permitted Uses",
      blocks: [
        {
          type: "ordered",
          items: [
            "User authentication and role verification",
            "Management of academic programs, courses, majors, school years, and terms",
            "Management and mapping of Program, Graduate, and Course Intended Learning Outcomes",
            "Creation and administration of evaluation instruments",
            "Assignment and completion of stakeholder evaluations",
            "Collection of quantitative and qualitative feedback",
            "Calculation and interpretation of aggregated attainment results",
            "Preparation of dashboards, reports, accreditation evidence, and continuous-improvement plans",
            "Approved institutional research or longitudinal analysis",
            "Technical support, testing, maintenance, security, backup, recovery, and compliance",
          ],
        },
        {
          type: "paragraph",
          text: "System CLOIE must not be used for unrelated commercial activity, advertising, unauthorized surveillance, personal profiling, harassment, or any purpose incompatible with its institutional function.",
        },
      ],
    },
    {
      id: "responsibilities",
      title: "General User Responsibilities",
      blocks: [
        {
          type: "bullets",
          items: [
            "Provide accurate and current information and use System CLOIE honestly and in good faith",
            "Follow evaluation instructions and respect role and access boundaries",
            "Protect confidential and personal information and review information before final submission",
            "Report incorrect account, role, course, program, or assignment information",
            "Report suspected technical errors, unauthorized access, or misuse",
            "Comply with ACD policies and applicable law",
            "Avoid actions that may damage system integrity or reliability",
          ],
        },
      ],
    },
    {
      id: "evaluation-integrity",
      title: "Evaluation Integrity",
      blocks: [
        {
          type: "paragraph",
          text: "Evaluation responses must be submitted honestly, independently, and in accordance with the purpose of the assigned instrument.",
        },
        {
          type: "bullets",
          items: [
            "Do not submit an evaluation for another person or ask another person to complete yours",
            "Do not submit intentionally false or misleading information or coordinate responses to manipulate results",
            "Do not create duplicate or fraudulent submissions or pressure another person to provide a particular rating",
            "Do not alter another user's response or interfere with one-response-per-assignment controls",
            "Do not attempt to reopen or modify a finalized response without authorization",
          ],
        },
        {
          type: "paragraph",
          text: "System CLOIE may retain account-to-assignment and account-to-response relationships to verify eligibility, prevent duplicates, investigate integrity concerns, and preserve the reliability of results.",
        },
      ],
    },
    {
      id: "qualitative-feedback",
      title: "Qualitative Feedback and Content Standards",
      blocks: [
        {
          type: "paragraph",
          text: "Open-ended comments must be relevant, respectful, constructive, based on the user's genuine experience or observation, written in good faith, and limited to information reasonably necessary for the evaluation.",
        },
        {
          type: "paragraph",
          text: "Users must not include threats, harassment, discriminatory statements, knowingly false accusations, personal attacks, credentials, unnecessary identifiers, unnecessary sensitive information, confidential institutional or third-party information, unauthorized copyrighted material, malicious code, scripts, links, or harmful content. ACD may restrict, redact, quarantine, or remove content that violates these Terms, applicable law, or institutional policy, subject to appropriate review.",
        },
      ],
    },
    {
      id: "confidentiality-non-retaliation",
      title: "Confidentiality and Non-Retaliation",
      blocks: [
        {
          type: "paragraph",
          text: "Evaluation responses are intended to be handled confidentially and reported primarily through aggregated, pseudonymized, de-identified, or summary outputs.",
        },
        {
          type: "bullets",
          items: [
            "Use restricted information only for an approved institutional purpose",
            "Avoid disclosing it to unauthorized persons or attempting to determine respondent identities",
            "Store exported reports securely and avoid re-identification by combining reports with other data",
            "Do not publish screenshots or copies containing restricted information",
            "Do not retaliate against, threaten, penalize, intimidate, or disadvantage another person because of actual or suspected evaluation participation or feedback",
          ],
        },
      ],
    },
    {
      id: "prohibited-conduct",
      title: "Prohibited Conduct",
      blocks: [
        {
          type: "ordered",
          items: [
            "Access or attempt to access an account, record, program, course, report, or administrative function without authorization",
            "Bypass authentication, role, scope, verification, invitation, or assignment restrictions",
            "Probe, scan, test, exploit, or reverse engineer System CLOIE without written authorization",
            "Introduce malware, scripts, automated attacks, harmful files, or disruptive traffic",
            "Manipulate evaluations, reports, analytics, academic records, or institutional configurations",
            "Delete, alter, conceal, fabricate, export, or reproduce restricted records beyond approved scope",
            "Violate another person's privacy or intellectual-property rights",
            "Use bots or scripts to submit responses or access data without authorization",
            "Misrepresent unvalidated reports as official findings",
            "Attempt to identify respondents or use the platform for harassment, discrimination, retaliation, or unlawful conduct",
            "Encourage or assist another person to violate these Terms",
          ],
        },
        {
          type: "paragraph",
          text: "Security testing may be performed only by persons expressly authorized by ACD.",
        },
      ],
    },
    {
      id: "terms-privacy",
      title: "Privacy and Personal Data",
      blocks: [
        {
          type: "paragraph",
          text: "Personal-data processing through System CLOIE is governed by the separate System CLOIE Privacy Notice and applicable ACD policies. Agreement to these Terms does not constitute unrestricted consent to all personal-data processing. Where consent is required for a specific activity, System CLOIE or ACD should present a separate, specific consent request.",
        },
        {
          type: "paragraph",
          text: "Users must not upload or disclose another person's personal information unless authorized, necessary, and compatible with the declared institutional purpose.",
        },
      ],
    },
    {
      id: "records-monitoring",
      title: "System Records, Monitoring, and Audit",
      blocks: [
        {
          type: "paragraph",
          text: "System CLOIE may maintain records reasonably necessary for authentication, role and permission administration, provisioning and verification, evaluation integrity, accountability, error investigation, security monitoring, incident response, maintenance, backup, recovery, and compliance with law and policy.",
        },
        {
          type: "paragraph",
          text: "Authorized personnel may review relevant activity records when investigating unauthorized access, account misuse, data manipulation, duplicate responses, security incidents, technical failures, or policy violations. Monitoring must be proportionate and consistent with the Privacy Notice and applicable policy.",
        },
      ],
    },
    {
      id: "reports",
      title: "Reports and Academic Decision-Making",
      blocks: [
        {
          type: "paragraph",
          text: "System CLOIE reports are decision-support tools intended to help authorized personnel review attainment, identify strengths and gaps, compare approved stakeholder perspectives, support accreditation evidence, plan quality improvement, and monitor evaluation cycles.",
        },
        {
          type: "paragraph",
          text: "Reports do not automatically determine individual grades, academic transcripts, admission or enrollment status, employment or disciplinary outcomes, curriculum changes, accreditation decisions, or other significant actions. System-generated information must be reviewed by qualified and authorized personnel before formal decisions.",
        },
      ],
    },
    {
      id: "user-content",
      title: "User Content and Institutional Use",
      blocks: [
        {
          type: "paragraph",
          text: "Users remain responsible for the legality, accuracy, relevance, and appropriateness of content they submit. By submitting User Content, the user authorizes ACD to store, process, reproduce, aggregate, analyze, summarize, display, and include that content in authorized System CLOIE outputs for evaluation administration, quality assurance, program review, accreditation, institutional reporting, continuous improvement, approved research, security review, integrity review, and other purposes disclosed in the Privacy Notice.",
        },
        {
          type: "paragraph",
          text: "This authorization does not permit unrelated commercial exploitation.",
        },
      ],
    },
    {
      id: "intellectual-property",
      title: "Intellectual Property and Institutional Ownership",
      blocks: [
        {
          type: "paragraph",
          text: "System CLOIE, including its software, source code, database structure, interface, branding, documentation, configurations, templates, reports, and institutional materials, may be owned by ACD, licensed to ACD, or used under applicable third-party licenses.",
        },
        {
          type: "bullets",
          items: [
            "Unless authorized, do not copy or redistribute System CLOIE software",
            "Do not reproduce protected interfaces or documentation or remove proprietary or attribution notices",
            "Do not create derivative systems using protected materials or use System CLOIE branding outside authorized activities",
            "Do not claim ownership of institutional records or system-generated reports",
            "Third-party libraries, frameworks, icons, fonts, authentication services, and other components remain subject to their respective licenses",
          ],
        },
      ],
    },
    {
      id: "third-party-services",
      title: "Third-Party Services",
      blocks: [
        {
          type: "paragraph",
          text: "System CLOIE may depend on Google Sign-In, Supabase Auth, database infrastructure, application hosting, monitoring, email, backup, or other approved providers. Use of third-party services may also be governed by their own terms and privacy practices. ACD does not control all interruptions, restrictions, or policy changes made by third-party providers.",
        },
      ],
    },
    {
      id: "pilot-testing",
      title: "Pilot, Prototype, and Testing Use",
      blocks: [
        {
          type: "bullets",
          items: [
            "Features may be incomplete, changed, or unavailable",
            "Reports and analytics may be provisional and test records may be reset or removed",
            "The system must not be treated as the sole official institutional record",
            "Users must follow testing instructions and must not enter production personal data unless specifically authorized",
            "Errors and unexpected behavior should be reported promptly and access may be limited to approved testers",
          ],
        },
        {
          type: "paragraph",
          text: "A pilot or prototype designation does not remove the duty to protect confidential or personal information.",
        },
      ],
    },
    {
      id: "vulnerability-reporting",
      title: "Security Incidents and Vulnerability Reporting",
      blocks: [
        {
          type: "ordered",
          items: [
            "Stop unnecessary access or testing",
            "Avoid downloading, copying, modifying, or sharing affected data",
            "Preserve only the minimum information needed to report the issue",
            "Report the matter promptly through the official channel",
            "Cooperate with reasonable investigation and containment measures",
          ],
        },
        {
          type: "paragraph",
          text: "Users must not publicly disclose an uncorrected vulnerability or affected personal data without authorization.",
        },
      ],
    },
    {
      id: "suspension",
      title: "Suspension, Restriction, and Termination",
      blocks: [
        {
          type: "paragraph",
          text: "ACD or authorized administrators may suspend, restrict, deactivate, or terminate access because of violations of these Terms, unauthorized access, account compromise, security or privacy risk, role or affiliation changes, invitation revocation, misrepresentation, manipulation of evaluation data, abuse, harassment, retaliation, legal or institutional requirements, maintenance, decommissioning, or other legitimate operational reasons.",
        },
        {
          type: "paragraph",
          text: "Termination of access does not automatically require deletion of records that ACD remains authorized or required to retain.",
        },
      ],
    },
    {
      id: "availability",
      title: "System Availability, Maintenance, and Changes",
      blocks: [
        {
          type: "paragraph",
          text: "ACD will make reasonable efforts to maintain System CLOIE's security, availability, accuracy, and reliability. Access may be interrupted because of scheduled maintenance, software updates, security actions, network or hosting failures, third-party service interruption, backup or recovery operations, emergency maintenance, legal or institutional directives, or events beyond reasonable control.",
        },
        {
          type: "paragraph",
          text: "ACD may modify, replace, suspend, or decommission features where necessary for security, compliance, maintainability, or institutional requirements.",
        },
      ],
    },
    {
      id: "accuracy",
      title: "Accuracy and Limitations",
      blocks: [
        {
          type: "paragraph",
          text: "Reports depend on the accuracy of encoded records, evaluation instruments, participation, response quality, approved formulas, data quality, configuration, and human interpretation. System CLOIE does not guarantee that every response, report, calculation, or interpretation will be free from error. Suspected errors must be reported and verified before affected information is used for a significant institutional decision.",
        },
      ],
    },
    {
      id: "compliance",
      title: "Compliance with Law and Institutional Policy",
      blocks: [
        {
          type: "paragraph",
          text: "Users must comply with applicable Philippine laws and regulations, the Data Privacy Act of 2012 and related issuances, laws concerning unauthorized access, cybercrime, intellectual property, and electronic records, ACD privacy and information-security policies, academic and records-management policies, ICTC standards and directives, accreditation requirements, and lawful instructions from authorized institutional personnel.",
        },
        {
          type: "paragraph",
          text: "Where these Terms conflict with applicable law or a duly approved ACD policy, the applicable law or institutional policy will prevail.",
        },
      ],
    },
    {
      id: "terms-changes",
      title: "Changes to These Terms",
      blocks: [
        {
          type: "paragraph",
          text: "ACD may revise these Terms when System CLOIE's functions, roles, policies, service providers, security requirements, or legal obligations change. The current version should remain publicly available through the System CLOIE Terms of Use page.",
        },
        {
          type: "paragraph",
          text: "Material changes may be communicated through a notice within System CLOIE, the login or acknowledgement modal, institutional email, an official announcement, or another appropriate channel. System CLOIE may require users to review and accept an updated version before continued access.",
        },
      ],
    },
    {
      id: "electronic-acceptance",
      title: "Electronic Acceptance",
      blocks: [
        {
          type: "paragraph",
          text: "The user's electronic acknowledgement, checkbox selection, account sign-in, or continued authorized use may be recorded together with the Terms version, date and time of acceptance, user or account identifier, role or login intent, and acceptance method. These records may be retained as evidence that the Terms were presented and accepted. This baseline pre-OAuth flow does not create a durable acceptance record.",
        },
      ],
    },
    {
      id: "concerns",
      title: "Concerns, Complaints, and Dispute Resolution",
      blocks: [
        {
          type: "paragraph",
          text: "Concerns should first be reported to the responsible System CLOIE or ACD office. Depending on the issue, the user may be directed to System CLOIE support, ICTC, the relevant academic office, the ACD Data Protection Officer, an applicable institutional process, or an appropriate regulatory or legal authority. Nothing in these Terms prevents a person from exercising rights or remedies available under law.",
        },
      ],
    },
    {
      id: "governing-law",
      title: "Governing Law",
      blocks: [
        {
          type: "paragraph",
          text: "These Terms are governed by the laws of the Republic of the Philippines and applicable ACD policies. Any legal proceeding concerning these Terms shall be brought before the proper court or authority with jurisdiction, subject to applicable law and institutional procedures.",
        },
      ],
    },
    {
      id: "severability",
      title: "Severability",
      blocks: [
        {
          type: "paragraph",
          text: "If any provision is found invalid, unlawful, or unenforceable, the remaining provisions will continue to apply to the fullest extent permitted by law.",
        },
      ],
    },
    {
      id: "no-waiver",
      title: "No Waiver",
      blocks: [
        {
          type: "paragraph",
          text: "Failure to enforce a provision on one occasion does not permanently waive the right to enforce that provision or another provision later.",
        },
      ],
    },
    {
      id: "terms-contact",
      title: "Contact Information",
      blocks: [
        {
          type: "paragraph",
          text: "Official operational, ICTC, and Data Protection Officer email addresses and telephone numbers remain pending institutional approval.",
        },
        {
          type: "bullets",
          items: [
            "System CLOIE Operational Contact: responsible ACD office, official support email, and telephone pending institutional approval",
            "Information and Communications Technology Center: Assumption College of Davao, Juan P. Cabaguio Avenue, Davao City 8000, Philippines; official email and telephone pending institutional approval",
            "ACD Data Protection Officer: official email and telephone pending institutional approval",
          ],
        },
      ],
    },
    {
      id: "user-acknowledgement",
      title: "User Acknowledgement",
      blocks: [
        {
          type: "paragraph",
          text: "By selecting Agree and Continue with Google, I confirm that I have read and understood the System CLOIE Terms of Use; will use System CLOIE only for authorized purposes; will protect my account and respect role-based access restrictions; will maintain the confidentiality of restricted information; will not manipulate evaluation results or attempt to identify respondents; and understand that System CLOIE use is also subject to the Privacy Notice and applicable ACD policies.",
        },
      ],
    },
  ],
};

export const legalDocuments = {
  privacy: privacyNotice,
  terms: termsOfUse,
} as const;
