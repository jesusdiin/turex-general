import { supabase } from "../../config/supabase";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { HttpError } from "../../utils/http-error";
import { CredentialsInput } from "./auth.schema";

export const authService = {
  async signup(input: CredentialsInput) {
    const { data, error } = await supabase.auth.signUp(input);
    if (error) throw new HttpError(400, error.message);
    return data;
  },

  async signin(input: CredentialsInput) {
    const { data, error } = await supabase.auth.signInWithPassword(input);
    if (error) throw new HttpError(401, error.message);
    return data;
  },

  async googleOAuthUrl(redirectTo?: string) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo ?? env.GOOGLE_OAUTH_REDIRECT_URL,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw new HttpError(400, error.message);
    return { url: data.url };
  },

  me(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { companies: { include: { company: true } } },
    });
  },
};
