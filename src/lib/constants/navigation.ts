import {
  LayoutDashboard,
  FileText,
  History,
  UserCircle,
  ClipboardList,
  Building2,
  BookOpen,
  Layers3,
  BarChart3,
  Users2,
  UsersRound,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import { ROLES, type Role } from "@/lib/constants/roles";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badgeCount?: number;
}

export interface NavGroup {
  name: string;
  href: string;
  icon: LucideIcon;
  items: NavItem[];
}

const STUDENT_NAV: NavItem[] = [
  { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { name: "My Evaluations", href: "/student/evaluations", icon: FileText },
  { name: "Submission History", href: "/student/history", icon: History },
  { name: "Profile", href: "/student/profile", icon: UserCircle },
];

const STUDENT_MOBILE_NAV: NavItem[] = [
  { name: "Home", href: "/student/dashboard", icon: LayoutDashboard },
  { name: "Evaluations", href: "/student/evaluations", icon: FileText },
  { name: "History", href: "/student/history", icon: History },
  { name: "Profile", href: "/student/profile", icon: UserCircle },
];

const FACULTY_NAV: NavItem[] = [
  { name: "Dashboard", href: "/faculty/dashboard", icon: LayoutDashboard },
  { name: "Manage CILOs", href: "/faculty/cilos", icon: BookOpen },
  { name: "Tools", href: "/faculty/tools", icon: ClipboardList },
  { name: "Profile", href: "/faculty/profile", icon: UserCircle },
];

const SECRETARY_NAV: NavItem[] = [
  { name: "Dashboard", href: "/secretary/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/secretary/users", icon: Users2 },
  { name: "School Years", href: "/secretary/school-years", icon: Calendar },
  { name: "Programs", href: "/secretary/programs", icon: Building2 },
  { name: "Courses", href: "/secretary/courses", icon: BookOpen },
  { name: "Course Assignments", href: "/secretary/course-assignments", icon: UsersRound },
  { name: "Tools", href: "/secretary/instruments", icon: ClipboardList },
];

const PROGRAM_HEAD_NAV: NavItem[] = [
  { name: "Dashboard", href: "/program-head/dashboard", icon: LayoutDashboard },
  { name: "Courses", href: "/program-head/courses", icon: BookOpen },
  { name: "Course Assignments", href: "/program-head/course-assignments", icon: UsersRound },
  { name: "Outcomes", href: "/program-head/outcomes", icon: Layers3 },
  { name: "Tools", href: "/program-head/tools", icon: FileText },
  { name: "Analytics", href: "/program-head/analytics", icon: BarChart3 },
  { name: "Reports", href: "/program-head/reports", icon: FileText },
  { name: "Profile", href: "/program-head/profile", icon: UserCircle },
];

const DEAN_PRIMARY_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dean/dashboard", icon: LayoutDashboard },
  { name: "Structure", href: "/dean/academic-structure", icon: Building2 },
  { name: "Oversight", href: "/dean/college-oversight", icon: Layers3 },
  { name: "Profile", href: "/dean/profile", icon: UserCircle },
];

const DEAN_NAV_GROUPS: NavGroup[] = [
  {
    name: "Academic Structure",
    href: "/dean/academic-structure",
    icon: Building2,
    items: [
      { name: "Programs", href: "/dean/academic-structure/programs", icon: Building2 },
      { name: "Courses", href: "/dean/academic-structure/courses", icon: BookOpen },
      {
        name: "Course Assignments",
        href: "/dean/academic-structure/course-assignments",
        icon: UsersRound,
      },
      { name: "Instruments", href: "/dean/academic-structure/instruments", icon: Layers3 },
    ],
  },
  {
    name: "College Oversight",
    href: "/dean/college-oversight",
    icon: Layers3,
    items: [
      {
        name: "Learning Outcomes",
        href: "/dean/college-oversight/learning-outcomes",
        icon: BookOpen,
      },
      { name: "Enrollments", href: "/dean/college-oversight/enrollments", icon: UsersRound },
    ],
  },
];

const ALUMNI_NAV: NavItem[] = [
  { name: "Dashboard", href: "/alumni/dashboard", icon: LayoutDashboard },
  { name: "My Evaluations", href: "/alumni/evaluations", icon: FileText },
  { name: "Submission History", href: "/alumni/history", icon: History },
  { name: "Profile", href: "/alumni/profile", icon: UserCircle },
];

