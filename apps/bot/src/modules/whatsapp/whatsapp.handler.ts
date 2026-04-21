import { contactsService, phoneFromWaFrom } from "../../services/contacts.service";
import { companiesService } from "../../services/companies.service";
import { productsService } from "../../services/products.service";
import { sessionsService } from "../../services/sessions.service";
import { OutboundMessage } from "../../services/messages.service";
import { registrationFlow, startRegistration } from "./registration.flow";
import { productFlow, formatMenu } from "./product.flow";
import { businessEditFlow } from "./business-edit.flow";
import {
  mainMenuMessage,
  businessSubMenuMessage,
  completedWithSubMenu,
} from "./navigation";
import { detectIntent } from "./intents";

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

const text = (body: string): OutboundMessage => ({ kind: "text", body });

export async function handleIncomingMessage({
  from,
  body,
  buttonPayload,
  media,
}: IncomingMessage): Promise<OutboundMessage> {
  const effectiveBody = buttonPayload
    ? PAYLOAD_TO_TEXT[buttonPayload.toLowerCase()] ?? body
    : body;

  const lower = (effectiveBody ?? "").trim().toLowerCase();
  const raw = (effectiveBody ?? "").trim();

  const contact = await contactsService.upsert({
    waFrom: from,
    phone: phoneFromWaFrom(from),
  });

  /* ── 1. menú / cancelar — interceptan siempre ─────────────── */

  const intent = detectIntent(effectiveBody);

  if (intent?.name === "menu") {
    await sessionsService.reset(from);
    const companies = await companiesService.listForContact(contact.id);
    return mainMenuMessage(contact.display_name, companies);
  }

  if (lower === "cancelar") {
    await sessionsService.reset(from);
    const companies = await companiesService.listForContact(contact.id);
    const menuMsg = mainMenuMessage(contact.display_name, companies);
    return { kind: "text", body: `Listo, cancelé lo que estábamos haciendo.\n\n${(menuMsg as any).body}` };
  }

  const session = await sessionsService.get(from);

  /* ── 2. submenú de negocio ─────────────────────────────────── */

  if (session?.step === "business_submenu") {
    const data = session.data as { company_id: string; company_name: string };
    const company = await companiesService.getById(data.company_id);

    if (!company) {
      await sessionsService.reset(from);
      const companies = await companiesService.listForContact(contact.id);
      return mainMenuMessage(contact.display_name, companies);
    }

    if (lower === "0") {
      await sessionsService.reset(from);
      const companies = await companiesService.listForContact(contact.id);
      return mainMenuMessage(contact.display_name, companies);
    }

    if (lower === "1") {
      const newStatus = company.status === "OPEN" ? "CLOSED" : "OPEN";
      await companiesService.setStatus(company.id, newStatus);
      const updated = await companiesService.getById(company.id);
      if (updated) {
        await sessionsService.set(from, "business_submenu", {
          company_id: updated.id,
          company_name: updated.name,
        });
        const verb = updated.status === "OPEN" ? "abierto ✅" : "cerrado ❌";
        return completedWithSubMenu(`✅ *${updated.name}* marcado como *${verb}*.`, updated);
      }
    }

    if (lower === "2") {
      const products = await productsService.listForCompany(company.id);
      return text(formatMenu(company.name, products));
    }

    if (lower === "3") {
      const productData = { company_id: company.id, company_name: company.name };
      await sessionsService.set(from, "product_ask_name", productData);
      return text("¿Cuál es el *nombre* del producto?");
    }

    if (lower === "4") {
      await sessionsService.set(from, "business_edit_pick_field", {
        company_id: company.id,
        company_name: company.name,
      });
      return businessEditFlow.startEdit(company);
    }

    if (lower === "5") {
      await sessionsService.set(from, "business_edit_confirm_delete", {
        company_id: company.id,
        company_name: company.name,
      });
      return businessEditFlow.startDelete(company);
    }

    // Cualquier otra entrada: re-mostrar el submenú
    return businessSubMenuMessage(company);
  }

  /* ── 3. flujos activos ─────────────────────────────────────── */

  if (session?.step.startsWith("business_edit_")) {
    return businessEditFlow.step(contact, session, effectiveBody, media);
  }

  if (session?.step.startsWith("product_")) {
    return productFlow.step(contact, session, effectiveBody, media);
  }

  if (session) {
    return registrationFlow.step(contact, session, effectiveBody, media);
  }

  /* ── 4. sin sesión: routing numérico + intents ─────────────── */

  const companies = await companiesService.listForContact(contact.id);

  // Routing numérico desde menú principal
  const n = parseInt(lower, 10);
  if (!isNaN(n) && n >= 1) {
    if (n - 1 < companies.length) {
      const chosen = companies[n - 1];
      await sessionsService.set(from, "business_submenu", {
        company_id: chosen.id,
        company_name: chosen.name,
      });
      return businessSubMenuMessage(chosen);
    }
    if (n === companies.length + 1) {
      return startRegistration(contact);
    }
  }

  // Intents por palabras clave
  if (intent?.name === "open_business" || intent?.name === "close_business") {
    const status: "OPEN" | "CLOSED" =
      intent.name === "open_business" ? "OPEN" : "CLOSED";
    if (companies.length === 1) {
      await companiesService.setStatus(companies[0].id, status);
      const updated = await companiesService.getById(companies[0].id);
      if (updated) {
        await sessionsService.set(from, "business_submenu", {
          company_id: updated.id,
          company_name: updated.name,
        });
        const verb = updated.status === "OPEN" ? "abierto ✅" : "cerrado ❌";
        return completedWithSubMenu(`✅ *${updated.name}* marcado como *${verb}*.`, updated);
      }
    }
    if (companies.length > 1) {
      const { pickCompanyMessage } = await import("./registration.flow");
      await sessionsService.set(from, "pick_company_status", {
        status,
        company_ids: companies.map((c) => c.id),
      });
      return pickCompanyMessage(companies, status);
    }
  }

  if (intent?.name === "new_business") {
    return startRegistration(contact);
  }

  if (
    intent?.name === "add_product" ||
    intent?.name === "list_products" ||
    intent?.name === "delete_product" ||
    intent?.name === "edit_product"
  ) {
    return productFlow.handleIntent(contact, intent, effectiveBody);
  }

  // Fallback: mostrar menú principal
  return mainMenuMessage(contact.display_name, companies);
}
