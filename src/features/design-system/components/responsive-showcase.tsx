import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/constants/roles";
import {
  getMainNavByRoles,
  getMobileNavByRoles,
  getDeanNavGroups,
  getDeanStandaloneNav,
} from "@/lib/constants/navigation";
import { NavigationRow, BottomNavRow } from "@/components/layout/navigation-row";
import { MobileSidebarDrawer } from "@/components/layout/mobile-sidebar-drawer";

function Frame({
  title,
  widthClassName,
  children,
}: {
  title: string;
  widthClassName: string;
  children: ReactNode;
}) {
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-label-sm text-muted-foreground">{title}</figcaption>
      <div
        className={cn(
          "border-sidebar-border bg-sidebar flex flex-col overflow-hidden rounded-lg border",
          widthClassName
        )}
      >
        {children}
      </div>
    </figure>
  );
}

function BrandRow({ rail = false }: { rail?: boolean }) {
  return (
    <div
      className={cn(
        "border-sidebar-border flex h-16 shrink-0 items-center border-b",
        rail ? "justify-center px-2" : "gap-3 px-4"
      )}
    >
      <Image
        src="/logos/cloie-logo.svg"
        alt="System CLOIE"
        width={442}
        height={500}
        className="h-10 w-auto dark:bg-white"
      />
      {!rail && (
        <span className="text-title-md text-link font-bold tracking-tight">System CLOIE</span>
      )}
    </div>
  );
}

export function ResponsiveShowcase() {
  const secretary = getMainNavByRoles([ROLES.SECRETARY]);
  const deanGroups = getDeanNavGroups();
  const [deanDashboard, deanProfile] = getDeanStandaloneNav();
  const studentMobile = getMobileNavByRoles([ROLES.STUDENT]);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 xl:grid-cols-4">
        <Frame title="Desktop · lg (≥1024px) — expanded sidebar" widthClassName="w-full max-w-64">
          <BrandRow />
          <nav aria-label="Desktop sidebar reference" className="flex flex-col gap-1 px-2 py-4">
            {secretary.map((item, index) => (
              <NavigationRow
                key={item.href}
                href={item.href}
                active={index === 0}
                aria-current={index === 0 ? "page" : undefined}
              >
                <item.icon className="size-5 shrink-0" aria-hidden="true" />
                {item.name}
              </NavigationRow>
            ))}
          </nav>
          <div className="border-sidebar-border mt-auto border-t p-3">
            <div className="flex items-center gap-3">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                <span className="text-body-sm font-semibold">R</span>
              </div>
              <div className="flex min-w-0 flex-col overflow-hidden">
                <span className="text-label-md text-sidebar-foreground truncate font-semibold">
                  Reference User
                </span>
                <span className="text-caption text-sidebar-foreground/60 truncate">
                  reference@cloie.test
                </span>
              </div>
            </div>
          </div>
        </Frame>

        <Frame
          title="Tablet · md–lg (768–1024px) — Dean icon rail"
          widthClassName="w-full max-w-16"
        >
          <BrandRow rail />
          <nav aria-label="Dean rail reference" className="flex flex-col gap-1 px-2 py-4">
            <NavigationRow
              href={deanDashboard.href}
              active
              rail
              aria-current="page"
              title={deanDashboard.name}
            >
              <deanDashboard.icon className="size-5 shrink-0" aria-hidden="true" />
            </NavigationRow>
            {deanGroups.map((group) => (
              <NavigationRow key={group.href} href={group.href} rail title={group.name}>
                <group.icon className="size-5 shrink-0" aria-hidden="true" />
              </NavigationRow>
            ))}
            <NavigationRow href={deanProfile.href} rail title={deanProfile.name}>
              <deanProfile.icon className="size-5 shrink-0" aria-hidden="true" />
            </NavigationRow>
          </nav>
        </Frame>

        <Frame
          title="Desktop · collapsed rail (operator preference, every role)"
          widthClassName="w-full max-w-16"
        >
          <BrandRow rail />
          <nav aria-label="Collapsed rail reference" className="flex flex-col gap-1 px-2 py-4">
            {secretary.map((item, index) => (
              <NavigationRow
                key={item.href}
                href={item.href}
                active={index === 0}
                aria-current={index === 0 ? "page" : undefined}
                iconOnly
                title={item.name}
              >
                <item.icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="sr-only">{item.name}</span>
              </NavigationRow>
            ))}
          </nav>
        </Frame>

        <Frame
          title="Mobile · <md (<768px) — drawer trigger and bottom navigation"
          widthClassName="w-full max-w-72"
        >
          <div className="border-sidebar-border flex h-16 shrink-0 items-center justify-between border-b px-3">
            <div className="flex items-center gap-3">
              <Image
                src="/logos/cloie-logo.svg"
                alt="System CLOIE"
                width={442}
                height={500}
                className="h-9 w-auto dark:bg-white"
              />
              <span className="text-title-md text-link font-bold tracking-tight">System CLOIE</span>
            </div>
            <MobileSidebarDrawer roles={[ROLES.SECRETARY]} />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
            <span className="text-body-sm text-muted-foreground">
              The hamburger opens the real admin drawer below 1024px.
            </span>
          </div>
          <nav
            aria-label="Respondent bottom navigation reference"
            className="border-sidebar-border pb-safe flex h-16 shrink-0 items-stretch border-t px-1"
          >
            {studentMobile.map((item, index) => (
              <BottomNavRow
                key={item.href}
                href={item.href}
                active={index === 0}
                aria-current={index === 0 ? "page" : undefined}
              >
                <item.icon className="size-6" aria-hidden="true" />
                <span className="text-label-sm block max-w-full truncate leading-none">
                  {item.name}
                </span>
              </BottomNavRow>
            ))}
          </nav>
        </Frame>
      </div>

      <p className="text-body-sm text-muted-foreground max-w-2xl">
        These frames render the real layout presentation rows — the sidebar, Dean rail, admin
        drawer, and bottom navigation around this page are the same components. Breakpoints,
        density, hierarchy, navigation mode, and responsive substitution are identical in Light and
        Dark; only token values adapt.
      </p>
      <p className="text-body-sm text-muted-foreground max-w-2xl">
        The expanded sidebar closes from the header’s trailing-edge control; the preference is
        remembered in a first-party cookie, so the rail returns on the next visit. In the rail the
        brand mark is the expand affordance, every destination keeps its accessible name, and each
        icon names its destination in a tooltip. Ctrl/⌘ + B toggles either state.
      </p>
    </div>
  );
}
