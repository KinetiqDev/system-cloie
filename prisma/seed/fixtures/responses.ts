import { ResponseStatus } from "@prisma/client";
import { D, U } from "../constants/ids";

export interface ResponseSequence {
  log: string;
  // Deployment locator: "cbEval1" (ITRES1), "cbEval2" (MM201), or "newCb:<courseCode>" (IT201/FM200/ENG2/HTC401/EDUC11E),
  // or "central:<D constant>" for central deployments
  deploymentKey: { kind: "cb1" | "cb2" | "newCb"; courseCode: string } | { kind: "central"; id: string };
  respondentKey: keyof typeof U;
  status: ResponseStatus;
  submittedAt?: string; // ISO string, undefined for IN_PROGRESS drafts
  quantItems: { sk: string; ik: string; val: number }[];
  qualItems: { sk: string; pk: string; text: string }[];
}

export const responseSequences: ResponseSequence[] = [
  // ── 1. BSIT Course-Bound: STU_BSIT → SUBMITTED ──────────────────────
  {
    log: "    • BSIT student submitted CILO eval...",
    deploymentKey: { kind: "cb1", courseCode: "ITRES1" },
    respondentKey: "STU_BSIT",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-20T14:30:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-3", val: 4 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
      { sk: "facilities", ik: "facilities-1", val: 5 },
      { sk: "facilities", ik: "facilities-2", val: 4 },
      { sk: "facilities", ik: "facilities-3", val: 3 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "CILO 1 was fully achieved because the defense sessions gave direct practice in presenting scope and methodology.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "CILO 3 on technical feasibility was less achieved — would benefit from more lab time for prototyping.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "The computer lab needs updated software; some tools required for the course were outdated.",
      },
    ],
  },
  // ── 2. BSIT Course-Bound: GRAD_BSIT → IN_PROGRESS (draft) ───────────
  {
    log: "    • BSIT grad in-progress CILO eval...",
    deploymentKey: { kind: "cb1", courseCode: "ITRES1" },
    respondentKey: "GRAD_BSIT",
    status: ResponseStatus.IN_PROGRESS,
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 3 },
    ],
    qualItems: [],
  },
  // ── 3. BSBA Course-Bound: STU_BSBA → SUBMITTED ──────────────────────
  {
    log: "    • BSBA student submitted CILO eval...",
    deploymentKey: { kind: "cb2", courseCode: "MM201" },
    respondentKey: "STU_BSBA",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-22T10:15:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 5 },
      { sk: "facilities", ik: "facilities-1", val: 4 },
      { sk: "facilities", ik: "facilities-2", val: 4 },
      { sk: "facilities", ik: "facilities-3", val: 5 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "CILO 1 on developing a marketing plan was fully achieved — the real business project made it practical and engaging.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "CILO 2 on research methodology could use more data analytics exercises.",
      },
    ],
  },
  // ── 4. BSIT Exit Survey: GRAD_BSIT → SUBMITTED ──────────────────────
  {
    log: "    • BSIT grad submitted exit survey...",
    deploymentKey: { kind: "central", id: D.BSIT_EXIT },
    respondentKey: "GRAD_BSIT",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-18T16:00:00Z",
    quantItems: [
      { sk: "program-academic", ik: "program-academic-1", val: 5 },
      { sk: "program-academic", ik: "program-academic-2", val: 4 },
      { sk: "program-academic", ik: "program-academic-3", val: 5 },
      { sk: "program-academic", ik: "program-academic-4", val: 4 },
      { sk: "program-academic", ik: "program-academic-5", val: 3 },
      { sk: "learning-outcomes", ik: "learning-outcomes-1", val: 5 },
      { sk: "learning-outcomes", ik: "learning-outcomes-2", val: 5 },
      { sk: "learning-outcomes", ik: "learning-outcomes-3", val: 4 },
      { sk: "learning-outcomes", ik: "learning-outcomes-4", val: 4 },
      { sk: "learning-outcomes", ik: "learning-outcomes-5", val: 4 },
      { sk: "facilities", ik: "facilities-1", val: 4 },
      { sk: "facilities", ik: "facilities-2", val: 3 },
      { sk: "facilities", ik: "facilities-3", val: 4 },
      { sk: "facilities", ik: "facilities-4", val: 3 },
      { sk: "blended-learning", ik: "blended-learning-1", val: 4 },
      { sk: "blended-learning", ik: "blended-learning-2", val: 4 },
      { sk: "blended-learning", ik: "blended-learning-3", val: 3 },
      { sk: "blended-learning", ik: "blended-learning-4", val: 4 },
      { sk: "mission-formation", ik: "mission-formation-1", val: 5 },
      { sk: "mission-formation", ik: "mission-formation-2", val: 4 },
      { sk: "mission-formation", ik: "mission-formation-3", val: 5 },
      { sk: "mission-formation", ik: "mission-formation-4", val: 5 },
      { sk: "overall-satisfaction", ik: "overall-satisfaction-1", val: 4 },
      { sk: "overall-satisfaction", ik: "overall-satisfaction-2", val: 4 },
      { sk: "overall-satisfaction", ik: "overall-satisfaction-3", val: 5 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "The capstone project and internship were the most valuable parts of the program — they connected theory to practice.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "Career services could be more proactive in connecting students with industry partners before graduation.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "Blended learning worked well overall but asynchronous activities sometimes lacked clear deadlines.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-4",
        text: "Consider adding more elective courses in emerging technologies like AI/ML and cloud computing.",
      },
    ],
  },
  // ── 5. BSIT Alumni Eval: ALU_BSIT → SUBMITTED ───────────────────────
  {
    log: "    • BSIT alumni submitted alumni eval...",
    deploymentKey: { kind: "central", id: D.BSIT_ALUMNI },
    respondentKey: "ALU_BSIT",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-19T11:00:00Z",
    quantItems: [
      { sk: "program-experience", ik: "program-experience-1", val: 5 },
      { sk: "program-experience", ik: "program-experience-2", val: 4 },
      { sk: "program-experience", ik: "program-experience-3", val: 4 },
      { sk: "graduate-outcomes", ik: "graduate-outcomes-1", val: 5 },
      { sk: "graduate-outcomes", ik: "graduate-outcomes-2", val: 4 },
      { sk: "graduate-outcomes", ik: "graduate-outcomes-3", val: 4 },
      { sk: "graduate-outcomes", ik: "graduate-outcomes-4", val: 5 },
      { sk: "graduate-outcomes", ik: "graduate-outcomes-5", val: 4 },
      { sk: "employment-readiness", ik: "employment-readiness-1", val: 3 },
      { sk: "employment-readiness", ik: "employment-readiness-2", val: 4 },
      { sk: "employment-readiness", ik: "employment-readiness-3", val: 4 },
      { sk: "overall-assessment", ik: "overall-assessment-1", val: 4 },
      { sk: "overall-assessment", ik: "overall-assessment-2", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "Strong foundation in programming and systems development. Faculty were knowledgeable and supportive.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "More industry exposure during the program — internships should be longer and start earlier.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "Add certifications prep (AWS, Google Cloud) to the curriculum for better employability.",
      },
    ],
  },
  // ── 6. BSIT Industry Eval: IND_BSIT → SUBMITTED ─────────────────────
  {
    log: "    • BSIT industry partner submitted eval...",
    deploymentKey: { kind: "central", id: D.BSIT_IND },
    respondentKey: "IND_BSIT",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-21T09:30:00Z",
    quantItems: [
      { sk: "knowledge", ik: "knowledge-1", val: 3 },
      { sk: "knowledge", ik: "knowledge-2", val: 4 },
      { sk: "knowledge", ik: "knowledge-3", val: 4 },
      { sk: "skills", ik: "skills-1", val: 4 },
      { sk: "skills", ik: "skills-2", val: 3 },
      { sk: "skills", ik: "skills-3", val: 4 },
      { sk: "skills", ik: "skills-4", val: 5 },
      { sk: "professional-traits", ik: "professional-traits-1", val: 5 },
      { sk: "professional-traits", ik: "professional-traits-2", val: 4 },
      { sk: "professional-traits", ik: "professional-traits-3", val: 4 },
      { sk: "professional-traits", ik: "professional-traits-4", val: 4 },
      { sk: "overall-readiness", ik: "overall-readiness-1", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "Strong work ethic and willingness to learn. Good teamwork and communication skills.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "Could improve on time management and initiative in handling complex tasks independently.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "More hands-on experience with enterprise tools and agile methodologies would help.",
      },
      { sk: "recommendation", pk: "recommendation-1", text: "Yes" },
    ],
  },
  // ── 7. BSHM Exit Survey: STU_BSHM_G → SUBMITTED ─────────────────────
  {
    log: "    • BSHM grad submitted exit survey...",
    deploymentKey: { kind: "central", id: D.BSHM_EXIT },
    respondentKey: "STU_BSHM_G",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-22T15:00:00Z",
    quantItems: [
      { sk: "program-academic", ik: "program-academic-1", val: 4 },
      { sk: "program-academic", ik: "program-academic-2", val: 4 },
      { sk: "program-academic", ik: "program-academic-3", val: 5 },
      { sk: "program-academic", ik: "program-academic-4", val: 5 },
      { sk: "program-academic", ik: "program-academic-5", val: 4 },
      { sk: "learning-outcomes", ik: "learning-outcomes-1", val: 4 },
      { sk: "learning-outcomes", ik: "learning-outcomes-2", val: 5 },
      { sk: "learning-outcomes", ik: "learning-outcomes-3", val: 4 },
      { sk: "learning-outcomes", ik: "learning-outcomes-4", val: 5 },
      { sk: "learning-outcomes", ik: "learning-outcomes-5", val: 4 },
      { sk: "facilities", ik: "facilities-1", val: 4 },
      { sk: "facilities", ik: "facilities-2", val: 5 },
      { sk: "facilities", ik: "facilities-3", val: 3 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "blended-learning", ik: "blended-learning-1", val: 4 },
      { sk: "blended-learning", ik: "blended-learning-2", val: 3 },
      { sk: "blended-learning", ik: "blended-learning-3", val: 3 },
      { sk: "blended-learning", ik: "blended-learning-4", val: 4 },
      { sk: "mission-formation", ik: "mission-formation-1", val: 4 },
      { sk: "mission-formation", ik: "mission-formation-2", val: 5 },
      { sk: "mission-formation", ik: "mission-formation-3", val: 4 },
      { sk: "mission-formation", ik: "mission-formation-4", val: 4 },
      { sk: "overall-satisfaction", ik: "overall-satisfaction-1", val: 4 },
      { sk: "overall-satisfaction", ik: "overall-satisfaction-2", val: 5 },
      { sk: "overall-satisfaction", ik: "overall-satisfaction-3", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "The hands-on kitchen and front office practicum were excellent. Faculty brought real industry experience.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "Need more partnerships with international hotel chains for internship placements.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "Online modules for theory courses worked well, but practical labs should always be face-to-face.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-4",
        text: "Consider adding a wine and beverage management elective.",
      },
    ],
  },
  // ── 8. BSHM Industry Eval: IND_BSHM → SUBMITTED ─────────────────────
  {
    log: "    • BSHM industry partner submitted eval...",
    deploymentKey: { kind: "central", id: D.BSHM_IND },
    respondentKey: "IND_BSHM",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-23T10:00:00Z",
    quantItems: [
      { sk: "knowledge", ik: "knowledge-1", val: 5 },
      { sk: "knowledge", ik: "knowledge-2", val: 4 },
      { sk: "knowledge", ik: "knowledge-3", val: 4 },
      { sk: "skills", ik: "skills-1", val: 5 },
      { sk: "skills", ik: "skills-2", val: 3 },
      { sk: "skills", ik: "skills-3", val: 5 },
      { sk: "skills", ik: "skills-4", val: 4 },
      { sk: "professional-traits", ik: "professional-traits-1", val: 5 },
      { sk: "professional-traits", ik: "professional-traits-2", val: 4 },
      { sk: "professional-traits", ik: "professional-traits-3", val: 5 },
      { sk: "professional-traits", ik: "professional-traits-4", val: 4 },
      { sk: "overall-readiness", ik: "overall-readiness-1", val: 5 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "Excellent customer service skills and positive attitude. Well-prepared for front office operations.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "Need more training on hotel management software systems and reservation platforms.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "Add more focus on event management and banquet operations in the curriculum.",
      },
      { sk: "recommendation", pk: "recommendation-1", text: "Yes" },
    ],
  },
  // ── 9. IT201: STU_BSIT → SUBMITTED ───────────────────────────────────
  {
    log: "    • BSIT IT201 student submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "IT201" },
    respondentKey: "STU_BSIT",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-24T10:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-3", val: 4 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
      { sk: "facilities", ik: "facilities-1", val: 5 },
      { sk: "facilities", ik: "facilities-2", val: 4 },
      { sk: "facilities", ik: "facilities-3", val: 4 },
      { sk: "facilities", ik: "facilities-4", val: 3 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "The hands-on coding exercises for linked lists and trees were very effective in solidifying CILO 1.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "Big-O analysis (CILO 2) needed more worked examples — more practice problems would help.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "More lab computers with up-to-date IDEs would support algorithm visualization better.",
      },
    ],
  },
  // ── 10. IT201: GRAD_BSIT → IN_PROGRESS ──────────────────────────────
  {
    log: "    • BSIT IT201 grad in-progress CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "IT201" },
    respondentKey: "GRAD_BSIT",
    status: ResponseStatus.IN_PROGRESS,
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 5 },
    ],
    qualItems: [],
  },
  // ── 11. FM200: STU_BSBA_G → SUBMITTED ──────────────────────────────
  {
    log: "    • BSBA FM200 student submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "FM200" },
    respondentKey: "STU_BSBA_G",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-25T09:30:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 5 },
      { sk: "facilities", ik: "facilities-1", val: 4 },
      { sk: "facilities", ik: "facilities-2", val: 3 },
      { sk: "facilities", ik: "facilities-3", val: 4 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "Preparing the complete accounting cycle from journal entries to financial statements was highly practical.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "More case studies involving local SMEs would make the content more relatable.",
      },
    ],
  },
  // ── 12. FM200: STU_BSBA → IN_PROGRESS ──────────────────────────────
  {
    log: "    • BSBA FM200 student in-progress CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "FM200" },
    respondentKey: "STU_BSBA",
    status: ResponseStatus.IN_PROGRESS,
    quantItems: [{ sk: "cilo-items", ik: "cilo-attainment-1", val: 4 }],
    qualItems: [],
  },
  // ── 13. ENG2: STU_BSED → SUBMITTED ───────────────────────────────
  {
    log: "    • BSED ENG2 student submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "ENG2" },
    respondentKey: "STU_BSED",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-24T14:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-3", val: 4 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
      { sk: "facilities", ik: "facilities-1", val: 4 },
      { sk: "facilities", ik: "facilities-2", val: 3 },
      { sk: "facilities", ik: "facilities-3", val: 4 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "Designing rubrics and formative assessments was fully achieved — the workshop format was excellent.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "More practice in interpreting standardized test results would strengthen CILO 2 attainment.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "Access to more sample assessment tools from actual schools would be helpful for reference.",
      },
    ],
  },
  // ── 14. HTC401: STU_BSHM_G → SUBMITTED ───────────────────────────────
  {
    log: "    • BSHM HTC401 student submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "HTC401" },
    respondentKey: "STU_BSHM_G",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-26T11:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 5 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 5 },
      { sk: "facilities", ik: "facilities-1", val: 5 },
      { sk: "facilities", ik: "facilities-2", val: 4 },
      { sk: "facilities", ik: "facilities-3", val: 4 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "facilities", ik: "facilities-5", val: 5 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "The actual event simulation with industry guests made CILO 1 highly engaging and professionally relevant.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "Budget management tools like spreadsheets and event planning software should be taught more deeply.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "The event venue and AV equipment were excellent and contributed to a realistic learning experience.",
      },
    ],
  },
  // ── 15. HTC401: STU_BSHM → IN_PROGRESS ───────────────────────────────
  {
    log: "    • BSHM HTC401 student in-progress CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "HTC401" },
    respondentKey: "STU_BSHM",
    status: ResponseStatus.IN_PROGRESS,
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
    ],
    qualItems: [],
  },
  // ── 16. EDUC11E: STU_BEED → SUBMITTED ───────────────────────────────
  {
    log: "    • BEED EDUC11E student submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "EDUC11E" },
    respondentKey: "STU_BEED",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-25T15:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 5 },
      { sk: "facilities", ik: "facilities-1", val: 4 },
      { sk: "facilities", ik: "facilities-2", val: 4 },
      { sk: "facilities", ik: "facilities-3", val: 3 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "Practicum supervisor feedback sessions helped me fully achieve classroom management strategies.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "More practicum hours in inclusive classrooms would strengthen lesson planning for diverse learners.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "Better projectors and printed instructional materials in cooperating schools are needed.",
      },
    ],
  },
];
