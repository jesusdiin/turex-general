import { contactsService, WaContact, phoneFromWaFrom } from "../../services/contacts.service";
import { industriesService, Industry } from "../../services/industries.service";
import { companiesService } from "../../services/companies.service";
import { sessionsService, WaSession } from "../../services/sessions.service";
import { normalizeAnswer, personalizeIntro } from "../../services/llm.service";
import { OutboundMessage } from "../../services/messages.service";
import { env } from "../../config/env";

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

export const registrationFlow = {
  /**
   * Procesa un paso del flujo. Persiste la sesión. Devuelve el OutboundMessage a enviar.
   */
  async step(
    contact: WaContact,
    session: WaSession | null,
    body: string
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
      case "ask_name": {
        if (!raw) return text("Necesito tu nombre para continuar 🙂. ¿Cómo te llamas?");
        const clean = await normalizeAnswer("person_name", raw);
        data.display_name = clean;
        await contactsService.updateName(waFrom, clean);
        await sessionsService.set(waFrom, "ask_business", data);

        const intro = await personalizeIntro("post_ask_name", { display_name: clean });
        return text(joinIntro(intro || `¡Mucho gusto, *${clean}*! 👋`, COPY.ask_business));
      }

      case "ask_business": {
        if (!raw) return text(COPY.ask_business);
        const clean = await normalizeAnswer("business_name", raw);
        data.business_name = clean;
        await sessionsService.set(waFrom, "ask_category", data);
        return text(COPY.ask_category);
      }

      case "ask_category": {
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
          data.location_text = await normalizeAnswer("location", raw);
        }
        await sessionsService.set(waFrom, "ask_business_phone", data);
        const myPhone = phoneFromWaFrom(waFrom);
        return yesNoOther(
          `El número desde el que escribes es *${myPhone}*. ¿Es también el número de contacto de tu negocio?`
        );
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
          await companiesService.createForContact(contact.id, {
            name: data.business_name!,
            industryId: data.industry_id!,
            locationText: data.location_text ?? null,
            businessPhone: data.business_phone ?? null,
          });
          await sessionsService.reset(waFrom);
          return text(
            `🎉 ¡Listo, *${data.business_name}* quedó registrado!\nMuy pronto vas a poder activar herramientas para tu negocio. Escribe *hola* cuando quieras volver.`
          );
        }
        if (isNo(lower)) {
          await sessionsService.reset(waFrom);
          return text(COPY.cancel_done);
        }
        return yesNo("¿Confirmo el registro con estos datos?");
      }

      default: {
        await sessionsService.reset(waFrom);
        return text(COPY.flow_error);
      }
    }
  },
};
