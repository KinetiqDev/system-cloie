import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Export orchestration and download transport
//
// Named-response exports are restricted access: authorization is re-checked per
// request, the Program scope is never taken from the request, every download is
// audited, and an unaudited release fails closed.
// ---------------------------------------------------------------------------

const { resolveAuthSessionMock, resolveProgramHeadContextMock, prismaMock, readEvidenceMock } =
  vi.hoisted(() => ({
    resolveAuthSessionMock: vi.fn(),
    resolveProgramHeadContextMock: vi.fn(),
    readEvidenceMock: vi.fn(),
    prismaMock: { reportExportAudit: { create: vi.fn() } },
  }));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/features/reports/services/report-evidence", () => ({
  readProgramHeadReportEvidence: readEvidenceMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import { buildProgramHeadReportExport } from "@/features/reports/services/report-export";
import {
  parseReportExportRequest,
  REPORT_EXPORT_KINDS,
} from "@/features/reports/services/report-export-state";
import { GET } from "@/app/api/program-head/programs/[programId]/reports/export/route";

const BSIT = {
  id: "prog-bsit",
  code: "BSIT",
  name: "Bachelor of Science in Information Technology",
};

const evidence = {
  programId: BSIT.id,
  programCode: BSIT.code,
  programName: BSIT.name,
  period: {
    schoolYearId: "sy-1",
    schoolYearCode: "2026-2027",
    semester: "FIRST" as const,
    semesterLabel: "1st Semester",
    termInstanceId: "term-1",
    termLabel: "1st Term",
    label: "2026-2027 · 1st Semester · 1st Term",
  },
  yearLevel: null,
  yearLevelLabel: "All year levels",
  outcomes: [],
  ciloMappings: new Map(),
  courseGroups: [
    {
      courseId: "course-1",
      courseCode: "IT101",
      courseTitle: "Introduction to Computing",
      courseAssignmentId: "ca-1",
      facultyId: "user-faculty",
      facultyName: "Dela Cruz, Ana",
      section: "MORNING" as const,
      yearLevel: "FIRST_YEAR" as const,
      yearLevelLabel: "1st Year",
      evaluationId: "eval-1",
      evaluationName: "IT101 CILO Evaluation",
      evaluationStatus: "CLOSED" as const,
      termInstance: {
        termInstanceId: "term-1",
        schoolYearCode: "2026-2027",
        semester: "FIRST" as const,
        semesterLabel: "1st Semester",
        term: "FIRST_TERM" as const,
        termLabel: "1st Term",
        label: "2026-2027 · 1st Semester · 1st Term",
      },
      instrumentId: "iv-1",
      instrumentLabel: "CILO Evaluation v1",
      structureSnapshot: [
        {
          key: "s",
          title: "CILO Results",
          questions: [
            {
              key: "q1",
              type: "likert",
              prompt: "I explained technical ideas clearly.",
              likertDescriptors: [
                { value: 1, label: "Not Achieved" },
                { value: 2, label: "Slightly Achieved" },
                { value: 3, label: "Moderately Achieved" },
                { value: 4, label: "Mostly Achieved" },
                { value: 5, label: "Fully Achieved" },
              ],
            },
          ],
        },
      ],
      cilosSnapshot: [{ id: "cilo-1", label: "CILO 1" }],
      ciloBindings: [
        {
          sectionKey: "s",
          itemKey: "q1",
          ciloId: "cilo-1",
          ciloLabel: "CILO 1",
          ciloDescription: "CILO 1",
          questionPrompt: "I explained technical ideas clearly.",
        },
      ],
      directPoBindings: [],
      assignedRespondentCount: 2,
      submissions: [
        { respondentId: "user-1", responseStatus: "SUBMITTED" as const },
        { respondentId: "user-2", responseStatus: null },
      ],
      responses: [
        {
          responseId: "resp-1",
          respondentId: "user-1",
          respondentName: "Alpha, Ann",
          submittedAt: new Date("2026-01-12T09:15:00.000Z"),
          answers: [{ sectionKey: "s", itemKey: "q1", ratingValue: 4 }],
        },
      ],
    },
  ],
  centralGroups: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  resolveAuthSessionMock.mockResolvedValue({ userId: "user-head", activeRole: "PROGRAM_HEAD" });
  resolveProgramHeadContextMock.mockResolvedValue({
    success: true,
    data: { userId: "user-head", authorizedPrograms: [BSIT], selectedProgram: BSIT },
  });
  readEvidenceMock.mockResolvedValue(evidence);
  prismaMock.reportExportAudit.create.mockResolvedValue({ id: "audit-1" });
});

