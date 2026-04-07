import { z } from "zod";

export const createToolSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().optional(),
  industryId: z.string().min(1),
});

export const updateToolSchema = createToolSchema.partial();

export const listToolsQuery = z.object({
  industryId: z.string().optional(),
});

export type CreateToolInput = z.infer<typeof createToolSchema>;
export type UpdateToolInput = z.infer<typeof updateToolSchema>;
export type ListToolsQuery = z.infer<typeof listToolsQuery>;
