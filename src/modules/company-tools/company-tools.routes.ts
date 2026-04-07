import { Router } from "express";
import { validate } from "../../middlewares/validate";
import { enableToolSchema } from "./company-tools.schema";
import { companyToolsController } from "./company-tools.controller";

const router = Router({ mergeParams: true });

router.post("/", validate(enableToolSchema), companyToolsController.enable);
router.get("/", companyToolsController.list);
router.delete("/:toolId", companyToolsController.disable);

export default router;