const courseRequest = {
  kind: "COURSE_WORKBOOK" as const,
  filters: { termInstanceId: "term-1", schoolYearId: "sy-1", semester: "FIRST" as const },
};

describe("report export request grammar", () => {
  it("accepts the three export shapes and their filters", () => {
    expect(REPORT_EXPORT_KINDS).toEqual(["course-workbook", "po-report", "raw-csv"]);
    const parsed = parseReportExportRequest(
      new URLSearchParams({
        kind: "raw-csv",
        schoolYearId: "11111111-1111-4111-8111-111111111111",
        semester: "SECOND",
        termInstanceId: "22222222-2222-4222-8222-222222222222",
        yearLevel: "THIRD_YEAR",
      })
    );
    expect(parsed).toEqual({
      kind: "RAW_QUANTITATIVE_CSV",
      filters: {
        schoolYearId: "11111111-1111-4111-8111-111111111111",
        semester: "SECOND",
        termInstanceId: "22222222-2222-4222-8222-222222222222",
        yearLevel: "THIRD_YEAR",
      },
    });
  });

  it("rejects an unknown kind, a malformed uuid, and an unknown year level", () => {
    expect(parseReportExportRequest(new URLSearchParams({ kind: "pdf" }))).toBeNull();
    expect(
      parseReportExportRequest(new URLSearchParams({ kind: "raw-csv", schoolYearId: "nope" }))
    ).toBeNull();
    expect(
      parseReportExportRequest(new URLSearchParams({ kind: "raw-csv", yearLevel: "FIFTH_YEAR" }))
    ).toBeNull();
    expect(parseReportExportRequest(new URLSearchParams())).toBeNull();
  });
});

describe("report export authorization", () => {
  it("refuses an anonymous request before reading any evidence", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);
    const result = await buildProgramHeadReportExport("prog-bsit", courseRequest);
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(readEvidenceMock).not.toHaveBeenCalled();
    expect(prismaMock.reportExportAudit.create).not.toHaveBeenCalled();
  });

  it("refuses every other role, including Faculty and Secretary", async () => {
    for (const activeRole of ["FACULTY", "SECRETARY", "DEAN", "GEN_ED_COORDINATOR", "STUDENT"]) {
      resolveAuthSessionMock.mockResolvedValue({ userId: "user-x", activeRole });
      const result = await buildProgramHeadReportExport("prog-bsit", courseRequest);
      expect(result, activeRole).toMatchObject({ ok: false, status: 403 });
    }
    expect(readEvidenceMock).not.toHaveBeenCalled();
  });

  it("refuses a Program this Program Head is not assigned", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });
    const result = await buildProgramHeadReportExport("prog-other", courseRequest);
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(prismaMock.reportExportAudit.create).not.toHaveBeenCalled();
  });

  it("re-authorizes with the evidence read, so a cross-Program read cannot succeed", async () => {
    readEvidenceMock.mockResolvedValue(null);
    const result = await buildProgramHeadReportExport("prog-other", courseRequest);
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(prismaMock.reportExportAudit.create).not.toHaveBeenCalled();
  });
});

