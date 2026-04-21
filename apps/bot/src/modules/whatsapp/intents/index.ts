import { closeBusinessIntent } from "./close-business.intent";
import { openBusinessIntent } from "./open-business.intent";
import { newBusinessIntent } from "./new-business.intent";
import { addProductIntent } from "./add-product.intent";
import { listProductsIntent } from "./list-products.intent";
import { deleteProductIntent } from "./delete-product.intent";
import { editProductIntent } from "./edit-product.intent";
import { menuIntent } from "./menu.intent";
import { normalize } from "./normalize";
import { IntentDetector, IntentMatch } from "./types";

const DETECTORS: IntentDetector[] = [
  menuIntent,
  closeBusinessIntent,
  openBusinessIntent,
  newBusinessIntent,
  addProductIntent,
  listProductsIntent,
  deleteProductIntent,
  editProductIntent,
];

export function detectIntent(text: string): IntentMatch | null {
  const t = normalize(text);
  if (!t) return null;
  for (const d of DETECTORS) {
    const m = d.detect(t);
    if (m) return m;
  }
  return null;
}

export type { IntentMatch, IntentName, IntentDetector } from "./types";
