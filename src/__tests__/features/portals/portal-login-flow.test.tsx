import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLE_CARDS } from "@/features/portals/lib/role-card-config";
import { RoleSelectionCard } from "@/features/portals/components/role-selection-card";

const { dialogPropsMock } = vi.hoisted(() => ({
  dialogPropsMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: vi.fn(),
    },
  })),
}));

vi.mock("@/features/legal/components/legal-acknowledgement-dialog", () => ({
  LegalAcknowledgementDialog: (props: { intent: string; open: boolean }) => {
    dialogPropsMock(props);
    return props.open ? <div role="dialog" data-intent={props.intent} /> : null;
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

vi.mock("lucide-react", () => ({
  Loader2: () => <span>Loader2</span>,
  ShieldAlert: () => <span>ShieldAlert</span>,
  CheckCircle2: () => <span>CheckCircle2</span>,
  Lock: () => <span>Lock</span>,
  ShieldCheck: () => <span>ShieldCheck</span>,
  GraduationCap: () => <span>GraduationCap</span>,
  Users: () => <span>Users</span>,
  BookOpen: () => <span>BookOpen</span>,
  Briefcase: () => <span>Briefcase</span>,
  Building2: () => <span>Building2</span>,
  UserCog: () => <span>UserCog</span>,
  XIcon: () => <span>XIcon</span>,
}));

describe("RoleSelectionCard Rendering", () => {
  beforeEach(() => {
    dialogPropsMock.mockClear();
  });

  it("renders a 'Continue as' button for all configured roles", () => {
    for (const card of ROLE_CARDS) {
      const { unmount } = render(<RoleSelectionCard config={card} />);
      const button = screen.getByRole("button", { name: new RegExp(`Continue as ${card.title}`, "i") });
      expect(button).toBeInTheDocument();
      unmount();
    }
  });

  it.each([
    ["SECRETARY", "secretary"],
    ["DEAN", "dean"],
    ["PROGRAM_HEAD", "program-head"],
    ["FACULTY", "faculty"],
    ["STUDENT", "student"],
    ["ALUMNI", "alumni"],
    ["INDUSTRY_PARTNER", "industry-partner"],
  ] as const)("preserves the %s intent when opening its acknowledgement dialog", (role, intent) => {
    const card = ROLE_CARDS.find((candidate) => candidate.role === role);
    expect(card).toBeDefined();

    const { unmount } = render(<RoleSelectionCard config={card!} />);
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(`Continue as ${card!.title}`, "i") })
    );

    expect(dialogPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ open: true, intent })
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("data-intent", intent);
    unmount();
  });
});
