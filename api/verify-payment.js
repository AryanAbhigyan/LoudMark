// api/verify-payment.js
// Verifies the payment is genuine using Razorpay signature — prevents fake payments

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planName, amount } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    // Verify the signature — this proves Razorpay actually processed the payment
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature — possible fraud attempt' });
    }

    // Payment is genuine — save to Supabase
    const payment = {
      txn_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      plan: planName || 'Unknown',
      amount_paise: amount,
      amount_inr: '₹' + (amount / 100).toLocaleString('en-IN'),
      status: 'Paid',
      paid_at: new Date().toISOString()
    };

    const { error } = await supabase.from('payments').insert([payment]);

    if (error) {
      console.error('Supabase payment save error:', error);
      // Don't fail the user — payment was genuine, just log the error
    }

    return res.status(200).json({ success: true, paymentId: razorpay_payment_id });

  } catch (err) {
    console.error('Verify payment error:', err);
    return res.status(500).json({ error: 'Server error during verification' });
  }
};
