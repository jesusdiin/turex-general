import { RequestHandler } from "express";
import { ZodSchema } from "zod";

type Source = "body" | "query" | "params";

export const validate =
  (schema: ZodSchema, source: Source = "body"): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    (req as any)[source] = result.data;
    next();
  };
