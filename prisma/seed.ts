import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import {
  AcademicPeriodStatus,
  AcademicSemester,
  AcademicTerm,
  CourseScope,
  DeploymentStatus,
  DeploymentType,
  EvaluationTemplateType,
  InviteStatus,
  Prisma,
  ResponseStatus,
  SystemRole,
  TargetStakeholder,
  VerificationStatus,
  YearLevel,
} from "@prisma/client";
import { prisma } from "../src/lib/db/prisma";

// ═══════════════════════════════════════════════════════════════════════════════
// Types (mirrors src/features/instruments/types.ts for seed-only usage)
// ═══════════════════════════════════════════════════════════════════════════════

interface LikertDescriptor {
  value: number;
  label: string;
}

interface TemplateQuestion {
  key: string;
  prompt: string;
  type: "likert" | "guided_open_ended";
  order: number;
  required: boolean;
  likertDescriptors?: LikertDescriptor[];
  suggestedResponses?: string[];
}

interface TemplateSection {
  key: string;
  title: string;
  description?: string;
  order: number;
  questions: TemplateQuestion[];
}

type TemplateStructure = TemplateSection[];

// ═══════════════════════════════════════════════════════════════════════════════
// UUID Constants
// ═══════════════════════════════════════════════════════════════════════════════

const U = {
  ADMIN: "11111111-1111-4111-8111-111111111111",
  DEAN: "22222222-2222-4222-8222-222222222222",
  PH_BSIT: "33333333-3333-4333-8333-333333333333",
  FAC_BSIT: "44444444-4444-4444-8444-444444444444",
  STU_BSIT: "55555555-5555-4555-8555-555555555555",
  GRAD_BSIT: "66666666-6666-4666-8666-666666666666",
  ALU_BSIT: "77777777-7777-4777-8777-777777777777",
  IND_BSIT: "88888888-8888-4888-8888-888888888888",
  PH_BEED: "a1111111-1111-4111-8111-111111111111",
  PH_BSED: "a2222222-2222-4222-8222-222222222222",
  PH_BSSW: "a3333333-3333-4333-8333-333333333333",
  PH_BSBA: "a4444444-4444-4444-8444-444444444444",
  PH_BSHM: "a5555555-5555-4555-8555-555555555555",
  FAC_BSED: "b1111111-1111-4111-8111-111111111111",
  FAC_BSBA: "b2222222-2222-4222-8222-222222222222",
  FAC_BSHM: "b3333333-3333-4333-8333-333333333333",
  STU_BSED: "c1111111-1111-4111-8111-111111111111",
  STU_BSBA: "c2222222-2222-4222-8222-222222222222",
  STU_BSBA_G: "c3333333-3333-4333-8333-333333333333",
  STU_BEED: "c4444444-4444-4444-8444-444444444444",
  STU_BSHM: "c5555555-5555-4555-8555-555555555555",
  STU_BSHM_G: "c6666666-6666-4666-8666-666666666666",
  ALU_BSBA: "d1111111-1111-4111-8111-111111111111",
  IND_BSHM: "d2222222-2222-4222-8222-222222222222",
} as const;

const D = {
  BSIT_EXIT: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  BSIT_ALUMNI: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  BSIT_IND: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  BSHM_EXIT: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  BSHM_IND: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  CB_BSIT_IT201: "f1111111-1111-4111-8111-111111111111",
  CB_BSBA_FIN101: "f2222222-2222-4222-8222-222222222222",
  CB_BSED_EDUC301: "f3333333-3333-4333-8333-333333333333",
  CB_BSHM_HM401: "f4444444-4444-4444-8444-444444444444",
  CB_BEED_BEED301: "f5555555-5555-4555-8555-555555555555",
  CB_BSSW_SW301: "f6666666-6666-4666-8666-666666666666",
  // School Years
  SY_2026_2027: "e1111111-1111-4111-8111-111111111111",
  SY_2027_2028: "e2222222-2222-4222-8222-222222222222",
  // Term Instances (Slice 1 lifecycle fixtures: 1 ACTIVE, 1 COMPLETED, 1 PLANNED, 1 CANCELLED)
  TI_2026_2027_1ST: "e3333333-3333-4333-8333-333333333333",
  TI_2026_2027_2ND: "e4444444-4444-4444-8444-444444444444",
  TI_2027_2028_1ST: "e5555555-5555-4555-8555-555555555555",
  TI_2027_2028_2ND_CANCELLED: "e6666666-4666-4666-8666-666666666666",
  // Course Assignments (faculty-course-term links)
  CA_BSIT_IT201: "e6666666-6666-4666-8666-666666666666",
  CA_BSBA_FIN101: "e7777777-7777-4777-8777-777777777777",
  CA_BSED_EDUC301: "e8888888-8888-4888-8888-888888888888",
  CA_BSHM_HM401: "e9999999-9999-4999-8999-999999999999",
  CA_BEED_BEED301: "ea111111-1111-4111-8111-111111111111",
  CA_BSSW_SW301: "ea222222-2222-4222-8222-222222222222",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Likert Descriptors
// ═══════════════════════════════════════════════════════════════════════════════

const CILO_LK: LikertDescriptor[] = [
  { value: 1, label: "Not Achieved" },
  { value: 2, label: "Slightly Achieved" },
  { value: 3, label: "Moderately Achieved" },
  { value: 4, label: "Mostly Achieved" },
  { value: 5, label: "Fully Achieved" },
];
const AGR5: LikertDescriptor[] = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];
const AGR4: LikertDescriptor[] = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Agree" },
  { value: 4, label: "Strongly Agree" },
];
const EV4: LikertDescriptor[] = [
  { value: 1, label: "Not Evident" },
  { value: 2, label: "Partially Evident" },
  { value: 3, label: "Evident" },
  { value: 4, label: "Highly Evident" },
];
const EV5: LikertDescriptor[] = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Satisfactory" },
  { value: 4, label: "Very Satisfactory" },
  { value: 5, label: "Excellent" },
];

