import { SystemRole } from "@prisma/client";

export const DEMO_USERS = [
  // ── Existing 7 core users ─────────────────────────────────────────────────
  { email: "demo-secretary@cloie.test", label: "Secretary", role: SystemRole.SECRETARY },
  { email: "demo-dean@cloie.test", label: "Dean", role: SystemRole.DEAN },
  { email: "demo-ph@cloie.test", label: "Program Head (BSIT)", role: SystemRole.PROGRAM_HEAD },
  { email: "demo-faculty@cloie.test", label: "Faculty (BSIT)", role: SystemRole.FACULTY },
  { email: "demo-student@cloie.test", label: "Student (BSIT)", role: SystemRole.STUDENT },
  { email: "demo-grad@cloie.test", label: "Graduating Student (BSIT)", role: SystemRole.STUDENT },
  { email: "demo-alumni@cloie.test", label: "Alumni (BSIT)", role: SystemRole.ALUMNI },
  {
    email: "demo-industry@cloie.test",
    label: "Industry Partner (BSIT)",
    role: SystemRole.INDUSTRY_PARTNER,
  },

  // ── New Program Heads (5) ─────────────────────────────────────────────────
  { email: "ph-beed@cloie.test", label: "PH — Maria Santos (BEED)", role: SystemRole.PROGRAM_HEAD },
  { email: "ph-bsed@cloie.test", label: "PH — Jose Reyes (BSED)", role: SystemRole.PROGRAM_HEAD },
  { email: "ph-bssw@cloie.test", label: "PH — Ana Cruz (BSSW)", role: SystemRole.PROGRAM_HEAD },
  { email: "ph-bsba@cloie.test", label: "PH — Roberto Lim (BSBA)", role: SystemRole.PROGRAM_HEAD },
  {
    email: "ph-bshm@cloie.test",
    label: "PH — Carmen Flores (BSHM)",
    role: SystemRole.PROGRAM_HEAD,
  },

  // ── New Faculty (3) ───────────────────────────────────────────────────────
  {
    email: "faculty-bsed@cloie.test",
    label: "Faculty — Elena Torres (BSED)",
    role: SystemRole.FACULTY,
  },
  {
    email: "faculty-bsba@cloie.test",
    label: "Faculty — Marco Villanueva (BSBA)",
    role: SystemRole.FACULTY,
  },
  {
    email: "faculty-bshm@cloie.test",
    label: "Faculty — Lisa Mendoza (BSHM)",
    role: SystemRole.FACULTY,
  },

  // ── New Students (6) ──────────────────────────────────────────────────────
  {
    email: "student-bsed@cloie.test",
    label: "Student — Juan Dela Cruz (BSED)",
    role: SystemRole.STUDENT,
  },
  {
    email: "student-bsba@cloie.test",
    label: "Student — Angela Reyes (BSBA)",
    role: SystemRole.STUDENT,
  },
  {
    email: "student-bsba-grad@cloie.test",
    label: "Graduating — Carlos Santos (BSBA)",
    role: SystemRole.STUDENT,
  },
  {
    email: "student-beed@cloie.test",
    label: "Student — Patricia Luna (BEED)",
    role: SystemRole.STUDENT,
  },
  {
    email: "student-bshm@cloie.test",
    label: "Student — Daniel Tan (BSHM)",
    role: SystemRole.STUDENT,
  },
  {
    email: "student-bshm-grad@cloie.test",
    label: "Graduating — Grace Aquino (BSHM)",
    role: SystemRole.STUDENT,
  },

  // ── New External (2) ──────────────────────────────────────────────────────
  { email: "alumni-bsba@cloie.test", label: "Alumni — Miguel Ong (BSBA)", role: SystemRole.ALUMNI },
  {
    email: "industry-bshm@cloie.test",
    label: "Industry — Karen Sy (BSHM)",
    role: SystemRole.INDUSTRY_PARTNER,
  },
  {
    email: "demo-gened@cloie.test",
    label: "Gen Ed Coordinator",
    role: SystemRole.GEN_ED_COORDINATOR,
  },
] as const;

export const DEMO_USER_EMAILS = DEMO_USERS.map((user) => user.email);

export const DEMO_USER_EMAIL_SET: Set<string> = new Set(DEMO_USER_EMAILS);

const DEDICATED_DEMO_LABEL_OVERRIDES: Record<string, string> = {
  "demo-dean@cloie.test": "College Dean",
  "demo-ph@cloie.test": "Program Head",
  "demo-faculty@cloie.test": "Faculty Member",
  "demo-student@cloie.test": "Student",
  "demo-alumni@cloie.test": "Alumni",
  "demo-industry@cloie.test": "Industry Partner",
};

const DEDICATED_DEMO_CORE_ORDER = [
  "demo-secretary@cloie.test",
  "demo-dean@cloie.test",
  "demo-ph@cloie.test",
  "demo-faculty@cloie.test",
  "demo-student@cloie.test",
  "demo-alumni@cloie.test",
  "demo-industry@cloie.test",
  "demo-gened@cloie.test",
] as const;

const coreUsers = DEDICATED_DEMO_CORE_ORDER.map((email) => {
  const user = DEMO_USERS.find((entry) => entry.email === email);
  if (!user) throw new Error(`Missing demo user for dedicated catalog: ${email}`);
  const label = DEDICATED_DEMO_LABEL_OVERRIDES[email] ?? user.label;
  return { ...user, label } as typeof user & { label: string };
});

const additionalUsers = DEMO_USERS.filter(
  (user) => !(DEDICATED_DEMO_CORE_ORDER as readonly string[]).includes(user.email)
);

export const DEDICATED_DEMO_USERS = [...coreUsers, ...additionalUsers] as const;
