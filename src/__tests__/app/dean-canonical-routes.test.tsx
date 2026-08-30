import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DeanIndexPage from "../../app/(app)/dean/page";
import OldProgramsPage from "../../app/(app)/dean/programs/page";
import OldCoursesPage from "../../app/(app)/dean/courses/page";
import OldAssignmentsPage from "../../app/(app)/dean/course-assignments/page";
import OldInstrumentsPage from "../../app/(app)/dean/instruments/page";
import OldProgramEditPage from "../../app/(app)/dean/programs/[id]/edit/page";
import OldCourseEditPage from "../../app/(app)/dean/courses/[id]/edit/page";
import OldInstrumentEditPage from "../../app/(app)/dean/instruments/[id]/edit/page";
import OldProgramNewPage from "../../app/(app)/dean/programs/new/page";
import OldCourseNewPage from "../../app/(app)/dean/courses/new/page";
import OldInstrumentNewPage from "../../app/(app)/dean/instruments/new/page";
import AnalyticsPage from "../../app/(app)/dean/analytics/page";
import ReportsPage from "../../app/(app)/dean/reports/page";
import CiloReviewsPage from "../../app/(app)/dean/cilo-reviews/page";
import AcademicStructurePage from "../../app/(app)/dean/academic-structure/page";
import CollegeOversightPage from "../../app/(app)/dean/college-oversight/page";

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  })
);
const permanentRedirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`PERMANENT:${path}`);
  })
);
const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND");
  })
);

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  permanentRedirect: permanentRedirectMock,
  notFound: notFoundMock,
}));

describe("Dean canonical routes", () => {
  it("redirects Dean index to dashboard", async () => {
    expect(() => DeanIndexPage()).toThrow("REDIRECT:/dean/dashboard");
  });

  it("permanently redirects old authorized-operation routes", async () => {
    await expect(async () => OldProgramsPage()).rejects.toThrow(
      "PERMANENT:/dean/academic-structure/programs"
    );
    await expect(async () => OldCoursesPage()).rejects.toThrow(
      "PERMANENT:/dean/academic-structure/courses"
    );
    await expect(async () => OldAssignmentsPage()).rejects.toThrow(
      "PERMANENT:/dean/academic-structure/course-assignments"
    );
    await expect(async () => OldInstrumentsPage()).rejects.toThrow(
      "PERMANENT:/dean/academic-structure/instruments"
    );
    await expect(Promise.resolve().then(() => OldProgramNewPage())).rejects.toThrow(
      "PERMANENT:/dean/academic-structure/programs"
    );
    await expect(Promise.resolve().then(() => OldCourseNewPage())).rejects.toThrow(
      "PERMANENT:/dean/academic-structure/courses"
    );
    await expect(Promise.resolve().then(() => OldInstrumentNewPage())).rejects.toThrow(
      "PERMANENT:/dean/academic-structure/instruments/new"
    );
    await expect(
      OldProgramEditPage({ params: Promise.resolve({ id: "program-1" }) })
    ).rejects.toThrow("PERMANENT:/dean/academic-structure/programs/program-1/edit");
    await expect(
      OldCourseEditPage({ params: Promise.resolve({ id: "course-1" }) })
    ).rejects.toThrow("PERMANENT:/dean/academic-structure/courses/course-1/edit");
    await expect(
      OldInstrumentEditPage({ params: Promise.resolve({ id: "instrument-1" }) })
    ).rejects.toThrow("PERMANENT:/dean/academic-structure/instruments/instrument-1/edit");
  });

  it("returns 404 for deferred routes", async () => {
    await expect(async () => AnalyticsPage()).rejects.toThrow("NOT_FOUND");
    await expect(async () => ReportsPage()).rejects.toThrow("NOT_FOUND");
    await expect(async () => CiloReviewsPage()).rejects.toThrow("NOT_FOUND");
  });

  it("renders thin Academic Structure landing", async () => {
    render(<AcademicStructurePage />);
    expect(screen.getByRole("heading", { name: "Academic Structure" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Programs/ })).toHaveAttribute(
      "href",
      "/dean/academic-structure/programs"
    );
    expect(screen.queryByText(/active contexts|risk|student/i)).not.toBeInTheDocument();
  });

  it("renders thin College Oversight landing", async () => {
    render(<CollegeOversightPage />);
    expect(screen.getByRole("heading", { name: "College Oversight" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Learning Outcomes/ })).toHaveAttribute(
      "href",
      "/dean/college-oversight/learning-outcomes"
    );
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });
});
