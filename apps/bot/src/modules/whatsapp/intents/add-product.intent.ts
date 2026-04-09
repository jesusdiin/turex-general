import { IntentDetector, IntentMatch } from "./types";

const PHRASES: string[] = [
  "agregar producto",
  "nuevo producto",
  "agregar al menu",
  "anadir producto",
  "agrega un producto",
  "quiero agregar",
  "nuevo platillo",
  "agregar platillo",
  "agregar servicio",
  "nuevo servicio",
];

export const addProductIntent: IntentDetector = {
  name: "add_product",
  detect(t): IntentMatch | null {
    for (const p of PHRASES) {
      if (t.includes(p)) return { name: "add_product", confidence: 0.9, matched: p };
    }
    return null;
  },
};
