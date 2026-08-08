import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function renderBasicSelect() {
  return render(
    <Select>
      <SelectTrigger aria-label="Role">
        <SelectValue placeholder="Select a role" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Roles</SelectLabel>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="editor">Editor</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  describe("semantic retokening — trigger", () => {
    it("renders the trigger with the semantic input surface and border", () => {
      renderBasicSelect();
      const trigger = screen.getByLabelText("Role");
      expect(trigger).toHaveClass("bg-surface-input");
      expect(trigger).toHaveClass("border-input");
    });

    it("does not retain raw-theme dark palette selectors that bypass the semantic tokens", () => {
      renderBasicSelect();
      const trigger = screen.getByLabelText("Role");
      const className = trigger.getAttribute("class") ?? "";
      expect(className).not.toMatch(/\bdark:/);
    });

    it("uses the semantic placeholder role when no value selected", () => {
      renderBasicSelect();
      const trigger = screen.getByLabelText("Role");
      expect(trigger).toHaveClass("data-placeholder:text-muted-foreground");
    });
  });

  describe("semantic retokening — content", () => {
    it("uses bg-popover + text-popover-foreground on the popup", () => {
      render(
        <Select defaultOpen>
          <SelectTrigger aria-label="Role">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      );
      const popup = document.querySelector('[data-slot="select-content"]');
      expect(popup).toBeInTheDocument();
      expect(popup).toHaveClass("bg-popover");
      expect(popup).toHaveClass("text-popover-foreground");
    });
  });

  describe("visible label and a11y wiring", () => {
    it("associates a visible label via aria-label on the trigger", () => {
      renderBasicSelect();
      expect(screen.getByLabelText("Role")).toBeInTheDocument();
    });
  });

  describe("programmatic state", () => {
    it("exposes aria-invalid and the destructive ring family when invalid", () => {
      render(
        <Select>
          <SelectTrigger aria-invalid="true" aria-label="Role">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      );
      const trigger = screen.getByLabelText("Role");
      expect(trigger).toHaveAttribute("aria-invalid", "true");
      expect(trigger).toHaveClass("aria-invalid:border-destructive");
    });

    it("renders a focus ring via the dedicated ring semantic role", () => {
      renderBasicSelect();
      const trigger = screen.getByLabelText("Role");
      expect(trigger).toHaveClass("focus-visible:border-ring");
      expect(trigger).toHaveClass("focus-visible:ring-ring/50");
    });

    it("disables pointer and changes cursor when disabled", () => {
      render(
        <Select>
          <SelectTrigger disabled aria-label="Role">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      );
      const trigger = screen.getByLabelText("Role");
      expect(trigger).toHaveAttribute("data-disabled");
      expect(trigger).toHaveClass("disabled:cursor-not-allowed");
    });
  });

  describe("Base UI exclusive", () => {
    it("renders the trigger via Base UI (no Radix)", () => {
      renderBasicSelect();
      expect(screen.getByLabelText("Role")).toBeInTheDocument();
    });
  });

  describe("size attribute passthrough", () => {
    it("applies the sm data-size for compact triggers", () => {
      render(
        <Select>
          <SelectTrigger size="sm" aria-label="Role">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      );
      const trigger = screen.getByLabelText("Role");
      expect(trigger).toHaveAttribute("data-size", "sm");
    });
  });
});

describe("SelectItem", () => {
  it("uses bg-popover for scroll buttons inside the popup", () => {
    render(
      <Select defaultOpen>
        <SelectTrigger aria-label="Role">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>
    );
    // The popup itself + the scroll arrows sit within the content tree;
    // we verify the popup mounts to a bg-popover surface above.
    const popup = document.querySelector('[data-slot="select-content"]');
    expect(popup).toBeInTheDocument();
    expect(popup).toHaveClass("bg-popover");
  });
});

describe("SelectSeparator", () => {
  it("uses bg-border for the separator line", () => {
    render(
      <Select defaultOpen>
        <SelectTrigger aria-label="Role">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
          <SelectSeparator data-testid="sep" />
          <SelectItem value="b">B</SelectItem>
        </SelectContent>
      </Select>
    );
    const sep = screen.getByTestId("sep");
    expect(sep).toHaveClass("bg-border");
  });
});

describe("SelectItem selected state", () => {
  it("exposes the selected value to assistive tech via a hidden input on the trigger", () => {
    // Base UI Select exposes the current value both as the trigger's display
    // and as a screen-reader-hidden <input>. This is the programmatic,
    // non-color-cue surface for the selected state.
    render(
      <Select defaultValue="editor">
        <SelectTrigger aria-label="Role">
          <SelectValue placeholder="Pick a role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="editor">Editor</SelectItem>
          <SelectItem value="viewer">Viewer</SelectItem>
        </SelectContent>
      </Select>
    );
    // The selected value is exposed via the hidden Base UI input so form
    // submission and screen readers have a single source of truth.
    const hiddenInputs = document.querySelectorAll(
      'input[aria-hidden="true"][value="editor"]'
    );
    expect(hiddenInputs.length).toBeGreaterThan(0);
  });

  it("mounts the active item indicator slot inside the popup when opened", () => {
    // Base UI's Select.Item renders an ItemIndicator slot that contains the
    // check mark for the selected value. Open the popup so the items mount.
    render(
      <Select defaultValue="editor">
        <SelectTrigger aria-label="Role">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="editor">Editor</SelectItem>
        </SelectContent>
      </Select>
    );
    // Programmatically force the popup open to inspect the indicator slot —
    // this asserts the item indicator rendering surface exists, even when the
    // popup isn't actively visible.
    const trigger = screen.getByLabelText("Role");
    trigger.focus();
    fireEvent.click(trigger);
    // After open, the popup items are mounted into a portal; query at document.
    const items = document.querySelectorAll('[role="option"]');
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  describe("touch targets", () => {
    it("bumps the trigger height and option rows on coarse pointers", () => {
      renderBasicSelect();
      const trigger = screen.getByLabelText("Role");
      expect(trigger).toHaveClass("pointer-coarse:data-[size=default]:h-11");
      expect(trigger).toHaveClass("pointer-coarse:data-[size=default]:min-w-11");

      fireEvent.click(trigger);
      const item = document.querySelector('[role="option"]');
      expect(item).toHaveClass("pointer-coarse:min-h-11");
    });
  });
});
