import { z } from "zod";
import type { LikertDescriptor, QuestionType } from "../types";

type PublishedInstrumentQuestion = {
  key: string;
  prompt: string;
  type: QuestionType;
  order: number;
  required: boolean;
  likertDescriptors: LikertDescriptor[];
  suggestedResponses: string[];
};

type PublishedInstrumentSection = {
  key: string;
  title: string;
  description: string | null;
  order: number;
  questions: PublishedInstrumentQuestion[];
};

const publishedQuestionSchema = z.object({
  key: z.string(),
  prompt: z.string(),
  type: z.enum(["likert", "guided_open_ended"]).catch("likert"),
  order: z.number().optional(),
  required: z.boolean().optional(),
  likertDescriptors: z.array(z.object({ value: z.number(), label: z.string() })).optional(),
  suggestedResponses: z.array(z.string()).optional(),
});

const publishedSectionSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number().optional(),
  questions: z.array(publishedQuestionSchema).optional(),
});

export function parsePublishedInstrument(snapshot: unknown): PublishedInstrumentSection[] {
  if (!Array.isArray(snapshot)) return [];

  return snapshot
    .flatMap((value, sectionIndex) => {
      const result = publishedSectionSchema.safeParse(value);
      if (!result.success) return [];

      const section = result.data;
      const questions = (section.questions ?? [])
        .map((question, questionIndex) => ({
          key: question.key,
          prompt: question.prompt,
          type: question.type,
          order: question.order ?? questionIndex,
          required: question.required !== false,
          likertDescriptors: question.type === "likert" ? (question.likertDescriptors ?? []) : [],
          suggestedResponses:
            question.type === "guided_open_ended" ? (question.suggestedResponses ?? []) : [],
        }))
        .sort((left, right) => left.order - right.order);

      return [
        {
          key: section.key,
          title: section.title,
          description: section.description ?? null,
          order: section.order ?? sectionIndex,
          questions,
        },
      ];
    })
    .sort((left, right) => left.order - right.order);
}
