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
          "flex flex-col overflow-hidden rounded-lg border border-sidebar-border bg-sidebar",
          widthClassName
        )}
      >
        {children}
      </div>
    </figure>
  );
}

function BrandRow({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border px-3",
        !compact && "px-4"
      )}
    >
      <Image
        src="/logos/cloie-logo.png"
        alt="System CLOIE Logo"
        width={486}
        height={513}
        className="h-6 w-auto rounded border border-border bg-white p-0.5"
      />
      {!compact && (
        <span className="text-title-md text-primary font-bold tracking-tight">System CLOIE</span>
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
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-3">
        <Frame title="Desktop · lg (≥1024px) — expanded sidebar" widthClassName="w-full max-w-64">
          <BrandRow />
          <nav
            aria-label="Desktop sidebar reference"
            className="flex flex-col gap-1 px-2 py-4"
          >
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
          <div className="mt-auto border-t border-sidebar-border p-3">
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

        <Frame title="Tablet · md–lg (768–1024px) — Dean icon rail" widthClassName="w-full max-w-16">
          <BrandRow compact />
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

        <Frame title="Mobile · <md (<768px) — drawer trigger and bottom navigation" widthClassName="w-full max-w-72">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-3">
            <div className="flex items-center gap-3">
              <Image
                src="/logos/cloie-logo.png"
                alt="System CLOIE Logo"
                width={486}
                height={513}
                className="h-6 w-auto rounded border border-border bg-white p-0.5"
              />
              <span className="text-title-md text-primary font-bold tracking-tight">
                System CLOIE
              </span>
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
            className="flex h-16 shrink-0 items-stretch border-t border-sidebar-border px-1 pb-safe"
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

      <p className="text-body-sm max-w-2xl text-muted-foreground">
        These frames render the real layout presentation rows — the sidebar,
        Dean rail, admin drawer, and bottom navigation around this page are the
        same components. Breakpoints, density, hierarchy, navigation mode, and
        responsive substitution are identical in Light and Dark; only token
        values adapt.
      </p>
    </div>
  );
}
