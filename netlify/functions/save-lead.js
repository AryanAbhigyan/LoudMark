// netlify/functions/save-lead.js
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
    const { name, business, email, phone, website, category, services, message } = JSON.parse(event.body);

    if (!name || !business || !email || !phone || !category || !services) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const lead = {
      id: 'LM-' + Date.now(),
      submitted_at: new Date().toISOString(),
      name: name.trim(),
      business: business.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      website: website?.trim() || '—',
      category: category.trim(),
      services: services.trim(),
      message: message?.trim() || '—',
      status: 'New',
      verified: 'Email ✓ · Phone ✓'
    };

    const { error } = await supabase.from('leads').insert([lead]);
    if (error) {
      console.error('Supabase error:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to save lead' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: lead.id }) };

  } catch (err) {
    console.error('Server error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error' }) };
  }
};
