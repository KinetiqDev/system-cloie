import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SecretaryDashboardLoading from "@/app/(app)/secretary/dashboard/loading";
import SecretaryCoursesLoading from "@/app/(app)/secretary/courses/loading";
import SecretaryCourseNewLoading from "@/app/(app)/secretary/courses/new/loading";
import SecretaryCourseEditLoading from "@/app/(app)/secretary/courses/[id]/edit/loading";
import SecretaryProgramsLoading from "@/app/(app)/secretary/programs/loading";
import SecretaryProgramEditLoading from "@/app/(app)/secretary/programs/[id]/edit/loading";
import SecretaryUsersLoading from "@/app/(app)/secretary/users/loading";
import SecretaryUsersNewLoading from "@/app/(app)/secretary/users/new/loading";
import SecretaryInstrumentsLoading from "@/app/(app)/secretary/instruments/loading";
import SecretaryInstrumentEditLoading from "@/app/(app)/secretary/instruments/[id]/edit/loading";
import SecretarySchoolYearsLoading from "@/app/(app)/secretary/school-years/loading";
import SecretaryRolloverLoading from "@/app/(app)/secretary/school-years/[id]/rollover/loading";
import SecretarySchoolYearDetailLoading from "@/app/(app)/secretary/school-years/[id]/loading";
import SecretaryCourseAssignmentsLoading from "@/app/(app)/secretary/course-assignments/loading";
import FacultyDashboardLoading from "@/app/(app)/faculty/dashboard/loading";
import FacultyAnalyticsLoading from "@/app/(app)/faculty/analytics/loading";
import FacultyCilosLoading from "@/app/(app)/faculty/cilos/loading";
import FacultyCilosNewLoading from "@/app/(app)/faculty/cilos/new/loading";
import FacultyCiloEvaluationNewLoading from "@/app/(app)/faculty/cilo-evaluations/new/loading";
import FacultyReviewLoading from "@/app/(app)/faculty/cilo-evaluations/[evaluationId]/loading";
import FacultyResponseReviewLoading from "@/app/(app)/faculty/cilo-evaluations/[evaluationId]/responses/[responseId]/loading";
import FacultyCourseRostersLoading from "@/app/(app)/faculty/course-rosters/loading";
import FacultyToolsLoading from "@/app/(app)/faculty/tools/loading";
import FacultyToolEditLoading from "@/app/(app)/faculty/tools/[id]/edit/loading";
import ProgramHeadDashboardLoading from "@/app/(app)/program-head/dashboard/loading";
import ProgramHeadCoursesLoading from "@/app/(app)/program-head/courses/loading";
import ProgramHeadCourseAssignmentsLoading from "@/app/(app)/program-head/course-assignments/loading";
import ProgramHeadCiloReviewsLoading from "@/app/(app)/program-head/cilo-reviews/loading";
import ProgramHeadCiloReviewLoading from "@/app/(app)/program-head/cilo-reviews/[evaluationId]/loading";
import ProgramHeadResponseReviewLoading from "@/app/(app)/program-head/cilo-reviews/[evaluationId]/responses/[responseId]/loading";
import ProgramHeadCiloEvaluationNewLoading from "@/app/(app)/program-head/cilo-evaluations/new/loading";
import ProgramHeadOutcomesLoading from "@/app/(app)/program-head/outcomes/loading";
import ProgramHeadMappingLoading from "@/app/(app)/program-head/outcomes/mapping/loading";
import ProgramHeadToolsLoading from "@/app/(app)/program-head/tools/loading";
import ProgramHeadToolsNewLoading from "@/app/(app)/program-head/tools/new/loading";
import ProgramHeadToolEditLoading from "@/app/(app)/program-head/tools/[id]/edit/loading";
import ProgramHeadToolsPublishLoading from "@/app/(app)/program-head/tools/publish/loading";
import DeanCreateCourseLoading from "@/app/(app)/dean/academic-structure/courses/new/loading";
import DeanEditCourseLoading from "@/app/(app)/dean/academic-structure/courses/[id]/edit/loading";
import DeanCreateInstrumentLoading from "@/app/(app)/dean/academic-structure/instruments/new/loading";
import DeanEditInstrumentLoading from "@/app/(app)/dean/academic-structure/instruments/[id]/edit/loading";
import DeanEditProgramLoading from "@/app/(app)/dean/academic-structure/programs/[id]/edit/loading";
import DeanDashboardLoading from "@/app/(app)/dean/dashboard/loading";
import DeanAcademicStructureLoading from "@/app/(app)/dean/academic-structure/loading";
import DeanCollegeOversightLoading from "@/app/(app)/dean/college-oversight/loading";
import SecretaryError from "@/app/(app)/secretary/error";
import FacultyError from "@/app/(app)/faculty/error";
import ProgramHeadError from "@/app/(app)/program-head/error";
import DeanError from "@/app/(app)/dean/error";

