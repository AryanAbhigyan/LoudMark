// api/admin-auth.js
// Real server-side authentication — cannot be bypassed from the browser

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST /api/admin-auth — login
  if (req.method === 'POST') {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    if (password !== process.env.ADMIN_PASSWORD) {
      // Deliberate delay to prevent brute-force guessing
      await new Promise(r => setTimeout(r, 1200));
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Issue a simple time-limited token
    const token = Buffer.from(
      JSON.stringify({ valid: true, exp: Date.now() + 8 * 60 * 60 * 1000 }) // 8 hours
    ).toString('base64');

    return res.status(200).json({ token });
  }

  // GET /api/admin-auth?action=leads or ?action=payments — fetch data
  if (req.method === 'GET') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorised' });
    }

    try {
      const decoded = JSON.parse(Buffer.from(authHeader.slice(7), 'base64').toString());
      if (!decoded.valid || decoded.exp < Date.now()) {
        return res.status(401).json({ error: 'Session expired, please log in again' });
      }
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const action = req.query.action;

    if (action === 'leads') {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ leads: data });
    }

    if (action === 'payments') {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('paid_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ payments: data });
    }

    if (action === 'update-status') {
      const { id, status } = req.query;
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    if (action === 'delete-lead') {
      const { id } = req.query;
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
