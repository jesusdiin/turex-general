import { prisma } from "../../config/prisma";
import {
  CreateCompanyInput,
  ListCompaniesQuery,
  UpdateCompanyInput,
} from "./companies.schema";

export const companiesService = {
  create: (data: CreateCompanyInput, userId: string) =>
    prisma.company.create({
      data: {
        ...data,
        members: {
          create: { userId, role: "OWNER" },
        },
      },
      include: { members: true },
    }),
  list: (filters: ListCompaniesQuery) =>
    prisma.company.findMany({
      where: { industryId: filters.industryId, size: filters.size },
      orderBy: { createdAt: "desc" },
    }),
  get: (id: string) =>
    prisma.company.findUniqueOrThrow({
      where: { id },
      include: {
        industry: true,
        tools: { include: { tool: true } },
        members: { include: { user: true } },
      },
    }),
  update: (id: string, data: UpdateCompanyInput) =>
    prisma.company.update({ where: { id }, data }),
  remove: (id: string) => prisma.company.delete({ where: { id } }),
};
