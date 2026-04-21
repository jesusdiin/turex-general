import { contactsService, WaContact, phoneFromWaFrom } from "../../services/contacts.service";
import { industriesService, Industry } from "../../services/industries.service";
import { companiesService } from "../../services/companies.service";
import { sessionsService, WaSession } from "../../services/sessions.service";
import {
  normalizeAnswer,
  personalizeIntro,
  extractRegistrationFields,
  ExtractedFields,
} from "../../services/llm.service";
import { OutboundMessage } from "../../services/messages.service";
import { photosService } from "../../services/photos.service";
import { env } from "../../config/env";
import { businessSubMenuMessage, completedWithSubMenu, mainMenuMessage } from "./navigation";

type Step =
  | "pick_company_status"
  | "ask_name"
  | "ask_business"
  | "ask_category"
  | "confirm_category"
  | "pick_category"
  | "ask_location"
  | "ask_business_phone"
  | "ask_business_phone_value"
  | "confirm"
  | "ask_photos";

interface FlowData {
  display_name?: string;
  business_name?: string;
  industry_id?: string;
  industry_name?: string;
  location_text?: string | null;
  business_phone?: string | null;
  status?: "OPEN" | "CLOSED";
  company_ids?: string[];
  pending_company_id?: string;
  photo_count?: number;
}

const YES = ["si", "sí", "s", "yes", "y", "claro", "ok", "okay", "dale", "va"];
const NO = ["no", "n", "nop"];
const SKIP = ["omitir", "skip", "saltar", "ninguno", "ninguna"];

const isYes = (t: string) => YES.includes(t);
const isNo = (t: string) => NO.includes(t);
const isSkip = (t: string) => SKIP.includes(t);

const text = (body: string): OutboundMessage => ({ kind: "text", body });

function joinIntro(intro: string, body: string): string {
  return intro ? `${intro}\n\n${body}` : body;
}

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

function statusVerb(s: "OPEN" | "CLOSED"): string {
  return s === "OPEN" ? "abierto" : "cerrado";
}

function truncateTitle(name: string): string {
  return name.length > 20 ? `${name.slice(0, 19)}…` : name;
}

function pickCompanyFallbackText(
  companies: { name: string }[],
  status: "OPEN" | "CLOSED"
): string {
  const list = companies.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
  return `¿Qué negocio quieres marcar como *${statusVerb(status)}*? Responde con el *número*:\n\n${list}`;
}

export function pickCompanyMessage(
  companies: { id: string; name: string }[],
  status: "OPEN" | "CLOSED"
): OutboundMessage {
  const question = `¿Qué negocio quieres marcar como *${statusVerb(status)}*?`;
  const fallbackText = pickCompanyFallbackText(companies, status);

  if (companies.length === 2 && env.TWILIO_CONTENT_SID_PICK_COMPANY_2) {
    return {
      kind: "buttons",
      contentSid: env.TWILIO_CONTENT_SID_PICK_COMPANY_2,
      variables: {
        "1": question,
        "2": truncateTitle(companies[0].name),
        "3": truncateTitle(companies[1].name),
      },
      fallbackText,
    };
  }

  if (companies.length === 3 && env.TWILIO_CONTENT_SID_PICK_COMPANY_3) {
    return {
      kind: "buttons",
      contentSid: env.TWILIO_CONTENT_SID_PICK_COMPANY_3,
      variables: {
        "1": question,
        "2": truncateTitle(companies[0].name),
        "3": truncateTitle(companies[1].name),
        "4": truncateTitle(companies[2].name),
      },
      fallbackText,
    };
  }

  return { kind: "text", body: fallbackText };
}

function yesNoOther(question: string): OutboundMessage {
  if (env.TWILIO_CONTENT_SID_YES_NO_OTHER) {
    return {
      kind: "buttons",
      contentSid: env.TWILIO_CONTENT_SID_YES_NO_OTHER,
      variables: { "1": question },
      fallbackText: `${question}\n\nResponde *sí*, *no* u *otro*.`,
    };
  }
  return text(`${question}\n\nResponde *sí*, *no* u *otro*.`);
}

