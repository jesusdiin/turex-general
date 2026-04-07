import { prisma } from "../../config/prisma";
import { CreateToolInput, ListToolsQuery, UpdateToolInput } from "./tools.schema";

export const toolsService = {
  create: (data: CreateToolInput) => prisma.tool.create({ data }),
  list: (filters: ListToolsQuery) =>
    prisma.tool.findMany({
      where: { industryId: filters.industryId },
      orderBy: { createdAt: "desc" },
    }),
  get: (id: string) => prisma.tool.findUniqueOrThrow({ where: { id } }),
  update: (id: string, data: UpdateToolInput) =>
    prisma.tool.update({ where: { id }, data }),
  remove: (id: string) => prisma.tool.delete({ where: { id } }),
};