const INDUSTRY_PARTNER_NAV: NavItem[] = [
  { name: "Dashboard", href: "/industry-partner/dashboard", icon: LayoutDashboard },
  { name: "My Evaluations", href: "/industry-partner/evaluations", icon: FileText },
  { name: "Submission History", href: "/industry-partner/history", icon: History },
  { name: "Profile", href: "/industry-partner/profile", icon: UserCircle },
];

const DEFAULT_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

const ROLE_NAV_PRECEDENCE = [
  ROLES.SECRETARY,
  ROLES.DEAN,
  ROLES.PROGRAM_HEAD,
  ROLES.FACULTY,
  ROLES.INDUSTRY_PARTNER,
  ROLES.ALUMNI,
  ROLES.STUDENT,
] as const;

export function getHighestNavRole(roles: Role[]) {
  return ROLE_NAV_PRECEDENCE.find((role) => roles.includes(role)) ?? null;
}

export function getMainNavByRoles(roles: Role[]): NavItem[] {
  const highestRole = getHighestNavRole(roles);

  switch (highestRole) {
    case ROLES.SECRETARY:
      return SECRETARY_NAV;
    case ROLES.DEAN:
      return DEAN_PRIMARY_NAV;
    case ROLES.PROGRAM_HEAD:
      return PROGRAM_HEAD_NAV;
    case ROLES.FACULTY:
      return FACULTY_NAV;
    case ROLES.STUDENT:
      return STUDENT_NAV;
    case ROLES.ALUMNI:
      return ALUMNI_NAV;
    case ROLES.INDUSTRY_PARTNER:
      return INDUSTRY_PARTNER_NAV;
    default:
      return DEFAULT_NAV;
  }
}

export function getMobileNavByRoles(roles: Role[]): NavItem[] {
  const highestRole = getHighestNavRole(roles);

  switch (highestRole) {
    case ROLES.SECRETARY:
      return SECRETARY_NAV;
    case ROLES.DEAN:
      return DEAN_PRIMARY_NAV;
    case ROLES.PROGRAM_HEAD:
      return PROGRAM_HEAD_NAV;
    case ROLES.FACULTY:
      return FACULTY_NAV;
    case ROLES.STUDENT:
      return STUDENT_MOBILE_NAV;
    case ROLES.ALUMNI:
      return ALUMNI_NAV;
    case ROLES.INDUSTRY_PARTNER:
      return INDUSTRY_PARTNER_NAV;
    default:
      return DEFAULT_NAV;
  }
}

export function getDeanNavGroups(): NavGroup[] {
  return DEAN_NAV_GROUPS;
}

export function getDeanPrimaryNav(): NavItem[] {
  return DEAN_PRIMARY_NAV;
}

export function getDeanStandaloneNav(): NavItem[] {
  return DEAN_PRIMARY_NAV.filter(
    (item) => item.href === "/dean/dashboard" || item.href === "/dean/profile"
  );
}

export function isNavItemActive(pathname: string, href: string): boolean {
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  const normalizedHref = href.replace(/\/$/, "") || "/";
  return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
}

export function getDeanActiveGroup(pathname: string): NavGroup | null {
  return getDeanNavGroups().find((group) => isNavItemActive(pathname, group.href)) ?? null;
}

export function getDeanActiveItem(pathname: string): NavItem | null {
  const items = [...getDeanPrimaryNav(), ...getDeanNavGroups().flatMap((group) => group.items)];
  return (
    items
      .filter((item) => isNavItemActive(pathname, item.href))
      .sort((left, right) => right.href.length - left.href.length)[0] ?? null
  );
}

export function getSecondaryNavByRoles(roles: Role[]): NavItem[] {
  void roles;
  return [];
}

export type MobileNavMode = "bottom-nav" | "hamburger" | "dean-tabs";

/**
 * Admin, Dean, Program Head, and Faculty use a hamburger sidebar on mobile.
 * Student, Alumni, and Industry Partner use a bottom navigation bar.
 */
export function getMobileNavMode(roles: Role[]): MobileNavMode {
  const highestRole = getHighestNavRole(roles);

  switch (highestRole) {
    case ROLES.SECRETARY:
    case ROLES.PROGRAM_HEAD:
    case ROLES.FACULTY:
      return "hamburger";
    case ROLES.DEAN:
      return "dean-tabs";
    default:
      return "bottom-nav";
  }
}
