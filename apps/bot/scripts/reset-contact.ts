/**
 * Borra toda la data asociada a un número de WhatsApp.
 * Solo para desarrollo.
 *
 * Uso:
 *   npm run reset-contact -- +5215555555555
 *   npm run reset-contact -- whatsapp:+5215555555555
 */
import { supabase } from "../src/services/supabase";

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("❌ Falta el número. Uso: npm run reset-contact -- +5215555555555");
    process.exit(1);
  }

  const waFrom = arg.startsWith("whatsapp:") ? arg : `whatsapp:${arg}`;
  console.log(`🔎 Buscando data para ${waFrom}...`);

  // 1. wa_sessions (no depende del contacto)
  const { error: e1, count: sessionsDeleted } = await supabase
    .from("wa_sessions")
    .delete({ count: "exact" })
    .eq("wa_from", waFrom);
  if (e1) throw e1;
  console.log(`  • wa_sessions eliminadas: ${sessionsDeleted ?? 0}`);

  // 2. Buscar contacto
  const { data: contact, error: e2 } = await supabase
    .from("wa_contacts")
    .select("id")
    .eq("whatsapp_from", waFrom)
    .maybeSingle();
  if (e2) throw e2;

  if (!contact) {
    console.log("ℹ️  No hay contacto registrado. Listo.");
    return;
  }

  // 3. Buscar companies vinculadas a este contacto
  const { data: links, error: e3 } = await supabase
    .from("company_contacts")
    .select("company_id")
    .eq("contact_id", contact.id);
  if (e3) throw e3;

  const companyIds = (links ?? []).map((l) => l.company_id);
  console.log(`  • companies vinculadas: ${companyIds.length}`);

  if (companyIds.length > 0) {
    // 4. Borrar las companies (cascade tira company_contacts y company_tools)
    const { error: e4, count: companiesDeleted } = await supabase
      .from("companies")
      .delete({ count: "exact" })
      .in("id", companyIds);
    if (e4) throw e4;
    console.log(`  • companies eliminadas: ${companiesDeleted ?? 0}`);
  }

  // 5. Borrar el contacto (cascade tira cualquier company_contact residual)
  const { error: e5 } = await supabase.from("wa_contacts").delete().eq("id", contact.id);
  if (e5) throw e5;
  console.log(`  • wa_contact eliminado: 1`);

  console.log("✅ Listo.");
}

main().catch((err) => {
  console.error("💥 Error:", err);
  process.exit(1);
});
