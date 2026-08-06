import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";

describe("Card", () => {
  it("renders with data-slot=card and semantic card surface classes", () => {
    render(<Card>Content</Card>);
    const card = screen.getByText("Content").closest("[data-slot=card]");
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("bg-card");
    expect(card).toHaveClass("text-card-foreground");
  });

  it("applies default size classes", () => {
    render(<Card>Content</Card>);
    const card = screen.getByText("Content").closest("[data-slot=card]");
    expect(card).toHaveAttribute("data-size", "default");
  });

  it("applies sm size attribute", () => {
    render(<Card size="sm">Small card</Card>);
    const card = screen
      .getByText("Small card")
      .closest("[data-slot=card]");
    expect(card).toHaveAttribute("data-size", "sm");
  });
});

describe("CardHeader", () => {
  it("renders with data-slot=card-header", () => {
    render(<CardHeader>Header</CardHeader>);
    expect(
      screen.getByText("Header").closest("[data-slot=card-header]")
    ).toBeInTheDocument();
  });
});

describe("CardTitle", () => {
  it("renders with data-slot=card-title and heading font", () => {
    render(<CardTitle>My Title</CardTitle>);
    const title = screen.getByText("My Title");
    expect(title).toHaveAttribute("data-slot", "card-title");
    expect(title).toHaveClass("font-heading");
  });
});

describe("CardDescription", () => {
  it("renders with data-slot=card-description and muted color", () => {
    render(<CardDescription>Some description</CardDescription>);
    const desc = screen.getByText("Some description");
    expect(desc).toHaveAttribute("data-slot", "card-description");
    expect(desc).toHaveClass("text-muted-foreground");
  });
});

describe("CardContent", () => {
  it("renders with data-slot=card-content", () => {
    render(<CardContent>Body</CardContent>);
    expect(
      screen.getByText("Body").closest("[data-slot=card-content]")
    ).toBeInTheDocument();
  });
});

describe("CardFooter", () => {
  it("renders with data-slot=card-footer and muted surface", () => {
    render(<CardFooter>Footer actions</CardFooter>);
    const footer = screen
      .getByText("Footer actions")
      .closest("[data-slot=card-footer]");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass("bg-muted/50");
  });
});

/**
 * CardAction — was defined in card.tsx but NOT exported.
 * Slice 3 exports it so feature components can use it directly.
 */
describe("CardAction", () => {
  it("is exported from card.tsx", () => {
    expect(CardAction).toBeDefined();
    expect(typeof CardAction).toBe("function");
  });

  it("renders with data-slot=card-action and grid placement classes", () => {
    render(<CardAction>Action button</CardAction>);
    const action = screen
      .getByText("Action button")
      .closest("[data-slot=card-action]");
    expect(action).toBeInTheDocument();
    expect(action).toHaveClass("col-start-2");
  });

  it("composes inside CardHeader to trigger has-data-[slot=card-action] layout", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardAction>Edit</CardAction>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText("Edit").closest("[data-slot=card-action]")).toBeInTheDocument();
  });
});