describe("report export audit", () => {
  it("records the actor, Program, filters, and aggregate counts of a download", async () => {
    const result = await buildProgramHeadReportExport("prog-bsit", courseRequest);
    expect(result.ok).toBe(true);
    expect(prismaMock.reportExportAudit.create).toHaveBeenCalledTimes(1);
    const audit = prismaMock.reportExportAudit.create.mock.calls[0][0].data;
    expect(audit).toMatchObject({
      actor_id: "user-head",
      program_id: "prog-bsit",
      export_kind: "COURSE_WORKBOOK",
      identified: true,
      school_year_id: "sy-1",
      semester: "FIRST",
      term_instance_id: "term-1",
      year_level: null,
      submitted_response_count: 1,
      rating_item_count: 1,
    });
    // The audit stores no respondent identity.
    expect(JSON.stringify(audit)).not.toContain("Alpha");
    expect(JSON.stringify(audit)).not.toContain("resp-1");
  });

  it("fails closed when the audit record cannot be written", async () => {
    prismaMock.reportExportAudit.create.mockRejectedValue(new Error("audit unavailable"));
    const result = await buildProgramHeadReportExport("prog-bsit", courseRequest);
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(result.ok === false && "bytes" in result).toBe(false);
  });
});

describe("report export results", () => {
  it("returns a workbook with a scoped filename and content type", async () => {
    const result = await buildProgramHeadReportExport("prog-bsit", courseRequest);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contentType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(result.filename).toBe("bsit-course-workbook-2026-2027-1st-semester-1st-term.xlsx");
    expect(result.bytes.byteLength).toBeGreaterThan(0);
  });

  it("returns a CSV filename and content type for the raw export", async () => {
    const result = await buildProgramHeadReportExport("prog-bsit", {
      kind: "RAW_QUANTITATIVE_CSV",
      filters: courseRequest.filters,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.filename).toMatch(/\.csv$/);
    expect(result.contentType).toBe("text/csv; charset=utf-8");
    expect(result.bytes.toString("utf8")).toContain("respondent_name");
  });

  it("refuses a course workbook when the scope holds no course evidence", async () => {
    readEvidenceMock.mockResolvedValue({ ...evidence, courseGroups: [] });
    const result = await buildProgramHeadReportExport("prog-bsit", courseRequest);
    expect(result).toMatchObject({ ok: false, status: 404, reason: "no-course-assignments" });
    expect(prismaMock.reportExportAudit.create).not.toHaveBeenCalled();
  });

  it("refuses a raw export when the scope holds no quantitative answers", async () => {
    readEvidenceMock.mockResolvedValue({
      ...evidence,
      courseGroups: [{ ...evidence.courseGroups[0], responses: [] }],
    });
    const result = await buildProgramHeadReportExport("prog-bsit", {
      kind: "RAW_QUANTITATIVE_CSV",
      filters: courseRequest.filters,
    });
    expect(result).toMatchObject({ ok: false, status: 404, reason: "no-rating-items" });
  });
});

describe("report download route", () => {
  const params = Promise.resolve({ programId: "prog-bsit" });
  const request = (query: string) =>
    new Request(`https://cloie.test/api/program-head/programs/prog-bsit/reports/export?${query}`);

  it("serves the file as a private, non-storeable attachment", async () => {
    const response = await GET(request("kind=raw-csv"), { params });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="bsit-raw-quantitative-data-.*\.csv"$/
    );
    expect(response.headers.get("Cache-Control")).toContain("private");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await response.text()).toContain("Alpha, Ann");
  });

  it("rejects an invalid export request with a readable message", async () => {
    const response = await GET(request("kind=pdf"), { params });
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("not valid"),
    });
  });

  it("propagates an authorization refusal without releasing a file", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-fac", activeRole: "FACULTY" });
    const response = await GET(request("kind=course-workbook"), { params });
    expect(response.status).toBe(403);
    await expect(response.text()).resolves.not.toContain("Alpha");
  });

  it("returns a generic server error and logs no evidence when a build fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    readEvidenceMock.mockRejectedValue(new Error("boom: Alpha, Ann resp-1"));
    const response = await GET(request("kind=course-workbook"), { params });
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).not.toContain("Alpha");
    expect(body).not.toContain("resp-1");
    // The log records the failure kind, never the evidence that failed.
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain("errorType");
    expect(logged).not.toContain("Alpha");
    errorSpy.mockRestore();
  });
});