function summaryText(d: FlowData): string {
  return [
    "📋 *Revisa tus datos:*",
    `• Tu nombre: ${d.display_name}`,
    `• Negocio: ${d.business_name}`,
    `• Categoría: ${d.industry_name}`,
    `• Ubicación: ${d.location_text ?? "—"}`,
    `• Teléfono del negocio: ${d.business_phone ?? "—"}`,
    "",
    "¿Confirmas el registro?",
  ].join("\n");
}

async function listIndustriesText(): Promise<{ text: string; list: Industry[] }> {
  const list = await industriesService.list();
  const t = list.map((i, idx) => `${idx + 1}. ${i.name}`).join("\n");
  return { text: t, list };
}

// Textos canónicos (deterministas)
const COPY = {
  start:
    "👋 ¡Hola! Soy el bot de Turex y te voy a ayudar a registrar tu negocio en unos pasos sencillos.\n\nPuedes escribir *cancelar* en cualquier momento.\n\nPara empezar, ¿cómo te llamas?",
  ask_business: "Ahora dime, ¿cuál es el *nombre de tu negocio*?",
  ask_category:
    '¿A qué se dedica tu negocio? Por ejemplo: "vendo tacos", "tengo un hotel", "soy estilista".',
  ask_location:
    "¿Dónde se encuentra tu negocio? (colonia, calle o ciudad). Puedes responder *omitir* si prefieres.",
  ask_business_phone_value: "Escribe el número del negocio (ejemplo: +5215555555555).",
  invalid_phone:
    "Ese número no parece válido. Intenta de nuevo (ejemplo: +5215555555555).",
  cancel_done:
    "Listo, cancelé el registro. Cuando quieras empezar de nuevo, escríbeme *hola*.",
  flow_error: "Algo se enredó 😅. Empecemos de nuevo: escríbeme *hola*.",
};

function missingFields(data: FlowData): (keyof ExtractedFields)[] {
  const m: (keyof ExtractedFields)[] = [];
  if (!data.display_name) m.push("display_name");
  if (!data.business_name) m.push("business_name");
  if (!data.industry_id) m.push("industry_hint");
  if (data.location_text == null) m.push("location_text");
  if (data.business_phone == null) m.push("business_phone");
  return m;
}

async function applyExtracted(
  data: FlowData,
  extracted: ExtractedFields
): Promise<FlowData> {
  if (extracted.display_name && !data.display_name) {
    data.display_name = extracted.display_name;
  }
  if (extracted.business_name && !data.business_name) {
    data.business_name = extracted.business_name;
  }
  if (extracted.location_text && data.location_text == null) {
    data.location_text = extracted.location_text;
  }
  if (extracted.business_phone && data.business_phone == null) {
    // Validar formato mínimo antes de aceptar
    const phone = extracted.business_phone.replace(/\s+/g, "");
    if (/^\+?\d{6,}$/.test(phone)) {
      data.business_phone = phone.startsWith("+") ? phone : `+${phone}`;
    }
  }
  if (extracted.industry_hint && !data.industry_id) {
    const inferred = await industriesService.inferFromText(extracted.industry_hint);
    if (inferred) {
      data.industry_id = inferred.industry.id;
      data.industry_name = inferred.industry.name;
    }
  }
  return data;
}

function nextStepFor(data: FlowData): Step {
  if (!data.display_name) return "ask_name";
  if (!data.business_name) return "ask_business";
  if (!data.industry_id) return "ask_category";
  if (data.location_text === undefined) return "ask_location";
  if (data.business_phone === undefined) return "ask_business_phone";
  return "confirm";
}

function promptFor(step: Step, data: FlowData, waFrom: string): OutboundMessage {
  switch (step) {
    case "ask_name":
      return text("¿Cómo te llamas?");
    case "ask_business":
      return text(COPY.ask_business);
    case "ask_category":
      return text(COPY.ask_category);
    case "ask_location":
      return text(COPY.ask_location);
    case "ask_business_phone": {
      const myPhone = phoneFromWaFrom(waFrom);
      return yesNoOther(
        `El número desde el que escribes es *${myPhone}*. ¿Es también el número de contacto de tu negocio?`
      );
    }
    case "confirm":
      return yesNo(summaryText(data));
    default:
      return text(COPY.flow_error);
  }
}

