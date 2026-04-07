import { Router } from "express";
import { validate } from "../../middlewares/validate";
import { authMiddleware } from "../../middlewares/auth";
import { credentialsSchema, oauthQuery } from "./auth.schema";
import { authController } from "./auth.controller";

const router = Router();

router.post("/signup", validate(credentialsSchema), authController.signup);
router.post("/signin", validate(credentialsSchema), authController.signin);
router.get("/oauth/google", validate(oauthQuery, "query"), authController.google);
router.get("/me", authMiddleware, authController.me);

export default router;
