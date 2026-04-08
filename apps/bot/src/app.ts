import express from "express";
import whatsappRouter from "./modules/whatsapp/whatsapp.routes";

export const app = express();

// Twilio postea application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/whatsapp", whatsappRouter);
