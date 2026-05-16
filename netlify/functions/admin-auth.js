// netlify/functions/admin-auth.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function verifyToken(event) {
  const auth = event.headers['authorization'] || event.headers['Authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return false;
  try {
    const decoded = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString());
    return decoded.valid && decoded.exp > Date.now();
  } catch { return false; }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // POST — login
  if (event.httpMethod === 'POST') {
    const { password } = JSON.parse(event.body || '{}');
    if (!password) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password required' }) };

    if (password !== process.env.ADMIN_PASSWORD) {
      await new Promise(r => setTimeout(r, 1200));
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Incorrect password' }) };
    }

    const token = Buffer.from(
      JSON.stringify({ valid: true, exp: Date.now() + 8 * 60 * 60 * 1000 })
    ).toString('base64');

    return { statusCode: 200, headers, body: JSON.stringify({ token }) };
  }

  // GET — fetch data
  if (event.httpMethod === 'GET') {
    if (!verifyToken(event)) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorised' }) };
    }

    const action = event.queryStringParameters?.action;

    if (action === 'leads') {
      const { data, error } = await supabase.from('leads').select('*').order('submitted_at', { ascending: false });
      if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, headers, body: JSON.stringify({ leads: data }) };
    }

    if (action === 'payments') {
      const { data, error } = await supabase.from('payments').select('*').order('paid_at', { ascending: false });
      if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, headers, body: JSON.stringify({ payments: data }) };
    }

    if (action === 'update-status') {
      const { id, status } = event.queryStringParameters;
      const { error } = await supabase.from('leads').update({ status }).eq('id', id);
      if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (action === 'delete-lead') {
      const { id } = event.queryStringParameters;
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
