import { WaContact } from "../../services/contacts.service";
import { companiesService, Company } from "../../services/companies.service";
import { productsService, Product } from "../../services/products.service";
import { productPhotosService } from "../../services/product-photos.service";
import { sessionsService, WaSession } from "../../services/sessions.service";
import { extractProductFields, ExtractedProductFields } from "../../services/llm.service";
import { OutboundMessage } from "../../services/messages.service";
import { env } from "../../config/env";
import { IntentMatch } from "./intents";
import { businessSubMenuMessage, completedWithSubMenu } from "./navigation";

/* ── helpers ─────────────────────────────────────────────────── */

const YES = ["si", "sí", "s", "yes", "y", "claro", "ok", "okay", "dale", "va"];
const NO = ["no", "n", "nop"];
const SKIP = ["omitir", "skip", "saltar", "ninguno", "ninguna"];

const isYes = (t: string) => YES.includes(t);
const isNo = (t: string) => NO.includes(t);
const isSkip = (t: string) => SKIP.includes(t);

const text = (body: string): OutboundMessage => ({ kind: "text", body });

function yesNo(question: string): OutboundMessage {
  if (env.TWILIO_CONTENT_SID_YES_NO) {
    return {
      kind: "buttons",
      contentSid: env.TWILIO_CONTENT_SID_YES_NO,
      variables: { "1": question },
      fallbackText: `${question}\n\nResponde *sí* o *no*.`,
    };
  }
  return text(`${question}\n\nResponde *sí* o *no*.`);
}

function formatPrice(p: number): string {
  return `$${p.toFixed(2)}`;
}

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "").replace(/pesos?$/i, "").trim();
  const n = parseFloat(cleaned);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

interface ProductFlowData {
  company_id?: string;
  company_name?: string;
  name?: string;
  price?: number;
  description?: string | null;
  category?: string | null;
  photo_url?: string | null;
  product_id?: string;
  edit_field?: string;
  company_ids?: string[];
  original_text?: string;
}

/* ── format menu ─────────────────────────────────────────────── */

export function formatMenu(companyName: string, products: Product[]): string {
  if (!products.length) {
    return `Aún no tienes productos en *${companyName}*. Escribe *agregar producto* para empezar.`;
  }

  const grouped = new Map<string, Product[]>();
  for (const p of products) {
    const key = p.category ?? "";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }

  const lines: string[] = [`📋 *Menú de ${companyName}* (${products.length} producto${products.length === 1 ? "" : "s"})\n`];
  let idx = 1;
  for (const [cat, items] of grouped) {
    if (cat) lines.push(`🏷️ *${cat}*`);
    for (const p of items) {
      const avail = p.available ? "" : " _(no disponible)_";
      lines.push(`${idx}. ${p.name} — ${formatPrice(p.price)}${avail}`);
      idx++;
    }
    lines.push("");
  }
  lines.push("Escribe *agregar producto*, *editar producto* o *eliminar producto*.");
  return lines.join("\n");
}

function productListText(products: Product[]): string {
  return products.map((p, i) => `${i + 1}. ${p.name} — ${formatPrice(p.price)}`).join("\n");
}

/* ── pick company helper ────────────────────────────────────── */

async function pickCompanyForProduct(
  contact: WaContact,
  waFrom: string,
  stepPrefix: string,
  data: Partial<ProductFlowData>
): Promise<{ company: Company } | { message: OutboundMessage }> {
  const companies = await companiesService.listForContact(contact.id);
  if (!companies.length) {
    return { message: text("Primero necesitas registrar un negocio. Escribe *hola* para empezar.") };
  }
  if (companies.length === 1) {
    return { company: companies[0] };
  }
  // Multiple companies: ask user to pick
  const list = companies.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
  await sessionsService.set(waFrom, `product_pick_company_${stepPrefix}`, {
    ...data,
    company_ids: companies.map((c) => c.id),
  });
  return {
    message: text(`¿En qué negocio? Responde con el *número*:\n\n${list}`),
  };
}

async function resolveCompanyPick(
  contact: WaContact,
  waFrom: string,
  raw: string,
  data: ProductFlowData
): Promise<Company | null> {
  const ids = data.company_ids ?? [];
  const n = parseInt(raw, 10);
  if (!ids.length || Number.isNaN(n) || n < 1 || n > ids.length) return null;
  const companies = await companiesService.listForContact(contact.id);
  return companies.find((c) => c.id === ids[n - 1]) ?? null;
}

