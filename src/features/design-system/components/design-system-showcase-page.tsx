import { SHOWCASE_SECTIONS } from "./showcase-section-registry";
import { ShowcaseSection } from "./showcase-section";

/**
 * Server route composition for `/design-system`.
 *
 * Renders the ordered showcase registry inside the authenticated shell.
 * Only the interactive islands are Client Components; every static section
 * is a Server Component composed from real production primitives and
 * static fixtures.
 */
export function DesignSystemShowcasePage() {
  return (
    <div className="flex flex-col gap-14">
      <header className="flex max-w-3xl flex-col gap-3">
        <h1 className="text-heading-xl font-heading text-foreground tracking-tight">
          Design System Showcase
        </h1>
        <p className="text-muted-foreground text-sm">
          A protected, read-only visual reference. Every example is composed from the production
          design system (tokens, shared primitives, and centralized navigation) with static fixture
          data — no database query, Server Action, mutation, or user data is involved.
        </p>
      </header>

      <nav aria-label="Showcase sections" className="flex flex-col gap-2">
        <h2 className="text-title-sm font-heading text-foreground">On this page</h2>
        <ul className="flex flex-col gap-1.5">
          {SHOWCASE_SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-link text-sm underline-offset-4 hover:underline"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {SHOWCASE_SECTIONS.map((section) => (
        <ShowcaseSection
          key={section.id}
          id={section.id}
          title={section.title}
          description={section.description}
          content={<section.component />}
        />
      ))}
    </div>
  );
}
