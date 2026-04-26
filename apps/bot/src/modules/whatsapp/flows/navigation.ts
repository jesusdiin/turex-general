import { Company } from "../../companies/companies.service";
import { OutboundMessage } from "../../messaging/messages.service";

const text = (body: string): OutboundMessage => ({ kind: "text", body });

export function mainMenuMessage(
  displayName: string | null,
  companies: Company[]
): OutboundMessage {
  const greeting = displayName ? `👋 ¡Hola, *${displayName}*!` : "👋 ¡Hola!";

  if (!companies.length) {
    return text(
      [
        greeting,
        "",
        "Soy el bot de Turex. Te ayudo a gestionar tu negocio.",
        "",
        "Escribe *nuevo negocio* para registrar el tuyo, o *hola* para empezar.",
      ].join("\n")
    );
  }

  const list = companies
    .map((c, i) => {
      const icon = c.status === "OPEN" ? "✅" : "❌";
      return `*${i + 1}.* ${c.name} — ${icon}`;
    })
    .join("\n");

  const newN = companies.length + 1;

  return text(
    [
      greeting,
      "",
      "🏪 *Tus negocios:*",
      list,
      `*${newN}.* Registrar nuevo negocio`,
      "",
      "Escribe el *número* o el *nombre* de tu negocio.",
    ].join("\n")
  );
}

function subMenuBody(company: Company): string {
  const statusIcon = company.status === "OPEN" ? "✅ Abierto" : "❌ Cerrado";
  return [
    `🏪 *${company.name}*`,
    `Estado: ${statusIcon}`,
    "",
    "[1] Abrir / Cerrar",
    "[2] Ver productos",
    "[3] Agregar producto",
    "[4] Editar negocio",
    "[5] Eliminar negocio",
    "[0] ← Menú principal",
  ].join("\n");
}

export function businessSubMenuMessage(company: Company): OutboundMessage {
  return text(subMenuBody(company));
}

export function completedWithSubMenu(successText: string, company: Company): OutboundMessage {
  return text(`${successText}\n\n${subMenuBody(company)}`);
}
