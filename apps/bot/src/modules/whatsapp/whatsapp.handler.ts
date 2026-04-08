import { contactsService, phoneFromWaFrom } from "../../services/contacts.service";
import { companiesService } from "../../services/companies.service";
import { sessionsService } from "../../services/sessions.service";
import { registrationFlow } from "./registration.flow";

export interface IncomingMessage {
  from: string;
  body: string;
}

export async function handleIncomingMessage({
  from,
  body,
}: IncomingMessage): Promise<string> {
  const lower = (body ?? "").trim().toLowerCase();

  // Asegurar contacto
  const contact = await contactsService.upsert({
    waFrom: from,
    phone: phoneFromWaFrom(from),
  });

  // Comando global: cancelar
  if (lower === "cancelar") {
    await sessionsService.reset(from);
    return "Listo, cancelé lo que estábamos haciendo. Escribí *hola* cuando quieras empezar de nuevo.";
  }

  const session = await sessionsService.get(from);
  const hasCompany = await companiesService.hasCompanyForContact(contact.id);

  // Ya tiene negocio y no hay flujo activo
  if (hasCompany && !session) {
    return "Ya tenés tu negocio registrado 👋. Pronto vamos a sumar más opciones.";
  }

  return await registrationFlow.step(contact, session, body);
}
