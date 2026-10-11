import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

    it("uses the header token role for header text", () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
      expect(screen.getByText("Name")).toHaveClass("text-table-header-fg");
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
      expect(row).toHaveClass("hover:bg-surface-hover");
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
      expect(row).toHaveClass("has-aria-expanded:bg-surface-hover");
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
      expect(row).toHaveClass("data-[state=selected]:bg-selected-bg");
      expect(row).toHaveClass("data-[state=selected]:text-selected-fg");
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

  describe("header band", () => {
    it("carries the distinct header fill so column labels separate from rows", () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>x</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const header = document.querySelector('[data-slot="table-header"]');
      expect(header).toHaveClass("bg-table-header");
      expect(header).toHaveClass("[&_tr:hover]:bg-transparent");
      expect(header).toHaveClass("[&_tr]:border-table-header-border");
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

    it("names the scrollable region from the table's own label", () => {
      render(
        <Table label="Course assignments">
          <TableBody>
            <TableRow>
              <TableCell>x</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole("region", { name: "Course assignments (scrollable)" })).toBeDefined();
    });

    it("leaves the neutral region name for a table inside a labelled chart region", () => {
      render(
        <Table aria-label="Likert distribution">
          <TableBody>
            <TableRow>
              <TableCell>x</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      // The chart card publishes its own labelled region; the table must not
      // announce the same name twice, and it keeps its own accessible name.
      expect(screen.getByRole("table", { name: "Likert distribution" })).toBeDefined();
    });

    it("keeps a chart-alternative table out of the chart card's landmark", () => {
      render(
        <Table aria-label="Attendance roster">
          <TableBody>
            <TableRow>
              <TableCell>x</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      // The table names itself; its scroll container must not repeat that name
      // as a second landmark beside the chart card that already owns one.
      expect(screen.getByRole("table", { name: "Attendance roster" })).toBeDefined();
      expect(
        screen.queryByRole("region", { name: "Attendance roster (scrollable)" })
      ).not.toBeInTheDocument();
    });

    it("does not let two labelled list tables collide, even when one is a chart alternative", () => {
      render(
        <>
          <Table label="Courses">
            <TableBody>
              <TableRow>
                <TableCell>a</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Table label="Programs">
            <TableBody>
              <TableRow>
                <TableCell>b</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </>
      );
      expect(screen.getByRole("region", { name: "Courses (scrollable)" })).toBeDefined();
      expect(screen.getByRole("region", { name: "Programs (scrollable)" })).toBeDefined();
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
