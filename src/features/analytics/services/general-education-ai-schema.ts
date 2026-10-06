import { AcademicSemester, YearLevel } from "@prisma/client";
import { z } from "zod";
import { GENERAL_EDUCATION_ANALYTICS_TABS } from "./general-education-analytics-state";

/**
 * Server-only Zod contracts for the General Education Coordinator AI
 * interpretation. The client may submit exactly two things: the Coordinator
 * view it is looking at and validated URL filter state. Client-supplied
 * aggregates, comments, respondent identities, and scope decisions are
 * rejected outright — evidence is always rebuilt and re-authorized server-side.
 */

const uuid = z.string().uuid();

export const generalEducationAiActionInputSchema = z
  .object({
    view: z.enum(GENERAL_EDUCATION_ANALYTICS_TABS),
    filters: z
      .object({
        tab: z.enum(GENERAL_EDUCATION_ANALYTICS_TABS),
        schoolYearId: uuid.optional(),
        semester: z.nativeEnum(AcademicSemester).optional(),
        termInstanceId: uuid.optional(),
        courseId: uuid.optional(),
        programId: uuid.optional(),
        yearLevel: z.nativeEnum(YearLevel).optional(),
        iloId: uuid.optional(),
      })
      .strict(),
  })
  .strict();