export async function startRegistration(
  contact: WaContact
): Promise<OutboundMessage> {
  await sessionsService.set(contact.whatsapp_from, "ask_name", {
    display_name: contact.display_name ?? undefined,
  });
  return text(COPY.start);
}

export const registrationFlow = {
  /**
   * Procesa un paso del flujo. Persiste la sesión. Devuelve el OutboundMessage a enviar.
   */
  async step(
    contact: WaContact,
    session: WaSession | null,
    body: string,
    media?: { url: string; contentType: string }[]
  ): Promise<OutboundMessage> {
    const raw = (body ?? "").trim();
    const lower = raw.toLowerCase();
    const waFrom = contact.whatsapp_from;

    // Sin sesión → arrancar
    if (!session) {
      await sessionsService.set(waFrom, "ask_name", {});
      return text(COPY.start);
    }

    const step = session.step as Step;
    const data: FlowData = session.data ?? {};

    switch (step) {
      case "pick_company_status": {
        const status = data.status ?? "OPEN";
        const verb = statusVerb(status);
        const ids = data.company_ids ?? [];
        const n = parseInt(raw, 10);

        if (!ids.length || Number.isNaN(n) || n < 1 || n > ids.length) {
          const companies = await companiesService.listForContact(contact.id);
          await sessionsService.set(waFrom, "pick_company_status", {
            status,
            company_ids: companies.map((c) => c.id),
          });
          return pickCompanyMessage(companies, status);
        }

        const chosenId = ids[n - 1];
        const companies = await companiesService.listForContact(contact.id);
        const chosen = companies.find((c) => c.id === chosenId);
        if (!chosen) {
          await sessionsService.set(waFrom, "pick_company_status", {
            status,
            company_ids: companies.map((c) => c.id),
          });
          return pickCompanyMessage(companies, status);
        }
        await companiesService.setStatus(chosenId, status);
        const freshCompany = await companiesService.getById(chosenId);
        if (freshCompany) {
          await sessionsService.set(waFrom, "business_submenu", {
            company_id: freshCompany.id,
            company_name: freshCompany.name,
          });
          return completedWithSubMenu(`✅ *${chosen.name}* quedó marcado como *${verb}*.`, freshCompany);
        }
        await sessionsService.reset(waFrom);
        return text(`✅ *${chosen.name}* quedó marcado como *${verb}*.`);
      }

      case "ask_name": {
        if (!raw) return text("Necesito tu nombre para continuar 🙂. ¿Cómo te llamas?");

        const extracted = await extractRegistrationFields(raw, missingFields(data));
        await applyExtracted(data, extracted);

        // Si el extractor llenó display_name, ya no procesamos `raw` como nombre completo.
        // Si NO, caemos al modo clásico: tratar todo el texto como el nombre.
        if (!data.display_name) {
          data.display_name = await normalizeAnswer("person_name", raw);
        } else {
          data.display_name = await normalizeAnswer("person_name", data.display_name);
        }
        if (data.business_name) {
          data.business_name = await normalizeAnswer("business_name", data.business_name);
        }
        if (data.location_text) {
          data.location_text = await normalizeAnswer("location", data.location_text);
        }

        await contactsService.updateName(waFrom, data.display_name);

        const next = nextStepFor(data);
        await sessionsService.set(waFrom, next, data);

        const intro = await personalizeIntro("post_ask_name", { display_name: data.display_name });
        const greeting = intro || `¡Mucho gusto, *${data.display_name}*! 👋`;
        const prompt = promptFor(next, data, waFrom);
        if (prompt.kind === "text") {
          return text(joinIntro(greeting, prompt.body));
        }
        return prompt;
      }

      case "ask_business": {
        if (!raw) return text(COPY.ask_business);

        const extracted = await extractRegistrationFields(raw, missingFields(data));
        await applyExtracted(data, extracted);

        if (!data.business_name) {
          data.business_name = await normalizeAnswer("business_name", raw);
        } else {
          data.business_name = await normalizeAnswer("business_name", data.business_name);
        }
        if (data.location_text) {
          data.location_text = await normalizeAnswer("location", data.location_text);
        }

        const next = nextStepFor(data);
        await sessionsService.set(waFrom, next, data);
        return promptFor(next, data, waFrom);
      }

      case "ask_category": {
        const extracted = await extractRegistrationFields(raw, missingFields(data));
        await applyExtracted(data, extracted);
        if (data.location_text) {
          data.location_text = await normalizeAnswer("location", data.location_text);
        }

        // Si el extractor ya resolvió la industria via industry_hint, confirmamos.
        if (data.industry_id && data.industry_name) {
          await sessionsService.set(waFrom, "confirm_category", data);
          return yesNo(
            `Detecté que tu negocio es de *${data.industry_name}*. ¿Es correcto?`
          );
        }

        // Fallback clásico: inferir directo del raw.
        const inferred = await industriesService.inferFromText(raw);
        if (inferred) {
          data.industry_id = inferred.industry.id;
          data.industry_name = inferred.industry.name;
          await sessionsService.set(waFrom, "confirm_category", data);
          return yesNo(
            `Detecté que tu negocio es de *${inferred.industry.name}*. ¿Es correcto?`
          );
        }
        const { text: listText } = await listIndustriesText();
        await sessionsService.set(waFrom, "pick_category", data);
        return text(
          `No logré identificar la categoría. Elige una respondiendo con el *número*:\n\n${listText}`
        );
      }

      case "confirm_category": {
        if (isYes(lower)) {
          await sessionsService.set(waFrom, "ask_location", data);
          return text(COPY.ask_location);
        }
        if (isNo(lower)) {
          const { text: listText } = await listIndustriesText();
          await sessionsService.set(waFrom, "pick_category", data);
          return text(
            `Ok, elige la categoría correcta respondiendo con el *número*:\n\n${listText}`
          );
        }
        return yesNo("¿Confirmo la categoría que detecté?");
      }

      case "pick_category": {
        const { list } = await listIndustriesText();
        const n = parseInt(raw, 10);
        if (Number.isNaN(n) || n < 1 || n > list.length) {
          const { text: listText } = await listIndustriesText();
          return text(`Necesito el número de la opción. Intenta de nuevo:\n\n${listText}`);
        }
        const chosen = list[n - 1];
        data.industry_id = chosen.id;
        data.industry_name = chosen.name;
        await sessionsService.set(waFrom, "ask_location", data);
        return text(`Listo, *${chosen.name}* ✅\n\n${COPY.ask_location}`);
      }

      case "ask_location": {
        if (isSkip(lower) || !raw) {
          data.location_text = null;
        } else {
          const extracted = await extractRegistrationFields(raw, missingFields(data));
          await applyExtracted(data, extracted);
          if (data.location_text) {
            data.location_text = await normalizeAnswer("location", data.location_text);
          } else {
            data.location_text = await normalizeAnswer("location", raw);
          }
        }
        const next = nextStepFor(data);
        await sessionsService.set(waFrom, next, data);
        return promptFor(next, data, waFrom);
      }

      case "ask_business_phone": {
        if (isYes(lower)) {
          data.business_phone = phoneFromWaFrom(waFrom);
          await sessionsService.set(waFrom, "confirm", data);
          return yesNo(summaryText(data));
        }
        if (lower === "otro" || lower === "other") {
          await sessionsService.set(waFrom, "ask_business_phone_value", data);
          return text(COPY.ask_business_phone_value);
        }
        if (isNo(lower) || isSkip(lower)) {
          data.business_phone = null;
          await sessionsService.set(waFrom, "confirm", data);
          return yesNo(summaryText(data));
        }
        return yesNoOther("¿Es el mismo número?");
      }

      case "ask_business_phone_value": {
        const phone = raw.replace(/\s+/g, "");
        if (!/^\+?\d{6,}$/.test(phone)) {
          return text(COPY.invalid_phone);
        }
        data.business_phone = phone.startsWith("+") ? phone : `+${phone}`;
        await sessionsService.set(waFrom, "confirm", data);
        return yesNo(summaryText(data));
      }

      case "confirm": {
        if (isYes(lower)) {
          const company = await companiesService.createForContact(contact.id, {
            name: data.business_name!,
            industryId: data.industry_id!,
            locationText: data.location_text ?? null,
            businessPhone: data.business_phone ?? null,
          });
          await sessionsService.set(waFrom, "ask_photos", {
            ...data,
            pending_company_id: company.id,
            photo_count: 0,
          });
          return text(
            `🎉 ¡Listo, *${company.name}* quedó registrado!\n` +
              `Tu folio es *${company.folio}* — guárdalo para futuras consultas.\n\n` +
              `📸 ¿Quieres agregar fotos del negocio? Mándame hasta *${photosService.MAX_PHOTOS} imágenes* (jpg/png/webp).\n` +
              `Cuando termines escribe *listo*. Si no quieres agregar fotos, escribe *omitir*.`
          );
        }
        if (isNo(lower)) {
          await sessionsService.reset(waFrom);
          const companies = await companiesService.listForContact(contact.id);
          const menuMsg = mainMenuMessage(contact.display_name, companies);
          return { kind: "text", body: `Registro cancelado.\n\n${(menuMsg as any).body}` };
        }
        return yesNo("¿Confirmo el registro con estos datos?");
      }

      case "ask_photos": {
        const companyId = data.pending_company_id;
        if (!companyId) {
          await sessionsService.reset(waFrom);
          return text(COPY.flow_error);
        }

        if (lower === "listo" || lower === "omitir" || isSkip(lower)) {
          const count = data.photo_count ?? 0;
          const tail = count > 0
            ? `Guardé *${count}* foto(s). 👌`
            : "Sin fotos por ahora — puedes agregarlas más tarde.";
          const company = await companiesService.getById(data.pending_company_id!);
          if (company) {
            await sessionsService.set(waFrom, "business_submenu", {
              company_id: company.id,
              company_name: company.name,
            });
            return completedWithSubMenu(tail, company);
          }
          await sessionsService.reset(waFrom);
          return text(tail);
        }

        const incoming = (media ?? []).filter((m) =>
          m.contentType.startsWith("image/")
        );
        if (!incoming.length) {
          return text(
            `📸 Mándame imágenes del negocio (jpg/png/webp) o escribe *listo* / *omitir* para terminar.`
          );
        }

        const already = data.photo_count ?? 0;
        const slotsLeft = Math.max(0, photosService.MAX_PHOTOS - already);
        if (slotsLeft === 0) {
          const company = await companiesService.getById(companyId!);
          if (company) {
            await sessionsService.set(waFrom, "business_submenu", {
              company_id: company.id,
              company_name: company.name,
            });
            return completedWithSubMenu(
              `Ya tenías ${photosService.MAX_PHOTOS} fotos, ese es el máximo. Listo ✅`,
              company
            );
          }
          await sessionsService.reset(waFrom);
          return text(`Ya tenías ${photosService.MAX_PHOTOS} fotos, ese es el máximo. Listo ✅`);
        }

        const toUpload = incoming.slice(0, slotsLeft);
        const uploaded: string[] = [];
        for (let i = 0; i < toUpload.length; i++) {
          try {
            const url = await photosService.uploadFromTwilio(
              companyId,
              toUpload[i].url,
              toUpload[i].contentType,
              already + i
            );
            uploaded.push(url);
          } catch (err) {
            console.error("[ask_photos] upload failed:", (err as Error).message);
          }
        }

        if (uploaded.length) {
          try {
            await photosService.appendToCompany(companyId, uploaded);
          } catch (err) {
            console.error("[ask_photos] append failed:", (err as Error).message);
          }
        }

        const newCount = already + uploaded.length;
        data.photo_count = newCount;
        await sessionsService.set(waFrom, "ask_photos", data);

        if (newCount >= photosService.MAX_PHOTOS) {
          const company = await companiesService.getById(companyId!);
          if (company) {
            await sessionsService.set(waFrom, "business_submenu", {
              company_id: company.id,
              company_name: company.name,
            });
            return completedWithSubMenu(
              `Recibí ${uploaded.length} foto(s). Llegaste al máximo de ${photosService.MAX_PHOTOS} ✅`,
              company
            );
          }
          await sessionsService.reset(waFrom);
          return text(`Recibí ${uploaded.length} foto(s). Llegaste al máximo de ${photosService.MAX_PHOTOS} ✅`);
        }
        return text(
          `Recibí ${uploaded.length} foto(s) ✅. Llevas *${newCount}/${photosService.MAX_PHOTOS}*. ` +
            `Manda más o escribe *listo* para terminar.`
        );
      }

      default: {
        await sessionsService.reset(waFrom);
        return text(COPY.flow_error);
      }
    }
  },
};
