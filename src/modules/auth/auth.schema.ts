import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const oauthQuery = z.object({
  redirectTo: z.string().url().optional(),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;
export type OAuthQuery = z.infer<typeof oauthQuery>;
