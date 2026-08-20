import type { Role } from "@/lib/constants/roles";
import { ROLES } from "@/lib/constants/roles";
import {
  getMainNavByRoles,
  getMobileNavByRoles,
  getMobileNavMode,
  getDeanNavGroups,
  getDeanStandaloneNav,
  getNavItemIdentity,
  type NavItem,
} from "@/lib/constants/navigation";
import { NavigationRow, BottomNavRow } from "@/components/layout/navigation-row";
import { MobileSidebarDrawer } from "@/components/layout/mobile-sidebar-drawer";

const ROLE_ORDER: Role[] = [
  ROLES.SECRETARY,
  ROLES.DEAN,
  ROLES.PROGRAM_HEAD,
  ROLES.FACULTY,
  ROLES.STUDENT,
  ROLES.ALUMNI,
  ROLES.INDUSTRY_PARTNER,
  ROLES.GEN_ED_COORDINATOR,
];

const ROLE_LABELS: Record<Role, string> = {
  SECRETARY: "Secretary",
  DEAN: "Dean",
  PROGRAM_HEAD: "Program Head",
  FACULTY: "Faculty",
  STUDENT: "Student",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry Partner",
  GEN_ED_COORDINATOR: "Gen Ed Coordinator",
};

function ItemLine({ item }: { item: NavItem }) {
  return (
    <li className="text-body-sm text-muted-foreground flex items-center gap-2">
      <item.icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="text-foreground">{item.name}</span>
      <span className="text-caption truncate font-mono">{item.href}</span>
    </li>
  );
}

