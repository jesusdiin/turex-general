import { Router } from "express";
import { validate } from "../../middlewares/validate";
import {
  createCompanySchema,
  listCompaniesQuery,
  updateCompanySchema,
} from "./companies.schema";
import { companiesController } from "./companies.controller";
import companyToolsRouter from "../company-tools/company-tools.routes";

const router = Router();

router.post("/", validate(createCompanySchema), companiesController.create);
router.get("/", validate(listCompaniesQuery, "query"), companiesController.list);
router.get("/:id", companiesController.get);
router.patch("/:id", validate(updateCompanySchema), companiesController.update);
router.delete("/:id", companiesController.remove);

// Nested: /companies/:companyId/tools
router.use("/:companyId/tools", companyToolsRouter);

export default router;
