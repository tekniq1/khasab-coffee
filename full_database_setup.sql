-- ========================================================
-- Schema SQL for محمصة خصب (Khasab Coffee Roasters) Complete Database
-- Includes RBAC User Roles, Inventory, Realtime Orders, Profit Analytics, Store Settings
-- ========================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (ملفات العملاء والمستخدمين)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  city TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Roles Table (أدوار وصلاحيات المستخدمين RBAC)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer', -- 'admin', 'customer'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products & Inventory Table (المنتجات والمخزون والتكلفة)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'coffee', 'tools', 'matcha', 'green'
  short TEXT,
  description TEXT,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  image TEXT NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  stock_quantity INTEGER DEFAULT 50,
  low_stock_threshold INTEGER DEFAULT 5,
  cost_price_yer NUMERIC DEFAULT 0,
  cost_price_sar NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_coffee BOOLEAN DEFAULT FALSE,
  origin TEXT,
  process TEXT,
  notes JSONB DEFAULT '[]'::jsonb,
  specs JSONB DEFAULT '[]'::jsonb,
  badge TEXT,
  best_seller BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Orders Table (الطلبات، التتبع، الأرباح والحوالات)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city_type TEXT NOT NULL, -- 'aden' or 'other'
  governorate TEXT NOT NULL,
  delivery_method TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  pickup_point TEXT,
  notes TEXT,
  txn_ref TEXT NOT NULL,
  sender_name TEXT,
  receipt_path TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_yer NUMERIC NOT NULL,
  total_sar NUMERIC NOT NULL,
  cost_total_yer NUMERIC DEFAULT 0,
  cost_total_sar NUMERIC DEFAULT 0,
  tracking_note TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Store Settings Table (تخصيص محتوى المتجر والإعلانات)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  announcement_text TEXT DEFAULT 'توصيل مجاني عند الطلب بـ +100 ريال، تحميص أسبوعي، أجود أنواع القهوة المختصة',
  announcement_enabled BOOLEAN DEFAULT TRUE,
  logo_url TEXT,
  favicon_url TEXT,
  hero_banners JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Products Policies: Public read active products, Admins full access
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (is_active = true OR auth.role() = 'service_role');
CREATE POLICY "Admin Full Products" ON public.products FOR ALL USING (public.is_admin());

-- User Roles Policies
CREATE POLICY "User Roles Read Self" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');
CREATE POLICY "User Roles Full Admin" ON public.user_roles FOR ALL USING (public.is_admin());

-- Profiles Policies
CREATE POLICY "Users Read Self Profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR auth.role() = 'service_role');
CREATE POLICY "Users Update Self Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Orders Policies
CREATE POLICY "Users Create Orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users View Own Orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');
CREATE POLICY "Admin Full Orders" ON public.orders FOR ALL USING (public.is_admin());

-- Store Settings Policies
CREATE POLICY "Public Read Store Settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admin Full Store Settings" ON public.store_settings FOR ALL USING (public.is_admin());

-- Triggers for User Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage Buckets: receipts & product-images
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Receipts Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Public Receipts Access" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');

CREATE POLICY "Public Product Images Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Public Product Images Access" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

-- Enable Realtime for Orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;


-- ========================================================
-- Migration: Security, RLS, and Stock Management Fixes
-- ========================================================

-- 1. Create a secure function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the old insecure policies
DROP POLICY IF EXISTS "Admin Full Products" ON public.products;
DROP POLICY IF EXISTS "User Roles Full Admin" ON public.user_roles;
DROP POLICY IF EXISTS "Admin Full Orders" ON public.orders;
DROP POLICY IF EXISTS "Admin Full Store Settings" ON public.store_settings;

-- 3. Create the new secure policies using is_admin()
CREATE POLICY "Admin Full Products" ON public.products FOR ALL USING (public.is_admin());
CREATE POLICY "User Roles Full Admin" ON public.user_roles FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Orders" ON public.orders FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Store Settings" ON public.store_settings FOR ALL USING (public.is_admin());

-- 4. Create an RPC function to place orders and deduct stock atomically
CREATE OR REPLACE FUNCTION public.place_order(payload JSONB)
RETURNS JSONB AS $$
DECLARE
    item JSONB;
    current_stock INT;
    prod_id UUID;
    new_order_id UUID;
BEGIN
    -- Check stock for all items first to ensure we don't partially deduct
    FOR item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
        SELECT id, stock_quantity INTO prod_id, current_stock 
        FROM public.products 
        WHERE slug = item->>'slug' 
        FOR UPDATE; -- Lock rows to prevent race conditions
        
        IF prod_id IS NULL THEN
            RAISE EXCEPTION 'المنتج غير موجود: %', item->>'slug';
        END IF;

        IF current_stock < (item->>'qty')::INT THEN
            RAISE EXCEPTION 'الكمية المطلوبة غير متوفرة في المخزون للمنتج: %', item->>'slug';
        END IF;
    END LOOP;

    -- If all good, deduct stock
    FOR item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
        UPDATE public.products 
        SET stock_quantity = stock_quantity - (item->>'qty')::INT 
        WHERE slug = item->>'slug';
    END LOOP;

    -- Insert order
    INSERT INTO public.orders (
        code, user_id, customer_name, phone, city_type, governorate, 
        delivery_method, lat, lng, pickup_point, notes, txn_ref, sender_name, 
        receipt_path, items, total_yer, total_sar, status
    ) VALUES (
        payload->>'code', 
        NULLIF(payload->>'user_id', '')::UUID,
        payload->>'customer_name', 
        payload->>'phone', 
        payload->>'city_type', 
        payload->>'governorate', 
        payload->>'delivery_method', 
        (payload->>'lat')::DOUBLE PRECISION, 
        (payload->>'lng')::DOUBLE PRECISION, 
        payload->>'pickup_point', 
        payload->>'notes', 
        payload->>'txn_ref', 
        payload->>'sender_name', 
        payload->>'receipt_path', 
        payload->'items', 
        (payload->>'total_yer')::NUMERIC, 
        (payload->>'total_sar')::NUMERIC, 
        COALESCE(payload->>'status', 'pending')
    ) RETURNING id INTO new_order_id;

    RETURN jsonb_build_object('success', true, 'order_id', new_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a trigger to restore stock when an order is cancelled
CREATE OR REPLACE FUNCTION public.handle_order_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    item JSONB;
BEGIN
    -- If order status changes TO 'cancelled'
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
            UPDATE public.products 
            SET stock_quantity = stock_quantity + (item->>'qty')::INT 
            WHERE slug = item->>'slug';
        END LOOP;
    -- If order status changes FROM 'cancelled' to something else (un-cancelled)
    ELSIF NEW.status != 'cancelled' AND OLD.status = 'cancelled' THEN
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
            UPDATE public.products 
            SET stock_quantity = stock_quantity - (item->>'qty')::INT 
            WHERE slug = item->>'slug';
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_order_cancellation();


CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.order_status AS ENUM ('pending','confirmed','shipped','delivered','cancelled');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  phone text NOT NULL,
  method text NOT NULL DEFAULT 'delivery',
  lat double precision,
  lng double precision,
  notes text,
  txn_ref text NOT NULL,
  sender_name text,
  receipt_path text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can place an order" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "anyone upload receipts" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "admins read receipts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts' AND public.has_role(auth.uid(),'admin'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

INSERT INTO public.user_roles (user_id, role) VALUES ('f613c00f-c3a4-4f1f-9246-5234432c6190', 'admin') ON CONFLICT (user_id, role) DO NOTHING;

