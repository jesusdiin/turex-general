import { normalize } from "./normalize";
import type { Company } from "../../companies/companies.service";

export function resolveSubMenuOption(input: string): number | null {
  const t = normalize(input);
  const n = parseInt(t, 10);
  if (!isNaN(n) && n >= 0 && n <= 5) return n;

  if (["volver", "regresar", "atras", "salir"].some((p) => t.includes(p))) return 0;
  if (["abrir", "cerrar", "abierto", "cerrado", "estado"].some((p) => t.includes(p))) return 1;
  if (
    [
      "ver producto",
      "mis producto",
      "ver menu",
      "mi menu",
      "que vendo",
      "catalogo",
      "lista",
      "mostrar",
      "ver platillo",
    ].some((p) => t.includes(p))
  )
    return 2;
  if (
    [
      "agregar producto",
      "nuevo producto",
      "anadir producto",
      "agregar platillo",
      "nuevo platillo",
      "anadir",
    ].some((p) => t.includes(p))
  )
    return 3;
  if (
    [
      "editar negocio",
      "modificar negocio",
      "cambiar negocio",
      "editar nombre",
      "editar datos",
      "actualizar",
    ].some((p) => t.includes(p))
  )
    return 4;
  if (["eliminar negocio", "borrar negocio", "quitar negocio"].some((p) => t.includes(p)))
    return 5;

  return null;
}

export function resolveMainMenuOption(input: string, companies: Company[]): number | null {
  const t = normalize(input);
  if (["registrar", "nuevo negocio", "nueva", "agregar negocio"].some((p) => t.includes(p))) {
    return companies.length + 1;
  }
  const matches = companies
    .map((c, i) => ({ i: i + 1, name: normalize(c.name) }))
    .filter(({ name }) => name.length > 2 && (t.includes(name) || name.includes(t)));
  return matches.length === 1 ? matches[0].i : null;
}
