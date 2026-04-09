import { supabase } from "./supabase";
import { env } from "../config/env";

const BUCKET = "product-photos";

function extFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export const productPhotosService = {
  async uploadFromTwilio(
    companyId: string,
    productId: string,
    twilioMediaUrl: string,
    contentType: string
  ): Promise<string> {
    const auth = Buffer.from(
      `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`
    ).toString("base64");

    const res = await fetch(twilioMediaUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) {
      throw new Error(`twilio media fetch failed: ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());

    const path = `${companyId}/${productId}/${Date.now()}.${extFor(contentType)}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: false });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },
};
