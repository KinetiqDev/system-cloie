/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const {
  resolveAuthSessionMock,
  getDashboardMock,
  getLearningOutcomesMock,
  getEnrollmentsMock,
  getRosterMock,
  listEligiblePeriodsMock,
  logMock,
} = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  getDashboardMock: vi.fn(),
  getLearningOutcomesMock: vi.fn(),
  getEnrollmentsMock: vi.fn(),
  getRosterMock: vi.fn(),
  listEligiblePeriodsMock: vi.fn(),
  logMock: vi.spyOn(console, "error").mockImplementation(() => undefined),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/dean/services/read-dean-oversight", () => ({
  DeanReadModelNotFoundError: class DeanReadModelNotFoundError extends Error {},
  DeanReadModelBadRequestError: class DeanReadModelBadRequestError extends Error {},
  DeanReadModelUnauthorizedError: class DeanReadModelUnauthorizedError extends Error {},
  getDeanDashboard: getDashboardMock,
  getDeanLearningOutcomes: getLearningOutcomesMock,
  getDeanEnrollments: getEnrollmentsMock,
  getDeanRoster: getRosterMock,
  listDeanEligiblePeriods: listEligiblePeriodsMock,
}));

import { GET as getDashboard } from "@/app/api/dean/dashboard/route";
import { GET as getLearningOutcomes } from "@/app/api/dean/learning-outcomes/route";
import { GET as getEnrollments } from "@/app/api/dean/enrollments/route";
import { GET as getRoster } from "@/app/api/dean/enrollments/roster/route";
import { GET as getEligiblePeriods } from "@/app/api/dean/eligible-periods/route";

const PERIOD_ID = "11111111-1111-4111-8111-111111111111";
const ASSIGNMENT_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ASSIGNMENT_ID = "33333333-3333-4333-8333-333333333333";

function request(path: string) {
  return new Request(`http://localhost${path}`);
}

function deanSession() {
  return { activeRole: ROLES.DEAN };
}

async function json(response: Response) {
  return response.json();
}

