import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { getProgramHeadResponseDetail } from "@/features/response-review/services/get-program-head-response-detail";

const {
  responseFindFirstMock,
  ciloMappingFindManyMock,
  studentEnrollmentFindManyMock,
  alumniProfileFindManyMock,
  industryPartnerProfileFindManyMock,
  resolveAuthSessionMock,
  resolveProgramHeadContextMock,
} = vi.hoisted(() => ({
  responseFindFirstMock: vi.fn(),
  ciloMappingFindManyMock: vi.fn(),
  studentEnrollmentFindManyMock: vi.fn(),
  alumniProfileFindManyMock: vi.fn(),
  industryPartnerProfileFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    response: { findFirst: responseFindFirstMock },
    cILOMapping: { findMany: ciloMappingFindManyMock },
    studentEnrollment: { findMany: studentEnrollmentFindManyMock },
    alumniProfile: { findMany: alumniProfileFindManyMock },
    industryPartnerProfile: { findMany: industryPartnerProfileFindManyMock },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

const MOCK_EVALUATION_SHAPE = {
  id: "eval-1",
  deployment_name: "Post-Term CILO Evaluation Tool",
  instrument: {
    structure_snapshot: [
      {
        key: "teaching",
        title: "Teaching",
        items: [
          {
            key: "clarity",
            kind: "quantitative",
            prompt: "Clarity",
            likertDescriptors: [
              { value: 1, label: "Not Achieved" },
              { value: 2, label: "Slightly Achieved" },
              { value: 3, label: "Moderately Achieved" },
              { value: 4, label: "Mostly Achieved" },
              { value: 5, label: "Fully Achieved" },
            ],
          },
          { key: "remarks", kind: "qualitative", prompt: "Remarks" },
        ],
      },
    ],
  },
  course_assignment: {
    course: { code: "IT101", title: "Intro to Computing", major: { name: "BSIT" } },
    faculty: { name: "Dr. Smith" },
    program: { name: "BSIT" },
    year_level: "THIRD_YEAR",
    section: "MORNING",
    term_instance: {
      id: "term-ti1",
      school_year: { code: "2025-2026" },
      semester: "SECOND",
      term: "FIRST_TERM",
    },
  },
  cilo_question_bindings: [
    {
      id: "binding-clarity",
      cilo_id: "cilo-1",
      cilo_description_snapshot: "CILO 1",
      section_key: "teaching",
      item_key: "clarity",
    },
  ],
};

const MOCK_RESPONSE_DATA = {
  id: "response-1",
  submitted_at: new Date("2026-01-04T08:00:00.000Z"),
  respondent: { id: "user-s1", name: "Juan dela Cruz" },
  assignment: {
    course_bound: MOCK_EVALUATION_SHAPE,
    central_deployment: null,
  },
  quant_items: [
    { cilo_question_binding_id: "binding-clarity", section_key: "teaching", item_key: "clarity", rating_value: 4 },
  ],
  qual_items: [
    { section_key: "teaching", prompt_key: "remarks", text_content: "Very clear delivery." },
  ],
};

describe("getProgramHeadResponseDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
      userId: "head-1",
    });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: { userId: "head-1", selectedProgram: { id: "prog-beed", code: "BEED", name: "Bachelor of Education" }, authorizedPrograms: [] },
    });
    ciloMappingFindManyMock.mockResolvedValue([
      { cilo_id: "cilo-1", plo: { id: "plo-1", code: "PLO-1", description: "Communicate effectively" }, manifestation: "LEARNING" },
    ]);
    studentEnrollmentFindManyMock.mockResolvedValue([
      {
        student_user_id: "user-s1",
        program_id: "prog-beed",
        program: { name: "BEED" },
        major_id: null,
        major: null,
        year_level: "THIRD_YEAR",
        section: "MORNING",
      },
    ]);
  });

  it("returns null when the active role is not PROGRAM_HEAD", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });

    await expect(getProgramHeadResponseDetail("prog-beed", "response-1")).resolves.toBeNull();
    expect(responseFindFirstMock).not.toHaveBeenCalled();
  });

  it("returns null when Program Head context resolution fails", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({ success: false, error: "Not found" });

    await expect(getProgramHeadResponseDetail("prog-beed", "response-1")).resolves.toBeNull();
    expect(responseFindFirstMock).not.toHaveBeenCalled();
  });

  it("returns null when the response is not found (cross-Program or guessed ID)", async () => {
    responseFindFirstMock.mockResolvedValue(null);

    await expect(getProgramHeadResponseDetail("prog-beed", "nonexistent")).resolves.toBeNull();
    // Program scope is enforced in the where clause itself: a guessed or
    // cross-Program response ID can never resolve because the assignment
    // must belong to the selected Program (§29, §57).
    expect(responseFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "nonexistent",
          status: "SUBMITTED",
          assignment: {
            OR: [
              { course_bound: { course_assignment: { program_id: "prog-beed" } } },
              { central_deployment: { program_id: "prog-beed" } },
            ],
          },
        }),
      })
    );
  });

  it("returns null for IN_PROGRESS responses (SUBMITTED gate)", async () => {
    responseFindFirstMock.mockResolvedValue(null);

    // The gate is enforced by the where clause — SUBMITTED only. Behavioural:
    // if the DB had a matching IN_PROGRESS row, findFirst returns null.
    await expect(getProgramHeadResponseDetail("prog-beed", "in-progress-id")).resolves.toBeNull();
    expect(responseFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "SUBMITTED" }),
      })
    );
  });

  it("returns the full identified response detail for a course-bound response", async () => {
    responseFindFirstMock.mockResolvedValue(MOCK_RESPONSE_DATA);

    const result = await getProgramHeadResponseDetail("prog-beed", "response-1");

    expect(result).not.toBeNull();
    expect(result!.responseId).toBe("response-1");
    expect(result!.respondent.name).toBe("Juan dela Cruz");
    expect(result!.respondent.studentContext).toBeDefined();
    expect(result!.respondent.studentContext!.programLabel).toBe("BEED");
    expect(result!.respondent.studentContext!.yearLevel).toBe("THIRD_YEAR");
    expect(result!.respondent.studentContext!.section).toBe("MORNING");
    expect(result!.evaluation.type).toBe("COURSE_BOUND");
    expect(result!.quantitativeMean).toBe(4);
    expect(result!.sections).toHaveLength(1);
    expect(result!.sections[0].items).toHaveLength(2);
    // Quantitative answer
    const quant = result!.sections[0].items.find((i) => i.kind === "quantitative");
    expect(quant).toBeDefined();
    if (quant?.kind === "quantitative") {
      expect(quant.rating).toBe(4);
      expect(quant.scaleLabel).toBe("Mostly Achieved");
      expect(quant.binding.type).toBe("CILO");
      if (quant.binding.type === "CILO") {
        expect(quant.binding.ciloLabel).toBe("CILO 1");
        expect(quant.binding.ploMappings).toHaveLength(1);
        expect(quant.binding.ploMappings[0].ploCode).toBe("PLO-1");
      }
    }
    // Qualitative answer
    const qual = result!.sections[0].items.find((i) => i.kind === "qualitative");
    expect(qual).toBeDefined();
    if (qual?.kind === "qualitative") {
      expect(qual.text).toBe("Very clear delivery.");
    }
  });

  it("loads student context from term-scoped StudentEnrollment", async () => {
    responseFindFirstMock.mockResolvedValue(MOCK_RESPONSE_DATA);

    await getProgramHeadResponseDetail("prog-beed", "response-1");

    expect(studentEnrollmentFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          student_user_id: { in: ["user-s1"] },
          term_instance_id: "term-ti1",
        }),
      })
    );
  });

  it("returns alumni context for a central alumni response", async () => {
    responseFindFirstMock.mockResolvedValue({
      id: "response-alum",
      submitted_at: new Date("2026-01-05T08:00:00.000Z"),
      respondent: { id: "user-alum1", name: "Maria Gomez" },
      assignment: {
        course_bound: null,
        central_deployment: {
          id: "central-alum",
          deployment_name: "Alumni Survey 2026",
          target_stakeholder: "ALUMNI",
          year_level: null,
          instrument: { version_number: 1, structure_snapshot: [] },
          program: { name: "BEED" },
          major: { name: "Mathematics" },
          term_instance: { id: "term-ti2", school_year: { code: "2025-2026" }, semester: "FIRST", term: null },
          plo_snapshots: [],
        },
      },
      quant_items: [],
      qual_items: [],
    });
    alumniProfileFindManyMock.mockResolvedValue([
      { user_id: "user-alum1", graduation_year: 2024, program: { name: "BEED" }, major: { name: "Mathematics" } },
    ]);

    const result = await getProgramHeadResponseDetail("prog-beed", "response-alum");

    expect(result).not.toBeNull();
    expect(result!.respondent.name).toBe("Maria Gomez");
    expect(result!.respondent.alumniContext).toBeDefined();
    expect(result!.respondent.alumniContext!.graduationYear).toBe(2024);
    expect(result!.respondent.alumniContext!.programLabel).toBe("BEED");
    expect(result!.evaluation.type).toBe("PROGRAM_WIDE");
  });

  it("returns industry context for a central industry response", async () => {
    responseFindFirstMock.mockResolvedValue({
      id: "response-ind",
      submitted_at: new Date("2026-01-06T08:00:00.000Z"),
      respondent: { id: "user-ind1", name: "Carlos Tan" },
      assignment: {
        course_bound: null,
        central_deployment: {
          id: "central-ind",
          deployment_name: "Industry Partner Feedback",
          target_stakeholder: "INDUSTRY_PARTNER",
          year_level: null,
          instrument: { version_number: 1, structure_snapshot: [] },
          program: { name: "BSHM" },
          major: { name: "Hospitality" },
          term_instance: { id: "term-ti2", school_year: { code: "2025-2026" }, semester: "FIRST", term: null },
          plo_snapshots: [],
        },
      },
      quant_items: [],
      qual_items: [],
    });
    industryPartnerProfileFindManyMock.mockResolvedValue([
      { user_id: "user-ind1", company_name: "Marriott Hotel", position: "General Manager" },
    ]);

    const result = await getProgramHeadResponseDetail("prog-beed", "response-ind");

    expect(result).not.toBeNull();
    expect(result!.respondent.name).toBe("Carlos Tan");
    expect(result!.respondent.industryContext).toBeDefined();
    expect(result!.respondent.industryContext!.companyName).toBe("Marriott Hotel");
    expect(result!.respondent.industryContext!.position).toBe("General Manager");
  });
});