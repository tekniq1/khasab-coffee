-- ========================================================
-- Dynamic store categories (الأقسام الديناميكية)
-- Each row = one horizontal section on the home page.
-- products.category stores categories.id (text slug).
-- ========================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,                -- slug used in products.category and /products?cat=
  name TEXT NOT NULL,                 -- section title shown on the home page
  image TEXT,                         -- optional section image (admin / menus)
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
DROP POLICY IF EXISTS "Admin Full Categories" ON public.categories;

CREATE POLICY "Public Read Categories" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Admin Full Categories" ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed the 4 existing categories so current products keep working
INSERT INTO public.categories (id, name, sort_order) VALUES
  ('coffee', 'محاصيل القهوة المختصة', 1),
  ('tools',  'أدوات وإكسسوارات الباريستا', 2),
  ('matcha', 'ماتشا', 3),
  ('green',  'محاصيل البن الخضراء', 4)
ON CONFLICT (id) DO NOTHING;

-- Realtime updates for the storefront
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
