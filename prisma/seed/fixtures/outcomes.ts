import { U } from "../constants/ids";

export const goDefs = [
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
] as const;

export const ciloDefsMKT = [
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
] as const;

export const ciloDefsNewCourses = [
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
] as const;
