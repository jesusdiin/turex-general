import { contactsService, phoneFromWaFrom } from "../../services/contacts.service";
import { companiesService } from "../../services/companies.service";
import { sessionsService } from "../../services/sessions.service";
import { OutboundMessage } from "../../services/messages.service";
import { registrationFlow } from "./registration.flow";

export interface IncomingMessage {
  from: string;
  body: string;
  buttonPayload?: string;
}

const PAYLOAD_TO_TEXT: Record<string, string> = {
  yes: "sí",
  no: "no",
  other: "otro",
};

export async function handleIncomingMessage({
  from,
  body,
  buttonPayload,
}: IncomingMessage): Promise<OutboundMessage> {
  // Si vino un payload de botón, lo usamos como body normalizado
  const effectiveBody = buttonPayload
    ? PAYLOAD_TO_TEXT[buttonPayload.toLowerCase()] ?? body
    : body;

  const lower = (effectiveBody ?? "").trim().toLowerCase();

  const contact = await contactsService.upsert({
    waFrom: from,
    phone: phoneFromWaFrom(from),
  });

  if (lower === "cancelar") {
    await sessionsService.reset(from);
    return {
      kind: "text",
      body: "Listo, cancelé lo que estábamos haciendo. Escribe *hola* cuando quieras empezar de nuevo.",
    };
  }

  const session = await sessionsService.get(from);
  const hasCompany = await companiesService.hasCompanyForContact(contact.id);

  if (hasCompany && !session) {
    return {
      kind: "text",
      body: "Ya tienes tu negocio registrado 👋. Pronto vamos a sumar más opciones.",
    };
  }

  return await registrationFlow.step(contact, session, effectiveBody);
}