describe("Dean oversight JSON routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue(deanSession());
    getDashboardMock.mockResolvedValue({
      state: "ready",
      data: {
        activePeriod: { id: PERIOD_ID, label: "2025-2026 — 1st Semester — 1st Term" },
        kpis: { activeContexts: 0, readyContexts: 0, missingCiloContexts: 0, incompleteMappingContexts: 0 },
        risks: { missingCilos: 0, incompleteMappings: 0, notReady: 0 },
      },
    });
    getLearningOutcomesMock.mockResolvedValue({
      state: "ready",
      data: {
        period: { id: PERIOD_ID, label: "2025-2026 — 1st Semester — 1st Term", status: "ACTIVE" },
        risk: null,
        programs: [],
      },
    });
    getEnrollmentsMock.mockResolvedValue({
      state: "ready",
      data: {
        period: { id: PERIOD_ID, label: "2025-2026 — 1st Semester — 1st Term", status: "ACTIVE" },
        programs: [],
      },
    });
    getRosterMock.mockResolvedValue({
      state: "ready",
      data: {
        assignment: {
          id: ASSIGNMENT_ID,
          courseCode: "CS101",
          courseName: "Intro",
          programName: "Computer Science",
          yearLevel: "FIRST_YEAR",
          section: "MORNING",
        },
        students: [{ displayName: "Ada Lovelace" }],
        page: 1,
        pageSize: 25,
        totalCount: 1,
        totalPages: 1,
      },
    });
    listEligiblePeriodsMock.mockResolvedValue([
      { id: PERIOD_ID, label: "2025-2026 — 1st Semester — 1st Term", status: "ACTIVE" },
    ]);
  });

  it("returns 401 without session and private no-store headers", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const response = await getDashboard(request("/api/dean/dashboard"));

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await json(response)).toEqual({ error: "Authentication required." });
  });

  it("requires activeRole to be Dean, not merely a role-array fallback", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.SECRETARY, roles: [ROLES.DEAN] });

    const response = await getDashboard(request("/api/dean/dashboard"));

    expect(response.status).toBe(403);
    expect(await json(response)).toEqual({ error: "College Dean access required." });
    expect(getDashboardMock).not.toHaveBeenCalled();
  });

  it("rejects every dashboard query parameter", async () => {
    const response = await getDashboard(request("/api/dean/dashboard?period=" + PERIOD_ID));

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({ error: "Dashboard does not accept query parameters." });
    expect(getDashboardMock).not.toHaveBeenCalled();
  });

  it("returns Dean-only eligible periods with private no-store headers", async () => {
    const response = await getEligiblePeriods(request("/api/dean/eligible-periods"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await json(response)).toEqual({
      periods: [{ id: PERIOD_ID, label: "2025-2026 — 1st Semester — 1st Term", status: "ACTIVE" }],
    });
    expect(listEligiblePeriodsMock).toHaveBeenCalledTimes(1);
  });

  it("validates learning outcome period and risk grammar", async () => {
    const malformed = await getLearningOutcomes(request("/api/dean/learning-outcomes?period=nope"));
    expect(malformed.status).toBe(400);

    const malformedRisk = await getLearningOutcomes(
      request(`/api/dean/learning-outcomes?period=${PERIOD_ID}&risk=secret`)
    );
    expect(malformedRisk.status).toBe(400);

    const valid = await getLearningOutcomes(
      request(`/api/dean/learning-outcomes?period=${PERIOD_ID}&risk=missing-cilos`)
    );
    expect(valid.status).toBe(200);
    expect(getLearningOutcomesMock).toHaveBeenCalledWith(PERIOD_ID, "missing-cilos");
  });

  it("returns exact empty ready payloads for learning outcomes and enrollments", async () => {
    const outcomes = await getLearningOutcomes(request(`/api/dean/learning-outcomes?period=${PERIOD_ID}`));
    const enrollments = await getEnrollments(request(`/api/dean/enrollments?period=${PERIOD_ID}`));

    expect(await json(outcomes)).toEqual({
      state: "ready",
      data: {
        period: { id: PERIOD_ID, label: "2025-2026 — 1st Semester — 1st Term", status: "ACTIVE" },
        risk: null,
        programs: [],
      },
    });
    expect(await json(enrollments)).toEqual({
      state: "ready",
      data: {
        period: { id: PERIOD_ID, label: "2025-2026 — 1st Semester — 1st Term", status: "ACTIVE" },
        programs: [],
      },
    });
  });

  it("returns 404 for inaccessible or mismatched period resources", async () => {
    const { DeanReadModelNotFoundError } = await import("@/features/dean/services/read-dean-oversight");
    getEnrollmentsMock.mockRejectedValue(new DeanReadModelNotFoundError("not found"));
    getRosterMock.mockRejectedValue(new DeanReadModelNotFoundError("mismatch"));

    const enrollments = await getEnrollments(request(`/api/dean/enrollments?period=${PERIOD_ID}`));
    const roster = await getRoster(
      request(`/api/dean/enrollments/roster?period=${PERIOD_ID}&assignment=${ASSIGNMENT_ID}`)
    );

    expect(enrollments.status).toBe(404);
    expect(roster.status).toBe(404);
    expect(enrollments.headers.get("Cache-Control")).toBe("private, no-store");
    expect(roster.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("accepts valid empty ready data and no-eligible-period state", async () => {
    getEnrollmentsMock.mockResolvedValue({ state: "ready", data: { period: {}, programs: [] } });
    const ready = await getEnrollments(request(`/api/dean/enrollments?period=${PERIOD_ID}`));
    expect(ready.status).toBe(200);
    expect(await json(ready)).toEqual({ state: "ready", data: { period: {}, programs: [] } });

    getDashboardMock.mockResolvedValue({ state: "no-eligible-period" });
    const empty = await getDashboard(request("/api/dean/dashboard"));
    expect(empty.status).toBe(200);
    expect(await json(empty)).toEqual({ state: "no-eligible-period" });
  });

  it("rejects missing enrollment period when eligible periods exist", async () => {
    const { DeanReadModelBadRequestError } = await import("@/features/dean/services/read-dean-oversight");
    getEnrollmentsMock.mockRejectedValue(new DeanReadModelBadRequestError("period is required."));
    const response = await getEnrollments(request("/api/dean/enrollments"));

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({ error: "period is required." });
  });

  it("validates roster query trimming, length, page, and fixed page size", async () => {
    const missingQuery = await getRoster(
      request(`/api/dean/enrollments/roster?period=${PERIOD_ID}&assignment=${ASSIGNMENT_ID}&query=   `)
    );
    expect(missingQuery.status).toBe(400);

    const tooLong = await getRoster(
      request(`/api/dean/enrollments/roster?period=${PERIOD_ID}&assignment=${ASSIGNMENT_ID}&query=${"x".repeat(101)}`)
    );
    expect(tooLong.status).toBe(400);

    const badPage = await getRoster(
      request(`/api/dean/enrollments/roster?period=${PERIOD_ID}&assignment=${ASSIGNMENT_ID}&page=0`)
    );
    expect(badPage.status).toBe(400);

    const valid = await getRoster(
      request(`/api/dean/enrollments/roster?period=${PERIOD_ID}&assignment=${ASSIGNMENT_ID}&query=%20Ada%20&page=2`)
    );
    expect(valid.status).toBe(200);
    expect(getRosterMock).toHaveBeenCalledWith({
      periodId: PERIOD_ID,
      assignmentId: ASSIGNMENT_ID,
      query: "Ada",
      page: 2,
    });
    expect((await json(valid)).data.pageSize).toBe(25);
  });

  it("keeps roster response limited to display names and pagination metadata", async () => {
    const response = await getRoster(
      request(`/api/dean/enrollments/roster?period=${PERIOD_ID}&assignment=${ASSIGNMENT_ID}`)
    );
    const body = await json(response);
    expect(body).toEqual(expect.objectContaining({ state: "ready" }));
    expect(body.data.students).toEqual([{ displayName: "Ada Lovelace" }]);
    expect(JSON.stringify(body)).not.toMatch(/studentId|email|enrollmentId|profile|source|accountId/i);
    expect(body.data.assignment.id).toBe(ASSIGNMENT_ID);
    expect(body.data.assignment.id).not.toBe(OTHER_ASSIGNMENT_ID);
  });

  it("returns generic 500 and logs no request or record data on unexpected failures", async () => {
    getDashboardMock.mockRejectedValue(new Error("student@example.com database detail"));

    const response = await getDashboard(request("/api/dean/dashboard"));

    expect(response.status).toBe(500);
    expect(await json(response)).toEqual({ error: "Internal server error." });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(logMock).toHaveBeenCalled();
    expect(JSON.stringify(logMock.mock.calls)).not.toContain("student@example.com");
  });
});
