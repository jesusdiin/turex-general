import { supabase } from "../../lib/supabase";

export interface Product {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  photo_url: string | null;
  available: boolean;
  sort_order: number;
}

export const productsService = {
  async listForCompany(companyId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("company_id", companyId)
      .order("category", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Product[];
  },

  async getById(productId: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();
    if (error) throw error;
    return (data as Product) ?? null;
  },

  async create(input: {
    companyId: string;
    name: string;
    price: number;
    description?: string | null;
    category?: string | null;
    photoUrl?: string | null;
  }): Promise<Product> {
    const { data, error } = await supabase
      .from("products")
      .insert({
        company_id: input.companyId,
        name: input.name,
        price: input.price,
        description: input.description ?? null,
        category: input.category ?? null,
        photo_url: input.photoUrl ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Product;
  },

  async update(
    productId: string,
    fields: Partial<Pick<Product, "name" | "description" | "price" | "category" | "photo_url" | "available">>
  ): Promise<Product> {
    const { data, error } = await supabase
      .from("products")
      .update(fields)
      .eq("id", productId)
      .select()
      .single();
    if (error) throw error;
    return data as Product;
  },

  async remove(productId: string): Promise<void> {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);
    if (error) throw error;
  },

  async countForCompany(companyId: string): Promise<number> {
    const { count, error } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);
    if (error) throw error;
    return count ?? 0;
  },

  async categoriesForCompany(companyId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("products")
      .select("category")
      .eq("company_id", companyId)
      .not("category", "is", null);
    if (error) throw error;
    const unique = [...new Set((data ?? []).map((r: { category: string }) => r.category))];
    return unique.sort();
  },
};
