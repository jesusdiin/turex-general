import { RequestHandler } from "express";
import { authService } from "./auth.service";

export const authController = {
  signup: (async (req, res, next) => {
    try { res.status(201).json(await authService.signup(req.body)); } catch (e) { next(e); }
  }) as RequestHandler,
  signin: (async (req, res, next) => {
    try { res.json(await authService.signin(req.body)); } catch (e) { next(e); }
  }) as RequestHandler,
  google: (async (req, res, next) => {
    try { res.json(await authService.googleOAuthUrl((req.query as any).redirectTo)); } catch (e) { next(e); }
  }) as RequestHandler,
  me: (async (req, res, next) => {
    try { res.json(await authService.me(req.user!.id)); } catch (e) { next(e); }
  }) as RequestHandler,
};