/* ── missing fields for LLM extraction ──────────────────────── */

function missingProductFields(data: ProductFlowData): (keyof ExtractedProductFields)[] {
  const m: (keyof ExtractedProductFields)[] = [];
  if (!data.name) m.push("product_name");
  if (data.price == null) m.push("product_price");
  if (data.description === undefined) m.push("product_description");
  if (data.category === undefined) m.push("product_category");
  return m;
}

function applyExtractedProduct(data: ProductFlowData, extracted: ExtractedProductFields): void {
  if (extracted.product_name && !data.name) data.name = extracted.product_name;
  if (extracted.product_price != null && data.price == null) data.price = extracted.product_price;
  if (extracted.product_description && data.description === undefined) data.description = extracted.product_description;
  if (extracted.product_category && data.category === undefined) data.category = extracted.product_category;
}

function nextAddStep(data: ProductFlowData): string {
  if (!data.name) return "product_ask_name";
  if (data.price == null) return "product_ask_price";
  if (data.description === undefined) return "product_ask_desc";
  if (data.category === undefined) return "product_ask_category";
  if (data.photo_url === undefined) return "product_ask_photo";
  return "product_confirm";
}

function productSummary(data: ProductFlowData): string {
  return [
    "📋 *Datos del producto:*",
    `• Nombre: ${data.name}`,
    `• Precio: ${formatPrice(data.price!)}`,
    `• Descripción: ${data.description ?? "—"}`,
    `• Categoría: ${data.category ?? "—"}`,
    `• Foto: ${data.photo_url ? "✅" : "—"}`,
    "",
    "¿Confirmas?",
  ].join("\n");
}

/* ── intent entry points ────────────────────────────────────── */

async function handleIntent(
  contact: WaContact,
  intent: IntentMatch,
  body: string
): Promise<OutboundMessage> {
  const waFrom = contact.whatsapp_from;

  switch (intent.name) {
    case "add_product": {
      const result = await pickCompanyForProduct(contact, waFrom, "add", { original_text: body });
      if ("message" in result) return result.message;
      const data: ProductFlowData = {
        company_id: result.company.id,
        company_name: result.company.name,
        original_text: body,
      };
      // Try LLM extraction from the intent message itself
      const extracted = await extractProductFields(body, missingProductFields(data));
      applyExtractedProduct(data, extracted);
      const next = nextAddStep(data);
      await sessionsService.set(waFrom, next, data);
      return promptForAdd(next, data);
    }

    case "list_products": {
      const result = await pickCompanyForProduct(contact, waFrom, "list", {});
      if ("message" in result) return result.message;
      const products = await productsService.listForCompany(result.company.id);
      return text(formatMenu(result.company.name, products));
    }

    case "delete_product": {
      const result = await pickCompanyForProduct(contact, waFrom, "delete", {});
      if ("message" in result) return result.message;
      const products = await productsService.listForCompany(result.company.id);
      if (!products.length) {
        return text(`No tienes productos en *${result.company.name}*.`);
      }
      await sessionsService.set(waFrom, "product_pick_delete", {
        company_id: result.company.id,
        company_name: result.company.name,
      });
      return text(`¿Qué producto quieres eliminar? Responde con el *número*:\n\n${productListText(products)}`);
    }

    case "edit_product": {
      const result = await pickCompanyForProduct(contact, waFrom, "edit", {});
      if ("message" in result) return result.message;
      const products = await productsService.listForCompany(result.company.id);
      if (!products.length) {
        return text(`No tienes productos en *${result.company.name}*.`);
      }
      await sessionsService.set(waFrom, "product_pick_edit", {
        company_id: result.company.id,
        company_name: result.company.name,
      });
      return text(`¿Qué producto quieres editar? Responde con el *número*:\n\n${productListText(products)}`);
    }

    default:
      return text("No entendí. Intenta de nuevo.");
  }
}

/* ── prompts for add flow ───────────────────────────────────── */