// helper to make likert questions
function lq(
  key: string,
  prompt: string,
  order: number,
  desc: LikertDescriptor[]
): TemplateQuestion {
  return { key, prompt, type: "likert", order, required: true, likertDescriptors: desc };
}
function oq(key: string, prompt: string, order: number, suggested?: string[]): TemplateQuestion {
  const q: TemplateQuestion = { key, prompt, type: "guided_open_ended", order, required: false };
  if (suggested) q.suggestedResponses = suggested;
  return q;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Template Structures
// ═══════════════════════════════════════════════════════════════════════════════

const ciloEvalStructure: TemplateStructure = [
  {
    key: "cilo-items",
    title: "Course Intended Learning Outcomes Evaluation",
    description:
      "Faculty bind each saved CILO to one Likert item before publishing this course-bound tool.",
    order: 1,
    questions: [
      lq("cilo-attainment-1", "I achieved the first course intended learning outcome.", 1, CILO_LK),
      lq(
        "cilo-attainment-2",
        "I achieved the second course intended learning outcome.",
        2,
        CILO_LK
      ),
      lq("cilo-attainment-3", "I achieved the third course intended learning outcome.", 3, CILO_LK),
    ],
  },
  {
    key: "overall-attainment",
    title: "Overall Course Outcome Attainment",
    order: 2,
    questions: [
      lq(
        "overall-attainment-1",
        "Overall, the course enabled me to achieve its intended learning outcomes",
        1,
        CILO_LK
      ),
    ],
  },
  {
    key: "facilities",
    title: "Facilities and Learning Resources Evaluation",
    order: 3,
    questions: [
      lq("facilities-1", "The classrooms were conducive to learning", 1, CILO_LK),
      lq(
        "facilities-2",
        "Laboratory facilities (if applicable) supported the learning outcomes",
        2,
        CILO_LK
      ),
      lq(
        "facilities-3",
        "Equipment, tools, or software required for the course were adequate",
        3,
        CILO_LK
      ),
      lq(
        "facilities-4",
        "Library, online resources, or learning materials were sufficient",
        4,
        CILO_LK
      ),
      lq(
        "facilities-5",
        "Overall, the facilities supported effective delivery of the subject",
        5,
        CILO_LK
      ),
    ],
  },
  {
    key: "qualitative",
    title: "Qualitative Feedback",
    description: "Optional open-ended feedback on your learning experience.",
    order: 4,
    questions: [
      oq("qualitative-1", "Which learning outcomes were fully achieved? Why?", 1),
      oq("qualitative-2", "Which learning outcomes were least achieved? Why?", 2),
      oq(
        "qualitative-3",
        "What facilities or resources need improvement to better support learning?",
        3
      ),
    ],
  },
];

const exitSurveyStructure: TemplateStructure = [
  {
    key: "program-academic",
    title: "Program and Academic Experience",
    order: 1,
    questions: [
      lq(
        "program-academic-1",
        "The curriculum of my program was relevant and aligned with industry or professional standards.",
        1,
        AGR5
      ),
      lq("program-academic-2", "Courses were well-organized and appropriately sequenced.", 2, AGR5),
      lq(
        "program-academic-3",
        "Faculty members demonstrated strong subject expertise and effective teaching strategies.",
        3,
        AGR5
      ),
      lq(
        "program-academic-4",
        "Learning activities (lectures, discussions, projects, practicum, internships) supported my understanding of course outcomes.",
        4,
        AGR5
      ),
      lq(
        "program-academic-5",
        "Academic advising and program-level support were accessible and helpful.",
        5,
        AGR5
      ),
    ],
  },
  {
    key: "learning-outcomes",
    title: "Learning Outcomes and Skills Development",
    order: 2,
    questions: [
      lq(
        "learning-outcomes-1",
        "My program helped me develop critical thinking and problem-solving skills.",
        1,
        AGR5
      ),
      lq(
        "learning-outcomes-2",
        "I gained practical and technical skills relevant to my field of study.",
        2,
        AGR5
      ),
      lq(
        "learning-outcomes-3",
        "The program enhanced my communication skills (oral and written).",
        3,
        AGR5
      ),
      lq(
        "learning-outcomes-4",
        "I developed the ability to work effectively in teams and diverse environments.",
        4,
        AGR5
      ),
      lq(
        "learning-outcomes-5",
        "Ethical responsibility, professionalism, and social awareness were emphasized in my program.",
        5,
        AGR5
      ),
    ],
  },
  {
    key: "facilities",
    title: "Learning Environment and Facilities",
    order: 3,
    questions: [
      lq(
        "facilities-1",
        "Classrooms were conducive to learning in terms of space, lighting, ventilation, and seating.",
        1,
        AGR5
      ),
      lq(
        "facilities-2",
        "Laboratories, kitchens, offices, libraries, and other specialized facilities adequately supported my program requirements.",
        2,
        AGR5
      ),
      lq(
        "facilities-3",
        "Instructional technologies (LMS, computers, internet access, audiovisual tools) supported my learning effectively.",
        3,
        AGR5
      ),
      lq(
        "facilities-4",
        "Campus facilities (restrooms, study areas, common spaces, safety and security) were well-maintained and accessible.",
        4,
        AGR5
      ),
    ],
  },
  {
    key: "blended-learning",
    title: "Blended Learning Experience",
    order: 4,
    questions: [
      lq(
        "blended-learning-1",
        "The blended learning schedule was clearly communicated and well-organized.",
        1,
        AGR5
      ),
      lq(
        "blended-learning-2",
        "The balance between face-to-face and asynchronous classes supported my learning needs.",
        2,
        AGR5
      ),
      lq(
        "blended-learning-3",
        "Online and asynchronous learning materials were accessible, engaging, and aligned with course outcomes.",
        3,
        AGR5
      ),
      lq(
        "blended-learning-4",
        "Faculty provided adequate guidance, feedback, and support during asynchronous learning days.",
        4,
        AGR5
      ),
    ],
  },
  {
    key: "mission-formation",
    title: "Mission-Oriented Formation",
    order: 5,
    questions: [
      lq(
        "mission-formation-1",
        "My college experience strengthened my sense of Christ-centeredness and values.",
        1,
        AGR5
      ),
      lq(
        "mission-formation-2",
        "I was given opportunities to develop leadership skills inside and outside the classroom.",
        2,
        AGR5
      ),
      lq(
        "mission-formation-3",
        "The program promoted fairness, integrity, and a commitment to justice and service.",
        3,
        AGR5
      ),
      lq(
        "mission-formation-4",
        "I was challenged to pursue excellence in my academic, personal, and professional growth.",
        4,
        AGR5
      ),
    ],
  },
  {
    key: "overall-satisfaction",
    title: "Overall Satisfaction",
    order: 6,
    questions: [
      lq(
        "overall-satisfaction-1",
        "Overall, I am satisfied with my experience in the College.",
        1,
        AGR5
      ),
      lq(
        "overall-satisfaction-2",
        "My program adequately prepared me for employment, further studies, licensure, or entrepreneurship.",
        2,
        AGR5
      ),
      lq(
        "overall-satisfaction-3",
        "I would recommend my program and the College to prospective students.",
        3,
        AGR5
      ),
    ],
  },
  {
    key: "qualitative",
    title: "Qualitative Feedback",
    order: 7,
    questions: [
      oq(
        "qualitative-1",
        "What aspects of your program or college experience did you find most valuable?",
        1
      ),
      oq("qualitative-2", "What areas of your program or college services need improvement?", 2),
      oq(
        "qualitative-3",
        "How did the blended learning setup (face-to-face and asynchronous classes) affect your learning experience?",
        3
      ),
      oq(
        "qualitative-4",
        "Additional comments or suggestions for improving your program or the College:",
        4
      ),
    ],
  },
];

const alumniEvalStructure: TemplateStructure = [
  {
    key: "program-experience",
    title: "Program Learning Experience",
    order: 1,
    questions: [
      lq(
        "program-experience-1",
        "The program provided a strong foundation in my field of study",
        1,
        AGR5
      ),
      lq("program-experience-2", "The courses were relevant to real-world applications", 2, AGR5),
      lq(
        "program-experience-3",
        "The program developed my critical thinking and problem-solving skills",
        3,
        AGR5
      ),
    ],
  },
  {
    key: "graduate-outcomes",
    title: "Graduate Outcomes Attainment",
    order: 2,
    questions: [
      lq(
        "graduate-outcomes-1",
        "I can apply knowledge and skills acquired from the program in my work",
        1,
        AGR5
      ),
      lq(
        "graduate-outcomes-2",
        "I can communicate effectively in a professional environment",
        2,
        AGR5
      ),
      lq("graduate-outcomes-3", "I demonstrate ethical and professional behavior", 3, AGR5),
      lq("graduate-outcomes-4", "I can work effectively with teams and stakeholders", 4, AGR5),
      lq(
        "graduate-outcomes-5",
        "I am capable of independent learning and self-improvement",
        5,
        AGR5
      ),
    ],
  },
  {
    key: "employment-readiness",
    title: "Employment and Readiness",
    order: 3,
    questions: [
      lq("employment-readiness-1", "The program adequately prepared me for employment", 1, AGR5),
      lq(
        "employment-readiness-2",
        "The skills I gained are aligned with industry expectations",
        2,
        AGR5
      ),
      lq("employment-readiness-3", "I was able to adapt quickly to workplace demands", 3, AGR5),
    ],
  },
  {
    key: "overall-assessment",
    title: "Overall Assessment",
    order: 4,
    questions: [
      lq("overall-assessment-1", "Overall satisfaction with the program", 1, AGR5),
      lq("overall-assessment-2", "Overall readiness as a graduate", 2, AGR5),
    ],
  },
  {
    key: "qualitative",
    title: "Qualitative Feedback",
    order: 5,
    questions: [
      oq("qualitative-1", "Strengths of the program:", 1),
      oq("qualitative-2", "Areas for improvement:", 2),
      oq("qualitative-3", "Suggestions to improve graduate readiness:", 3),
    ],
  },
];

const industryEvalStructure: TemplateStructure = [
  {
    key: "knowledge",
    title: "Knowledge Competence",
    order: 1,
    questions: [
      lq("knowledge-1", "Applies theoretical knowledge to practical tasks", 1, EV5),
      lq("knowledge-2", "Demonstrates understanding of industry practices", 2, EV5),
      lq("knowledge-3", "Shows awareness of professional standards and procedures", 3, EV5),
    ],
  },
  {
    key: "skills",
    title: "Skills Competence",
    order: 2,
    questions: [
      lq("skills-1", "Performs assigned tasks effectively and accurately", 1, EV5),
      lq("skills-2", "Demonstrates problem-solving and critical thinking", 2, EV5),
      lq("skills-3", "Communicates clearly (oral and/or written)", 3, EV5),
      lq("skills-4", "Uses tools, equipment, or technology appropriately", 4, EV5),
    ],
  },
  {
    key: "professional-traits",
    title: "Professional and Character Traits",
    order: 3,
    questions: [
      lq("professional-traits-1", "Demonstrates professionalism and ethical behavior", 1, EV5),
      lq("professional-traits-2", "Shows initiative and willingness to learn", 2, EV5),
      lq("professional-traits-3", "Works well with supervisors and colleagues", 3, EV5),
      lq("professional-traits-4", "Demonstrates responsibility and reliability", 4, EV5),
    ],
  },
  {
    key: "overall-readiness",
    title: "Overall Graduate Readiness",
    order: 4,
    questions: [lq("overall-readiness-1", "Overall readiness for employment in the field", 1, EV5)],
  },
  {
    key: "qualitative",
    title: "Qualitative Feedback",
    order: 5,
    questions: [
      oq("qualitative-1", "Strengths of our interns:", 1),
      oq("qualitative-2", "Areas for improvement:", 2),
      oq("qualitative-3", "Recommendations for curriculum or training enhancement:", 3),
    ],
  },
  {
    key: "recommendation",
    title: "Recommendation",
    order: 6,
    questions: [
      oq("recommendation-1", "Would you recommend our graduates for employment?", 1, ["Yes", "No"]),
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// All Demo Users
// ═══════════════════════════════════════════════════════════════════════════════

const allUsers = [
  { id: U.ADMIN, email: "demo-secretary@cloie.test", fn: "Demo", ln: "Admin", role: SystemRole.SECRETARY },
  { id: U.DEAN, email: "demo-dean@cloie.test", fn: "Demo", ln: "Dean", role: SystemRole.DEAN },
  {
    id: U.PH_BSIT,
    email: "demo-ph@cloie.test",
    fn: "Demo",
    ln: "Program Head",
    role: SystemRole.PROGRAM_HEAD,
  },
  {
    id: U.FAC_BSIT,
    email: "demo-faculty@cloie.test",
    fn: "Demo",
    ln: "Faculty",
    role: SystemRole.FACULTY,
  },
  {
    id: U.STU_BSIT,
    email: "demo-student@cloie.test",
    fn: "Demo",
    ln: "Student",
    role: SystemRole.STUDENT,
  },
  {
    id: U.GRAD_BSIT,
    email: "demo-grad@cloie.test",
    fn: "Demo",
    ln: "Graduate",
    role: SystemRole.STUDENT,
  },
  {
    id: U.ALU_BSIT,
    email: "demo-alumni@cloie.test",
    fn: "Demo",
    ln: "Alumni",
    role: SystemRole.ALUMNI,
  },
  {
    id: U.IND_BSIT,
    email: "demo-industry@cloie.test",
    fn: "Demo",
    ln: "Industry",
    role: SystemRole.INDUSTRY_PARTNER,
  },
  {
    id: U.PH_BEED,
    email: "ph-beed@cloie.test",
    fn: "Maria",
    ln: "Santos",
    role: SystemRole.PROGRAM_HEAD,
  },
  {
    id: U.PH_BSED,
    email: "ph-bsed@cloie.test",
    fn: "Jose",
    ln: "Reyes",
    role: SystemRole.PROGRAM_HEAD,
  },
  {
    id: U.PH_BSSW,
    email: "ph-bssw@cloie.test",
    fn: "Ana",
    ln: "Cruz",
    role: SystemRole.PROGRAM_HEAD,
  },
  {
    id: U.PH_BSBA,
    email: "ph-bsba@cloie.test",
    fn: "Roberto",
    ln: "Lim",
    role: SystemRole.PROGRAM_HEAD,
  },
  {
    id: U.PH_BSHM,
    email: "ph-bshm@cloie.test",
    fn: "Carmen",
    ln: "Flores",
    role: SystemRole.PROGRAM_HEAD,
  },
  {
    id: U.FAC_BSED,
    email: "faculty-bsed@cloie.test",
    fn: "Elena",
    ln: "Torres",
    role: SystemRole.FACULTY,
  },
  {
    id: U.FAC_BSBA,
    email: "faculty-bsba@cloie.test",
    fn: "Marco",
    ln: "Villanueva",
    role: SystemRole.FACULTY,
  },
  {
    id: U.FAC_BSHM,
    email: "faculty-bshm@cloie.test",
    fn: "Lisa",
    ln: "Mendoza",
    role: SystemRole.FACULTY,
  },
  {
    id: U.STU_BSED,
    email: "student-bsed@cloie.test",
    fn: "Juan",
    ln: "Dela Cruz",
    role: SystemRole.STUDENT,
  },
  {
    id: U.STU_BSBA,
    email: "student-bsba@cloie.test",
    fn: "Angela",
    ln: "Reyes",
    role: SystemRole.STUDENT,
  },
  {
    id: U.STU_BSBA_G,
    email: "student-bsba-grad@cloie.test",
    fn: "Carlos",
    ln: "Santos",
    role: SystemRole.STUDENT,
  },
  {
    id: U.STU_BEED,
    email: "student-beed@cloie.test",
    fn: "Patricia",
    ln: "Luna",
    role: SystemRole.STUDENT,
  },
  {
    id: U.STU_BSHM,
    email: "student-bshm@cloie.test",
    fn: "Daniel",
    ln: "Tan",
    role: SystemRole.STUDENT,
  },
  {
    id: U.STU_BSHM_G,
    email: "student-bshm-grad@cloie.test",
    fn: "Grace",
    ln: "Aquino",
    role: SystemRole.STUDENT,
  },
  {
    id: U.ALU_BSBA,
    email: "alumni-bsba@cloie.test",
    fn: "Miguel",
    ln: "Ong",
    role: SystemRole.ALUMNI,
  },
  {
    id: U.IND_BSHM,
    email: "industry-bshm@cloie.test",
    fn: "Karen",
    ln: "Sy",
    role: SystemRole.INDUSTRY_PARTNER,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

async function upsertTemplate(
  code: string,
  name: string,
  desc: string,
  structure: TemplateStructure,
  templateType: EvaluationTemplateType,
  facAccess = false
) {
  const json = structure as unknown as Prisma.InputJsonValue;
  const t = await prisma.instrumentTemplate.upsert({
    where: { code },
    update: {
      name,
      description: desc,
      structure: json,
      is_active: true,
      is_faculty_accessible: templateType === EvaluationTemplateType.COURSE_BOUND && facAccess,
      program_id: null,
      template_type: templateType,
    },
    create: {
      code,
      name,
      description: desc,
      structure: json,
      is_active: true,
      is_faculty_accessible: templateType === EvaluationTemplateType.COURSE_BOUND && facAccess,
      program_id: null,
      template_type: templateType,
    },
  });
  await prisma.instrumentVersion.upsert({
    where: { template_id_version_number: { template_id: t.id, version_number: 1 } },
    update: { is_active: true, structure_snapshot: json },
    create: { template_id: t.id, version_number: 1, is_active: true, structure_snapshot: json },
  });
  return t;
}

async function ensureAssignment(opts: {
  courseBoundId?: string;
  centralDeploymentId?: string;
  respondentId: string;
}) {
  const existing = await prisma.evaluationAssignment.findFirst({
    where: {
      course_bound_id: opts.courseBoundId ?? null,
      central_deployment_id: opts.centralDeploymentId ?? null,
      respondent_id: opts.respondentId,
    },
  });
  if (existing) return existing;
  return prisma.evaluationAssignment.create({
    data: {
      course_bound_id: opts.courseBoundId ?? null,
      central_deployment_id: opts.centralDeploymentId ?? null,
      respondent_id: opts.respondentId,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// A. Foundation
// ═══════════════════════════════════════════════════════════════════════════════

async function seedFoundation() {
  console.log("  → Programs...");
  const pDefs = [
    { code: "BEED", name: "Bachelor of Elementary Education" },
    { code: "BSED", name: "Bachelor of Secondary Education" },
    { code: "BSSW", name: "Bachelor of Science in Social Work" },
    { code: "BSBA", name: "Bachelor of Science in Business Administration" },
    { code: "BSIT", name: "Bachelor of Science in Information Technology" },
    { code: "BSHM", name: "Bachelor of Science in Hospitality Management" },
  ] as const;
  const pMap = new Map<string, { id: string; code: string }>();
  for (const d of pDefs) {
    const p = await prisma.program.upsert({
      where: { code: d.code },
      update: {
        name: d.name,
        description: `${d.name} — seeded from ACD academic catalog.`,
        is_active: true,
      },
      create: {
        code: d.code,
        name: d.name,
        description: `${d.name} — seeded from ACD academic catalog.`,
        is_active: true,
      },
    });
    pMap.set(d.code, p);
  }

  console.log("  → Majors...");
  const mDefs = [
    { pc: "BSED", name: "English" },
    { pc: "BSED", name: "Mathematics" },
    { pc: "BSED", name: "Science" },
    { pc: "BSED", name: "Values Education" },
    { pc: "BSBA", name: "Financial Management" },
    { pc: "BSBA", name: "Human Resource Development Management" },
    { pc: "BSBA", name: "Marketing Management" },
  ] as const;
  const mMap = new Map<string, { id: string }>();
  for (const d of mDefs) {
    const prog = pMap.get(d.pc)!;
    const m = await prisma.major.upsert({
      where: { program_id_name: { name: d.name, program_id: prog.id } },
      update: { is_active: true },
      create: { name: d.name, program_id: prog.id },
    });
    mMap.set(`${d.pc}:${d.name}`, m);
  }

  console.log("  → Courses...");
  const cDefs: {
    code: string;
    title: string;
    scope: CourseScope;
    pc?: string;
    mk?: string;
    yl?: YearLevel;
    sem?: AcademicSemester;
    trm?: AcademicTerm;
  }[] = [
    {
      code: "GEGS101",
      title: "General Education Foundations",
      scope: CourseScope.GENERAL_EDUCATION,
      yl: YearLevel.FIRST_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "NSTP1",
      title: "National Service Training Program 1",
      scope: CourseScope.GENERAL_EDUCATION,
      yl: YearLevel.FIRST_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "IT101",
      title: "Introduction to Computing",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSIT",
      yl: YearLevel.FIRST_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "IT-OD-401",
      title: "Outline Defense Demo Course",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSIT",
      yl: YearLevel.FOURTH_YEAR,
      sem: AcademicSemester.SECOND,
      trm: AcademicTerm.SECOND_TERM,
    },
    {
      code: "IT301",
      title: "Web Development and Design",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSIT",
      yl: YearLevel.THIRD_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "EDUC101",
      title: "Foundations of Teaching and Learning",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSED",
      yl: YearLevel.FIRST_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "EDUC201",
      title: "Curriculum Development",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSED",
      yl: YearLevel.SECOND_YEAR,
      sem: AcademicSemester.SECOND,
      trm: AcademicTerm.SECOND_TERM,
    },
    {
      code: "ENG201",
      title: "Language Across the Curriculum",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSED",
      mk: "BSED:English",
      yl: YearLevel.SECOND_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "MATH201",
      title: "Mathematics in the Modern World",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSED",
      mk: "BSED:Mathematics",
      yl: YearLevel.SECOND_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "BEED101",
      title: "Child and Adolescent Development",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BEED",
      yl: YearLevel.FIRST_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "BEED201",
      title: "Inclusive Education",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BEED",
      yl: YearLevel.SECOND_YEAR,
      sem: AcademicSemester.SECOND,
      trm: AcademicTerm.SECOND_TERM,
    },
    {
      code: "BA101",
      title: "Introduction to Business",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSBA",
      yl: YearLevel.FIRST_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "MKT301",
      title: "Strategic Marketing",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSBA",
      mk: "BSBA:Marketing Management",
      yl: YearLevel.THIRD_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "HRDM302",
      title: "People Development and Training",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSBA",
      mk: "BSBA:Human Resource Development Management",
      yl: YearLevel.THIRD_YEAR,
      sem: AcademicSemester.SECOND,
      trm: AcademicTerm.SECOND_TERM,
    },
    {
      code: "FIN303",
      title: "Financial Analysis and Planning",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSBA",
      mk: "BSBA:Financial Management",
      yl: YearLevel.THIRD_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "SW101",
      title: "Introduction to Social Work",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSSW",
      yl: YearLevel.FIRST_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "SW201",
      title: "Community Development Practice",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSSW",
      yl: YearLevel.SECOND_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "HM101",
      title: "Introduction to Hospitality Management",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSHM",
      yl: YearLevel.FIRST_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "HM201",
      title: "Food and Beverage Management",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSHM",
      yl: YearLevel.SECOND_YEAR,
      sem: AcademicSemester.SECOND,
      trm: AcademicTerm.SECOND_TERM,
    },
    {
      code: "HM301",
      title: "Hotel Operations and Front Office",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSHM",
      yl: YearLevel.THIRD_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    // ── New courses ──────────────────────────────────────────────────────────
    // BSIT
    {
      code: "IT201",
      title: "Data Structures and Algorithms",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSIT",
      yl: YearLevel.SECOND_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "IT401",
      title: "Systems Administration and Maintenance",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSIT",
      yl: YearLevel.FOURTH_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "IT-CAP-401",
      title: "Capstone Project 1",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSIT",
      yl: YearLevel.FOURTH_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    // BSBA
    {
      code: "FIN101",
      title: "Financial Accounting",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSBA",
      mk: "BSBA:Financial Management",
      yl: YearLevel.FIRST_YEAR,
      sem: AcademicSemester.SECOND,
      trm: AcademicTerm.SECOND_TERM,
    },
    {
      code: "HRDM201",
      title: "Organizational Behavior and Management",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSBA",
      mk: "BSBA:Human Resource Development Management",
      yl: YearLevel.SECOND_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    // BSED
    {
      code: "EDUC301",
      title: "Assessment and Evaluation in Education",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSED",
      yl: YearLevel.THIRD_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "SCI201",
      title: "Science and Technology in Society",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSED",
      mk: "BSED:Science",
      yl: YearLevel.SECOND_YEAR,
      sem: AcademicSemester.SECOND,
      trm: AcademicTerm.SECOND_TERM,
    },
    // BSHM
    {
      code: "HM401",
      title: "Events Management",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSHM",
      yl: YearLevel.FOURTH_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "HM302",
      title: "Tourism and Travel Management",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSHM",
      yl: YearLevel.THIRD_YEAR,
      sem: AcademicSemester.SECOND,
      trm: AcademicTerm.SECOND_TERM,
    },
    // BEED
    {
      code: "BEED301",
      title: "Teaching Practicum in Elementary Education",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BEED",
      yl: YearLevel.THIRD_YEAR,
      sem: AcademicSemester.SECOND,
      trm: AcademicTerm.SECOND_TERM,
    },
    {
      code: "BEED201B",
      title: "Assessment of Student Learning in Elementary Grades",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BEED",
      yl: YearLevel.SECOND_YEAR,
      sem: AcademicSemester.SECOND,
      trm: AcademicTerm.SECOND_TERM,
    },
    {
      code: "BEED102",
      title: "Educational Psychology and Learning Theories",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BEED",
      yl: YearLevel.FIRST_YEAR,
      sem: AcademicSemester.SECOND,
      trm: AcademicTerm.SECOND_TERM,
    },
    // BSSW
    {
      code: "SW301",
      title: "Social Welfare and Social Work in the Philippines",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSSW",
      yl: YearLevel.THIRD_YEAR,
      sem: AcademicSemester.FIRST,
      trm: AcademicTerm.FIRST_TERM,
    },
    {
      code: "SW202",
      title: "Case Work and Social Group Work",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSSW",
      yl: YearLevel.SECOND_YEAR,
      sem: AcademicSemester.SECOND,
      trm: AcademicTerm.SECOND_TERM,
    },
    {
      code: "SW401",
      title: "Field Practice in Social Work",
      scope: CourseScope.PROGRAM_SPECIFIC,
      pc: "BSSW",
      yl: YearLevel.FOURTH_YEAR,
      sem: AcademicSemester.SECOND,
      trm: AcademicTerm.SECOND_TERM,
    },
  ];
  const cMap = new Map<string, { id: string; code: string; title: string }>();
  for (const d of cDefs) {
    const c = await prisma.course.upsert({
      where: { code: d.code },
      update: {
        title: d.title,
        course_scope: d.scope,
        description: `${d.title} — seeded course.`,
        is_active: true,
        program_id: d.pc ? (pMap.get(d.pc)?.id ?? null) : null,
        major_id: d.mk ? (mMap.get(d.mk)?.id ?? null) : null,
        default_year_level: d.yl ?? null,
        default_semester: d.sem ?? null,
        default_term: d.trm ?? null,
      },
      create: {
        code: d.code,
        title: d.title,
        course_scope: d.scope,
        description: `${d.title} — seeded course.`,
        is_active: true,
        program_id: d.pc ? (pMap.get(d.pc)?.id ?? null) : null,
        major_id: d.mk ? (mMap.get(d.mk)?.id ?? null) : null,
        default_year_level: d.yl ?? null,
        default_semester: d.sem ?? null,
        default_term: d.trm ?? null,
      },
    });
    cMap.set(d.code, { id: c.id, code: c.code, title: c.title });
  }

  return { pMap, mMap, cMap };
}

// ═══════════════════════════════════════════════════════════════════════════════
// A.5 Academic Calendar (School Years & Term Instances)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedAcademicCalendar() {
  console.log("  → School years...");

  // Create School Year 2026-2027
  const sy2026_2027 = await prisma.schoolYear.upsert({
    where: { id: D.SY_2026_2027 },
    update: {
      code: "2026-2027",
      start_date: new Date("2026-06-01"),
      end_date: new Date("2027-05-31"),
    },
    create: {
      id: D.SY_2026_2027,
      code: "2026-2027",
      start_date: new Date("2026-06-01"),
      end_date: new Date("2027-05-31"),
    },
  });

  // Create School Year 2027-2028 (for rollover testing)
  const sy2027_2028 = await prisma.schoolYear.upsert({
    where: { id: D.SY_2027_2028 },
    update: {
      code: "2027-2028",
      start_date: new Date("2027-06-01"),
      end_date: new Date("2028-05-31"),
    },
    create: {
      id: D.SY_2027_2028,
      code: "2027-2028",
      start_date: new Date("2027-06-01"),
      end_date: new Date("2028-05-31"),
    },
  });

  console.log("  → Resetting mock Academic Period fixtures...");
  // Slice 1 lifecycle reset: drop the term-instance IDs we own plus their
  // dependent records (responses, assignments, evaluations, enrollments).
  // Development data is disposable; this keeps fixtures lifecycle-valid.
  const managedTermInstanceIds = [
    D.TI_2026_2027_1ST,
    D.TI_2026_2027_2ND,
    D.TI_2027_2028_1ST,
    D.TI_2027_2028_2ND_CANCELLED,
  ];

  await prisma.qualitativeResponseItem.deleteMany({
    where: {
      response: {
        OR: [
          { assignment: { course_bound: { term_instance_id: { in: managedTermInstanceIds } } } },
          { assignment: { central_deployment: { term_instance_id: { in: managedTermInstanceIds } } } },
        ],
      },
    },
  });
  await prisma.quantitativeResponseItem.deleteMany({
    where: {
      response: {
        OR: [
          { assignment: { course_bound: { term_instance_id: { in: managedTermInstanceIds } } } },
          { assignment: { central_deployment: { term_instance_id: { in: managedTermInstanceIds } } } },
        ],
      },
    },
  });
  await prisma.response.deleteMany({
    where: {
      OR: [
        { assignment: { course_bound: { term_instance_id: { in: managedTermInstanceIds } } } },
        { assignment: { central_deployment: { term_instance_id: { in: managedTermInstanceIds } } } },
      ],
    },
  });
  await prisma.evaluationAssignment.deleteMany({
    where: {
      OR: [
        { course_bound: { term_instance_id: { in: managedTermInstanceIds } } },
        { central_deployment: { term_instance_id: { in: managedTermInstanceIds } } },
      ],
    },
  });
  await prisma.courseBoundCiloQuestionBinding.deleteMany({
    where: {
      course_bound_evaluation: { term_instance_id: { in: managedTermInstanceIds } },
    },
  });
  await prisma.courseBoundEvaluationTarget.deleteMany({
    where: {
      course_bound_evaluation: { term_instance_id: { in: managedTermInstanceIds } },
    },
  });
  await prisma.courseBoundEvaluation.deleteMany({
    where: { term_instance_id: { in: managedTermInstanceIds } },
  });
  await prisma.centralDeployment.deleteMany({
    where: { term_instance_id: { in: managedTermInstanceIds } },
  });
  await prisma.courseAssignment.deleteMany({
    where: { term_instance_id: { in: managedTermInstanceIds } },
  });
  await prisma.studentEnrollment.deleteMany({
    where: { term_instance_id: { in: managedTermInstanceIds } },
  });
  await prisma.academicTermInstance.deleteMany({
    where: { id: { in: managedTermInstanceIds } },
  });

  console.log("  → Term instances (lifecycle fixtures)...");

  // 2026-2027 First Semester — COMPLETED (historical)
  const ti2026First = await prisma.academicTermInstance.create({
    data: {
      id: D.TI_2026_2027_1ST,
      school_year_id: sy2026_2027.id,
      semester: AcademicSemester.FIRST,
      term: AcademicTerm.FIRST_TERM,
      start_date: new Date("2026-08-01"),
      end_date: new Date("2026-12-15"),
      status: AcademicPeriodStatus.COMPLETED,
    },
  });

  // 2026-2027 Second Semester — ACTIVE (current)
  const ti2026Second = await prisma.academicTermInstance.create({
    data: {
      id: D.TI_2026_2027_2ND,
      school_year_id: sy2026_2027.id,
      semester: AcademicSemester.SECOND,
      term: AcademicTerm.SECOND_TERM,
      start_date: new Date("2027-01-15"),
      end_date: new Date("2027-05-31"),
      status: AcademicPeriodStatus.ACTIVE,
    },
  });

  // 2027-2028 First Semester — PLANNED (upcoming)
  const ti2027First = await prisma.academicTermInstance.create({
    data: {
      id: D.TI_2027_2028_1ST,
      school_year_id: sy2027_2028.id,
      semester: AcademicSemester.FIRST,
      term: AcademicTerm.FIRST_TERM,
      start_date: new Date("2027-08-01"),
      end_date: new Date("2027-12-15"),
      status: AcademicPeriodStatus.PLANNED,
    },
  });

  // 2027-2028 Second Semester — CANCELLED (covers all four lifecycle states)
  const ti2027SecondCancelled = await prisma.academicTermInstance.create({
    data: {
      id: D.TI_2027_2028_2ND_CANCELLED,
      school_year_id: sy2027_2028.id,
      semester: AcademicSemester.SECOND,
      term: AcademicTerm.SECOND_TERM,
      start_date: new Date("2028-01-15"),
      end_date: new Date("2028-05-31"),
      status: AcademicPeriodStatus.CANCELLED,
    },
  });

  return {
    schoolYear: sy2026_2027,
    termInstance: ti2026Second, // Return the ACTIVE period for downstream fixtures
    termInstances: {
      ti2026First,
      ti2026Second,
      ti2027First,
      ti2027SecondCancelled,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// B. Users & Roles
// ═══════════════════════════════════════════════════════════════════════════════

async function seedUsers(
  pMap: Map<string, { id: string }>,
  mMap: Map<string, { id: string }>,
  termInstanceId: string
) {
  console.log("  → Users & roles...");
  for (const u of allUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { email: u.email, first_name: u.fn, last_name: u.ln, is_active: true },
      create: { id: u.id, email: u.email, first_name: u.fn, last_name: u.ln, is_active: true },
    });
    await prisma.userRole.upsert({
      where: { user_id: u.id },
      update: { role: u.role },
      create: { user_id: u.id, role: u.role },
    });
  }

  // YearLevel is now an enum, not a database table
  const y2 = YearLevel.SECOND_YEAR;
  const y3 = YearLevel.THIRD_YEAR;
  const y4 = YearLevel.FOURTH_YEAR;

  const bsit = pMap.get("BSIT")!;
  const bsed = pMap.get("BSED")!;
  const bsba = pMap.get("BSBA")!;
  const beed = pMap.get("BEED")!;
  const bshm = pMap.get("BSHM")!;
  const bssw = pMap.get("BSSW")!;

  console.log("  → Student profiles...");
  const students = [
    {
      uid: U.STU_BSIT,
      pid: bsit.id,
      mid: null as string | null,
      ylid: y4,
      sn: "2026-0001",
      sec: "MORNING" as const,
    },
    { uid: U.GRAD_BSIT, pid: bsit.id, mid: null, ylid: y4, sn: "2026-0002", sec: "AFTERNOON" as const },
    {
      uid: U.STU_BSED,
      pid: bsed.id,
      mid: mMap.get("BSED:English")?.id ?? null,
      ylid: y3,
      sn: "2026-0003",
      sec: "MORNING" as const,
    },
    {
      uid: U.STU_BSBA,
      pid: bsba.id,
      mid: mMap.get("BSBA:Marketing Management")?.id ?? null,
      ylid: y4,
      sn: "2026-0004",
      sec: "MORNING" as const,
    },
    {
      uid: U.STU_BSBA_G,
      pid: bsba.id,
      mid: mMap.get("BSBA:Financial Management")?.id ?? null,
      ylid: y4,
      sn: "2026-0005",
      sec: "AFTERNOON" as const,
    },
    { uid: U.STU_BEED, pid: beed.id, mid: null, ylid: y2, sn: "2026-0006", sec: "MORNING" as const },
    { uid: U.STU_BSHM, pid: bshm.id, mid: null, ylid: y4, sn: "2026-0007", sec: "EVENING" as const },
    { uid: U.STU_BSHM_G, pid: bshm.id, mid: null, ylid: y4, sn: "2026-0008", sec: "AFTERNOON" as const },
  ];
  for (const s of students) {
    await prisma.studentAcademicProfile.upsert({
      where: { user_id: s.uid },
      update: {
        program_id: s.pid,
        major_id: s.mid,
        student_id_number: s.sn,
      },
      create: {
        user_id: s.uid,
        program_id: s.pid,
        major_id: s.mid,
        student_id_number: s.sn,
      },
    });

    // Create enrollment record for active term (enrollment now holds year_level and section)
    await prisma.studentEnrollment.upsert({
      where: {
        student_user_id_term_instance_id: {
          student_user_id: s.uid,
          term_instance_id: termInstanceId,
        },
      },
      update: {
        program_id: s.pid,
        major_id: s.mid,
        year_level: s.ylid,
        section: s.sec,
        is_active: true,
        source: "SECRETARY",
      },
      create: {
        student_user_id: s.uid,
        term_instance_id: termInstanceId,
        program_id: s.pid,
        major_id: s.mid,
        year_level: s.ylid,
        section: s.sec,
        is_active: true,
        source: "SECRETARY",
      },
    });
  }

  console.log("  → Faculty affiliations...");
  for (const fa of [
    { fid: U.FAC_BSIT, pid: bsit.id },
    { fid: U.FAC_BSED, pid: bsed.id },
    { fid: U.FAC_BSBA, pid: bsba.id },
    { fid: U.FAC_BSHM, pid: bshm.id },
  ]) {
    await prisma.facultyProgramAffiliation.upsert({
      where: { faculty_id_program_id: { faculty_id: fa.fid, program_id: fa.pid } },
      update: { is_active: true },
      create: { faculty_id: fa.fid, program_id: fa.pid, is_active: true },
    });
  }

  console.log("  → Program head assignments...");
  for (const ph of [
    { phId: U.PH_BSIT, pid: bsit.id },
    { phId: U.PH_BEED, pid: beed.id },
    { phId: U.PH_BSED, pid: bsed.id },
    { phId: U.PH_BSSW, pid: bssw.id },
    { phId: U.PH_BSBA, pid: bsba.id },
    { phId: U.PH_BSHM, pid: bshm.id },
  ]) {
    await prisma.programHeadAssignment.upsert({
      where: { program_head_id_program_id: { program_head_id: ph.phId, program_id: ph.pid } },
      update: { is_active: true },
      create: { program_head_id: ph.phId, program_id: ph.pid, is_active: true },
    });
  }

  console.log("  → Alumni profiles...");
  // demo-alumni: PENDING (newly registered, awaiting review)
  await prisma.alumniProfile.upsert({
    where: { user_id: U.ALU_BSIT },
    update: {
      graduation_year: 2023,
      program_id: bsit.id,
      verification_status: VerificationStatus.PENDING,
    },
    create: {
      user_id: U.ALU_BSIT,
      graduation_year: 2023,
      program_id: bsit.id,
      verification_status: VerificationStatus.PENDING,
    },
  });
  // alumni-bsba: APPROVED (verified alumni)
  await prisma.alumniProfile.upsert({
    where: { user_id: U.ALU_BSBA },
    update: {
      graduation_year: 2021,
      program_id: bsba.id,
      verification_status: VerificationStatus.APPROVED,
    },
    create: {
      user_id: U.ALU_BSBA,
      graduation_year: 2021,
      program_id: bsba.id,
      verification_status: VerificationStatus.APPROVED,
    },
  });

  console.log("  → Industry partner profiles...");
  await prisma.industryPartnerProfile.upsert({
    where: { user_id: U.IND_BSIT },
    update: {
      company_name: "Demo Industry Partner",
      position: "HR and Training Lead",
      program_id: bsit.id,
      verification_status: VerificationStatus.PENDING,
    },
    create: {
      user_id: U.IND_BSIT,
      company_name: "Demo Industry Partner",
      position: "HR and Training Lead",
      program_id: bsit.id,
      verification_status: VerificationStatus.PENDING,
    },
  });
  await prisma.industryPartnerProfile.upsert({
    where: { user_id: U.IND_BSHM },
    update: {
      company_name: "Grand Hotel Corp",
      position: "Operations Manager",
      program_id: bshm.id,
      verification_status: VerificationStatus.APPROVED,
    },
    create: {
      user_id: U.IND_BSHM,
      company_name: "Grand Hotel Corp",
      position: "Operations Manager",
      program_id: bshm.id,
      verification_status: VerificationStatus.APPROVED,
    },
  });

  console.log("  → External stakeholder invites...");
  for (const inv of [
    {
      email: "demo-alumni@cloie.test",
      role: SystemRole.ALUMNI,
      pid: bsit.id,
      iname: "Demo Alumni",
      co: null as string | null,
    },
    {
      email: "demo-industry@cloie.test",
      role: SystemRole.INDUSTRY_PARTNER,
      pid: bsit.id,
      iname: "Demo Industry Reviewer",
      co: "Demo Industry Partner",
    },
    {
      email: "alumni-bsba@cloie.test",
      role: SystemRole.ALUMNI,
      pid: bsba.id,
      iname: "Miguel Ong",
      co: null,
    },
    {
      email: "industry-bshm@cloie.test",
      role: SystemRole.INDUSTRY_PARTNER,
      pid: bshm.id,
      iname: "Karen Sy",
      co: "Grand Hotel Corp",
    },
  ]) {
    await prisma.externalStakeholderInvite.upsert({
      where: { email_role_program_id: { email: inv.email, role: inv.role, program_id: inv.pid } },
      update: {
        invitee_name: inv.iname,
        company_name: inv.co,
        invited_by: U.ADMIN,
        note: "Seeded invite for MVP demo.",
        status: InviteStatus.ACCEPTED,
        sent_at: new Date("2026-04-05T09:00:00Z"),
        accepted_at: new Date("2026-04-10T09:00:00Z"),
      },
      create: {
        email: inv.email,
        role: inv.role,
        program_id: inv.pid,
        invitee_name: inv.iname,
        company_name: inv.co,
        invited_by: U.ADMIN,
        note: "Seeded invite for MVP demo.",
        status: InviteStatus.ACCEPTED,
        sent_at: new Date("2026-04-05T09:00:00Z"),
        accepted_at: new Date("2026-04-10T09:00:00Z"),
      },
    });
  }

  // Return student data for enrollment creation
  return { students };
}

// ═══════════════════════════════════════════════════════════════════════════════
// B.5 Course Assignments (Faculty to Courses in Term Instances)
// ═══════════════════════════════════════════════════════════════════════════════

async function seedCourseAssignments(
  pMap: Map<string, { id: string }>,
  cMap: Map<string, { id: string; code: string; title: string }>,
  termInstanceId: string
) {
  console.log("  → Course assignments...");

  const bsit = pMap.get("BSIT")!;
  const bsba = pMap.get("BSBA")!;
  const bsed = pMap.get("BSED")!;
  const beed = pMap.get("BEED")!;
  const bshm = pMap.get("BSHM")!;
  const bssw = pMap.get("BSSW")!;

  const courseAssignments = [
    // BSIT courses - Faculty assignments
    { courseCode: "IT-OD-401", programCode: "BSIT", facultyId: U.FAC_BSIT, yearLevel: YearLevel.FOURTH_YEAR, section: "MORNING" },
    { courseCode: "IT-OD-401", programCode: "BSIT", facultyId: U.FAC_BSIT, yearLevel: YearLevel.FOURTH_YEAR, section: "AFTERNOON" },
    { courseCode: "IT201", programCode: "BSIT", facultyId: U.FAC_BSIT, yearLevel: YearLevel.SECOND_YEAR, section: "MORNING" },

    // General Education course taught by one faculty across program contexts
    { courseCode: "GEGS101", programCode: "BSIT", facultyId: U.FAC_BSIT, yearLevel: YearLevel.FIRST_YEAR, section: "MORNING" },
    { courseCode: "GEGS101", programCode: "BSBA", facultyId: U.FAC_BSIT, yearLevel: YearLevel.FIRST_YEAR, section: "MORNING" },

    // BSBA courses
    { courseCode: "MKT301", programCode: "BSBA", facultyId: U.FAC_BSBA, yearLevel: YearLevel.FOURTH_YEAR, section: "MORNING" },
    { courseCode: "FIN101", programCode: "BSBA", facultyId: U.FAC_BSBA, yearLevel: YearLevel.SECOND_YEAR, section: "AFTERNOON" },

    // BSED courses
    { courseCode: "EDUC301", programCode: "BSED", facultyId: U.FAC_BSED, yearLevel: YearLevel.THIRD_YEAR, section: "MORNING" },
    { courseCode: "ENG201", programCode: "BSED", facultyId: U.FAC_BSED, yearLevel: YearLevel.SECOND_YEAR, section: "MORNING" },

    // BEED courses
    { courseCode: "BEED301", programCode: "BEED", facultyId: U.FAC_BSED, yearLevel: YearLevel.THIRD_YEAR, section: "MORNING" },

    // BSHM courses
    { courseCode: "HM401", programCode: "BSHM", facultyId: U.FAC_BSHM, yearLevel: YearLevel.FOURTH_YEAR, section: "EVENING" },

    // BSSW courses
    { courseCode: "SW301", programCode: "BSSW", facultyId: U.FAC_BSED, yearLevel: YearLevel.THIRD_YEAR, section: "MORNING" },
  ];

  const assignmentMap = new Map<string, string>();

  for (const ca of courseAssignments) {
    const course = cMap.get(ca.courseCode);
    const program = pMap.get(ca.programCode);

    if (!course || !program) {
      console.warn(`    ⚠️ Skipping assignment for ${ca.courseCode} - course or program not found`);
      continue;
    }

    // Check for existing assignment by class identity (unique per term/course/program/year/section)
    const existing = await prisma.courseAssignment.findFirst({
      where: {
        term_instance_id: termInstanceId,
        course_id: course.id,
        program_id: program.id,
        year_level: ca.yearLevel,
        section: ca.section as import("@prisma/client").StudentSection,
      },
    });

    const assignment = existing
      ? existing
      : await prisma.courseAssignment.create({
          data: {
            term_instance_id: termInstanceId,
            course_id: course.id,
            faculty_id: ca.facultyId,
            program_id: program.id,
            year_level: ca.yearLevel,
            section: ca.section as import("@prisma/client").StudentSection,
            is_active: true,
          },
        });

    assignmentMap.set(ca.courseCode, assignment.id);
    console.log(`    ✓ Assigned ${ca.courseCode} to faculty`);
  }

  return assignmentMap;
}

// ═══════════════════════════════════════════════════════════════════════════════
// C. Outcomes
// ═══════════════════════════════════════════════════════════════════════════════

async function seedOutcomes(
  pMap: Map<string, { id: string; code: string }>,
  cMap: Map<string, { id: string }>
) {
  console.log("  → Graduate Outcomes...");
  const goDefs = [
    {
      pc: "BSIT",
      code: "BSIT-GO1",
      desc: "Apply computing and IT solutions to complex real-world problems using appropriate methodologies.",
      order: 1,
    },
    {
      pc: "BSIT",
      code: "BSIT-GO2",
      desc: "Demonstrate professional ethics, social responsibility, and commitment to quality standards in IT practice.",
      order: 2,
    },
    {
      pc: "BSIT",
      code: "BSIT-GO3",
      desc: "Engage in lifelong learning and adapt to evolving technologies in the computing discipline.",
      order: 3,
    },
    {
      pc: "BSED",
      code: "BSED-GO1",
      desc: "Demonstrate pedagogical content knowledge in the chosen area of specialization.",
      order: 1,
    },
    {
      pc: "BSED",
      code: "BSED-GO2",
      desc: "Apply curriculum development skills to design learner-centered educational experiences.",
      order: 2,
    },
    {
      pc: "BSED",
      code: "BSED-GO3",
      desc: "Exhibit professional teaching ethics and a commitment to continuous professional development.",
      order: 3,
    },
    {
      pc: "BEED",
      code: "BEED-GO1",
      desc: "Design effective, age-appropriate learning environments for elementary learners.",
      order: 1,
    },
    {
      pc: "BEED",
      code: "BEED-GO2",
      desc: "Apply child development principles in planning and delivering instruction.",
      order: 2,
    },
    {
      pc: "BEED",
      code: "BEED-GO3",
      desc: "Demonstrate inclusive education practices that address diverse learner needs.",
      order: 3,
    },
    {
      pc: "BSBA",
      code: "BSBA-GO1",
      desc: "Apply business management principles to organizational decision-making and operations.",
      order: 1,
    },
    {
      pc: "BSBA",
      code: "BSBA-GO2",
      desc: "Demonstrate financial literacy and analytical skills in business contexts.",
      order: 2,
    },
    {
      pc: "BSBA",
      code: "BSBA-GO3",
      desc: "Exercise ethical business practices and corporate social responsibility.",
      order: 3,
    },
    {
      pc: "BSSW",
      code: "BSSW-GO1",
      desc: "Apply social work theories and methods to promote community well-being.",
      order: 1,
    },
    {
      pc: "BSSW",
      code: "BSSW-GO2",
      desc: "Demonstrate community engagement skills for participatory development.",
      order: 2,
    },
    {
      pc: "BSSW",
      code: "BSSW-GO3",
      desc: "Uphold social work ethics and advocate for social justice and human rights.",
      order: 3,
    },
    {
      pc: "BSHM",
      code: "BSHM-GO1",
      desc: "Apply hospitality operations management in diverse service environments.",
      order: 1,
    },
    {
      pc: "BSHM",
      code: "BSHM-GO2",
      desc: "Demonstrate customer service excellence and interpersonal communication skills.",
      order: 2,
    },
    {
      pc: "BSHM",
      code: "BSHM-GO3",
      desc: "Practice responsible tourism and sustainability in hospitality enterprises.",
      order: 3,
    },
  ];

  const goMap = new Map<string, { id: string }>();
  for (const g of goDefs) {
    const prog = pMap.get(g.pc)!;
    const go = await prisma.gO.upsert({
      where: { program_id_code: { program_id: prog.id, code: g.code } },
      update: { description: g.desc, is_active: true },
      create: { code: g.code, description: g.desc, program_id: prog.id },
    });
    goMap.set(g.code, go);
  }

  // CILOs for courses with evaluations
  console.log("  → CILOs...");
  const ciloDefsIT = [
    {
      courseCode: "IT-OD-401",
      desc: "Defend the proposed capstone scope and methodology.",
      order: 1,
      createdBy: U.FAC_BSIT,
    },
    {
      courseCode: "IT-OD-401",
      desc: "Present a coherent research and implementation plan.",
      order: 2,
      createdBy: U.FAC_BSIT,
    },
    {
      courseCode: "IT-OD-401",
      desc: "Demonstrate technical feasibility of the proposed solution.",
      order: 3,
      createdBy: U.FAC_BSIT,
    },
  ];
  const ciloDefsMKT = [
    {
      courseCode: "MKT301",
      desc: "Develop a comprehensive marketing plan for a real or simulated business.",
      order: 1,
      createdBy: U.FAC_BSBA,
    },
    {
      courseCode: "MKT301",
      desc: "Analyze market trends and consumer behavior using research methodologies.",
      order: 2,
      createdBy: U.FAC_BSBA,
    },
  ];
  const ciloDefsNewCourses = [
    // IT201 — Data Structures and Algorithms
    {
      courseCode: "IT201",
      desc: "Implement fundamental data structures (arrays, linked lists, trees, graphs) in a programming language.",
      order: 1,
      createdBy: U.FAC_BSIT,
    },
    {
      courseCode: "IT201",
      desc: "Analyze the time and space complexity of common algorithms.",
      order: 2,
      createdBy: U.FAC_BSIT,
    },
    {
      courseCode: "IT201",
      desc: "Apply appropriate data structures and algorithms to solve real-world computing problems.",
      order: 3,
      createdBy: U.FAC_BSIT,
    },
    // FIN101 — Financial Accounting
    {
      courseCode: "FIN101",
      desc: "Prepare and interpret financial statements in accordance with accounting standards.",
      order: 1,
      createdBy: U.FAC_BSBA,
    },
    {
      courseCode: "FIN101",
      desc: "Apply the accounting cycle to record, classify, and summarize business transactions.",
      order: 2,
      createdBy: U.FAC_BSBA,
    },
    // EDUC301 — Assessment and Evaluation in Education
    {
      courseCode: "EDUC301",
      desc: "Design valid and reliable assessment tools aligned with intended learning outcomes.",
      order: 1,
      createdBy: U.FAC_BSED,
    },
    {
      courseCode: "EDUC301",
      desc: "Analyze and interpret assessment results to inform instructional decisions.",
      order: 2,
      createdBy: U.FAC_BSED,
    },
    {
      courseCode: "EDUC301",
      desc: "Apply principles of authentic and formative assessment in diverse learning contexts.",
      order: 3,
      createdBy: U.FAC_BSED,
    },
    // HM401 — Events Management
    {
      courseCode: "HM401",
      desc: "Plan and organize hospitality and tourism events applying industry standards and protocols.",
      order: 1,
      createdBy: U.FAC_BSHM,
    },
    {
      courseCode: "HM401",
      desc: "Manage event logistics, budgeting, and stakeholder coordination effectively.",
      order: 2,
      createdBy: U.FAC_BSHM,
    },
    // BEED301 — Teaching Practicum in Elementary Education
    {
      courseCode: "BEED301",
      desc: "Demonstrate effective classroom management and age-appropriate instructional strategies.",
      order: 1,
      createdBy: U.FAC_BSED,
    },
    {
      courseCode: "BEED301",
      desc: "Design and implement lesson plans that address diverse learner needs in elementary grades.",
      order: 2,
      createdBy: U.FAC_BSED,
    },
    // SW301 — Social Welfare and Social Work in the Philippines
    {
      courseCode: "SW301",
      desc: "Analyze the historical development and current state of social welfare and social work in the Philippines.",
      order: 1,
      createdBy: U.FAC_BSED,
    },
    {
      courseCode: "SW301",
      desc: "Apply social work frameworks to assess community needs and propose appropriate interventions.",
      order: 2,
      createdBy: U.FAC_BSED,
    },
  ];

  const ciloMap = new Map<string, { id: string; description: string; order: number }[]>();
  for (const cd of [...ciloDefsIT, ...ciloDefsMKT, ...ciloDefsNewCourses]) {
    const course = cMap.get(cd.courseCode)!;
    const existingCilo = await prisma.cILO.findFirst({
      where: { course_id: course.id, description: cd.desc },
    });
    const cilo = existingCilo
      ? await prisma.cILO.update({
          where: { id: existingCilo.id },
          data: { description: cd.desc, created_by: cd.createdBy },
        })
      : await prisma.cILO.create({
          data: { description: cd.desc, course_id: course.id, created_by: cd.createdBy },
        });
    if (!ciloMap.has(cd.courseCode)) ciloMap.set(cd.courseCode, []);
    ciloMap.get(cd.courseCode)!.push({ id: cilo.id, description: cd.desc, order: cd.order });
  }

  // CILO Mappings
  console.log("  → CILO Mappings...");
  const itCilos = ciloMap.get("IT-OD-401") ?? [];
  const mktCilos = ciloMap.get("MKT301") ?? [];

  // IT CILOs → BSIT GOs
  for (const cilo of itCilos) {
    const goCode = cilo.order <= 2 ? "BSIT-GO1" : "BSIT-GO3";
    const go = goMap.get(goCode)!;
    const existing = await prisma.cILOMapping.findFirst({
      where: { cilo_id: cilo.id, go_id: go.id },
    });
    if (!existing) {
      await prisma.cILOMapping.create({ data: { cilo_id: cilo.id, go_id: go.id } });
    }
  }
  // MKT CILOs → BSBA GOs
  for (const cilo of mktCilos) {
    const goCode = cilo.order === 1 ? "BSBA-GO1" : "BSBA-GO2";
    const go = goMap.get(goCode)!;
    const existing = await prisma.cILOMapping.findFirst({
      where: { cilo_id: cilo.id, go_id: go.id },
    });
    if (!existing) {
      await prisma.cILOMapping.create({ data: { cilo_id: cilo.id, go_id: go.id } });
    }
  }

  return { goMap, ciloMap };
}

// ═══════════════════════════════════════════════════════════════════════════════
// D. Templates
// ═══════════════════════════════════════════════════════════════════════════════

async function seedTemplates() {
  console.log("  → Instrument Templates...");
  await upsertTemplate(
    "CILO_EVAL",
    "Course-Bound CILO Evaluation",
    "Post-term course intended learning outcomes evaluation tool for faculty-managed CILO evaluations.",
    ciloEvalStructure,
    EvaluationTemplateType.COURSE_BOUND,
    true
  );
  await upsertTemplate(
    "EXIT_SURVEY",
    "Graduating Student Exit Survey",
    "Graduating student exit survey gathering feedback on academic experience, outcomes, facilities, and formation.",
    exitSurveyStructure,
    EvaluationTemplateType.PROGRAM_WIDE
  );
  await upsertTemplate(
    "ALUMNI_EVAL",
    "Alumni Evaluation Tool",
    "Alumni evaluation tool assessing graduate outcomes attainment, employment readiness, and program satisfaction.",
    alumniEvalStructure,
    EvaluationTemplateType.PROGRAM_WIDE
  );
  await upsertTemplate(
    "INDUSTRY_EVAL",
    "Industry Partner Internship Evaluation Tool",
    "Industry partner evaluation tool assessing intern knowledge, skills, professional traits, and graduate readiness.",
    industryEvalStructure,
    EvaluationTemplateType.PROGRAM_WIDE
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// E. Evaluations & Deployments
// ═══════════════════════════════════════════════════════════════════════════════

export async function seedEvaluations(
  pMap: Map<string, { id: string }>,
  cMap: Map<string, { id: string; code: string; title: string }>,
  ciloMap: Map<string, { id: string; description: string; order: number }[]>,
  termInstanceId: string,
  assignmentMap: Map<string, string>
) {
  const ciloVer = await prisma.instrumentVersion.findFirstOrThrow({
    where: { template: { code: "CILO_EVAL" }, version_number: 1 },
  });
  const exitVer = await prisma.instrumentVersion.findFirstOrThrow({
    where: { template: { code: "EXIT_SURVEY" }, version_number: 1 },
  });
  const alumVer = await prisma.instrumentVersion.findFirstOrThrow({
    where: { template: { code: "ALUMNI_EVAL" }, version_number: 1 },
  });
  const indVer = await prisma.instrumentVersion.findFirstOrThrow({
    where: { template: { code: "INDUSTRY_EVAL" }, version_number: 1 },
  });
  // YearLevel is now an enum, not a database table
  const y2 = YearLevel.SECOND_YEAR;
  const y3 = YearLevel.THIRD_YEAR;
  const y4 = YearLevel.FOURTH_YEAR;

  const bsit = pMap.get("BSIT")!;
  const bsba = pMap.get("BSBA")!;
  const bshm = pMap.get("BSHM")!;
  const bsed = pMap.get("BSED")!;
  const beed = pMap.get("BEED")!;
  const bssw = pMap.get("BSSW")!;

  // ── Course-Bound 1: BSIT IT-OD-401 ──────────────────────────────────
  console.log("  → Course-bound eval: IT-OD-401...");
  const itCourse = cMap.get("IT-OD-401")!;
  const itCilos = ciloMap.get("IT-OD-401") ?? [];
  const ciloSnap1: Prisma.InputJsonValue = itCilos.map((c) => ({
    description: c.description,
    order: c.order,
  }));
  const courseSnap1: Prisma.InputJsonValue = {
    courseCode: itCourse.code,
    courseTitle: itCourse.title,
    programCode: "BSIT",
    programName: "Bachelor of Science in Information Technology",
  };

  const cbEval1AssignmentId = assignmentMap.get("IT-OD-401");
  if (!cbEval1AssignmentId) {
    throw new Error("Missing course assignment for IT-OD-401");
  }

  const existingCbEval1 = await prisma.courseBoundEvaluation.findFirst({
    where: {
      course_assignment_id: cbEval1AssignmentId,
      term_instance_id: termInstanceId,
    },
  });

  const cbEval1Data = {
    deployment_name: "IT-OD-401 Post-Term CILO Evaluation",
    instrument_version_id: ciloVer.id,
    cilos_snapshot: ciloSnap1,
    course_info_snapshot: courseSnap1,
    activation_at: new Date("2026-04-01T08:00:00Z"),
    deadline_at: new Date("2026-05-31T23:59:00Z"),
    status: DeploymentStatus.ACTIVE,
    published_at: new Date("2026-04-01T08:00:00Z"),
    term_instance_id: termInstanceId,
    course_assignment_id: cbEval1AssignmentId,
  };

  const cbEval1 = existingCbEval1
    ? await prisma.courseBoundEvaluation.update({
        where: { id: existingCbEval1.id },
        data: cbEval1Data,
      })
    : await prisma.courseBoundEvaluation.create({
        data: cbEval1Data,
      });

  await prisma.courseBoundEvaluationTarget.upsert({
    where: {
      course_bound_evaluation_id_program_id_year_level: {
        course_bound_evaluation_id: cbEval1.id,
        program_id: bsit.id,
        year_level: y4,
      },
    },
    update: {},
    create: { course_bound_evaluation_id: cbEval1.id, program_id: bsit.id, year_level: y4 },
  });

  await prisma.courseBoundCiloQuestionBinding.createMany({
    data: itCilos.map((cilo) => ({
      cilo_description_snapshot: cilo.description,
      cilo_id: cilo.id,
      course_bound_evaluation_id: cbEval1.id,
      item_key: `cilo-attainment-${cilo.order}`,
      question_prompt_snapshot:
        cilo.order === 1
          ? "I achieved the first course intended learning outcome."
          : cilo.order === 2
            ? "I achieved the second course intended learning outcome."
            : "I achieved the third course intended learning outcome.",
      section_key: "cilo-items",
    })),
    skipDuplicates: true,
  });

  // Assign both BSIT students
  for (const sid of [U.STU_BSIT, U.GRAD_BSIT]) {
    await ensureAssignment({ courseBoundId: cbEval1.id, respondentId: sid });
  }

  // ── Course-Bound 2: BSBA MKT301 ─────────────────────────────────────
  console.log("  → Course-bound eval: MKT301...");
  const mktCourse = cMap.get("MKT301")!;
  const mktCilos = ciloMap.get("MKT301") ?? [];
  const ciloSnap2: Prisma.InputJsonValue = mktCilos.map((c) => ({
    description: c.description,
    order: c.order,
  }));
  const courseSnap2: Prisma.InputJsonValue = {
    courseCode: mktCourse.code,
    courseTitle: mktCourse.title,
    programCode: "BSBA",
    programName: "Bachelor of Science in Business Administration",
  };

  const cbEval2AssignmentId = assignmentMap.get("MKT301");
  if (!cbEval2AssignmentId) {
    throw new Error("Missing course assignment for MKT301");
  }

  const existingCbEval2 = await prisma.courseBoundEvaluation.findFirst({
    where: {
      course_assignment_id: cbEval2AssignmentId,
      term_instance_id: termInstanceId,
    },
  });

  const cbEval2Data = {
    deployment_name: "MKT301 Post-Term CILO Evaluation",
    instrument_version_id: ciloVer.id,
    cilos_snapshot: ciloSnap2,
    course_info_snapshot: courseSnap2,
    activation_at: new Date("2026-04-01T08:00:00Z"),
    deadline_at: new Date("2026-05-31T23:59:00Z"),
    status: DeploymentStatus.ACTIVE,
    published_at: new Date("2026-04-01T08:00:00Z"),
    term_instance_id: termInstanceId,
    course_assignment_id: cbEval2AssignmentId,
  };

  const cbEval2 = existingCbEval2
    ? await prisma.courseBoundEvaluation.update({
        where: { id: existingCbEval2.id },
        data: cbEval2Data,
      })
    : await prisma.courseBoundEvaluation.create({
        data: cbEval2Data,
      });

  await prisma.courseBoundEvaluationTarget.upsert({
    where: {
      course_bound_evaluation_id_program_id_year_level: {
        course_bound_evaluation_id: cbEval2.id,
        program_id: bsba.id,
        year_level: y4,
      },
    },
    update: {},
    create: { course_bound_evaluation_id: cbEval2.id, program_id: bsba.id, year_level: y4 },
  });

  await prisma.courseBoundCiloQuestionBinding.createMany({
    data: mktCilos.map((cilo) => ({
      cilo_description_snapshot: cilo.description,
      cilo_id: cilo.id,
      course_bound_evaluation_id: cbEval2.id,
      item_key: `cilo-attainment-${cilo.order}`,
      question_prompt_snapshot:
        cilo.order === 1
          ? "I achieved the first course intended learning outcome."
          : "I achieved the second course intended learning outcome.",
      section_key: "cilo-items",
    })),
    skipDuplicates: true,
  });

  // Assign BSBA students
  for (const sid of [U.STU_BSBA, U.STU_BSBA_G]) {
    await ensureAssignment({ courseBoundId: cbEval2.id, respondentId: sid });
  }

  // ── Course-Bound 3–8: New program courses ────────────────────────────
  console.log("  → New course-bound evals...");

  const newCbDefs = [
    {
      id: D.CB_BSIT_IT201,
      courseCode: "IT201",
      deployName: "IT201 Post-Term CILO Evaluation",
      progId: bsit.id,
      progCode: "BSIT",
      progName: "Bachelor of Science in Information Technology",
      ylId: y2,
      respondents: [U.STU_BSIT, U.GRAD_BSIT],
    },
    {
      id: D.CB_BSBA_FIN101,
      courseCode: "FIN101",
      deployName: "FIN101 Post-Term CILO Evaluation",
      progId: bsba.id,
      progCode: "BSBA",
      progName: "Bachelor of Science in Business Administration",
      ylId: y4,
      respondents: [U.STU_BSBA_G, U.STU_BSBA],
    },
    {
      id: D.CB_BSED_EDUC301,
      courseCode: "EDUC301",
      deployName: "EDUC301 Post-Term CILO Evaluation",
      progId: bsed.id,
      progCode: "BSED",
      progName: "Bachelor of Secondary Education",
      ylId: y3,
      respondents: [U.STU_BSED],
    },
    {
      id: D.CB_BSHM_HM401,
      courseCode: "HM401",
      deployName: "HM401 Post-Term CILO Evaluation",
      progId: bshm.id,
      progCode: "BSHM",
      progName: "Bachelor of Science in Hospitality Management",
      ylId: y4,
      respondents: [U.STU_BSHM_G, U.STU_BSHM],
    },
    {
      id: D.CB_BEED_BEED301,
      courseCode: "BEED301",
      deployName: "BEED301 Post-Term CILO Evaluation",
      progId: beed.id,
      progCode: "BEED",
      progName: "Bachelor of Elementary Education",
      ylId: y4,
      respondents: [U.STU_BEED],
    },
    {
      id: D.CB_BSSW_SW301,
      courseCode: "SW301",
      deployName: "SW301 Post-Term CILO Evaluation",
      progId: bssw.id,
      progCode: "BSSW",
      progName: "Bachelor of Science in Social Work",
      ylId: y4,
      respondents: [] as string[],
    },
  ];

  const newCbEvals = new Map<string, { id: string }>();
  for (const def of newCbDefs) {
    const course = cMap.get(def.courseCode)!;
    const courseCilos = ciloMap.get(def.courseCode) ?? [];
    const ciloSnap: Prisma.InputJsonValue = courseCilos.map((c) => ({
      description: c.description,
      order: c.order,
    }));
    const courseSnap: Prisma.InputJsonValue = {
      courseCode: course.code,
      courseTitle: course.title,
      programCode: def.progCode,
      programName: def.progName,
    };

    const cbAssignmentId = assignmentMap.get(def.courseCode);
    if (!cbAssignmentId) {
      throw new Error(`Missing course assignment for ${def.courseCode}`);
    }

    const existingCb = await prisma.courseBoundEvaluation.findFirst({
      where: {
        course_assignment_id: cbAssignmentId,
        term_instance_id: termInstanceId,
      },
    });

    const cbData = {
      deployment_name: def.deployName,
      instrument_version_id: ciloVer.id,
      cilos_snapshot: ciloSnap,
      course_info_snapshot: courseSnap,
      activation_at: new Date("2026-04-10T08:00:00Z"),
      deadline_at: new Date("2026-05-31T23:59:00Z"),
      status: DeploymentStatus.ACTIVE,
      published_at: new Date("2026-04-10T08:00:00Z"),
      term_instance_id: termInstanceId,
      course_assignment_id: cbAssignmentId,
    };

    const cb = existingCb
      ? await prisma.courseBoundEvaluation.update({ where: { id: existingCb.id }, data: cbData })
      : await prisma.courseBoundEvaluation.create({ data: cbData });

    newCbEvals.set(def.courseCode, cb);

    await prisma.courseBoundEvaluationTarget.upsert({
      where: {
        course_bound_evaluation_id_program_id_year_level: {
          course_bound_evaluation_id: cb.id,
          program_id: def.progId,
          year_level: def.ylId,
        },
      },
      update: {},
      create: { course_bound_evaluation_id: cb.id, program_id: def.progId, year_level: def.ylId },
    });

    if (courseCilos.length > 0) {
      await prisma.courseBoundCiloQuestionBinding.createMany({
        data: courseCilos.map((cilo) => ({
          cilo_description_snapshot: cilo.description,
          cilo_id: cilo.id,
          course_bound_evaluation_id: cb.id,
          item_key: `cilo-attainment-${cilo.order}`,
          question_prompt_snapshot:
            cilo.order === 1
              ? "I achieved the first course intended learning outcome."
              : cilo.order === 2
                ? "I achieved the second course intended learning outcome."
                : "I achieved the third course intended learning outcome.",
          section_key: "cilo-items",
        })),
        skipDuplicates: true,
      });
    }

    for (const respondentId of def.respondents) {
      await ensureAssignment({ courseBoundId: cb.id, respondentId });
    }
  }

  // ── Central Deployments ──────────────────────────────────────────────
  console.log("  → Central deployments...");
  const centralDefs = [
    {
      id: D.BSIT_EXIT,
      name: "BSIT Graduate Exit Evaluation",
      verId: exitVer.id,
      pid: bsit.id,
      target: TargetStakeholder.STUDENT,
      ylId: y4,
    },
    {
      id: D.BSIT_ALUMNI,
      name: "BSIT Alumni Evaluation",
      verId: alumVer.id,
      pid: bsit.id,
      target: TargetStakeholder.ALUMNI,
      ylId: null as YearLevel | null,
    },
    {
      id: D.BSIT_IND,
      name: "BSIT Industry Partner Evaluation",
      verId: indVer.id,
      pid: bsit.id,
      target: TargetStakeholder.INDUSTRY_PARTNER,
      ylId: null,
    },
    {
      id: D.BSHM_EXIT,
      name: "BSHM Graduate Exit Evaluation",
      verId: exitVer.id,
      pid: bshm.id,
      target: TargetStakeholder.STUDENT,
      ylId: y4,
    },
    {
      id: D.BSHM_IND,
      name: "BSHM Industry Partner Evaluation",
      verId: indVer.id,
      pid: bshm.id,
      target: TargetStakeholder.INDUSTRY_PARTNER,
      ylId: null,
    },
  ];

  for (const cd of centralDefs) {
    await prisma.centralDeployment.upsert({
      where: { id: cd.id },
      update: {
        deployment_name: cd.name,
        instrument_version_id: cd.verId,
        program_id: cd.pid,
        major_id: null,
        target_stakeholder: cd.target,
        activation_at: new Date("2026-04-15T08:00:00Z"),
        deadline_at: new Date("2026-06-01T23:59:00Z"),
        status: DeploymentStatus.ACTIVE,
        year_level: cd.ylId,
        term_instance_id: termInstanceId,
      },
      create: {
        id: cd.id,
        deployment_name: cd.name,
        instrument_version_id: cd.verId,
        program_id: cd.pid,
        major_id: null,
        target_stakeholder: cd.target,
        activation_at: new Date("2026-04-15T08:00:00Z"),
        deadline_at: new Date("2026-06-01T23:59:00Z"),
        status: DeploymentStatus.ACTIVE,
        year_level: cd.ylId,
        term_instance_id: termInstanceId,
      },
    });
  }

  // Central deployment assignments
  const centralAssigns = [
    { depId: D.BSIT_EXIT, respId: U.GRAD_BSIT },
    { depId: D.BSIT_ALUMNI, respId: U.ALU_BSIT },
    { depId: D.BSIT_IND, respId: U.IND_BSIT },
    { depId: D.BSHM_EXIT, respId: U.STU_BSHM_G },
    { depId: D.BSHM_IND, respId: U.IND_BSHM },
  ];

  for (const ca of centralAssigns) {
    await ensureAssignment({ centralDeploymentId: ca.depId, respondentId: ca.respId });
  }

  return { cbEval1, cbEval2, newCbEvals };
}

// ═══════════════════════════════════════════════════════════════════════════════
// F. Responses with Items
// ═══════════════════════════════════════════════════════════════════════════════

async function seedResponses(
  cbEval1Id: string,
  cbEval2Id: string,
  newCbEvals: Map<string, { id: string }>
) {
  console.log("  → Responses...");

  // Helper: create or find a response
  async function ensureResponse(opts: {
    assignmentId: string;
    respondentId: string;
    deploymentType: DeploymentType;
    deploymentId: string;
    status: ResponseStatus;
    submittedAt?: Date;
  }) {
    const existing = await prisma.response.findUnique({
      where: { assignment_id: opts.assignmentId },
    });
    if (existing) return existing;
    return prisma.response.create({
      data: {
        assignment_id: opts.assignmentId,
        respondent_id: opts.respondentId,
        deployment_type: opts.deploymentType,
        deployment_id: opts.deploymentId,
        status: opts.status,
        submitted_at: opts.submittedAt ?? null,
      },
    });
  }

  // Helper: seed quantitative items for a response
  async function seedQuantItems(
    responseId: string,
    items: { sk: string; ik: string; val: number }[]
  ) {
    for (const item of items) {
      const existing = await prisma.quantitativeResponseItem.findFirst({
        where: { response_id: responseId, section_key: item.sk, item_key: item.ik },
      });
      if (!existing) {
        await prisma.quantitativeResponseItem.create({
          data: {
            response_id: responseId,
            section_key: item.sk,
            item_key: item.ik,
            rating_value: item.val,
          },
        });
      }
    }
  }

  // Helper: seed qualitative items for a response
  async function seedQualItems(
    responseId: string,
    items: { sk: string; pk: string; text: string }[]
  ) {
    for (const item of items) {
      const existing = await prisma.qualitativeResponseItem.findFirst({
        where: { response_id: responseId, section_key: item.sk, prompt_key: item.pk },
      });
      if (!existing) {
        await prisma.qualitativeResponseItem.create({
          data: {
            response_id: responseId,
            section_key: item.sk,
            prompt_key: item.pk,
            text_content: item.text,
          },
        });
      }
    }
  }

  // ── 1. BSIT Course-Bound: STU_BSIT → SUBMITTED ──────────────────────
  console.log("    • BSIT student submitted CILO eval...");
  const asgn1 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { course_bound_id: cbEval1Id, respondent_id: U.STU_BSIT },
  });
  const resp1 = await ensureResponse({
    assignmentId: asgn1.id,
    respondentId: U.STU_BSIT,
    deploymentType: DeploymentType.COURSE_BOUND,
    deploymentId: cbEval1Id,
    status: ResponseStatus.SUBMITTED,
    submittedAt: new Date("2026-04-20T14:30:00Z"),
  });
  await seedQuantItems(resp1.id, [
    // cilo-items section (dynamic CILOs mapped by order)
    { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
    { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
    { sk: "cilo-items", ik: "cilo-attainment-3", val: 4 },
    // overall-attainment section
    { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
    // facilities section
    { sk: "facilities", ik: "facilities-1", val: 5 },
    { sk: "facilities", ik: "facilities-2", val: 4 },
    { sk: "facilities", ik: "facilities-3", val: 3 },
    { sk: "facilities", ik: "facilities-4", val: 4 },
    { sk: "facilities", ik: "facilities-5", val: 4 },
  ]);
  await seedQualItems(resp1.id, [
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
  ]);

  // ── 2. BSIT Course-Bound: GRAD_BSIT → IN_PROGRESS (draft) ───────────
  console.log("    • BSIT grad in-progress CILO eval...");
  const asgn2 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { course_bound_id: cbEval1Id, respondent_id: U.GRAD_BSIT },
  });
  const resp2 = await ensureResponse({
    assignmentId: asgn2.id,
    respondentId: U.GRAD_BSIT,
    deploymentType: DeploymentType.COURSE_BOUND,
    deploymentId: cbEval1Id,
    status: ResponseStatus.IN_PROGRESS,
  });
  // Draft: only partial items saved
  await seedQuantItems(resp2.id, [
    { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
    { sk: "cilo-items", ik: "cilo-attainment-2", val: 3 },
  ]);

  // ── 3. BSBA Course-Bound: STU_BSBA → SUBMITTED ──────────────────────
  console.log("    • BSBA student submitted CILO eval...");
  const asgn3 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { course_bound_id: cbEval2Id, respondent_id: U.STU_BSBA },
  });
  const resp3 = await ensureResponse({
    assignmentId: asgn3.id,
    respondentId: U.STU_BSBA,
    deploymentType: DeploymentType.COURSE_BOUND,
    deploymentId: cbEval2Id,
    status: ResponseStatus.SUBMITTED,
    submittedAt: new Date("2026-04-22T10:15:00Z"),
  });
  await seedQuantItems(resp3.id, [
    { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
    { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
    { sk: "overall-attainment", ik: "overall-attainment-1", val: 5 },
    { sk: "facilities", ik: "facilities-1", val: 4 },
    { sk: "facilities", ik: "facilities-2", val: 4 },
    { sk: "facilities", ik: "facilities-3", val: 5 },
    { sk: "facilities", ik: "facilities-4", val: 4 },
    { sk: "facilities", ik: "facilities-5", val: 4 },
  ]);
  await seedQualItems(resp3.id, [
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
  ]);

  // ── 4. BSIT Exit Survey: GRAD_BSIT → SUBMITTED ──────────────────────
  console.log("    • BSIT grad submitted exit survey...");
  const asgn4 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { central_deployment_id: D.BSIT_EXIT, respondent_id: U.GRAD_BSIT },
  });
  const resp4 = await ensureResponse({
    assignmentId: asgn4.id,
    respondentId: U.GRAD_BSIT,
    deploymentType: DeploymentType.CENTRAL,
    deploymentId: D.BSIT_EXIT,
    status: ResponseStatus.SUBMITTED,
    submittedAt: new Date("2026-04-18T16:00:00Z"),
  });
  await seedQuantItems(resp4.id, [
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
  ]);
  await seedQualItems(resp4.id, [
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
  ]);

  // ── 5. BSIT Alumni Eval: ALU_BSIT → SUBMITTED ───────────────────────
  console.log("    • BSIT alumni submitted alumni eval...");
  const asgn5 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { central_deployment_id: D.BSIT_ALUMNI, respondent_id: U.ALU_BSIT },
  });
  const resp5 = await ensureResponse({
    assignmentId: asgn5.id,
    respondentId: U.ALU_BSIT,
    deploymentType: DeploymentType.CENTRAL,
    deploymentId: D.BSIT_ALUMNI,
    status: ResponseStatus.SUBMITTED,
    submittedAt: new Date("2026-04-19T11:00:00Z"),
  });
  await seedQuantItems(resp5.id, [
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
  ]);
  await seedQualItems(resp5.id, [
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
  ]);

  // ── 6. BSIT Industry Eval: IND_BSIT → SUBMITTED ─────────────────────
  console.log("    • BSIT industry partner submitted eval...");
  const asgn6 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { central_deployment_id: D.BSIT_IND, respondent_id: U.IND_BSIT },
  });
  const resp6 = await ensureResponse({
    assignmentId: asgn6.id,
    respondentId: U.IND_BSIT,
    deploymentType: DeploymentType.CENTRAL,
    deploymentId: D.BSIT_IND,
    status: ResponseStatus.SUBMITTED,
    submittedAt: new Date("2026-04-21T09:30:00Z"),
  });
  await seedQuantItems(resp6.id, [
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
  ]);
  await seedQualItems(resp6.id, [
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
  ]);

  // ── 7. BSHM Exit Survey: STU_BSHM_G → SUBMITTED ─────────────────────
  console.log("    • BSHM grad submitted exit survey...");
  const asgn7 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { central_deployment_id: D.BSHM_EXIT, respondent_id: U.STU_BSHM_G },
  });
  const resp7 = await ensureResponse({
    assignmentId: asgn7.id,
    respondentId: U.STU_BSHM_G,
    deploymentType: DeploymentType.CENTRAL,
    deploymentId: D.BSHM_EXIT,
    status: ResponseStatus.SUBMITTED,
    submittedAt: new Date("2026-04-22T15:00:00Z"),
  });
  await seedQuantItems(resp7.id, [
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
  ]);
  await seedQualItems(resp7.id, [
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
  ]);

  // ── 8. BSHM Industry Eval: IND_BSHM → SUBMITTED ─────────────────────
  console.log("    • BSHM industry partner submitted eval...");
  const asgn8 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { central_deployment_id: D.BSHM_IND, respondent_id: U.IND_BSHM },
  });
  const resp8 = await ensureResponse({
    assignmentId: asgn8.id,
    respondentId: U.IND_BSHM,
    deploymentType: DeploymentType.CENTRAL,
    deploymentId: D.BSHM_IND,
    status: ResponseStatus.SUBMITTED,
    submittedAt: new Date("2026-04-23T10:00:00Z"),
  });
  await seedQuantItems(resp8.id, [
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
  ]);
  await seedQualItems(resp8.id, [
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
  ]);

  // ── 9. IT201: STU_BSIT → SUBMITTED ───────────────────────────────────
  console.log("    • BSIT IT201 student submitted CILO eval...");
  const it201Id = newCbEvals.get("IT201")!.id;
  const asgn9 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { course_bound_id: it201Id, respondent_id: U.STU_BSIT },
  });
  const resp9 = await ensureResponse({
    assignmentId: asgn9.id,
    respondentId: U.STU_BSIT,
    deploymentType: DeploymentType.COURSE_BOUND,
    deploymentId: it201Id,
    status: ResponseStatus.SUBMITTED,
    submittedAt: new Date("2026-04-24T10:00:00Z"),
  });
  await seedQuantItems(resp9.id, [
    { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
    { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
    { sk: "cilo-items", ik: "cilo-attainment-3", val: 4 },
    { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
    { sk: "facilities", ik: "facilities-1", val: 5 },
    { sk: "facilities", ik: "facilities-2", val: 4 },
    { sk: "facilities", ik: "facilities-3", val: 4 },
    { sk: "facilities", ik: "facilities-4", val: 3 },
    { sk: "facilities", ik: "facilities-5", val: 4 },
  ]);
  await seedQualItems(resp9.id, [
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
  ]);

  // ── 10. IT201: GRAD_BSIT → IN_PROGRESS ──────────────────────────────
  console.log("    • BSIT IT201 grad in-progress CILO eval...");
  const asgn10 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { course_bound_id: it201Id, respondent_id: U.GRAD_BSIT },
  });
  const resp10 = await ensureResponse({
    assignmentId: asgn10.id,
    respondentId: U.GRAD_BSIT,
    deploymentType: DeploymentType.COURSE_BOUND,
    deploymentId: it201Id,
    status: ResponseStatus.IN_PROGRESS,
  });
  await seedQuantItems(resp10.id, [
    { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
    { sk: "cilo-items", ik: "cilo-attainment-2", val: 5 },
  ]);

  // ── 11. FIN101: STU_BSBA_G → SUBMITTED ──────────────────────────────
  console.log("    • BSBA FIN101 student submitted CILO eval...");
  const fin101Id = newCbEvals.get("FIN101")!.id;
  const asgn11 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { course_bound_id: fin101Id, respondent_id: U.STU_BSBA_G },
  });
  const resp11 = await ensureResponse({
    assignmentId: asgn11.id,
    respondentId: U.STU_BSBA_G,
    deploymentType: DeploymentType.COURSE_BOUND,
    deploymentId: fin101Id,
    status: ResponseStatus.SUBMITTED,
    submittedAt: new Date("2026-04-25T09:30:00Z"),
  });
  await seedQuantItems(resp11.id, [
    { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
    { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
    { sk: "overall-attainment", ik: "overall-attainment-1", val: 5 },
    { sk: "facilities", ik: "facilities-1", val: 4 },
    { sk: "facilities", ik: "facilities-2", val: 3 },
    { sk: "facilities", ik: "facilities-3", val: 4 },
    { sk: "facilities", ik: "facilities-4", val: 4 },
    { sk: "facilities", ik: "facilities-5", val: 4 },
  ]);
  await seedQualItems(resp11.id, [
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
  ]);

  // ── 12. FIN101: STU_BSBA → IN_PROGRESS ──────────────────────────────
  console.log("    • BSBA FIN101 student in-progress CILO eval...");
  const asgn12 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { course_bound_id: fin101Id, respondent_id: U.STU_BSBA },
  });
  const resp12 = await ensureResponse({
    assignmentId: asgn12.id,
    respondentId: U.STU_BSBA,
    deploymentType: DeploymentType.COURSE_BOUND,
    deploymentId: fin101Id,
    status: ResponseStatus.IN_PROGRESS,
  });
  await seedQuantItems(resp12.id, [
    { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
  ]);

  // ── 13. EDUC301: STU_BSED → SUBMITTED ───────────────────────────────
  console.log("    • BSED EDUC301 student submitted CILO eval...");
  const educ301Id = newCbEvals.get("EDUC301")!.id;
  const asgn13 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { course_bound_id: educ301Id, respondent_id: U.STU_BSED },
  });
  const resp13 = await ensureResponse({
    assignmentId: asgn13.id,
    respondentId: U.STU_BSED,
    deploymentType: DeploymentType.COURSE_BOUND,
    deploymentId: educ301Id,
    status: ResponseStatus.SUBMITTED,
    submittedAt: new Date("2026-04-24T14:00:00Z"),
  });
  await seedQuantItems(resp13.id, [
    { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
    { sk: "cilo-items", ik: "cilo-attainment-2", val: 5 },
    { sk: "cilo-items", ik: "cilo-attainment-3", val: 4 },
    { sk: "overall-attainment", ik: "overall-attainment-1", val: 4 },
    { sk: "facilities", ik: "facilities-1", val: 4 },
    { sk: "facilities", ik: "facilities-2", val: 3 },
    { sk: "facilities", ik: "facilities-3", val: 4 },
    { sk: "facilities", ik: "facilities-4", val: 4 },
    { sk: "facilities", ik: "facilities-5", val: 4 },
  ]);
  await seedQualItems(resp13.id, [
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
  ]);

  // ── 14. HM401: STU_BSHM_G → SUBMITTED ───────────────────────────────
  console.log("    • BSHM HM401 student submitted CILO eval...");
  const hm401Id = newCbEvals.get("HM401")!.id;
  const asgn14 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { course_bound_id: hm401Id, respondent_id: U.STU_BSHM_G },
  });
  const resp14 = await ensureResponse({
    assignmentId: asgn14.id,
    respondentId: U.STU_BSHM_G,
    deploymentType: DeploymentType.COURSE_BOUND,
    deploymentId: hm401Id,
    status: ResponseStatus.SUBMITTED,
    submittedAt: new Date("2026-04-26T11:00:00Z"),
  });
  await seedQuantItems(resp14.id, [
    { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
    { sk: "cilo-items", ik: "cilo-attainment-2", val: 5 },
    { sk: "overall-attainment", ik: "overall-attainment-1", val: 5 },
    { sk: "facilities", ik: "facilities-1", val: 5 },
    { sk: "facilities", ik: "facilities-2", val: 4 },
    { sk: "facilities", ik: "facilities-3", val: 4 },
    { sk: "facilities", ik: "facilities-4", val: 4 },
    { sk: "facilities", ik: "facilities-5", val: 5 },
  ]);
  await seedQualItems(resp14.id, [
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
  ]);

  // ── 15. HM401: STU_BSHM → IN_PROGRESS ───────────────────────────────
  console.log("    • BSHM HM401 student in-progress CILO eval...");
  const asgn15 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { course_bound_id: hm401Id, respondent_id: U.STU_BSHM },
  });
  const resp15 = await ensureResponse({
    assignmentId: asgn15.id,
    respondentId: U.STU_BSHM,
    deploymentType: DeploymentType.COURSE_BOUND,
    deploymentId: hm401Id,
    status: ResponseStatus.IN_PROGRESS,
  });
  await seedQuantItems(resp15.id, [
    { sk: "cilo-items", ik: "cilo-attainment-1", val: 4 },
    { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
  ]);

  // ── 16. BEED301: STU_BEED → SUBMITTED ───────────────────────────────
  console.log("    • BEED BEED301 student submitted CILO eval...");
  const beed301Id = newCbEvals.get("BEED301")!.id;
  const asgn16 = await prisma.evaluationAssignment.findFirstOrThrow({
    where: { course_bound_id: beed301Id, respondent_id: U.STU_BEED },
  });
  const resp16 = await ensureResponse({
    assignmentId: asgn16.id,
    respondentId: U.STU_BEED,
    deploymentType: DeploymentType.COURSE_BOUND,
    deploymentId: beed301Id,
    status: ResponseStatus.SUBMITTED,
    submittedAt: new Date("2026-04-25T15:00:00Z"),
  });
  await seedQuantItems(resp16.id, [
    { sk: "cilo-items", ik: "cilo-attainment-1", val: 5 },
    { sk: "cilo-items", ik: "cilo-attainment-2", val: 4 },
    { sk: "overall-attainment", ik: "overall-attainment-1", val: 5 },
    { sk: "facilities", ik: "facilities-1", val: 4 },
    { sk: "facilities", ik: "facilities-2", val: 4 },
    { sk: "facilities", ik: "facilities-3", val: 3 },
    { sk: "facilities", ik: "facilities-4", val: 4 },
    { sk: "facilities", ik: "facilities-5", val: 4 },
  ]);
  await seedQualItems(resp16.id, [
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
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("🌱 Seeding CLOIE database...\n");

  console.log("[A] Foundation data...");
  const { pMap, mMap, cMap } = await seedFoundation();

  console.log("[A.5] Academic calendar...");
  const { termInstance, termInstances } = await seedAcademicCalendar();

  console.log("[B] Users & roles...");
  const { students } = await seedUsers(pMap, mMap, termInstance.id);

  console.log("[B.5] Course assignments...");
  const assignmentMap = await seedCourseAssignments(pMap, cMap, termInstance.id);

  console.log("[C] Outcomes (GOs, CILOs, mappings)...");
  const { ciloMap } = await seedOutcomes(pMap, cMap);

  console.log("[D] Instrument templates...");
  await seedTemplates();

  console.log("[E] Evaluations & deployments...");
  const { cbEval1, cbEval2, newCbEvals } = await seedEvaluations(
    pMap,
    cMap,
    ciloMap,
    termInstance.id,
    assignmentMap
  );

  console.log("[F] Responses with items...");
  await seedResponses(cbEval1.id, cbEval2.id, newCbEvals);

  console.log("\n✅ Seed complete!");
}

if (!process.env.VITEST) {
  main()
    .catch((e) => {
      console.error("❌ Seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
