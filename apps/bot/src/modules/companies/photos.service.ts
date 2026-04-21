import { supabase } from "../../lib/supabase";
import { env } from "../../config/env";

const BUCKET = "company-photos";
const MAX_PHOTOS = 5;

function extFor(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export const photosService = {
  MAX_PHOTOS,

  async uploadFromTwilio(
    companyId: string,
    twilioMediaUrl: string,
    contentType: string,
    index: number
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

    const path = `${companyId}/${Date.now()}_${index}.${extFor(contentType)}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: false });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  async appendToCompany(companyId: string, urls: string[]): Promise<void> {
    if (!urls.length) return;
    const { data, error } = await supabase
      .from("companies")
      .select("photo_urls")
      .eq("id", companyId)
      .single();
    if (error) throw error;

    const current: string[] = data?.photo_urls ?? [];
    const merged = [...current, ...urls].slice(0, MAX_PHOTOS);

    const { error: upErr } = await supabase
      .from("companies")
      .update({ photo_urls: merged })
      .eq("id", companyId);
    if (upErr) throw upErr;
  },
};
