import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_WHATSAPP_FROM: z.string().min(1),
  TWILIO_CONTENT_SID_YES_NO: z.string().optional(),
  TWILIO_CONTENT_SID_YES_NO_OTHER: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  LLM_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

const parsed = schema.parse(process.env);

// Forzar LLM_ENABLED=false si no hay API key
export const env = {
  ...parsed,
  LLM_ENABLED: parsed.LLM_ENABLED && Boolean(parsed.OPENAI_API_KEY),
};
