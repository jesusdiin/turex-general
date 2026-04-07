import { RequestHandler } from "express";
import { companiesService } from "./companies.service";

export const companiesController = {
  create: (async (req, res, next) => {
    try { res.status(201).json(await companiesService.create(req.body, req.user!.id)); } catch (e) { next(e); }
  }) as RequestHandler,
  list: (async (req, res, next) => {
    try { res.json(await companiesService.list(req.query as any)); } catch (e) { next(e); }
  }) as RequestHandler,
  get: (async (req, res, next) => {
    try { res.json(await companiesService.get(req.params.id)); } catch (e) { next(e); }
  }) as RequestHandler,
  update: (async (req, res, next) => {
    try { res.json(await companiesService.update(req.params.id, req.body)); } catch (e) { next(e); }
  }) as RequestHandler,
  remove: (async (req, res, next) => {
    try { await companiesService.remove(req.params.id); res.status(204).end(); } catch (e) { next(e); }
  }) as RequestHandler,
};
