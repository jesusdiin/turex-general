import { contactsService, phoneFromWaFrom } from "../../services/contacts.service";
import { companiesService } from "../../services/companies.service";
import { sessionsService } from "../../services/sessions.service";
import { OutboundMessage } from "../../services/messages.service";
import { registrationFlow } from "./registration.flow";
import { env } from "../../config/env";
import { detectIntent } from "./intents";

const ASK_BUSINESS_COPY = "Ahora dime, ¿cuál es el *nombre de tu negocio*?";

function statusVerb(s: "OPEN" | "CLOSED"): string {
  return s === "OPEN" ? "abierto" : "cerrado";
}

function pickCompanyText(companies: { name: string }[], status: "OPEN" | "CLOSED"): string {
  const list = companies.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
  return `¿Qué negocio quieres marcar como *${statusVerb(status)}*? Responde con el *número*:\n\n${list}`;
}

function menuExistingMessage(): OutboundMessage {
  const question = "Ya tienes negocios registrados 👋. ¿Quieres registrar *otro negocio*?";
  if (env.TWILIO_CONTENT_SID_YES_NO) {
    return {
      kind: "buttons",
      contentSid: env.TWILIO_CONTENT_SID_YES_NO,
      variables: { "1": question },
      fallbackText: `${question}\n\nResponde *sí* o *no*.`,
    };
  }
  return { kind: "text", body: `${question}\n\nResponde *sí* o *no*.` };
}

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
    const intent = detectIntent(effectiveBody);
    if (intent?.name === "open_business" || intent?.name === "close_business") {
      const status: "OPEN" | "CLOSED" =
        intent.name === "open_business" ? "OPEN" : "CLOSED";
      const companies = await companiesService.listForContact(contact.id);
      if (companies.length === 1) {
        await companiesService.setStatus(companies[0].id, status);
        return {
          kind: "text",
          body: `✅ *${companies[0].name}* quedó marcado como *${statusVerb(status)}*.`,
        };
      }
      await sessionsService.set(from, "pick_company_status", { status });
      return { kind: "text", body: pickCompanyText(companies, status) };
    }
    if (intent?.name === "new_business") {
      await sessionsService.set(from, "ask_business", {
        display_name: contact.display_name ?? undefined,
      });
      return { kind: "text", body: ASK_BUSINESS_COPY };
    }
    await sessionsService.set(from, "menu_existing", {});
    return menuExistingMessage();
  }

  return await registrationFlow.step(contact, session, effectiveBody);
}
