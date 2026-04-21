import { WaContact } from "../../services/contacts.service";
import { companiesService, Company } from "../../services/companies.service";
import { industriesService } from "../../services/industries.service";
import { sessionsService, WaSession } from "../../services/sessions.service";
import { normalizeAnswer } from "../../services/llm.service";
import { photosService } from "../../services/photos.service";
import { OutboundMessage } from "../../services/messages.service";
import { businessSubMenuMessage, completedWithSubMenu, mainMenuMessage } from "./navigation";
import { phoneFromWaFrom } from "../../services/contacts.service";

const text = (body: string): OutboundMessage => ({ kind: "text", body });

const YES = ["si", "sí", "s", "yes", "y", "claro", "ok", "okay", "dale", "va"];
const NO = ["no", "n", "nop"];
const SKIP = ["omitir", "skip", "saltar"];

const isYes = (t: string) => YES.includes(t);
const isNo = (t: string) => NO.includes(t);
const isSkip = (t: string) => SKIP.includes(t);

interface BusinessEditData {
  company_id: string;
  company_name: string;
  edit_field?: "name" | "category" | "location" | "phone" | "photos";
  industry_id?: string;
  industry_name?: string;
  photo_count?: number;
}

const PICK_FIELD_MENU = [
  "¿Qué quieres editar?",
  "",
  "[1] Nombre",
  "[2] Categoría",
  "[3] Ubicación",
  "[4] Teléfono de contacto",
  "[5] Fotos",
  "[0] ← Volver",
].join("\n");

async function listIndustriesText() {
  const list = await industriesService.list();
  const t = list.map((i, idx) => `${idx + 1}. ${i.name}`).join("\n");
  return { text: t, list };
}

async function goToSubMenu(
  waFrom: string,
  companyId: string,
  successText: string
): Promise<OutboundMessage> {
  const company = await companiesService.getById(companyId);
  if (!company) {
    await sessionsService.reset(waFrom);
    return text("✅ Actualizado.");
  }
  await sessionsService.set(waFrom, "business_submenu", {
    company_id: company.id,
    company_name: company.name,
  });
  return completedWithSubMenu(successText, company);
}

