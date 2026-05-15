// api/create-order.js
// Razorpay SECRET key lives here on the server — NEVER in your HTML

const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, planName, planKey } = req.body;

    if (!amount || !planName) {
      return res.status(400).json({ error: 'Missing amount or plan' });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: 'lm_' + Date.now(),
      notes: { plan: planName }
    });

    return res.status(200).json({
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID, // only the public key is sent to browser
      amount: order.amount,
      currency: order.currency
    });

  } catch (err) {
    console.error('Razorpay order error:', err);
    return res.status(500).json({ error: 'Could not create payment order' });
  }
};
