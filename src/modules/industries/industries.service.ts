import { prisma } from "../../config/prisma";
import { CreateIndustryInput, UpdateIndustryInput } from "./industries.schema";

export const industriesService = {
  create: (data: CreateIndustryInput) => prisma.industry.create({ data }),
  list: () => prisma.industry.findMany({ orderBy: { createdAt: "desc" } }),
  get: (id: string) => prisma.industry.findUniqueOrThrow({ where: { id } }),
  update: (id: string, data: UpdateIndustryInput) =>
    prisma.industry.update({ where: { id }, data }),
  remove: (id: string) => prisma.industry.delete({ where: { id } }),
};
