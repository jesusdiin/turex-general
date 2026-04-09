import { supabase } from "./supabase";

export type CompanyStatus = "OPEN" | "CLOSED";

export interface Company {
  id: string;
  folio: string;
  name: string;
  industry_id: string;
  location_text: string | null;
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
    return ((data ?? [])
      .map((r: { companies: Company | null }) => r.companies)
      .filter(Boolean) as Company[]);
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
      businessPhone?: string | null;
    }
  ): Promise<Company> {
    const { data: company, error: e1 } = await supabase
      .from("companies")
      .insert({
        name: input.name,
        industry_id: input.industryId,
        location_text: input.locationText ?? null,
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
};
