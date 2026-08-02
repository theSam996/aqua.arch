require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.static('.')); // Serve static files from root

// Safe Supabase Initialization (prevents top-level crash on Vercel if env vars are missing)
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

// Safe Razorpay Initialization
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TKMKvCPBCWipK0',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'XDyY9H4YlClLc6NdCzQf46lg'
});

// Serve Public Config
app.get('/api/config', (req, res) => {
    res.json({
        supabase: {
            url: process.env.SUPABASE_URL || '',
            key: process.env.SUPABASE_ANON_KEY || ''
        },
        firebase: {
            apiKey: process.env.FIREBASE_API_KEY || '',
            authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
            projectId: process.env.FIREBASE_PROJECT_ID || '',
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
            appId: process.env.FIREBASE_APP_ID || '',
            measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
        }
    });
});

// 1. Create Order API
app.post('/api/create-order', async (req, res) => {
    try {
        const { amount, currency, product_name, user_id, shipping_address, shoe_size, activity_level, email, phone, full_name } = req.body;

        if (!process.env.RAZORPAY_KEY_ID) {
            return res.status(500).json({ error: "Razorpay key not configured on server." });
        }

        // Create Razorpay Order
        const options = {
            amount: amount * 100, // Amount in paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);

        // Try to insert into Supabase (non-blocking — payment still works if DB fails)
        if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== '') {
            try {
                const { error } = await supabase
                    .from('orders')
                    .insert({
                        user_id: user_id,
                        product_name: product_name,
                        amount: amount,
                        currency: "INR",
                        razorpay_order_id: order.id,
                        payment_status: 'created',
                        shipping_address: shipping_address,
                        shoe_size: shoe_size,
                        activity_level: activity_level,
                        email: email,
                        phone: phone,
                        full_name: full_name
                    });

                if (error) {
                    console.warn("Supabase Insert Warning:", error.message);
                    // Don't block — Razorpay order was already created
                }
            } catch (dbErr) {
                console.warn("Supabase connection issue:", dbErr.message);
            }
        }

        res.json({
            order_id: order.id,
            key_id: process.env.RAZORPAY_KEY_ID,
            amount: options.amount,
            currency: options.currency
        });

    } catch (error) {
        console.error("Create Order Error:", error);
        res.status(500).json({ error: "Server Error: " + error.message });
    }
});

// 2. Verify Payment API
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Try to update Supabase (non-blocking)
            if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== '') {
                try {
                    await supabase
                        .from('orders')
                        .update({
                            payment_status: 'paid',
                            razorpay_payment_id: razorpay_payment_id,
                            razorpay_signature: razorpay_signature
                        })
                        .eq('razorpay_order_id', razorpay_order_id);
                } catch (dbErr) {
                    console.warn("Supabase update issue:", dbErr.message);
                }
            }

            res.json({ status: "success", message: "Payment verified" });
        } else {
            // Try to update as Failed
            if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== '') {
                try {
                    await supabase
                        .from('orders')
                        .update({ payment_status: 'failed' })
                        .eq('razorpay_order_id', razorpay_order_id);
                } catch (dbErr) {
                    console.warn("Supabase update issue:", dbErr.message);
                }
            }

            res.status(400).json({ status: "failure", message: "Invalid Signature" });
        }

    } catch (error) {
        console.error("Verify Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// 3. Get User Orders API
app.get('/api/orders/:userId', async (req, res) => {
    try {
        if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === '') {
            return res.json({ orders: [] });
        }

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', req.params.userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn("Supabase fetch orders warning:", error.message);
            return res.json({ orders: [] });
        }

        res.json({ orders: data || [] });
    } catch (error) {
        console.error("Fetch Orders Error:", error);
        res.json({ orders: [] });
    }
});

// 4. Health Check API
app.get('/api/health', async (req, res) => {
    const status = {
        server: 'ok',
        razorpay: !!process.env.RAZORPAY_KEY_ID,
        supabase: !!process.env.SUPABASE_URL && process.env.SUPABASE_URL !== ''
    };

    // Test Supabase connection
    if (status.supabase) {
        try {
            const { error } = await supabase.from('orders').select('count', { count: 'exact', head: true });
            status.supabase_connected = !error;
            if (error) status.supabase_error = error.message;
        } catch (e) {
            status.supabase_connected = false;
            status.supabase_error = e.message;
        }
    }

    res.json(status);
});

const PORT = process.env.PORT || 5001;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
