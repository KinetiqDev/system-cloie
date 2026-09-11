import { ResponseStatus } from "@prisma/client";
import { D, U } from "../constants/ids";

export interface ResponseSequence {
  log: string;
  // Deployment locator: "cbEval1" (ITRES1), "cbEval2" (MM201), or "newCb:<courseCode>" (IT201/FM200/ENG2/HTC401/EDUC11E),
  // or "central:<D constant>" for central deployments
  deploymentKey:
    | { kind: "cb1" | "cb2" | "newCb"; courseCode: string }
    | { kind: "central"; id: string };
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
        text: "Comparing financing options and evaluating their effect on organizational decisions made financial management concepts practical.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "More examples using financial ratios and management scenarios would help connect analysis to planning and control.",
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
        text: "Comparing first- and second-language acquisition theories helped me connect language learning factors to classroom practice.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "More classroom examples showing how acquisition theories shape instruction would strengthen my understanding.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "Discussing learner differences and language development made the principles easier to apply.",
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
        text: "Developing a tourism and hospitality business plan made entrepreneurial opportunity assessment practical.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "More local venture case studies would help us evaluate feasibility, marketing, and financial viability.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "Market research and budgeting exercises made the realities of hospitality entrepreneurship clearer.",
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
  // ── 17–18. GEETHICS (GE): STU_BEED + STU_BSED → SUBMITTED ────────────
  // The only Course-bound GENERAL_EDUCATION responses with qualitative
  // items; they make the Gen Ed Coordinator analytics workspace render its
  // qualitative evidence region. GEETHICS is referenced by no other journey.
  {
    log: "    • BEED GEETHICS student submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "GEETHICS" },
    respondentKey: "STU_BEED",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-27T10:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 5 },
      { sk: "facilities", ik: "facilities-1", val: 4 },
      { sk: "facilities", ik: "facilities-2", val: 4 },
      { sk: "facilities", ik: "facilities-3", val: 4 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "facilities", ik: "facilities-5", val: 5 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "Case studies on moral dilemmas made utilitarian and deontological frameworks concrete and easy to apply.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "Small-group debates were sometimes dominated by a few voices; rotating facilitation would balance participation.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "Reading packets arrived late in the semester; earlier access to articles would help preparation.",
      },
    ],
  },
  {
    log: "    • BSED GEETHICS student submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "GEETHICS" },
    respondentKey: "STU_BSED",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-27T11:30:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 5 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
      { sk: "facilities", ik: "facilities-1", val: 5 },
      { sk: "facilities", ik: "facilities-2", val: 4 },
      { sk: "facilities", ik: "facilities-3", val: 4 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "Applying virtue ethics to real teaching scenarios clarified how character formation guides classroom decisions.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "The assessment rubric for reflection essays was unclear; worked examples would set clearer expectations.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "Guest lecture on professional ethics codes was engaging and connected theory to licensure practice.",
      },
    ],
  },
  // ── 19–23. IT201: five new BSIT respondents → SUBMITTED ───────────────
  // Together with the existing STU_BSIT submission this gives the IT201
  // Faculty scope six distinct submitted respondents (floor: five).
  {
    log: "    • BSIT IT201 student Q1 submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "IT201" },
    respondentKey: "STU_BSIT_Q1",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-28T10:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-3", val: 5 },
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
        text: "I loved the coding sessions because the examples made linked lists and trees feel easy to build.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "The deadlines felt unfair during defense weeks because the workload piled up faster than I could finish.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "The lab time helped me finish my tasks and the feedback after each exercise kept me on track.",
      },
    ],
  },
  {
    log: "    • BSIT IT201 student Q2 submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "IT201" },
    respondentKey: "STU_BSIT_Q2",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-28T11:30:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-3", val: 3 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
      { sk: "facilities", ik: "facilities-1", val: 4 },
      { sk: "facilities", ik: "facilities-2", val: 3 },
      { sk: "facilities", ik: "facilities-3", val: 3 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "I loved the practical exercises and the generous examples made every difficult topic feel clear and rewarding.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "The lab computers were slow and several tools we needed were outdated and frustrating to use.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "The lessons followed the weekly plan and the examples lined up with the topics we covered in class.",
      },
    ],
  },
  {
    log: "    • BSIT IT201 student Q3 submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "IT201" },
    respondentKey: "STU_BSIT_Q3",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-28T14:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-3", val: 4 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 5 },
      { sk: "facilities", ik: "facilities-1", val: 5 },
      { sk: "facilities", ik: "facilities-2", val: 5 },
      { sk: "facilities", ik: "facilities-3", val: 4 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "facilities", ik: "facilities-5", val: 5 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "My teacher gave generous feedback and the relaxed lab time made learning genuinely enjoyable for me.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "The workload was crushing and the shifting deadlines left me confused about what to finish first.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "I submitted every task on time and I kept notes on each topic so I could review before the next meeting.",
      },
    ],
  },
  {
    log: "    • BSIT IT201 student Q4 submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "IT201" },
    respondentKey: "STU_BSIT_Q4",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-29T09:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 3 },
      { sk: "cilo-items", ik: "cilo-attainment-3", val: 4 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
      { sk: "facilities", ik: "facilities-1", val: 4 },
      { sk: "facilities", ik: "facilities-2", val: 4 },
      { sk: "facilities", ik: "facilities-3", val: 3 },
      { sk: "facilities", ik: "facilities-4", val: 3 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "Our group split the tasks evenly and we met after class to compare notes and fix errors in our work.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "The instructions for the last project were unclear and the vague examples made things worse for me and my group.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "I suggest more lab time so my group can finish the assigned tasks without rushing at the end.",
      },
    ],
  },
  {
    log: "    • BSIT IT201 student Q5 submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "IT201" },
    respondentKey: "STU_BSIT_Q5",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-29T10:30:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-3", val: 4 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
      { sk: "facilities", ik: "facilities-1", val: 4 },
      { sk: "facilities", ik: "facilities-2", val: 4 },
      { sk: "facilities", ik: "facilities-3", val: 4 },
      { sk: "facilities", ik: "facilities-4", val: 5 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "I loved how the lessons connected theory to practice and the lively discussions kept me engaged.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "The vague feedback on my late work was useless and the unfair deductions left me frustrated and discouraged.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "I read the assigned pages before each meeting and I asked questions whenever a step was unfamiliar.",
      },
    ],
  },
  // ── 24–28. ITRES1: same five BSIT respondents → SUBMITTED ─────────────
  // Same five students take both courses (STU_BSIT precedent: entries 1+9),
  // so the ITRES1 Faculty scope also reaches six submitted respondents.
  {
    log: "    • BSIT ITRES1 student Q1 submitted CILO eval...",
    deploymentKey: { kind: "cb1", courseCode: "ITRES1" },
    respondentKey: "STU_BSIT_Q1",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-29T14:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-3", val: 4 },
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
        text: "I loved defending our scope because the panel feedback was encouraging and full of useful guidance.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "The deadline pressure was awful and the overlapping workload from other subjects drained my energy.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "We divided the proposal chapters among members and we merged the drafts during our weekend meetings.",
      },
    ],
  },
  {
    log: "    • BSIT ITRES1 student Q2 submitted CILO eval...",
    deploymentKey: { kind: "cb1", courseCode: "ITRES1" },
    respondentKey: "STU_BSIT_Q2",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-30T09:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 3 },
      { sk: "cilo-items", ik: "cilo-attainment-3", val: 4 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
      { sk: "facilities", ik: "facilities-1", val: 4 },
      { sk: "facilities", ik: "facilities-2", val: 3 },
      { sk: "facilities", ik: "facilities-3", val: 4 },
      { sk: "facilities", ik: "facilities-4", val: 3 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "Our research plan sessions were excellent and the writing examples showed me what a strong draft looks like.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "Team meetings often felt pointless because I watched half the members skip them while deadlines kept slipping.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "I kept a log of adviser comments and I revised the same pages until the wording read plainly.",
      },
    ],
  },
  {
    log: "    • BSIT ITRES1 student Q3 submitted CILO eval...",
    deploymentKey: { kind: "cb1", courseCode: "ITRES1" },
    respondentKey: "STU_BSIT_Q3",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-30T10:30:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-3", val: 5 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
      { sk: "facilities", ik: "facilities-1", val: 5 },
      { sk: "facilities", ik: "facilities-2", val: 5 },
      { sk: "facilities", ik: "facilities-3", val: 3 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "I am grateful for the patient mentoring and the kind feedback that shaped our study into something solid.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "The printing and transport costs were painful for my budget and the repeated revisions were exhausting.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "I described our prototype step by step and I grouped the finished modules with notes on the unfinished ones.",
      },
    ],
  },
  {
    log: "    • BSIT ITRES1 student Q4 submitted CILO eval...",
    deploymentKey: { kind: "cb1", courseCode: "ITRES1" },
    respondentKey: "STU_BSIT_Q4",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-30T13:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 3 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-3", val: 3 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 3 },
      { sk: "facilities", ik: "facilities-1", val: 3 },
      { sk: "facilities", ik: "facilities-2", val: 4 },
      { sk: "facilities", ik: "facilities-3", val: 3 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "facilities", ik: "facilities-5", val: 3 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "I loved the library sessions because the quiet space and the ready references made writing pleasant.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "The panel questions were brutal and the confusing comments on our paper left our group discouraged.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "We ordered our slides by chapter and we assigned each speaker a fixed sequence for the panel talk.",
      },
    ],
  },
  {
    log: "    • BSIT ITRES1 student Q5 submitted CILO eval...",
    deploymentKey: { kind: "cb1", courseCode: "ITRES1" },
    respondentKey: "STU_BSIT_Q5",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-30T15:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-3", val: 4 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
      { sk: "facilities", ik: "facilities-1", val: 4 },
      { sk: "facilities", ik: "facilities-2", val: 4 },
      { sk: "facilities", ik: "facilities-3", val: 5 },
      { sk: "facilities", ik: "facilities-4", val: 4 },
      { sk: "facilities", ik: "facilities-5", val: 5 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "I am proud of our finished proposal and thankful for classmates who shared strong examples.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "The laboratory schedule was terrible for my work shifts and the missed sessions left me stressed and far behind.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "I tracked every deadline on a wall calendar and I checked off tasks as soon as our group finished them.",
      },
    ],
  },
  // ── 29–31. HTC401: three new BSHM respondents → SUBMITTED ─────────────
  // With the existing STU_BSHM_G submission the HTC401 scope holds four
  // distinct submitted respondents (Program Head view has no floor).
  {
    log: "    • BSHM HTC401 student Q1 submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "HTC401" },
    respondentKey: "STU_BSHM_Q1",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-28T15:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
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
        text: "I loved building our business plan because the costing examples made pricing feel simple and fair.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "The group workload was unfair and the delayed feedback on our drafts left us anxious until the very end.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "I visited a food vendor near the market and I asked about daily menus and closing routines.",
      },
    ],
  },
  {
    log: "    • BSHM HTC401 student Q2 submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "HTC401" },
    respondentKey: "STU_BSHM_Q2",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-29T11:00:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 3 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 3 },
      { sk: "facilities", ik: "facilities-1", val: 3 },
      { sk: "facilities", ik: "facilities-2", val: 3 },
      { sk: "facilities", ik: "facilities-3", val: 4 },
      { sk: "facilities", ik: "facilities-4", val: 3 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "The field visit was wonderful and the warm staff showed us how gracious service wins loyal guests.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "The kitchen tools we borrowed were broken and the disappointing setup wasted our whole practice day.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "I copied two sample menus into my notebook and I marked the dishes our group planned to cook and serve.",
      },
    ],
  },
  {
    log: "    • BSHM HTC401 student Q3 submitted CILO eval...",
    deploymentKey: { kind: "newCb", courseCode: "HTC401" },
    respondentKey: "STU_BSHM_Q3",
    status: ResponseStatus.SUBMITTED,
    submittedAt: "2026-04-29T15:30:00Z",
    quantItems: [
      { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
      { sk: "cilo-items", ik: "cilo-attainment-2", val: 5 },
      { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
      { sk: "facilities", ik: "facilities-1", val: 4 },
      { sk: "facilities", ik: "facilities-2", val: 4 },
      { sk: "facilities", ik: "facilities-3", val: 4 },
      { sk: "facilities", ik: "facilities-4", val: 5 },
      { sk: "facilities", ik: "facilities-5", val: 4 },
    ],
    qualItems: [
      {
        sk: "qualitative",
        pk: "qualitative-1",
        text: "I am excited about hospitality work because the enterprise examples opened my eyes to real ventures.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-2",
        text: "Tight deadlines ruined my sleep schedule and the endless revisions made the workload feel unbearable.",
      },
      {
        sk: "qualitative",
        pk: "qualitative-3",
        text: "I read the handouts twice and I summarized each venture case in my own words for the group report.",
      },
    ],
  },
];
