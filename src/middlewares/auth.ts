import { RequestHandler } from "express";
import { supabase } from "../config/supabase";
import { prisma } from "../config/prisma";
import { HttpError } from "../utils/http-error";

export const authMiddleware: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Missing bearer token");
    const token = header.slice("Bearer ".length);

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new HttpError(401, "Invalid or expired token");
    if (!data.user.email) throw new HttpError(401, "User has no email");

    await prisma.user.upsert({
      where: { id: data.user.id },
      create: {
        id: data.user.id,
        email: data.user.email,
        fullName: (data.user.user_metadata?.full_name as string | undefined) ?? null,
      },
      update: { email: data.user.email },
    });

    req.user = { id: data.user.id, email: data.user.email };
    next();
  } catch (e) {
    next(e);
  }
};
