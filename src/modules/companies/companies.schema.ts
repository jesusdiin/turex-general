import { z } from "zod";

export const companySize = z.enum(["MICRO", "SMALL", "MEDIUM"]);

export const createCompanySchema = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  taxId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  size: companySize.optional(),
  industryId: z.string().min(1),
});

export const updateCompanySchema = createCompanySchema.partial();

export const listCompaniesQuery = z.object({
  industryId: z.string().optional(),
  size: companySize.optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type ListCompaniesQuery = z.infer<typeof listCompaniesQuery>;
