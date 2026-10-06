import { useEffect, useState } from "react";

import { categories as fallbackCategories } from "@/lib/products";
import { supabase } from "@/lib/supabase";

export type Category = {
  id: string;
  name: string;
  image?: string | null;
  sort_order: number;
  is_active: boolean;
};

/** Used until the `categories` table exists / responds, so the site never renders empty. */
export const defaultCategories: Category[] = fallbackCategories.map((c, i) => ({
  id: c.id,
  name: c.name,
  image: c.image,
  sort_order: i + 1,
  is_active: true,
}));

export const fetchCategories = async (): Promise<Category[] | null> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.warn("Could not fetch categories (using defaults):", error.message);
      return null;
    }
    return (data ?? []) as Category[];
  } catch (err) {
    console.warn("fetchCategories error:", err);
    return null;
  }
};

/**
 * Live categories from Supabase.
 * @param includeHidden admin needs hidden ones too; storefront only gets active ones.
 */
export function useLiveCategories({ includeHidden = false } = {}) {
  const [items, setItems] = useState<Category[]>(defaultCategories);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const load = async () => {
    const data = await fetchCategories();
    if (data === null) {
      setTableMissing(true);
      setItems(defaultCategories);
    } else {
      setTableMissing(false);
      setItems(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const chId = `live-categories-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(chId)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const categories = includeHidden ? items : items.filter((c) => c.is_active);
  return { categories, loading, tableMissing, reload: load };
}

/** Turns an Arabic/English name into a URL-safe id. Falls back to a random id. */
export const makeCategoryId = (name: string) => {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "cat-" + Date.now().toString(36);
};
