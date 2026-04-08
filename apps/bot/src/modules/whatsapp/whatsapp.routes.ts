import { Router } from "express";
import { whatsappController } from "./whatsapp.controller";

const router = Router();

router.post("/webhook", whatsappController.webhook);

export default router;
