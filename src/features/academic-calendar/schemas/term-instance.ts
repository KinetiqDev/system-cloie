import { z } from "zod";

/**
 * Zod schema for updating a Term Instance.
 */
export const updateTermInstanceSchema = z
  .object({
    id: z.string().uuid("Invalid term instance ID"),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate < data.endDate;
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    }
  );

export type UpdateTermInstanceInput = z.infer<typeof updateTermInstanceSchema>;
