import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Field,
  FieldLabel,
  FieldTitle,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
} from "@/components/ui/field";

describe("Field", () => {
  it("renders as a group with the data-slot", () => {
    render(<Field>body</Field>);
    const root = screen.getByText("body");
    expect(root.tagName.toLowerCase()).toBe("div");
    expect(root).toHaveAttribute("data-slot", "field");
    expect(root).toHaveAttribute("role", "group");
  });

  it("defaults to the vertical orientation and accepts responsive / horizontal", () => {
    const { rerender } = render(<Field>vertical</Field>);
    expect(screen.getByText("vertical")).toHaveAttribute("data-orientation", "vertical");
    rerender(<Field orientation="horizontal">horiz</Field>);
    expect(screen.getByText("horiz")).toHaveAttribute("data-orientation", "horizontal");
    rerender(<Field orientation="responsive">resp</Field>);
    expect(screen.getByText("resp")).toHaveAttribute("data-orientation", "responsive");
  });
});

describe("FieldLabel", () => {
  it("renders the Label primitive with the field-label slot", () => {
    render(
      <FieldLabel htmlFor="title">
        Title
      </FieldLabel>
    );
    const label = screen.getByText("Title");
    expect(label.tagName.toLowerCase()).toBe("label");
    expect(label).toHaveAttribute("data-slot", "field-label");
  });

  it("dims when the field group is set to disabled", () => {
    render(
      <div data-disabled="true" className="group/field">
        <FieldLabel htmlFor="x">Field</FieldLabel>
      </div>
    );
    expect(screen.getByText("Field")).toHaveClass(
      "group-data-[disabled=true]/field:opacity-50"
    );
  });
});

describe("FieldTitle", () => {
  it("renders within the field-label slot with the semantic foreground role", () => {
    render(<FieldTitle>Required</FieldTitle>);
    const title = screen.getByText("Required");
    expect(title).toHaveAttribute("data-slot", "field-label");
    expect(title).toHaveClass("font-medium");
  });
});

describe("FieldDescription", () => {
  it("renders adjacent helper copy with the semantic muted role", () => {
    render(
      <>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <input id="email" type="email" />
        <FieldDescription>We never share your address.</FieldDescription>
      </>
    );
    const description = screen.getByText("We never share your address.");
    expect(description).toHaveAttribute("data-slot", "field-description");
    expect(description).toHaveClass("text-muted-foreground");
  });

  it("never uses color as the only cue — copy itself is the cue", () => {
    render(<FieldDescription>Keep it brief.</FieldDescription>);
    const description = screen.getByText("Keep it brief.");
    expect(description.textContent).toMatch(/./);
  });
});

describe("FieldError", () => {
  it("renders as a role=alert adjacent to the field with destructive semantics", () => {
    render(
      <Field>
        <FieldLabel htmlFor="x">Field</FieldLabel>
        <input id="x" />
        <FieldError>Required.</FieldError>
      </Field>
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-slot", "field-error");
    expect(alert).toHaveClass("text-destructive");
    expect(alert).toHaveTextContent(/required/i);
  });

  it("merges multiple errors into a list and de-duplicates by message", () => {
    render(
      <FieldError
        errors={[
          { message: "Required" },
          { message: "Required" },
          { message: "Too short" },
        ]}
      />
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/required/i);
    expect(alert).toHaveTextContent(/too short/i);
    expect(alert.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders nothing when there are no errors and no children", () => {
    const { container } = render(<FieldError errors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("prefers explicit children over errors prop", () => {
    render(
      <FieldError errors={[{ message: "ignored" }]}>
        Custom message
      </FieldError>
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Custom message");
    expect(alert).not.toHaveTextContent("ignored");
  });
});

describe("FieldGroup", () => {
  it("composes multiple Fields with shared container context", () => {
    render(
      <FieldGroup>
        <Field>first</Field>
        <Field>second</Field>
      </FieldGroup>
    );
    const group = screen.getByText("first").parentElement!;
    expect(group).toHaveAttribute("data-slot", "field-group");
  });
});

describe("FieldSet and FieldLegend", () => {
  it("renders FieldSet with the field-set slot", () => {
    render(
      <FieldSet>
        <FieldLegend variant="legend">Group label</FieldLegend>
      </FieldSet>
    );
    const fieldSet = screen.getByText("Group label").closest("fieldset");
    expect(fieldSet).toHaveAttribute("data-slot", "field-set");
    const legend = screen.getByText("Group label");
    expect(legend).toHaveAttribute("data-slot", "field-legend");
    expect(legend.tagName.toLowerCase()).toBe("legend");
  });
});

describe("FieldSeparator", () => {
  it("renders an absolute-positioned separator without text", () => {
    const { container } = render(<FieldSeparator />);
    expect(
      container.querySelector('[data-slot="field-separator"]')
    ).toBeInTheDocument();
  });

  it("renders an optional content label with semantic surface background", () => {
    render(<FieldSeparator>or</FieldSeparator>);
    const separator = screen
      .getByText("or")
      .closest('[data-slot="field-separator"]');
    expect(separator).toBeInTheDocument();
    const content = screen.getByText("or");
    expect(content).toHaveClass("bg-background");
    expect(content).toHaveClass("text-muted-foreground");
  });
});

describe("FieldContent", () => {
  it("groups description + error + control with column flex layout", () => {
    render(
      <FieldContent>
        <FieldDescription>Helper</FieldDescription>
        <FieldError>Oops</FieldError>
      </FieldContent>
    );
    const content = screen.getByText("Helper").parentElement!;
    expect(content).toHaveAttribute("data-slot", "field-content");
    expect(content).toHaveClass("flex");
    expect(content).toHaveClass("flex-col");
  });
});

describe("composed field — adjacent helper/error and programmatic invalid state", () => {
  it("renders visible label, helper text, and invalid error copy near the control", () => {
    render(
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <FieldContent>
          <input
            id="email"
            type="email"
            aria-invalid="true"
            aria-describedby="email-helper email-error"
          />
          <FieldDescription id="email-helper">Use your school address.</FieldDescription>
          <FieldError id="email-error">Invalid email address.</FieldError>
        </FieldContent>
      </Field>
    );

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "email-helper email-error");
    expect(screen.getByText("Use your school address.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email address.");
  });

  it("propagates the destructive color family to children when Field data-invalid is true", () => {
    render(
      <Field data-invalid="true">
        <FieldLabel htmlFor="x">Field</FieldLabel>
        <input id="x" aria-invalid="true" />
        <FieldError>Required.</FieldError>
      </Field>
    );
    const field = screen.getByLabelText("Field").closest('[data-slot="field"]')!;
    expect(field).toHaveAttribute("data-invalid", "true");
    expect(field).toHaveClass("data-[invalid=true]:text-destructive");
  });
});
