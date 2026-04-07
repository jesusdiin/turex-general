import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { HttpError } from "../utils/http-error";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation error", details: err.flatten() });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return res.status(409).json({ error: "Unique constraint violation", details: err.meta });
    if (err.code === "P2025") return res.status(404).json({ error: "Resource not found" });
    return res.status(400).json({ error: err.message, code: err.code });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
