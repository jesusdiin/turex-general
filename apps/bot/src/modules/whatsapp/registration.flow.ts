import { contactsService, WaContact, phoneFromWaFrom } from "../../services/contacts.service";
import { industriesService, Industry } from "../../services/industries.service";
import { companiesService } from "../../services/companies.service";
import { sessionsService, WaSession } from "../../services/sessions.service";

type Step =
  | "ask_name"
  | "ask_business"
  | "ask_category"
  | "confirm_category"
  | "pick_category"
  | "ask_location"
  | "ask_business_phone"
  | "ask_business_phone_value"
  | "confirm";

interface FlowData {
  display_name?: string;
  business_name?: string;
  industry_id?: string;
  industry_name?: string;
  location_text?: string | null;
  business_phone?: string | null;
}

const YES = ["si", "sí", "s", "yes", "y", "dale", "ok", "okay", "claro"];
const NO = ["no", "n", "nope"];
const SKIP = ["omitir", "skip", "saltar", "no", "ninguno", "ninguna"];

const isYes = (t: string) => YES.includes(t);
const isNo = (t: string) => NO.includes(t);
const isSkip = (t: string) => SKIP.includes(t);

async function summary(d: FlowData): Promise<string> {
  return [
    "📋 *Resumen de tu registro:*",
    `• Tu nombre: ${d.display_name}`,
    `• Negocio: ${d.business_name}`,
    `• Categoría: ${d.industry_name}`,
    `• Ubicación: ${d.location_text ?? "—"}`,
    `• Tel. del negocio: ${d.business_phone ?? "—"}`,
    "",
    "¿Está todo bien? Respondé *sí* para confirmar o *no* para cancelar.",
  ].join("\n");
}

async function listIndustriesText(): Promise<{ text: string; list: Industry[] }> {
  const list = await industriesService.list();
  const text = list.map((i, idx) => `${idx + 1}. ${i.name}`).join("\n");
  return { text, list };
}

export const registrationFlow = {
  /**
   * Devuelve la respuesta para el usuario. Persiste la sesión.
   */
  async step(contact: WaContact, session: WaSession | null, body: string): Promise<string> {
    const text = body.trim();
    const lower = text.toLowerCase();
    const waFrom = contact.whatsapp_from;

    // Sin sesión → arrancar
    if (!session) {
      await sessionsService.set(waFrom, "ask_name", {});
      return "👋 ¡Hola! Soy el bot de Turex y voy a ayudarte a registrar tu negocio en unos pasos.\n\nPodés escribir *cancelar* en cualquier momento.\n\nPara empezar: ¿*cómo te llamás*?";
    }

    const step = session.step as Step;
    const data: FlowData = session.data ?? {};

    switch (step) {
      case "ask_name": {
        if (!text) return "Necesito tu nombre para continuar 🙂. ¿Cómo te llamás?";
        data.display_name = text;
        await contactsService.updateName(waFrom, text);
        await sessionsService.set(waFrom, "ask_business", data);
        return `Un gusto, *${text}* 👋\n\n¿*Cómo se llama tu negocio*?`;
      }

      case "ask_business": {
        if (!text) return "¿Cuál es el nombre de tu negocio?";
        data.business_name = text;
        await sessionsService.set(waFrom, "ask_category", data);
        return "Genial. Ahora contame brevemente *qué vendés o qué hacés* (ej: \"vendo tacos\", \"tengo un hotel\", \"hago peluquería\").";
      }

      case "ask_category": {
        const inferred = await industriesService.inferFromText(text);
        if (inferred) {
          data.industry_id = inferred.industry.id;
          data.industry_name = inferred.industry.name;
          await sessionsService.set(waFrom, "confirm_category", data);
          return `Entendí 👀 — parece que tu negocio es de *${inferred.industry.name}*.\n\n¿Lo registro así? (*sí* / *no*)`;
        }
        const { text: listText } = await listIndustriesText();
        await sessionsService.set(waFrom, "pick_category", data);
        return `No estoy seguro de la categoría. Elegí una respondiendo con el *número*:\n\n${listText}`;
      }

      case "confirm_category": {
        if (isYes(lower)) {
          await sessionsService.set(waFrom, "ask_location", data);
          return "Perfecto ✅\n\n¿*Dónde está tu negocio*? (barrio, calle o ciudad). Podés responder *omitir*.";
        }
        if (isNo(lower)) {
          const { text: listText } = await listIndustriesText();
          await sessionsService.set(waFrom, "pick_category", data);
          return `Ok, elegí la categoría correcta respondiendo con el *número*:\n\n${listText}`;
        }
        return "Respondé *sí* o *no* para confirmar la categoría.";
      }

      case "pick_category": {
        const { list } = await listIndustriesText();
        const n = parseInt(text, 10);
        if (Number.isNaN(n) || n < 1 || n > list.length) {
          const { text: listText } = await listIndustriesText();
          return `Necesito el número de la opción. Probá de nuevo:\n\n${listText}`;
        }
        const chosen = list[n - 1];
        data.industry_id = chosen.id;
        data.industry_name = chosen.name;
        await sessionsService.set(waFrom, "ask_location", data);
        return `Listo, *${chosen.name}* ✅\n\n¿*Dónde está tu negocio*? Podés responder *omitir*.`;
      }

      case "ask_location": {
        data.location_text = isSkip(lower) || !text ? null : text;
        await sessionsService.set(waFrom, "ask_business_phone", data);
        const myPhone = phoneFromWaFrom(waFrom);
        return `El número desde el que escribís (*${myPhone}*) ¿es también el del negocio?\n\nRespondé *sí*, *no* (no hay otro) u *otro* si querés darme un número distinto.`;
      }

      case "ask_business_phone": {
        if (isYes(lower)) {
          data.business_phone = phoneFromWaFrom(waFrom);
          await sessionsService.set(waFrom, "confirm", data);
          return await summary(data);
        }
        if (lower === "otro") {
          await sessionsService.set(waFrom, "ask_business_phone_value", data);
          return "Decime el número del negocio (ej: +5491100000000).";
        }
        if (isNo(lower) || isSkip(lower)) {
          data.business_phone = null;
          await sessionsService.set(waFrom, "confirm", data);
          return await summary(data);
        }
        return "Respondé *sí*, *no* u *otro*.";
      }

      case "ask_business_phone_value": {
        const phone = text.replace(/\s+/g, "");
        if (!/^\+?\d{6,}$/.test(phone)) {
          return "No me parece un número válido. Probá de nuevo (ej: +5491100000000).";
        }
        data.business_phone = phone.startsWith("+") ? phone : `+${phone}`;
        await sessionsService.set(waFrom, "confirm", data);
        return await summary(data);
      }

      case "confirm": {
        if (isYes(lower)) {
          await companiesService.createForContact(contact.id, {
            name: data.business_name!,
            industryId: data.industry_id!,
            locationText: data.location_text ?? null,
            businessPhone: data.business_phone ?? null,
          });
          await sessionsService.reset(waFrom);
          return `🎉 ¡Listo, *${data.business_name}* quedó registrado!\n\nMuy pronto vas a poder activar herramientas para tu negocio. Escribí *hola* cuando quieras volver.`;
        }
        if (isNo(lower)) {
          await sessionsService.reset(waFrom);
          return "Ok, cancelé el registro. Cuando quieras volver a empezar escribime *hola*.";
        }
        return "Respondé *sí* para confirmar o *no* para cancelar.";
      }

      default: {
        // Estado desconocido → reiniciar
        await sessionsService.reset(waFrom);
        return "Algo se enredó 😅. Empecemos de nuevo: escribime *hola*.";
      }
    }
  },
};
