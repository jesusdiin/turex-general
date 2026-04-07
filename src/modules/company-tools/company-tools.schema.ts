import { z } from "zod";

export const enableToolSchema = z.object({
  toolId: z.string().min(1),
});

export type EnableToolInput = z.infer<typeof enableToolSchema>;
