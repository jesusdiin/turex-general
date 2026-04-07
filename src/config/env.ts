import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URL: z.string().url().optional(),
  PORT: z.coerce.number().default(3000),
});

export const env = schema.parse(process.env);