const loadingRoutes = [
  [SecretaryDashboardLoading, "Loading dashboard"],
  [SecretaryCoursesLoading, "Loading records"],
  [SecretaryCourseEditLoading, "Loading form"],
  [SecretaryProgramsLoading, "Loading records"],
  [SecretaryProgramEditLoading, "Loading form"],
  [SecretaryCourseNewLoading, "Loading form"],
  [SecretaryUsersLoading, "Loading users"],
  [SecretaryUsersNewLoading, "Loading form"],
  [SecretaryInstrumentsLoading, "Loading records"],
  [SecretaryInstrumentEditLoading, "Loading form"],
  [SecretarySchoolYearsLoading, "Loading records"],
  [SecretaryRolloverLoading, "Loading rollover workspace"],
  [SecretarySchoolYearDetailLoading, "Loading school year details"],
  [SecretaryCourseAssignmentsLoading, "Loading records"],
  [FacultyDashboardLoading, "Loading dashboard"],
  [FacultyAnalyticsLoading, "Loading dashboard"],
  [FacultyCilosLoading, "Loading records"],
  [FacultyCilosNewLoading, "Loading form"],
  [FacultyCiloEvaluationNewLoading, "Loading form"],
  [FacultyReviewLoading, "Loading review details"],
  [FacultyResponseReviewLoading, "Loading response review"],
  [FacultyCourseRostersLoading, "Loading records"],
  [FacultyToolsLoading, "Loading records"],
  [FacultyToolEditLoading, "Loading form"],
  [ProgramHeadDashboardLoading, "Loading dashboard"],
  [ProgramHeadCoursesLoading, "Loading records"],
  [ProgramHeadCourseAssignmentsLoading, "Loading records"],
  [ProgramHeadCiloReviewsLoading, "Loading records"],
  [ProgramHeadCiloReviewLoading, "Loading review details"],
  [ProgramHeadResponseReviewLoading, "Loading response review"],
  [ProgramHeadCiloEvaluationNewLoading, "Loading form"],
  [ProgramHeadOutcomesLoading, "Loading records"],
  [ProgramHeadMappingLoading, "Loading CILO-GO mappings"],
  [ProgramHeadToolsLoading, "Loading records"],
  [ProgramHeadToolsNewLoading, "Loading form"],
  [ProgramHeadToolEditLoading, "Loading form"],
  [ProgramHeadToolsPublishLoading, "Loading form"],
  [DeanCreateCourseLoading, "Loading form"],
  [DeanEditCourseLoading, "Loading form"],
  [DeanCreateInstrumentLoading, "Loading form"],
  [DeanEditInstrumentLoading, "Loading form"],
  [DeanEditProgramLoading, "Loading form"],
  [DeanDashboardLoading, "Loading dashboard"],
  [DeanAcademicStructureLoading, "Loading records"],
  [DeanCollegeOversightLoading, "Loading records"],
] as const;

const errorBoundaries = [
  [SecretaryError, "/secretary/dashboard"],
  [FacultyError, "/faculty/dashboard"],
  [ProgramHeadError, "/program-head/dashboard"],
  [DeanError, "/dean/dashboard"],
] as const;

describe("operational route loading boundaries", () => {
  it.each(loadingRoutes)("renders protected-data-free geometry for %s", (Loading, label) => {
    render(<Loading />);

    const status = screen.getByRole("status", { name: label });

    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(status).not.toHaveTextContent(/@|student|faculty|secretary|program head|dean|202\d/i);
  });

  it("uses mapping-card geometry instead of review tabs for CILO-GO mappings", () => {
    render(<ProgramHeadMappingLoading />);

    const status = screen.getByRole("status", { name: "Loading CILO-GO mappings" });

    expect(status.querySelectorAll(".rounded-full").length).toBeGreaterThan(0);
    expect(status.querySelector(".border-b")).not.toBeInTheDocument();
  });

  it("uses response-card geometry instead of review tabs for response details", () => {
    render(<FacultyResponseReviewLoading />);

    const status = screen.getByRole("status", { name: "Loading response review" });

    expect(status.querySelectorAll(".rounded-lg").length).toBeGreaterThan(0);
    expect(status.querySelector(".border-b")).not.toBeInTheDocument();
  });

  it("reserves four KPI cards before the Secretary Users filter and results geometry", () => {
    render(<SecretaryUsersLoading />);

    const status = screen.getByRole("status", { name: "Loading users" });
    const kpiGrid = status.firstElementChild?.querySelector(':scope > [class~="md:grid-cols-4"]');

    expect(kpiGrid).toBeInTheDocument();
    expect(kpiGrid?.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(8);
  });

  it("matches the centered course form container for the new Course route", () => {
    render(<SecretaryCourseNewLoading />);

    const status = screen.getByRole("status", { name: "Loading form" });

    expect(status.firstElementChild).toHaveClass("mx-auto", "max-w-3xl");
  });
});

describe("operational role error boundaries", () => {
  it.each(errorBoundaries)(
    "offers redacted retry and dashboard navigation for %s",
    (ErrorBoundary, returnHref) => {
      const reset = vi.fn();
      const internalMessage = "database connection details";
      const digest = "private-error-digest";

      render(
        <ErrorBoundary
          error={Object.assign(new Error(internalMessage), { digest })}
          reset={reset}
        />
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "We couldn't load this page" })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Return to Dashboard" })).toHaveAttribute(
        "href",
        returnHref
      );
      expect(screen.queryByText(internalMessage)).not.toBeInTheDocument();
      expect(screen.queryByText(digest)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
      expect(reset).toHaveBeenCalledOnce();
    }
  );
});
