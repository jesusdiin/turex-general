import { contactsService, phoneFromWaFrom } from "../contacts/contacts.service";
import { companiesService, Company } from "../companies/companies.service";
import { productsService } from "../products/products.service";
import { sessionsService } from "../contacts/sessions.service";
import { OutboundMessage } from "../messaging/messages.service";
import { registrationFlow, startRegistration } from "./flows/registration.flow";
import { productFlow, formatMenu } from "./flows/product.flow";
import { businessEditFlow } from "./flows/business-edit.flow";
import {
  mainMenuMessage,
  businessSubMenuMessage,
  completedWithSubMenu,
} from "./flows/navigation";
import { detectIntent } from "./intents";
import { resolveSubMenuOption, resolveMainMenuOption } from "./intents/nav-resolver";
import { normalize } from "./intents/normalize";

function matchCompanyByName(text: string, companies: Company[]): Company | null {
  const t = normalize(text);
  const hits = companies.filter((c) => {
    const name = normalize(c.name);
    return name.length > 1 && (t.includes(name) || name.includes(t));
  });
  return hits.length === 1 ? hits[0] : null;
}

export interface IncomingMessage {
  from: string;
  body: string;
  buttonPayload?: string;
  media?: { url: string; contentType: string }[];
  location?: { lat: number; lng: number; address?: string; label?: string };
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
  location,
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

    const subOpt = resolveSubMenuOption(lower);

    if (subOpt === 0) {
      await sessionsService.reset(from);
      const companies = await companiesService.listForContact(contact.id);
      return mainMenuMessage(contact.display_name, companies);
    }

    if (subOpt === 1) {
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

    if (subOpt === 2) {
      const products = await productsService.listForCompany(company.id);
      return text(formatMenu(company.name, products));
    }

    if (subOpt === 3) {
      const productData = { company_id: company.id, company_name: company.name };
      await sessionsService.set(from, "product_ask_name", productData);
      return text("¿Cuál es el *nombre* del producto?");
    }

    if (subOpt === 4) {
      await sessionsService.set(from, "business_edit_pick_field", {
        company_id: company.id,
        company_name: company.name,
      });
      return businessEditFlow.startEdit(company);
    }

    if (subOpt === 5) {
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
    return businessEditFlow.step(contact, session, effectiveBody, media, location);
  }

  if (session?.step.startsWith("product_")) {
    return productFlow.step(contact, session, effectiveBody, media);
  }

  if (session) {
    return registrationFlow.step(contact, session, effectiveBody, media, location);
  }

  /* ── 4. sin sesión: routing numérico + intents ─────────────── */

  const companies = await companiesService.listForContact(contact.id);

  // Routing numérico + lenguaje natural desde menú principal
  const n = parseInt(lower, 10);
  const mainOpt = !isNaN(n) && n >= 1 ? n : resolveMainMenuOption(lower, companies);
  if (mainOpt !== null && mainOpt >= 1) {
    if (mainOpt - 1 < companies.length) {
      const chosen = companies[mainOpt - 1];
      await sessionsService.set(from, "business_submenu", {
        company_id: chosen.id,
        company_name: chosen.name,
      });
      return businessSubMenuMessage(chosen);
    }
    if (mainOpt === companies.length + 1) {
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
      const named = matchCompanyByName(effectiveBody, companies);
      if (named) {
        await companiesService.setStatus(named.id, status);
        const updated = await companiesService.getById(named.id);
        if (updated) {
          await sessionsService.set(from, "business_submenu", {
            company_id: updated.id,
            company_name: updated.name,
          });
          const verb = updated.status === "OPEN" ? "abierto ✅" : "cerrado ❌";
          return completedWithSubMenu(`✅ *${updated.name}* marcado como *${verb}*.`, updated);
        }
      }
      const { pickCompanyMessage } = await import("./flows/registration.flow");
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

  // Usuario nuevo (sin negocios): iniciar registro automáticamente
  if (!companies.length) {
    return startRegistration(contact);
  }

  // Fallback: mostrar menú principal
  return mainMenuMessage(contact.display_name, companies);
}
