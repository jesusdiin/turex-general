import { RequestHandler } from "express";
import twilio from "twilio";
import { handleIncomingMessage } from "./whatsapp.handler";

const { MessagingResponse } = twilio.twiml;

export const whatsappController = {
  // TODO: validar firma de Twilio con twilio.validateRequest(authToken, signature, url, params)
  webhook: (async (req, res, next) => {
    try {
      const from = String(req.body.From ?? "");
      const body = String(req.body.Body ?? "");

      const reply = await handleIncomingMessage({ from, body });

      const twiml = new MessagingResponse();
      twiml.message(reply);

      res.type("text/xml").send(twiml.toString());
    } catch (err) {
      console.error("[whatsapp.webhook] error:", err);
      const twiml = new MessagingResponse();
      twiml.message("Ups, hubo un problema procesando tu mensaje 😓. Probá de nuevo en un momento.");
      res.type("text/xml").send(twiml.toString());
      next;
    }
  }) as RequestHandler,
};
