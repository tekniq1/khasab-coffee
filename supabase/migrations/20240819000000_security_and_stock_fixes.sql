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
