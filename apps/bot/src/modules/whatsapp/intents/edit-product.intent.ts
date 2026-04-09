import { IntentDetector, IntentMatch } from "./types";

const PHRASES: string[] = [
  "editar producto",
  "cambiar precio",
  "modificar producto",
  "actualizar producto",
  "cambiar producto",
  "editar platillo",
  "modificar platillo",
  "editar servicio",
  "cambiar servicio",
];

export const editProductIntent: IntentDetector = {
  name: "edit_product",
  detect(t): IntentMatch | null {
    for (const p of PHRASES) {
      if (t.includes(p)) return { name: "edit_product", confidence: 0.9, matched: p };
    }
    return null;
  },
};
