// netlify/functions/verify-payment.js
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planName, amount } = JSON.parse(event.body);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing verification fields' }) };
    }

    // Verify signature — proves payment is genuine
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid payment signature' }) };
    }

    // Save verified payment to database
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
    if (error) console.error('Supabase payment save error:', error);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, paymentId: razorpay_payment_id }) };

  } catch (err) {
    console.error('Verify error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error' }) };
  }
};