function promptForAdd(step: string, data: ProductFlowData): OutboundMessage {
  switch (step) {
    case "product_ask_name":
      return text("¿Cuál es el *nombre* del producto?");
    case "product_ask_price":
      return text("¿Cuál es el *precio*? (ejemplo: 45 o 45.50)");
    case "product_ask_desc":
      return text("Agrega una *descripción corta* (opcional). Escribe *omitir* para saltar.");
    case "product_ask_category": {
      return text("¿En qué *categoría* va? (ej: antojitos, bebidas, postres). Escribe *omitir* para saltar.");
    }
    case "product_ask_photo":
      return text("Manda una *foto* del producto o escribe *omitir* para saltar.");
    case "product_confirm":
      return yesNo(productSummary(data));
    default:
      return text("Algo salió mal. Intenta de nuevo.");
  }
}

const EDIT_FIELDS_MENU = [
  "1. Nombre",
  "2. Precio",
  "3. Descripción",
  "4. Categoría",
  "5. Foto",
  "6. Disponible (sí/no)",
].join("\n");

/* ── step processor ─────────────────────────────────────────── */

async function stepHandler(
  contact: WaContact,
  session: WaSession,
  body: string,
  media?: { url: string; contentType: string }[]
): Promise<OutboundMessage> {
  const raw = (body ?? "").trim();
  const lower = raw.toLowerCase();
  const waFrom = contact.whatsapp_from;
  const step = session.step;
  const data: ProductFlowData = session.data ?? {};

  /* ── company pickers ──────────────────────────────────────── */

  if (step.startsWith("product_pick_company_")) {
    const suffix = step.replace("product_pick_company_", "");
    const company = await resolveCompanyPick(contact, waFrom, raw, data);
    if (!company) {
      const companies = await companiesService.listForContact(contact.id);
      const list = companies.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
      return text(`Necesito el número de la opción:\n\n${list}`);
    }

    data.company_id = company.id;
    data.company_name = company.name;

    if (suffix === "add") {
      // Try LLM extraction from original text
      if (data.original_text) {
        const extracted = await extractProductFields(data.original_text, missingProductFields(data));
        applyExtractedProduct(data, extracted);
      }
      const next = nextAddStep(data);
      await sessionsService.set(waFrom, next, data);
      return promptForAdd(next, data);
    }

    if (suffix === "list") {
      await sessionsService.reset(waFrom);
      const products = await productsService.listForCompany(company.id);
      return text(formatMenu(company.name, products));
    }

    if (suffix === "delete") {
      const products = await productsService.listForCompany(company.id);
      if (!products.length) {
        await sessionsService.reset(waFrom);
        return text(`No tienes productos en *${company.name}*.`);
      }
      await sessionsService.set(waFrom, "product_pick_delete", data);
      return text(`¿Qué producto quieres eliminar?\n\n${productListText(products)}`);
    }

    if (suffix === "edit") {
      const products = await productsService.listForCompany(company.id);
      if (!products.length) {
        await sessionsService.reset(waFrom);
        return text(`No tienes productos en *${company.name}*.`);
      }
      await sessionsService.set(waFrom, "product_pick_edit", data);
      return text(`¿Qué producto quieres editar?\n\n${productListText(products)}`);
    }

    await sessionsService.reset(waFrom);
    return text("Algo salió mal. Intenta de nuevo.");
  }

  /* ── add flow ─────────────────────────────────────────────── */

  if (step === "product_ask_name") {
    if (!raw) return text("Necesito el nombre del producto.");
    data.name = raw;
    // Try extraction for remaining fields
    const extracted = await extractProductFields(raw, missingProductFields(data));
    applyExtractedProduct(data, extracted);
    const next = nextAddStep(data);
    await sessionsService.set(waFrom, next, data);
    return promptForAdd(next, data);
  }

  if (step === "product_ask_price") {
    const price = parsePrice(raw);
    if (price === null) return text("No entendí el precio. Escribe solo el número, ejemplo: *45* o *45.50*");
    data.price = price;
    const next = nextAddStep(data);
    await sessionsService.set(waFrom, next, data);
    return promptForAdd(next, data);
  }

  if (step === "product_ask_desc") {
    data.description = isSkip(lower) ? null : raw || null;
    const next = nextAddStep(data);
    await sessionsService.set(waFrom, next, data);
    return promptForAdd(next, data);
  }

  if (step === "product_ask_category") {
    data.category = isSkip(lower) ? null : raw || null;
    const next = nextAddStep(data);
    await sessionsService.set(waFrom, next, data);
    return promptForAdd(next, data);
  }

  if (step === "product_ask_photo") {
    if (isSkip(lower) || lower === "omitir") {
      data.photo_url = null;
      await sessionsService.set(waFrom, "product_confirm", data);
      return yesNo(productSummary(data));
    }

    const incoming = (media ?? []).filter((m) => m.contentType.startsWith("image/"));
    if (!incoming.length) {
      return text("Mándame una imagen del producto o escribe *omitir* para saltar.");
    }

    try {
      const url = await productPhotosService.uploadFromTwilio(
        data.company_id!,
        `tmp_${Date.now()}`,
        incoming[0].url,
        incoming[0].contentType
      );
      data.photo_url = url;
    } catch (err) {
      console.error("[product.flow] photo upload failed:", (err as Error).message);
      data.photo_url = null;
    }

    await sessionsService.set(waFrom, "product_confirm", data);
    return yesNo(productSummary(data));
  }

  if (step === "product_confirm") {
    if (isYes(lower)) {
      const product = await productsService.create({
        companyId: data.company_id!,
        name: data.name!,
        price: data.price!,
        description: data.description ?? null,
        category: data.category ?? null,
        photoUrl: data.photo_url ?? null,
      });
      const company = await companiesService.getById(data.company_id!);
      if (company) {
        await sessionsService.set(waFrom, "business_submenu", {
          company_id: company.id,
          company_name: company.name,
        });
        return completedWithSubMenu(
          `✅ *${product.name}* agregado a *${data.company_name}* por ${formatPrice(product.price)}.`,
          company
        );
      }
      await sessionsService.reset(waFrom);
      return text(`✅ *${product.name}* agregado.`);
    }
    if (isNo(lower)) {
      await sessionsService.reset(waFrom);
      return text("Cancelado.");
    }
    return yesNo("¿Confirmas agregar este producto?");
  }

  /* ── delete flow ──────────────────────────────────────────── */

  if (step === "product_pick_delete") {
    const products = await productsService.listForCompany(data.company_id!);
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1 || n > products.length) {
      return text(`Necesito el número del producto:\n\n${productListText(products)}`);
    }
    const chosen = products[n - 1];
    data.product_id = chosen.id;
    data.name = chosen.name;
    data.price = chosen.price;
    await sessionsService.set(waFrom, "product_confirm_delete", data);
    return yesNo(`¿Eliminar *${chosen.name}* (${formatPrice(chosen.price)})?`);
  }

  if (step === "product_confirm_delete") {
    if (isYes(lower)) {
      await productsService.remove(data.product_id!);
      const company = await companiesService.getById(data.company_id!);
      if (company) {
        await sessionsService.set(waFrom, "business_submenu", {
          company_id: company.id,
          company_name: company.name,
        });
        return completedWithSubMenu(`🗑️ *${data.name}* eliminado.`, company);
      }
      await sessionsService.reset(waFrom);
      return text(`🗑️ *${data.name}* eliminado.`);
    }
    if (isNo(lower)) {
      const company = await companiesService.getById(data.company_id!);
      if (company) {
        await sessionsService.set(waFrom, "business_submenu", {
          company_id: company.id,
          company_name: company.name,
        });
        return businessSubMenuMessage(company);
      }
      await sessionsService.reset(waFrom);
      return text("No se eliminó nada.");
    }
    return yesNo(`¿Eliminar *${data.name}*?`);
  }

  /* ── edit flow ────────────────────────────────────────────── */

  if (step === "product_pick_edit") {
    const products = await productsService.listForCompany(data.company_id!);
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1 || n > products.length) {
      return text(`Necesito el número del producto:\n\n${productListText(products)}`);
    }
    const chosen = products[n - 1];
    data.product_id = chosen.id;
    data.name = chosen.name;
    data.price = chosen.price;
    await sessionsService.set(waFrom, "product_pick_field", data);
    return text(`¿Qué quieres cambiar de *${chosen.name}*?\n\n${EDIT_FIELDS_MENU}`);
  }

  if (step === "product_pick_field") {
    const n = parseInt(raw, 10);
    const fieldMap: Record<number, string> = {
      1: "name",
      2: "price",
      3: "description",
      4: "category",
      5: "photo",
      6: "available",
    };
    const field = fieldMap[n];
    if (!field) {
      return text(`Elige una opción del 1 al 6:\n\n${EDIT_FIELDS_MENU}`);
    }

    if (field === "available") {
      const product = await productsService.getById(data.product_id!);
      if (!product) {
        await sessionsService.reset(waFrom);
        return text("No encontré el producto.");
      }
      const newAvail = !product.available;
      await productsService.update(data.product_id!, { available: newAvail });
      const label = newAvail ? "disponible ✅" : "no disponible ❌";
      const company = await companiesService.getById(data.company_id!);
      if (company) {
        await sessionsService.set(waFrom, "business_submenu", {
          company_id: company.id,
          company_name: company.name,
        });
        return completedWithSubMenu(`*${data.name}* ahora está *${label}*.`, company);
      }
      await sessionsService.reset(waFrom);
      return text(`*${data.name}* ahora está *${label}*.`);
    }

    data.edit_field = field;
    await sessionsService.set(waFrom, "product_edit_value", data);

    switch (field) {
      case "name":
        return text("Escribe el nuevo *nombre*:");
      case "price":
        return text("Escribe el nuevo *precio* (ejemplo: 45 o 45.50):");
      case "description":
        return text("Escribe la nueva *descripción* (o *omitir* para quitar):");
      case "category":
        return text("Escribe la nueva *categoría* (o *omitir* para quitar):");
      case "photo":
        return text("Manda la nueva *foto* o escribe *omitir* para quitar la actual:");
      default:
        return text("Escribe el nuevo valor:");
    }
  }

  if (step === "product_edit_value") {
    const field = data.edit_field!;

    const finishEdit = async (msg: string): Promise<OutboundMessage> => {
      const company = await companiesService.getById(data.company_id!);
      if (company) {
        await sessionsService.set(waFrom, "business_submenu", {
          company_id: company.id,
          company_name: company.name,
        });
        return completedWithSubMenu(msg, company);
      }
      await sessionsService.reset(waFrom);
      return text(msg);
    };

    if (field === "name") {
      if (!raw) return text("Necesito el nuevo nombre.");
      await productsService.update(data.product_id!, { name: raw });
      return finishEdit(`✅ Nombre actualizado a *${raw}*.`);
    }

    if (field === "price") {
      const price = parsePrice(raw);
      if (price === null) return text("No entendí el precio. Ejemplo: *45* o *45.50*");
      await productsService.update(data.product_id!, { price });
      return finishEdit(`✅ Precio actualizado a *${formatPrice(price)}*.`);
    }

    if (field === "description") {
      const val = isSkip(lower) ? null : raw || null;
      await productsService.update(data.product_id!, { description: val });
      return finishEdit(val ? `✅ Descripción actualizada.` : `✅ Descripción eliminada.`);
    }

    if (field === "category") {
      const val = isSkip(lower) ? null : raw || null;
      await productsService.update(data.product_id!, { category: val });
      return finishEdit(val ? `✅ Categoría actualizada a *${val}*.` : `✅ Categoría eliminada.`);
    }

    if (field === "photo") {
      if (isSkip(lower) || lower === "omitir") {
        await productsService.update(data.product_id!, { photo_url: null });
        return finishEdit("✅ Foto eliminada.");
      }

      const incoming = (media ?? []).filter((m) => m.contentType.startsWith("image/"));
      if (!incoming.length) {
        return text("Mándame una imagen o escribe *omitir* para quitar la foto actual.");
      }

      try {
        const url = await productPhotosService.uploadFromTwilio(
          data.company_id!,
          data.product_id!,
          incoming[0].url,
          incoming[0].contentType
        );
        await productsService.update(data.product_id!, { photo_url: url });
        return finishEdit("✅ Foto actualizada.");
      } catch (err) {
        console.error("[product.flow] edit photo failed:", (err as Error).message);
        await sessionsService.reset(waFrom);
        return text("No pude subir la foto. Intenta de nuevo.");
      }
    }

    await sessionsService.reset(waFrom);
    return text("Algo salió mal. Intenta de nuevo.");
  }

  /* ── fallback ─────────────────────────────────────────────── */
  await sessionsService.reset(waFrom);
  return text("Algo se enredó. Intenta de nuevo.");
}

export const productFlow = {
  handleIntent,
  step: stepHandler,
};
