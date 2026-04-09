import { IntentDetector, IntentMatch } from "./types";

const PHRASES: string[] = [
  "eliminar producto",
  "borrar producto",
  "quitar producto",
  "quitar del menu",
  "eliminar platillo",
  "borrar platillo",
  "eliminar servicio",
  "borrar servicio",
];

export const deleteProductIntent: IntentDetector = {
  name: "delete_product",
  detect(t): IntentMatch | null {
    for (const p of PHRASES) {
      if (t.includes(p)) return { name: "delete_product", confidence: 0.9, matched: p };
    }
    return null;
  },
};