export const businessEditFlow = {
  startEdit(company: Company): OutboundMessage {
    return text(`✏️ *Editar ${company.name}*\n\n${PICK_FIELD_MENU}`);
  },

  startDelete(company: Company): OutboundMessage {
    return text(
      `⚠️ ¿Seguro que quieres eliminar *${company.name}*?\n\n` +
        `Esto borrará también todos sus productos y fotos. Esta acción *no se puede deshacer*.\n\n` +
        `Escribe el nombre exacto del negocio para confirmar, o *cancelar* para no hacer nada.`
    );
  },

  async step(
    contact: WaContact,
    session: WaSession,
    body: string,
    media?: { url: string; contentType: string }[]
  ): Promise<OutboundMessage> {
    const raw = (body ?? "").trim();
    const lower = raw.toLowerCase();
    const waFrom = contact.whatsapp_from;
    const step = session.step;
    const data: BusinessEditData = session.data as BusinessEditData;
    const { company_id, company_name } = data;

    /* ── pick field ──────────────────────────────────────────── */

    if (step === "business_edit_pick_field") {
      if (lower === "0") {
        return goToSubMenu(waFrom, company_id, "");
      }

      const n = parseInt(raw, 10);
      if (n === 1) {
        await sessionsService.set(waFrom, "business_edit_name", data);
        return text(`¿Cuál será el nuevo nombre del negocio?`);
      }
      if (n === 2) {
        await sessionsService.set(waFrom, "business_edit_category", data);
        return text(
          `¿A qué se dedica tu negocio? Por ejemplo: "restaurante", "hotel", "estilista".`
        );
      }
      if (n === 3) {
        await sessionsService.set(waFrom, "business_edit_location", data);
        return text(
          `¿Cuál es la nueva ubicación? Puedes escribir *omitir* para dejarla en blanco.`
        );
      }
      if (n === 4) {
        await sessionsService.set(waFrom, "business_edit_phone", data);
        const myPhone = phoneFromWaFrom(waFrom);
        return text(
          `¿Cuál es el nuevo teléfono del negocio?\n\n` +
            `Tu número actual es *${myPhone}*. Escríbelo o *omitir* para dejarlo en blanco.`
        );
      }
      if (n === 5) {
        await sessionsService.set(waFrom, "business_edit_photos", {
          ...data,
          photo_count: 0,
        });
        return text(
          `📸 Mándame las nuevas fotos (jpg/png/webp, máximo ${photosService.MAX_PHOTOS}).\n` +
            `Reemplazarán las fotos actuales. Escribe *listo* cuando termines o *omitir* para no cambiar nada.`
        );
      }
      return text(PICK_FIELD_MENU);
    }

    /* ── edit name ───────────────────────────────────────────── */

    if (step === "business_edit_name") {
      if (!raw) return text("Escribe el nuevo nombre del negocio.");
      const newName = await normalizeAnswer("business_name", raw);
      await companiesService.update(company_id, { name: newName });
      return goToSubMenu(
        waFrom,
        company_id,
        `✅ Nombre actualizado a *${newName}*.`
      );
    }

    /* ── edit category ───────────────────────────────────────── */

    if (step === "business_edit_category") {
      const inferred = await industriesService.inferFromText(raw);
      if (inferred) {
        data.industry_id = inferred.industry.id;
        data.industry_name = inferred.industry.name;
        await sessionsService.set(waFrom, "business_edit_confirm_category", data);
        return text(
          `Detecté *${inferred.industry.name}*. ¿Es correcto? Escribe *sí* o *no*.`
        );
      }
      const { text: listText } = await listIndustriesText();
      await sessionsService.set(waFrom, "business_edit_pick_category", data);
      return text(
        `No logré identificar la categoría. Elige una con el *número*:\n\n${listText}`
      );
    }

    if (step === "business_edit_confirm_category") {
      if (isYes(lower)) {
        await companiesService.update(company_id, { industry_id: data.industry_id! });
        return goToSubMenu(
          waFrom,
          company_id,
          `✅ Categoría actualizada a *${data.industry_name}*.`
        );
      }
      if (isNo(lower)) {
        const { text: listText } = await listIndustriesText();
        await sessionsService.set(waFrom, "business_edit_pick_category", data);
        return text(`Ok, elige la categoría:\n\n${listText}`);
      }
      return text("Escribe *sí* o *no*.");
    }

    if (step === "business_edit_pick_category") {
      const { list } = await listIndustriesText();
      const n = parseInt(raw, 10);
      if (Number.isNaN(n) || n < 1 || n > list.length) {
        const { text: listText } = await listIndustriesText();
        return text(`Necesito el número de la opción:\n\n${listText}`);
      }
      const chosen = list[n - 1];
      await companiesService.update(company_id, { industry_id: chosen.id });
      return goToSubMenu(
        waFrom,
        company_id,
        `✅ Categoría actualizada a *${chosen.name}*.`
      );
    }

    /* ── edit location ───────────────────────────────────────── */

    if (step === "business_edit_location") {
      let location: string | null;
      if (isSkip(lower) || !raw) {
        location = null;
      } else {
        location = await normalizeAnswer("location", raw);
      }
      await companiesService.update(company_id, { location_text: location });
      const msg = location
        ? `✅ Ubicación actualizada a *${location}*.`
        : "✅ Ubicación eliminada.";
      return goToSubMenu(waFrom, company_id, msg);
    }

    /* ── edit phone ──────────────────────────────────────────── */

    if (step === "business_edit_phone") {
      if (isSkip(lower) || !raw) {
        await companiesService.update(company_id, { business_phone: null });
        return goToSubMenu(waFrom, company_id, "✅ Teléfono eliminado.");
      }
      const phone = raw.replace(/\s+/g, "");
      if (!/^\+?\d{6,}$/.test(phone)) {
        return text(
          "Ese número no parece válido. Intenta de nuevo (ejemplo: +5215555555555) o escribe *omitir*."
        );
      }
      const formatted = phone.startsWith("+") ? phone : `+${phone}`;
      await companiesService.update(company_id, { business_phone: formatted });
      return goToSubMenu(waFrom, company_id, `✅ Teléfono actualizado a *${formatted}*.`);
    }

    /* ── edit photos ─────────────────────────────────────────── */

    if (step === "business_edit_photos") {
      if (lower === "listo" || lower === "omitir" || isSkip(lower)) {
        const count = data.photo_count ?? 0;
        const msg =
          count > 0
            ? `✅ ${count} foto(s) guardadas.`
            : "Sin cambios en las fotos.";
        return goToSubMenu(waFrom, company_id, msg);
      }

      const incoming = (media ?? []).filter((m) => m.contentType.startsWith("image/"));
      if (!incoming.length) {
        return text(
          `📸 Mándame imágenes o escribe *listo* para terminar.`
        );
      }

      const already = data.photo_count ?? 0;
      const slotsLeft = Math.max(0, photosService.MAX_PHOTOS - already);
      if (slotsLeft === 0) {
        return goToSubMenu(waFrom, company_id, `✅ ${photosService.MAX_PHOTOS} fotos guardadas.`);
      }

      const toUpload = incoming.slice(0, slotsLeft);
      const uploaded: string[] = [];
      for (let i = 0; i < toUpload.length; i++) {
        try {
          const url = await photosService.uploadFromTwilio(
            company_id,
            toUpload[i].url,
            toUpload[i].contentType,
            already + i
          );
          uploaded.push(url);
        } catch (err) {
          console.error("[business-edit] photo upload failed:", (err as Error).message);
        }
      }

      if (uploaded.length) {
        if (already === 0) {
          // Primer lote: reemplazar fotos existentes
          await companiesService.update(company_id, { photo_urls: uploaded });
        } else {
          await photosService.appendToCompany(company_id, uploaded);
        }
      }

      const newCount = already + uploaded.length;
      data.photo_count = newCount;
      await sessionsService.set(waFrom, "business_edit_photos", data);

      if (newCount >= photosService.MAX_PHOTOS) {
        return goToSubMenu(
          waFrom,
          company_id,
          `✅ ${newCount} foto(s) guardadas. Máximo alcanzado.`
        );
      }
      return text(
        `Recibí ${uploaded.length} foto(s) ✅. Llevas *${newCount}/${photosService.MAX_PHOTOS}*.\n` +
          `Manda más o escribe *listo* para terminar.`
      );
    }

    /* ── confirm delete ──────────────────────────────────────── */

    if (step === "business_edit_confirm_delete") {
      if (lower === company_name.toLowerCase() || raw === company_name) {
        await companiesService.delete(company_id);
        await sessionsService.reset(waFrom);
        const companies = await companiesService.listForContact(contact.id);
        const mainMsg = mainMenuMessage(contact.display_name, companies);
        // mainMenuMessage always returns kind:"text"
        return { kind: "text", body: `🗑️ *${company_name}* eliminado.\n\n${(mainMsg as any).body}` };
      }
      return text(
        `El nombre no coincide. Escribe exactamente *${company_name}* para confirmar, o *cancelar* para no hacer nada.`
      );
    }

    /* ── fallback ────────────────────────────────────────────── */
    await sessionsService.reset(waFrom);
    return text("Algo se enredó. Escribe *menú* para empezar de nuevo.");
  },
};
