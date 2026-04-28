import { supabase } from "../../lib/supabase";

export type CompanyStatus = "OPEN" | "CLOSED";

export interface Company {
  id: string;
  folio: string;
  name: string;
  industry_id: string;
  location_text: string | null;
  location_lat: number | null;
  location_lng: number | null;
  business_phone: string | null;
  status: CompanyStatus;
  photo_urls: string[];
}

export const companiesService = {
  async hasCompanyForContact(contactId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from("company_contacts")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", contactId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async listForContact(contactId: string): Promise<Company[]> {
    const { data, error } = await supabase
      .from("company_contacts")
      .select("companies(*)")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as any[])
      .map((r) => r.companies)
      .filter(Boolean) as Company[];
  },

  async setStatus(companyId: string, status: CompanyStatus): Promise<void> {
    const { error } = await supabase
      .from("companies")
      .update({ status })
      .eq("id", companyId);
    if (error) throw error;
  },

  async createForContact(
    contactId: string,
    input: {
      name: string;
      industryId: string;
      locationText?: string | null;
      locationLat?: number | null;
      locationLng?: number | null;
      businessPhone?: string | null;
    }
  ): Promise<Company> {
    const { data: company, error: e1 } = await supabase
      .from("companies")
      .insert({
        name: input.name,
        industry_id: input.industryId,
        location_text: input.locationText ?? null,
        location_lat: input.locationLat ?? null,
        location_lng: input.locationLng ?? null,
        business_phone: input.businessPhone ?? null,
      })
      .select()
      .single();
    if (e1) throw e1;

    const { error: e2 } = await supabase
      .from("company_contacts")
      .insert({ contact_id: contactId, company_id: company.id, role: "OWNER" });
    if (e2) throw e2;

    return company as Company;
  },

  async getById(companyId: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();
    if (error) return null;
    return data as Company;
  },

  async update(
    companyId: string,
    fields: Partial<Pick<Company, "name" | "industry_id" | "location_text" | "location_lat" | "location_lng" | "business_phone" | "photo_urls">>
  ): Promise<Company> {
    const { data, error } = await supabase
      .from("companies")
      .update(fields)
      .eq("id", companyId)
      .select()
      .single();
    if (error) throw error;
    return data as Company;
  },

  async delete(companyId: string): Promise<void> {
    await supabase.from("products").delete().eq("company_id", companyId);
    await supabase.from("company_contacts").delete().eq("company_id", companyId);
    const { error } = await supabase.from("companies").delete().eq("id", companyId);
    if (error) throw error;
  },
};
