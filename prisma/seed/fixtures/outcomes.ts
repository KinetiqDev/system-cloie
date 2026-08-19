import { U } from "../constants/ids";

export const ploDefs = [
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
] as const;

export const ciloDefsIT = [
  {
    courseCode: "ITRES1",
    desc: "Defend the proposed capstone scope and methodology.",
    order: 1,
    createdBy: U.FAC_BSIT,
  },
  {
    courseCode: "ITRES1",
    desc: "Present a coherent research and implementation plan.",
    order: 2,
    createdBy: U.FAC_BSIT,
  },
  {
    courseCode: "ITRES1",
    desc: "Demonstrate technical feasibility of the proposed solution.",
    order: 3,
    createdBy: U.FAC_BSIT,
  },
] as const;

export const ciloDefsMKT = [
  {
    courseCode: "MM201",
    desc: "Develop a comprehensive marketing plan for a real or simulated business.",
    order: 1,
    createdBy: U.FAC_BSBA,
  },
  {
    courseCode: "MM201",
    desc: "Analyze market trends and consumer behavior using research methodologies.",
    order: 2,
    createdBy: U.FAC_BSBA,
  },
] as const;

export const ciloDefsGeneralEducation = [
  // GESTECH — Science, Technology and Society
  {
    courseCode: "GESTECH",
    desc: "Analyze the interactions between science, technology, and society across historical and contemporary contexts.",
    order: 1,
    createdBy: U.FAC_BSIT,
  },
  {
    courseCode: "GESTECH",
    desc: "Evaluate the ethical and social implications of technological developments.",
    order: 2,
    createdBy: U.FAC_BSIT,
  },
  {
    courseCode: "GESTECH",
    desc: "Propose responsible applications of science and technology for community well-being.",
    order: 3,
    createdBy: U.FAC_BSIT,
  },
] as const;

export const ciloDefsNewCourses = [
  // IT201 — Data Structures
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
  // FM200 — Financial Management
  {
    courseCode: "FM200",
    desc: "Apply financial management concepts to evaluate organizational financial decisions.",
    order: 1,
    createdBy: U.FAC_BSBA,
  },
  {
    courseCode: "FM200",
    desc: "Analyze financial statements and ratios to support management planning and control.",
    order: 2,
    createdBy: U.FAC_BSBA,
  },
  // ENG2 — Principles and Theories of Language Acquisition and Learning
  {
    courseCode: "ENG2",
    desc: "Explain major theories of language acquisition and learning and their classroom implications.",
    order: 1,
    createdBy: U.FAC_BSED,
  },
  {
    courseCode: "ENG2",
    desc: "Compare first- and second-language acquisition processes and the factors that affect language learning.",
    order: 2,
    createdBy: U.FAC_BSED,
  },
  {
    courseCode: "ENG2",
    desc: "Apply principles and theories of language learning to instructional practices.",
    order: 3,
    createdBy: U.FAC_BSED,
  },
  // HTC401 — Entrepreneurship in Tourism and Hospitality
  {
    courseCode: "HTC401",
    desc: "Identify entrepreneurial opportunities and develop a business plan for tourism and hospitality ventures.",
    order: 1,
    createdBy: U.FAC_BSHM,
  },
  {
    courseCode: "HTC401",
    desc: "Evaluate the feasibility, marketing, and financial viability of tourism and hospitality enterprises.",
    order: 2,
    createdBy: U.FAC_BSHM,
  },
  // EDUC11E — Teaching Internship (Elementary)
  {
    courseCode: "EDUC11E",
    desc: "Demonstrate effective classroom management and age-appropriate instructional strategies.",
    order: 1,
    createdBy: U.FAC_BSED,
  },
  {
    courseCode: "EDUC11E",
    desc: "Design and implement lesson plans that address diverse learner needs in elementary grades.",
    order: 2,
    createdBy: U.FAC_BSED,
  },
  // SW312 — Social Work Research 1 (Development of a Research Design)
  {
    courseCode: "SW312",
    desc: "Formulate a research design that addresses a social work practice problem.",
    order: 1,
    createdBy: U.FAC_BSED,
  },
  {
    courseCode: "SW312",
    desc: "Critique research methods and ethical considerations applicable to social work research.",
    order: 2,
    createdBy: U.FAC_BSED,
  },
] as const;

/**
 * Program-specific CILO → PLO mapping pairs with their explicit manifestation
 * classification. Every seeded mapping carries a manifestation; legacy rows
 * created before the manifestation column are classified on reseed.
 */
export const ciloMappingDefs = [
  // ITRES1 → BSIT PLOs
  {
    courseCode: "ITRES1",
    ciloOrder: 1,
    ploCode: "BSIT-GO1",
    manifestation: "PRACTICE",
  },
  {
    courseCode: "ITRES1",
    ciloOrder: 2,
    ploCode: "BSIT-GO1",
    manifestation: "PRACTICE",
  },
  {
    courseCode: "ITRES1",
    ciloOrder: 3,
    ploCode: "BSIT-GO3",
    manifestation: "OPPORTUNITY",
  },
  // MM201 → BSBA PLOs
  {
    courseCode: "MM201",
    ciloOrder: 1,
    ploCode: "BSBA-GO1",
    manifestation: "LEARNING",
  },
  {
    courseCode: "MM201",
    ciloOrder: 2,
    ploCode: "BSBA-GO2",
    manifestation: "PRACTICE",
  },
] as const;

/** College-wide Institutional Learning Outcomes. Codes stay unique across archive/restore. */
export const iloDefs = [
  {
    code: "ILO1",
    description:
      "Apply critical thinking and evidence-based reasoning to complex academic and professional problems.",
    order: 1,
  },
  {
    code: "ILO2",
    description:
      "Communicate ideas clearly and responsibly in written, oral, and multimodal academic contexts.",
    order: 2,
  },
  {
    code: "ILO3",
    description:
      "Act with ethical responsibility, professional integrity, and respect for human dignity.",
    order: 3,
  },
  {
    code: "ILO4",
    description:
      "Collaborate across disciplines and communities to produce inclusive, socially responsible outcomes.",
    order: 4,
  },
  {
    code: "ILO5",
    description:
      "Pursue lifelong learning and adapt knowledge to evolving civic, technological, and professional contexts.",
    order: 5,
  },
] as const;
