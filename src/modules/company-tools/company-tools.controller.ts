import { RequestHandler } from "express";
import { companyToolsService } from "./company-tools.service";

export const companyToolsController = {
  enable: (async (req, res, next) => {
    try {
      const result = await companyToolsService.enable(req.params.companyId, req.body.toolId);
      res.status(201).json(result);
    } catch (e) { next(e); }
  }) as RequestHandler,
  list: (async (req, res, next) => {
    try { res.json(await companyToolsService.list(req.params.companyId)); } catch (e) { next(e); }
  }) as RequestHandler,
  disable: (async (req, res, next) => {
    try {
      await companyToolsService.disable(req.params.companyId, req.params.toolId);
      res.status(204).end();
    } catch (e) { next(e); }
  }) as RequestHandler,
};
