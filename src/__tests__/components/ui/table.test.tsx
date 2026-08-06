import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

describe("Table", () => {
  describe("semantic retokening", () => {
    it("renders a container with a table that has the data-slot", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>x</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const table = screen.getByRole("table");
      expect(table).toHaveAttribute("data-slot", "table");
    });

    it("uses the semantic foreground role for header text", () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      expect(screen.getByText("Name")).toHaveClass("text-foreground");
    });

    it("does not retain raw-theme dark palette selectors that bypass the semantic tokens", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>x</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const row = screen.getByRole("row");
      const className = row.getAttribute("class") ?? "";
      expect(className).not.toMatch(/\bdark:/);
    });
  });

  describe("row states use semantic hover/expanded/selected fills", () => {
    it("applies a subtle semantic surface on hover", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>x</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const row = screen.getByRole("row");
      expect(row).toHaveClass("hover:bg-muted/50");
    });

    it("applies the same semantic surface when the row is expanded", () => {
      render(
        <Table>
          <TableBody>
            <TableRow aria-expanded>
              <TableCell>x</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const row = screen.getByRole("row");
      expect(row).toHaveClass("has-aria-expanded:bg-muted/50");
    });

    it("applies the semantic selected surface and text role when the row is in the selected state", () => {
      render(
        <Table>
          <TableBody>
            <TableRow data-state="selected">
              <TableCell>x</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const row = screen.getByRole("row");
      expect(row).toHaveClass("data-[state=selected]:bg-muted");
      expect(row).toHaveClass("data-[state=selected]:text-foreground");
      expect(row).toHaveAttribute("data-state", "selected");
    });
  });

  describe("non-color cues for state", () => {
    it("uses border-b on rows so selection is reinforced with a non-color separator", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>x</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const row = screen.getByRole("row");
      expect(row).toHaveClass("border-b");
    });
  });

  describe("wide table containment", () => {
    it("wraps the table in an overflow-x-auto container", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>x</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const table = screen.getByRole("table");
      const container = table.parentElement;
      expect(container).toHaveClass("overflow-x-auto");
    });
  });

  describe("public API", () => {
    it("exports exactly the same components as before retokenization", async () => {
      const mod = await import("@/components/ui/table");
      const expected = [
        "Table",
        "TableHeader",
        "TableBody",
        "TableHead",
        "TableRow",
        "TableCell",
      ].sort();
      expect(Object.keys(mod).sort()).toEqual(expected);
    });
  });
});
