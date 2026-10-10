// fallow-ignore-file code-duplication
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { AppearanceProvider } from "@/features/design-system/components/appearance-provider";
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- Mocking next/image in test environment
  default: (props: React.ComponentProps<"img">) => <img alt={props.alt ?? ""} {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function renderHome() {
  return render(
    <AppearanceProvider enabled={true}>
      <Home />
    </AppearanceProvider>
  );
}

describe("Landing page", () => {
  it("links the audience directory to dedicated landing pages", () => {
    renderHome();

    expect(screen.getByText("Welcome to System CLOIE")).toBeInTheDocument();
    expect(screen.getByText(/Turn responses into learning-outcome evidence/i)).toBeInTheDocument();

    const studentCard = screen.getByRole("link", { name: /Students/i });
    const staffCard = screen.getByRole("link", { name: /Staff & Faculty/i });
    const externalCard = screen.getByRole("link", { name: /Alumni & Partners/i });
    expect(studentCard.getAttribute("href")).toBe("/entry/student");
    expect(staffCard.getAttribute("href")).toBe("/entry/staff");
    expect(externalCard.getAttribute("href")).toBe("/entry/external");
  });

  it("offers audience navigation rather than competing sign-in actions", () => {
    renderHome();
    expect(screen.getByRole("navigation", { name: "Choose your audience" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Submit a Faculty request/i })).toBeNull();
  });

  it("explains what System CLOIE is and is not, without testimonials", () => {
    renderHome();

    expect(screen.getByText("What System CLOIE is")).toBeInTheDocument();
    expect(screen.getByText("What it is not")).toBeInTheDocument();
    expect(screen.getByText(/Not a learning management system/i)).toBeInTheDocument();
    expect(screen.queryByText(/testimonial/i)).toBeNull();
  });

  it("preserves help and legal documents", () => {
    renderHome();

    expect(screen.getByText("Help and frequently asked questions")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Notice" })).toHaveAttribute(
      "href",
      "/privacy"
    );
    expect(screen.getByRole("link", { name: "Terms of Use" })).toHaveAttribute("href", "/terms");
  });

  it("uses semantic muted text instead of legacy text tokens", () => {
    const { container } = renderHome();
    expect(container.querySelector(".text-text-muted")).toBeNull();
    expect(container.querySelector(".text-text-secondary")).toBeNull();
    expect(container.querySelector(".text-text-primary")).toBeNull();
  });

  it("uses no decorative glow, blur, or colored shadows", () => {
    const { container } = renderHome();
    const classStrings = [...container.querySelectorAll("[class]")]
      .map((el) => el.getAttribute("class") ?? "")
      .join(" ");
    expect(classStrings).not.toMatch(/radial-gradient/);
    expect(classStrings).not.toMatch(/(^|\s)blur-/);
    expect(classStrings).not.toMatch(
      /shadow-primary|shadow-danger|shadow-warning|shadow-success|shadow-info/
    );
  });

  it("offers the development role switcher so local roles need no Google account", () => {
    vi.stubEnv("NODE_ENV", "development");

    renderHome();

    expect(screen.getByRole("button", { name: "Open Dev Roles switcher" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /dev/i })).toHaveLength(2);

    vi.unstubAllEnvs();
  });

  it("never exposes the development role switcher outside development", () => {
    vi.stubEnv("NODE_ENV", "production");

    renderHome();

    expect(screen.queryByText("Dev Roles")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open Dev Roles switcher" })
    ).not.toBeInTheDocument();

    vi.unstubAllEnvs();
  });
});
