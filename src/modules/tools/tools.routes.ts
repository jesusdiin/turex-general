import { Router } from "express";
import { validate } from "../../middlewares/validate";
import { createToolSchema, listToolsQuery, updateToolSchema } from "./tools.schema";
import { toolsController } from "./tools.controller";

const router = Router();

router.post("/", validate(createToolSchema), toolsController.create);
router.get("/", validate(listToolsQuery, "query"), toolsController.list);
router.get("/:id", toolsController.get);
router.patch("/:id", validate(updateToolSchema), toolsController.update);
router.delete("/:id", toolsController.remove);

export default router;
