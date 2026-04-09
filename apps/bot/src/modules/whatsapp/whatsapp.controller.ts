import { RequestHandler } from "express";
import { handleIncomingMessage } from "./whatsapp.handler";
import { messagesService } from "../../services/messages.service";

export const whatsappController = {
  // TODO: validar firma de Twilio con twilio.validateRequest(authToken, signature, url, params)
  webhook: (async (req, res) => {
    const from = String(req.body.From ?? "");
    const body = String(req.body.Body ?? "");
    const buttonPayload = req.body.ButtonPayload ? String(req.body.ButtonPayload) : undefined;

    const numMedia = parseInt(String(req.body.NumMedia ?? "0"), 10) || 0;
    const media: { url: string; contentType: string }[] = [];
    for (let i = 0; i < numMedia; i++) {
      const url = req.body[`MediaUrl${i}`];
      const ct = req.body[`MediaContentType${i}`];
      if (url) media.push({ url: String(url), contentType: String(ct ?? "") });
    }

    // Respondemos rápido al webhook; el envío saliente va por REST API
    res.status(200).end();

    if (!from) return;

    try {
      const out = await handleIncomingMessage({ from, body, buttonPayload, media });
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
