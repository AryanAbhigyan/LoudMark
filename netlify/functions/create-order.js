// netlify/functions/create-order.js
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { amount, planName } = JSON.parse(event.body);

    if (!amount || !planName) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing amount or plan' }) };
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: 'lm_' + Date.now(),
      notes: { plan: planName }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        orderId: order.id,
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency
      })
    };

  } catch (err) {
    console.error('Razorpay error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not create payment order' }) };
  }
};
