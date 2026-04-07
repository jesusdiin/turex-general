import { Router } from "express";
import { validate } from "../../middlewares/validate";
import { createIndustrySchema, updateIndustrySchema } from "./industries.schema";
import { industriesController } from "./industries.controller";

const router = Router();

router.post("/", validate(createIndustrySchema), industriesController.create);
router.get("/", industriesController.list);
router.get("/:id", industriesController.get);
router.patch("/:id", validate(updateIndustrySchema), industriesController.update);
router.delete("/:id", industriesController.remove);

export default router;
