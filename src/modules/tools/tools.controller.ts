import { RequestHandler } from "express";
import { toolsService } from "./tools.service";

export const toolsController = {
  create: (async (req, res, next) => {
    try { res.status(201).json(await toolsService.create(req.body)); } catch (e) { next(e); }
  }) as RequestHandler,
  list: (async (req, res, next) => {
    try { res.json(await toolsService.list(req.query as any)); } catch (e) { next(e); }
  }) as RequestHandler,
  get: (async (req, res, next) => {
    try { res.json(await toolsService.get(req.params.id)); } catch (e) { next(e); }
  }) as RequestHandler,
  update: (async (req, res, next) => {
    try { res.json(await toolsService.update(req.params.id, req.body)); } catch (e) { next(e); }
  }) as RequestHandler,
  remove: (async (req, res, next) => {
    try { await toolsService.remove(req.params.id); res.status(204).end(); } catch (e) { next(e); }
  }) as RequestHandler,
};
