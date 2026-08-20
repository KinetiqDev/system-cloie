import { ROLES } from "@/lib/constants/roles";

export type RoleCategory = "self_service_internal" | "self_service_external" | "pre_provisioned_admin" | "provisioned_faculty";

export type RoleCardConfig = {
  role: string;
  title: string;
  description: string;
  iconName: string;
  category: RoleCategory;
};

export const ROLE_CARDS: RoleCardConfig[] = [
  {
    role: ROLES.SECRETARY,
    title: "Secretary",
    description: "Manage system settings, users, academic terms, and global configurations.",
    iconName: "ShieldCheck",
    category: "pre_provisioned_admin",
  },
  {
    role: ROLES.DEAN,
    title: "Dean",
    description: "Oversee program evaluations and academic alignment.",
    iconName: "Building2",
    category: "pre_provisioned_admin",
  },
  {
    role: ROLES.PROGRAM_HEAD,
    title: "Program Head",
    description: "Manage curriculum maps, course assignments, and templates.",
    iconName: "UserCog",
    category: "pre_provisioned_admin",
  },
  {
    role: ROLES.FACULTY,
    title: "Faculty",
    description: "Conduct evaluations and manage course-bound assessments.",
    iconName: "BookOpen",
    category: "self_service_internal",
  },
  {
    role: ROLES.STUDENT,
    title: "Student",
    description: "Participate in surveys, evaluations, and view history.",
    iconName: "GraduationCap",
    category: "self_service_internal",
  },
  {
    role: ROLES.ALUMNI,
    title: "Alumni",
    description: "Engage with graduate tracer studies and feedback.",
    iconName: "Users",
    category: "self_service_external",
  },
  {
    role: ROLES.INDUSTRY_PARTNER,
    title: "Industry Partner",
    description: "Provide feedback on program outcomes and student readiness.",
    iconName: "Briefcase",
    category: "self_service_external",
  },
  {
    role: ROLES.GEN_ED_COORDINATOR,
    title: "Gen Ed Coordinator",
    description: "Coordinate General Education course assignments across programs.",
    iconName: "Library",
    category: "pre_provisioned_admin",
  },
];

export const ROLE_CARDS_STAFF = ROLE_CARDS.filter(
  (r) =>
    r.category === "pre_provisioned_admin" ||
    r.category === "provisioned_faculty" ||
    r.role === ROLES.FACULTY
);

export const ROLE_CARDS_RESPONDENT = ROLE_CARDS.filter(
  (r) =>
    r.role === ROLES.STUDENT || r.role === ROLES.ALUMNI || r.role === ROLES.INDUSTRY_PARTNER
);
