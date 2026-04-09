import { IntentDetector, IntentMatch } from "./types";

const PHRASES: string[] = [
  "ver menu",
  "mi menu",
  "mis productos",
  "ver productos",
  "mostrar menu",
  "lista de productos",
  "lista productos",
  "ver mis productos",
  "que vendo",
];

export const listProductsIntent: IntentDetector = {
  name: "list_products",
  detect(t): IntentMatch | null {
    for (const p of PHRASES) {
      if (t.includes(p)) return { name: "list_products", confidence: 0.9, matched: p };
    }
    return null;
  },
};
