import { contactsService, phoneFromWaFrom } from "../../services/contacts.service";
import { companiesService, Company } from "../../services/companies.service";
import { sessionsService } from "../../services/sessions.service";
import { OutboundMessage } from "../../services/messages.service";
import { registrationFlow, pickCompanyMessage } from "./registration.flow";
import { productFlow } from "./product.flow";
import { env } from "../../config/env";
import { detectIntent } from "./intents";

function statusVerb(s: "OPEN" | "CLOSED"): string {
  return s === "OPEN" ? "abierto" : "cerrado";
}

function businessMenuMessage(companies: Company[]): OutboundMessage {
  const list = companies
    .map((c, i) => {
      const icon = c.status === "OPEN" ? "✅" : "❌";
      const label = c.status === "OPEN" ? "Abierto" : "Cerrado";
      return `${i + 1}. ${c.name} — ${icon} ${label}`;
    })
    .join("\n");

  const body = [
    "👋 Tus negocios:\n",
    list,
    "\n¿Qué quieres hacer?",
    "• *abrir* / *cerrar* — cambiar estado",
    "• *agregar producto* — añadir al menú",
    "• *ver menú* — ver tus productos",
    "• *nuevo negocio* — registrar otro",
  ].join("\n");

  return { kind: "text", body };
}

export interface IncomingMessage {
  from: string;
  body: string;
  buttonPayload?: string;
  media?: { url: string; contentType: string }[];
}

const PAYLOAD_TO_TEXT: Record<string, string> = {
  yes: "sí",
  no: "no",
  other: "otro",
  pick_1: "1",
  pick_2: "2",
  pick_3: "3",
};

export async function handleIncomingMessage({
  from,
  body,
  buttonPayload,
  media,
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
      await sessionsService.set(from, "pick_company_status", {
        status,
        company_ids: companies.map((c) => c.id),
      });
      return pickCompanyMessage(companies, status);
    }
    if (intent?.name === "new_business") {
      await sessionsService.set(from, "ask_business", {
        display_name: contact.display_name ?? undefined,
      });
      return { kind: "text", body: "Ahora dime, ¿cuál es el *nombre de tu negocio*?" };
    }
    if (
      intent?.name === "add_product" ||
      intent?.name === "list_products" ||
      intent?.name === "delete_product" ||
      intent?.name === "edit_product"
    ) {
      return await productFlow.handleIntent(contact, intent, effectiveBody);
    }
    const companies = await companiesService.listForContact(contact.id);
    return businessMenuMessage(companies);
  }

  if (session?.step.startsWith("product_")) {
    return await productFlow.step(contact, session, effectiveBody, media);
  }

  return await registrationFlow.step(contact, session, effectiveBody, media);
}
