import { RequestHandler } from "express";
import { industriesService } from "./industries.service";

export const industriesController = {
  create: (async (req, res, next) => {
    try { res.status(201).json(await industriesService.create(req.body)); } catch (e) { next(e); }
  }) as RequestHandler,
  list: (async (_req, res, next) => {
    try { res.json(await industriesService.list()); } catch (e) { next(e); }
  }) as RequestHandler,
  get: (async (req, res, next) => {
    try { res.json(await industriesService.get(req.params.id)); } catch (e) { next(e); }
  }) as RequestHandler,
  update: (async (req, res, next) => {
    try { res.json(await industriesService.update(req.params.id, req.body)); } catch (e) { next(e); }
  }) as RequestHandler,
  remove: (async (req, res, next) => {
    try { await industriesService.remove(req.params.id); res.status(204).end(); } catch (e) { next(e); }
  }) as RequestHandler,
};
