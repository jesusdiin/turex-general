import { prisma } from "../../config/prisma";

export const companyToolsService = {
  enable: (companyId: string, toolId: string) =>
    prisma.companyTool.upsert({
      where: { companyId_toolId: { companyId, toolId } },
      create: { companyId, toolId, enabled: true },
      update: { enabled: true },
      include: { tool: true },
    }),
  list: (companyId: string) =>
    prisma.companyTool.findMany({
      where: { companyId },
      include: { tool: true },
      orderBy: { enabledAt: "desc" },
    }),
  disable: (companyId: string, toolId: string) =>
    prisma.companyTool.delete({
      where: { companyId_toolId: { companyId, toolId } },
    }),
};
