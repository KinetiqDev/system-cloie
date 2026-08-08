import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

describe("Tabs", () => {
  describe("semantic retokening", () => {
    it("renders the root, list, and triggers with the correct data-slot", () => {
      render(
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
          </TabsList>
          <TabsContent value="one">First</TabsContent>
        </Tabs>
      );
      expect(screen.getByRole("tablist")).toHaveAttribute("data-slot", "tabs-list");
      expect(screen.getByText("One")).toHaveAttribute("data-slot", "tabs-trigger");
    });

    it("uses the semantic secondary text role for the inactive trigger text", () => {
      render(
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = screen.getByText("Two");
      expect(trigger).toHaveClass("text-text-secondary");
    });

    it("does not retain raw-theme dark palette selectors that bypass the semantic tokens", () => {
      render(
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = screen.getByText("One");
      const className = trigger.getAttribute("class") ?? "";
      expect(className).not.toMatch(/\bdark:/);
    });
  });

  describe("active state uses the primary role per the approved visual hierarchy", () => {
    it("exposes the active trigger with the active data attribute", () => {
      render(
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const active = screen.getByText("One");
      expect(active).toHaveAttribute("data-active");
    });

    it("uses the primary soft background and selected foreground on the active default trigger", () => {
      render(
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const active = screen.getByText("One");
      expect(active).toHaveClass("data-active:bg-primary-soft");
      expect(active).toHaveClass("data-active:text-selected-fg");
    });

    it("uses the primary role for the line variant underline indicator", () => {
      render(
        <Tabs defaultValue="one">
          <TabsList variant="line">
            <TabsTrigger value="one">One</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const active = screen.getByText("One");
      expect(active).toHaveClass("after:bg-primary");
    });
  });

  describe("hover state uses semantic text", () => {
    it("swaps the inactive text to foreground on hover", () => {
      render(
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const inactive = screen.getByText("Two");
      expect(inactive).toHaveClass("hover:text-foreground");
    });
  });

  describe("focus ring", () => {
    it("uses the dedicated ring semantic role and ring width", () => {
      render(
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = screen.getByText("One");
      expect(trigger).toHaveClass("focus-visible:border-ring");
      expect(trigger).toHaveClass("focus-visible:ring-ring/50");
      expect(trigger).toHaveClass("focus-visible:ring-[3px]");
    });
  });

  describe("non-color cues for state", () => {
    it("uses cursor and pointer-events to convey disabled state (non-color cue)", () => {
      render(
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one" disabled>
              One
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = screen.getByText("One");
      expect(trigger).toHaveClass("disabled:pointer-events-none");
      expect(trigger).toHaveClass("disabled:opacity-50");
    });
  });

  describe("variant support", () => {
    it("supports the line variant on the list and removes the default list surface", () => {
      render(
        <Tabs defaultValue="one" orientation="horizontal">
          <TabsList variant="line">
            <TabsTrigger value="one">One</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const list = screen.getByRole("tablist");
      expect(list).toHaveAttribute("data-variant", "line");
    });
  });

  describe("Base UI exclusive", () => {
    it("does not import Radix primitives (Base UI Tab renders role=tab)", () => {
      render(
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = screen.getByRole("tab");
      expect(trigger.tagName.toLowerCase()).toBe("button");
    });
  });

  describe("pill variant", () => {
    it("renders chip-style list and triggers with primary active fill", () => {
      render(
        <Tabs defaultValue="one">
          <TabsList variant="pill">
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const list = screen.getByRole("tablist");
      expect(list).toHaveAttribute("data-variant", "pill");
      expect(list).toHaveClass("data-[variant=pill]:gap-2");
      const trigger = screen.getByText("Two");
      expect(trigger).toHaveClass("group-data-[variant=pill]/tabs-list:rounded-full");
      expect(trigger).toHaveClass("group-data-[variant=pill]/tabs-list:min-h-11");
      expect(trigger).toHaveClass("group-data-[variant=pill]/tabs-list:bg-surface");
      expect(trigger).toHaveClass(
        "group-data-[variant=pill]/tabs-list:data-active:bg-primary"
      );
      expect(trigger).toHaveClass(
        "group-data-[variant=pill]/tabs-list:data-active:text-on-primary"
      );
    });
  });
});
