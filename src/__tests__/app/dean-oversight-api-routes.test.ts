/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const {
  resolveAuthSessionMock,
  getDashboardMock,
  getLearningOutcomesMock,
  listEligiblePeriodsMock,
  logMock,
} = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  getDashboardMock: vi.fn(),
  getLearningOutcomesMock: vi.fn(),
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
  listDeanEligiblePeriods: listEligiblePeriodsMock,
}));

import { GET as getDashboard } from "@/app/api/dean/dashboard/route";
import { GET as getLearningOutcomes } from "@/app/api/dean/learning-outcomes/route";
import { GET as getEligiblePeriods } from "@/app/api/dean/eligible-periods/route";
import {
  DeanReadModelBadRequestError,
  DeanReadModelNotFoundError,
} from "@/features/dean/services/read-dean-oversight";

const PERIOD_ID = "11111111-1111-4111-8111-111111111111";

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
        kpis: {
          activeContexts: 0,
          readyContexts: 0,
          missingCiloContexts: 0,
          incompleteMappingContexts: 0,
        },
        risks: { missingCilos: 0, incompleteMappings: 0, notReady: 0 },
      },
    });
    getLearningOutcomesMock.mockResolvedValue({
      state: "ready",
      data: {
        period: { id: PERIOD_ID, label: "2025-2026 — 1st Semester — 1st Term", status: "ACTIVE" },
        risk: null,
        schemaVersion: 2,
        institutionalOutcomes: [],
        programs: [],
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

  it("returns the exact empty ready learning-outcomes payload", async () => {
    const outcomes = await getLearningOutcomes(
      request(`/api/dean/learning-outcomes?period=${PERIOD_ID}`)
    );

    expect(outcomes.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await json(outcomes)).toEqual({
      state: "ready",
      data: {
        period: { id: PERIOD_ID, label: "2025-2026 — 1st Semester — 1st Term", status: "ACTIVE" },
        risk: null,
        schemaVersion: 2,
        institutionalOutcomes: [],
        programs: [],
      },
    });
  });

  it("returns 404 for inaccessible period resources", async () => {
    getLearningOutcomesMock.mockRejectedValue(new DeanReadModelNotFoundError("not found"));

    const outcomes = await getLearningOutcomes(
      request(`/api/dean/learning-outcomes?period=${PERIOD_ID}`)
    );

    expect(outcomes.status).toBe(404);
    expect(outcomes.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("accepts the no-eligible-period state", async () => {
    getDashboardMock.mockResolvedValue({ state: "no-eligible-period" });
    const empty = await getDashboard(request("/api/dean/dashboard"));
    expect(empty.status).toBe(200);
    expect(await json(empty)).toEqual({ state: "no-eligible-period" });
  });

  it("maps an omitted learning-outcomes period to 400 when eligible periods exist", async () => {
    getLearningOutcomesMock.mockRejectedValue(
      new DeanReadModelBadRequestError("period is required.")
    );
    const response = await getLearningOutcomes(request("/api/dean/learning-outcomes"));

    expect(response.status).toBe(400);
    expect(await json(response)).toEqual({ error: "period is required." });
  });

  it("denies non-Dean learning-outcomes reads without calling the read model", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.SECRETARY });
    const secretary = await getLearningOutcomes(
      request(`/api/dean/learning-outcomes?period=${PERIOD_ID}`)
    );
    expect(secretary.status).toBe(403);
    expect(secretary.headers.get("Cache-Control")).toBe("private, no-store");
    expect(getLearningOutcomesMock).not.toHaveBeenCalled();

    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.FACULTY });
    const faculty = await getLearningOutcomes(
      request(`/api/dean/learning-outcomes?period=${PERIOD_ID}`)
    );
    expect(faculty.status).toBe(403);

    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.PROGRAM_HEAD });
    const programHead = await getLearningOutcomes(
      request(`/api/dean/learning-outcomes?period=${PERIOD_ID}`)
    );
    expect(programHead.status).toBe(403);
    expect(await json(programHead)).toEqual({ error: "College Dean access required." });
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
