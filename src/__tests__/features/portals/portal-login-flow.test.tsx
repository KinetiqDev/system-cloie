import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ROLE_CARDS } from "@/features/portals/lib/role-card-config";
import { RoleSelectionCard } from "@/features/portals/components/role-selection-card";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: vi.fn(),
    },
  })),
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
  it("renders a 'Continue as' button for all configured roles", () => {
    for (const card of ROLE_CARDS) {
      const { unmount } = render(<RoleSelectionCard config={card} />);
      const button = screen.getByRole("button", { name: new RegExp(`Continue as ${card.title}`, "i") });
      expect(button).toBeInTheDocument();
      unmount();
    }
  });
});
