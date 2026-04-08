import { twilioClient } from "./twilio";
import { env } from "../config/env";

export type OutboundMessage =
  | { kind: "text"; body: string }
  | { kind: "buttons"; contentSid: string; variables: Record<string, string>; fallbackText: string };

export const messagesService = {
  async send(to: string, msg: OutboundMessage): Promise<void> {
    const from = env.TWILIO_WHATSAPP_FROM;

    if (msg.kind === "text") {
      await twilioClient.messages.create({ from, to, body: msg.body });
      return;
    }

    try {
      await twilioClient.messages.create({
        from,
        to,
        contentSid: msg.contentSid,
        contentVariables: JSON.stringify(msg.variables),
      });
    } catch (err) {
      console.error("[messages.service] buttons failed, fallback to text:", err);
      await twilioClient.messages.create({ from, to, body: msg.fallbackText });
    }
  },
};