export function NavigationShowcase() {
  const secretary = getMainNavByRoles([ROLES.SECRETARY]);
  const deanGroups = getDeanNavGroups();
  const [deanDashboard, deanProfile] = getDeanStandaloneNav();
  const studentMobile = getMobileNavByRoles([ROLES.STUDENT]);
  const SecretaryDashboardIcon = secretary[0].icon;
  const courseAssignments = secretary.find(
    (item) => item.href === "/secretary/course-assignments"
  )!;
  const CourseAssignmentsIcon = courseAssignments.icon;
  const DeanDashboardIcon = deanDashboard.icon;
  const DeanProfileIcon = deanProfile.icon;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">
          Central role-aware declarations
        </h3>
        <p className="text-body-sm text-muted-foreground max-w-2xl">
          Every item below is rendered from the real{" "}
          <code className="border-border bg-card rounded border px-1 py-0.5 font-mono">
            src/lib/constants/navigation.ts
          </code>{" "}
          arrays through the production getters — nothing is re-declared for the showcase.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_ORDER.map((role) => {
            const items = getMainNavByRoles([role]);
            const mode = getMobileNavMode([role]);
            return (
              <div
                key={role}
                className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-label-md text-foreground">{ROLE_LABELS[role]}</span>
                  <span
                    className={
                      mode === "bottom-nav"
                        ? "bg-info-soft text-label-sm text-info rounded-full px-2 py-0.5"
                        : "bg-primary text-label-sm text-primary-foreground rounded-full px-2 py-0.5"
                    }
                  >
                    {mode === "bottom-nav" ? "Bottom navigation" : "Hamburger drawer"}
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {items.map((item) => (
                    <ItemLine key={getNavItemIdentity(item)} item={item} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Navigation link states</h3>
        <p className="text-body-sm text-muted-foreground max-w-2xl">
          The real shared presentation rows — sidebar, Dean rail, admin drawer, and respondent
          bottom navigation all render through these components. The selected row carries the same{" "}
          <code className="border-border bg-card rounded border px-1 py-0.5 font-mono">
            aria-current=&quot;page&quot;
          </code>{" "}
          marking used by the shells.
        </p>
        <div className="divide-border border-border bg-card divide-y rounded-lg border">
          <div className="grid grid-cols-1 items-center gap-3 px-3 py-3 md:grid-cols-[10rem_1fr]">
            <span className="text-body-sm text-muted-foreground">Default</span>
            <div className="flex flex-wrap items-center gap-2.5">
              <NavigationRow href={secretary[0].href}>
                <SecretaryDashboardIcon className="size-5 shrink-0" aria-hidden="true" />
                {secretary[0].name}
              </NavigationRow>
            </div>
          </div>
          <div className="grid grid-cols-1 items-center gap-3 px-3 py-3 md:grid-cols-[10rem_1fr]">
            <span className="text-body-sm text-muted-foreground">Selected (current page)</span>
            <div className="flex flex-wrap items-center gap-2.5">
              <NavigationRow
                href={courseAssignments.href}
                active
                aria-current="page"
                className="justify-between"
              >
                <div className="flex items-center gap-3">
                  <CourseAssignmentsIcon className="size-5 shrink-0" aria-hidden="true" />
                  {courseAssignments.name}
                </div>
                <span className="bg-sidebar-primary text-sidebar-primary-foreground text-label-sm flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 leading-none">
                  5
                </span>
              </NavigationRow>
            </div>
          </div>
          <div className="grid grid-cols-1 items-center gap-3 px-3 py-3 md:grid-cols-[10rem_1fr]">
            <span className="text-body-sm text-muted-foreground">Dean rail (compact)</span>
            <div className="flex flex-wrap items-center gap-2.5">
              <NavigationRow
                href={deanDashboard.href}
                active
                rail
                aria-current="page"
                title={deanDashboard.name}
              >
                <DeanDashboardIcon className="size-5 shrink-0" aria-hidden="true" />
                <span className="md:hidden lg:inline">{deanDashboard.name}</span>
              </NavigationRow>
              {deanGroups.flatMap((group) =>
                group.items.slice(0, 1).map((item) => (
                  <NavigationRow key={item.href} href={item.href} rail title={item.name}>
                    <item.icon className="size-5 shrink-0" aria-hidden="true" />
                  </NavigationRow>
                ))
              )}
              <NavigationRow href={deanProfile.href} rail title={deanProfile.name}>
                <DeanProfileIcon className="size-5 shrink-0" aria-hidden="true" />
              </NavigationRow>
            </div>
          </div>
          <div className="grid grid-cols-1 items-center gap-3 px-3 py-3 md:grid-cols-[10rem_1fr]">
            <span className="text-body-sm text-muted-foreground">Respondent bottom navigation</span>
            <div className="flex w-full max-w-sm items-stretch gap-1">
              {studentMobile.map((item, index) => (
                <BottomNavRow
                  key={item.href}
                  href={item.href}
                  active={index === 1}
                  aria-current={index === 1 ? "page" : undefined}
                >
                  <item.icon className="size-6" aria-hidden="true" />
                  <span className="text-label-sm block max-w-full truncate leading-none">
                    {item.name}
                  </span>
                </BottomNavRow>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Pending feedback</h3>
        <p className="text-body-sm text-muted-foreground max-w-2xl">
          During slow route transitions each navigation link shows a local pulse dot and announces
          &ldquo;Loading&rdquo; through a screen-reader-only status region without disabling the
          link. The behavior is exercised by the NavigationLink unit tests and appears during real
          client navigation, so it is not simulated here.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-title-sm text-foreground">Interactive admin drawer</h3>
        <p className="text-body-sm text-muted-foreground max-w-2xl">
          This is the real{" "}
          <code className="border-border bg-card rounded border px-1 py-0.5 font-mono">
            MobileSidebarDrawer
          </code>
          : it traps and restores focus, locks scroll, closes on Escape and backdrop, and marks only
          the deepest destination current. It is interactive below the large-screen breakpoint,
          matching the shell.
        </p>
        <div className="border-border bg-card flex w-fit items-center gap-3 rounded-lg border p-4">
          <MobileSidebarDrawer roles={[ROLES.SECRETARY]} />
          <span className="text-body-sm text-muted-foreground">Open navigation menu</span>
        </div>
      </section>
    </div>
  );
}
