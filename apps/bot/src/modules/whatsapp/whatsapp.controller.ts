import { RequestHandler } from "express";
import { handleIncomingMessage } from "./whatsapp.handler";
import { messagesService } from "../../services/messages.service";

export const whatsappController = {
  // TODO: validar firma de Twilio con twilio.validateRequest(authToken, signature, url, params)
  webhook: (async (req, res) => {
    const from = String(req.body.From ?? "");
    const body = String(req.body.Body ?? "");
    const buttonPayload = req.body.ButtonPayload ? String(req.body.ButtonPayload) : undefined;

    // Respondemos rápido al webhook; el envío saliente va por REST API
    res.status(200).end();

    if (!from) return;

    try {
      const out = await handleIncomingMessage({ from, body, buttonPayload });
      await messagesService.send(from, out);
    } catch (err) {
      console.error("[whatsapp.webhook] error:", err);
      try {
        await messagesService.send(from, {
          kind: "text",
          body: "Ups, hubo un problema procesando tu mensaje 😓. Intenta de nuevo en un momento.",
        });
      } catch (e) {
        console.error("[whatsapp.webhook] failed to send error message:", e);
      }
    }
  }) as RequestHandler,
};
