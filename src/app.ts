import express from "express";
import authRouter from "./modules/auth/auth.routes";
import industriesRouter from "./modules/industries/industries.routes";
import companiesRouter from "./modules/companies/companies.routes";
import toolsRouter from "./modules/tools/tools.routes";
import { authMiddleware } from "./middlewares/auth";
import { errorHandler } from "./middlewares/error-handler";

export const app = express();

app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Public auth endpoints (signup/signin/oauth) + protected /me handled inside the router
app.use("/api/v1/auth", authRouter);

// Protected business routes
app.use("/api/v1/industries", authMiddleware, industriesRouter);
app.use("/api/v1/companies", authMiddleware, companiesRouter);
app.use("/api/v1/tools", authMiddleware, toolsRouter);

app.use(errorHandler);
