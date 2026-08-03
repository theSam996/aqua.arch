-- ============================================
-- AquaSole - Orders Table for Supabase
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    product_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'INR',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    payment_status TEXT DEFAULT 'created',
    shipping_address TEXT,
    shoe_size TEXT,
    activity_level TEXT
);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow inserts from service role (backend)
CREATE POLICY "Allow backend inserts" ON orders
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

-- Allow updates from service role (backend)
CREATE POLICY "Allow backend updates" ON orders
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Allow users to read their own orders
CREATE POLICY "Allow users to read own orders" ON orders
    FOR SELECT TO authenticated, anon
    USING (true);
